// The top rail: today's news, one pill each. Progress through a news item's
// stories lives on the card (StoryBar); the pills only say *which* news.
//
//   +          → pinned at the start in the primary ink; the pills scroll
//                underneath it. Starts a brand-new news item.
//   selected   → solid ink, white label — unmistakably "you're here"
//   not opened → glass with a hairline border and a small ink dot
//   opened     → glass with a hairline border
//
// Selection changes are instant: they happen on every tap and every swipe,
// and the fill swap is feedback enough.
import React, { useEffect, useRef } from 'react';
import { ScrollView, View, Text, Image, Pressable, StyleSheet, Platform } from 'react-native';
import { Plus } from 'lucide';
import { LinearGradient } from 'expo-linear-gradient';

import Glass from '../../components/glass/Glass';
import Icon from '../../components/icons/Icon';
import { illustrationFor } from '../../data/illustrations';
import { Colors, FontFamilies, Space, Radius, Motion, Spacing, Palette, ColorUtils } from '../../brand';
import { FeedColors } from '../../brand/Feed';

const PILL_H = Spacing.control.heightSm; // 40
const EDGE = Space[18];
// Room the pinned + takes at the start of the rail (button + gap).
const PLUS_ZONE = EDGE + PILL_H + Space[10];

function NewsPill({ news, selected, seen, onPress, onLayout }) {
  const total = news.stories.length;

  const content = (
    <>
      <Image source={illustrationFor(news)} style={styles.art} resizeMode="contain" />
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
        {news.label}
      </Text>
      {!seen && !selected ? <View style={styles.dot} /> : null}
    </>
  );

  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={`${news.label}, ${total} ${total === 1 ? 'story' : 'stories'}${!seen && !selected ? ', new' : ''}`}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {selected ? (
        <View style={[styles.pill, styles.selected]}>{content}</View>
      ) : (
        <Glass radius={Radius.full} interactive shadow={false} style={[styles.pill, styles.idle]}>
          {content}
        </Glass>
      )}
    </Pressable>
  );
}

export default function NewsRail({ news, selectedId, seenIds, onSelect, onCreate }) {
  const scroller = useRef(null);
  const layouts = useRef({});

  // Swiping the card changes the selection — keep the selected pill in view,
  // with a little of its left neighbour showing so the rail reads as a row.
  useEffect(() => {
    const l = layouts.current[selectedId];
    if (l) scroller.current?.scrollTo({ x: Math.max(0, l.x - PLUS_ZONE - Space[24]), animated: true });
  }, [selectedId]);

  return (
    <View style={styles.rail}>
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
        contentContainerStyle={styles.row}
        accessibilityRole="tablist"
      >
        {news.map((item) => (
          <NewsPill
            key={item.id}
            news={item}
            selected={item.id === selectedId}
            seen={seenIds.has(item.id)}
            onPress={() => onSelect(item.id)}
            onLayout={(e) => {
              layouts.current[item.id] = e.nativeEvent.layout;
            }}
          />
        ))}
      </ScrollView>

      {/* Pinned +: pills slide under a frosted backing that feathers out to
          the right. It stops short of the first pill, so at rest it covers
          nothing. */}
      <View style={styles.plusZone} pointerEvents="box-none">
        <PlusBacking />
        <Pressable
          onPress={onCreate}
          accessibilityRole="button"
          accessibilityLabel="New news"
          hitSlop={6}
          style={({ pressed }) => [styles.plus, pressed && styles.pressed]}
        >
          <Icon icon={Plus} size={20} strokeWidth={2.2} color={Colors.text.onDark} />
        </Pressable>
      </View>
    </View>
  );
}

// What the pills slide under at the +: the page colour, solid behind the
// button and fading out over its last stretch, so a pill dissolves as it
// passes beneath rather than being cut. No blur — a blurred strip on a flat
// white page only shows its own edges (a grey seam beside the card corner).
const PAGE = Colors.surface.page;
function PlusBacking() {
  return (
    <LinearGradient
      colors={[PAGE, PAGE, ColorUtils.rgba(PAGE, 0)]}
      locations={[0, 0.72, 1]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.plusBacking}
      pointerEvents="none"
    />
  );
}

const selectedShadow = Platform.select({
  web: { boxShadow: `0 6px 16px ${ColorUtils.rgba(FeedColors.accent, 0.18)}` },
  android: { elevation: 4 },
  default: { shadowColor: FeedColors.accent, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
});

const styles = StyleSheet.create({
  // ScrollView grows by default; the rail must stay its content height.
  rail: { flexGrow: 0, flexShrink: 0 },
  scroller: { flexGrow: 0, flexShrink: 0 },
  row: {
    paddingLeft: PLUS_ZONE,
    paddingRight: EDGE,
    // Room for the pill shadows, which a ScrollView would otherwise clip.
    paddingTop: Space[16],
    paddingBottom: Space[16],
    // Keep the rail pill-height even with no pills, so the pinned + (centred
    // on the rail) isn't clipped when the feed is empty.
    minHeight: PILL_H + Space[16] * 2,
    gap: Space[10],
  },
  pill: {
    height: PILL_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[6],
    paddingLeft: Space[6],
    paddingRight: Space[16],
    borderRadius: Radius.full,
  },
  // One crisp edge (Glass's own hairline) and a tight contact shadow. The
  // extra 1px border plus Glass's 24px drop shadow stacked into a thick grey
  // halo around every pill.
  idle: Platform.select({
    web: { boxShadow: '0 1px 2px rgba(16,24,40,0.06), 0 2px 6px rgba(16,24,40,0.04)' },
    android: { elevation: 1 },
    default: { shadowColor: '#101828', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  }),
  selected: {
    backgroundColor: FeedColors.accent,
    borderWidth: 1,
    borderColor: FeedColors.accent,
    ...selectedShadow,
  },
  pressed: { transform: [{ scale: Motion.pressScale }] },
  art: { width: 30, height: 30 },
  plusZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: PLUS_ZONE,
    justifyContent: 'center',
  },
  // From the screen edge to 4px short of the first pill (the gap is 10px).
  // Ends 2px short of the first pill (the gap is 10px), so at rest it touches
  // nothing; the fade only shows on pills scrolling underneath.
  plusBacking: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: PLUS_ZONE - Space[2],
  },
  plus: {
    marginLeft: EDGE,
    width: PILL_H,
    height: PILL_H,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FeedColors.accent,
    ...selectedShadow,
  },
  label: {
    fontFamily: FontFamilies.demi,
    fontSize: 15,
    color: Colors.text.primary,
  },
  labelSelected: { color: Palette.base.white },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: Space[2], // 6 gap + 2 = 8px from the label
    backgroundColor: FeedColors.accent,
  },
});
