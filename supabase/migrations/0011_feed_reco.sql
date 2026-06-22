-- Dynamic, lightly-personalized feed. Replaces the old "ORDER BY created_at, then recycle the same
-- pool" behavior (every visit identical) with a per-session shuffle weighted by the user's taste.
--
-- Two pieces:
--   1) feed_events — a thin interaction log (seen / like / save / try) per user + feed item. Powers
--      cross-session de-duplication (don't keep re-showing the same looks) and future signals.
--   2) feed_for_user(...) — returns feed_items ordered by an affinity score (derived from the looks
--      the user saved: matching hair shape / mood / source) plus a SEEDED random jitter. A fresh seed
--      each session reshuffles the order, so the feed feels alive instead of fixed; the same seed is
--      reused within a session so pagination stays stable.

create table if not exists feed_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles (id) on delete cascade,
  feed_item_id uuid not null references feed_items (id) on delete cascade,
  kind         text not null,                 -- 'seen' | 'like' | 'save' | 'try'
  created_at   timestamptz not null default now()
);
alter table feed_events enable row level security;
create index if not exists feed_events_user_idx on feed_events (user_id, feed_item_id);
-- A user only ever reads/writes their own events.
create policy feed_events_all_own on feed_events for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Personalized + shuffled feed. SECURITY INVOKER so the user's own RLS applies to looks/feed_events;
-- identity is taken from auth.uid() (anon → null → no affinity, just a shuffled feed).
create or replace function feed_for_user(
  p_limit   int default 10,
  p_seed    double precision default 0.5,
  p_exclude uuid[] default '{}'
) returns setof feed_items
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  -- Deterministic shuffle for this session (caller passes a stable seed per session, fresh per visit).
  perform setseed(greatest(-1.0, least(1.0, p_seed)));
  return query
  with saved as (
    select hair::text as hair, mood, tag from looks where user_id = v_user
  ),
  hair_aff as (select hair, count(*)::numeric n from saved where hair is not null group by hair),
  mood_aff as (select mood, count(*)::numeric n from saved where mood is not null group by mood),
  kind_aff as (select tag,  count(*)::numeric n from saved where tag  is not null group by tag)
  select f.*
  from feed_items f
  where not (f.id = any(coalesce(p_exclude, '{}'::uuid[])))
  order by
    ( coalesce((select n from hair_aff h where h.hair = f.hair::text), 0) * 1.0   -- same hair shape
    + coalesce((select n from mood_aff m where m.mood = f.mood),       0) * 0.6   -- same mood/palette
    + coalesce((select n from kind_aff k where k.tag  = f.kind::text),  0) * 0.8   -- same source kind
    - coalesce((select count(*) from feed_events e
                where e.user_id = v_user and e.feed_item_id = f.id and e.kind = 'seen'), 0) * 0.4  -- fatigue
    + random() * 2.0                                                               -- seeded jitter
    ) desc
  limit greatest(1, least(50, p_limit));
end;
$$;
grant execute on function feed_for_user(int, double precision, uuid[]) to anon, authenticated;
