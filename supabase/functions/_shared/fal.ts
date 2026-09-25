// fal video adapter. One interface, two modes:
//
//   FAL_MODE=dummy (default) — no fal account needed. Each submit schedules a
//     fake webhook 8–20s later carrying a random 7s range of a clip from the
//     `videos` library, so the whole pipeline runs end to end, visibly.
//   FAL_MODE=live — submits to fal's queue with a webhook back to fal-webhook.
//     Set FAL_KEY and FAL_VIDEO_MODEL (e.g. a text-to-video endpoint id), then
//     confirm the model's input field names in `liveInput` below.
import { fal } from "npm:@fal-ai/client";
import { admin } from "./db.ts";

const MODE = (Deno.env.get("FAL_MODE") ?? "dummy").toLowerCase();
const FAL_KEY = Deno.env.get("FAL_KEY");
const FAL_VIDEO_MODEL = Deno.env.get("FAL_VIDEO_MODEL") ?? "";

if (MODE === "live" && FAL_KEY) fal.config({ credentials: FAL_KEY });

export type SubmitArgs = { prompt: string; durationS: number; aspect: "9:16"; webhookUrl: string };

// ── Live ─────────────────────────────────────────────────────────────────────
// Input shapes differ per fal model. These names fit most fal text-to-video
// endpoints; adjust here when you pick the model — nothing else changes.
function liveInput({ prompt, durationS, aspect }: SubmitArgs) {
  return { prompt, duration: String(durationS), aspect_ratio: aspect };
}

async function submitLive(args: SubmitArgs) {
  if (!FAL_KEY || !FAL_VIDEO_MODEL) throw new Error("FAL_MODE=live needs FAL_KEY and FAL_VIDEO_MODEL.");
  const { request_id } = await fal.queue.submit(FAL_VIDEO_MODEL, {
    input: liveInput(args),
    webhookUrl: args.webhookUrl,
  });
  return { requestId: request_id };
}

// ── Dummy ────────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function submitDummy(args: SubmitArgs) {
  const requestId = `dummy-${crypto.randomUUID()}`;

  const work = (async () => {
    await sleep(8000 + Math.random() * 12000);
    const { data: clips } = await admin.from("videos").select("url, duration_s").limit(20);
    const body: Record<string, unknown> = { request_id: requestId, dummy: true };
    if (!clips?.length) {
      body.status = "ERROR";
      body.error = "No sample clips in the videos library yet (run scripts/seed-clips.mjs).";
    } else {
      const clip = clips[Math.floor(Math.random() * clips.length)];
      const len = Math.min(args.durationS, Number(clip.duration_s));
      const start = Math.max(0, Math.random() * (Number(clip.duration_s) - len));
      body.status = "OK";
      body.payload = { video: { url: clip.url } };
      body.clip = { start: Number(start.toFixed(2)), end: Number((start + len).toFixed(2)) };
    }
    await fetch(args.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  })();

  // Keep the fake render alive after the invoking request has responded.
  // @ts-ignore EdgeRuntime is provided by the Supabase runtime.
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(work);
  return { requestId };
}

export function submitVideo(args: SubmitArgs) {
  return MODE === "live" ? submitLive(args) : submitDummy(args);
}

export const isDummy = MODE !== "live";
