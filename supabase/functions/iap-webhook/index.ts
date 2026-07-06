// POST /functions/v1/iap-webhook
// RevenueCat webhook → grants consumable credit packs. This is the TRUSTED grant path: the client
// never adds credits itself, it only opens the store sheet; RevenueCat validates the receipt with
// Apple/Google and calls us here.
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
  /** Subscription events: when the current period ends (ms epoch). */
  expiration_at_ms?: number;
};

// Mèche Pro subscription events → upsert into `subscriptions` (one row per owner). The /generate
// quota check only trusts current_period_end, so a CANCELLATION keeps access until the paid period
// runs out and an EXPIRATION (past expiration_at_ms) cuts it off naturally.
const SUB_EVENTS = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE']);
const SUB_STATUS: Record<string, string> = {
  CANCELLATION: 'cancelled',
  EXPIRATION: 'expired',
  BILLING_ISSUE: 'billing_issue',
};

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

  const eventId = event.id;
  const userId = event.app_user_id;
  const productId = event.product_id;
  // Anonymous RevenueCat ids ($RCAnonymousID:...) can't be mapped to a Supabase user — the client
  // must logIn(user.id) before purchasing. Ack so RC stops retrying, but grant nothing.
  if (!eventId || !userId || !productId || userId.startsWith('$RCAnonymousID')) {
    return json({ ok: true, skipped: 'unmappable' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE);

  // ── Mèche Pro subscription (meche_pro_monthly) ─────────────────────────────
  if (SUB_EVENTS.has(event.type ?? '') && productId.startsWith('meche_pro')) {
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
    if (error) return json({ error: 'sub_upsert_failed', detail: error.message }, 500);
    return json({ ok: true, subscription: true, userId, until: event.expiration_at_ms ?? null });
  }

  // ── B2C consumable credit packs ────────────────────────────────────────────
  // Only consumable (non-renewing) purchases grant credits. Anything else (TEST, unknown
  // subscription products) is acknowledged with 200 so RevenueCat doesn't retry.
  if (event.type !== 'NON_RENEWING_PURCHASE') return json({ ok: true, ignored: event.type ?? 'unknown' });

  // Resolve how many credits this SKU is worth (and the internal pack id) from credit_packs.
  const { data: pack } = await admin.from('credit_packs').select('id, credits').eq('product_id', productId).maybeSingle();
  if (!pack) return json({ ok: true, skipped: 'unknown_product', productId });

  // Idempotent grant — external_id (the RC event id) is uniquely indexed, so a retried webhook
  // is a no-op. Returning rows tells us whether this call actually granted.
  const { data: inserted, error } = await admin
    .from('credit_transactions')
    .upsert(
      { user_id: userId, delta: pack.credits, reason: 'purchase', pack_id: pack.id, external_id: eventId },
      { onConflict: 'external_id', ignoreDuplicates: true },
    )
    .select('id');
  if (error) return json({ error: 'grant_failed', detail: error.message }, 500);

  return json({ ok: true, granted: (inserted?.length ?? 0) > 0, credits: pack.credits, userId });
});
