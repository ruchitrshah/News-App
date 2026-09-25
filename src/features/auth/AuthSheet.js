// "Sign in to make briefings" — a bottom sheet that appears the first time a
// signed-out person tries to ask, tap + or pick a topic. Watching never asks.
// One action (Continue with Google), one way out (Not now); whatever they
// were trying to do carries on as soon as they're signed in.
//
// Motion: the sheet rises from its own height on the drawer curve (280ms)
// over a fading scrim; it leaves faster (200ms, ease-out). Reduced motion:
// fades only.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Colors, Space, Radius, Motion, FontFamilies, Palette, ColorUtils, useReducedMotion } from '../../brand';
import { useBottomInset } from '../../brand/responsive';
import { TITLE, BODY } from '../feed/type';
import { signInWithGoogle } from '../../lib/auth';

const ENTER_MS = 280;
const EXIT_MS = 200;

// Google's "G" mark, as Google's sign-in branding asks for on the button.
function GoogleG({ size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden>
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

export default function AuthSheet({ visible, onClose }) {
  const reduced = useReducedMotion();
  const bottom = useBottomInset(Space[20]);
  const [mounted, setMounted] = useState(visible);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sheetH, setSheetH] = useState(360);
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setError(null);
      Animated.timing(t, { toValue: 1, duration: ENTER_MS, easing: Motion.ease.drawer, useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(t, { toValue: 0, duration: EXIT_MS, easing: Motion.ease.out, useNativeDriver: true }).start(({ finished }) => {
        if (finished) {
          setMounted(false);
          setBusy(false);
        }
      });
    }
  }, [visible, mounted, t]);

  if (!mounted) return null;

  const onGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
      // Native resolves here; the web redirects away. The session listener
      // in App closes the sheet and resumes what the person was doing.
    } catch (e) {
      setError(e?.message || 'Couldn’t sign in with Google. Try again.');
    } finally {
      if (Platform.OS !== 'web') setBusy(false);
    }
  };

  const translateY = reduced ? 0 : t.interpolate({ inputRange: [0, 1], outputRange: [sheetH, 0] });

  return (
    <View style={styles.root} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[styles.scrim, { opacity: t }]}>
        <Pressable style={styles.fill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      </Animated.View>

      <Animated.View
        style={[styles.sheet, { paddingBottom: bottom, opacity: reduced ? t : 1, transform: [{ translateY }] }]}
        onLayout={(e) => setSheetH(e.nativeEvent.layout.height)}
        accessibilityViewIsModal
      >
        <View style={styles.handle} />
        <Text style={styles.title} accessibilityRole="header">
          Sign in to make briefings
        </Text>
        <Text style={styles.body}>Watching is open to everyone. To ask questions and make your own briefings, sign in with Google.</Text>

        <Pressable
          onPress={onGoogle}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          style={({ pressed }) => [styles.google, pressed && styles.pressed, busy && styles.busy]}
        >
          {busy ? <ActivityIndicator color={Colors.text.primary} /> : <GoogleG />}
          <Text style={styles.googleText}>Continue with Google</Text>
        </Pressable>

        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" style={({ pressed }) => [styles.later, pressed && styles.dim]}>
          <Text style={styles.laterText}>Not now</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 30 },
  fill: { flex: 1 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: ColorUtils.rgba(Palette.base.black, 0.35) },
  sheet: {
    borderTopLeftRadius: Radius[24],
    borderTopRightRadius: Radius[24],
    backgroundColor: Colors.surface.page,
    paddingTop: Space[10],
    paddingHorizontal: Space[24],
    alignItems: 'center',
    gap: Space[8],
  },
  handle: { width: 36, height: 5, borderRadius: 3, backgroundColor: Colors.border.default, marginBottom: Space[12] },
  title: { ...TITLE, textAlign: 'center', color: Colors.text.primary },
  body: { ...BODY, maxWidth: 300, textAlign: 'center', color: Colors.text.secondary, marginBottom: Space[16] },
  google: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.surface.page,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space[10],
  },
  googleText: { ...BODY, fontFamily: FontFamilies.demi, color: Colors.text.primary },
  pressed: { transform: [{ scale: Motion.pressScale }] },
  busy: { opacity: 0.7 },
  error: { ...BODY, textAlign: 'center', color: Colors.status.danger, marginTop: Space[4] },
  later: { paddingVertical: Space[12], marginTop: Space[4] },
  laterText: { ...BODY, fontFamily: FontFamilies.demi, color: Colors.text.tertiary },
  dim: { opacity: 0.6 },
});
