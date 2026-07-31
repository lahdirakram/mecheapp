// POST /functions/v1/paddle-webhook
// Paddle (web checkout) → grants consumable credit packs. This is the TRUSTED grant path for the
// web studio, the exact counterpart of `iap-webhook` for the stores: the client never adds credits
// itself, it only opens the checkout; Paddle takes the money and calls us here.
//
// Deploy WITHOUT Supabase JWT verification (Paddle sends its own signature header, not a Supabase
// JWT):  supabase functions deploy paddle-webhook --no-verify-jwt
// Then set the secret from the notification destination:
//   supabase secrets set PADDLE_WEBHOOK_SECRET=pdl_ntfset_...
//
// ── THE ACCOUNT IS SHARED WITH ANOTHER APP ───────────────────────────────────────────────────────
// The same Paddle account sells another product, so THIS ENDPOINT WILL RECEIVE EVENTS THAT ARE NOT
// OURS. Never assume a `transaction.completed` is a Mèche purchase. The only thing that makes an
// event ours is that its price id resolves to a row in `credit_packs.paddle_price_id`; anything else
// is acknowledged with 200 and granted nothing. Same lesson as `offerings.current` on RevenueCat:
// one billing account serving two apps means identity must be proven, never inferred.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });

/** Paddle's default SDK tolerance is 5s, which is too tight for an edge function: a cold start plus
 *  clock skew rejects legitimate payments. 60s still makes replay useless. */
const MAX_SKEW_SECONDS = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PaddleItem = { price?: { id?: string }; quantity?: number };
type PaddleEvent = {
  event_id?: string;
  event_type?: string;
  data?: {
    id?: string;
    custom_data?: { user_id?: string } | null;
    items?: PaddleItem[];
    /** adjustment.created only */
    action?: string;
    status?: string;
    transaction_id?: string;
  };
};

/**
 * How a grant is keyed, and why it is the TRANSACTION id and not the event id.
 *
 * Paddle's docs recommend `event_id` for deduplication, and for a lone grant that would be fine.
 * But a refund arrives as `adjustment.created`, which references the **transaction**, not the
 * original event. Keying the grant on the event id would leave the refund unable to find what it
 * has to revoke. `transaction.completed` fires once per transaction, so the transaction id is just
 * as strong a dedup key, and it is the only one both sides of the story share.
 */
const grantKey = (transactionId: string) => `paddle_txn:${transactionId}`;
const refundKey = (adjustmentId: string) => `paddle_adj:${adjustmentId}`;

