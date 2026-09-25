import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Space, Radius } from '../brand';

export default function FormCard({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Space[16],
    padding: Space[16],
    backgroundColor: Colors.surface.subtle,
    borderRadius: Radius[12],
    borderWidth: 1,
    borderColor: Colors.surface.soft,  
  },
});
