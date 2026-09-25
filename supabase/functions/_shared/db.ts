// Service-role Supabase client + helpers shared by every function.
import { createClient } from "npm:@supabase/supabase-js@2";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// Shared secret for function-to-function calls (pipeline-advance). Defaults to
// the service-role key so there's nothing extra to configure.
export const PIPELINE_SECRET = Deno.env.get("PIPELINE_SECRET") ?? SERVICE_ROLE_KEY;

// Hand the request to the next pipeline stage. pipeline-advance answers 202
// immediately and does the work in the background, so this returns quickly.
export async function kick(requestId: string) {
  const res = await fetch(`${FUNCTIONS_URL}/pipeline-advance`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-pipeline-secret": PIPELINE_SECRET },
    body: JSON.stringify({ requestId }),
  });
  if (!res.ok) console.error("[kick] pipeline-advance returned", res.status, await res.text());
}

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}

// Timing-safe string compare for secrets.
export function safeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// HMAC token so webhook URLs can't be forged or replayed for another beat.
export async function signBeat(beatId: string) {
  const secret = Deno.env.get("FAL_WEBHOOK_SECRET") ?? PIPELINE_SECRET;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(beatId));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function webhookUrlFor(beatId: string) {
  const token = await signBeat(beatId);
  return `${FUNCTIONS_URL}/fal-webhook?beat=${beatId}&token=${token}`;
}
