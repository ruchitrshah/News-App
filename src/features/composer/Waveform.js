// Live voice bars — the "it's hearing you" signal, centred high on the voice
// screen. Each bar retargets every tick to a height from the live mic level
// (micSignal) times a little randomness, so speech jumps and silence settles.
// Engines that can't meter still get a gentle idle motion.
//
// Bars are pills (fully rounded ends). Height is animated rather than scaleY:
// scaling would squash the round caps into ellipses. It's five small views on
// a 110ms tick, so the JS-driven layout cost is negligible; each step eases
// out from wherever the bar is, so retargeting never stutters.
// Reduced motion: the bars hold still at rest height.
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

import { Motion, useReducedMotion } from '../../brand';
import { getMicLevel } from './micSignal';

const TICK_MS = 110;
const W = 6;
const MIN_H = W; // a dot at rest — a pill never shorter than it is wide
const MAX_H = 44;
const IDLE = 0.3; // floor of motion when the engine reports no level
const SHAPE = [0.55, 0.85, 1, 0.85, 0.55]; // centre-weighted, like a voice envelope

export default function Waveform({ active, color }) {
  const reduced = useReducedMotion();
  const bars = useRef(SHAPE.map(() => new Animated.Value(MIN_H))).current;

  useEffect(() => {
    if (!active || reduced) {
      bars.forEach((b) => b.setValue(MIN_H));
      return undefined;
    }
    const t = setInterval(() => {
      const level = Math.max(getMicLevel(), IDLE);
      bars.forEach((b, i) => {
        const to = MIN_H + (MAX_H - MIN_H) * level * SHAPE[i] * (0.45 + Math.random() * 0.55);
        Animated.timing(b, { toValue: to, duration: TICK_MS, easing: Motion.ease.out, useNativeDriver: false }).start();
      });
    }, TICK_MS);
    return () => clearInterval(t);
  }, [active, reduced, bars]);

  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {bars.map((h, i) => (
        <Animated.View key={i} style={[styles.bar, { height: h, backgroundColor: color }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: MAX_H },
  bar: { width: W, borderRadius: W / 2 },
});
