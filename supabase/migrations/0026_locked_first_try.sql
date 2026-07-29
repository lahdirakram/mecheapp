-- Locked first try: a generation paid from the FREE pool (welcome credit) while the user holds no
-- purchased credits is delivered as a low-res teaser; the clear image waits in a client-inaccessible
-- bucket until a pack purchase unlocks it (the unlock consumes 1 credit). The welcome-credit ledger
-- machinery (0001/0023) is deliberately untouched: only what `generate` DELIVERS changes.

-- 1) Locked state on generations. Additive: old clients read `locked` as undefined → falsy, old rows
--    default to false. `vault_path` records where the clear result waits (its extension is not
--    derivable from the teaser path). Client-readable — harmless, the vault bucket below is not
--    signable — and client-unwritable (0021 revoked all client writes on this table).
alter table generations add column if not exists locked boolean not null default false;
alter table generations add column if not exists unlocked_at timestamptz;
alter table generations add column if not exists vault_path text;

-- 2) Vault bucket: private and with NO storage policies at all, so RLS denies every client
--    operation (read, sign, delete). Only service_role touches it — absence of a policy is the
--    barrier, not app code (same reasoning as the `private` schema in 0023).
insert into storage.buckets (id, name, public) values ('vault', 'vault', false)
  on conflict (id) do nothing;

-- 3) Atomic unlock: ownership/state checks + credit debit + lock flip in ONE transaction, under the
--    SAME per-user advisory lock as reserve_generation_credit (0009), so it serializes with
--    concurrent /generate spends and webhook grants. The debit MUST keep reason='generation':
--    generate's free/paid pool replay only understands 'purchase'/'generation', a new reason would
--    silently inflate its balance. external_id 'unlock:<gen>' + the 0007 unique index make a double
--    charge structurally impossible even across concurrent callers.
--    The storage move (vault → generated) happens AFTER this commits, in the unlock edge function:
--    debit-before-reveal, so a scripted client polling the predictable clear path can never grab the
--    image without having been charged. The function compensates (deletes the tx, re-locks) if the
--    move fails.
create or replace function unlock_generation(p_user uuid, p_gen uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_status text;
  v_locked boolean;
  v_balance int;
  v_tx uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_user::text));
  select user_id, status, locked into v_owner, v_status, v_locked
    from generations where id = p_gen;
  if v_owner is null or v_owner <> p_user then
    return jsonb_build_object('error', 'not_found');
  end if;
  if v_status <> 'done' then
    return jsonb_build_object('error', 'not_ready');
  end if;
  if not v_locked then
    return jsonb_build_object('error', 'already_unlocked');
  end if;
  select coalesce(sum(delta), 0) into v_balance from credit_transactions where user_id = p_user;
  if v_balance <= 0 then
    return jsonb_build_object('error', 'no_credits');
  end if;
  insert into credit_transactions (user_id, delta, reason, external_id)
    values (p_user, -1, 'generation', 'unlock:' || p_gen)
    on conflict (external_id) do nothing
    returning id into v_tx;
  if v_tx is null then
    return jsonb_build_object('error', 'already_unlocked');
  end if;
  update generations set locked = false, unlocked_at = now() where id = p_gen;
  return jsonb_build_object('tx_id', v_tx);
end;
$$;
revoke all on function unlock_generation(uuid, uuid) from public, anon, authenticated;
grant execute on function unlock_generation(uuid, uuid) to service_role;
