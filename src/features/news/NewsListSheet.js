// All news, full screen — opened from the bookmark in the voice bar, grouped
// under date headers (Today · Yesterday · Mon, Sep 22 · Earlier), newest
// first; the headers stick while you scroll their section. Tap a row to jump
// the feed to that news; the back button (or Android back) returns to it.
//
// The page is absolutely positioned over the SafeScreen, which ignores the
// parent's safe-area padding — so it pads itself by the insets.
//
// Each row: the news item's illustration on a soft tile, its name (text) and
// its lead headline (subtext). The news you're on sits on a mid-grey fill
// (neutral-200 — visible on white, lighter than solid ink) with a check; the
// row pads its right side more than its left, so the check clears the 22pt
// corner instead of crowding it.
//
// Motion (occasional, so a real entrance is earned):
//   enter  page rises 24px + fades · 300ms drawer curve; rows follow with a
//          35ms stagger (rise 10px + fade, 260ms ease-out) — first 10 only
//   exit   fade + 12px drop · 180ms ease-out — faster, the choice is made
//   press  rows scale to 0.98
//   reduced motion: fades only, no travel, no stagger
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet, Animated, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronLeft } from 'lucide';

import Icon from '../../components/icons/Icon';
import { illustrationFor } from '../../data/illustrations';
import { Colors, FontFamilies, Space, Radius, Motion, Palette, useReducedMotion } from '../../brand';
import { useBottomInset } from '../../brand/responsive';
import { TITLE, BODY } from '../feed/type';

const ENTER_MS = 300;
const EXIT_MS = 180;
const STAGGER_MS = 35;
const STAGGER_MAX = 10;
const TILE = 56;

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (t) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// When a news item was made: its own timestamp, else its newest story's.
function dateOf(item) {
  if (item.createdAt) return item.createdAt;
  const times = item.stories.map((s) => s.createdAt).filter(Boolean);
  return times.length ? Math.max(...times) : null;
}

