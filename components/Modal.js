// src/components/Modal.js
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
import { X, Check, AlertCircle, PauseCircle, Trash2 } from './AppIcons';
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

const VARIANT_CONFIG = {
  info: {
    Icon: AlertCircle,
    iconColor: Colors.status.warning,
  },
  pause: {
    Icon: PauseCircle,
    iconColor: Colors.status.warning,
  },
  destructive: {
    Icon: Trash2,
    iconColor: Colors.status.danger,
  },
};

export default function Modal({
  label,
  value,
  onValueChange,
  options = [],
  placeholder = 'Select...',
  error,
  hint,
  style,
  variant = 'picker',
  subtitle,
  visible = false,
  onClose,
  required = false,
  disabled = false,
  allowDeselect = true,
}) {
  const [modalVisible, setModalVisible] = useState(false);

  const isInfoVariant =
    variant === 'info' || variant === 'pause' || variant === 'destructive';
  const isVisible = isInfoVariant ? visible : modalVisible;

  const handleClose = useCallback(() => {
    if (isInfoVariant && onClose) onClose();
    else setModalVisible(false);
  }, [isInfoVariant, onClose]);

  // In Modal.js, replace the selectedOption useMemo:
  const selectedOption = useMemo(
    () =>
      (options || []).find((opt) => {
        const optVal = typeof opt === 'string' ? opt : opt.value;
        // ✅ Object values (e.g. countryCode): compare by .code
        if (
          optVal != null && typeof optVal === 'object' &&
          value != null && typeof value === 'object'
        ) {
          return optVal.code === value.code;
        }
        return optVal === value;
      }),
    [options, value]
  );

  // ✅ Safe on Hermes: explicit object check before accessing .code
  const displayValue = useMemo(() => {
    if (!selectedOption) {
      // No matching option, but there IS a stored value: show it rather than
      // falling back to the placeholder.
      //
      // Option lists get renamed and older releases wrote different values
      // ('yes' where the list now says 'Regularly Follow Chovihar', 'B.Tech'
      // where it says 'Bachelor of Technology (B.Tech)'). Showing a
      // placeholder made those look erased — the value was still in the
      // database, and still saved on the next submit, but the user had no way
      // to know that. Showing it is honest and loses nothing: picking a new
      // option still overwrites, which is what picking one means.
      if (value == null) return null;
      if (typeof value === 'object') return value.code ?? null;
      const raw = String(value).trim();
      return raw || null;
    }
    if (typeof selectedOption === 'string') return selectedOption;
    const v = selectedOption.value;
    if (v != null && typeof v === 'object') return v.code ?? selectedOption.label ?? null;
    return selectedOption.label ?? null;
  }, [selectedOption, value]);

  const showHint = hint && !error;
  const variantConfig = VARIANT_CONFIG[variant];

  return (
    <View style={[styles.container, style]}>
      {variant === 'picker' && (
        <>
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
              modalVisible ? styles.selectorActive : styles.selectorInactive,
              error && styles.errorBorder,
              disabled && styles.selectorDisabled,
            ]}
            onPress={() => (!disabled ? setModalVisible(true) : null)}
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
        </>
      )}

      <RNModal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <SafeAreaView
          style={[styles.modalRoot, isInfoVariant && styles.modalRootDark]}
          edges={['bottom']}
        >
          {isInfoVariant ? (
            <View style={styles.infoContent}>
              <View style={styles.infoBody}>
                <variantConfig.Icon
                  size={100}
                  color={variantConfig.iconColor}
                  strokeWidth={1.5}
                  style={styles.infoIcon}
                />
                <Text style={styles.infoTitle}>{label}</Text>
                {subtitle ? (
                  <Text style={styles.infoSubtitle}>{subtitle}</Text>
                ) : null}
              </View>

              <View style={styles.infoFooter}>
                {(options || []).map((option, index) => {
                  const val = typeof option === 'string' ? option : option.value;
                  const lbl = typeof option === 'string' ? option : option.label;
                  const buttonVariant = index === 0 ? 'white' : 'whiteOutline';

                  return (
                    <Button
                      key={`info-btn-${val}`}
                      title={lbl}
                      variant={buttonVariant}
                      onPress={() => {
                        onValueChange(val);
                        handleClose();
                      }}
                      style={styles.footerButton}
                    />
                  );
                })}
              </View>
            </View>
          ) : (
            <>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle} numberOfLines={2}>
                    {label || 'Select'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <X size={28} color={Colors.text.onLight} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.optionsList}
                showsVerticalScrollIndicator={false}
              >
                {(options || []).map((option, index) => {
                  const val =
                    typeof option === 'string' ? option : option.value;
                  const lbl =
                    typeof option === 'string' ? option : option.label;
                  const isSelected = val === value;

                  return (
                    <View key={`${String(val)}-${index}`}>
                      <TouchableOpacity
                        style={styles.optionRow}
                        onPress={() => {
                          const nextValue =
                            isSelected && allowDeselect ? null : val;
                          onValueChange(nextValue);
                          handleClose();
                        }}
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
                          <Check
                            size={24}
                            color={Colors.text.onLight}
                            strokeWidth={3}
                          />
                        ) : null}
                      </TouchableOpacity>
                      {index < options.length - 1 ? (
                        <View style={styles.divider} />
                      ) : null}
                    </View>
                  );
                })}
              </ScrollView>
            </>
          )}
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

  modalRoot: { flex: 1, backgroundColor: Colors.surface.page },
  modalRootDark: { backgroundColor: Colors.text.onLight },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Space[24],
    paddingTop: Space[32],
    paddingBottom: Space[16],
    width: '100%',
  },
  modalTitleContainer: { flex: 1, marginRight: Space[40] },
  modalTitle: { ...Type.modalTitle },
  closeButton: {
    padding: Space[4],
    top: Space[32],
    right: Space[20],
    position: 'absolute',
  },

  infoContent: {
    flex: 1,
    paddingHorizontal: Space[24],
    justifyContent: 'space-between',
  },
  infoBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Space[40],
  },
  infoIcon: { marginBottom: Space[32] },
  infoTitle: {
    ...Type.pageTitle,
    color: Colors.text.onDark,
    textAlign: 'center',
    marginBottom: Space[16],
  },
  infoSubtitle: {
    ...Type.bodySecondary,
    color: Colors.text.muted,
    textAlign: 'center',
  },
  infoFooter: { paddingBottom: Space[30], gap: Space[12] },
  footerButton: { width: '100%' },

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
});