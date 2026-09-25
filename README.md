<p align="center">
  <img src="assets/splash-icon.png" width="96" alt="Genie" />
</p>

<h1 align="center">Genie</h1>

<p align="center">Visual news briefings you can talk to.</p>

---

Genie turns the news into short, swipeable visual briefings. Each news item is
a stack of cards — real footage, photos, key numbers and short AI-generated
clips — that plays through on its own. Ask a follow-up by voice and Genie
researches it and adds the answer to the story; tap **+** and say a topic to
get a whole new briefing.

It is not a reel generator. Every briefing starts from research: Genie checks
there's actually something new, pulls facts and numbers it can trace to a
source, looks for existing official media first, and only generates video
where nothing real can show the point.

## Features

- **Swipe the news** — left/right between news items, up/down through a
  story's cards, with a progress bar per story and hands-free auto-advance.
- **Mixed-media cards** — opener, embedded official video (YouTube, attributed),
  photo, key-number and AI video cards, each chosen for what explains best.
- **Ask by voice** — live transcription while you talk; a question on a story
  adds 2–3 answer cards to it, the **+** builds a full 6–8 card briefing.
- **Grounded research** — facts and numbers without a real source are dropped
  in code, and media is verified before it's used.
- **News list** — every briefing, grouped by day.

## How a briefing is made

```
question ─► intent ─► gate ─► research ─► information graph ─► media discovery ─► storyboard ─► cards
                        │                  (facts, numbers,     (existing video >    (creation rules)
                        └─ "nothing new"    sources, checked)    image > graphic)         │
                                                                                    AI video only
                                                                                    where needed (fal)
```

The pipeline runs on a small local Node server (`server/`); the app polls it
for progress. All model calls go through [fal](https://fal.ai): an LLM with web
search for research and storyboarding, ElevenLabs for narration, Veo for video.

## Tech

Expo SDK 57 · React Native 0.86 · expo-video · expo-speech-recognition ·
react-native-webview · Lottie · Node (pipeline server) · fal.

## Running it

**Requirements:** Node 20+, a [fal](https://fal.ai) API key, and for voice on a
phone, a development build (the native speech module isn't in Expo Go).

```bash
npm install
cp .env.example .env     # then fill in FAL_KEY, PIPELINE_TOKEN and the app → server values
```

Start the pipeline server and the app in two terminals:

```bash
npm run pipeline
```

```bash
npx expo start
```

Press `w` for web, or scan the QR code with a development build on your phone
(same Wi-Fi as your Mac). The server prints the LAN address to put in
`EXPO_PUBLIC_PIPELINE_URL`.

**Costs:** research is roughly $0.60 per question; each generated video card
adds about $0.40. `MAX_VIDEO_REQUESTS_PER_DAY` caps generation.

## Project layout

```
App.js                 app shell: news state, pipeline wiring
src/features/feed/     rail, cards, story bar, players, end card
src/features/composer/ voice bar, voice overlay, speech engines
src/features/news/     news list
src/data/              seed news, pipeline client
brand/, components/    design tokens and shared components
server/                local pipeline server + research / media / generation
sandbox/               CLI runs of the pipeline for inspection
supabase/              schema + edge functions (future hosted backend)
```

## Security

`FAL_KEY` lives only in `.env` and is read by the server — it never reaches the
app. Anything prefixed `EXPO_PUBLIC_` is bundled into the app: the pipeline
token (which only gates your own local server) and, if you set it, the
optional OpenAI key for voice in Expo Go. Don't ship a public build with that
key set.

## Content

No news or video ships with the app. On first launch the feed is empty; every
briefing is made by the pipeline. Embedded videos are played through
YouTube's player and credited; photos are shown from their publishers. The
Maison Neue font files are included for this prototype only — check the
licence before distributing a build.
