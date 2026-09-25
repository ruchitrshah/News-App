// src/brand/responsive.js
// Live, per-render responsive layer.
//
// The static scales in Typescale.js are sampled once at module load, which is
// fine for type sizing on a portrait-locked app. Layout geometry is different:
// it depends on safe-area insets that are only known at render time, and those
// vary enormously across Android (gesture nav ≈ 24dp, 3-button nav ≈ 48dp,
// and under edge-to-edge — the default since Expo SDK 54 — never zero).
//
// Anything that positions content against a screen edge should use these hooks
// rather than a hardcoded constant.

import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Space } from './Spacing';

// Width buckets. Portrait logical dp.
export const Breakpoints = Object.freeze({
  compact: 360,  // Galaxy A-series, Redmi, most budget Android in India
  regular: 400,  // Pixel 7/8, iPhone 15
  wide: 430,     // Pro Max / Ultra class
  tablet: 768,
});

// Minimum breathing room above a system nav bar when the OS reports none
// (older Android without edge-to-edge, iPhone SE, web).
const MIN_BOTTOM_GAP = Space[14];

/**
 * Screen-shape info plus the size buckets used across the app.
 * Backed by useWindowDimensions so it survives split-screen, foldables and
 * Android "Display size" changes — none of which fire a module reload.
 */
export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const isTablet = width >= Breakpoints.tablet;
    return {
      width,
      height,
      fontScale,
      insets,
      isTablet,
      isCompact: width < Breakpoints.regular,
      isTiny: width < Breakpoints.compact,
      isShort: height < 700,
      isDesktopWeb: Platform.OS === 'web' && width >= Breakpoints.tablet,
      // Usable content width — keeps text line-length sane on tablets/desktop.
      contentWidth: isTablet ? Math.min(width, 600) : width,
    };
  }, [width, height, fontScale, insets]);
}

/**
 * Bottom padding that clears the home indicator / system navigation bar on
 * every platform. Always prefer this over `Platform.OS === 'ios' ? ... : N`.
 */
export function useBottomInset(minimum = MIN_BOTTOM_GAP) {
  const { bottom } = useSafeAreaInsets();
  return Math.max(bottom, minimum);
}
