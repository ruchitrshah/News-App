// Language-model calls for the research agents — through fal's OpenRouter
// endpoint, so the whole pipeline runs on the one FAL_KEY (no other keys).
// `web: true` turns on OpenRouter's server-side web search; the model then
// answers from live results and cites URLs inline.
import { fal } from '@fal-ai/client';

export const RESEARCH_MODEL = process.env.RESEARCH_MODEL || 'anthropic/claude-sonnet-5';

export function configureFal(key) {
  fal.config({ credentials: key });
}

export async function llm({ system, prompt, web = false, maxTokens = 2500, temperature = 0.2, model = RESEARCH_MODEL }) {
  const { data } = await fal.subscribe('openrouter/router', {
    input: { model, system_prompt: system, prompt, enable_web_search: web, max_tokens: maxTokens, temperature },
  });
  if (data.error) throw new Error(`LLM error: ${typeof data.error === 'string' ? data.error : JSON.stringify(data.error)}`);
  return { text: (data.output || '').trim(), cost: data.usage?.cost ?? 0 };
}

// Ask for JSON; tolerate code fences and leading prose; retry once if it
// doesn't parse or fails `validate`.
export async function llmJson({ system, prompt, validate, ...rest }) {
  let lastErr;
  let cost = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await llm({
      system: `${system}\n\nRespond with ONLY a JSON object — no prose, no code fences.`,
      prompt: attempt ? `${prompt}\n\nYour previous reply was not valid: ${lastErr}. Return only the JSON object.` : prompt,
      ...rest,
    });
    cost += r.cost;
    try {
      const start = r.text.indexOf('{');
      const end = r.text.lastIndexOf('}');
      const obj = JSON.parse(r.text.slice(start, end + 1));
      const problem = validate?.(obj);
      if (problem) throw new Error(problem);
      return { json: obj, cost };
    } catch (e) {
      lastErr = e.message;
    }
  }
  throw new Error(`Could not get valid JSON: ${lastErr}`);
}
