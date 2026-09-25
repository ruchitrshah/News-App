// Whether the mic is open. The feed listens so the playing explainer pauses
// while you talk — otherwise the recogniser hears the video, not you.
import { useSyncExternalStore } from 'react';

let active = false;
// Also held while something covers the feed entirely (the welcome screen):
// the feed is mounted and ready underneath, but nothing plays or counts down.
let held = false;
const listeners = new Set();

export function setMicActive(next) {
  if (next === active) return;
  active = next;
  listeners.forEach((l) => l());
}

export function setFeedHeld(next) {
  if (next === held) return;
  held = next;
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// True when the feed should hold still: the mic is open, or it's covered.
const read = () => active || held;

export function useMicActive() {
  return useSyncExternalStore(subscribe, read, read);
}

// Whether the voice bar is showing a card above itself (live transcript or a
// notice). Captions sit in the same spot, so they step aside while it's up.
let overlay = false;
const overlayListeners = new Set();

export function setComposerOverlay(next) {
  if (next === overlay) return;
  overlay = next;
  overlayListeners.forEach((l) => l());
}

function subscribeOverlay(listener) {
  overlayListeners.add(listener);
  return () => overlayListeners.delete(listener);
}

const readOverlay = () => overlay;

export function useComposerOverlay() {
  return useSyncExternalStore(subscribeOverlay, readOverlay, readOverlay);
}

// Live input level, 0–1, while the mic is open — drives the waveform in the
// mic pill. A plain value read on the waveform's own tick (no re-renders);
// engines that can't meter leave it at 0 and the waveform idles.
let level = 0;

export function setMicLevel(next) {
  level = Math.max(0, Math.min(1, next || 0));
}

export function getMicLevel() {
  return level;
}
