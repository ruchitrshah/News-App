// Builds a self-contained preview page from a sandbox run's result.json:
// stories-style player, captions timed to the real voiceover word timings.
//
//   node sandbox/build-preview.mjs sandbox/meta-connect-2026
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dir = process.argv[2];
const result = JSON.parse(await readFile(path.join(dir, 'result.json'), 'utf8'));
const beats = Object.values(result.beats)
  .filter((b) => b.video_url)
  .sort((a, b) => a.idx - b.idx)
  .map(({ headline, video_url, captions, voice_s, duration_s }) => ({ headline, video_url, captions, voice_s, duration_s }));

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Genie sandbox — ${result.insights?.label ?? 'run'}</title>
<style>
  :root { --ink:#111827; --page:#fff; --soft:#f3f4f6; --muted:#6b7280; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; background:var(--soft); font-family: -apple-system, "SF Pro Text", Inter, system-ui, sans-serif; color:var(--ink);
         display:flex; gap:32px; align-items:flex-start; justify-content:center; padding:24px 16px; flex-wrap:wrap; }
  .phone { width:min(390px, 100%); aspect-ratio: 9/16; position:relative; border-radius:18px; overflow:hidden; background:#0b0f17;
           box-shadow: 0 20px 60px rgba(16,24,40,.18); }
  video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
  .scrim { position:absolute; left:0; right:0; bottom:0; height:55%; background:linear-gradient(transparent, rgba(0,0,0,.72)); pointer-events:none; }
  .bar { position:absolute; top:12px; left:20px; right:20px; display:flex; gap:6px; z-index:2; }
  .seg { flex:1; height:3px; border-radius:2px; background:rgba(255,255,255,.35); overflow:hidden; }
  .seg i { display:block; height:100%; width:0; background:#fff; }
  .cap { position:absolute; left:20px; right:20px; bottom:28px; font-size:16px; line-height:22px; font-weight:500; color:#fff;
         text-shadow:0 1px 4px rgba(0,0,0,.45); min-height:44px; display:flex; align-items:flex-end; }
  .cap span { animation: in 170ms cubic-bezier(.23,1,.32,1); }
  @keyframes in { from { opacity:0; transform: translateY(4px) } to { opacity:1; transform:none } }
  @media (prefers-reduced-motion: reduce) { .cap span { animation: fade 170ms ease-out } @keyframes fade { from { opacity:0 } } }
  .tap { position:absolute; top:0; bottom:0; width:35%; z-index:1; cursor:pointer; }
  .tap.l { left:0 } .tap.r { right:0 }
  .start { position:absolute; inset:0; z-index:3; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.35);
           color:#fff; font-weight:600; font-size:15px; cursor:pointer; border:0; }
  .side { width:min(420px, 100%); }
  .side h1 { font-size:20px; margin:4px 0 4px; } .side p { color:var(--muted); font-size:13px; margin:0 0 16px; }
  .side ol { padding:0; margin:0; list-style:none; display:grid; gap:8px; }
  .side li { background:#fff; border-radius:12px; padding:10px 12px; font-size:13px; line-height:18px; cursor:pointer; border:1px solid #e5e7eb; }
  .side li.on { border-color: var(--ink); }
  .side li b { display:block; font-size:14px; margin-bottom:2px; }
  .side small { color:var(--muted); }
</style>
</head>
<body>
  <div class="phone" id="phone">
    <video id="v" playsinline preload="auto"></video>
    <div class="scrim"></div>
    <div class="bar" id="bar"></div>
    <div class="cap" id="cap"></div>
    <div class="tap l" id="prev" aria-label="Previous"></div>
    <div class="tap r" id="next" aria-label="Next"></div>
    <button class="start" id="start">Tap to play with sound</button>
  </div>
  <div class="side">
    <h1>${result.insights?.headline ?? ''}</h1>
    <p>Source: <a href="${result.source}" target="_blank" rel="noreferrer">${new URL(result.source).hostname}</a> · ${beats.length} scenes · voice ElevenLabs Turbo 2.5 · video Veo 3.1 Lite (fal)</p>
    <ol id="list"></ol>
  </div>
<script>
  const BEATS = ${JSON.stringify(beats)};
  const v = document.getElementById('v'), bar = document.getElementById('bar'), cap = document.getElementById('cap'), list = document.getElementById('list');
  let i = 0, lastLine = -1;
  BEATS.forEach((b, k) => {
    bar.insertAdjacentHTML('beforeend', '<div class="seg"><i></i></div>');
    const li = document.createElement('li');
    li.innerHTML = '<b>' + (k + 1) + '. ' + b.headline + '</b>' + b.captions.map(c => c.text).join(' ') +
      '<br><small>voice ' + b.voice_s + 's · clip ' + b.duration_s + 's</small>';
    li.onclick = () => go(k);
    list.appendChild(li);
  });
  const segs = [...bar.querySelectorAll('.seg i')];
  function go(k) {
    i = (k + BEATS.length) % BEATS.length; lastLine = -1; cap.innerHTML = '';
    v.src = BEATS[i].video_url; v.play().catch(() => {});
    segs.forEach((s, n) => s.style.width = n < i ? '100%' : '0');
    [...list.children].forEach((li, n) => li.classList.toggle('on', n === i));
  }
  v.addEventListener('timeupdate', () => {
    const t = v.currentTime, b = BEATS[i];
    segs[i].style.width = Math.min(100, (t / (v.duration || b.duration_s)) * 100) + '%';
    let line = -1;
    b.captions.forEach((c, n) => { if (t >= c.start) line = n; });
    if (line !== lastLine) { lastLine = line; cap.innerHTML = line >= 0 ? '<span>' + b.captions[line].text + '</span>' : ''; }
  });
  v.addEventListener('ended', () => go(i + 1));
  document.getElementById('next').onclick = () => go(i + 1);
  document.getElementById('prev').onclick = () => go(i - 1);
  document.getElementById('start').onclick = (e) => { e.currentTarget.remove(); v.muted = false; go(0); };
  v.muted = true; v.src = BEATS[0].video_url; list.children[0].classList.add('on');
</script>
</body>
</html>`;

await writeFile(path.join(dir, 'preview.html'), html);
console.log('→', path.join(dir, 'preview.html'));
