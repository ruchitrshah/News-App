// What you see while you talk: the feed washes out under a white veil (soft at
// the top, solid by the bar) and your words are set in the middle,
// newest words arriving in a lighter ink and settling darker.
//
// Solid (from the +): an opaque grey-to-white screen instead — the feed behind
// isn't what you're asking about, so none of it shows.
//
// Send: the question lifts off toward the top of the screen — the feed it's
// about to become — while the veil clears behind it.
//
//   listening  veil 0→1 · 240ms ease-out; words rise 12px + fade in
//   sending    words travel up ~45% of the screen · 460ms ease-in-out, scale
//              to 0.94, fading over the last 40%; veil clears (320ms, 100ms in)
//   reduced    no travel — opacity only
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { Colors, Space, Motion, Palette, ColorUtils, useReducedMotion } from '../../brand';
import { TITLE } from '../feed/type';
import Waveform from './Waveform';

const SETTLE_MS = 320; // how long a new word stays light before it darkens

function Words({ text, hint }) {
  const words = text.split(/\s+/).filter(Boolean);
  const [settled, setSettled] = useState(words.length);
  useEffect(() => {
    const t = setTimeout(() => setSettled(words.length), SETTLE_MS);
    return () => clearTimeout(t);
  }, [words.length]);
  if (!words.length) return <Text style={[styles.words, styles.fresh]}>{hint}</Text>;
  return (
    <Text style={styles.words} accessibilityLiveRegion="polite">
      {words.map((w, i) => (
        <Text key={i} style={i >= settled ? styles.fresh : null}>
          {i ? ' ' : ''}
          {w}
        </Text>
      ))}
    </Text>
  );
}

export default function VoiceOverlay({ phase, recording = false, text, hint = 'Listening…', solid = false, bottom, onDone }) {
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();
  const veil = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const fly = useRef(new Animated.Value(0)).current;
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (phase === 'listening') {
      fly.setValue(0);
      enter.setValue(0);
      Animated.parallel([
        Animated.timing(veil, { toValue: 1, duration: 240, easing: Motion.ease.out, useNativeDriver: true }),
        Animated.timing(enter, { toValue: 1, duration: Motion.duration.enter, easing: Motion.ease.out, useNativeDriver: true }),
      ]).start();
    } else if (phase === 'sending') {
      Animated.parallel([
        Animated.timing(fly, { toValue: 1, duration: 460, easing: Motion.ease.inOut, useNativeDriver: true }),
        Animated.timing(veil, { toValue: 0, duration: 320, delay: 100, easing: Motion.ease.out, useNativeDriver: true }),
      ]).start(({ finished }) => finished && done.current?.());
    } else {
      Animated.timing(veil, { toValue: 0, duration: Motion.duration.exit, easing: Motion.ease.out, useNativeDriver: true }).start();
      Animated.timing(enter, { toValue: 0, duration: Motion.duration.exit, easing: Motion.ease.out, useNativeDriver: true }).start();
    }
  }, [phase, veil, enter, fly]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (phase !== 'hidden') setMounted(true);
    else {
      const t = setTimeout(() => setMounted(false), Motion.duration.exit + 20);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase]);
  if (!mounted) return null;

  const travel = reduced ? 0 : -height * 0.45;
  const translateY = Animated.add(
    enter.interpolate({ inputRange: [0, 1], outputRange: [reduced ? 0 : 12, 0] }),
    fly.interpolate({ inputRange: [0, 1], outputRange: [0, travel] })
  );
  const scale = fly.interpolate({ inputRange: [0, 1], outputRange: [1, reduced ? 1 : 0.94] });
  const opacity = Animated.multiply(enter, fly.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] }));

  return (
    <View style={styles.fill} pointerEvents={phase === 'listening' ? 'auto' : 'none'}>
      <Animated.View style={[styles.fill, { opacity: veil }]}>
        {solid ? (
          // New news: nothing behind shows through — a soft grey dusk
          // settling into white where your words appear.
          <LinearGradient
            colors={[Palette.neutral[300], Palette.neutral[200], Palette.base.white]}
            locations={[0, 0.3, 0.62]}
            style={styles.fill}
          />
        ) : (
          <>
            <BlurView intensity={24} tint="light" style={styles.fill} />
            <LinearGradient
              colors={[ColorUtils.rgba(Palette.base.white, 0.55), ColorUtils.rgba(Palette.base.white, 0.88), Palette.base.white]}
              locations={[0, 0.5, 1]}
              style={styles.fill}
            />
          </>
        )}
      </Animated.View>
      {/* Live bars, centred high on the screen, while the mic is open. They
          fade with the veil; on Send they leave with it. */}
      <Animated.View style={[styles.wave, { opacity: enter }]} pointerEvents="none">
        <Waveform active={recording && phase === 'listening'} color={Colors.text.primary} />
      </Animated.View>
      <Animated.View style={[styles.textWrap, { bottom: bottom + Space[56], opacity, transform: [{ translateY }, { scale }] }]}>
        <Words text={text} hint={hint} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  textWrap: { position: 'absolute', left: Space[32], right: Space[32] },
  wave: { position: 'absolute', top: '16%', left: 0, right: 0, alignItems: 'center' },
  words: { ...TITLE, textAlign: 'center', color: Colors.text.primary },
  fresh: { color: Colors.text.muted },
});
