// Glass surface for floating chrome (pills, the voice bar, badges).
//
// iOS 26+: the system Liquid Glass material via expo-glass-effect.
// Everywhere else: a blur with a white wash, a hairline edge and a soft
// shadow — the same read, built from parts.
//
// `tone="dark"` is the primary-action variant (the mic pill).
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

import { Colors, Palette, ColorUtils } from '../../brand';

let GlassView = null;
let liquid = false;
try {
  const mod = require('expo-glass-effect');
  GlassView = mod.GlassView;
  liquid = Platform.OS === 'ios' && mod.isLiquidGlassAvailable();
} catch {
  liquid = false;
}

const FILL = StyleSheet.absoluteFill;

const TONES = {
  light: {
    tint: ColorUtils.rgba(Palette.base.white, 0.35),
    wash: ColorUtils.rgba(Palette.base.white, 0.78),
    edge: ColorUtils.rgba(Palette.base.black, 0.07),
    blurTint: 'light',
  },
  dark: {
    tint: ColorUtils.rgba(Palette.base.black, 0.82),
    wash: ColorUtils.rgba(Palette.base.black, 0.86),
    edge: ColorUtils.rgba(Palette.base.white, 0.12),
    blurTint: 'dark',
  },
};

export const glassShadow = Platform.select({
  web: { boxShadow: '0 8px 24px rgba(16,24,40,0.10), 0 1px 2px rgba(16,24,40,0.06)' },
  android: { elevation: 4 },
  default: {
    shadowColor: Colors.shadow.color,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
});

export default function Glass({ tone = 'light', radius, interactive = false, shadow = true, style, children, ...rest }) {
  const t = TONES[tone] ?? TONES.light;
  const shape = { borderRadius: radius };

  if (liquid && GlassView) {
    return (
      <GlassView
        glassEffectStyle="regular"
        tintColor={t.tint}
        isInteractive={interactive}
        style={[shape, style]}
        {...rest}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[shape, shadow && glassShadow, styles.stack, style]} {...rest}>
      <View style={[FILL, shape, styles.clip, styles.behind]} pointerEvents="none">
        {/* Radius on every layer: on web, backdrop-filter ignores the parent's clip. */}
        {Platform.OS === 'android' ? null : <BlurView intensity={40} tint={t.blurTint} style={[FILL, shape]} />}
        <View style={[FILL, shape, { backgroundColor: t.wash }]} />
        <View style={[FILL, shape, styles.edge, { borderColor: t.edge }]} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // The glass layers are absolutely positioned; on web, positioned elements
  // paint over static ones (a raw <svg>, a text <input>). Give the surface its
  // own stacking context and push the layers beneath all content.
  stack: { zIndex: 0 },
  behind: { zIndex: -1 },
  clip: { overflow: 'hidden' },
  edge: { borderWidth: StyleSheet.hairlineWidth * 2 },
});
