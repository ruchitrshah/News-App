import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Circle, CheckCircle2 } from './AppIcons';
import { Colors, Space, Type } from '../brand';

export default function CheckboxRow({
  label,
  value,
  onChange,
  disabled = false,
  hint,
  hasError = false,
  style,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => (!disabled ? onChange?.(!value) : null)}
      disabled={disabled}
      style={[styles.row, disabled && styles.rowDisabled, style]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!value, disabled: !!disabled }}
    >
      {value ? (
        <CheckCircle2 size={24} color={Colors.text.primary} />
      ) : (
        <Circle
          size={24}
          color={hasError ? Colors.status.danger : Colors.border.subtle}
        />
      )}

      <View style={styles.textCol}>
        <Text style={[styles.label, disabled && styles.labelDisabled, hasError && styles.labelError]}>
          {label}
        </Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Space[10],
  },
  rowDisabled: { opacity: 0.7 },

  textCol: {
    flex: 1,
    marginLeft: Space[12],
  },

  label: {
    ...Type.bodySecondary,
    marginTop: 2,
    color: Colors.text.secondary,
  },
  labelDisabled: { color: Colors.text.hint },
  labelError: { color: Colors.status.danger },

  hint: {
    ...Type.hint,
    color: Colors.text.hint,
    marginTop: 4,
  },
});