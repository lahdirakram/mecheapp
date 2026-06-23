-- Global daily backstop for the free `suggest` endpoint. The existing cap was per-user hourly only;
-- this adds an all-users ceiling so spam can't run away regardless of how many accounts hit it
-- (mirrors generate's GEN_DAILY_CAP). The per-user advisory lock still serializes per-user counting;
-- the global count is a soft ceiling (a tiny overshoot near the cap under concurrency is fine for a
-- backstop). The edge function passes p_daily_max from SUGGEST_DAILY_CAP (default 20000/day ≈ €2).
drop function if exists reserve_suggest_call(uuid, int);

create or replace function reserve_suggest_call(p_user uuid, p_max int, p_daily_max int default 100000)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user int;
  v_day  int;
begin
  perform pg_advisory_xact_lock(hashtext('suggest:' || p_user::text));
  -- Global backstop (all users, rolling 24h).
  select count(*) into v_day from suggest_calls where created_at > now() - interval '24 hours';
  if v_day >= p_daily_max then
    return false;
  end if;
  -- Per-user hourly limit.
  select count(*) into v_user from suggest_calls
    where user_id = p_user and created_at > now() - interval '1 hour';
  if v_user >= p_max then
    return false;
  end if;
  insert into suggest_calls (user_id) values (p_user);
  return true;
end;
$$;
revoke all on function reserve_suggest_call(uuid, int, int) from public, anon, authenticated;
grant execute on function reserve_suggest_call(uuid, int, int) to service_role;
