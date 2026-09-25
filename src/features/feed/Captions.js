// Timed captions for an explainer, driven by the video clock.
//
// Instagram-style: each line appears whole, in a light weight, and quietly
// replaces the last. The only motion is a short fade (+ a 4px rise) as a new
// line lands — enough that the change reads as "next", not as a flicker.
// Reduced motion keeps the fade and drops the rise.
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

import { FontFamilies, Motion, useReducedMotion } from '../../brand';
import { FeedColors } from '../../brand/Feed';
import { BODY } from './type';
import { useComposerOverlay } from '../composer/micSignal';

const LINE_HEIGHT = 22;

function Line({ text, reduced }) {
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: Motion.duration.micro, // 170ms
      easing: Motion.ease.out,
      useNativeDriver: true,
    }).start();
  }, [enter]);

  const translateY = reduced ? 0 : enter.interpolate({ inputRange: [0, 1], outputRange: [4, 0] });

  return (
    <Animated.Text
      style={[styles.text, { opacity: enter, transform: [{ translateY }] }]}
      accessibilityLiveRegion="polite"
    >
      {text}
    </Animated.Text>
  );
}

export default function Captions({ captions, time }) {
  const reduced = useReducedMotion();
  const covered = useComposerOverlay();
  // The line being spoken; before the first word, the first line; after the
  // last word, the last line holds rather than jumping back to the start.
  let index = captions.findIndex((c) => time >= c.start && time < c.end);
  if (index === -1) index = time >= (captions[captions.length - 1]?.start ?? 0) ? captions.length - 1 : 0;
  const cue = captions[index];

  return (
    // Steps aside (instantly) while the voice bar shows a card in this spot.
    <View style={[styles.frame, covered && styles.hidden]}>
      {/* Keyed by cue so each new line gets its fade; the old one leaves instantly. */}
      <Line key={index} text={cue.text} reduced={reduced} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Two lines, bottom-anchored: short lines sit on the voice bar, long ones
  // grow upward, and the video never shifts.
  frame: { minHeight: LINE_HEIGHT * 2, justifyContent: 'flex-end' },
  hidden: { opacity: 0 },
  text: {
    ...BODY,
    lineHeight: LINE_HEIGHT,
    color: FeedColors.video.caption,
    textShadowColor: FeedColors.video.captionShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
