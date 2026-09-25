// The pipeline, one stage per invocation of pipeline-advance:
//
//   queued ─► researching ─► insights ─► scripting ─► generating ─► ready
//                                                         └─► (fal webhooks finish it)
//
// `status` is the stage that is *running*, so the app can label progress
// ("Searching the web", "Writing the script"…). Each stage claims its row
// with a conditional update so a duplicate kick can't run it twice.
import { admin, kick, webhookUrlFor } from "./db.ts";
import { research, insights, script, type Insights } from "./claude.ts";
import { findReusableCuts } from "./reuse.ts";
import { submitVideo } from "./fal.ts";

type Status = "queued" | "researching" | "insights" | "scripting" | "generating" | "ready" | "failed";

// Atomically move from `from` to `to`; returns the row only if we won.
async function claim(id: string, from: Status, to: Status) {
  const { data } = await admin
    .from("requests")
    .update({ status: to })
    .eq("id", id)
    .eq("status", from)
    .select("*")
    .maybeSingle();
  return data;
}

async function fail(id: string, message: string) {
  console.error(`[pipeline ${id}]`, message);
  await admin.from("requests").update({ status: "failed", error: message.slice(0, 300) }).eq("id", id);
}

export async function advance(requestId: string) {
  const { data: req } = await admin.from("requests").select("*").eq("id", requestId).maybeSingle();
  if (!req) return;

  try {
    switch (req.status as Status) {
      // ── research ──────────────────────────────────────────────────────────
      case "queued": {
        const row = await claim(requestId, "queued", "researching");
        if (!row) return;
        const { brief, sources } = await research(row.prompt, row.about_story);
        if (sources.length) {
          await admin.from("sources").insert(sources.map((s) => ({ ...s, request_id: requestId })));
        }
        await admin.from("requests").update({ research: brief, status: "insights" }).eq("id", requestId);
        await kick(requestId);
        return;
      }

      // ── insights ──────────────────────────────────────────────────────────
      case "insights": {
        if (req.insights) return; // already done by a duplicate kick
        const found = await insights(req.prompt, req.research ?? "");
        await admin.from("requests").update({ insights: found, status: "scripting" }).eq("id", requestId);
        await kick(requestId);
        return;
      }

      // ── script → beats ────────────────────────────────────────────────────
      case "scripting": {
        if (req.script) return;
        let beats;
        try {
          beats = await script(req.prompt, req.insights as Insights);
        } catch (e) {
          console.warn("[scripting] retrying once:", (e as Error).message);
          beats = await script(req.prompt, req.insights as Insights);
        }
        await admin.from("beats").insert(
          beats.map((b, idx) => ({
            request_id: requestId,
            user_id: req.user_id,
            news_id: req.news_id,
            idx,
            headline: b.headline,
            narration: b.narration,
            visual_prompt: b.visual_prompt,
            duration_s: b.duration_s,
          })),
        );
        await admin.from("requests").update({ script: { beats }, status: "generating" }).eq("id", requestId);
        await kick(requestId);
        return;
      }

      // ── videos: reuse footage, or generate one clip per beat ──────────────
      case "generating": {
        const { data: beats } = await admin
          .from("beats")
          .select("id, idx, visual_prompt, duration_s, status")
          .eq("request_id", requestId)
          .order("idx");
        if (!beats?.length) throw new Error("No beats to generate.");
        if (beats.some((b) => b.status !== "pending")) return; // already submitted

        const cuts = await findReusableCuts(req.prompt, req.insights as Insights, beats.length);
        if (cuts) {
          await Promise.all(
            beats.map((b, i) =>
              admin
                .from("beats")
                .update({ status: "ready", video_url: cuts[i].url, clip_start: cuts[i].start, clip_end: cuts[i].end })
                .eq("id", b.id),
            ),
          );
          await admin.from("requests").update({ status: "ready" }).eq("id", requestId);
          return;
        }

        for (const b of beats) {
          try {
            const { requestId: falId } = await submitVideo({
              prompt: b.visual_prompt,
              durationS: Number(b.duration_s),
              aspect: "9:16",
              webhookUrl: await webhookUrlFor(b.id),
            });
            await admin.from("beats").update({ status: "generating", fal_request_id: falId }).eq("id", b.id);
          } catch (e) {
            await admin.from("beats").update({ status: "failed", error: (e as Error).message.slice(0, 300) }).eq("id", b.id);
          }
        }
        await finalizeIfDone(requestId);
        return;
      }

      default:
        return;
    }
  } catch (e) {
    await fail(requestId, (e as Error).message || "Something went wrong.");
  }
}

// Called after every beat settles: once nothing is pending/generating, the
// request is ready (or failed, if every beat failed).
export async function finalizeIfDone(requestId: string) {
  const { data: beats } = await admin.from("beats").select("status").eq("request_id", requestId);
  if (!beats?.length) return;
  const open = beats.some((b) => b.status === "pending" || b.status === "generating");
  if (open) return;
  const anyReady = beats.some((b) => b.status === "ready");
  await admin
    .from("requests")
    .update(anyReady ? { status: "ready" } : { status: "failed", error: "No videos could be made for this one." })
    .eq("id", requestId)
    .eq("status", "generating");
}
