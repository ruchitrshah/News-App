// Stories-style progress across the top of the card: one segment per story
// about the selected news.
//
//   watched      → full
//   on screen    → fills with the video's playhead (a clock: no easing)
//   generating   → an empty track; the card itself shows the loader
//   failed       → a muted red segment; the rest of the bar still plays
//   not yet      → empty track
//
// White over footage, ink over the light "generating" card.
import React from 'react';
import { View, StyleSheet } from 'react-native';

import { Space, Palette, Colors, ColorUtils } from '../../brand';

import { usePlayback } from './playback';

const THEMES = {
  video: { fill: Palette.base.white, track: ColorUtils.rgba(Palette.base.white, 0.35) },
  light: { fill: Colors.text.primary, track: ColorUtils.rgba(Palette.base.black, 0.1) },
};

function Segment({ fill, theme }) {
  return (
    <View style={[styles.segment, { backgroundColor: theme.track }]}>
      <View style={[styles.fill, { width: `${fill * 100}%`, backgroundColor: theme.fill }]} />
    </View>
  );
}

function LiveSegment({ theme }) {
  const progress = usePlayback();
  return <Segment fill={progress} theme={theme} />;
}

// White over footage and photos; ink over the light cards (numbers, plain
// text, generating/failed/end pages).
function onDarkSurface(story) {
  if (!story || (story.status && story.status !== 'ready')) return false;
  switch (story.format) {
    case 'graphic':
    case 'text':
      return story.media?.type === 'image' || Boolean(story.backdrop?.url);
    default:
      return true; // video, embedded video, image, legacy stories
  }
}

export default function StoryBar({ stories, index, style }) {
  if (!stories?.length) return null;
  const current = stories[index];
  const theme = onDarkSurface(current) ? THEMES.video : THEMES.light;

  return (
    <View
      style={[styles.bar, style]}
      pointerEvents="none"
      accessibilityRole="progressbar"
      accessibilityLabel={`Story ${index + 1} of ${stories.length}`}
    >
      {stories.map((story, i) => {
        if (story.status === 'generating') {
          return <Segment key={story.id} fill={0} theme={theme} />;
        }
        if (story.status === 'failed') {
          return <View key={story.id} style={[styles.segment, styles.failed]} />;
        }
        if (i === index) return <LiveSegment key={story.id} theme={theme} />;
        return <Segment key={story.id} fill={i < index ? 1 : 0} theme={theme} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: Space[6] },
  segment: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  failed: { backgroundColor: ColorUtils.rgba(Colors.status.danger, 0.55) },
});
