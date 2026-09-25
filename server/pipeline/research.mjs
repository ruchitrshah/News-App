// STORY INTELLIGENCE SANDBOX — the brain between a query and the UI.
//
//   Never generate media until the system has determined what the user needs
//   to understand and whether the internet already contains a better way to
//   show it.
//
//   1. checking    Story Intent (what is being asked, type, window) → scout
//                  (live web) → gate: ready | no_new_information | insufficient_evidence
//   2. researching triangulated research (primary + independent + context),
//                  then an information graph: key facts scored for importance,
//                  novelty, confidence; numbers as value+unit+time+comparison+
//                  source; uncertainties. Grounded in code: every fact/number
//                  must trace to a retrieved URL, and a number's digits must
//                  appear in the research.
//   3. media       Media Discovery (discover.mjs): existing video > image >
//                  graphic, all verified before use
//   4. planning    Storyboard — 6–8 cards for a new news item (+), 2–3 for a
//                  follow-up question (mic) — under the creation rules:
//                  card 1 is a text thesis (never a video); after it and any
//                  existing official video, ≥ 60% of cards are generated
//                  video, the rest image / number / text; copy always sits
//                  in the bottom third, the top is imagery only
//
// onStage(stage, info) reports progress for the app.
// `parent` (optional) is a previous Story Intelligence object for the same
// news item — follow-ups extend it instead of starting from scratch.
import { llm, llmJson } from './llm.mjs';
import { discoverMedia } from './discover.mjs';

