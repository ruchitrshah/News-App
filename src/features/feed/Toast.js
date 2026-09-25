// Lightweight toast for the feed. (The house Snackbar pulls in the old
// app's icon set; this keeps the feed on one icon system.)
import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';

import Glass from '../../components/glass/Glass';
import { FontFamilies, Space, Radius, Motion } from '../../brand';
import { FeedColors } from '../../brand/Feed';

export default function Toast({ message, onHide, bottom }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return undefined;
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: Motion.duration.enter, easing: Motion.ease.out, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: Motion.duration.exit, easing: Motion.ease.out, useNativeDriver: true }).start(() => onHide?.());
    }, 2400);
    return () => clearTimeout(t);
  }, [message, anim, onHide]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        { bottom, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
      ]}
    >
      <Glass radius={Radius[18]} style={styles.inner}>
        <Text style={styles.text}>{message}</Text>
      </Glass>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: Space[24],
    right: Space[24],
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[10],
    paddingHorizontal: Space[16],
    paddingVertical: Space[12],
  },
  text: {
    flex: 1,
    fontFamily: FontFamilies.medium,
    fontSize: 14,
    lineHeight: 19,
    color: FeedColors.text.primary,
  },
});
