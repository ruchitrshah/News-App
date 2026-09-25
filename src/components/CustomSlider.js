import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import {
  Colors,
  Space,
  Type,
  ComponentTokens,
  FontFamilies,
  FontSizes,
  LineHeights,
} from '../brand';

export default function CustomSlider({
  label,
  subtext,
  value,
  onValueChange,
  minimumValue = 1,
  maximumValue = 5,
  leftLabel,
  rightLabel,
  currentValueLabel,
}) {
  const primaryTrack = ComponentTokens.button.primary.background; // black, centralized
  const maxTrack = Colors.border.default;

  return (
    <View style={styles.container}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      {!!subtext && <Text style={styles.subtext}>{subtext}</Text>}

      <View style={styles.sliderWrapper}>
        <Slider
          style={styles.slider}
          minimumValue={minimumValue}
          maximumValue={maximumValue}
          step={1}
          value={value}
          onValueChange={onValueChange}
          minimumTrackTintColor={primaryTrack}
          maximumTrackTintColor={maxTrack}
          thumbTintColor={primaryTrack}
        />

        <View style={styles.sliderLabels}>
          <Text style={styles.sideLabel}>{leftLabel}</Text>
          <Text style={styles.valueLabel}>{currentValueLabel}</Text>
          <Text style={styles.sideLabel}>{rightLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Space[24], marginTop: Space[16] },

  // Keep existing “uppercase label” behavior but ensure it's token-based
  label: {
    ...Type.formLabel,
    color: Colors.text.onLight, // slider label was black in your original component
    marginBottom: Space[12],
  },

  // This is “supporting copy”, not a hint/error; keep it local but tokenized
  subtext: {
    fontFamily: FontFamilies.medium,
    fontSize: FontSizes[15],
    lineHeight: LineHeights[22],
    color: Colors.text.tertiary,
    marginTop: -4,
    marginBottom: Space[16],
  },

  slider: { width: '100%', height: Space[40] },

  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Space[8],
  },

  sideLabel: {
    fontFamily: FontFamilies.medium,
    fontSize: FontSizes[15],
    lineHeight: LineHeights[22],
    color: Colors.text.tertiary,
  },

  valueLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: FontSizes[16],
    lineHeight: LineHeights[22],
    color: Colors.text.onLight,
  },
});
