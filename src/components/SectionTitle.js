import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Type, Space } from '../brand';

/**
 * SectionTitle
 * - default: same as Type.sectionHeader (includes 32/12 margins)
 * - 'first': removes top margin (use right after page subtitle)
 * - 'tight': uses smaller top margin for stacked sections in onboarding flows
 */
export default function SectionTitle({ children, variant = 'default', style, ...props }) {
  return (
    <Text style={[Type.sectionHeader, variantStyles[variant], style]} {...props}>
      {children}
    </Text>
  );
}

const variantStyles = StyleSheet.create({
  default: {},
  first: { marginTop: Space[40] },
  tight: { marginTop: Space[40] },
});