function dayLabel(day, today) {
  if (day === today) return 'Today';
  if (day === today - DAY) return 'Yesterday';
  const d = new Date(day);
  const sameYear = d.getFullYear() === new Date(today).getFullYear();
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

// [{ key, label, items }] — newest day first; undated news last, as "Earlier".
function sectionsOf(news) {
  const today = startOfDay(Date.now());
  const byDay = new Map();
  const undated = [];
  for (const item of news) {
    const t = dateOf(item);
    if (!t) {
      undated.push(item);
      continue;
    }
    const day = startOfDay(t);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push({ item, t });
  }
  const sections = [...byDay.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([day, rows]) => ({
      key: `d${day}`,
      label: dayLabel(day, today),
      items: rows.sort((a, b) => b.t - a.t).map((r) => r.item),
    }));
  if (undated.length) sections.push({ key: 'earlier', label: 'Earlier', items: undated });
  return sections;
}

function subtextFor(item) {
  const ready = item.stories.filter((s) => s.status !== 'generating');
  if (!ready.length) return 'Researching…';
  const lead = ready.find((s) => s.headline) ?? ready[0];
  return lead?.cardHeadline || lead?.headline || '';
}

function Row({ item, index, open, selected, onPress, reduced }) {
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!open) return;
    a.setValue(0);
    Animated.timing(a, {
      toValue: 1,
      duration: 260,
      delay: reduced ? 0 : 60 + Math.min(index, STAGGER_MAX) * STAGGER_MS,
      easing: Motion.ease.out,
      useNativeDriver: true,
    }).start();
  }, [open, index, reduced, a]);

  const translateY = reduced ? 0 : a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const subtext = subtextFor(item);

  return (
    <Animated.View style={{ opacity: a, transform: [{ translateY }] }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${item.label}. ${subtext}`}
        style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.rowPressed]}
      >
        <View style={[styles.tile, selected && styles.tileSelected]}>
          <Image source={illustrationFor(item)} style={styles.art} resizeMode="contain" />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.label} numberOfLines={1}>
            {item.label}
          </Text>
          {subtext ? (
            <Text style={[styles.subtext, selected && styles.subtextSelected]} numberOfLines={2}>
              {subtext}
            </Text>
          ) : null}
        </View>
        <View style={styles.check}>
          {selected ? <Icon icon={Check} size={20} strokeWidth={2.2} color={Colors.text.primary} /> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function NewsListSheet({ visible, news, selectedId, onSelect, onClose }) {
  const reduced = useReducedMotion();
  const bottom = useBottomInset(Space[16]);
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(t, { toValue: 1, duration: ENTER_MS, easing: Motion.ease.drawer, useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(t, { toValue: 0, duration: EXIT_MS, easing: Motion.ease.out, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, mounted, t]);

  // Android back closes the list instead of leaving the app.
  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!mounted) return null;

  // Flatten sections into header + rows, remembering where headers sit so
  // they can stick. Row index keeps counting across sections for the stagger.
  const children = [];
  const stickyIndices = [];
  let n = 0;
  for (const section of sectionsOf(news)) {
    stickyIndices.push(children.length);
    children.push(
      <View key={section.key} style={styles.sectionHead}>
        <Text style={styles.sectionLabel} accessibilityRole="header">
          {section.label}
        </Text>
      </View>
    );
    for (const item of section.items) {
      const i = n++;
      children.push(
        <Row
          key={item.id}
          item={item}
          index={i}
          open={visible}
          reduced={reduced}
          selected={item.id === selectedId}
          onPress={() => {
            onSelect(item.id);
            onClose();
          }}
        />
      );
    }
  }

  const translateY = reduced
    ? 0
    : t.interpolate({ inputRange: [0, 1], outputRange: [visible ? 24 : 12, 0] });

  return (
    <Animated.View
      style={[styles.page, { paddingTop: insets.top, opacity: t, transform: [{ translateY }] }]}
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityViewIsModal
    >
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to the feed"
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
        >
          <Icon icon={ChevronLeft} size={22} strokeWidth={2} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          News
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottom }]}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={stickyIndices}
      >
        {children}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    backgroundColor: Colors.surface.page,
  },

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space[12],
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface.subtle,
  },
  backPressed: { transform: [{ scale: Motion.pressScale }] },
  title: { ...TITLE, flex: 1, textAlign: 'center', color: Colors.text.primary },
  headerSpacer: { width: 44 },

  list: { flex: 1 },
  listContent: { paddingHorizontal: Space[12], gap: Space[4] },

  // Sticks under the header while its section scrolls; opaque so rows slide
  // beneath it cleanly.
  sectionHead: {
    paddingHorizontal: Space[12],
    paddingTop: Space[16],
    paddingBottom: Space[6],
    backgroundColor: Colors.surface.page,
  },
  sectionLabel: { ...BODY, fontFamily: FontFamilies.demi, color: Colors.text.tertiary },

  // More room on the right: the check's glyph has no box around it, so it
  // needs extra inset to look as settled as the tile does on the left.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space[14],
    padding: Space[12],
    paddingRight: Space[20],
    borderRadius: Radius[22],
  },
  rowSelected: { backgroundColor: Palette.neutral[200] },
  rowPressed: { transform: [{ scale: 0.98 }] },

  tile: {
    width: TILE,
    height: TILE,
    borderRadius: Radius[18],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface.subtle,
  },
  tileSelected: { backgroundColor: Palette.base.white },
  art: { width: 40, height: 40 },

  rowBody: { flex: 1, gap: Space[2] },
  label: { ...BODY, fontFamily: FontFamilies.demi, color: Colors.text.primary },
  subtext: { ...BODY, color: Colors.text.tertiary },
  subtextSelected: { color: Colors.text.secondary },

  check: { width: 20, alignItems: 'flex-end' },
});
