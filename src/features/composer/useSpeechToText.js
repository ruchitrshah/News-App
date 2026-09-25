// Live speech-to-text for the voice bar. Two engines, one interface:
//
//   native — expo-speech-recognition: the OS recogniser on iOS/Android and the
//            Web Speech API on web. Instant, on-device. Needs a development
//            build on phones (it's native code Expo Go doesn't include).
//   cloud  — useCloudSpeech: expo-audio chunks → cloud transcription. Works in
//            Expo Go. See that file for the API key it needs.
//
// The engine is picked once, at load: native when its module exists.
import { useCallback, useEffect, useRef, useState } from 'react';

import useCloudSpeech from './useCloudSpeech';
import { setMicActive, setMicLevel } from './micSignal';

let Speech = null;
try {
  // Throws at import time when the native module isn't in the binary.
  Speech = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
} catch {
  Speech = null;
}

// Say what happened and what to do, not what the engine called it.
function friendly(code) {
  switch (code) {
    case 'network':
      return 'Voice needs a connection. Check your internet and try again.';
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Want to speak? Enable your mic.';
    case 'audio-capture':
      return 'No microphone found.';
    case 'busy':
      return 'The mic is busy with another app. Try again in a moment.';
    default:
      return 'Voice stopped. Tap the mic to try again.';
  }
}

function useNativeSpeech({ lang = 'en-US' } = {}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

  // Android and web deliver the utterance in finalised segments; iOS sends
  // the whole running transcript. Keep finished segments and append the live one.
  const committed = useRef('');
  const cancelled = useRef(false);

  useEffect(() => {
    if (!Speech) return undefined;
    const subs = [
      Speech.addListener('start', () => setListening(true)),
      Speech.addListener('end', () => {
        setListening(false);
        setMicActive(false);
        setMicLevel(0);
      }),
      // −2 (silence) … 10 (loud) → 0–1 for the waveform.
      Speech.addListener('volumechange', (event) => setMicLevel(((event.value ?? -2) + 2) / 12)),
      Speech.addListener('result', (event) => {
        if (cancelled.current) return;
        const text = event.results?.[0]?.transcript ?? '';
        if (event.isFinal) {
          committed.current = `${committed.current}${text} `;
          setTranscript(committed.current.trim());
        } else {
          setTranscript(`${committed.current}${text}`.trim());
        }
      }),
      Speech.addListener('error', (event) => {
        setListening(false);
        // "aborted" is us cancelling; "no-speech" just means silence.
        if (event.error === 'aborted' || event.error === 'no-speech') return;
        setMicActive(false);
        setError(friendly(event.error));
      }),
    ];
    return () => subs.forEach((s) => s?.remove?.());
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const perm = await Speech.requestPermissionsAsync();
      if (!perm.granted) {
        setError('Want to speak? Enable your mic in Settings.');
        return false;
      }
      committed.current = '';
      cancelled.current = false;
      setTranscript('');
      Speech.start({
        lang,
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
      });
      setListening(true);
      setMicActive(true);
      return true;
    } catch (e) {
      setError(e?.message || 'Could not start the microphone.');
      setListening(false);
      return false;
    }
  }, [lang]);

  // Stop listening and hand back what was heard.
  const finish = useCallback(() => {
    const text = transcript.trim();
    cancelled.current = true;
    try {
      Speech?.stop();
    } catch {}
    setListening(false);
    setMicActive(false);
    setTranscript('');
    committed.current = '';
    return text;
  }, [transcript]);

  const cancel = useCallback(() => {
    cancelled.current = true;
    try {
      Speech?.abort();
    } catch {}
    setListening(false);
    setMicActive(false);
    setTranscript('');
    committed.current = '';
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { engine: 'native', listening, transcript, error, start, finish, cancel, clearError };
}

const useSpeechToText = Speech ? useNativeSpeech : useCloudSpeech;
export default useSpeechToText;
