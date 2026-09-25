// src/components/MultiSelectModal.js
import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal as RNModal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from './AppIcons';
import { ChevronDown } from 'lucide-react-native';
import Button from './Button';
import {
  Colors,
  Space,
  Radius,
  Type,
  FontFamilies,
  FontSizes,
} from '../brand';

export default function MultiSelectModal({
  label,
  value = [],
  onValueChange,
  options = [],
  placeholder = 'Select...',
  error,
  hint,
  style,
  visible,
  onClose,
  required = false,
  disabled = false,
  maxSelected = null,
}) {
  const [internalVisible, setInternalVisible] = useState(false);
  const [draft, setDraft] = useState(
    Array.isArray(value) ? value.filter((v) => v != null) : []
  );

  const isControlled = visible !== undefined;
  const isVisible = isControlled ? !!visible : internalVisible;

  const openModal = useCallback(() => {
    if (disabled) return;
    // Always re-sync draft to latest committed value on open
    setDraft(Array.isArray(value) ? value.filter((v) => v != null) : []);
    if (!isControlled) setInternalVisible(true);
  }, [disabled, isControlled, value]);

  const handleClose = useCallback(() => {
    if (isControlled && onClose) onClose();
    else setInternalVisible(false);
  }, [isControlled, onClose]);

  const selectedLabels = useMemo(() => {
    if (!Array.isArray(value) || !value.length) return null;
    const map = new Map();
    (options || []).forEach((opt) => {
      const val = typeof opt === 'string' ? opt : opt.value;
      const lbl = typeof opt === 'string' ? opt : opt.label;
      map.set(String(val), lbl);
    });
    return value
      .map((v) => map.get(String(v)))
      .filter(Boolean)
      .join(', ');
  }, [value, options]);

  const displayValue = selectedLabels || null;
  const showHint = hint && !error;

  // ✅ Single source of truth: always compare via String()
  const isDraftSelected = useCallback(
    (val) => draft.some((v) => String(v) === String(val)),
    [draft]
  );

  const toggleDraftValue = useCallback(
    (val) => {
      setDraft((prev) => {
        const arr = Array.isArray(prev) ? prev.filter((v) => v != null) : [];
        const exists = arr.some((v) => String(v) === String(val));

        if (exists) {
          return arr.filter((v) => String(v) !== String(val));
        }

        if (maxSelected !== null && arr.length >= maxSelected) {
          return arr;
        }

        return [...arr, val];
      });
    },
    [maxSelected]
  );

  const handleDone = useCallback(() => {
    onValueChange(draft);
    handleClose();
  }, [draft, onValueChange, handleClose]);

  const handleClear = useCallback(() => {
    setDraft([]);
    onValueChange([]);
    handleClose();
  }, [onValueChange, handleClose]);

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={styles.externalLabel}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}

      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.selector,
          isVisible ? styles.selectorActive : styles.selectorInactive,
          error && styles.errorBorder,
          disabled && styles.selectorDisabled,
        ]}
        onPress={openModal}
        disabled={disabled}
      >
        <Text
          style={[
            styles.selectorText,
            !displayValue && styles.placeholderText,
            disabled && styles.selectorTextDisabled,
          ]}
          numberOfLines={1}
        >
          {displayValue || placeholder}
        </Text>
        <ChevronDown
          size={20}
          color={disabled ? Colors.text.disabled : Colors.icon.primary}
          strokeWidth={2}
        />
      </TouchableOpacity>

      {showHint ? <Text style={styles.hintText}>{hint}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <RNModal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={styles.modalRoot} edges={['bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={2}>
              {label || 'Select'}
            </Text>
          </View>

          <ScrollView
            style={styles.optionsList}
            showsVerticalScrollIndicator={false}
          >
            {(options || []).map((option, index) => {
              const val = typeof option === 'string' ? option : option.value;
              const lbl = typeof option === 'string' ? option : option.label;
              // ✅ Uses isDraftSelected so comparison is always String()-based
              const isSelected = isDraftSelected(val);

              return (
                <View key={`${String(val)}-${index}`}>
                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={() => toggleDraftValue(val)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {lbl}
                    </Text>
                    {isSelected ? (
                      <View style={styles.checkIconWrap}>
                        <Check
                          size={20}
                          color={Colors.text.onLight}
                          strokeWidth={3}
                        />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                  {index < options.length - 1 ? (
                    <View style={styles.divider} />
                  ) : null}
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title="Clear All"
              variant="outline"
              onPress={handleClear}
              style={styles.footerButton}
            />
            <Button
              title="Done"
              onPress={handleDone}
              style={styles.footerButton}
            />
          </View>
        </SafeAreaView>
      </RNModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: Space[16], marginBottom: Space[16], width: '100%' },

  externalLabel: { ...Type.formLabel },
  required: { color: Colors.status.danger },

  selector: {
    height: Space[56],
    borderWidth: 1,
    borderRadius: Radius[12],
    paddingHorizontal: Space[16],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface.page,
  },
  selectorInactive: { borderColor: Colors.border.subtle },
  selectorActive: { borderColor: Colors.border.strong, borderWidth: 2 },
  selectorDisabled: {
    backgroundColor: Colors.surface.soft,
    borderColor: Colors.border.subtle,
  },
  selectorText: {
    fontFamily: FontFamilies.demi,
    fontSize: FontSizes[16],
    color: Colors.text.onLight,
    flex: 1,
    marginRight: Space[12],
  },
  selectorTextDisabled: { color: Colors.text.disabled },
  placeholderText: {
    color: Colors.text.placeholder,
    fontFamily: FontFamilies.medium,
  },

  hintText: { ...Type.hint, marginTop: Space[8], marginLeft: Space[4] },
  errorText: {
    ...Type.hint,
    color: Colors.status.danger,
    marginTop: Space[8],
    marginLeft: Space[4],
  },
  errorBorder: { borderColor: Colors.status.danger },

  checkIconWrap: { paddingRight: 8 },

  modalRoot: { flex: 1, backgroundColor: Colors.surface.page },

  modalHeader: {
    paddingHorizontal: Space[24],
    paddingTop: Space[32],
    paddingBottom: Space[8],
  },
  modalTitle: { ...Type.modalTitle },

  optionsList: { flex: 1 },
  optionRow: {
    paddingVertical: Space[20],
    paddingHorizontal: Space[24],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: { ...Type.option, flex: 1, marginRight: Space[16] },
  optionTextSelected: { ...Type.optionSelected },
  divider: {
    height: 1,
    backgroundColor: Colors.surface.soft,
    marginHorizontal: Space[24],
  },

  footer: {
    flexDirection: 'row',
    gap: Space[12],
    paddingHorizontal: Space[24],
    paddingVertical: Space[16],
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
  },
  footerButton: { flex: 1 },
});