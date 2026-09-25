// Genie local pipeline server — lets the Expo app create new stories now,
// with every key staying on this machine.
//
//   POST /ask            { prompt, newsId, aboutStory?, mode: 'append'|'new' } → { requestId }
//   GET  /requests/:id   progress + finished beats (the app polls this)
//   GET  /library        every story created so far (finished or in progress) — the app loads this on launch
//   GET  /media/:file    finished clips (range requests, so phones can stream)
//   GET  /health
//
// Flow per request (server/pipeline/research.mjs): Story Intelligence —
// intent → gate → triangulated research → information graph → media discovery
// → storyboard of 3–7 cards (text · image · graphic · external_video ·
// generated_video). Only generated_video cards are rendered here, via fal
// (voice → video → merge); everything else is ready as soon as it's planned.
//
//   npm run pipeline        (reads FAL_KEY + PIPELINE_TOKEN from .env)
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, createReadStream, statSync, writeFileSync, cpSync, readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';

import { configureFal } from './pipeline/llm.mjs';
import { buildStory } from './pipeline/research.mjs';
import { makeBeat } from './pipeline/generate.mjs';

// ── Config ───────────────────────────────────────────────────────────────────
// Locally: .env. Hosted (fal): environment variables / fal secrets, no .env.
const env = Object.fromEntries(
  (existsSync('.env') ? readFileSync('.env', 'utf8') : '')
    .split('\n')
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()])
);
const FAL_KEY = process.env.FAL_KEY || process.env.GENIE_FAL_KEY || env.FAL_KEY;
const TOKEN = process.env.PIPELINE_TOKEN || process.env.GENIE_PIPELINE_TOKEN || env.PIPELINE_TOKEN;
// Optional second token for the public web build (served through a tunnel).
// Questions made with it count against MAX_QUESTIONS_PER_DAY; yours don't.
const WEB_TOKEN = process.env.WEB_PIPELINE_TOKEN || env.WEB_PIPELINE_TOKEN || null;
const PORT = Number(process.env.PORT || env.PIPELINE_PORT || 8787);
const MAX_VIDEO_REQUESTS_PER_DAY = Number(process.env.MAX_VIDEO_REQUESTS_PER_DAY ?? env.MAX_VIDEO_REQUESTS_PER_DAY ?? 6);
// Spend guard for the public web build: its new questions per UTC day.
const MAX_QUESTIONS_PER_DAY = Number(process.env.MAX_QUESTIONS_PER_DAY ?? env.MAX_QUESTIONS_PER_DAY ?? 0) || Infinity;
const FRESH_DAYS = Number(process.env.FRESH_DAYS || env.FRESH_DAYS || 7);
if (!FAL_KEY) throw new Error('FAL_KEY missing (.env or environment)');
if (!TOKEN) throw new Error('PIPELINE_TOKEN missing (.env or environment)');
configureFal(FAL_KEY);

// Where jobs + finished clips live. Hosted, this is fal's persistent /data
// disk; on first boot it's seeded from the stories baked into the image.
const DATA = path.resolve(process.env.PIPELINE_DATA_DIR || 'server/data');
const MEDIA = path.join(DATA, 'media');
const JOBS_FILE = path.join(DATA, 'jobs.json');
const SEED = process.env.PIPELINE_SEED_DIR && path.resolve(process.env.PIPELINE_SEED_DIR);
if (SEED && existsSync(SEED) && !existsSync(JOBS_FILE)) {
  cpSync(SEED, DATA, { recursive: true });
  console.log(`Seeded ${DATA} from ${SEED} (${readdirSync(path.join(DATA, 'media')).length} clips)`);
}
mkdirSync(MEDIA, { recursive: true });

const jobs = new Map(existsSync(JOBS_FILE) ? JSON.parse(readFileSync(JOBS_FILE, 'utf8')).map((j) => [j.id, j]) : []);
let saving = Promise.resolve();
const persist = () => (saving = saving.then(() => writeFile(JOBS_FILE, JSON.stringify([...jobs.values()], null, 2))));
const log = (id, ...m) => console.log(`[${id.slice(0, 8)}]`, ...m);

