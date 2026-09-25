// App side of the question → video pipeline. Two backends, one interface:
//
//   local    — the pipeline server on your Mac (server/index.mjs, `npm run
//              pipeline`), used when EXPO_PUBLIC_PIPELINE_URL is set. Polled.
//   supabase — Edge Functions + Realtime (supabase/functions), once deployed.
//
//   askQuestion()      → starts a request
//   subscribeRequest() → reports the request + its beats as they change
//   beatsToStories()   → maps beats onto the feed's story shape
import { supabase, ensureSession, backendConfigured as supabaseConfigured } from '../lib/supabase';

const LOCAL_URL = (process.env.EXPO_PUBLIC_PIPELINE_URL || '').replace(/\/$/, '');
const LOCAL_TOKEN = process.env.EXPO_PUBLIC_PIPELINE_TOKEN || '';
const local = Boolean(LOCAL_URL);

export const backendConfigured = local || supabaseConfigured;

// ── Local pipeline server ────────────────────────────────────────────────────
async function askLocal({ prompt, newsId, aboutStory, mode }) {
  let res;
  try {
    res = await fetch(`${LOCAL_URL}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-pipeline-token': LOCAL_TOKEN },
      body: JSON.stringify({ prompt, newsId, aboutStory, mode }),
    });
  } catch {
    throw new Error('Can’t reach the pipeline server. Is `npm run pipeline` running on your Mac?');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Couldn’t start that question.');
  return body.requestId;
}

const TERMINAL = new Set(['ready', 'failed', 'no_new']);

// A server job → the { request, beats } shape the app consumes everywhere.
function fromJob(job) {
  return {
    request: {
      id: job.id,
      status: job.status,
      error: job.error ?? null,
      message: job.message ?? null,
      suggestions: job.suggestions ?? [],
      insights: job.label ? { label: job.label } : null,
      trace: job.trace ?? null,
      // Library extras: where this story belongs and what was asked.
      mode: job.mode,
      newsId: job.news_id,
      prompt: job.prompt,
      aboutStory: job.about_story ?? null,
      createdAt: job.created_at,
    },
    beats: (job.beats || []).map((b) => ({
      ...b,
      id: `${job.id}-${b.idx}`,
      video_url: b.video_url ? `${LOCAL_URL}${b.video_url}` : null,
      created_at: job.created_at,
    })),
  };
}

// Every story created so far, oldest first — loaded when the app starts.
export async function fetchLibrary() {
  if (!local) return [];
  const res = await fetch(`${LOCAL_URL}/library`, { headers: { 'x-pipeline-token': LOCAL_TOKEN } });
  if (!res.ok) throw new Error(`Library request failed (${res.status})`);
  const { items } = await res.json();
  return items.map(fromJob);
}

function subscribeLocal(requestId, onChange) {
  let stopped = false;
  let timer = null;
  let lastUpdated = null;
  const tick = async () => {
    try {
      const res = await fetch(`${LOCAL_URL}/requests/${requestId}`, { headers: { 'x-pipeline-token': LOCAL_TOKEN } });
      const job = await res.json();
      if (stopped || !res.ok) return;
      if (job.updated_at !== lastUpdated) {
        lastUpdated = job.updated_at;
        onChange(fromJob(job));
      }
      if (TERMINAL.has(job.status)) return;
    } catch {
      // Server briefly unreachable — keep trying.
    }
    if (!stopped) timer = setTimeout(tick, 2000);
  };
  tick();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}

// ── Public API ───────────────────────────────────────────────────────────────
export async function askQuestion({ prompt, newsId, aboutStory, mode = 'append' }) {
  if (local) return askLocal({ prompt, newsId, aboutStory, mode });
  if (!supabase) throw new Error('Backend not configured');
  await ensureSession();
  const { data, error } = await supabase.functions.invoke('ask', {
    body: { prompt, newsId, aboutStory },
  });
  if (error) {
    let message = 'Couldn’t start that question.';
    try {
      message = (await error.context?.json())?.error ?? message;
    } catch {}
    throw new Error(message);
  }
  return data.requestId;
}

// Calls onChange({ request, beats }) with the latest full state on every
// change. Returns an unsubscribe function.
export function subscribeRequest(requestId, onChange) {
  if (local) return subscribeLocal(requestId, onChange);
  if (!supabase) return () => {};
  let request = null;
  let beats = [];
  let closed = false;

  const emit = () => {
    if (!closed && request) onChange({ request, beats: [...beats].sort((a, b) => a.idx - b.idx) });
  };

  const load = async () => {
    const [{ data: r }, { data: b }] = await Promise.all([
      supabase.from('requests').select('*').eq('id', requestId).maybeSingle(),
      supabase.from('beats').select('*').eq('request_id', requestId).order('idx'),
    ]);
    if (r) request = r;
    if (b) beats = b;
    emit();
  };

  const channel = supabase
    .channel(`request-${requestId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: `id=eq.${requestId}` }, (p) => {
      if (p.new) request = p.new;
      emit();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'beats', filter: `request_id=eq.${requestId}` }, (p) => {
      const row = p.new;
      if (!row?.id) return;
      const i = beats.findIndex((b) => b.id === row.id);
      if (i === -1) beats.push(row);
      else beats[i] = row;
      emit();
    })
    .subscribe((status) => {
      // Catch anything that happened between the insert and the subscription.
      if (status === 'SUBSCRIBED') load();
    });

  return () => {
    closed = true;
    supabase.removeChannel(channel);
  };
}

// Narration → timed caption lines of ~7 words across the beat's duration.
function captionsFor(narration, duration) {
  const words = String(narration || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [{ start: 0, end: duration, text: '' }];
  const lines = [];
  for (let i = 0; i < words.length; i += 7) lines.push(words.slice(i, i + 7).join(' '));
  const span = duration / lines.length;
  return lines.map((text, i) => ({ start: i * span, end: (i + 1) * span, text }));
}

const STATUS = { ready: 'ready', failed: 'failed', pending: 'generating', generating: 'generating' };

// A storyboard card (or a legacy beat) → the feed's story shape. Cards carry
// a format: text · image · graphic · external_video · generated_video. Older
// stories have no format and are all generated video.

export function beatsToStories(request, beats) {
  // "Making videos · k of n" counts only the cards that are generated videos.
  const videos = beats.filter((b) => (b.format ?? 'generated_video') === 'generated_video');
  const total = videos.length;
  const done = videos.filter((b) => b.status === 'ready').length;
  // Older stories were made before cards carried a backdrop: borrow the
  // briefing's own images (then video thumbnails) so every card has one.
  const pool = [
    ...beats.filter((b) => b.media?.type === 'image').map((b) => ({ url: b.media.url, source: b.media.source })),
    ...beats.filter((b) => b.media?.thumbnail).map((b) => ({ url: b.media.thumbnail, source: b.media.source })),
  ];
  let next = 0;
  const backdropFor = (b) => {
    if (b.backdrop) return b.backdrop;
    const f = b.format ?? 'generated_video';
    if ((f !== 'text' && f !== 'graphic') || b.media?.type === 'image' || !pool.length) return null;
    return pool[next++ % pool.length];
  };
  return beats.map((b) => {
    const duration = b.clip_end != null ? Number(b.clip_end) - Number(b.clip_start ?? 0) : Number(b.duration_s) || 7;
    return {
      id: `beat-${b.id}`,
      requestId: request.id,
      asked: true,
      format: b.format ?? 'generated_video',
      purpose: b.purpose ?? null,
      cardHeadline: b.headline ?? null,
      caption: b.caption ?? null,
      media: b.media ?? null,
      backdrop: backdropFor(b),
      number: b.number ?? null,
      sources: b.sources ?? [],
      headline: b.headline,
      status: STATUS[b.status] ?? 'generating',
      stage: 'generating',
      batch: { done, total },
      trace: request.trace ?? null,
      error: b.error ?? null,
      createdAt: Date.parse(b.created_at) || Date.now(),
      video: b.video_url ? { uri: b.video_url } : null,
      clip: b.clip_start != null && b.clip_end != null ? { start: Number(b.clip_start), end: Number(b.clip_end) } : null,
      // Real word-timed captions when the pipeline made the voiceover; an even
      // split of the narration otherwise.
      captions: Array.isArray(b.captions) && b.captions.length ? b.captions : captionsFor(b.narration ?? b.caption, duration),
    };
  });
}
