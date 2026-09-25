import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, Space, Type } from '../brand';
import { useBottomInset } from '../brand/responsive';

/**
 * Footer
 * Absolutely positioned action bar pinned to the bottom of a screen.
 * Variants:
 * - 'single': one primary action (default)
 * - 'dual': two actions side-by-side (Back/Continue)
 * - 'stack': actions stacked vertically
 */

// Height of one Button: minHeight Space[52], with paddingVertical Space[16]
// wrapped around its line box. The line box grows with the OS font-size
// setting, so measure it rather than assuming the default.
const BUTTON_MIN_HEIGHT = Space[52];
const BUTTON_PADDING_Y = Space[16];

const buttonHeight = (osFontScale) =>
  Math.max(
    BUTTON_MIN_HEIGHT,
    Math.ceil((Type.button.lineHeight ?? 22) * osFontScale) + BUTTON_PADDING_Y * 2
  );

// Everything above the safe-area padding: blur paddingTop + content paddingTop.
const FOOTER_CHROME = Space[14] + Space[10];

/**
 * Real rendered height of the Footer on this device, including the space it
 * reserves for the home indicator / Android system navigation bar.
 *
 * Screens should use this for their scroll `paddingBottom` so the last field
 * clears the footer. The old exported `FOOTER_HEIGHT` constant could not see
 * safe-area insets, so it under-reported by up to 28dp on Android hardware
 * using 3-button navigation.
 */
export function useFooterHeight(variant = 'single') {
  const bottomInset = useBottomInset();
  const { fontScale } = useWindowDimensions();
  const rows = variant === 'stack' ? 2 : 1;
  const gap = variant === 'stack' ? Space[15] : 0;
  return FOOTER_CHROME + buttonHeight(fontScale) * rows + gap + bottomInset;
}

/**
 * @deprecated Cannot account for safe-area insets — prefer `useFooterHeight()`.
 * Kept as a worst-case-safe fallback so any un-migrated caller over-pads
 * rather than clipping content behind the footer.
 */
export const FOOTER_HEIGHT = FOOTER_CHROME + buttonHeight(1.3) + 48;

export default function Footer({ variant = 'single', children, style }) {
  const bottomInset = useBottomInset();

  // expo-blur does not blur on Android without the experimental Dimezis
  // backend, so it renders as a flat translucent sheet there and scroll
  // content shows through the buttons. Use an opaque surface instead —
  // the same approach TabBar already takes.
  const Surface = Platform.OS === 'android' ? View : BlurView;
  const surfaceProps =
    Platform.OS === 'android' ? {} : { intensity: 80, tint: 'light' };

  return (
    <Animated.View style={[styles.wrapper, style]} pointerEvents="box-none">
      <Surface
        {...surfaceProps}
        style={[
          styles.blur,
          Platform.OS === 'android' && styles.androidSurface,
          { paddingBottom: bottomInset },
        ]}
      >
        {/* Subtle white tint */}
        <View style={[styles.tint, { pointerEvents: 'none' }]} />

        {/* Top rim line */}
        <View style={styles.topLine} pointerEvents="none" />

        {/* Content area */}
        <View style={[styles.content, variantStyles[variant] || variantStyles.single]}>
          {children}
        </View>
      </Surface>
    </Animated.View>
  );
}

export function FooterLeft({ children }) {
  return <View style={{ flex: 1 }}>{children}</View>;
}

export function FooterRight({ children }) {
  return <View style={{ flex: 2 }}>{children}</View>;
}

const styles = StyleSheet.create({
  // ✅ Absolute positioning to float over content
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // Shadow to lift above scroll content
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: { elevation: 20 },
    }),
  },

  blur: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    paddingHorizontal: Space[24],
    paddingTop: Space[14],
  },

  // Opaque stand-in for the blur on Android.
  androidSurface: { backgroundColor: 'rgba(255,255,255,0.97)' },

  // Content wrapper (no additional padding needed)
  content: {
    paddingTop: Space[10], // Small top spacing for visual balance
  },

  // Subtle tint overlay
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },

  // Top border line
  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0.75,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },

  // Variant styles
  single: {},

  dual: {
    flexDirection: 'row',
    gap: Space[15],
    alignItems: 'center',
  },

  stack: {
    flexDirection: 'column',
    gap: Space[15],
  },
});

const variantStyles = {
  single: styles.single,
  dual: styles.dual,
  stack: styles.stack,
};
