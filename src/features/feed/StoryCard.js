// One page of the card: a story about the selected news item. The video fills
// the card edge to edge, down behind the voice bar, and the captions play over
// it just above the bar. A story still being generated shows a skeleton.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent, useEventListener } from 'expo';
import { Play, Pause } from 'lucide';

import Icon from '../../components/icons/Icon';
import LoadingState from '../../components/loaders/LoadingState';
import Glass from '../../components/glass/Glass';
import { FontFamilies, Space } from '../../brand';
import { BODY } from './type';
import { FeedColors } from '../../brand/Feed';
import { CARD } from '../layout';

import Captions from './Captions';
import EndCard from './EndCard';
import { ThesisCard, ImageCard, NumberCard, EmbedCard } from './BriefCards';
import { useMicActive } from '../composer/micSignal';
import { setPlayback } from './playback';

// Browsers only autoplay muted video. The first tap anywhere in the feed
// turns sound on for every card after it.
let soundUnlocked = Platform.OS !== 'web';

const BADGE = 64;

function Frame({ height, light, children }) {
  return <View style={[styles.page, light && styles.pageLight, { height }]}>{children}</View>;
}

// What the pipeline is doing right now, in the reader's words.
function stageLabel(story, asked) {
  if (!asked) return 'Generating explainer';
  switch (story.stage) {
    case 'checking':
      return 'Checking what’s new';
    case 'researching':
      return 'Searching the web';
    case 'insights':
      return 'Pulling insights';
    case 'media':
      return 'Finding the best existing media';
    case 'planning':
      return 'Building the story';
    case 'scripting':
      return 'Writing the script';
    case 'generating':
      return story.batch ? `Making videos · ${story.batch.done} of ${story.batch.total} ready` : 'Making the video';
    default:
      return 'Researching your question';
  }
}

// A story still being researched / generated — seeded ones, and questions
// you asked, which land here as a new segment on this news item's bar.
function GeneratingCard({ story, illustration, asked, height }) {
  return (
    <Frame height={height} light>
      <View style={styles.generating} pointerEvents="box-none">
        {illustration ? <Image source={illustration} style={styles.generatingArt} resizeMode="contain" /> : null}
        <Text style={styles.generatingTitle}>{asked && !story.batch ? `“${story.headline}”` : story.headline}</Text>
        <LoadingState label={stageLabel(story, asked)} style={styles.generatingStatus} />
      </View>
    </Frame>
  );
}

