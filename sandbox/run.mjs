// Sandbox runner for the Genie pipeline's media half: for each beat of a
// script, make the voiceover (with word timestamps), make a silent vertical
// video long enough to hold it, merge the two, and derive captions from the
// real word timings — so captions are in sync by construction.
//
//   node sandbox/run.mjs sandbox/meta-connect-2026            # all beats
//   node sandbox/run.mjs sandbox/meta-connect-2026 --only 0   # one beat (test)
//
// Reads FAL_KEY from .env. Writes <dir>/result.json (merged across runs).
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fal } from '@fal-ai/client';

const env = Object.fromEntries(
  (await readFile('.env', 'utf8'))
    .split('\n')
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()])
);
if (!env.FAL_KEY) throw new Error('FAL_KEY missing from .env');
fal.config({ credentials: env.FAL_KEY });

const TTS = 'fal-ai/elevenlabs/tts/turbo-v2.5';
const VIDEO = 'fal-ai/veo3.1/lite';
const MERGE = 'fal-ai/ffmpeg-api/merge-audio-video';
const VOICE = process.env.VOICE || 'Rachel';

const dir = process.argv[2];
const retime = process.argv.includes('--retime'); // redo voice + merge, keep existing videos
const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx > -1 ? Number(process.argv[onlyIdx + 1]) : null;
const script = JSON.parse(await readFile(path.join(dir, 'script.json'), 'utf8'));
const resultPath = path.join(dir, 'result.json');
const result = existsSync(resultPath) ? JSON.parse(await readFile(resultPath, 'utf8')) : { beats: {} };

const log = (i, ...a) => console.log(`[beat ${i}]`, ...a);

// ElevenLabs word timestamps → caption lines of ≤ 6 words, each starting on
// its first word and ending on its last.
function captionsFrom(words) {
  const lines = [];
  for (let i = 0; i < words.length; i += 6) {
    const chunk = words.slice(i, i + 6);
    lines.push({
      start: chunk[0].start,
      end: chunk[chunk.length - 1].end,
      text: chunk.map((w) => w.text).join(' '),
    });
  }
  // Hold each line until the next begins, so there's no blank flicker.
  for (let i = 0; i < lines.length - 1; i++) lines[i].end = lines[i + 1].start;
  return lines;
}

// ElevenLabs returns character-level alignment chunks:
//   { characters[], character_start_times_seconds[], character_end_times_seconds[] }
// Rebuild words: a word starts at its first character, ends at its last.
function normalizeWords(ts) {
  const words = [];
  for (const chunk of ts || []) {
    const chars = chunk.characters || [];
    const starts = chunk.character_start_times_seconds || [];
    const ends = chunk.character_end_times_seconds || [];
    let cur = null;
    chars.forEach((c, i) => {
      if (/\s/.test(c)) {
        if (cur) words.push(cur);
        cur = null;
        return;
      }
      if (!cur) cur = { text: '', start: starts[i], end: ends[i] };
      cur.text += c;
      cur.end = ends[i];
    });
    if (cur) words.push(cur);
  }
  return words.map((w) => ({ text: w.text, start: Number(w.start.toFixed(3)), end: Number(w.end.toFixed(3)) }));
}

async function runBeat(i, beat) {
  const prevText = script.beats[i - 1]?.narration ?? null;
  const nextText = script.beats[i + 1]?.narration ?? null;

  // 1 — voice (the clock everything else follows)
  let speed = 1;
  let tts;
  let words;
  for (;;) {
    tts = (
      await fal.subscribe(TTS, {
        input: { text: beat.narration, voice: VOICE, timestamps: true, speed, previous_text: prevText, next_text: nextText },
      })
    ).data;
    words = normalizeWords(tts.timestamps);
    const spoken = words.at(-1)?.end ?? 0;
    log(i, `voice ${spoken.toFixed(2)}s at speed ${speed}`);
    if (spoken <= 7.6 || speed >= 1.15) break;
    speed = Number((speed + 0.08).toFixed(2)); // too long for an 8s clip — tighten
  }
  if (!words.length) log(i, 'WARNING: no word timestamps returned; raw:', JSON.stringify(tts.timestamps)?.slice(0, 300));
  const spoken = words.at(-1)?.end ?? 7;

  // 2 — silent vertical video, the shortest length that holds the voice
  const prior = result.beats[i];
  let duration = spoken <= 3.6 ? '4s' : spoken <= 5.6 ? '6s' : '8s';
  let video;
  if (retime && prior?.silent_video_url && prior.duration_s >= spoken) {
    duration = `${prior.duration_s}s`;
    video = { video: { url: prior.silent_video_url } };
    log(i, `reusing video ${duration}`);
  } else {
    video = (
      await fal.subscribe(VIDEO, {
        input: { prompt: beat.visual_prompt, aspect_ratio: '9:16', duration, resolution: '720p', generate_audio: false },
        logs: false,
      })
    ).data;
    log(i, `video ${duration} → ${video.video.url}`);
  }

  // 3 — one file: picture + voice, starting together
  const merged = (
    await fal.subscribe(MERGE, { input: { video_url: video.video.url, audio_url: tts.audio.url, start_offset: 0 } })
  ).data;
  log(i, `merged → ${merged.video.url}`);

  return {
    idx: i,
    headline: beat.headline,
    narration: beat.narration,
    duration_s: Number(duration.replace('s', '')),
    voice_s: Number(spoken.toFixed(2)),
    video_url: merged.video.url,
    silent_video_url: video.video.url,
    audio_url: tts.audio.url,
    words,
    captions: captionsFrom(words),
  };
}

const indexes = only != null ? [only] : script.beats.map((_, i) => i).filter((i) => retime || !result.beats[i]?.video_url);

// A few at a time — gentle on rate limits, still fast.
const CONCURRENCY = 4;
const queue = [...indexes];
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const i = queue.shift();
      try {
        result.beats[i] = await runBeat(i, script.beats[i]);
      } catch (e) {
        log(i, 'FAILED:', e?.body ? JSON.stringify(e.body).slice(0, 400) : e.message);
        result.beats[i] = { idx: i, headline: script.beats[i].headline, error: e.message };
      }
      await writeFile(resultPath, JSON.stringify({ ...result, insights: script.insights, source: script.source }, null, 2));
    }
  })
);
console.log('Done →', resultPath);
