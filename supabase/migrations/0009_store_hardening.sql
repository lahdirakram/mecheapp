-- Store-readiness hardening (security review).

-- 1) Atomic credit reservation. The edge function used to read the balance and insert the -1 in two
--    steps, so concurrent /generate calls could both pass the check and over-spend (and trigger
--    multiple paid AI calls). Serialize per user with a transaction-scoped advisory lock and do the
--    check + decrement in one statement. Returns the new transaction id, or NULL if no credit.
create or replace function reserve_generation_credit(p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text));
  select coalesce(sum(delta), 0) into v_balance from credit_transactions where user_id = p_user;
  if v_balance <= 0 then
    return null;
  end if;
  insert into credit_transactions (user_id, delta, reason)
    values (p_user, -1, 'generation')
    returning id into v_id;
  return v_id;
end;
$$;
revoke all on function reserve_generation_credit(uuid) from public, anon, authenticated;
grant execute on function reserve_generation_credit(uuid) to service_role;

-- 2) Tighten Storage RLS. Uploads are done server-side (service role bypasses RLS), so the client
--    only ever needs to READ its own files (signed URLs) and DELETE them (deleting a look). Drop the
--    broad `for all` policies (which also allowed client insert/update) in favour of select + delete.
drop policy if exists selfies_rw_own on storage.objects;
drop policy if exists generated_rw_own on storage.objects;

create policy selfies_read_own on storage.objects for select
  using (bucket_id = 'selfies' and (storage.foldername(name))[1] = auth.uid()::text);
create policy selfies_delete_own on storage.objects for delete
  using (bucket_id = 'selfies' and (storage.foldername(name))[1] = auth.uid()::text);
create policy generated_read_own on storage.objects for select
  using (bucket_id = 'generated' and (storage.foldername(name))[1] = auth.uid()::text);
create policy generated_delete_own on storage.objects for delete
  using (bucket_id = 'generated' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3) Rate-limit the free `suggest` endpoint. Log each call so the function can cap per user/hour.
create table if not exists suggest_calls (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists suggest_calls_user_time_idx on suggest_calls (user_id, created_at);
alter table suggest_calls enable row level security;
-- Written server-side via the service role; no client policy (so clients can't read/forge it).
-- (The concurrency-safe reserve_suggest_call() RPC lives in 0010 — 0009 was already applied.)
