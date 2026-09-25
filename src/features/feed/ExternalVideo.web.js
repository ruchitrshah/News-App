// Embedded YouTube player (web). YouTube's chrome is off (controls=0); our
// overlay gives tap-to-play/pause and fullscreen, driven over the iframe API
// (postMessage). Autoplays muted — browsers block sound without a gesture —
// and the first tap turns the sound on rather than pausing.
import React, { useEffect, useRef, useState } from 'react';

import PlayerControls from './PlayerControls';

export function embedUrl({ video_id, start_time, end_time }) {
  const p = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    playsinline: '1',
    controls: '0',
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    disablekb: '1',
    fs: '0',
    enablejsapi: '1',
    origin: typeof window !== 'undefined' ? window.location.origin : '',
  });
  if (start_time != null) p.set('start', String(Math.floor(start_time)));
  if (end_time != null) p.set('end', String(Math.ceil(end_time)));
  return `https://www.youtube.com/embed/${video_id}?${p}`;
}

// Where the 16:9 frame goes: cover inline (a tall card crops the sides, no
// letterbox), contain in fullscreen. The iframe is then made TITLE_PAD taller
// top and bottom — the video letterboxes inside it into that extra room, so
// YouTube's title bar and end-screen strip land outside the box and are
// clipped away. Our box shows only the picture.
const TITLE_PAD = 72;
function coverStyle(box, fullscreen) {
  if (!box) return { inset: 0, width: '100%', height: '100%' };
  const pick = fullscreen ? Math.min : Math.max;
  const w = pick(box.width, (box.height * 16) / 9);
  const h = (w * 9) / 16;
  return { width: w, height: h + TITLE_PAD * 2, left: (box.width - w) / 2, top: (box.height - h) / 2 - TITLE_PAD };
}

export default function ExternalVideo({ media, onState }) {
  const wrap = useRef(null);
  const frame = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [box, setBox] = useState(null);
  const stateCb = useRef(onState);
  stateCb.current = onState;

  const send = (func, args = []) =>
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');

  useEffect(() => {
    const onMessage = (e) => {
      if (e.source !== frame.current?.contentWindow) return;
      let d;
      try {
        d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      const s = d?.event === 'onStateChange' ? d.info : d?.info?.playerState;
      if (s == null) return;
      if (s === 1) setPlaying(true);
      if (s === 2) setPlaying(false);
      if (s === 1 || s === 2 || s === 0) stateCb.current?.(s === 1 ? 'playing' : s === 2 ? 'paused' : 'ended');
    };
    const onFs = () => setFullscreen(document.fullscreenElement === wrap.current);
    // Cover, not contain: size the 16:9 player to overfill the box and centre
    // it, so a tall card crops the sides instead of letterboxing.
    const ro = new ResizeObserver(([e]) => setBox(e.contentRect));
    if (wrap.current) ro.observe(wrap.current);
    window.addEventListener('message', onMessage);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      window.removeEventListener('message', onMessage);
      document.removeEventListener('fullscreenchange', onFs);
      ro.disconnect();
    };
  }, []);

  const onLoad = () => {
    // Subscribe to state events, then make sure it's playing.
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*');
    send('playVideo');
  };

  const toggle = () => {
    if (playing && muted) {
      send('unMute');
      setMuted(false);
      return;
    }
    if (playing) {
      send('pauseVideo');
      setPlaying(false);
    } else {
      send('unMute');
      setMuted(false);
      send('playVideo');
      setPlaying(true);
    }
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else (wrap.current?.requestFullscreen || wrap.current?.webkitRequestFullscreen)?.call(wrap.current);
  };

  return (
    <div ref={wrap} style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'hidden' }}>
      <iframe
        ref={frame}
        title={media.title || 'Embedded video'}
        src={embedUrl(media)}
        onLoad={onLoad}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        style={{ ...coverStyle(box, fullscreen), position: 'absolute', border: 0, background: '#000', pointerEvents: 'none' }}
      />
      <PlayerControls playing={playing} fullscreen={fullscreen} onToggle={toggle} onFullscreen={toggleFullscreen} />
    </div>
  );
}
