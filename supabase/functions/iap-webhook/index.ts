// POST /functions/v1/iap-webhook
// RevenueCat webhook → grants consumable credit packs. This is the TRUSTED grant path: the client
// never adds credits itself, it only opens the store sheet; RevenueCat validates the receipt with
// Apple/Google and calls us here.
//
// Since 0039 this is also the EXACT money ledger: every event is journaled into `iap_events` with
// the amounts RC sends (USD-normalized price, local price + currency, estimated store commission
// and tax, environment). And refunds are handled: a pack refund (CANCELLATION with
// cancel_reason=CUSTOMER_SUPPORT) claws the credits back (reason 'refund', negative delta), a
// REFUND_REVERSED re-grants them. The 'refund' reason lands on the PAID side of the credit replay
// in BOTH functions/generate and packages/api-client (same three-file invariant as admin_grant).
//
// Deploy WITHOUT Supabase JWT verification (RevenueCat sends its own Authorization header, not a
// Supabase JWT):  supabase functions deploy iap-webhook --no-verify-jwt
// Then in the RevenueCat dashboard set the webhook Authorization header to the RC_WEBHOOK_SECRET
// value (supabase secrets set RC_WEBHOOK_SECRET=...).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });

type RcEvent = {
  type?: string;
  id?: string;
  app_user_id?: string;
  product_id?: string;
  environment?: string;
  store?: string;
  /** Subscription events: when the current period ends (ms epoch). */
  expiration_at_ms?: number;
  purchased_at_ms?: number;
  transaction_id?: string;
  original_transaction_id?: string;
  /** USD price normalized by RC; null when unknown. */
  price?: number | null;
  price_in_purchased_currency?: number | null;
  currency?: string;
  tax_percentage?: number | null;
  commission_percentage?: number | null;
  cancel_reason?: string;
};

// deno-lint-ignore no-explicit-any
type Admin = any;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Mèche Pro subscription events → upsert into `subscriptions` (one row per owner). The /generate
// quota check only trusts current_period_end, so a CANCELLATION keeps access until the paid period
// runs out and an EXPIRATION (past expiration_at_ms) cuts it off naturally.
const SUB_EVENTS = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE']);
const SUB_STATUS: Record<string, string> = {
  CANCELLATION: 'cancelled',
  EXPIRATION: 'expired',
  BILLING_ISSUE: 'billing_issue',
};

/**
 * Journal de l'argent (0039). Best-effort et APRÈS le grant : créditer l'utilisateur est le
 * produit, journaliser est du reporting — un échec d'insert ne doit ni bloquer ni faire re-tenter
 * le grant (le webhook resterait en 500 et RC finirait par abandonner, crédits jamais accordés).
 * Idempotent par event_id : un retry RC ne crée pas de doublon.
 */
