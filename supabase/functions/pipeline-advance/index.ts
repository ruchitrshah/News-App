// POST /pipeline-advance — internal. Runs the current stage of one request in
// the background and answers 202 immediately, so each stage gets the full
// function wall-clock budget and callers never wait on model calls.
//
// Deploy with verify_jwt = false; authenticated by the shared pipeline secret.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { PIPELINE_SECRET, safeEqual, json } from "../_shared/db.ts";
import { advance } from "../_shared/stages.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!safeEqual(req.headers.get("x-pipeline-secret") ?? "", PIPELINE_SECRET)) {
    return json({ error: "Forbidden" }, 403);
  }

  const { requestId } = await req.json().catch(() => ({}));
  if (typeof requestId !== "string") return json({ error: "requestId required" }, 400);

  EdgeRuntime.waitUntil(advance(requestId));
  return json({ accepted: true }, 202);
});
