import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SafeScreen from './src/components/SafeScreen';
import { Colors, FontAssets, Space } from './src/brand';
import FeedScreen from './src/features/feed/FeedScreen';
import EmptyFeed from './src/features/feed/EmptyFeed';
import Toast from './src/features/feed/Toast';
import VoiceComposer, { useComposerTop } from './src/features/composer/VoiceComposer';
import NewsListSheet from './src/features/news/NewsListSheet';
import { NEWS } from './src/data/stories';
import { storyFromQuestion, newsFromQuestion, labelFromQuestion } from './src/data/askToNews';
import { askQuestion, subscribeRequest, beatsToStories, backendConfigured, fetchLibrary, fromJob } from './src/data/pipeline';
import { STARTER_JOBS, STARTER_MEDIA } from './src/data/starter';

// Swap the stories that belong to one asked question (the placeholder, or the
// beats that replaced it) for `next`, keeping their place in the bar.
function replaceAsked(stories, match, next) {
  const first = stories.findIndex(match);
  if (first === -1) return stories;
  const rest = stories.filter((s, i) => i < first || !match(s));
  return [...rest.slice(0, first), ...next, ...rest.slice(first)];
}

// Fold server jobs ({ request, beats }) into the news list: a job on an
// existing news item joins its story bar, anything else becomes a new pill.
// Jobs already present (same request id) are skipped, so the bundled starter
// briefings and the live library never double up. Returns what to resume.
function mergeLibrary(prev, items) {
  let next = prev;
  const resume = [];
  for (const { request, beats } of items) {
    const newsId = request.newsId;
    if (next.some((n) => n.stories.some((st) => st.requestId === request.id))) continue;
    const createdAt = Date.parse(request.createdAt) || Date.now();
    const placeholder = {
      id: `ask-${request.id}`,
      requestId: request.id,
      asked: true,
      headline: request.prompt,
      status: 'generating',
      stage: request.status,
      createdAt,
    };
    const stories = beats.length ? beatsToStories(request, beats) : [placeholder];
    if (next.some((n) => n.id === newsId)) {
      next = next.map((n) => (n.id === newsId ? { ...n, stories: [...n.stories, ...stories] } : n));
    } else {
      next = [
        ...next,
        {
          id: newsId,
          label: request.insights?.label || labelFromQuestion(request.prompt),
          origin: 'created',
          illustration: null,
          createdAt,
          stories,
        },
      ];
    }
    if (request.status !== 'ready') {
      resume.push({ requestId: request.id, newsId, placeholder, relabel: request.mode === 'new' });
    }
  }
  return { next, resume };
}

// Briefings bundled with the app (scripts/make-starter.mjs): a fresh install
// opens on real stories, playable with no server.
const STARTER_NEWS = mergeLibrary(
  NEWS,
  STARTER_JOBS.map((job) => fromJob(job, (p) => STARTER_MEDIA[p] ?? null))
).next.map((n) => ({ ...n, featured: true }));

