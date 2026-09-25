// POST /ask — the app's only write path. Validates the question, rate-limits
// per user, records the request, and starts the pipeline. Returns at once;
// progress streams to the app over Realtime.
//
// Requires a signed-in (anonymous is fine) user JWT: verify_jwt = true.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { admin, kick, json, CORS } from "../_shared/db.ts";

const MAX_PER_HOUR = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !auth?.user) return json({ error: "Sign in required" }, 401);
  const userId = auth.user.id;

  let body: { prompt?: unknown; newsId?: unknown; aboutStory?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const newsId = typeof body.newsId === "string" ? body.newsId.trim() : "";
  const aboutStory = typeof body.aboutStory === "string" ? body.aboutStory.trim().slice(0, 300) : null;
  if (prompt.length < 3 || prompt.length > 500) return json({ error: "Question must be 3–500 characters." }, 400);
  if (!newsId || newsId.length > 100) return json({ error: "newsId is required." }, 400);

  const { data: recent } = await admin.rpc("recent_request_count", { uid: userId, window_minutes: 60 });
  if ((recent ?? 0) >= MAX_PER_HOUR) return json({ error: "That's a lot of questions — try again in a bit." }, 429);

  const { data: row, error } = await admin
    .from("requests")
    .insert({ user_id: userId, news_id: newsId, prompt, about_story: aboutStory })
    .select("id")
    .single();
  if (error || !row) return json({ error: "Could not start that request." }, 500);

  await kick(row.id);
  return json({ requestId: row.id }, 202);
});
