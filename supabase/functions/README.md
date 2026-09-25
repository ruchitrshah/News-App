# Genie pipeline — Edge Functions

A question asked in the app becomes 7–8 short videos:

```
ask ──► pipeline-advance (one stage per call, self-chaining)
          queued → researching → insights → scripting → generating ─┐
                                                                    │  reuse library hit → virtual cuts → ready
                                                                    └► fal (per beat) ──► fal-webhook → ready
```

| Function | Auth | What it does |
| --- | --- | --- |
| `ask` | user JWT (`verify_jwt = true`) | Validates, rate-limits (10/hour/user), inserts `requests`, starts the pipeline. |
| `pipeline-advance` | `x-pipeline-secret` header | Runs the current stage in the background, then kicks the next one. |
| `fal-webhook` | HMAC token in the URL | Marks a beat ready/failed; copies live fal clips into the `clips` bucket. |

Stages live in `_shared/stages.ts`; Claude calls in `_shared/claude.ts`
(web search + fetch for research, JSON-schema structured output for insights
and the script); reuse matching in `_shared/reuse.ts`; fal in `_shared/fal.ts`.

## Secrets (Dashboard → Edge Functions → Secrets)

| Name | Required | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes | Web search must be enabled for your org in the Claude Console. |
| `CLAUDE_MODEL` | no | Defaults to `claude-opus-5`. |
| `FAL_MODE` | no | `dummy` (default) or `live`. |
| `FAL_KEY` | live only | Your fal API key. |
| `FAL_VIDEO_MODEL` | live only | fal endpoint id of the text-to-video model. |
| `FAL_WEBHOOK_SECRET` | no | Signs webhook URLs; defaults to the service-role key. |
| `PIPELINE_SECRET` | no | Function-to-function secret; defaults to the service-role key. |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.

## Switching fal from dummy to live

1. Set `FAL_MODE=live`, `FAL_KEY`, `FAL_VIDEO_MODEL`.
2. Open `_shared/fal.ts` → `liveInput()` and match the input field names to the
   model's schema on fal (most take `prompt`, `duration`, `aspect_ratio`).
3. Redeploy `pipeline-advance` and `fal-webhook`. Nothing else changes — the
   webhook already downloads the finished clip into the `clips` bucket.

## One-time setup

1. Apply `supabase/migrations/0001_pipeline.sql`.
2. Auth → Providers → enable **Anonymous sign-ins** (the app signs in anonymously so RLS can scope rows to their owner).
3. Seed the reuse library and the dummy adapter's sample clips:
   `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/seed-clips.mjs`
4. App `.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (publishable key).