const today = () => new Date().toISOString().slice(0, 10);
const digits = (s) => String(s || '').replace(/[^0-9.]/g, '').replace(/^\.+|\.+$/g, '');
const cleanUrl = (u) => String(u || '').replace(/[.,;)\]]+$/, '');
const urlsIn = (text) => new Set((String(text).match(/https?:\/\/[^\s)\]>"']+/g) || []).map(cleanUrl));

const SOURCE_PRIORITIES = {
  ai_tech: 'official company announcements, product docs, official demos, reputable technology journalism',
  product_launch: 'official company announcements, product pages, official demos, reputable technology journalism',
  market: 'official filings, government data, central banks, exchanges, reputable financial journalism',
  weather: 'official weather agencies, local authorities, reputable meteorological sources',
  political: 'government sources, official statements, reputable international journalism, multiple independent reports',
  breaking: 'primary sources, official statements, reputable news organizations',
  location: 'local authorities, local news organizations, official sources',
  general: 'reputable news organizations, primary sources, official documents',
};

const FOCUS = {
  breaking: 'what happened, when, who, immediate consequence, verified source',
  product_launch: "what's new, what changed, key capabilities, before vs after, official demo, implications",
  market: 'movement and magnitude, previous level, cause, affected assets, historical comparison',
  weather: 'location, current conditions, forecast, timing, severity, affected areas, official warnings',
  location: 'what is happening, where, when, practical impact, local sources',
  ai_tech: 'capability, benchmark, product change, availability, demonstration, comparison with previous generation, practical implication',
  political: 'documented action, official statements, timeline, concrete change, affected parties, disagreement where it exists',
  general: 'what changed, by how much, compared with what, who is affected, what happens next',
};

// Every text / number card sits on a real image. Cards whose own media isn't
// an image borrow one from the verified pool: images first (those not already
// shown on an image card), then YouTube thumbnails — rotated so neighbouring
// cards don't repeat.
function assignBackdrops(cards, candidates) {
  const shown = new Set(cards.filter((c) => c.media?.type === 'image').map((c) => c.media.url));
  const images = candidates.filter((m) => m.type === 'image');
  const pool = [
    ...images.filter((m) => !shown.has(m.url)),
    ...images.filter((m) => shown.has(m.url)),
    ...candidates.filter((m) => m.type === 'external_video' && m.thumbnail).map((m) => ({ url: m.thumbnail, source: m.source })),
  ].map((m) => ({ url: m.url, source: m.source }));
  if (!pool.length) return;
  let i = 0;
  for (const c of cards) {
    if (c.format !== 'text' && c.format !== 'graphic') continue;
    if (c.media?.type === 'image') continue;
    c.backdrop = pool[i++ % pool.length];
  }
}

// How many cards a briefing gets. A brand-new news item (the + button) is a
// full briefing; a question on an existing one (the mic) only adds the answer.
const SIZE = { new: [6, 8], append: [2, 3] };

export async function buildStory({ topic, aboutStory = null, parent = null, mode = 'new', days = 7, onStage = () => {} }) {
  const [minCards, maxCards] = SIZE[mode] ?? SIZE.new;
  const followUp = mode === 'append';
  const TODAY = today();
  const trace = { topic, aboutStory, today: TODAY, window_days: days, cost: 0 };
  const add = (r) => (trace.cost += r?.cost || 0);
  const known = parent
    ? `\nAlready covered for this news item (do not repeat; build on it):\n${parent.story?.title ?? ''}\n${(parent.key_facts || []).map((f) => `- ${f.fact}`).join('\n')}`
    : '';
  const watching = aboutStory ? `\nThe user asked this while watching: "${aboutStory}".` : '';

  // ── 1. Intent → scout → gate ───────────────────────────────────────────────
  onStage('checking');
  const intent = await llmJson({
    system: `Normalize a news query into a Story Intent. Today is ${TODAY}. story_type is one of breaking|product_launch|market|weather|location|ai_tech|political|general. Schema: {"topic":string,"intent":"latest_updates"|"explanation"|"what_changed"|"why_it_matters"|"historical_context"|"follow_up","time_sensitivity":"high"|"medium"|"low","domain":string,"story_type":string,"entities":[string],"user_question":string,"window_days":number (how far back "new" should reach for this query; ${days} by default)}`,
    prompt: `Query: ${topic}${watching}${parent ? `\nThis is a follow-up to: ${parent.story?.title}` : ''}`,
    validate: (o) => (!o.topic ? 'topic required' : null),
    maxTokens: 500,
  });
  add(intent);
  const I = { ...intent.json, story_type: FOCUS[intent.json.story_type] ? intent.json.story_type : 'general' };
  const windowDays = Math.max(1, Math.min(60, Number(I.window_days) || days));
  trace.intent = I;

  // The gate trusts only what's sourced, so the scout must cite. If a run
  // comes back without links, retry once with a harder instruction.
  const scoutSystem = `You are the pre-check agent for a visual news briefing app. Today is ${TODAY}. Use web search to find whether there is genuinely NEW, meaningful information about the query within the last ${windowDays} days: new figures, releases, decisions, launches, policy changes, events. Report what you found as short bullet points, each with its date and the full source URL in parentheses. If coverage is stale or only rehashes known facts, say so plainly. Never answer from memory.`;
  const scoutPrompt = `Query: ${I.user_question || topic}\nEntities: ${(I.entities || []).join(', ')}${watching}${known}`;
  let scout = await llm({ web: true, system: scoutSystem, prompt: scoutPrompt, maxTokens: 1500 });
  add(scout);
  if (urlsIn(scout.text).size < 2) {
    scout = await llm({
      web: true,
      system: `${scoutSystem}\nEVERY bullet MUST end with the full https:// URL of the article it came from. List at least 4 distinct sources.`,
      prompt: scoutPrompt,
      maxTokens: 1500,
    });
    add(scout);
  }

  const gate = await llmJson({
    system: `Decide whether there is enough NEW, meaningful, well-sourced information (within ${windowDays} days of ${TODAY}) to build a useful briefing. Be strict. "no_new_information": nothing meaningful changed or it's stale. "insufficient_evidence": something may be happening but sources are too weak or vague. Schema: {"status":"ready"|"no_new_information"|"insufficient_evidence","what_changed":string,"freshest_update":string,"reason":string,"suggestions":[3 related topics (2-4 words) that DO have fresh news]}`,
    prompt: `Query: ${topic}${watching}${known}\n\nPre-check notes:\n${scout.text}`,
    validate: (o) => (!['ready', 'no_new_information', 'insufficient_evidence'].includes(o.status) ? 'bad status' : null),
    maxTokens: 600,
  });
  add(gate);
  trace.gate = gate.json;
  if (gate.json.status !== 'ready') {
    return {
      ...trace,
      status: gate.json.status,
      message:
        gate.json.status === 'insufficient_evidence'
          ? `There isn't enough solid evidence on ${topic} yet — try another topic.`
          : `There isn't enough new or meaningful information on ${topic} right now — try another topic.`,
      suggestions: gate.json.suggestions ?? [],
    };
  }

  // ── 2. Triangulated research → information graph ──────────────────────────
  onStage('researching', { what_changed: gate.json.what_changed });
  const research = await llm({
    web: true,
    system: `You are the story intelligence agent. Today is ${TODAY}. Investigate before anything is written. For a ${I.story_type} story, focus on: ${FOCUS[I.story_type]}. Prefer sources in this order: ${SOURCE_PRIORITIES[I.story_type]}. For every major claim try to establish PRIMARY SOURCE + INDEPENDENT REPORTING + CONTEXT; say where sources disagree. Every number must keep value, unit, time and what it's compared with — never manufacture a comparison. After EVERY figure and claim, put its source URL in parentheses. Skip generic background and marketing language. Never answer from memory.`,
    prompt: `Question: ${I.user_question || topic}\nWhat changed: ${gate.json.what_changed}\nNewest update: ${gate.json.freshest_update}${watching}${known}`,
    maxTokens: 3000,
  });
  add(research);
  const corpus = `${scout.text}\n${research.text}`;
  const retrieved = urlsIn(corpus);
  const flat = corpus.replace(/,/g, '');
  trace.sources = [...retrieved];

  const graph = await llmJson({
    system: `Build the information graph for a visual briefing from the research. Optimize for INFORMATION VALUE: prefer what changed, by how much, compared with what, when, who is affected, what happens next. At most 10 key facts and 8 numbers; one short sentence each. Cite URLs that appear in the research, copied exactly. Schema: {"story":{"title":string,"summary":string,"what_changed":string,"why_it_matters":string},"label":string (two words naming the topic),"importance":{"score":1-10,"reasons":[string]},"key_facts":[{"fact":string,"importance":1-5,"novelty":1-5,"confidence":1-5,"source_urls":[string]}],"numbers":[{"value":string (exactly as reported),"unit":string,"time":string,"comparison":string (vs what, or ""),"label":string (what it measures, 2-5 words),"source_url":string}],"uncertainties":[string]}`,
    prompt: `Question: ${I.user_question || topic}\n\nResearch:\n${research.text}\n\nPre-check notes:\n${scout.text}`,
    validate: (o) => (!o.story || !Array.isArray(o.key_facts) || !Array.isArray(o.numbers) ? 'story, key_facts and numbers required' : null),
    maxTokens: 6000,
  });
  add(graph);

  const G = graph.json;
  const key_facts = G.key_facts
    .map((f) => ({ ...f, source_urls: (f.source_urls || []).map(cleanUrl).filter((u) => retrieved.has(u)) }))
    .filter((f) => f.source_urls.length && Number(f.confidence) >= 3)
    .sort((a, b) => b.importance * 2 + b.novelty - (a.importance * 2 + a.novelty));
  const numbers = G.numbers
    .map((n) => ({ ...n, source_url: cleanUrl(n.source_url) }))
    .filter((n) => retrieved.has(n.source_url) && digits(n.value) && flat.includes(digits(n.value)));
  trace.dropped = {
    facts: G.key_facts.length - key_facts.length,
    numbers: G.numbers.length - numbers.length,
  };
  if (key_facts.length < 2) {
    return {
      ...trace,
      status: 'insufficient_evidence',
      message: `There isn't enough verified information on ${topic} yet — try another topic.`,
      suggestions: gate.json.suggestions ?? [],
    };
  }
  const intelligence = { story: G.story, label: G.label, importance: G.importance, key_facts, numbers, uncertainties: G.uncertainties ?? [], sources: [...retrieved] };

  // ── 3. Media discovery ─────────────────────────────────────────────────────
  onStage('media', { sources: [...retrieved], facts_kept: key_facts.length, facts_dropped: trace.dropped.facts });
  const media = await discoverMedia({ intent: I, story: G.story, facts: key_facts.slice(0, 6), sourceUrls: [...retrieved] });
  add(media);

  // ── 4. Storyboard ──────────────────────────────────────────────────────────
  onStage('planning', { media: media.candidates.length });
  const mediaList = media.candidates
    .map((m) => `${m.id} · ${m.type}${m.provider ? `/${m.provider}` : ''} · ${m.source}${m.title ? ` · "${m.title}"` : ''}${m.start_time != null ? ` · ${m.start_time}s–${m.end_time ?? '?'}s` : ''}${m.fact ? ` · shows: ${m.fact}` : ''}`)
    .join('\n');
  const factList = key_facts.map((f, i) => `F${i} ${f.fact} (importance ${f.importance}, novelty ${f.novelty})`).join('\n');
  const numberList = numbers.map((n, i) => `N${i} ${n.label}: ${n.value} ${n.unit} · ${n.time}${n.comparison ? ` · vs ${n.comparison}` : ''}`).join('\n');

  const board = await llmJson({
    system: `You are the storyboard agent of a visual news briefing (not a reel generator). Make ${minCards}–${maxCards} cards; each must earn its place.${followUp ? ' This is a FOLLOW-UP question on a news item the viewer is already watching: answer only what was asked, add what is new, never re-explain the story.' : ''}
CREATION RULES (hard):
1. Card 1 is ${followUp ? 'the direct ANSWER to the question' : 'a THESIS: what happened + what changed + why it matters'}, in format "text" (use an image media_id as its backdrop if a good one exists). Never a video.
2. Motion first: use an existing official external_video where one shows the fact (at most 1–2). Of the REMAINING cards (everything except card 1 and external_video cards), AT LEAST 60% must be generated_video — our own vertical clips that visualise the fact (the product in use, the process, the comparison, the timeline). The rest may be image, graphic (one number from the numbers list) or text.
3. Layout: every card is a visual on top with the words at the bottom. The top of the frame is for imagery only, so keep copy short enough to sit in the bottom third: headline ≤ 8 words, caption ≤ 22 words (≤ 18 for generated_video — it is narrated). For generated_video, the visual_prompt must keep the lower third calm/uncluttered (the caption sits there) and never include on-screen text.
4. Every generated_video needs a concrete generation_reason saying what it shows that no existing media does.
Captions must add information (what/how much/compared with what/why/who/what next) — never filler like "here's what you need to know". Never invent facts or numbers; use only the facts/numbers given.
Schema: {"label":string (two words),"headline":string (<90 chars),"cards":[{"sequence":number,"purpose":"what_happened"|"what_changed"|"key_evidence"|"why_it_matters"|"context"|"what_next","format":"text"|"image"|"graphic"|"external_video"|"generated_video","headline":string (≤8 words, the card's big line),"caption":string,"media_id":string|null,"number_index":number|null,"fact_indexes":[number],"visual_prompt":string|null (generated_video only: vertical 9:16 shot, no on-screen text, logos or real people's likenesses),"generation_reason":string|null}]}`,
    prompt: `Story: ${G.story.title}\nWhat changed: ${G.story.what_changed}\nWhy it matters: ${G.story.why_it_matters}\nType: ${I.story_type}\n\nFacts:\n${factList}\n\nNumbers:\n${numberList || '(none)'}\n\nVerified media:\n${mediaList || '(none found)'}`,
    validate: (o) => {
      const cards = o.cards || [];
      if (cards.length < minCards || cards.length > maxCards) return `need ${minCards}–${maxCards} cards, got ${cards.length}`;
      if (cards[0].format === 'generated_video' || cards[0].format === 'external_video') return 'card 1 must be a text/image thesis';
      const ids = new Map(media.candidates.map((m) => [m.id, m.type]));
      for (const c of cards) {
        if ((c.format === 'external_video' || c.format === 'image') && ids.get(c.media_id) !== c.format) return `card ${c.sequence}: ${c.format} needs a matching media_id`;
        if (c.format === 'graphic' && !numbers[c.number_index]) return `card ${c.sequence}: graphic needs a valid number_index`;
        if (c.format === 'generated_video' && (!c.visual_prompt || !c.generation_reason)) return `card ${c.sequence}: generated_video needs visual_prompt and generation_reason`;
      }
      // Rule 2: ≥60% of the cards after the thesis (excluding existing videos) are generated.
      const rest = cards.slice(1).filter((c) => c.format !== 'external_video');
      const need = Math.ceil(rest.length * 0.6);
      const made = rest.filter((c) => c.format === 'generated_video').length;
      if (made < need) return `rule 2: ${made} of ${rest.length} remaining cards are generated_video; need at least ${need}`;
      return null;
    },
    maxTokens: 4000,
  });
  add(board);

  const byId = new Map(media.candidates.map((m) => [m.id, m]));
  const cards = board.json.cards.map((c, idx) => ({
    idx,
    sequence: c.sequence ?? idx + 1,
    purpose: c.purpose,
    format: c.format,
    headline: c.headline,
    caption: c.caption,
    media: c.media_id ? byId.get(c.media_id) ?? null : null,
    number: c.format === 'graphic' ? numbers[c.number_index] : null,
    facts: (c.fact_indexes || []).map((i) => key_facts[i]?.fact).filter(Boolean),
    sources: [...new Set((c.fact_indexes || []).flatMap((i) => key_facts[i]?.source_urls ?? []))],
    visual_prompt: c.format === 'generated_video' ? c.visual_prompt : null,
    generation_reason: c.format === 'generated_video' ? c.generation_reason : null,
  }));
  assignBackdrops(cards, media.candidates);
  const generation = cards.filter((c) => c.format === 'generated_video');

  return {
    ...trace,
    status: 'ready',
    label: board.json.label || G.label,
    headline: board.json.headline || G.story.title,
    intelligence,
    media_candidates: media.candidates,
    cards,
    generation_required: generation.length > 0,
    generation_reason: generation.map((c) => c.generation_reason).join(' · '),
  };
}