// The research gate found nothing new worth a video. Say so plainly and
// offer topics that do have fresh news — tapping one starts it.
function NoNewCard({ story, illustration, height, captionBottom, onSuggest }) {
  return (
    <Frame height={height} light>
      <View style={[styles.generating, { paddingBottom: captionBottom }]}>
        {illustration ? <Image source={illustration} style={[styles.generatingArt, styles.faded]} resizeMode="contain" /> : null}
        <Text style={styles.noNewKicker}>NO NEW INFORMATION</Text>
        <Text style={styles.generatingTitle}>{`“${story.headline}”`}</Text>
        <Text style={styles.failedText}>{story.message || 'Nothing new on this right now — try another topic.'}</Text>
        {story.suggestions?.length ? (
          <View style={styles.suggestions}>
            {story.suggestions.slice(0, 3).map((t) => (
              <Pressable
                key={t}
                onPress={() => onSuggest?.(t)}
                accessibilityRole="button"
                accessibilityLabel={`Try ${t}`}
                style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
              >
                <Text style={styles.suggestionText}>{t}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </Frame>
  );
}

// A question (or one beat of it) that couldn't be made. Said plainly; the
// rest of the bar still plays.
function FailedCard({ story, illustration, height }) {
  return (
    <Frame height={height} light>
      <View style={styles.generating} pointerEvents="none">
        {illustration ? <Image source={illustration} style={[styles.generatingArt, styles.faded]} resizeMode="contain" /> : null}
        <Text style={styles.generatingTitle}>{story.headline}</Text>
        <Text style={styles.failedText}>{story.error || 'We couldn’t make this one. Try asking again.'}</Text>
      </View>
    </Frame>
  );
}

function VideoCard({ story, active, height, captionBottom, onEnded }) {
  // A clip is a virtual cut: play [start, end) of the file and loop inside it.
  const clip = story.clip;
  const start = clip?.start ?? 0;

  // No looping: when a story finishes, the feed moves on to the next one.
  const player = useVideoPlayer(story.video, (p) => {
    p.loop = false;
    p.muted = !soundUnlocked;
    p.timeUpdateEventInterval = 0.1;
  });
  const { currentTime } = useEvent(player, 'timeUpdate', { currentTime: 0 });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: false });

  const micActive = useMicActive();

  // Finished → hand off to the next story. A virtual cut "finishes" at its
  // end time; a whole file at its natural end.
  const ended = useRef(false);
  useEffect(() => {
    if (!active) ended.current = false;
  }, [active]);
  const finish = () => {
    if (!active || ended.current) return;
    ended.current = true;
    onEnded?.();
  };
  useEventListener(player, 'playToEnd', finish);
  useEffect(() => {
    if (!clip || !active) return;
    if (currentTime >= clip.end) {
      player.pause();
      finish();
    } else if (currentTime < clip.start - 0.25) {
      player.currentTime = clip.start;
    }
  }, [clip, active, currentTime, player]); // eslint-disable-line react-hooks/exhaustive-deps

  // Time within this story (the cut, or the whole file).
  const local = Math.max(0, currentTime - start);
  const length = clip ? clip.end - clip.start : player.duration;

  // The card on screen drives the story bar's live segment.
  useEffect(() => {
    if (active && length > 0) setPlayback(local / length);
  }, [active, local, length]);

  // Only the card on screen plays; leaving rewinds it, like Reels. While the
  // mic is open it holds still, so the recogniser hears you, not the video.
  useEffect(() => {
    if (!active) {
      player.pause();
      player.currentTime = start;
    } else if (micActive) {
      player.pause();
    } else {
      player.muted = !soundUnlocked;
      // Coming back to a story that already finished starts it over.
      if (player.duration > 0 && player.currentTime >= player.duration - 0.05) player.currentTime = start;
      player.play();
    }
  }, [active, micActive, player]); // eslint-disable-line react-hooks/exhaustive-deps

  // Paused → the badge stays. Resumed → it lingers long enough to watch the
  // play glyph morph into pause, then gets out of the way.
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef(null);
  const onTapVideo = () => {
    if (!soundUnlocked) {
      soundUnlocked = true;
      player.muted = false;
      return;
    }
    if (player.playing) player.pause();
    else player.play();
    setFlash(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(false), 700);
  };
  useEffect(() => () => clearTimeout(flashTimer.current), []);
  const showPlayState = active && !micActive && (!isPlaying || flash);

  return (
    <Frame height={height}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
      />

      {/* Darkens the lower frame so captions read over any footage. */}
      <LinearGradient
        colors={['transparent', FeedColors.video.scrim]}
        style={styles.scrim}
        pointerEvents="none"
      />

      {/* Tap anywhere on the video to play / pause. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onTapVideo}
        accessibilityRole="button"
        accessibilityLabel={`${story.headline}. ${isPlaying ? 'Pause' : 'Play'}`}
      />

      {showPlayState ? (
        <View style={styles.center} pointerEvents="none">
          <Glass radius={BADGE / 2} style={styles.playBadge}>
            {/* The play triangle's visual mass sits left of its box; nudge it. */}
            <View style={!isPlaying && styles.playNudge}>
              <Icon icon={isPlaying ? Pause : Play} size={28} color={FeedColors.text.primary} strokeWidth={2} />
            </View>
          </Glass>
        </View>
      ) : null}

      <View style={[styles.captions, { bottom: captionBottom }]} pointerEvents="none">
        <Captions captions={story.captions} time={active ? local : 0} />
      </View>
    </Frame>
  );
}

export default function StoryCard({ story, news, nextNews, illustration, asked, active, height, captionBottom, onEnded, onNextNews, isLastNews, onSuggest }) {
  if (story.status === 'no_new') {
    return <NoNewCard story={story} illustration={illustration} height={height} captionBottom={captionBottom} onSuggest={onSuggest} />;
  }
  if (story.type === 'end') {
    return (
      <EndCard
        news={news}
        nextNews={nextNews}
        isLastNews={isLastNews}
        active={active}
        height={height}
        captionBottom={captionBottom}
        onNextNews={onNextNews}
      />
    );
  }
  if (story.status === 'failed') return <FailedCard story={story} illustration={illustration} height={height} />;

  // Briefing cards: the storyboard picked the best existing medium for each.
  const brief = { story, active, height, captionBottom, onEnded };
  if (story.status !== 'generating') {
    if (story.format === 'text') return <ThesisCard {...brief} />;
    if (story.format === 'image') return <ImageCard {...brief} />;
    if (story.format === 'graphic') return <NumberCard {...brief} />;
    if (story.format === 'external_video') return <EmbedCard {...brief} />;
  }
  if (story.status === 'generating' || !story.video) {
    return <GeneratingCard story={story} illustration={illustration} asked={asked} height={height} />;
  }
  return <VideoCard story={story} active={active} height={height} captionBottom={captionBottom} onEnded={onEnded} />;
}

const styles = StyleSheet.create({
  page: { overflow: 'hidden', backgroundColor: FeedColors.video.background },
  // House rule for every video in the card, whatever its shape: fill the full
  // height, stay centred, and crop evenly from both sides — never from one
  // corner. Explicit width/height matter on web, where expo-video renders a
  // raw <video> that otherwise sizes to its own pixels and anchors top-left.
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web' ? { objectPosition: 'center center' } : null),
  },
  pageLight: { backgroundColor: FeedColors.card },

  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  captions: {
    position: 'absolute',
    left: CARD.innerX,
    right: CARD.innerX,
  },

  // RN 0.86 dropped StyleSheet.absoluteFillObject on native — spell it out.
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    width: BADGE,
    height: BADGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playNudge: { transform: [{ translateX: 2 }] },

  generating: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space[32],
    paddingBottom: Space[64],
  },
  generatingArt: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  generatingStatus: { marginTop: Space[20] },
  faded: { opacity: 0.45 },
  noNewKicker: {
    marginTop: Space[16],
    fontFamily: FontFamilies.demi,
    fontSize: 11,
    letterSpacing: 1.4,
    color: FeedColors.text.tertiary,
  },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Space[8], marginTop: Space[20] },
  suggestion: {
    paddingHorizontal: Space[14],
    paddingVertical: Space[8],
    borderRadius: 999,
    borderWidth: 1,
    borderColor: FeedColors.hairline,
    backgroundColor: FeedColors.page,
  },
  suggestionPressed: { transform: [{ scale: 0.97 }] },
  suggestionText: { fontFamily: FontFamilies.demi, fontSize: 14, color: FeedColors.text.primary },
  failedText: {
    marginTop: Space[10],
    ...BODY,
    textAlign: 'center',
    color: FeedColors.text.tertiary,
  },
  generatingTitle: {
    marginTop: Space[16],
    ...BODY,
    textAlign: 'center',
    color: FeedColors.text.primary,
  },
});
