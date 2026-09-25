// Time-on-card for stories that aren't a playing video (text, image, number,
// embedded clip): drives the story bar's live segment and hands off to the
// next story when time's up — so a briefing plays through hands-free, the
// same way videos do. Pauses while the mic is open; resets when you leave.
import { useEffect, useRef } from 'react';

import { setPlayback } from './playback';
import { useMicActive } from '../composer/micSignal';

export function readingTime(...texts) {
  const words = texts.filter(Boolean).join(' ').split(/\s+/).filter(Boolean).length;
  return Math.min(11000, Math.max(5000, 2200 + words * 260)); // ~230 wpm plus a beat to take in the visual
}

export default function useDwell({ active, ms, onEnded, paused = false }) {
  const micActive = useMicActive();
  const elapsed = useRef(0);
  const done = useRef(false);
  const ended = useRef(onEnded);
  ended.current = onEnded;

  useEffect(() => {
    if (!active) {
      elapsed.current = 0;
      done.current = false;
    }
  }, [active]);

  useEffect(() => {
    if (!active || paused || micActive || !ms) return undefined;
    let last = Date.now();
    const t = setInterval(() => {
      const now = Date.now();
      elapsed.current += now - last;
      last = now;
      setPlayback(elapsed.current / ms);
      if (elapsed.current >= ms && !done.current) {
        done.current = true;
        ended.current?.();
      }
    }, 100);
    return () => clearInterval(t);
  }, [active, paused, micActive, ms]);
}
