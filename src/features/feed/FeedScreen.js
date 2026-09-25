// Home: today's news as pills on top, and one rounded card below.
//
//   swipe up / down     → the next / previous story about this news
//   swipe left / right  → the next / previous news (or tap a pill)
//   a video finishes    → the feed scrolls on to the next story by itself
//   after the last one  → an end page that counts down into the next news
//
// OPEN APP → SEE WHAT HAPPENED → WATCH EXPLAINER → UNDERSTAND WHY IT MATTERS
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Animated, PanResponder } from 'react-native';

import { FeedColors } from '../../brand/Feed';
import { Space, Motion, useReducedMotion } from '../../brand';
import { CARD, BAR_TOP_IN_CARD, useCardBottom } from '../layout';

import NewsRail from './NewsRail';
import StoryCard from './StoryCard';
import StoryBar from './StoryBar';
import { illustrationFor } from '../../data/illustrations';
import { setPlayback } from './playback';

// Horizontal swipe: a flick commits regardless of distance (velocity in
// px/ms, per the momentum-dismissal rule); a slow drag needs a third of the
// card. Past the first/last news the card resists instead of hitting a wall.
const FLICK_VELOCITY = 0.11;
const COMMIT_FRACTION = 0.3;
const EDGE_RESISTANCE = 0.25;
const EXIT_MS = 180;

// Imperative: `select(newsId)` — used by the news list sheet and by the
// rail's + (a new news item is selected the moment it's created).
// The page after a news item's last story.
const END = { id: '__end', type: 'end' };

