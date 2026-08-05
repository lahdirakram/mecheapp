#!/usr/bin/env node
// backfill-iap-events.mjs — remplit le registre iap_events (0039) depuis des payloads d'événements
// RevenueCat copiés à la main (dashboard RC → Customer → Event Details, ou l'historique du webhook).
//
// LE CHEMIN PRÉFÉRÉ n'est PAS ce script : re-livrer les événements depuis le dashboard RC (bouton
// « Resend » de l'historique du webhook) rejoue le payload d'origine sur notre webhook déployé,
// qui journalise et dont les grants sont idempotents. Ce script n'existe que pour les événements
// trop anciens pour être re-livrés.
//
// Usage :
//   1. Coller les payloads dans un fichier JSON : un tableau d'objets événement, chacun étant
//      soit { "event": { ... } } (payload webhook complet) soit directement l'objet event.
//   2. set -a; source backoffice/.env.local; set +a       # cible la PROD (ou .env.gen-feed = staging)
//      node scripts/backfill-iap-events.mjs events.json            # dry-run : montre ce qui serait inséré
//      node scripts/backfill-iap-events.mjs events.json --commit   # insère (idempotent par event_id)
//
// N'écrit QUE iap_events (jamais credit_transactions : les crédits historiques existent déjà).

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const [, , file, ...flags] = process.argv;
const COMMIT = flags.includes('--commit');
if (!file) { console.error('Usage: node scripts/backfill-iap-events.mjs <events.json> [--commit]'); process.exit(1); }
if (!SUPABASE_URL || !SERVICE) { console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants (source un .env d\'abord).'); process.exit(1); }

const raw = JSON.parse(await import('node:fs/promises').then((fs) => fs.readFile(file, 'utf8')));
const events = (Array.isArray(raw) ? raw : [raw]).map((e) => e.event ?? e);

const packs = new Map();
{
  const r = await fetch(`${SUPABASE_URL}/rest/v1/credit_packs?select=id,product_id`, {
    headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}` },
  });
  if (!r.ok) { console.error(`credit_packs -> ${r.status}`); process.exit(1); }
  for (const p of await r.json()) packs.set(p.product_id, p.id);
}

let ok = 0;
for (const ev of events) {
  if (!ev?.id || !ev?.type) { console.log(`  ✗ événement sans id/type ignoré`); continue; }
  const row = {
    event_id: ev.id,
    type: ev.type,
    store: ev.store ?? null,
    environment: ev.environment ?? null,
    app_user_id: ev.app_user_id && UUID_RE.test(ev.app_user_id) ? ev.app_user_id : null,
    product_id: ev.product_id ?? null,
    pack_id: packs.get(ev.product_id) ?? null,
    transaction_id: ev.transaction_id ?? null,
    original_transaction_id: ev.original_transaction_id ?? null,
    price_usd: ev.price ?? null,
    price_local: ev.price_in_purchased_currency ?? null,
    currency: ev.currency ?? null,
    tax_percentage: ev.tax_percentage ?? null,
    commission_percentage: ev.commission_percentage ?? null,
    cancel_reason: ev.cancel_reason ?? null,
    purchased_at: ev.purchased_at_ms ? new Date(ev.purchased_at_ms).toISOString() : null,
    event: ev,
  };
  console.log(`  ${COMMIT ? '→' : '·'} ${row.event_id}  ${row.type}  ${row.product_id ?? '?'}  ${row.price_usd ?? '?'} USD  ${row.environment ?? '?'}  ${row.purchased_at ?? ''}`);
  if (!COMMIT) continue;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/iap_events?on_conflict=event_id`, {
    method: 'POST',
    headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, 'content-type': 'application/json', prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify(row),
  });
  if (!r.ok) { console.error(`  ✗ insert ${row.event_id} -> ${r.status}: ${await r.text()}`); continue; }
  ok++;
}
console.log(COMMIT ? `\n${ok}/${events.length} insérés (doublons ignorés).` : `\nDry-run : ${events.length} événements lus. Ajouter --commit pour insérer.`);
