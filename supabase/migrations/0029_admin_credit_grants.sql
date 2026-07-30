-- Admin credit grants: the backoffice can put REAL credits on an account (support gesture, refund,
-- influencer, press). "Real" is the whole point — a granted credit must behave exactly like a bought
-- one, including under the locked first try (0026): it lifts the lock, it exempts from the free-tier
-- cost caps, and it makes the app show the normal credit UI.
--
-- WHY A NEW REASON AND NOT reason='purchase'
-- Reusing 'purchase' would have needed zero code elsewhere, and that is exactly the trap: the whole
-- backoffice reads revenue off `reason = 'purchase'` × the catalogue price (lib/pricing.ts), and
-- claim_pro_role() (0020) uses "has a purchase" as its "not a fresh account" test. A free grant would
-- have invented revenue and payers out of nothing. So grants get their own reason, and the two places
-- that split the ledger into free vs purchased pools are taught to count it on the PAID side:
--   - supabase/functions/generate/index.ts (server, decides `locked`)
--   - packages/api-client/src/queries.ts   (client, decides the pre/post-purchase experience)
-- Those two replays MUST stay in sync; a reason understood by one and not the other means the user
-- sees credits the server won't honour, or the reverse.

-- 1) Why the grant was made. Free text, admin-authored, never shown to the user (the ledger is
--    client-readable via credit_tx_select_own, so keep it factual, not internal gossip).
alter table credit_transactions add column if not exists note text;

-- 2) The grant itself. service_role only: the backoffice reaches it through PostgREST with the
--    service key, so no client can call it even by guessing the name.
--
--    Idempotent by construction: `p_ref` is a uuid minted when the form is RENDERED, so a double
--    submit (double click, browser retry, back-then-resubmit) collides on external_id
--    (credit_tx_external_id_uniq, 0007) and returns the already-granted answer instead of a second
--    grant. Same advisory lock as reserve_generation_credit (0009) / unlock_generation (0026), so a
--    grant serializes against a concurrent spend rather than racing the balance check below.
create or replace function admin_grant_credits(
  p_user  uuid,
  p_delta int,
  p_note  text,
  p_ref   uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role    user_role;
  v_balance int;
  v_ext     text := 'admin:' || p_ref::text;
  v_tx      uuid;
begin
  -- Bounded on purpose: a typo in a text field should not be able to mint a fortune. Negative is
  -- allowed so a mistaken grant can be taken back the same way it was given.
  if p_delta = 0 or p_delta < -1000 or p_delta > 1000 then
    return jsonb_build_object('error', 'bad_delta');
  end if;

  select role into v_role from profiles where id = p_user;
  if v_role is null then
    return jsonb_build_object('error', 'not_found');
  end if;
  -- A pro account never spends credits (its quota is the subscription, 0016), so a grant there would
  -- sit in the ledger doing nothing while looking like the problem was fixed.
  if v_role = 'pro' then
    return jsonb_build_object('error', 'pro_account');
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user::text));

  -- Already applied? Answer as if we had just done it: the caller retried, not double-spent.
  select id into v_tx from credit_transactions where external_id = v_ext;
  if v_tx is not null then
    select coalesce(sum(delta), 0) into v_balance from credit_transactions where user_id = p_user;
    return jsonb_build_object('tx_id', v_tx, 'balance', v_balance, 'replay', true);
  end if;

  select coalesce(sum(delta), 0) into v_balance from credit_transactions where user_id = p_user;
  if v_balance + p_delta < 0 then
    return jsonb_build_object('error', 'would_go_negative', 'balance', v_balance);
  end if;

  insert into credit_transactions (user_id, delta, reason, external_id, note)
    values (p_user, p_delta, 'admin_grant', v_ext, nullif(btrim(coalesce(p_note, '')), ''))
    returning id into v_tx;

  return jsonb_build_object('tx_id', v_tx, 'balance', v_balance + p_delta);
end;
$$;

revoke all on function admin_grant_credits(uuid, int, text, uuid) from public, anon, authenticated;
grant execute on function admin_grant_credits(uuid, int, text, uuid) to service_role;
