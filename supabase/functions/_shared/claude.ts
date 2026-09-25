// Claude calls for the three thinking stages: research (web search + fetch),
// insights and script (structured JSON output).
import Anthropic from "npm:@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const MODEL = Deno.env.get("CLAUDE_MODEL") ?? "claude-opus-5";

// Server-side refusal fallbacks: if the model declines, the API re-runs the
// request on a fallback model inside the same call.
const FALLBACKS = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } as const;

type Block = { type: string; [k: string]: unknown };

function textOf(content: Block[]) {
  return content.filter((b) => b.type === "text").map((b) => b.text as string).join("\n").trim();
}

function assertUsable(resp: { stop_reason: string | null; stop_details?: unknown }) {
  if (resp.stop_reason === "refusal") throw new Error("The model declined this request.");
  if (resp.stop_reason === "max_tokens") throw new Error("The response was cut off (max_tokens).");
}

export type Source = { url: string; title?: string; snippet?: string; published_at?: string };

// ── Stage 1: research ────────────────────────────────────────────────────────
export async function research(prompt: string, aboutStory: string | null) {
  const user = [
    `A reader of a short-form video news app asked: "${prompt}"`,
    aboutStory ? `They asked while watching an explainer titled: "${aboutStory}".` : "",
    "",
    "Search the web for the most important, most recent, well-sourced facts needed to answer this for a general audience.",
    "Prefer primary sources and reputable outlets. Note dates. Flag anything uncertain or disputed.",
    "Finish with a plain-text research brief: the key facts (with numbers and dates), the context, why it matters, and open questions.",
  ].filter(Boolean).join("\n");

  const tools = [
    { type: "web_search_20260209", name: "web_search", max_uses: 8 },
    { type: "web_fetch_20260209", name: "web_fetch", max_uses: 6 },
  ];

  // Server tools run a sampling loop on Anthropic's side; if it hits its
  // iteration limit the turn pauses. Resume by re-sending the turn so far.
  const assistant: Block[] = [];
  let resp: any;
  for (let i = 0; i < 5; i++) {
    const messages: any[] = [{ role: "user", content: user }];
    if (assistant.length) messages.push({ role: "assistant", content: assistant });
    resp = await client.beta.messages
      .stream({
        model: MODEL,
        max_tokens: 32000,
        thinking: { type: "adaptive" },
        output_config: { effort: "medium" },
        tools,
        messages,
        ...FALLBACKS,
      } as any)
      .finalMessage();
    assistant.push(...(resp.content as Block[]));
    if (resp.stop_reason !== "pause_turn") break;
  }
  assertUsable(resp);

  const sources: Source[] = [];
  const seen = new Set<string>();
  for (const block of assistant) {
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const r of block.content as any[]) {
        if (r.type === "web_search_result" && r.url && !seen.has(r.url)) {
          seen.add(r.url);
          sources.push({ url: r.url, title: r.title, published_at: r.page_age });
        }
      }
    }
    // A tool error comes back as HTTP 200 with an error object, not a list.
    if (block.type === "web_fetch_tool_result") {
      const c = block.content as any;
      if (c?.type === "web_fetch_result" && c.url && !seen.has(c.url)) {
        seen.add(c.url);
        sources.push({ url: c.url, title: c.content?.title });
      }
    }
  }

  const brief = textOf(assistant);
  if (!brief) throw new Error("Research returned no findings.");
  return { brief, sources: sources.slice(0, 20) };
}

// ── Structured-output helper ─────────────────────────────────────────────────
async function structured<T>(system: string, user: string, schema: Record<string, unknown>): Promise<T> {
  const resp: any = await client.beta.messages
    .stream({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: { type: "json_schema", schema } },
      system,
      messages: [{ role: "user", content: user }],
      ...FALLBACKS,
    } as any)
    .finalMessage();
  assertUsable(resp);
  return JSON.parse(textOf(resp.content)) as T;
}

// ── Stage 2: insights ────────────────────────────────────────────────────────
export type Insights = {
  headline: string;
  label: string;
  key_facts: string[];
  why_it_matters: string;
  uncertainties: string[];
};

const INSIGHTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "label", "key_facts", "why_it_matters", "uncertainties"],
  properties: {
    headline: { type: "string", description: "A news headline, under 90 characters." },
    label: { type: "string", description: "Two words naming the topic, e.g. 'Fed rates'." },
    key_facts: { type: "array", items: { type: "string" }, description: "5-10 concrete facts with numbers/dates." },
    why_it_matters: { type: "string" },
    uncertainties: { type: "array", items: { type: "string" } },
  },
};

export function insights(prompt: string, brief: string) {
  return structured<Insights>(
    "You distill research into the insights a short explainer video needs. Only use facts present in the research. Be concrete.",
    `Question: ${prompt}\n\nResearch brief:\n${brief}`,
    INSIGHTS_SCHEMA,
  );
}

// ── Stage 3: script ──────────────────────────────────────────────────────────
export type Beat = { headline: string; narration: string; visual_prompt: string; duration_s: number };

const SCRIPT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["beats"],
  properties: {
    beats: {
      type: "array",
      description: "7 or 8 beats, in order. Each becomes one 7-8 second vertical video.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["headline", "narration", "visual_prompt", "duration_s"],
        properties: {
          headline: { type: "string", description: "3-6 word title for this beat." },
          narration: { type: "string", description: "What the narrator says; at most 22 words (~7 seconds)." },
          visual_prompt: {
            type: "string",
            description:
              "A shot description for a text-to-video model: subject, setting, camera move, mood. Vertical 9:16. No on-screen text, logos or real people's likenesses.",
          },
          duration_s: { type: "integer", enum: [7, 8] },
        },
      },
    },
  },
};

export async function script(prompt: string, found: Insights) {
  const out = await structured<{ beats: Beat[] }>(
    "You write scripts for vertical news explainer videos. Beat 1 hooks with what happened; the middle explains the mechanism and context; the last beat says why it matters to the viewer. Plain language, no jargon without a gloss.",
    `Question: ${prompt}\n\nInsights:\n${JSON.stringify(found, null, 2)}\n\nWrite exactly 7 or 8 beats.`,
    SCRIPT_SCHEMA,
  );
  const beats = (out.beats ?? []).filter((b) => b.narration && b.visual_prompt).slice(0, 8);
  if (beats.length < 7) throw new Error(`Script had ${beats.length} beats; need 7–8.`);
  return beats;
}
