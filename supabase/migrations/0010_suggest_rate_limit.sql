-- Concurrency-safe per-user rate limit for the free `suggest` endpoint. Split out of 0009 (which
-- was already applied) into its own migration. Advisory-locked count+insert in one transaction so
-- parallel requests can't bypass the cap (a plain count-then-insert in the edge function could).
-- Returns true if the call is allowed (and logs it), false if the hourly cap is already reached.
create or replace function reserve_suggest_call(p_user uuid, p_max int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  perform pg_advisory_xact_lock(hashtext('suggest:' || p_user::text));
  select count(*) into v_count from suggest_calls
    where user_id = p_user and created_at > now() - interval '1 hour';
  if v_count >= p_max then
    return false;
  end if;
  insert into suggest_calls (user_id) values (p_user);
  return true;
end;
$$;
revoke all on function reserve_suggest_call(uuid, int) from public, anon, authenticated;
grant execute on function reserve_suggest_call(uuid, int) to service_role;
