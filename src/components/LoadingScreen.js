import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, Space, Type } from '../brand';

const SPINNER_COUNT = 12;
const SPINNER_WIDTH = 4;
const SPINNER_HEIGHT = 24;
const SPINNER_SPACING = 4;
const ANIMATION_DURATION = 1500;

export default function LoadingScreen({ message = null }) { // ✅ Default to null (no message)
  const spinners = useRef(
    Array.from({ length: SPINNER_COUNT }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const animations = spinners.map((spinner, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay((ANIMATION_DURATION * index) / 30),
          Animated.timing(spinner, {
            toValue: 1,
            duration: ANIMATION_DURATION,
            useNativeDriver: false,
          }),
          Animated.timing(spinner, {
            toValue: 0,
            duration: 0,
            useNativeDriver: false,
          }),
        ])
      );
    });

    Animated.parallel(animations).start();

    return () => {
      spinners.forEach(spinner => spinner.stopAnimation());
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.spinnersContainer}>
        {spinners.map((spinner, index) => {
          const scaleY = spinner.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 1, 0],
          });

          const backgroundColor = spinner.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [
              Colors.surface.page,
              Colors.brand.primary,
              Colors.surface.page,
            ],
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.spinner,
                {
                  transform: [{ scaleY }],
                  backgroundColor,
                },
              ]}
            />
          );
        })}
      </View>

      {/* ✅ Only show message if provided */}
      {!!message && <Text style={styles.loadingText}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface.page,
  },

  spinnersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Space[24],
  },

  spinner: {
    width: SPINNER_WIDTH,
    height: SPINNER_HEIGHT,
    borderRadius: SPINNER_WIDTH / 2,
    marginRight: SPINNER_SPACING,
    backgroundColor: Colors.surface.page,
  },

  loadingText: {
    ...Type.bodySecondary,
    color: Colors.text.tertiary,
    marginTop: Space[8],
  },
});