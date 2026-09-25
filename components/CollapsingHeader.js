import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { Space, Spacing, Type } from '../brand';

/**
 * The scroll-linked page title that PublicProfileScreen introduced, factored
 * out so every screen crosses over at the same speed and lands the title in
 * the same place.
 *
 * Continuity, not decoration: the title doesn't appear from nowhere, it moves
 * from the page heading to the bar at the moment the heading stops showing it.
 * Driven straight off scroll position, so it tracks the finger rather than
 * firing a fixed-length animation after the fact.
 */

// Matches PublicProfileScreen.headerBar: 10 above a 40dp bar. The compact title
// therefore lands at the same y whether the bar holds buttons or not.
export const HEADER_BAR_HEIGHT = Spacing.screen.headerTop + Space[40];

// Where the crossover happens depends on where the heading starts, and that
// depends on whether the bar is in the flow or over it.
//
// Every page heading is `pageTitle` (28/36) under `paddingTop: 24`, so it
// occupies content-y 24-60 and has scrolled off at 60px. Fading in across a
// 40px band ending just past that puts the bar at full exactly as the heading
// leaves. This is the case for an overlay bar, where content starts at y=0.
export const TITLE_RANGE = { start: 24, end: 64 };

// PublicProfileScreen's bar is in the flow — it holds back and share, so it is
// always visible — which pushes the heading down by HEADER_BAR_HEIGHT and
// delays the crossover by the same amount. These are the shipped values.
export const TITLE_RANGE_BELOW_BAR = { start: 90, end: 130 };

// A linear ramp reads mechanical: the bar arrives at a constant rate no matter
// how fast the finger is moving. Sampling a strong ease-out
// (cubic-bezier(0.23, 1, 0.32, 1)) at quarter points gets most of the way there
// and, unlike `interpolate`'s `easing` option, is supported by the native
// driver — so this still runs off the main thread.
const EASE_OUT_STOPS = [0, 0.25, 0.5, 0.75, 1];
const EASE_OUT_VALUES = [0, 0.63, 0.87, 0.97, 1];

const easedRange = (start, end) =>
  EASE_OUT_STOPS.map((t) => start + (end - start) * t);

/** Reduce Motion means less movement, not less clarity — the fade stays. */
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => {
      if (alive) setReduced(Boolean(v));
    });
    const sub = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      setReduced
    );
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}

export function useCollapsingTitle({ start, end } = TITLE_RANGE) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotion();

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY]
  );

  const inputRange = easedRange(start, end);

  const opacity = scrollY.interpolate({
    inputRange,
    outputRange: EASE_OUT_VALUES,
    extrapolate: 'clamp',
  });

  // 6px is enough to read as movement without becoming a separate animation
  // competing with the scroll itself.
  const shift = scrollY.interpolate({
    inputRange,
    outputRange: EASE_OUT_VALUES.map((v) => (reducedMotion ? 0 : 6 * (1 - v))),
    extrapolate: 'clamp',
  });

  return { scrollY, onScroll, scrollEventThrottle: 16, opacity, shift };
}

/**
 * The bar for screens with no persistent header buttons — Discover, your own
 * profile, Interested In You, Messages.
 *
 * It overlays rather than sits in the flow and is fully transparent at rest, so
 * at scroll 0 these screens lay out exactly as they did before. It only becomes
 * a surface once there is scrolled content to sit on top of.
 */
export function CollapsingHeaderOverlay({ title, opacity, shift, style }) {
  const insets = useSafeAreaInsets();

  if (!title) return null;

  // Yoga positions an absolute child with `top` against the parent's BORDER
  // box, not its padding box — padding is only added on the no-inset path
  // (see AbsoluteLayout.cpp: position = top + border + margin). So inside a
  // SafeAreaView edges={['top']}, `top: 0` lands INSIDE the status-bar inset,
  // which hid this bar behind the notch entirely. The bar owns the inset
  // itself instead, which is also the correct nav-bar look: the surface runs
  // under the status bar and the title sits below it.
  const height = insets.top + HEADER_BAR_HEIGHT;
  const paddingTop = insets.top + Spacing.screen.headerTop;

  return (
    <Animated.View
      // Never intercepts touches: it covers the first rows of the list.
      pointerEvents="none"
      style={[styles.overlay, { height, opacity }, style]}
    >
      <HeaderSurface />

      <View style={[styles.content, { paddingTop }]}>
        <Animated.Text
          numberOfLines={1}
          style={[styles.title, { transform: [{ translateY: shift }] }]}
        >
          {title}
        </Animated.Text>
      </View>

      <View style={styles.bottomBorder} />
    </Animated.View>
  );
}

/**
 * Same treatment as TabBar, so the top and bottom of the screen read as the
 * same material. expo-blur has no blur on Android without the Dimezis backend,
 * where a BlurView is just a translucent panel that content shows through — so
 * Android gets the opaque surface, matching TabBar and PublicViewerNavbar.
 */
function HeaderSurface() {
  if (Platform.OS === 'android') {
    return <View style={[StyleSheet.absoluteFill, styles.androidGlass]} />;
  }
  return (
    <BlurView
      intensity={55}
      tint="systemMaterial"
      style={StyleSheet.absoluteFill}
    >
      <View style={styles.glassSheen} />
    </BlurView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: Space[20],
    justifyContent: 'center',
  },
  androidGlass: { backgroundColor: 'rgba(255,255,255,0.92)' },
  glassSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bottomBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  title: {
    ...Type.primaryValue,
    textAlign: 'center',
  },
});

export default CollapsingHeaderOverlay;
