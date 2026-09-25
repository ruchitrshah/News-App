// Media Discovery — find the best EXISTING media before anything is generated.
//
//   1. Harvest from the sources we already read: each page's og:image and any
//      YouTube videos embedded or linked in it (grounded — these pages were
//      actually retrieved during research).
//   2. Ask a web-search agent for official/authoritative videos and images for
//      the story's key facts (keynotes, demos, press images, charts).
//   3. Verify every candidate in code before it can be used:
//        YouTube → oEmbed must answer (the video exists and allows embedding)
//        image   → the URL must return an image/* content type
//      Nothing unverified reaches the storyboard. Nothing is downloaded or
//      re-hosted: videos are embedded, images are hot-linked with credit.
import { llmJson } from './llm.mjs';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

async function get(url, { timeout = 7000, method = 'GET' } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    return await fetch(url, { method, redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': UA, accept: '*/*' } });
  } finally {
    clearTimeout(t);
  }
}

const host = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export function youtubeId(url) {
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

const decode = (t) =>
  t == null
    ? t
    : String(t)
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');

const meta = (html, prop) => {
  // Quote-aware: content="Tom's Guide" must not stop at the apostrophe.
  const val = `(?:"([^"]*)"|'([^']*)')`;
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=${val}|<meta[^>]+content=${val}[^>]*(?:property|name)=["']${prop}["']`, 'i');
  const m = html.match(re);
  const v = m && (m[1] ?? m[2] ?? m[3] ?? m[4]);
  return v ? decode(v) : null;
};

// ── 1. Harvest from retrieved source pages ───────────────────────────────────
async function harvest(sourceUrls) {
  const out = [];
  await Promise.all(
    sourceUrls.slice(0, 8).map(async (url) => {
      try {
        const res = await get(url);
        if (!res.ok || !String(res.headers.get('content-type')).includes('html')) return;
        const html = (await res.text()).slice(0, 600_000);
        const site = meta(html, 'og:site_name') || host(url);
        const title = meta(html, 'og:title');
        const image = meta(html, 'og:image') || meta(html, 'twitter:image');
        if (image) {
          out.push({ type: 'image', url: new URL(image, url).href, source: site, page: url, title, reason: 'Lead image of a source article' });
        }
        const ids = new Set();
        for (const m of html.matchAll(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([A-Za-z0-9_-]{11})/g)) ids.add(m[1]);
        for (const id of [...ids].slice(0, 3)) {
          out.push({ type: 'external_video', provider: 'youtube', video_id: id, url: `https://www.youtube.com/watch?v=${id}`, source: site, page: url, reason: 'Video embedded in a source article' });
        }
      } catch {
        // unreachable / blocked page — skip
      }
    })
  );
  return out;
}

// ── 2. Search for official media ─────────────────────────────────────────────
async function search({ intent, story, facts }) {
  const { json, cost } = await llmJson({
    web: true,
    system: `You are a media research agent for a visual news briefing. Find EXISTING, authoritative media that shows the key facts of this story. Prefer: official YouTube videos from the company/institution itself (keynotes, demos, press conferences, announcement videos), official press images, and charts from primary sources or reputable publishers. For long videos, give the start/end seconds of the part that shows the fact if you can find it (chapters, timestamps in descriptions); otherwise leave them null. Only return URLs you actually found in search results — never guess IDs. Schema: {"candidates":[{"type":"external_video"|"image","url":string,"source":string (publisher/channel),"start_time":number|null,"end_time":number|null,"fact":string (which fact it shows),"reason":string,"relevance":1-5,"authority":1-5}]}`,
    prompt: `Story: ${story.title}\nWhat changed: ${story.what_changed}\nDomain: ${intent.domain} · type: ${intent.story_type}\nEntities: ${(intent.entities || []).join(', ')}\n\nKey facts:\n${facts.map((f) => `- ${f.fact}`).join('\n')}`,
    validate: (o) => (!Array.isArray(o.candidates) ? 'candidates must be an array' : null),
    maxTokens: 2500,
  });
  const out = json.candidates.map((c) => {
    const id = c.type === 'external_video' ? youtubeId(c.url) : null;
    return { ...c, provider: id ? 'youtube' : c.provider, video_id: id };
  });
  return { candidates: out, cost };
}

// ── 3. Verify ────────────────────────────────────────────────────────────────
async function verify(c) {
  try {
    if (c.type === 'external_video') {
      if (!c.video_id) return null; // only YouTube embeds are supported for now
      const res = await get(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${c.video_id}`)}`);
      if (!res.ok) return null; // missing, private, or embedding disabled
      const o = await res.json();
      return { ...c, title: o.title, source: o.author_name || c.source, thumbnail: o.thumbnail_url, verified: 'youtube oembed' };
    }
    if (c.type === 'image') {
      if (!/^https:\/\//.test(c.url)) return null;
      const res = await get(c.url, { method: 'GET' });
      const type = String(res.headers.get('content-type') || '');
      res.body?.cancel?.();
      if (!res.ok || !type.startsWith('image/') || type.includes('svg')) return null;
      return { ...c, verified: type };
    }
  } catch {
    return null;
  }
  return null;
}

export async function discoverMedia({ intent, story, facts, sourceUrls }) {
  const [harvested, searched] = await Promise.all([
    harvest(sourceUrls),
    search({ intent, story, facts }).catch(() => ({ candidates: [], cost: 0 })),
  ]);
  const all = [...searched.candidates, ...harvested];

  // De-duplicate (same video id / same image URL), keep the richer entry.
  const seen = new Map();
  for (const c of all) {
    const key = c.video_id ? `yt:${c.video_id}` : `img:${c.url}`;
    if (!seen.has(key)) seen.set(key, c);
  }
  const verified = (await Promise.all([...seen.values()].slice(0, 16).map(verify))).filter(Boolean);
  return {
    cost: searched.cost,
    candidates: verified.map((c, i) => ({
      id: `m${i + 1}`,
      type: c.type,
      provider: c.provider ?? null,
      video_id: c.video_id ?? null,
      url: c.url,
      page: c.page ?? null,
      source: decode(c.source) ?? host(c.url),
      title: decode(c.title) ?? null,
      thumbnail: c.thumbnail ?? null,
      start_time: Number.isFinite(c.start_time) ? c.start_time : null,
      end_time: Number.isFinite(c.end_time) ? c.end_time : null,
      fact: c.fact ?? null,
      reason: c.reason ?? null,
      relevance: c.relevance ?? null,
      authority: c.authority ?? null,
    })),
  };
}
