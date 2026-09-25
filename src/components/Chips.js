import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Space, Spacing, Radii, Type, ComponentTokens } from '../brand';

export default function Chips({
  label,
  value = [],
  onValueChange,
  options = [],
  required = false,
  error,
  style,
  disabled = false,
  maxSelected,
  onMaxSelected,
  renderIcon,
}) {
  const values = useMemo(() => (Array.isArray(value) ? value : []), [value]);

  const toggleOption = useCallback(
    (option) => {
      if (disabled) return;

      const optionValue = typeof option === 'string' ? option : option.value;
      const isSelected = values.includes(optionValue);

      if (isSelected) {
        onValueChange?.(values.filter((v) => v !== optionValue));
        return;
      }

      const limit = typeof maxSelected === 'number' ? maxSelected : undefined;
      if (limit != null && limit >= 0 && values.length >= limit) {
        onMaxSelected?.({ maxSelected: limit, attemptedValue: optionValue, currentValues: values });
        return;
      }

      onValueChange?.([...values, optionValue]);
    },
    [disabled, maxSelected, onMaxSelected, onValueChange, values]
  );

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}

      <View style={styles.optionsContainer}>
        {options.map((option, index) => {
          const optionValue = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? option : option.label;
          const isSelected = values.includes(optionValue);

          const chipToken = disabled
            ? ComponentTokens.chip.disabled
            : isSelected
              ? ComponentTokens.chip.selected
              : ComponentTokens.chip.default;

          return (
            <TouchableOpacity
              key={`${String(optionValue)}-${index}`}
              style={[
                styles.chip,
                { 
                  backgroundColor: chipToken.background, 
                  borderColor: chipToken.border,
                  // ✅ Ensure border width is identical in both states to prevent jumping
                  borderWidth: isSelected ? 1.5 : 1.5 
                },
                disabled && styles.disabledChip,
              ]}
              onPress={() => toggleOption(option)}
              disabled={disabled}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ disabled: !!disabled, selected: !!isSelected }}
            >
              {/* ✅ Wrapper view helps maintain internal alignment */}
              <View style={styles.textWrapper}>
                {renderIcon ? renderIcon(optionValue, chipToken.foreground, isSelected) : null}
                <Text
                  style={[
                    styles.chipText,
                    { color: chipToken.foreground },
                    isSelected && styles.selectedChipText,
                  ]}
                >
                  {optionLabel}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Space[16], marginTop: Space[16] },

  label: { ...Type.formLabel, marginBottom: Space[15] },
  required: { color: Colors.status.danger },

  optionsContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: Space[12] 
  },

  chip: {
    paddingHorizontal: Spacing.chip.paddingX,
    paddingVertical: Spacing.chip.paddingY,
    borderRadius: Radii.control.pill,
    justifyContent: 'center',
    alignItems: 'center',
    // ✅ Use a fixed border width for both states
    borderWidth: 1.5, 
  },

  textWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabledChip: { opacity: 0.7 },

  chipText: { 
    ...Type.chip,
    // ✅ Neutralize potential font-scaling issues
    includeFontPadding: false, 
    textAlignVertical: 'center',
  },

  selectedChipText: { 
    ...Type.chipSelected,
  },

  errorText: { ...Type.hint, color: Colors.status.danger, marginTop: Space[8] },
});