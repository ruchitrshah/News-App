// Before generating anything, check whether the library already has footage
// on this topic. If so, split it into beats as *virtual cuts* — start/end
// ranges on one file — instead of re-encoding or calling fal.
import { admin } from "./db.ts";
import type { Insights } from "./claude.ts";

const MIN_RANK = 0.05;
const MIN_SECONDS_PER_BEAT = 3;

const STOP = new Set(["the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are", "with", "what", "how", "why"]);

function queryFrom(prompt: string, found: Insights) {
  const words = `${found.label} ${found.headline} ${prompt}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  // websearch_to_tsquery syntax: "a or b or c" — any overlap counts, rank decides.
  return Array.from(new Set(words)).slice(0, 12).join(" or ");
}

export type Cut = { url: string; start: number; end: number };

export async function findReusableCuts(prompt: string, found: Insights, beatCount: number): Promise<Cut[] | null> {
  const query = queryFrom(prompt, found);
  if (!query) return null;
  const { data, error } = await admin.rpc("match_videos", {
    query,
    min_duration: beatCount * MIN_SECONDS_PER_BEAT,
  });
  if (error) {
    console.error("[reuse] match_videos failed", error.message);
    return null;
  }
  const best = (data ?? [])[0];
  if (!best || best.rank < MIN_RANK) return null;

  const total = Number(best.duration_s);
  const span = total / beatCount;
  return Array.from({ length: beatCount }, (_, i) => ({
    url: best.url,
    start: Number((i * span).toFixed(2)),
    end: Number(Math.min(total, (i + 1) * span).toFixed(2)),
  }));
}
