// The non-video story formats of a visual briefing. The storyboard agent picks
// a format per card by explanatory value — existing video > existing image >
// number graphic > text > generated video — and these render it:
//
//   text            ThesisCard   the opener (what happened · what changed · why
//                                it matters); over the source image if there is one
//   image           ImageCard    an existing authoritative image
//   graphic         NumberCard   one number, big: value · unit · comparison · time
//   external_video  EmbedCard    an existing (usually official) video, embedded at
//                                its timestamp, with attribution
//
// Real media only: nothing here is generated, and nothing is presented as
// something it isn't.
import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, FontFamilies, Space, Palette, ColorUtils } from '../../brand';
import { FeedColors } from '../../brand/Feed';
import { CARD } from '../layout';

import ExternalVideo from './ExternalVideo';
import useDwell, { readingTime } from './useDwell';
import { TITLE, BODY } from './type';


function Page({ height, dark, children }) {
  return <View style={[styles.page, { height }, dark ? styles.dark : styles.light]}>{children}</View>;
}

// The card's own image, else the backdrop the briefing lent it.
const imageOf = (story) =>
  story.media?.type === 'image' ? { url: story.media.url, source: story.media.source } : story.backdrop?.url ? story.backdrop : null;

// A real image filling the card, darkened so white type reads on it. `even`
// darkens the whole frame (centred content); otherwise it deepens downward.
function Backdrop({ url, even }) {
  return (
    <>
      <Image source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={
          even
            ? [ColorUtils.rgba(Palette.base.black, 0.15), ColorUtils.rgba(Palette.base.black, 0.6), ColorUtils.rgba(Palette.base.black, 0.88)]
            : ['transparent', ColorUtils.rgba(Palette.base.black, 0.35), ColorUtils.rgba(Palette.base.black, 0.82)]
        }
        locations={even ? [0, 0.45, 1] : [0.25, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
    </>
  );
}

// ── Text / image: words over a real image ────────────────────────────────────
function Editorial({ story, height, captionBottom, image }) {
  const onImage = Boolean(image);
  return (
    <Page height={height} dark={onImage}>
      {onImage ? <Backdrop url={image} /> : null}
      <View style={[styles.editorial, { paddingBottom: captionBottom }]}>
        <Text style={[styles.headline, onImage && styles.onDark]}>{story.cardHeadline || story.headline}</Text>
        {story.caption ? <Text style={[styles.caption, onImage && styles.onDarkSoft]}>{story.caption}</Text> : null}
      </View>
    </Page>
  );
}

export function ThesisCard({ story, active, height, captionBottom, onEnded }) {
  useDwell({ active, ms: readingTime(story.cardHeadline, story.caption), onEnded });
  const image = imageOf(story);
  return (
    <Editorial
      story={story}
      height={height}
      captionBottom={captionBottom}
      image={image?.url}
    />
  );
}

export function ImageCard({ story, active, height, captionBottom, onEnded }) {
  useDwell({ active, ms: readingTime(story.cardHeadline, story.caption), onEnded });
  return (
    <Editorial
      story={story}
      height={height}
      captionBottom={captionBottom}
      image={story.media?.url}
    />
  );
}

// ── Graphic: one number, big ─────────────────────────────────────────────────
export function NumberCard({ story, active, height, captionBottom, onEnded }) {
  const n = story.number || {};
  useDwell({ active, ms: readingTime(story.cardHeadline, story.caption, n.comparison), onEnded });
  const image = imageOf(story);
  const d = Boolean(image);
  return (
    <Page height={height} dark={d}>
      {d ? <Backdrop url={image.url} even /> : null}
      <View style={[styles.numberWrap, { paddingBottom: captionBottom }]}>
        {/* The number reads at headline size — highlighted by place, not scale. */}
        <Text style={[styles.headline, d && styles.onDark]}>{[n.value, n.unit].filter(Boolean).join(' ')}</Text>
        {n.comparison || n.time ? (
          <Text style={[styles.comparison, d && styles.onDarkSoft]}>
            {[n.comparison && `vs ${n.comparison}`, n.time].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        <View style={[styles.rule, d && styles.ruleDark]} />
        <Text style={[styles.headline, d && styles.onDark]}>{story.cardHeadline || story.headline}</Text>
        {story.caption ? <Text style={[styles.caption, d && styles.onDarkSoft]}>{story.caption}</Text> : null}
      </View>
    </Page>
  );
}

// ── External video: embedded, attributed ─────────────────────────────────────
export function EmbedCard({ story, active, height, captionBottom, onEnded }) {
  const m = story.media || {};
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!active) setPaused(false);
  }, [active]);
  const span = m.start_time != null && m.end_time != null ? (m.end_time - m.start_time) * 1000 : 45000;
  // Time on card only runs while the clip plays; the clip ending moves on.
  useDwell({ active, paused, ms: Math.max(8000, span), onEnded });
  const onState = (s) => {
    if (s === 'ended') onEnded?.();
    else setPaused(s === 'paused');
  };
  return (
    <Page height={height}>
      <View style={styles.player}>
        {active ? (
          <ExternalVideo media={m} onState={onState} style={StyleSheet.absoluteFill} />
        ) : m.thumbnail ? (
          <Image source={{ uri: m.thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
      </View>
      <View style={[styles.embedText, { paddingBottom: captionBottom }]}>
        <Text style={styles.headline}>{story.cardHeadline || story.headline}</Text>
        {story.caption ? <Text style={styles.caption}>{story.caption}</Text> : null}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { overflow: 'hidden' },
  light: { backgroundColor: Colors.surface.page },
  dark: { backgroundColor: FeedColors.video.background },

  editorial: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: CARD.innerX, gap: Space[8] },
  headline: { ...TITLE, color: Colors.text.primary },
  caption: { ...BODY, color: Colors.text.secondary },
  onDark: { color: Colors.text.onDark },
  ruleDark: { backgroundColor: ColorUtils.rgba(Palette.base.white, 0.25) },
  onDarkSoft: { color: ColorUtils.rgba(Palette.base.white, 0.85) },

  // Copy sits at the bottom; the top of the card is left to the image.
  numberWrap: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: CARD.innerX, gap: Space[6] },
  comparison: { ...BODY, color: Colors.text.secondary },
  rule: { height: StyleSheet.hairlineWidth * 2, backgroundColor: Colors.border.subtle, marginVertical: Space[12] },

  // The clip fills the card from the top down to 24px above the words.
  player: {
    flex: 1,
    backgroundColor: Palette.base.black,
    overflow: 'hidden',
    ...Platform.select({ web: { position: 'relative' }, default: {} }),
  },
  embedText: { paddingTop: Space[24], paddingHorizontal: CARD.innerX, gap: Space[8] },
});
