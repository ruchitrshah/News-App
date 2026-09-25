import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Text } from 'react-native';
import {
  Colors,
  Space,
  Radius,
  FontFamilies,
  FontSizes,
  LineHeights,
} from '../brand';

export const TabSwitcher = ({ activeTab, onTabChange, tabs }) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const padding = Space[4];
  const tabWidth = containerWidth ? (containerWidth - padding * 2) / tabs.length : 0;

  useEffect(() => {
    if (tabWidth > 0) {
      const tabIndex = tabs.findIndex((t) => t.key === activeTab);
      Animated.spring(translateX, {
        toValue: tabIndex * tabWidth,
        useNativeDriver: true,
        bounciness: 4,
        speed: 12,
      }).start();
    }
  }, [activeTab, tabWidth]);

  return (
    <View
      style={styles.tabBar}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {tabWidth > 0 && (
        <Animated.View
          style={[
            styles.glassPill,
            { width: tabWidth, transform: [{ translateX }] },
          ]}
        />
      )}

      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            style={styles.tab}
            activeOpacity={1}
          >
            <Text style={[styles.tabText, isActive && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface.soft,
    borderRadius: Radius.full,
    padding: Space[4],
    marginVertical: Space[16],
    position: 'relative',
    width: '100%',
  },

  glassPill: {
    position: 'absolute',
    top: Space[4],
    left: Space[4],
    bottom: Space[4],
    backgroundColor: Colors.surface.page,
    borderRadius: Radius.full,
    shadowColor: Colors.shadow.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },

  tab: {
    flex: 1,
    paddingVertical: Space[14],
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

  tabText: {
    fontFamily: FontFamilies.medium,
    fontSize: FontSizes[15],
    lineHeight: LineHeights[24],
    color: Colors.text.tertiary,
    textTransform: 'none',
  },

  activeTabText: {
    color: Colors.text.primary,
    fontFamily: FontFamilies.bold,
  },
});