function FeedScreen({ news: NEWS, onActiveStory, onCreate, onSuggest }, ref) {
  const [selectedId, setSelectedId] = useState(NEWS[0].id);
  const [seenIds, setSeenIds] = useState(() => new Set([NEWS[0].id]));
  const [activeIndex, setActiveIndex] = useState(0);
  const [card, setCard] = useState({ width: 0, height: 0 });
  const cardBottom = useCardBottom();
  const reduced = useReducedMotion();

  const newsIndex = Math.max(0, NEWS.findIndex((n) => n.id === selectedId));
  const news = NEWS[newsIndex];

  // Tell the shell which story is on screen — a question asked now is about it.
  const current = news.stories[activeIndex];
  useEffect(() => {
    onActiveStory?.(current, news.id);
  }, [current, news.id, onActiveStory]);

  const select = useCallback((id) => {
    setSelectedId(id);
    setActiveIndex(0);
    setPlayback(0);
    setSeenIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  useImperativeHandle(ref, () => ({ select }), [select]);

  // ── Horizontal swipe between news ─────────────────────────────────────────
  const list = useRef(null);
  const dx = useRef(new Animated.Value(0)).current;
  // The responder is created once; it reads live values through this ref.
  const live = useRef({});
  live.current = { newsIndex, count: NEWS.length, width: card.width, reduced, NEWS, select };

  const goTo = useCallback(
    (dir) => {
      const { newsIndex: i, count, width, reduced: r, NEWS: list, select: sel } = live.current;
      const next = i + dir;
      if (next < 0 || next >= count) {
        Animated.spring(dx, { toValue: 0, ...Motion.spring.settle, useNativeDriver: true }).start();
        return;
      }
      if (r || !width) {
        dx.setValue(0);
        sel(list[next].id);
        return;
      }
      // Out the way the finger was going, in from the other side.
      Animated.timing(dx, { toValue: -dir * width, duration: EXIT_MS, easing: Motion.ease.out, useNativeDriver: true }).start(() => {
        sel(list[next].id);
        dx.setValue(dir * width * 0.4);
        Animated.spring(dx, { toValue: 0, ...Motion.spring.settle, useNativeDriver: true }).start();
      });
    },
    [dx]
  );

  const pan = useRef(
    PanResponder.create({
      // Only claim clearly-horizontal drags; vertical ones belong to the feed.
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => {
        const { newsIndex: i, count } = live.current;
        const atEdge = (g.dx > 0 && i === 0) || (g.dx < 0 && i === count - 1);
        dx.setValue(atEdge ? g.dx * EDGE_RESISTANCE : g.dx);
      },
      onPanResponderRelease: (_, g) => {
        const { width } = live.current;
        const far = Math.abs(g.dx) > width * COMMIT_FRACTION;
        const flick = Math.abs(g.vx) > FLICK_VELOCITY && Math.sign(g.vx) === Math.sign(g.dx);
        if (far || flick) goTo(g.dx < 0 ? 1 : -1);
        else Animated.spring(dx, { toValue: 0, ...Motion.spring.settle, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(dx, { toValue: 0, ...Motion.spring.settle, useNativeDriver: true }).start();
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  // ── Vertical feed of stories within the news ──────────────────────────────
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const first = viewableItems.find((v) => v.isViewable);
    if (first?.index != null) {
      setActiveIndex(first.index);
      setPlayback(0);
    }
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const pageHeight = card.height;
  const getItemLayout = useCallback(
    (_, index) => ({ length: pageHeight, offset: pageHeight * index, index }),
    [pageHeight]
  );

  const pages = useMemo(() => [...news.stories, END], [news.stories]);
  const isLastNews = newsIndex === NEWS.length - 1;

  // A finished video hands off to the next page — the next story, or the end page.
  const advanceFrom = useCallback(
    (index) => {
      if (index + 1 < pages.length) list.current?.scrollToIndex({ index: index + 1, animated: true });
    },
    [pages.length]
  );

  const nextNews = useCallback(() => {
    if (isLastNews) select(NEWS[0].id);
    else goTo(1);
  }, [isLastNews, select, goTo, NEWS]);

  const renderItem = useCallback(
    ({ item, index }) => (
      <StoryCard
        story={item}
        news={news}
        illustration={illustrationFor(news)}
        asked={!!item.asked}
        active={index === activeIndex}
        height={pageHeight}
        captionBottom={BAR_TOP_IN_CARD + Space[16]}
        onEnded={() => advanceFrom(index)}
        nextNews={NEWS[(newsIndex + 1) % NEWS.length]}
        onNextNews={nextNews}
        isLastNews={isLastNews}
        onSuggest={onSuggest}
      />
    ),
    [activeIndex, pageHeight, news, advanceFrom, nextNews, isLastNews, NEWS, newsIndex, onSuggest]
  );

  return (
    <View style={styles.screen}>
      <NewsRail news={NEWS} selectedId={selectedId} seenIds={seenIds} onSelect={select} onCreate={onCreate} />
      <Animated.View
        style={[styles.card, { marginBottom: cardBottom, transform: [{ translateX: dx }] }]}
        onLayout={(e) => setCard({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        accessibilityActions={[
          { name: 'increment', label: 'Next news' },
          { name: 'decrement', label: 'Previous news' },
        ]}
        onAccessibilityAction={(e) => goTo(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        {...pan.panHandlers}
      >
        {pageHeight > 0 ? (
          <FlatList
            key={selectedId}
            ref={list}
            data={pages}
            keyExtractor={(s) => s.id}
            renderItem={renderItem}
            extraData={activeIndex}
            pagingEnabled
            snapToInterval={pageHeight}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            showsVerticalScrollIndicator={false}
            getItemLayout={getItemLayout}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            windowSize={3}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
          />
        ) : null}

        <StoryBar stories={news.stories} index={activeIndex} style={styles.storyBar} />
      </Animated.View>
    </View>
  );
}

export default forwardRef(FeedScreen);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: FeedColors.page },
  // The one card. Stories page vertically inside it; news swipes it sideways.
  card: {
    flex: 1,
    marginHorizontal: CARD.marginX,
    borderRadius: CARD.radius,
    overflow: 'hidden',
    backgroundColor: FeedColors.video.background,
  },
  storyBar: {
    position: 'absolute',
    top: Space[12],
    left: CARD.innerX,
    right: CARD.innerX,
  },
});
