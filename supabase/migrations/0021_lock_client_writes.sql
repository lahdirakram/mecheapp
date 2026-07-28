-- Lock the two client-writable tables the SERVER later reads back with service_role.
--
-- The pattern that matters is not "the client can write", it is "the client can write a value the
-- server later trusts with elevated privileges". Two tables matched it:
--
--  * `generations` — read back THREE times by supabase/functions/generate:
--      1. refine reloads selfie_path / result_path and downloads them with the ADMIN client, which
--         bypasses storage RLS. The check was `prev.user_id = auth.uid()`: it validates who owns the
--         ROW, never that the PATH belongs to that user. A client-written path pointed at another
--         user's folder would have been fetched with service_role (confused deputy).
--      2. the lifetime row count gates PRO_FREE_TRIALS.
--      3. the per-user hourly row count gates GEN_USER_HOURLY_CAP.
--    `generations_all_own` was `for all`, so DELETE was permitted → both counters were resettable
--    at will. Combined with claim_pro_role() (0020), which any fresh account may call, and with
--    generate's `isPaidLook = isPro || paid > 0` short-circuit that skips the daily EURO BUDGET and
--    the hourly cap for pros, a single free account could mint UNLIMITED paid Gemini generations:
--    claim pro → 3 free try-ons, no rate limit, no budget ceiling → delete the 3 rows → repeat.
--    That defeats the whole "cap paid AI calls" budget design.
--
--  * `devices.expo_push_token` — read back by generate's notifyUser, which then pushes with the
--    server's Expo credentials. A client could register a THIRD PARTY's token under its own row and
--    use the backend as a push relay.
--
-- The app only ever READS `generations`; the single write it needs (forget the media of its own
-- generation, after deleting a look) is given back as a narrow security-definer RPC. Same shape as
-- claim_pro_role in 0020: no blanket function grant, one function, one purpose.

-- ── generations ───────────────────────────────────────────────────────────────
-- RLS keeps `generations_all_own` for SELECT; the grants are what actually remove write access.
-- NOTE: re-running 0017's blanket `grant ... on all tables` would undo this. Any future grant
-- migration must re-apply these revokes.
revoke insert, update, delete on generations from anon, authenticated;

-- Forget the images of one's OWN generation. The row survives as the RECEIPT for the credit that
-- was spent: credit_transactions keeps the debit forever, so a deleted generation used to leave an
-- unexplainable gap, and it silently reset the two quota counters above.
create or replace function forget_generation_media(p_gen uuid)
returns boolean language sql security definer set search_path = public as $$
  update generations
     set selfie_path = null, result_path = null
   where id = p_gen and user_id = auth.uid()
  returning true;
$$;
revoke all on function forget_generation_media(uuid) from public, anon;
grant execute on function forget_generation_media(uuid) to authenticated;

-- ── devices ───────────────────────────────────────────────────────────────────
revoke insert, update, delete on devices from anon, authenticated;

-- Register THIS device's push token for the caller.
-- Reassigns the token if it was registered to somebody else: a push token identifies a DEVICE, and
-- the person currently signed in on that device is its legitimate owner. This is both correct
-- (no push to an account that logged out) and the thing that stops the relay abuse — the victim's
-- next launch reclaims their own token.
-- Capped at 10 rows per user so the table can't be used to fan out to many third-party devices.
create or replace function register_push_token(p_token text, p_platform text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then return false; end if;
  -- Expo's own token shapes. Anything else is not something Expo would ever hand out.
  if p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_.:-]{1,128}\]$' then return false; end if;
  if (select count(*) from devices where user_id = v_user and expo_push_token <> p_token) >= 10 then
    return false;
  end if;

  delete from devices where expo_push_token = p_token and user_id <> v_user;
  insert into devices (user_id, expo_push_token, platform)
  values (v_user, p_token, nullif(left(coalesce(p_platform, ''), 16), ''))
  on conflict (user_id, expo_push_token)
    do update set platform = excluded.platform;
  return true;
end $$;
revoke all on function register_push_token(text, text) from public, anon;
grant execute on function register_push_token(text, text) to authenticated;

-- Drop THIS device's token (profile toggle set to off).
create or replace function unregister_push_token(p_token text)
returns boolean language sql security definer set search_path = public as $$
  delete from devices where user_id = auth.uid() and expo_push_token = p_token
  returning true;
$$;
revoke all on function unregister_push_token(text) from public, anon;
grant execute on function unregister_push_token(text) to authenticated;
