// LOADING STATE — the one loading animation in the app: the pixel grid
// (Drive wavefront) on its own. No label or timer on screen. Reduced motion
// freezes the grid to its dim state.
import React from 'react';
import { View, StyleSheet } from 'react-native';

import PixelLoader from './PixelLoader';

export default function LoadingState({ label = 'Loading', variant = 'drive', style }) {
  // The label is for screen readers only; on screen it's just the grid.
  return (
    <View style={[styles.wrap, style]} accessibilityRole="progressbar" accessibilityLabel={label}>
      <PixelLoader variant={variant} size={6} gap={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center' },
});
