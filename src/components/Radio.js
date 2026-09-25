import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../brand/Colors';
import { Space } from '../brand/Spacing';

export function Radio({ selected = false, disabled = false, size = 20, style }) {
  const accent = Colors.brand.primary;

  const borderColor = disabled
    ? Colors.border.subtle
    : selected
      ? accent
      : Colors.border.subtle;

  const dotColor = disabled ? Colors.border.subtle : accent;

  return (
    <View
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {selected ? (
        <View
          style={[
            styles.dot,
            {
              width: Math.round(size * 0.5),
              height: Math.round(size * 0.5),
              borderRadius: Math.round(size * 0.25),
              backgroundColor: dotColor,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

/**
 * RadioRow
 * - a pressable row with a leading Radio + your custom content
 * - does not assume typography; you pass children
 */
export function RadioRow({
  selected,
  onPress,
  disabled = false,
  children,
  radioSize = 20,
  style,
  accessibilityLabel,
  accessibilityHint,
}) {
  return (
    <TouchableOpacity
      style={[styles.row, style]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
      accessible
      accessibilityRole="radio"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Radio selected={selected} disabled={disabled} size={radioSize} />
      <View style={styles.content}>{children}</View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface.page,
  },
  dot: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Space[16],
    gap: Space[12],
  },
  content: { flex: 1 },
});
