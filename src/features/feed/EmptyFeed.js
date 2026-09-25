// The feed with no news in it. One clear first move, centred: a large voice
// button (the same "new news" flow as the rail's +), a line saying what
// happens, a few topics to tap instead of speaking, and "Type instead".
// The rail and bottom bar step aside so nothing competes with it.
//
// Motion: the button breathes — a soft ring swells and fades behind it
// (2.4s loop, ease-out, transform + opacity on the native driver) so it
// reads as "listening is one tap away". Content enters once with a short
// rise + fade, staggered 60ms: button, text, topics. Reduced motion: no
// ring, no rise — just the fade.
//
// While the library is still loading, the card shows the pixel loader so a
// returning user never sees an empty flash. Without a pipeline server (the
// hosted web demo when the tunnel is down), it says so instead of offering
// actions that can't work.
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { Mic } from 'lucide';

import Icon from '../../components/icons/Icon';
import LoadingState from '../../components/loaders/LoadingState';
import { Colors, Space, Radius, Motion, FontFamilies, useReducedMotion } from '../../brand';
import { FeedColors } from '../../brand/Feed';
import { CARD, useCardBottom } from '../layout';
import { TITLE, BODY } from './type';

const MIC = 88;
// Evergreen topics that research well — tapping one starts a briefing.
const TOPICS = ['Fed rates', 'AI chips', 'El Niño'];

function useEnter(reduced, delay) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 320, delay, easing: Motion.ease.out, useNativeDriver: true }).start();
  }, [v, delay]);
  const translateY = reduced ? 0 : v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  return { opacity: v, transform: [{ translateY }] };
}

function Breath({ reduced }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 2000, easing: Motion.ease.out, useNativeDriver: true }),
        Animated.delay(400),
      ])
    );
    v.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [v, reduced]);
  if (reduced) return null;
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
  const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0] });
  return <Animated.View pointerEvents="none" style={[styles.ring, { opacity, transform: [{ scale }] }]} />;
}

export default function EmptyFeed({ loading, connected = true, onVoice, onType, onTopic }) {
  const cardBottom = useCardBottom();
  const reduced = useReducedMotion();
  const a = useEnter(reduced, 0);
  const b = useEnter(reduced, 60);
  const c = useEnter(reduced, 120);

  return (
    <View style={styles.screen}>
      <View style={[styles.card, { marginBottom: cardBottom }]}>
        {loading ? (
          <View style={styles.center}>
            <LoadingState label="Loading your briefings" />
          </View>
        ) : !connected ? (
          <View style={styles.center}>
            <Text style={styles.title} accessibilityRole="header">
              No briefings here yet
            </Text>
            <Text style={styles.body}>
              This version isn’t connected to a briefing server, so it can’t make stories. Run Genie with its server to try it —
              see the README.
            </Text>
          </View>
        ) : (
          <View style={styles.center}>
            <Animated.View style={[styles.micWrap, a]}>
              <Breath reduced={reduced} />
              <Pressable
                onPress={onVoice}
                accessibilityRole="button"
                accessibilityLabel="Ask Genie by voice"
                accessibilityHint="Say a topic to make a briefing"
                style={({ pressed }) => [styles.mic, pressed && styles.pressed]}
              >
                <Icon icon={Mic} size={32} strokeWidth={2} color={Colors.text.onDark} />
              </Pressable>
            </Animated.View>

            <Animated.View style={[styles.copy, b]}>
              <Text style={styles.title} accessibilityRole="header">
                What should Genie explain?
              </Text>
              <Text style={styles.body}>Tap and say any topic. Genie researches it and builds you a visual briefing.</Text>
            </Animated.View>

            <Animated.View style={[styles.topics, c]}>
              {TOPICS.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => onTopic?.(t)}
                  accessibilityRole="button"
                  accessibilityLabel={`Make a briefing on ${t}`}
                  style={({ pressed }) => [styles.topic, pressed && styles.pressed]}
                >
                  <Text style={styles.topicText}>{t}</Text>
                </Pressable>
              ))}
            </Animated.View>

            <Animated.View style={c}>
              <Pressable onPress={onType} hitSlop={10} accessibilityRole="button" style={({ pressed }) => pressed && styles.dim}>
                <Text style={styles.type}>Type instead</Text>
              </Pressable>
            </Animated.View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: FeedColors.page, paddingTop: Space[16] },
  card: {
    flex: 1,
    marginHorizontal: CARD.marginX,
    borderRadius: CARD.radius,
    overflow: 'hidden',
    backgroundColor: Colors.surface.subtle,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Space[32], gap: Space[20] },

  micWrap: { width: MIC, height: MIC, alignItems: 'center', justifyContent: 'center', marginBottom: Space[4] },
  ring: {
    position: 'absolute',
    width: MIC,
    height: MIC,
    borderRadius: MIC / 2,
    backgroundColor: FeedColors.accent,
  },
  mic: {
    width: MIC,
    height: MIC,
    borderRadius: MIC / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FeedColors.accent,
  },
  pressed: { transform: [{ scale: Motion.pressScale }] },
  dim: { opacity: 0.6 },

  copy: { alignItems: 'center', gap: Space[8] },
  title: { ...TITLE, textAlign: 'center', color: Colors.text.primary },
  body: { ...BODY, textAlign: 'center', color: Colors.text.secondary },

  topics: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Space[8] },
  topic: {
    paddingHorizontal: Space[14],
    paddingVertical: Space[8],
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: Colors.surface.page,
  },
  topicText: { ...BODY, fontFamily: FontFamilies.demi, color: Colors.text.primary },
  type: { ...BODY, fontFamily: FontFamilies.demi, color: Colors.text.tertiary, textDecorationLine: 'underline' },
});
