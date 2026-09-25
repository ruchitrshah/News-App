// Pixel-grid loader — React Native port of the web LoadingState grid.
//
//   drive  square cells, chevron wavefront driving right; the 650ms cycle is
//          shorter than the sweep, so two fronts are always in flight
//   dots   the same wavefront, round cells
//   orbit  a comet lapping the grid perimeter
//
// Cells rest at 0.15 (0.07 for the orbit's idle centre) and pulse to full on
// an ease-in-out cycle. Each cell's delay only offsets its start, like CSS
// animation-delay, so fronts never drift apart. Reduced motion freezes the
// grid in its dim state.
import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';

import { Colors, useReducedMotion } from '../../brand';

const chevron = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3);
  const c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});

const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
const orbit = Array.from({ length: 9 }, (_, i) => {
  const k = ORBIT_ORDER.indexOf(i);
  return k === -1 ? null : k * 110;
});

export const PATTERNS = {
  drive: { delays: chevron, dur: 650, round: false },
  dots: { delays: chevron, dur: 650, round: true },
  orbit: { delays: orbit, dur: 950, round: false },
};

const DIM = 0.15;
const IDLE = 0.07;
const inOut = Easing.inOut(Easing.ease);

function Cell({ delay, dur, round, size, color, reduced }) {
  const v = useRef(new Animated.Value(delay === null ? IDLE : DIM)).current;

  useEffect(() => {
    if (delay === null || reduced) {
      v.setValue(delay === null ? IDLE : DIM);
      return undefined;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: dur / 2, easing: inOut, useNativeDriver: true }),
        Animated.timing(v, { toValue: DIM, duration: dur / 2, easing: inOut, useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => pulse.start(), delay);
    return () => {
      clearTimeout(t);
      pulse.stop();
    };
  }, [delay, dur, reduced, v]);

  return (
    <Animated.View
      style={{ width: size, height: size, borderRadius: round ? size / 2 : 1, backgroundColor: color, opacity: v }}
    />
  );
}

export default function PixelLoader({ variant = 'drive', size = 4, gap = 1.5, color = Colors.text.primary }) {
  const reduced = useReducedMotion();
  const { delays, dur, round } = PATTERNS[variant] ?? PATTERNS.drive;
  return (
    <View
      style={[styles.grid, { width: size * 3 + gap * 2, gap }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {delays.map((delay, i) => (
        <Cell key={i} delay={delay} dur={dur} round={round} size={size} color={color} reduced={reduced} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', flexShrink: 0 },
});
