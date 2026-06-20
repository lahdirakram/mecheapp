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

  // One RevenueCat project feeds BOTH backends (a single store app can only have one RC project).
  // Each deployment acts ONLY on its own environment — set IAP_ENV=SANDBOX on staging,
  // IAP_ENV=PRODUCTION (or leave unset) on prod. Add both Supabase webhook URLs in RevenueCat; the
  // one that doesn't match acks and ignores. So TestFlight/sandbox purchases grant on staging and
  // App Store purchases grant on prod, with no cross-contamination.
  const IAP_ENV = (Deno.env.get('IAP_ENV') ?? 'PRODUCTION').toUpperCase();
  if (event.environment && event.environment.toUpperCase() !== IAP_ENV) {
    return json({ ok: true, ignored_env: event.environment });
  }

  // Only consumable (non-renewing) purchases grant credits. Other events (TEST, CANCELLATION,
  // subscription types) are acknowledged with 200 so RevenueCat doesn't retry them.
  if (event.type !== 'NON_RENEWING_PURCHASE') return json({ ok: true, ignored: event.type ?? 'unknown' });

  const eventId = event.id;
  const userId = event.app_user_id;
  const productId = event.product_id;
  // Anonymous RevenueCat ids ($RCAnonymousID:...) can't be mapped to a Supabase user — the client
  // must logIn(user.id) before purchasing. Ack so RC stops retrying, but grant nothing.
  if (!eventId || !userId || !productId || userId.startsWith('$RCAnonymousID')) {
    return json({ ok: true, skipped: 'unmappable' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE);

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
