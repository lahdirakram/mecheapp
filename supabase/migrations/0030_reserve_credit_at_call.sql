-- A credit buys exactly ONE paid Gemini call. It must therefore be reserved immediately before that
-- call, and never held across the free steps that precede it.
--
-- What the old ordering cost: `generate` reserved at the top, then encoded the selfie, uploaded it,
-- and only then wrote the `generations` row. Every step in between is free, but a credit was already
-- spent. An EXCEPTION in that window was refunded by the outer catch — but a hard kill was not: the
-- isolate hitting its memory or CPU limit while imagescript decoded a full-resolution phone photo
-- into a raw bitmap (a 12 Mpx shot is a 49 MB bitmap, a 48 Mpx one 195 MB) terminates the worker
-- without running any catch. No refund, and no row ever written. The ledger said "spent" with
-- nothing to show for it: six accounts on prod, five of them first-time users who lost their only
-- free credit on their first try-on and never came back.
--
-- This migration only adds the `p_gen` label. The reordering itself is in functions/generate.
--
-- Why the label matters: a generation debit used to store external_id = NULL, so it pointed at
-- nothing. That is precisely why the loss stayed invisible for six weeks — with no link you can
-- only COUNT debits per user and compare against COUNTS of generations, never join them. With
-- `gen:<generationId>` a debit resolves to its generation, and the 0007 unique index makes charging
-- the same generation twice structurally impossible. Same pattern as unlock_generation (0026).
--
-- Why the paid-call cap is NOT weakened by moving the call site into a background task: the ceiling
-- has never lived in the caller's ordering, it lives here. The per-user advisory lock is taken
-- BEFORE the balance is read, so N concurrent callers sharing one credit serialize and exactly one
-- of them gets it; the rest get null and return without ever reaching Gemini. Do not "simplify" the
-- lock away — it is the only thing standing between one credit and N paid image generations.
--
-- Added as an OVERLOAD, not a replacement: a migration lands before the function deploy, so the
-- currently-deployed function still calls the 1-arg version for the few minutes in between. Drop
-- the 1-arg version once nothing calls it. No DEFAULT on p_gen — a default would make
-- `reserve_generation_credit(p_user => x)` ambiguous between the two signatures.
create or replace function reserve_generation_credit(p_user uuid, p_gen uuid)
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

  -- Already charged for this generation → idempotent success, never a second debit. Checked before
  -- the balance so a re-entrant call still succeeds for a user whose balance has since hit zero:
  -- they already paid for THIS generation, and refusing here would strand work that was paid for.
  select id into v_id from credit_transactions where external_id = 'gen:' || p_gen;
  if v_id is not null then
    return v_id;
  end if;

  select coalesce(sum(delta), 0) into v_balance from credit_transactions where user_id = p_user;
  if v_balance <= 0 then
    return null;
  end if;

  insert into credit_transactions (user_id, delta, reason, external_id)
    values (p_user, -1, 'generation', 'gen:' || p_gen)
    on conflict (external_id) do nothing
    returning id into v_id;
  return v_id;
end;
$$;
revoke all on function reserve_generation_credit(uuid, uuid) from public, anon, authenticated;
grant execute on function reserve_generation_credit(uuid, uuid) to service_role;
