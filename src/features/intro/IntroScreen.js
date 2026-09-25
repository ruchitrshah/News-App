// Welcome — shown once, before the first briefing. Modelled on Apple's
// "Welcome to …" sheets: the app's mark, one line on what it is, three
// short rows on what you can do, one clear button, and a quiet credit.
//
// Motion (seen once, so it can take its time — but never makes you wait):
//   enter     mark rises 12px + scales from 0.94, then the title, then the
//             rows and button, each 70ms apart (fade + 10px rise, 420ms,
//             ease-out). Everything is tappable from the first frame.
//   continue  the whole page fades and lifts 16px (220ms, ease-out) as the
//             feed takes over — exit faster than enter.
//   reduced   fades only.
import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Pressable, Animated, StyleSheet, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clapperboard, AudioLines, Sparkles } from 'lucide';

import Icon from '../../components/icons/Icon';
import { Colors, Space, Radius, Motion, FontFamilies, useReducedMotion } from '../../brand';
import { TITLE, BODY } from '../feed/type';

const MARK = require('../../../assets/splash-icon.png');

const FEATURES = [
  {
    icon: Clapperboard,
    title: 'The news, as short visual stories',
    body: 'Swipeable cards of real footage, photos and key numbers that play on their own.',
  },
  {
    icon: AudioLines,
    title: 'Ask about anything you see',
    body: 'Tap the mic and ask a follow-up. Genie researches it and adds the answer to the story.',
  },
  {
    icon: Sparkles,
    title: 'Make a briefing on any topic',
    body: 'Tap + and say what you’re curious about. Genie checks what’s new and builds it for you.',
  },
];

const ENTER_MS = 420;
const STEP_MS = 70;
const EXIT_MS = 220;

function useRise(delay, reduced, { scaleFrom = 1 } = {}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: ENTER_MS, delay, easing: Motion.ease.out, useNativeDriver: true }).start();
  }, [v, delay]);
  if (reduced) return { opacity: v };
  return {
    opacity: v,
    transform: [
      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [scaleFrom === 1 ? 10 : 12, 0] }) },
      ...(scaleFrom === 1 ? [] : [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [scaleFrom, 1] }) }]),
    ],
  };
}

function Feature({ icon, title, body, style }) {
  return (
    <Animated.View style={[styles.feature, style]}>
      <View style={styles.featureIcon}>
        <Icon icon={icon} size={22} strokeWidth={2} color={Colors.text.onDark} />
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureBody}>{body}</Text>
      </View>
    </Animated.View>
  );
}

// `onStart` fires on tap (the feed mounts underneath as this fades out);
// `onDone` once it's gone.
export default function IntroScreen({ onStart, onDone }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const exit = useRef(new Animated.Value(1)).current;

  const mark = useRise(0, reduced, { scaleFrom: 0.94 });
  const heading = useRise(STEP_MS, reduced);
  const rows = FEATURES.map((_, i) => useRise(STEP_MS * (2 + i), reduced)); // eslint-disable-line react-hooks/rules-of-hooks
  const footer = useRise(STEP_MS * (2 + FEATURES.length), reduced);

  const done = () => {
    onStart?.();
    Animated.timing(exit, { toValue: 0, duration: EXIT_MS, easing: Motion.ease.out, useNativeDriver: true }).start(() => onDone?.());
  };

  const pageStyle = {
    opacity: exit,
    transform: reduced ? [] : [{ translateY: exit.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
  };

  return (
    <Animated.View
      style={[styles.page, { paddingTop: insets.top + Space[40], paddingBottom: insets.bottom + Space[20] }, pageStyle]}
      accessibilityViewIsModal
    >
      <View style={styles.top}>
        <Animated.View style={[styles.markWrap, mark]}>
          <Image source={MARK} style={styles.mark} resizeMode="contain" accessibilityIgnoresInvertColors />
        </Animated.View>

        <Animated.View style={[styles.heading, heading]}>
          <Text style={styles.title} accessibilityRole="header">
            Welcome to Genie
          </Text>
          <Text style={styles.subtitle}>The news, explained in a minute — and you can ask it anything.</Text>
        </Animated.View>

        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <Feature key={f.title} {...f} style={rows[i]} />
          ))}
        </View>
      </View>

      <Animated.View style={[styles.footer, footer]}>
        <Pressable
          onPress={done}
          accessibilityRole="button"
          accessibilityLabel="Get started"
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>Get started</Text>
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL('https://ruchit.me')}
          hitSlop={10}
          accessibilityRole="link"
          style={({ pressed }) => pressed && styles.dim}
        >
          <Text style={styles.credit}>
            Designed by <Text style={styles.creditLink}>ruchit.me</Text>
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    backgroundColor: Colors.surface.page,
    paddingHorizontal: Space[32],
    justifyContent: 'space-between',
  },
  top: { alignItems: 'center' },

  markWrap: { marginBottom: Space[24] },
  mark: { width: 88, height: 88 },

  heading: { alignItems: 'center', gap: Space[8], marginBottom: Space[40] },
  title: { ...TITLE, textAlign: 'center', color: Colors.text.primary },
  subtitle: { ...BODY, textAlign: 'center', color: Colors.text.secondary },

  features: { alignSelf: 'stretch', gap: Space[28] },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: Space[16] },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.text.primary,
  },
  featureText: { flex: 1, gap: Space[2] },
  featureTitle: { ...BODY, fontFamily: FontFamilies.demi, color: Colors.text.primary },
  featureBody: { ...BODY, color: Colors.text.secondary },

  footer: { alignItems: 'center', gap: Space[16] },
  cta: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.text.primary,
  },
  ctaText: { ...BODY, fontFamily: FontFamilies.demi, color: Colors.text.onDark },
  pressed: { transform: [{ scale: Motion.pressScale }] },
  dim: { opacity: 0.6 },
  credit: { ...BODY, color: Colors.text.tertiary },
  creditLink: { fontFamily: FontFamilies.demi, color: Colors.text.primary },
});
