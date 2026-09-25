import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { ComponentTokens } from '../brand/Colors';
import { Spacing } from '../brand/Spacing';
import { Radii } from '../brand/Radii';
import { Type } from '../brand/Typescale';

export default function Badge({
  title,
  tone = 'neutral', // 'neutral' | 'brand' | 'danger'
  style,
  textStyle,
}) {
  const token = useMemo(() => {
    if (tone === 'brand') return ComponentTokens.badge.brand;
    if (tone === 'danger') return ComponentTokens.badge.danger;
    return ComponentTokens.badge.neutral;
  }, [tone]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: token.background, borderColor: token.border },
        style,
      ]}
    >
      <Text style={[styles.text, { color: token.foreground }, textStyle]} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.badge?.paddingX ?? 10,
    paddingVertical: Spacing.badge?.paddingY ?? 6,
    borderRadius: Radii.badge.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    ...Type.badgeLabel,
  },
});
