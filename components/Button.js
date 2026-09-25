import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { ComponentTokens } from '../brand/Colors';
import { Space } from '../brand/Spacing';
import { Radius } from '../brand/Radii';
import { Type } from '../brand/Typescale';
import { Motion, useReducedMotion } from '../brand/Motion';

// The touchable itself is animated rather than wrapped in an Animated.View.
// A wrapper would swallow the caller's layout style (`flex: 1`, `width: '100%'`)
// and leave the button sized by its content instead of by the row it sits in.
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const getButtonTokens = (variant, disabled) => {
  const key = variant === 'whiteSolid' ? 'white' : variant;
  const v = ComponentTokens.button[key] || ComponentTokens.button.primary;
  return disabled ? ComponentTokens.button.disabled : v;
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  haptic = 'light',
  style,
  children,

  // ── Success morph ───────────────────────────────────────────────────────
  // When `success` flips true the label crossfades into an icon (and optional
  // shorter label) in place. The confirmation lands on the element the user is
  // already looking at — their finger is still on it — instead of somewhere
  // else on screen. Set it back to false to return to the idle label.
  success = false,
  successTitle,
  SuccessIcon,
}) {
  const tokens = getButtonTokens(variant, disabled);

  // Ghost buttons are the tab bar icons, pressed dozens of times a day and
  // already carrying a focus animation of their own. Doubling up would make
  // the most frequent interaction in the app the busiest one.
  const reducedMotion = useReducedMotion();
  const pressFeedback = variant !== 'ghost' && !disabled && !loading && !reducedMotion;

  const pressAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(success ? 1 : 0)).current;
  const hasSuccessLayer = !!SuccessIcon || !!successTitle;

  useEffect(() => {
    Animated.spring(successAnim, {
      toValue: success ? 1 : 0,
      ...Motion.spring.pop,
      useNativeDriver: true,
    }).start();
  }, [success, successAnim]);

  const animatePress = useCallback(
    (toValue) => {
      if (!pressFeedback) return;
      Animated.timing(pressAnim, {
        toValue,
        duration: toValue === 1 ? Motion.duration.pressIn : Motion.duration.pressOut,
        easing: Motion.ease.out,
        useNativeDriver: true,
      }).start();
    },
    [pressAnim, pressFeedback]
  );

  const triggerHaptic = useCallback(async () => {
    if (Platform.OS === 'web' || haptic === 'none') return;

    try {
      if (haptic === 'light') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (haptic === 'medium') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (haptic === 'heavy') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else if (haptic === 'success') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.warn('[Button] Haptic failed:', err);
    }
  }, [haptic]);

  const handlePress = useCallback(async () => {
    if (!onPress || disabled || loading) return;

    await triggerHaptic();
    onPress();
  }, [onPress, disabled, loading, triggerHaptic]);

  const pressScale = useMemo(
    () =>
      pressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, Motion.pressScale],
      }),
    [pressAnim]
  );

  const buttonStyle = useMemo(
    () => [
      styles.buttonBase,
      variant === 'outline' && styles.outlineChrome,
      variant === 'whiteSolid' && styles.whiteSolidButton,
      variant === 'whiteOutline' && styles.whiteOutlineChrome,
      variant === 'ghost' && styles.ghostChrome,
      { backgroundColor: tokens.background, borderColor: tokens.border },
      disabled && styles.disabledChrome,
      style,
      // Last so the transform survives a caller passing its own `style`.
      pressFeedback && { transform: [{ scale: pressScale }] },
    ],
    [variant, tokens, disabled, style, pressFeedback, pressScale]
  );

  const textStyle = useMemo(
    () => [styles.textBase, { color: tokens.foreground }],
    [tokens]
  );

  // The two layers cross rather than dissolve: the idle label is gone before
  // the confirmation is fully in, so you never read both at once.
  const idleOpacity = successAnim.interpolate({
    inputRange: [0, 0.45],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const idleScale = successAnim.interpolate({
    inputRange: [0, 1],
    outputRange: reducedMotion ? [1, 1] : [1, 0.88],
    extrapolate: 'clamp',
  });
  const successOpacity = successAnim.interpolate({
    inputRange: [0.35, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  // Starts at 0.8, never 0 — nothing in the real world appears from nothing.
  const successScale = successAnim.interpolate({
    inputRange: [0, 1],
    // Reduced motion keeps the crossfade — it carries the meaning — and drops
    // the scale, which is the part that moves.
    outputRange: reducedMotion ? [1, 1] : [0.8, 1],
    extrapolate: 'clamp',
  });

  const label = children || (
    <Text
      style={textStyle}
      // A button label must never wrap: a two-line label makes that
      // button taller than the one beside it, which is what made
      // Skip For Now / Accept Request look mismatched. Shrink the
      // text a touch rather than truncating it.
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.85}
    >
      {title}
    </Text>
  );

  return (
    <AnimatedTouchable
      style={buttonStyle}
      onPress={handlePress}
      onPressIn={() => animatePress(1)}
      onPressOut={() => animatePress(0)}
      disabled={disabled || loading}
      // The scale is the feedback. A deep opacity fade on top of it reads as
      // two different things happening to one button.
      activeOpacity={pressFeedback ? 0.92 : 0.7}
    >
      {loading ? (
        <ActivityIndicator color={tokens.spinner} />
      ) : hasSuccessLayer ? (
        <View style={styles.contentContainer}>
          <Animated.View
            style={[
              styles.contentContainer,
              { opacity: idleOpacity, transform: [{ scale: idleScale }] },
            ]}
          >
            {label}
          </Animated.View>

          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              styles.successLayer,
              { opacity: successOpacity, transform: [{ scale: successScale }] },
            ]}
          >
            {!!SuccessIcon && (
              <SuccessIcon size={18} color={tokens.foreground} strokeWidth={2.6} />
            )}
            {!!successTitle && (
              <Text style={textStyle} numberOfLines={1}>
                {successTitle}
              </Text>
            )}
          </Animated.View>
        </View>
      ) : (
        <View style={styles.contentContainer}>{label}</View>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  buttonBase: {
    paddingVertical: Space[16],
    paddingHorizontal: Space[32],
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Space[52],
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successLayer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space[8],
  },
  outlineChrome: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  whiteOutlineChrome: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  whiteSolidButton: {
    borderWidth: 0,
  },
  ghostChrome: {
    backgroundColor: 'transparent',
    paddingVertical: Space[8],
    paddingHorizontal: Space[12],
    minHeight: Space[40],
  },
  disabledChrome: {
    borderWidth: 0,
  },
  textBase: {
    ...Type.button,
  },
});
