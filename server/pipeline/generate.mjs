// GENERATED VIDEO — the fallback, used only for storyboard cards whose format
// is generated_video (nothing existing could show the idea).
//
// One card → one finished clip: voiceover first (its word timings are the
// clock), then a silent vertical video long enough to hold it, then the two
// merged. Captions come from the real word timings, so they're in sync by
// construction. Same approach as sandbox/run.mjs.
import { fal } from '@fal-ai/client';

const TTS = 'fal-ai/elevenlabs/tts/turbo-v2.5';
const VIDEO = process.env.FAL_VIDEO_MODEL || 'fal-ai/veo3.1/lite';
const MERGE = 'fal-ai/ffmpeg-api/merge-audio-video';
const VOICE = process.env.VOICE || 'Rachel';

// ElevenLabs alignment is per character; rebuild words from it.
function wordsFrom(ts) {
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
  return words;
}

// ≤ 6 words per line; each line holds until the next begins; the last holds to the end.
function captionsFrom(words, clipEnd) {
  const lines = [];
  for (let i = 0; i < words.length; i += 6) {
    const chunk = words.slice(i, i + 6);
    lines.push({ start: chunk[0].start, end: chunk.at(-1).end, text: chunk.map((w) => w.text).join(' ') });
  }
  for (let i = 0; i < lines.length - 1; i++) lines[i].end = lines[i + 1].start;
  if (lines.length) lines.at(-1).end = clipEnd;
  return lines.map((l) => ({ start: +l.start.toFixed(3), end: +l.end.toFixed(3), text: l.text }));
}

export async function makeBeat(beat, { prevText = null, nextText = null } = {}) {
  let speed = 1;
  let tts;
  let words;
  for (;;) {
    tts = (
      await fal.subscribe(TTS, {
        input: { text: beat.narration, voice: VOICE, timestamps: true, speed, previous_text: prevText, next_text: nextText },
      })
    ).data;
    words = wordsFrom(tts.timestamps);
    const spoken = words.at(-1)?.end ?? 0;
    if (spoken <= 7.6 || speed >= 1.15) break;
    speed = +(speed + 0.08).toFixed(2); // too long for an 8s clip — tighten
  }
  const spoken = words.at(-1)?.end ?? 7;
  const duration = spoken <= 3.6 ? 4 : spoken <= 5.6 ? 6 : 8;

  const video = (
    await fal.subscribe(VIDEO, {
      input: { prompt: beat.visual_prompt, aspect_ratio: '9:16', duration: `${duration}s`, resolution: '720p', generate_audio: false },
    })
  ).data;
  const merged = (await fal.subscribe(MERGE, { input: { video_url: video.video.url, audio_url: tts.audio.url, start_offset: 0 } })).data;

  return { url: merged.video.url, duration_s: duration, voice_s: +spoken.toFixed(2), captions: captionsFrom(words, duration) };
}