function Shell() {
  const [news, setNews] = useState(STARTER_NEWS);
  const newsRef = useRef(news);
  newsRef.current = news;
  const [toast, setToast] = useState(null);
  const composerTop = useComposerTop();
  // What's on screen right now — a question asked is about this story, and
  // lands on this news item.
  const onScreen = useRef({ story: null, newsId: null });
  const [selectedNewsId, setSelectedNewsId] = useState(STARTER_NEWS[0]?.id ?? null);
  // False until the server's library has been asked for (or there's no server).
  const [libraryLoaded, setLibraryLoaded] = useState(!backendConfigured);
  const onActiveStory = useCallback((story, newsId) => {
    onScreen.current = { story, newsId };
    setSelectedNewsId(newsId);
  }, []);

  const feed = useRef(null);
  const composer = useRef(null);
  const [listOpen, setListOpen] = useState(false);

  // The rail's + puts the next submission in "new news" mode: it creates its
  // own pill instead of adding to the news on screen. Dismissing the field
  // without sending drops the mode.
  const createMode = useRef(false);
  const onCreate = useCallback(() => {
    createMode.current = true;
    composer.current?.openCreate();
  }, []);
  // The empty feed's "Type instead": same new-news mode, keyboard first.
  const onCreateTyping = useCallback(() => {
    createMode.current = true;
    composer.current?.openKeyboard('What news should we explain?');
  }, []);
  const onKeyboardClose = useCallback(() => {
    createMode.current = false;
  }, []);

  const showToast = useCallback((message) => setToast(message), []);
  const hideToast = useCallback(() => setToast(null), []);

  const subscriptions = useRef([]);
  useEffect(() => () => subscriptions.current.forEach((off) => off()), []);

  const updateAsked = useCallback((newsId, match, next) => {
    setNews((prev) =>
      prev.map((n) => (n.id === newsId ? { ...n, stories: replaceAsked(n.stories, match, next(n.stories.filter(match))) } : n))
    );
  }, []);

  // Follow a request as the pipeline works on it: stage labels while it
  // researches and scripts, then it splits into one segment per beat, each
  // filling in as its video lands. `relabel` lets a brand-new news item take
  // the pipeline's two-word name once insights arrive.
  const follow = useCallback(
    ({ requestId, newsId, placeholder, relabel }) => {
      const mine = (s) => s.id === placeholder.id || s.requestId === requestId;
      const off = subscribeRequest(requestId, ({ request, beats }) => {
        const label = relabel && request.insights?.label;
        if (label) setNews((prev) => prev.map((n) => (n.id === newsId && n.label !== label ? { ...n, label } : n)));
        if (beats.length) {
          updateAsked(newsId, mine, () => beatsToStories(request, beats));
        } else if (request.status === 'no_new') {
          // The research gate found nothing new worth a video.
          updateAsked(newsId, mine, () => [
            { ...placeholder, requestId, status: 'no_new', message: request.message, suggestions: request.suggestions ?? [] },
          ]);
        } else {
          const failed = request.status === 'failed';
          updateAsked(newsId, mine, () => [
            {
              ...placeholder,
              requestId,
              stage: request.status,
              trace: request.trace ?? null,
              status: failed ? 'failed' : 'generating',
              error: request.error,
            },
          ]);
        }
      });
      subscriptions.current.push(off);
    },
    [updateAsked]
  );

  // Start a new request for a placeholder story, then follow it.
  const runPipeline = useCallback(
    async ({ text, newsId, placeholder, aboutStory, relabel, mode = 'append' }) => {
      if (!backendConfigured || !newsId) return;
      const isPlaceholder = (s) => s.id === placeholder.id;
      try {
        const requestId = await askQuestion({ prompt: text, newsId, aboutStory, mode });
        updateAsked(newsId, isPlaceholder, () => [{ ...placeholder, requestId, stage: 'queued' }]);
        follow({ requestId, newsId, placeholder, relabel });
      } catch (e) {
        updateAsked(newsId, isPlaceholder, () => [{ ...placeholder, status: 'failed', error: e.message }]);
      }
    },
    [updateAsked, follow]
  );

  // On launch, load every story created so far: new news items become their
  // own pills (at the end, in creation order); questions asked on existing
  // news are appended to it. Anything still being made resumes live.
  useEffect(() => {
    if (!backendConfigured) return;
    let cancelled = false;
    fetchLibrary()
      .then((items) => {
        if (cancelled || !items.length) return;
        // What to resume is decided against the list as it is now; the state
        // update itself merges into whatever the list is when it applies.
        const { resume } = mergeLibrary(newsRef.current, items);
        setNews((prev) => mergeLibrary(prev, items).next);
        resume.forEach(follow);
      })
      .catch(() => {
        // Server not running — the app still works with what it ships with.
      })
      .finally(() => {
        if (!cancelled) setLibraryLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [follow]);

  // "No new info" card → tapping a suggested topic starts it as new news.
  const onSuggest = useCallback((topic) => {
    createMode.current = true;
    onAskRef.current?.(topic);
  }, []);
  const onAskRef = useRef(null);

  // A question becomes a new, researching story at the end of the current
  // news item's story bar — or, from the +, a whole new news item. The new
  // segment (or pill) is the confirmation; no toast.
  const onAsk = useCallback(
    (text) => {
      // No pipeline server configured (e.g. the hosted web demo): say so,
      // instead of adding a pill that would sit on "Researching…" forever.
      if (!backendConfigured) {
        createMode.current = false;
        showToast('Genie needs its briefing server to make new stories. See the README to run it.');
        return;
      }
      // With no news on screen, any question starts a new news item.
      if (createMode.current || !onScreen.current.newsId) {
        createMode.current = false;
        const item = newsFromQuestion(text);
        setNews((prev) => [...prev, item]);
        // Select once it's in state (next frame).
        requestAnimationFrame(() => feed.current?.select(item.id));
        runPipeline({ text, newsId: item.id, placeholder: item.stories[0], relabel: true, mode: 'new' });
        return;
      }
      const { story, newsId } = onScreen.current;
      const placeholder = storyFromQuestion(text, { aboutStory: story?.headline });
      setNews((prev) => prev.map((n) => (n.id === newsId ? { ...n, stories: [...n.stories, placeholder] } : n)));
      runPipeline({ text, newsId, placeholder, aboutStory: story?.headline });
    },
    [runPipeline, showToast]
  );
  onAskRef.current = onAsk;

  return (
    <SafeScreen backgroundColor={Colors.surface.page}>
      {news.length ? (
        <FeedScreen ref={feed} news={news} onActiveStory={onActiveStory} onCreate={onCreate} onSuggest={onSuggest} />
      ) : (
        <EmptyFeed
          loading={!libraryLoaded}
          connected={backendConfigured}
          onVoice={onCreate}
          onType={onCreateTyping}
          onTopic={onSuggest}
        />
      )}
      <Toast message={toast} onHide={hideToast} bottom={composerTop + Space[12]} />
      <VoiceComposer
        ref={composer}
        onSubmit={onAsk}
        onList={() => setListOpen(true)}
        onKeyboardClose={onKeyboardClose}
        idleHidden={!news.length}
      />
      <NewsListSheet
        visible={listOpen}
        onCreate={() => {
          setListOpen(false);
          onCreate();
        }}
        news={news}
        selectedId={selectedNewsId}
        onSelect={(id) => feed.current?.select(id)}
        onClose={() => setListOpen(false)}
      />
    </SafeScreen>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts(FontAssets);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {/* On desktop web, present the app in a phone-width column. */}
      <View style={styles.stage}>
        <View style={styles.device}>{fontsLoaded ? <Shell /> : null}</View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? Colors.surface.soft : Colors.surface.page,
    alignItems: 'center',
  },
  device: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 430 : undefined,
    backgroundColor: Colors.surface.page,
    overflow: 'hidden',
  },
});