// Jobs interrupted by a restart can't resume mid-flight; say so honestly.
for (const j of jobs.values()) {
  if (!['ready', 'failed', 'no_new'].includes(j.status)) {
    j.status = 'failed';
    j.error = 'The pipeline server restarted before this finished. Ask again.';
  }
}
writeFileSync(JOBS_FILE, JSON.stringify([...jobs.values()], null, 2));

// ── Pipeline ─────────────────────────────────────────────────────────────────
const videosToday = () => {
  const day = new Date().toISOString().slice(0, 10);
  return [...jobs.values()].filter((j) => j.video_started_at?.startsWith(day)).length;
};

async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  await writeFile(path.join(MEDIA, file), Buffer.from(await res.arrayBuffer()));
  return `/media/${file}`;
}

// The latest finished story on the same news item — follow-ups build on it.
function parentFor(job) {
  return [...jobs.values()]
    .filter((j) => j.id !== job.id && j.news_id === job.news_id && j.status === 'ready' && j.intelligence)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.intelligence ?? null;
}

async function run(job) {
  const set = (patch) => {
    Object.assign(job, patch, { updated_at: new Date().toISOString() });
    persist();
  };
  try {
    const result = await buildStory({
      topic: job.prompt,
      aboutStory: job.about_story,
      parent: job.mode === 'append' ? parentFor(job) : null,
      mode: job.mode === 'append' ? 'append' : 'new',
      days: FRESH_DAYS,
      onStage: (stage, info = {}) => {
        const trace = { ...(job.trace || {}) };
        if (info.what_changed) trace.what_changed = info.what_changed;
        if (info.sources) {
          const hosts = [...new Set(info.sources.map((u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return null; } }).filter(Boolean))];
          trace.sources = hosts.slice(0, 4);
          trace.sources_total = hosts.length;
        }
        if (info.facts_kept != null) Object.assign(trace, { facts_kept: info.facts_kept, facts_dropped: info.facts_dropped });
        if (info.media != null) trace.media = info.media;
        set({ status: stage, trace });
        log(job.id, 'stage:', stage);
      },
    });
    log(job.id, `intelligence done ($${result.cost.toFixed(3)}):`, result.status);
    set({ research: { intent: result.intent, gate: result.gate, sources: result.sources, dropped: result.dropped, cost: result.cost } });

    if (result.status !== 'ready') {
      set({ status: 'no_new', reason: result.status, message: result.message, suggestions: result.suggestions });
      return;
    }

    const generated = result.cards.filter((c) => c.format === 'generated_video');
    const capped = generated.length > 0 && videosToday() >= MAX_VIDEO_REQUESTS_PER_DAY;
    set({
      status: generated.length && !capped ? 'generating' : 'ready',
      label: result.label,
      headline: result.headline,
      intelligence: result.intelligence,
      media_candidates: result.media_candidates,
      generation_required: result.generation_required,
      generation_reason: result.generation_reason,
      trace: { ...(job.trace || {}), scenes: result.cards.length, generated: generated.length },
      ...(generated.length && !capped ? { video_started_at: new Date().toISOString() } : {}),
      beats: result.cards.map((c) => ({
        ...c,
        status:
          c.format !== 'generated_video' ? 'ready' : capped ? 'failed' : 'pending',
        error: c.format === 'generated_video' && capped ? `Daily video limit reached (${MAX_VIDEO_REQUESTS_PER_DAY}).` : undefined,
      })),
    });
    log(job.id, `storyboard: ${result.cards.map((c) => c.format).join(' · ')}`);
    if (!generated.length || capped) return;

    // Fallback renderer: only the cards nothing existing could show.
    await Promise.all(
      job.beats
        .filter((b) => b.format === 'generated_video')
        .map(async (beat) => {
          beat.status = 'generating';
          persist();
          try {
            const made = await makeBeat({ narration: beat.caption, visual_prompt: beat.visual_prompt });
            const video_url = await download(made.url, `${job.id}-${beat.idx + 1}.mp4`);
            Object.assign(beat, { status: 'ready', video_url, captions: made.captions, duration_s: made.duration_s });
            log(job.id, `generated card ${beat.idx + 1} ready (${made.duration_s}s)`);
          } catch (e) {
            Object.assign(beat, { status: 'failed', error: e.message?.slice(0, 200) });
            log(job.id, `generated card ${beat.idx + 1} failed:`, e.message);
          }
          set({});
        })
    );
    set({ status: 'ready' });
  } catch (e) {
    log(job.id, 'failed:', e.message);
    set({ status: 'failed', error: e.message?.slice(0, 300) || 'Something went wrong.' });
  }
}

