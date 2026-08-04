-- 0037 — le VRAI lien suggestion → coût : ai_calls.suggest_call_id.
--
-- 0036 ne pouvait pas joindre une suggestion à son appel Gemini : la ligne `suggest_calls` est
-- insérée PAR `reserve_suggest_call` (0013), qui ne renvoie qu'un booléen — la fonction edge
-- n'a jamais l'id, donc rien à écrire dans le registre, et le backoffice devait apparier par
-- proximité temporelle. Correctif en deux pièces :
--   1) `ai_calls.suggest_call_id`, le pendant de `generation_id` pour les suggestions ;
--   2) `reserve_suggest_call_v2`, même corps que la v1 mais qui RENVOIE l'id inséré (null si
--      refusé). Nom distinct et non surcharge : ajouter un argument par défaut à la v1 rendrait
--      l'appel à 3 arguments AMBIGU (« function is not unique ») et casserait la fonction edge
--      DÉPLOYÉE pendant la fenêtre migration → deploy. La v1 reste en place tant que toutes les
--      lanes ne sont pas redéployées ; à supprimer dans une migration future.

alter table public.ai_calls add column suggest_call_id uuid;
create index ai_calls_suggest_idx on public.ai_calls (suggest_call_id);

create function reserve_suggest_call_v2(p_user uuid, p_max int, p_daily_max int default 100000)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user int;
  v_day  int;
  v_id   uuid;
begin
  perform pg_advisory_xact_lock(hashtext('suggest:' || p_user::text));
  -- Global backstop (all users, rolling 24h).
  select count(*) into v_day from suggest_calls where created_at > now() - interval '24 hours';
  if v_day >= p_daily_max then
    return null;
  end if;
  -- Per-user hourly limit.
  select count(*) into v_user from suggest_calls
    where user_id = p_user and created_at > now() - interval '1 hour';
  if v_user >= p_max then
    return null;
  end if;
  insert into suggest_calls (user_id) values (p_user) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function reserve_suggest_call_v2(uuid, int, int) from public, anon, authenticated;
grant execute on function reserve_suggest_call_v2(uuid, int, int) to service_role;
