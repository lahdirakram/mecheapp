-- Rebalance feed_for_user scoring. In 0011 the affinity term could dominate the random jitter, so
-- the highest-affinity item always ranked first → the feed reshuffled but kept the SAME first photo
-- every visit. Make the SEEDED random the dominant term (so the lead varies per session) and demote
-- affinity + fatigue to small, capped nudges. Same signature, same security model as 0011.
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
    ( random()                                                                    -- dominant shuffle [0,1)
    + least(
        coalesce((select n from hair_aff h where h.hair = f.hair::text), 0) * 1.0
        + coalesce((select n from mood_aff m where m.mood = f.mood),      0) * 0.6
        + coalesce((select n from kind_aff k where k.tag  = f.kind::text), 0) * 0.8,
        5
      ) * 0.08                                                                    -- gentle, capped taste nudge
    - least(
        coalesce((select count(*) from feed_events e
                  where e.user_id = v_user and e.feed_item_id = f.id and e.kind = 'seen'), 0),
        5
      ) * 0.05                                                                    -- mild fatigue on re-seen
    ) desc
  limit greatest(1, least(50, p_limit));
end;
$$;
grant execute on function feed_for_user(int, double precision, uuid[]) to anon, authenticated;
