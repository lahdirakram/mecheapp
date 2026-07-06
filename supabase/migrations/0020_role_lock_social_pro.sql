-- Social sign-in support for Mèche Pro + role hardening.
--
-- 1) Lock the role column. profiles_update_own + the broad UPDATE grant let a client update ANY
--    column of their row, including role — a b2c user could self-promote to pro and bypass the
--    salons policy (0018). Column-level privileges replace the broad grant.
revoke update on profiles from authenticated;
grant update (display_name, handle, lang) on profiles to authenticated;

-- 2) Apple/Google sign-in creates the auth user WITHOUT role metadata, so handle_new_user()
--    defaults the profile to b2c. The pro app claims the pro role right after sign-in; the rules
--    here keep it safe: only a FRESH account (minutes old, never generated, never purchased) can
--    switch. An existing Mèche (client) account signing into the pro app stays b2c and is blocked
--    by the UI + RLS.
create or replace function claim_pro_role()
returns boolean language sql security definer set search_path = public as $$
  update profiles set role = 'pro'
  where id = auth.uid()
    and role = 'b2c'
    and created_at > now() - interval '15 minutes'
    and not exists (select 1 from generations g where g.user_id = auth.uid())
    and not exists (select 1 from credit_transactions t where t.user_id = auth.uid() and t.reason = 'purchase')
  returning true;
$$;
revoke all on function claim_pro_role() from public, anon;
grant execute on function claim_pro_role() to authenticated;
