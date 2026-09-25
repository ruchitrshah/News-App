// The page after a news item's last story — a small reward, then onward.
//
//   1. Celebration: a Lottie burst (ring + confetti in the house palette)
//      behind the news illustration, which pops in on a spring. Plays once,
//      each time the page is reached — rare, so it can afford delight.
//   2. Up next: the next news (art + name) and one "Continue Watching" button. Its fill sweeps left →
//      right over 6s (linear: it's a clock), then the feed moves on by itself.
//      Tap to go now; "Stay here" cancels the countdown.
//
// Reduced motion: no burst, no spring or stagger travel — opacity only. The
// countdown still runs (it's information, not decoration).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Animated, Easing, Platform } from 'react-native';
import LottieView from 'lottie-react-native';
import { ArrowRight } from 'lucide';

import Icon from '../../components/icons/Icon';
import { Colors, FontFamilies, Space, Radius, Motion, Palette, ColorUtils, useReducedMotion } from '../../brand';
import { TITLE } from './type';
import { FeedColors } from '../../brand/Feed';
import { illustrationFor } from '../../data/illustrations';
import { useMicActive } from '../composer/micSignal';

const celebrate = require('../../../assets/lottie/celebrate.json');

const COUNTDOWN_MS = 6000;
const COUNTDOWN_DELAY_MS = 700; // let the celebration land first

export default function EndCard({ news, nextNews, isLastNews, active, height, captionBottom, onNextNews }) {
  const reduced = useReducedMotion();
  const micActive = useMicActive();
  // Mounting the burst fresh on each arrival makes it play once, reliably,
  // on every platform (no race with the player loading).
  const [arrival, setArrival] = useState(0);

  // Read the latest callback without restarting the countdown on re-renders.
  const next = useRef(onNextNews);
  next.current = onNextNews;

  // ── Hero pop ──────────────────────────────────────────────────────────────
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      pop.setValue(0);
      return;
    }
    setArrival((n) => n + 1);
    if (reduced) {
      Animated.timing(pop, { toValue: 1, duration: Motion.duration.enter, useNativeDriver: true }).start();
      return;
    }
    Animated.spring(pop, { toValue: 1, ...Motion.spring.pop, useNativeDriver: true }).start();
  }, [active, reduced, pop]);
  const heroScale = reduced ? 1 : pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  // ── Countdown to the next news ────────────────────────────────────────────
  const [stayed, setStayed] = useState(false);
  const fill = useRef(new Animated.Value(0)).current;
  const running = active && !stayed && !micActive;

  useEffect(() => {
    if (!active) setStayed(false);
  }, [active]);

  useEffect(() => {
    if (!running) {
      fill.stopAnimation();
      fill.setValue(0);
      return undefined;
    }
    fill.setValue(0);
    const anim = Animated.timing(fill, {
      toValue: 1,
      duration: COUNTDOWN_MS,
      delay: COUNTDOWN_DELAY_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) next.current?.();
    });
    return () => anim.stop();
  }, [running, fill]);

  return (
    <View style={[styles.page, { height }]}>
      <View style={styles.content}>
        {/* Hero: burst behind the illustration */}
        <View style={styles.hero}>
          {active && !reduced ? (
            <View style={styles.burstLayer} pointerEvents="none">
              <LottieView
                key={arrival}
                source={celebrate}
                autoPlay
                loop={false}
                style={styles.burst}
                webStyle={styles.burstWeb}
                resizeMode="contain"
              />
            </View>
          ) : null}
          <Animated.View style={{ opacity: pop, transform: [{ scale: heroScale }] }}>
            <Image source={illustrationFor(nextNews)} style={styles.heroArt} resizeMode="contain" />
          </Animated.View>
        </View>

        <Text style={styles.kicker}>UP NEXT</Text>
        <Text style={styles.title}>{nextNews.label}</Text>
      </View>

      {/* Docked just above the voice bar. The whole button is the countdown. */}
      <View style={[styles.actions, { bottom: captionBottom - Space[16] + Space[24] }]}>
        <Pressable
          onPress={() => setStayed(true)}
          disabled={!running}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Stay here"
          style={[styles.stay, !running && styles.stayHidden]}
        >
          <Text style={styles.stayText}>Stay here</Text>
        </Pressable>
        <Pressable
          onPress={onNextNews}
          accessibilityRole="button"
          accessibilityLabel={`Continue watching: ${nextNews.label}`}
          accessibilityHint={running ? 'Starts automatically in a few seconds' : undefined}
          style={({ pressed }) => [styles.next, pressed && styles.pressed]}
        >
          <Animated.View style={[styles.nextFill, { transform: [{ scaleX: fill }] }]} pointerEvents="none" />
          <Text style={styles.nextLabel}>Continue Watching</Text>
          <Icon icon={ArrowRight} size={18} strokeWidth={2.2} color={Colors.text.onDark} />
        </Pressable>
      </View>
    </View>
  );
}

const HERO = 104;
const BURST = HERO * 2.8;

const styles = StyleSheet.create({
  page: { overflow: 'hidden', backgroundColor: FeedColors.card },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space[24],
    paddingBottom: Space[64] * 2, // keep the hero centred in the space above the actions
  },
  actions: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pressed: { transform: [{ scale: Motion.pressScale }] },

  // The hero reserves only the illustration's space (plus breathing room);
  // the burst draws around it on its own layer and never affects layout.
  hero: { width: HERO, height: HERO, marginBottom: Space[16], alignItems: 'center', justifyContent: 'center' },
  burstLayer: {
    position: 'absolute',
    width: BURST,
    height: BURST,
    left: (HERO - BURST) / 2,
    top: (HERO - BURST) / 2,
  },
  burst: { width: BURST, height: BURST },
  burstWeb: { width: BURST, height: BURST },
  heroArt: { width: HERO, height: HERO },

  kicker: {
    marginTop: Space[4],
    fontFamily: FontFamilies.demi,
    fontSize: 11,
    letterSpacing: 1.4,
    color: FeedColors.text.tertiary,
  },
  title: {
    marginTop: Space[6],
    ...TITLE,
    textAlign: 'center',
    color: FeedColors.text.primary,
  },

  next: {
    height: Space[48],
    borderRadius: Radius.full,
    backgroundColor: FeedColors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space[8],
    paddingHorizontal: Space[20],
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 10px 24px rgba(17,24,39,0.22)' },
      android: { elevation: 6 },
      default: { shadowColor: '#111827', shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } },
    }),
  },
  // Grows from the left edge; transform-only so it runs on the native driver.
  nextFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: ColorUtils.rgba(Palette.base.white, 0.16),
    transformOrigin: 'left center',
  },
  nextLabel: {
    fontFamily: FontFamilies.demi,
    fontSize: 15,
    color: Colors.text.onDark,
  },

  stay: { marginBottom: Space[18], paddingVertical: Space[4], paddingHorizontal: Space[8] },
  stayHidden: { opacity: 0 },
  stayText: {
    fontFamily: FontFamilies.medium,
    fontSize: 14,
    color: FeedColors.text.tertiary,
    textDecorationLine: 'underline',
  },
});
