// Welcome — shown once, before the first briefing. Modelled on Apple's
// "Welcome to …" sheets: the app's mark, a title, one line on what it does,
// one button, and a quiet credit.
//
// Layout: the page uses the feed's own content inset (card margin + inner
// inset), so Get started spans exactly where the voice bar sits on the feed
// you land on.
//
// Motion (seen once, so it can take its time — but never makes you wait):
//   enter     mark rises 12px + scales from 0.94, then the words, then the
//             button, 70ms apart (fade + 10px rise, 420ms,
//             ease-out). Everything is tappable from the first frame.
//   continue  the welcome dissolves forward — fade + scale to 1.04 (260ms,
//             ease-out) — while the feed underneath settles from 0.96 to 1
//             and fades in (App.js). One continuous hand-off, faster than
//             the entrance.
//   reduced   fades only.
import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Pressable, Animated, StyleSheet, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Space, Radius, Motion, FontFamilies, useReducedMotion } from '../../brand';
import { TITLE, BODY } from '../feed/type';
import { CARD } from '../layout';

const MARK = require('../../../assets/splash-icon.png');

const ENTER_MS = 420;
const STEP_MS = 70;
const EXIT_MS = 260;

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

// `onStart` fires on tap (the feed mounts underneath as this fades out);
// `onDone` once it's gone.
export default function IntroScreen({ onStart, onDone }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const exit = useRef(new Animated.Value(1)).current;

  const mark = useRise(0, reduced, { scaleFrom: 0.94 });
  const heading = useRise(STEP_MS, reduced);
  const footer = useRise(STEP_MS * 2, reduced);

  const done = () => {
    onStart?.();
    Animated.timing(exit, { toValue: 0, duration: EXIT_MS, easing: Motion.ease.out, useNativeDriver: true }).start(() => onDone?.());
  };

  const pageStyle = {
    opacity: exit,
    transform: reduced ? [] : [{ scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1.04, 1] }) }],
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
          <Text style={styles.subtitle}>
            Learn about any trending topic, news, or anything. Just talk about it and get a course made for you in minutes.
          </Text>
        </Animated.View>
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
    paddingHorizontal: CARD.marginX + CARD.innerX,
    justifyContent: 'space-between',
  },
  // Mark and words sit centred in the space above the button.
  top: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: Space[24] },

  markWrap: { marginBottom: Space[24] },
  mark: { width: 88, height: 88 },

  heading: { alignItems: 'center', gap: Space[8] },
  title: { ...TITLE, textAlign: 'center', color: Colors.text.primary },
  // Narrower than the page so the two sentences break evenly, no lone word.
  subtitle: { ...BODY, maxWidth: 290, textAlign: 'center', color: Colors.text.secondary },


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
  // Subtle: same size and colour as the line, just underlined.
  creditLink: { textDecorationLine: 'underline' },
});
