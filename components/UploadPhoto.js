import React from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import {
  Colors,
  Space, Radius,
  Type,
  FontFamilies,
  FontSizes,
  LineHeights,
} from '../brand';

/**
 * UploadPhoto Component
 * Displays a fixed-height dashed box for photo uploads.
 */
export default function UploadPhoto({ currentCount, maxCount, onPress }) {
  const activeSlot = Math.min(currentCount + 1, maxCount);

  return (
    <TouchableOpacity
      style={styles.addPhotoCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.addPhotoIcon}>+</Text>
      <Text style={styles.label}>ADD PHOTO</Text>
      <Text style={styles.counterText}>
        ({activeSlot}/{maxCount})
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  addPhotoCard: {
    width: '48%',
    height: 210, // fixed component constraint (not a token)
    borderRadius: Radius[12],
    borderWidth: 2,
    borderColor: Colors.border.default,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface.subtle,
  },

  addPhotoIcon: {
    fontFamily: FontFamilies.bold,
    fontSize: 32,
    lineHeight: 32,
    color: Colors.text.muted,
    marginBottom: Space[4],
    textAlign: 'center',
  },

  label: {
    ...Type.label,
    marginBottom: 0,
  },

  // Keep the old visual intent: the counter is muted and NOT uppercase
  counterText: {
    fontFamily: FontFamilies.demi,
    fontSize: FontSizes[15],
    lineHeight: LineHeights[22],
    marginTop: Space[4],
    color: Colors.text.muted,
    textTransform: 'none',
  },
});
