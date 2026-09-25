// The bottom bar: ask about the news by voice (default) or by typing.
//
//   voice      [ 🔖 ]      [  🎤  ]      [ ⌨ ]      🔖 = all news, as a list
//   recording  [ ✕ ]       [  ↑  ]       [ ⌨ ]     + the feed washes out and
//                                                  your words are set large
//                                                  (VoiceOverlay); send lifts
//                                                  them off toward the top
//   keyboard   [ Ask about this story…     ✕  ↑ ]  (one clean field; ✕ closes)
//
// Voice ⇄ keyboard is one morph: the ⌨ circle IS the field. It grows
// leftward from the circle's own footprint to the full width (drawer curve,
// 235ms) while the bookmark and mic fade and shrink away (first half) and
// the field's contents fade in (last half) — the ⌨ glyph fades out where it
// sat. Back to voice runs the same path faster (200ms, ease-out): the choice
// is already made. The field's width is JS-driven (one element; transforms
// would squash its round ends). The bar also rides up with the software
// keyboard on the keyboard's own duration instead of jumping.
// Reduced motion: instant swap, no travel.
//
// Recording looks the same everywhere — from a story or from the +: the left
// button becomes the one ✕ (cancel / close) and the centre stays a single
// pill whose mic glyph becomes the send arrow.
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Animated, Platform, Keyboard, Easing } from 'react-native';
import { Bookmark, Mic, Keyboard as KeyboardGlyph, ArrowUp, X } from 'lucide';

import Icon from '../../components/icons/Icon';
import Glass from '../../components/glass/Glass';
import { Colors, Space, Radius, FontFamilies, FontSizes, Motion, useReducedMotion } from '../../brand';
import { BAR_HEIGHT, BAR_TOP_IN_CARD, CARD, useCardBottom } from '../layout';

import useSpeechToText from './useSpeechToText';
import { setComposerOverlay } from './micSignal';
import VoiceOverlay from './VoiceOverlay';

// Geometry, per the lo-fi: 52dp circles and a ~1.6:1 mic pill floating inside
// the video card's bottom edge (see features/layout.js).
const H = BAR_HEIGHT; // 52
const PILL_W = Space[44] + Space[40]; // 84
const EDGE = Space[12]; // the typing field runs this close to the screen edge
const INSET = CARD.marginX + CARD.innerX - EDGE; // the voice bar sits this much further in
const MORPH_IN_MS = 235; // ~15% quicker than the first cut (280)
const MORPH_OUT_MS = 200;
// iOS keyboard curve (close approximation), so the bar and keyboard move as one.
const KEYBOARD_EASE = Easing.bezier(0.17, 0.59, 0.4, 0.77);

// Distance from the screen bottom to the top of the bar — toasts sit above it.
export function useComposerTop() {
  return useCardBottom() + BAR_TOP_IN_CARD;
}

// Voice errors: said once, then gone. Auto-dismisses after 4s; the X is
// there for anyone who's read it sooner. Enters with a short rise + fade
// (ease-out, 200ms, from 0.97 — never from nothing); leaves instantly.
const NOTICE_MS = 4000;

function Notice({ message, onDismiss }) {
  const reduced = useReducedMotion();
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 200, easing: Motion.ease.out, useNativeDriver: true }).start();
    const t = setTimeout(onDismiss, NOTICE_MS);
    return () => clearTimeout(t);
  }, [enter, onDismiss]);

  const translateY = reduced ? 0 : enter.interpolate({ inputRange: [0, 1], outputRange: [6, 0] });
  const scale = reduced ? 1 : enter.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });

  return (
    <Animated.View style={{ opacity: enter, transform: [{ translateY }, { scale }] }}>
      <Glass tone="dark" radius={Radius[22]} style={[styles.transcript, styles.notice]} accessibilityLiveRegion="polite">
        <Text style={styles.noticeText}>{message}</Text>
        <Pressable
          onPress={onDismiss}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={({ pressed }) => [styles.noticeClose, pressed && styles.pressed]}
        >
          <Icon icon={X} size={18} strokeWidth={1.9} color={Colors.text.onDark} />
        </Pressable>
      </Glass>
    </Animated.View>
  );
}

function PressableGlass({ onPress, label, tone, style, radius = Radius.full, disabled, children }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [style, pressed && styles.pressed]}
    >
      <Glass tone={tone} radius={radius} interactive style={styles.fillCenter}>
        {children}
      </Glass>
    </Pressable>
  );
}