/** Constant-time string compare, so a wrong signature leaks nothing through timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Parse `ts=1671552777;h1=abc...` into its parts. */
function parseSignature(header: string): { ts: string; h1: string } | null {
  let ts = '';
  let h1 = '';
  for (const part of header.split(';')) {
    const [k, v] = part.split('=');
    if (k === 'ts') ts = v ?? '';
    else if (k === 'h1') h1 = v ?? '';
  }
  return ts && h1 ? { ts, h1 } : null;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const SECRET = Deno.env.get('PADDLE_WEBHOOK_SECRET') ?? '';
  if (!SECRET) return json({ error: 'not_configured' }, 500);

  // THE RAW BODY IS LOAD-BEARING. Paddle signs the bytes it sent; parsing to JSON and
  // re-serialising produces a different string (key order, spacing) and the signature never
  // matches. Read text() first, verify, and only then parse.
  const raw = await req.text();

  const header = req.headers.get('Paddle-Signature') ?? '';
  const parsed = parseSignature(header);
  if (!parsed) return json({ error: 'unauthorized' }, 401);

  const ts = Number(parsed.ts);
  if (!Number.isFinite(ts)) return json({ error: 'unauthorized' }, 401);
  if (Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) return json({ error: 'stale_signature' }, 401);

  const expected = await hmacHex(SECRET, `${parsed.ts}:${raw}`);
  if (!safeEqual(expected, parsed.h1)) return json({ error: 'unauthorized' }, 401);

  let event: PaddleEvent;
  try {
    event = JSON.parse(raw) as PaddleEvent;
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE);

  // ── Refund / chargeback: take the credits back ────────────────────────────────────────────────
  //
  // Money came back, so the credits must go with it. Without this a refunded buyer keeps what they
  // paid for, which is a straight loss and an obvious abuse route (buy, reveal, refund, repeat).
  if (event.event_type === 'adjustment.created') {
    const adj = event.data ?? {};

    // `credit` adjusts a future invoice (subscriptions) and takes nothing back from us.
    if (adj.action !== 'refund' && adj.action !== 'chargeback') {
      return json({ ok: true, ignored: `adjustment:${adj.action ?? 'unknown'}` });
    }
    // A refund awaiting approval has not happened yet. Revoking on `pending_approval` would strip
    // credits from someone whose refund may still be rejected.
    if (adj.status !== 'approved') {
      return json({ ok: true, ignored: `adjustment_status:${adj.status ?? 'unknown'}` });
    }
    if (!adj.transaction_id || !adj.id) return json({ ok: true, skipped: 'incomplete_adjustment' });

    // Find what we actually granted for that transaction. No row = not ours (another product on
    // this account, or a transaction that never granted anything).
    const { data: grant } = await admin
      .from('credit_transactions')
      .select('user_id, delta, pack_id')
      .eq('external_id', grantKey(adj.transaction_id))
      .maybeSingle();
    if (!grant) return json({ ok: true, skipped: 'no_matching_grant', transactionId: adj.transaction_id });

    // reason MUST be 'purchase', with a NEGATIVE delta. This is the whole trick: `generate` replays
    // the ledger with `if (reason === 'purchase' || reason === 'admin_grant') paid += delta`, so a
    // negative purchase correctly shrinks the paid pool. A new reason like 'refund' would fall
    // through every branch (it is not 'generation', and `delta > 0` is false) and be INVISIBLE to
    // generate, while `my_credit_balance` — a plain sum — would still see it. The two readers would
    // disagree, and a refunded user would keep generating. See docs/security-model.md.
    //
    // The balance is allowed to go negative: someone who already spent the credits and then got
    // their money back ends up below zero, and `generate` blocks on `balance <= 0`. That is the
    // intended outcome, not an accounting error.
    //
    // A PARTIAL refund still revokes the whole grant. Credits cannot be half-delivered, and partial
    // refunds on a 0,99-5,99 € pack would only ever be a manual gesture.
    const { data: revoked, error: revokeErr } = await admin
      .from('credit_transactions')
      .upsert(
        {
          user_id: grant.user_id,
          delta: -Math.abs(grant.delta as number),
          reason: 'purchase',
          pack_id: grant.pack_id,
          external_id: refundKey(adj.id),
        },
        { onConflict: 'external_id', ignoreDuplicates: true },
      )
      .select('id');
    if (revokeErr) return json({ error: 'revoke_failed', detail: revokeErr.message }, 500);

    return json({
      ok: true,
      revoked: (revoked?.length ?? 0) > 0,
      credits: -Math.abs(grant.delta as number),
      userId: grant.user_id,
      action: adj.action,
    });
  }

  // ── Purchase ──────────────────────────────────────────────────────────────────────────────────
  // Everything else (subscriptions, and any event belonging to another product on this account) is
  // acknowledged so Paddle stops retrying.
  if (event.event_type !== 'transaction.completed') {
    return json({ ok: true, ignored: event.event_type ?? 'unknown' });
  }

  const transactionId = event.data?.id;
  const userId = event.data?.custom_data?.user_id;
  if (!transactionId) return json({ ok: true, skipped: 'no_transaction_id' });

  // No user id, or a forged one, can't be mapped. Ack so Paddle stops retrying, grant nothing.
  // Same shape as iap-webhook's $RCAnonymousID guard.
  if (!userId || !UUID_RE.test(userId)) {
    return json({ ok: true, skipped: 'unmappable_user' });
  }

  // Resolve every line against our own catalogue. THIS is what decides the event is ours: a price
  // belonging to the other app on this Paddle account simply resolves to nothing.
  const items = event.data?.items ?? [];
  const priceIds = items.map((i) => i.price?.id).filter((id): id is string => !!id);
  if (!priceIds.length) return json({ ok: true, skipped: 'no_items' });

  const { data: packs, error: packErr } = await admin
    .from('credit_packs')
    .select('id, credits, paddle_price_id')
    .in('paddle_price_id', priceIds);
  if (packErr) return json({ error: 'lookup_failed', detail: packErr.message }, 500);

  const byPrice = new Map((packs ?? []).map((p: { paddle_price_id: string; id: string; credits: number }) => [p.paddle_price_id, p]));

  let credits = 0;
  let packId: string | null = null;
  for (const item of items) {
    const pack = item.price?.id ? byPrice.get(item.price.id) : undefined;
    if (!pack) continue; // not ours, or not sold on the web
    // Quantity is honoured so a multi-quantity checkout credits what was actually paid for.
    credits += pack.credits * Math.max(1, Math.floor(item.quantity ?? 1));
    packId = packId ?? pack.id;
  }

  // Nothing of ours in this transaction: the other app's sale. Ack, grant nothing.
  if (credits <= 0) return json({ ok: true, skipped: 'no_matching_pack', priceIds });

  // Idempotent grant — external_id is uniquely indexed (0007), so a retried webhook is a no-op.
  // `reason` MUST stay 'purchase': it is what `generate`'s free/paid replay reads to decide the
  // user is in the paid pool (no teaser, no free-tier caps). See docs/security-model.md.
  const { data: inserted, error } = await admin
    .from('credit_transactions')
    .upsert(
      { user_id: userId, delta: credits, reason: 'purchase', pack_id: packId, external_id: grantKey(transactionId) },
      { onConflict: 'external_id', ignoreDuplicates: true },
    )
    .select('id');
  if (error) return json({ error: 'grant_failed', detail: error.message }, 500);

  return json({ ok: true, granted: (inserted?.length ?? 0) > 0, credits, userId });
});
