// A question asked through the voice bar becomes a new story on the news
// you're watching: a segment added to the end of that news item's story bar,
// researching until it's ready.
//
// Today the story is created locally in the 'generating' state. Later, the
// question (plus the story it was asked on) goes to the pipeline, which
// researches it and replaces this entry with a finished explainer — the bar
// and card already render that shape.

export function storyFromQuestion(question, { aboutStory } = {}) {
  const now = Date.now();
  return {
    id: `ask-${now}`,
    headline: question,
    status: 'generating',
    asked: true,
    createdAt: now,
    aboutStory: aboutStory ?? null,
  };
}

// ── New news (the rail's +) ──────────────────────────────────────────────────
// A prompt from the + starts a brand-new news item: its own pill, holding one
// researching story. The pipeline's insights later supply a proper two-word
// label; until then we pick two content words from the prompt.

const STOP = new Set(
  (
    'a an and are as at be but by can could did do does for from had has have hey hi how i if in is it its ' +
    'just know like me my now of on or please right so sure tell that the them then there these they this to ' +
    'us was we what whats when where which who why will with would you your about any explain latest news ' +
    'going gonna get give mean means okay ok really should some thing things happening happened'
  ).split(' ')
);

const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);

export function labelFromQuestion(question) {
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9$%&\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
  if (!words.length) return 'New news';
  return [cap(words[0]), words[1]].filter(Boolean).join(' ');
}

export function newsFromQuestion(question) {
  const now = Date.now();
  return {
    id: `news-${now}`,
    label: labelFromQuestion(question),
    origin: 'created',
    illustration: null,
    createdAt: now,
    stories: [storyFromQuestion(question)],
  };
}
