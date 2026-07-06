-- Explicit Data API grants. Supabase is removing the implicit grants that made public-schema
-- tables reachable by `anon`/`authenticated` without an explicit GRANT (local CLI already flipped
-- on 2026-05-30; the cloud default becomes permanent on 2026-10-30). Staging/prod still run on the
-- implicit grants today, so this changes nothing there — it pins the exact same access explicitly,
-- keeps local `supabase db reset` behaving like the cloud, and survives the flip.
--
-- Security model is unchanged: RLS (which grants do NOT bypass) remains the real gate. Tables with
-- no client policy (credit_transactions writes, suggest_calls, …) stay locked by RLS exactly as on
-- staging/prod today.

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
-- service_role bypasses RLS but still needs table privileges — the edge functions read/write
-- through it (the flip revokes its implicit grants too).
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Future tables/sequences created by migrations get the same treatment automatically.
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

-- Client-called RPCs. Deliberately NOT a blanket grant-execute: reserve_generation_credit /
-- reserve_suggest_call were explicitly revoked from client roles (0009/0010/0013) and must stay
-- service-role only.
grant execute on function my_credit_balance() to authenticated;
grant execute on function my_pro_status() to authenticated;
