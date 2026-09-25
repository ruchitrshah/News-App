// Playback progress (0–1) of the story on screen. An external store so the
// story bar can tick ~10×/s without re-rendering the feed around it.
import { useSyncExternalStore } from 'react';

let value = 0;
const listeners = new Set();

export function setPlayback(next) {
  const v = Math.max(0, Math.min(1, next || 0));
  if (v === value) return;
  value = v;
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const read = () => value;

export function usePlayback() {
  return useSyncExternalStore(subscribe, read, read);
}