const DEFAULT_PLACEHOLDER = 'Ask about this story';

// Imperative: `openKeyboard(placeholder)` — the rail's + opens the field in
// "new news" mode with its own prompt. `onKeyboardClose` fires when the field
// is dismissed without sending, so the caller can drop that mode.
// `idleHidden`: tuck the voice bar away while idle (the empty feed has its
// own, bigger voice button). It comes back for recording, the + screen and
// typing.
function VoiceComposer({ onSubmit, onList, onKeyboardClose, idleHidden = false }, ref) {
  const cardBottom = useCardBottom();
  const reducedMotion = useReducedMotion();
  const speech = useSpeechToText();

  const [mode, setMode] = useState('voice'); // 'voice' | 'keyboard'
  const [recording, setRecording] = useState(false);
  const [sent, setSent] = useState(null); // the words in flight after Send
  // The + opens a full-screen "new news" composer: the feed is covered
  // completely (it isn't what you're asking about) and the mic starts at once.
  const [creating, setCreating] = useState(false);
  const [flightSolid, setFlightSolid] = useState(false); // sent from that screen
  const [draft, setDraft] = useState('');
  const [placeholder, setPlaceholder] = useState(DEFAULT_PLACEHOLDER);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef(null);
  const [wrapW, setWrapW] = useState(0);
  const [fieldShown, setFieldShown] = useState(false);
  const morph = useRef(new Animated.Value(0)).current; // 0 voice bar · 1 field
  const lift = useRef(new Animated.Value(0)).current; // translateY above the keyboard
  const restBottom = cardBottom + CARD.innerBottom;

  // Ride up with the software keyboard, on its own timing.
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const move = (to, duration) =>
      Animated.timing(lift, { toValue: to, duration: duration || 0, easing: KEYBOARD_EASE, useNativeDriver: true }).start();
    const a = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      move(-Math.max(0, e.endCoordinates.height + Space[8] - restBottom), e.duration);
    });
    const b = Keyboard.addListener(hideEvt, (e) => {
      setKeyboardHeight(0);
      move(0, e?.duration);
    });
    return () => {
      a.remove();
      b.remove();
    };
  }, [lift, restBottom]);

  // The voice ⇄ keyboard morph.
  useEffect(() => {
    const toField = mode === 'keyboard';
    if (toField) setFieldShown(true);
    if (reducedMotion) {
      morph.setValue(toField ? 1 : 0);
      if (!toField) setFieldShown(false);
      return;
    }
    Animated.timing(morph, {
      toValue: toField ? 1 : 0,
      duration: toField ? MORPH_IN_MS : MORPH_OUT_MS,
      easing: toField ? Motion.ease.drawer : Motion.ease.out,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !toField) setFieldShown(false);
    });
  }, [mode, reducedMotion, morph]);

  useEffect(() => {
    if (mode === 'keyboard') setTimeout(() => inputRef.current?.focus(), 50);
  }, [mode]);

  const startVoice = async () => {
    setSent(null);
    const ok = await speech.start();
    setRecording(ok);
  };

  const sendVoice = async () => {
    // Launch what's on screen straight away; the final transcript (cloud STT
    // can take a beat) is what gets asked.
    const wasCreating = creating;
    setFlightSolid(wasCreating);
    setSent(speech.transcript || '');
    setRecording(false);
    setCreating(false);
    const text = await speech.finish();
    if (text) onSubmit?.(text);
    else if (wasCreating) onKeyboardClose?.();
  };

  const openCreate = () => {
    setDraft('');
    setMode('voice');
    Keyboard.dismiss();
    speech.clearError();
    setCreating(true);
    if (!recording) startVoice();
  };

  const closeCreate = () => {
    if (recording) speech.cancel();
    setRecording(false);
    setCreating(false);
    setDraft('');
    setPlaceholder(DEFAULT_PLACEHOLDER);
    Keyboard.dismiss();
    setMode('voice');
    onKeyboardClose?.();
  };

  // Captions share this spot; tell them when a card is up.
  const overlayUp = recording || creating || sent != null || !!speech.error;
  useEffect(() => {
    setComposerOverlay(overlayUp);
  }, [overlayUp]);
  useEffect(() => () => setComposerOverlay(false), []);

  // If the engine gives up mid-sentence, fold the bar back to the mic.
  useEffect(() => {
    if (speech.error && recording) setRecording(false);
  }, [speech.error, recording]);

  const cancelVoice = () => {
    if (creating) return closeCreate();
    speech.cancel();
    setRecording(false);
  };

  const sendTyped = () => {
    const text = draft.trim();
    if (!text) return;
    if (creating) {
      // Same lift-off as a spoken question.
      setFlightSolid(true);
      setSent(text);
      setCreating(false);
    }
    onSubmit?.(text);
    setDraft('');
    setPlaceholder(DEFAULT_PLACEHOLDER);
    Keyboard.dismiss();
    setMode('voice');
  };

  useImperativeHandle(ref, () => ({
    openCreate,
    openKeyboard(nextPlaceholder) {
      setPlaceholder(nextPlaceholder || DEFAULT_PLACEHOLDER);
      setDraft('');
      if (mode === 'keyboard') inputRef.current?.focus();
      else setMode('keyboard');
    },
  }));

  const toKeyboard = () => {
    if (recording) cancelVoice();
    speech.clearError();
    setMode('keyboard');
  };

  // X: throw the draft away and go back to the voice bar.
  const closeKeyboard = () => {
    if (creating) return closeCreate();
    setDraft('');
    setPlaceholder(DEFAULT_PLACEHOLDER);
    Keyboard.dismiss();
    setMode('voice');
    onKeyboardClose?.();
  };

  // Leaving an empty field puts the voice bar back.
  const onBlurField = () => {
    if (creating) return; // the new-news screen stays up; its X closes it
    if (!draft.trim()) {
      setMode('voice');
      setPlaceholder(DEFAULT_PLACEHOLDER);
      onKeyboardClose?.();
    }
  };

  // Where the bar actually is (the overlay places words above it).
  const bottom = keyboardHeight ? keyboardHeight + Space[8] : restBottom;

  // Morph interpolations.
  const barHidden = idleHidden && !recording && !creating && mode === 'voice';
  const barOpacity = morph.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' });
  const barScale = morph.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0.94], extrapolate: 'clamp' });
  const fieldRight = morph.interpolate({ inputRange: [0, 1], outputRange: [INSET, 0] });
  const fieldWidth = morph.interpolate({ inputRange: [0, 1], outputRange: [H, Math.max(H, wrapW)] });
  const glyphOpacity = morph.interpolate({ inputRange: [0, 0.35], outputRange: [1, 0], extrapolate: 'clamp' });
  const contentOpacity = morph.interpolate({ inputRange: [0.45, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const contentX = morph.interpolate({ inputRange: [0.45, 1], outputRange: [-8, 0], extrapolate: 'clamp' });
  const heard = speech.transcript;

  const phase = recording || (creating && sent == null) ? 'listening' : sent != null ? 'sending' : 'hidden';
  const overlayText = recording ? heard || '' : creating ? (mode === 'keyboard' ? draft : '') : sent || '';

  return (
    <>
      <VoiceOverlay
        phase={phase}
        recording={recording}
        text={overlayText}
        hint={creating ? (recording ? 'What news should we explain?' : 'Tap the mic and say a topic') : 'Listening…'}
        solid={creating || (sent != null && flightSolid)}
        bottom={bottom + H}
        onDone={() => {
          setSent(null);
          setFlightSolid(false);
        }}
      />
      <Animated.View
        style={[styles.wrap, { bottom: restBottom, transform: [{ translateY: lift }] }]}
        pointerEvents="box-none"
        onLayout={(e) => setWrapW(e.nativeEvent.layout.width)}
      >
        {/* Errors: shown once, then dismissed. Keyed so a new error restarts the timer. */}
        {!recording && speech.error ? (
          <View style={styles.noticeSlot}>
            <Notice key={speech.error} message={speech.error} onDismiss={speech.clearError} />
          </View>
        ) : null}

        <View style={styles.row}>
          <Animated.View
            style={[styles.bar, { opacity: barHidden ? 0 : barOpacity, transform: [{ scale: barScale }] }]}
            pointerEvents={mode === 'voice' && !barHidden ? 'auto' : 'none'}
          >
            {creating || recording ? (
              <PressableGlass onPress={creating ? closeCreate : cancelVoice} label={creating ? 'Close' : 'Cancel'} style={styles.circle}>
                <Icon icon={X} size={22} strokeWidth={1.9} color={Colors.text.primary} />
              </PressableGlass>
            ) : (
              <PressableGlass onPress={onList} label="All news" style={styles.circle}>
                <Icon icon={Bookmark} size={22} strokeWidth={1.9} color={Colors.text.primary} />
              </PressableGlass>
            )}

            <PressableGlass
              tone="dark"
              onPress={recording ? sendVoice : startVoice}
              label={recording ? 'Send question' : 'Ask by voice'}
              style={styles.pill}
            >
              <Icon icon={recording ? ArrowUp : Mic} size={22} strokeWidth={2} color={Colors.text.onDark} />
            </PressableGlass>

            {/* While the field is up, it is this button — hide the original. */}
            <PressableGlass onPress={toKeyboard} label="Type instead" style={[styles.circle, fieldShown && styles.hidden]}>
              <Icon icon={KeyboardGlyph} size={22} strokeWidth={1.9} color={Colors.text.primary} />
            </PressableGlass>
          </Animated.View>
          {fieldShown ? (
            <Animated.View
              style={[styles.fieldBox, { right: fieldRight, width: fieldWidth }]}
              pointerEvents={mode === 'keyboard' ? 'auto' : 'none'}
            >
              <Glass radius={Radius.full} style={styles.fieldGlass}>
                <Animated.View style={[styles.field, { width: wrapW, opacity: contentOpacity, transform: [{ translateX: contentX }] }]}>
                  <TextInput
                    ref={inputRef}
                    value={draft}
                    onChangeText={setDraft}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.text.tertiary}
                    cursorColor={Colors.text.primary}
                    selectionColor={Colors.brand.primary}
                    style={styles.input}
                    returnKeyType="send"
                    onSubmitEditing={sendTyped}
                    onBlur={onBlurField}
                  />
                  <Pressable
                    onPress={closeKeyboard}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Close keyboard"
                    style={({ pressed }) => [styles.fieldClose, pressed && styles.pressed]}
                  >
                    <Icon icon={X} size={20} strokeWidth={1.9} color={Colors.text.tertiary} />
                  </Pressable>
                  {draft.trim() ? (
                    <Pressable
                      onPress={sendTyped}
                      accessibilityRole="button"
                      accessibilityLabel="Send question"
                      style={({ pressed }) => [styles.fieldSend, pressed && styles.pressed]}
                    >
                      <Icon icon={ArrowUp} size={20} strokeWidth={2.2} color={Colors.text.onDark} />
                    </Pressable>
                  ) : null}
                </Animated.View>
                <Animated.View style={[styles.fieldGlyph, { opacity: glyphOpacity }]} pointerEvents="none">
                  <Icon icon={KeyboardGlyph} size={22} strokeWidth={1.9} color={Colors.text.primary} />
                </Animated.View>
              </Glass>
            </Animated.View>
          ) : null}
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  // Spans nearly edge to edge so the typing field can; the voice bar keeps
  // the card's inset with its own padding.
  wrap: {
    position: 'absolute',
    left: EDGE,
    right: EDGE,
  },
  noticeSlot: { paddingHorizontal: INSET },
  row: { height: H },
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: INSET,
    height: H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pressed: { transform: [{ scale: Motion.pressScale }] },
  fillCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  circle: { width: H, height: H },

  pill: { width: PILL_W, height: H },

  hidden: { opacity: 0 },
  // Clips the full-width contents while the pill is still narrow, so they
  // never reflow mid-morph.
  fieldBox: { position: 'absolute', top: 0, height: H, borderRadius: Radius.full, overflow: 'hidden' },
  fieldGlass: { flex: 1 },
  fieldGlyph: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: H,
    height: H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Space[20],
    paddingRight: Space[6],
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: FontFamilies.medium,
    fontSize: FontSizes[17],
    color: Colors.text.primary,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null),
  },
  fieldClose: {
    width: Space[40],
    height: Space[40],
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldSend: {
    width: Space[40],
    height: Space[40],
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.text.primary,
  },

  transcript: {
    marginBottom: Space[12],
    paddingHorizontal: Space[18],
    paddingVertical: Space[14],
  },
  notice: { flexDirection: 'row', alignItems: 'center', gap: Space[10], paddingRight: Space[12] },
  noticeText: {
    flex: 1,
    fontFamily: FontFamilies.medium,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.text.onDark,
  },
  noticeClose: { width: Space[28], height: Space[28], alignItems: 'center', justifyContent: 'center' },
});

export default forwardRef(VoiceComposer);
