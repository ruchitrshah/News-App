// Speech-to-text that works inside Expo Go.
//
// Expo Go can't load an on-device speech engine, but it does ship expo-audio's
// recorder. So: record in short chunks, send each finished chunk to a cloud
// transcriber, and append the text as it comes back. The transcript trails
// your voice by roughly a chunk (~2s) — close enough to read as live.
//
// Transcriber: OpenAI `gpt-4o-mini-transcribe`. Needs
//   EXPO_PUBLIC_OPENAI_API_KEY=sk-...
// in a .env file at the project root. EXPO_PUBLIC_ values ship inside the app
// bundle — fine for a prototype on your own phone, never for a release. A
// production build should call a small backend that holds the key.
import { useCallback, useRef, useState } from 'react';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';

import { setMicActive, setMicLevel } from './micSignal';

const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';
const MODEL = 'gpt-4o-mini-transcribe';
const CHUNK_MS = 2000;

const tick = () => new Promise((r) => setTimeout(r, 20));

async function transcribe(uri, context) {
  const form = new FormData();
  form.append('file', { uri, name: 'chunk.m4a', type: 'audio/m4a' });
  form.append('model', MODEL);
  form.append('language', 'en');
  // The tail of what we already have keeps words split across chunks coherent.
  if (context) form.append('prompt', context.slice(-200));

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Transcription failed (${res.status}). ${detail.slice(0, 120)}`);
  }
  const json = await res.json();
  return (json.text ?? '').trim();
}

export default function useCloudSpeech() {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

  const session = useRef(0); // bumps on finish/cancel so late results are dropped
  const text = useRef('');
  const queue = useRef(Promise.resolve()); // keeps chunks in spoken order
  const timer = useRef(null);
  const meter = useRef(null);
  const cycling = useRef(false);

  const enqueue = useCallback((uri, id) => {
    if (!uri) return queue.current;
    queue.current = queue.current.then(async () => {
      try {
        const piece = await transcribe(uri, text.current);
        if (session.current !== id || !piece) return;
        text.current = `${text.current} ${piece}`.trim();
        setTranscript(text.current);
      } catch (e) {
        if (session.current === id) {
          console.warn('[voice]', e.message);
          setError('Couldn’t transcribe that. Check your connection and try again.');
        }
      }
    });
    return queue.current;
  }, []);

  // Close the current chunk, ship it, and immediately open the next one.
  const rotate = useCallback(
    async (id) => {
      if (cycling.current || session.current !== id) return;
      cycling.current = true;
      try {
        await recorder.stop();
        const uri = recorder.uri;
        if (session.current === id) {
          await recorder.prepareToRecordAsync();
          recorder.record();
        }
        enqueue(uri, id);
      } finally {
        cycling.current = false;
      }
    },
    [recorder, enqueue]
  );

  const teardown = useCallback(async () => {
    clearInterval(timer.current);
    timer.current = null;
    clearInterval(meter.current);
    meter.current = null;
    setMicLevel(0);
    setListening(false);
    setMicActive(false);
    try {
      await setAudioModeAsync({ allowsRecording: false });
    } catch {}
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!API_KEY) {
      setError('Voice isn’t set up yet. Add an OpenAI key to .env and restart Expo — or type instead.');
      return false;
    }
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError('Microphone access is off. Turn it on in Settings to ask by voice.');
        return false;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

      const id = ++session.current;
      text.current = '';
      queue.current = Promise.resolve();
      setTranscript('');

      await recorder.prepareToRecordAsync();
      recorder.record();
      setListening(true);
      setMicActive(true);
      timer.current = setInterval(() => rotate(id), CHUNK_MS);
      // Metering is in dBFS (≈ −160 silent … 0 loud); −50…0 covers speech.
      meter.current = setInterval(() => {
        try {
          const db = recorder.getStatus()?.metering;
          if (typeof db === 'number') setMicLevel((db + 50) / 50);
        } catch {}
      }, 100);
      return true;
    } catch (e) {
      setError(e?.message || 'Could not start the microphone.');
      await teardown();
      return false;
    }
  }, [recorder, rotate, teardown]);

  // Stop, transcribe the last chunk, and resolve with everything heard.
  const finish = useCallback(async () => {
    const id = session.current;
    clearInterval(timer.current);
    while (cycling.current) await tick();
    try {
      await recorder.stop();
      enqueue(recorder.uri, id);
    } catch {}
    await teardown();
    await queue.current;
    const heard = text.current.trim();
    session.current += 1;
    text.current = '';
    setTranscript('');
    return heard;
  }, [recorder, enqueue, teardown]);

  const cancel = useCallback(async () => {
    session.current += 1;
    clearInterval(timer.current);
    while (cycling.current) await tick();
    try {
      await recorder.stop();
    } catch {}
    text.current = '';
    setTranscript('');
    await teardown();
  }, [recorder, teardown]);

  const clearError = useCallback(() => setError(null), []);

  return { engine: 'cloud', listening, transcript, error, start, finish, cancel, clearError };
}