// ── HTTP ─────────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-pipeline-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const send = (res, status, body) => {
  res.writeHead(status, { ...CORS, 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};
const publicView = ({ research, intelligence, media_candidates, ...j }) => ({
  ...j,
  gate: research?.gate ?? null,
  story: intelligence?.story ?? null,
});

function serveMedia(req, res, file) {
  const full = path.join(MEDIA, path.basename(file));
  if (!existsSync(full)) return send(res, 404, { error: 'Not found' });
  const size = statSync(full).size;
  const range = req.headers.range;
  if (range) {
    const [s, e] = range.replace(/bytes=/, '').split('-');
    const start = Number(s);
    const end = e ? Number(e) : size - 1;
    res.writeHead(206, { ...CORS, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Content-Type': 'video/mp4' });
    createReadStream(full, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { ...CORS, 'Content-Length': size, 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes' });
    createReadStream(full).pipe(res);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (url.pathname === '/health') return send(res, 200, { ok: true });
  if (url.pathname.startsWith('/media/') && req.method === 'GET') return serveMedia(req, res, url.pathname.slice(7));

  const given = req.headers['x-pipeline-token'];
  const via = given === TOKEN ? 'app' : WEB_TOKEN && given === WEB_TOKEN ? 'web' : null;
  if (!via) return send(res, 401, { error: 'Bad pipeline token' });

  if (url.pathname === '/ask' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    let input;
    try {
      input = JSON.parse(body || '{}');
    } catch {
      return send(res, 400, { error: 'Invalid JSON' });
    }
    const prompt = String(input.prompt || '').trim();
    if (prompt.length < 3 || prompt.length > 500) return send(res, 400, { error: 'Question must be 3–500 characters.' });
    const today = new Date().toISOString().slice(0, 10);
    const asked = [...jobs.values()].filter((j) => j.via === 'web' && j.created_at?.startsWith(today)).length;
    if (via === 'web' && asked >= MAX_QUESTIONS_PER_DAY) {
      return send(res, 429, { error: `Genie has answered its ${MAX_QUESTIONS_PER_DAY} questions for today. Try again tomorrow.` });
    }
    const now = new Date().toISOString();
    const job = {
      id: randomUUID(),
      via,
      news_id: String(input.newsId || ''),
      mode: input.mode === 'new' ? 'new' : 'append',
      prompt,
      about_story: input.aboutStory ? String(input.aboutStory).slice(0, 300) : null,
      status: 'queued',
      created_at: now,
      updated_at: now,
      beats: [],
    };
    jobs.set(job.id, job);
    persist();
    log(job.id, `ask (${job.mode}): ${prompt}`);
    run(job);
    return send(res, 202, { requestId: job.id });
  }

  if (url.pathname === '/library' && req.method === 'GET') {
    // Everything worth showing: finished stories and ones still being made.
    // Failed and "no new info" attempts are left out. Oldest first.
    const items = [...jobs.values()]
      .filter((j) => !['failed', 'no_new'].includes(j.status))
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(publicView);
    return send(res, 200, { items });
  }

  const m = url.pathname.match(/^\/requests\/([\w-]+)$/);
  if (m && req.method === 'GET') {
    const job = jobs.get(m[1]);
    return job ? send(res, 200, publicView(job)) : send(res, 404, { error: 'Unknown request' });
  }
  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, '0.0.0.0', () => {
  const lan = Object.values(os.networkInterfaces())
    .flat()
    .find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
  console.log(`Genie pipeline on http://localhost:${PORT}${lan ? `  ·  phone: http://${lan}:${PORT}` : ''}`);
  console.log(`Daily video limit: ${MAX_VIDEO_REQUESTS_PER_DAY} · freshness window: ${FRESH_DAYS} days`);
});
