import React from 'react';
import HobbyIcon from './HobbyIcon';
import { View, StyleSheet, Text } from 'react-native';
// ✅ Use centralized brand index for consistency
import { Colors, Space, Radius, Type } from '../brand';

export default function Tags({ data, hobbies = false }) {
  // ✅ Defensive check matches Button component logic
  if (!data || data.length === 0) return null;

  return (
    <View style={styles.tagContainer}>
      {data.map((item, index) => (
        <View key={`tag-${index}`} style={styles.tag}>
          {hobbies ? <HobbyIcon name={item} style={{ marginRight: Space[8] }} /> : null}
          {/* ✅ Spreading Type.chip ensures web scaling and font consistency */}
          <Text style={styles.tagText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // ✅ Space[10] used consistently from your spacing token
    marginTop: Space[10],
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.soft,
    paddingHorizontal: Space[16],
    paddingVertical: Space[8],
    borderRadius: Radius[24],
    marginRight: Space[10],
    marginBottom: Space[10],
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  tagText: {
    // ✅ Replaces manual styles with the design system's chip preset
    // Matches logic used in Button's styles.textBase (...Type.button)
    ...Type.chip,
  },
});