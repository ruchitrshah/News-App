import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../brand';

export default function SafeScreen({
  children,
  style,
  backgroundColor,
  noTopEdge = false,
  noBottomEdge = true,
  edges: edgesProp,
}) {
  const edges =
    edgesProp ??
    [
      ...(!noTopEdge ? ['top'] : []),
      ...(!noBottomEdge ? ['bottom'] : []),
      'left',
      'right',
    ];

  return (
    <SafeAreaView
      style={[
        styles.base,
        backgroundColor ? { backgroundColor } : null,
        style,
      ]}
      edges={edges}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    backgroundColor: Colors.surface.page,
  },
});