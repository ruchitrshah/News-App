import React, { useMemo, useState, useCallback } from 'react';
import { View, TextInput, StyleSheet, Text } from 'react-native';

import { Colors } from '../brand/Colors';
import { Space } from '../brand/Spacing';
import { Radius } from '../brand/Radii';
import { Type, FontFamilies, FontSizes } from '../brand/Typescale';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  multiline = false,
  keyboardType = 'default',
  style,

  required = false,
  disabled = false,

  onBlur,
  onFocus,
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);

  const handleTextChange = useCallback(
    (text) => {
      // Prevent leading spaces
      const cleanedText = text.startsWith(' ') ? text.trimStart() : text;
      
      if (onChangeText) {
        onChangeText(cleanedText);
      }
    },
    [onChangeText]
  );

  const handleBlurInternal = useCallback(
    (e) => {
      setIsFocused(false);
      
      // Auto-remove trailing spaces when the user leaves the field
      if (value && onChangeText) {
        onChangeText(value.trimEnd());
      }

      onBlur?.(e);
    },
    [value, onChangeText, onBlur]
  );

  const handleFocusInternal = useCallback(
    (e) => {
      if (disabled) return;
      setIsFocused(true);
      onFocus?.(e);
    },
    [disabled, onFocus]
  );

  const showHint = hint && !error;

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}

      <TextInput
        style={[
          styles.input,
          isFocused ? styles.inputFocused : styles.inputBlur,
          multiline && styles.multilineInput,
          error && styles.errorInput,
          disabled && styles.inputDisabled,
        ]}
        value={value}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.text.placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        onFocus={handleFocusInternal}
        onBlur={handleBlurInternal}
        cursorColor={Colors.border.strong}
        editable={!disabled}
        // ✅ Props spread ensures returnKeyType="done" and blurOnSubmit work correctly
        {...props}
      />

      {showHint ? <Text style={styles.hintText}>{hint}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Space[16],
    marginBottom: Space[16],
    width: '100%',
  },

  label: {
    ...Type.formLabel, // Bold, 15px, color label (neutral 500), uppercase
  },
  
  required: { 
    color: Colors.status.danger 
  },

  input: {
    height: Space[56],
    borderWidth: 1,
    borderRadius: Radius[10] || 10,
    paddingHorizontal: Space[16],

    fontFamily: FontFamilies.demi,
    fontSize: FontSizes[16],

    color: Colors.text.onLight,
    backgroundColor: Colors.surface.page,
  },

  inputBlur: { 
    borderColor: Colors.border.subtle 
  },

  inputFocused: {
    borderColor: Colors.border.focus,
    borderWidth: 2,
  },

  inputDisabled: {
    backgroundColor: Colors.surface.soft,
    color: Colors.text.disabled,
  },

  multilineInput: {
    minHeight: 140,
    textAlignVertical: 'top',
    paddingTop: Space[16],
    paddingBottom: Space[16],
  },

  hintText: {
    ...Type.hint, // Medium, 15px, color hint (neutral 500)
    marginTop: Space[10],
    marginLeft: 4,
  },

  errorInput: { 
    borderColor: Colors.border.danger 
  },

  errorText: {
    ...Type.hint,
    color: Colors.status.danger,
    marginTop: Space[10],
    marginLeft: 4,
  },
});