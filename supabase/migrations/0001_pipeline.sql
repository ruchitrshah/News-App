-- Genie pipeline: a question → research → insights → script → 7–8 beats
-- → one short video per beat (fal), or virtual cuts of existing footage.
--
-- Writes happen only in Edge Functions (service role). The app signs in
-- anonymously and can only READ its own requests/beats, plus the shared
-- video library. Realtime streams requests/beats changes to their owner.

-- ── Types ────────────────────────────────────────────────────────────────────
create type public.request_status as enum
  ('queued', 'researching', 'insights', 'scripting', 'generating', 'ready', 'failed');

create type public.beat_status as enum ('pending', 'generating', 'ready', 'failed');

-- ── Tables ───────────────────────────────────────────────────────────────────
create table public.requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  news_id     text not null,
  prompt      text not null check (char_length(prompt) between 3 and 500),
  about_story text,
  status      public.request_status not null default 'queued',
  research    text,            -- raw findings from the web-search stage
  insights    jsonb,
  script      jsonb,
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index requests_user_created_idx on public.requests (user_id, created_at desc);

create table public.sources (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.requests (id) on delete cascade,
  url          text not null,
  title        text,
  snippet      text,
  published_at text,
  created_at   timestamptz not null default now()
);
create index sources_request_idx on public.sources (request_id);

create table public.beats (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid not null references public.requests (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  news_id        text not null,
  idx            int not null,
  headline       text not null,
  narration      text not null,
  visual_prompt  text not null,
  duration_s     numeric not null default 7,
  status         public.beat_status not null default 'pending',
  video_url      text,
  clip_start     numeric,
  clip_end       numeric,
  fal_request_id text,
  error          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (request_id, idx)
);
create index beats_request_idx on public.beats (request_id, idx);
create index beats_user_idx on public.beats (user_id);

-- Reuse library: existing footage we can virtually cut instead of generating.
create table public.videos (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  summary    text,
  tags       text[] not null default '{}',
  url        text not null,
  duration_s numeric not null,
  tsv        tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || array_to_string(tags, ' '))
  ) stored,
  created_at timestamptz not null default now()
);
create index videos_tsv_idx on public.videos using gin (tsv);

-- ── updated_at ───────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger requests_touch before update on public.requests
  for each row execute function public.touch_updated_at();
create trigger beats_touch before update on public.beats
  for each row execute function public.touch_updated_at();

-- ── Row-level security: read-only for owners; no client writes at all ───────
alter table public.requests enable row level security;
alter table public.sources  enable row level security;
alter table public.beats    enable row level security;
alter table public.videos   enable row level security;

create policy "owners read their requests" on public.requests
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "owners read their beats" on public.beats
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "owners read sources of their requests" on public.sources
  for select to authenticated using (
    exists (select 1 from public.requests r where r.id = request_id and r.user_id = (select auth.uid()))
  );

create policy "anyone signed in reads the video library" on public.videos
  for select to authenticated using (true);

-- (No insert/update/delete policies: with RLS on, clients can't write.)

-- ── Reuse search (called by Edge Functions with the service role) ────────────
create or replace function public.match_videos(query text, min_duration numeric)
returns table (id uuid, title text, url text, duration_s numeric, rank real)
language sql
stable
set search_path = ''
as $$
  select v.id, v.title, v.url, v.duration_s,
         ts_rank(v.tsv, websearch_to_tsquery('english', query)) as rank
  from public.videos v
  where v.tsv @@ websearch_to_tsquery('english', query)
    and v.duration_s >= min_duration
  order by rank desc
  limit 3;
$$;
revoke execute on function public.match_videos(text, numeric) from anon, authenticated;

-- Per-user rate limit helper for `ask`.
create or replace function public.recent_request_count(uid uuid, window_minutes int)
returns int
language sql
stable
set search_path = ''
as $$
  select count(*)::int from public.requests
  where user_id = uid and created_at > now() - make_interval(mins => window_minutes);
$$;
revoke execute on function public.recent_request_count(uuid, int) from anon, authenticated;

-- ── Realtime ─────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.requests, public.beats;

-- ── Storage: public-read bucket for clips ────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('clips', 'clips', true)
on conflict (id) do nothing;
