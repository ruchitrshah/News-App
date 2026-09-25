import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius } from '../brand';

export default function SkeletonLoader({ style }) {
  const { width } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(translateX, {
        toValue: 100,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, [translateX]);

  return (
    <View style={[styles.skeletonContainer, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{
              translateX: translateX.interpolate({
                inputRange: [-100, 100],
                outputRange: [-width * 0.5, width * 0.5]
              })
            }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255, 255, 255, 0.3)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonContainer: {
    backgroundColor: Colors.surface.soft || '#F3F4F6',
    overflow: 'hidden',
    borderRadius: Radius[12] || 12,
  },
});