async function journalEvent(admin: Admin, event: RcEvent, packId: string | null) {
  if (!event.id) return;
  try {
    const { error } = await admin.from('iap_events').upsert(
      {
        event_id: event.id,
        type: event.type ?? 'UNKNOWN',
        store: event.store ?? null,
        environment: event.environment ?? null,
        app_user_id: event.app_user_id && UUID_RE.test(event.app_user_id) ? event.app_user_id : null,
        product_id: event.product_id ?? null,
        pack_id: packId,
        transaction_id: event.transaction_id ?? null,
        original_transaction_id: event.original_transaction_id ?? null,
        price_usd: event.price ?? null,
        price_local: event.price_in_purchased_currency ?? null,
        currency: event.currency ?? null,
        tax_percentage: event.tax_percentage ?? null,
        commission_percentage: event.commission_percentage ?? null,
        cancel_reason: event.cancel_reason ?? null,
        purchased_at: event.purchased_at_ms ? new Date(event.purchased_at_ms).toISOString() : null,
        event,
      },
      { onConflict: 'event_id', ignoreDuplicates: true },
    );
    if (error) console.warn('iap_events insert failed:', error.message ?? error);
  } catch (e) {
    console.warn('iap_events insert failed:', String(e instanceof Error ? e.message : e));
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const SECRET = Deno.env.get('RC_WEBHOOK_SECRET') ?? '';

  // Auth — RevenueCat sends the exact Authorization header we configured in its dashboard.
  const auth = req.headers.get('Authorization') ?? '';
  if (!SECRET || (auth !== SECRET && auth !== `Bearer ${SECRET}`)) return json({ error: 'unauthorized' }, 401);

  let event: RcEvent;
  try {
    const body = (await req.json()) as { event?: RcEvent };
    event = body.event ?? {};
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  // IAP always credits the backend the app authenticates against. There's a single store app
  // (com.meche.app) on the prod backend, so all purchases — including sandbox/license-tester test
  // purchases — belong to a prod user and are granted here. Sandbox is accepted on purpose: a normal
  // App Store/Play user cannot produce sandbox transactions, so it's not a fraud vector, and it's
  // what lets you test purchases on the internal/TestFlight track without a real charge.
  // The money ledger keeps `environment`, so reporting counts PRODUCTION only.

  const eventId = event.id;
  const userId = event.app_user_id;
  const productId = event.product_id;
  const admin: Admin = createClient(SUPABASE_URL, SERVICE);

  // Resolve the pack once: used by the grant, the refund clawback AND the journal.
  const isProProduct = (productId ?? '').startsWith('meche_pro');
  let pack: { id: string; credits: number } | null = null;
  if (productId && !isProProduct) {
    const { data } = await admin.from('credit_packs').select('id, credits').eq('product_id', productId).maybeSingle();
    pack = data ?? null;
  }

  // Anonymous RevenueCat ids ($RCAnonymousID:...) can't be mapped to a Supabase user — the client
  // must logIn(user.id) before purchasing. Ack so RC stops retrying, but grant nothing. The event
  // is still journaled: if real money ever lands on an anonymous id, it must show up somewhere.
  if (!eventId || !userId || !productId || userId.startsWith('$RCAnonymousID')) {
    await journalEvent(admin, event, pack?.id ?? null);
    return json({ ok: true, skipped: 'unmappable' });
  }

  // ── Mèche Pro subscription (meche_pro_monthly) ─────────────────────────────
  if (SUB_EVENTS.has(event.type ?? '') && isProProduct) {
    const { error } = await admin.from('subscriptions').upsert(
      {
        owner_id: userId,
        plan: 'pro',
        status: SUB_STATUS[event.type ?? ''] ?? 'active',
        current_period_end: event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null,
        rc_entitlement: 'pro',
        rc_product_id: productId,
        environment: event.environment ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'owner_id' },
    );
    if (error) {
      if ((error as { code?: string }).code === '23503') {
        // Propriétaire disparu (compte supprimé) : rien à mettre à jour, mais on journalise l'argent.
        await journalEvent(admin, event, null);
        return json({ ok: true, skipped: 'user_gone', userId });
      }
      return json({ error: 'sub_upsert_failed', detail: error.message }, 500);
    }
    await journalEvent(admin, event, null);
    return json({ ok: true, subscription: true, userId, until: event.expiration_at_ms ?? null });
  }

  // ── B2C consumable credit packs ────────────────────────────────────────────
  // NON_RENEWING_PURCHASE grants; a refund claws back; everything else is journaled + acked.

  if (pack && event.type === 'NON_RENEWING_PURCHASE') {
    // Idempotent grant — external_id (the RC event id) is uniquely indexed, so a retried webhook
    // is a no-op. Returning rows tells us whether this call actually granted.
    const { data: inserted, error } = await admin
      .from('credit_transactions')
      .upsert(
        { user_id: userId, delta: pack.credits, reason: 'purchase', pack_id: pack.id, external_id: eventId },
        { onConflict: 'external_id', ignoreDuplicates: true },
      )
      .select('id');
    if (error) {
      // 23503 = FK violation : l'utilisateur n'existe plus (compte supprimé avant que l'événement
      // arrive, ou re-livraison d'un événement d'avant 0035). Il n'y a personne à créditer, mais
      // l'argent est réel : on journalise et on ack — un 500 ferait boucler RC pour rien.
      if ((error as { code?: string }).code === '23503') {
        await journalEvent(admin, event, pack.id);
        return json({ ok: true, skipped: 'user_gone', userId });
      }
      return json({ error: 'grant_failed', detail: error.message }, 500);
    }
    await journalEvent(admin, event, pack.id);
    return json({ ok: true, granted: (inserted?.length ?? 0) > 0, credits: pack.credits, userId });
  }

  // Remboursement d'un pack : RC l'envoie en CANCELLATION avec cancel_reason=CUSTOMER_SUPPORT.
  // On reprend les crédits du pack (delta négatif, reason 'refund') ; le solde peut devenir
  // négatif si tout est déjà dépensé, c'est voulu (acheter → consommer → se faire rembourser ne
  // doit pas laisser un compte neuf à zéro prêt à recommencer). Idempotent par external_id.
  if (pack && event.type === 'CANCELLATION' && event.cancel_reason === 'CUSTOMER_SUPPORT') {
    const { error } = await admin
      .from('credit_transactions')
      .upsert(
        { user_id: userId, delta: -pack.credits, reason: 'refund', pack_id: pack.id, external_id: `refund:${eventId}` },
        { onConflict: 'external_id', ignoreDuplicates: true },
      );
    if (error && (error as { code?: string }).code !== '23503') return json({ error: 'refund_failed', detail: error.message }, 500);
    await journalEvent(admin, event, pack.id);
    return json({ ok: true, refunded: !error, credits: -pack.credits, userId });
  }

  // Remboursement annulé par Apple (REFUND_REVERSED, App Store only) : on rend les crédits.
  if (pack && event.type === 'REFUND_REVERSED') {
    const { error } = await admin
      .from('credit_transactions')
      .upsert(
        { user_id: userId, delta: pack.credits, reason: 'refund', pack_id: pack.id, external_id: `refund-reversed:${eventId}` },
        { onConflict: 'external_id', ignoreDuplicates: true },
      );
    if (error && (error as { code?: string }).code !== '23503') return json({ error: 'refund_reversal_failed', detail: error.message }, 500);
    await journalEvent(admin, event, pack.id);
    return json({ ok: true, refundReversed: !error, credits: pack.credits, userId });
  }

  // Tout le reste (TEST, BILLING_ISSUE d'un pack impossible, produits inconnus…) : journal + ack,
  // pour que RC ne re-tente pas et que l'événement reste visible dans le registre.
  await journalEvent(admin, event, pack?.id ?? null);
  return json({ ok: true, ignored: event.type ?? 'unknown' });
});
