// POST /fal-webhook?beat=<id>&token=<hmac> — fal (or the dummy adapter)
// reports a finished clip. The token is an HMAC of the beat id, so a URL
// can't be forged or reused for another beat.
//
// Live clips are copied into our `clips` bucket (fal URLs expire). Dummy
// results already point at the bucket and carry a virtual-cut range.
//
// Deploy with verify_jwt = false; authenticated by the signed URL token.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { admin, json, safeEqual, signBeat } from "../_shared/db.ts";
import { finalizeIfDone } from "../_shared/stages.ts";

async function persist(url: string, requestId: string, beatId: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const path = `${requestId}/${beatId}.mp4`;
  const { error } = await admin.storage
    .from("clips")
    .upload(path, await res.arrayBuffer(), { contentType: "video/mp4", upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return admin.storage.from("clips").getPublicUrl(path).data.publicUrl;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const params = new URL(req.url).searchParams;
  const beatId = params.get("beat") ?? "";
  const token = params.get("token") ?? "";
  if (!beatId || !safeEqual(token, await signBeat(beatId))) return json({ error: "Forbidden" }, 403);

  const body = await req.json().catch(() => null);
  if (!body) return json({ error: "Invalid JSON" }, 400);

  const { data: beat } = await admin.from("beats").select("id, request_id, status").eq("id", beatId).maybeSingle();
  if (!beat) return json({ error: "Unknown beat" }, 404);
  if (beat.status === "ready") return json({ ok: true }); // duplicate delivery

  try {
    const videoUrl = body?.payload?.video?.url;
    if (body.status !== "OK" || !videoUrl) throw new Error(body.error ?? "Video generation failed.");

    const update: Record<string, unknown> = { status: "ready" };
    if (body.dummy) {
      update.video_url = videoUrl;
      update.clip_start = body.clip?.start ?? null;
      update.clip_end = body.clip?.end ?? null;
    } else {
      update.video_url = await persist(videoUrl, beat.request_id, beat.id);
    }
    await admin.from("beats").update(update).eq("id", beatId);
  } catch (e) {
    await admin.from("beats").update({ status: "failed", error: (e as Error).message.slice(0, 300) }).eq("id", beatId);
  }

  await finalizeIfDone(beat.request_id);
  return json({ ok: true });
});
