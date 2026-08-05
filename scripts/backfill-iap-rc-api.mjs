#!/usr/bin/env node
// backfill-iap-rc-api.mjs — remplit le registre iap_events (0039) depuis l'API v2 RevenueCat.
//
// Pour l'HISTORIQUE d'avant le registre, quand le resend des webhooks n'est pas possible. L'API v2
// donne par achat `total_revenue_in_usd` { gross, commission, tax, proceeds } calculé par RC :
// c'est même plus riche que le webhook (montants absolus, pas des pourcentages estimés).
//
// Rapprochement : pour que le backoffice cesse d'ESTIMER un achat déjà couvert, la ligne insérée
// doit porter le même event_id que credit_transactions.external_id (l'id du webhook d'origine).
// L'API ne renvoie pas cet id, donc on apparie chaque achat RC à la ligne de crédits du même
// utilisateur, même pack, la plus proche dans le temps (le webhook arrivait quelques secondes
// après l'achat), et on reprend son external_id. Un achat sans ligne (compte emporté par la
// cascade d'avant 0035) reçoit un id synthétique `rcapi:<purchase_id>`.
//
// N'écrit QUE iap_events, jamais les crédits. Dry-run par défaut, idempotent par event_id.
//
// Usage :
//   export RC_API_KEY=sk_...        # clé SECRÈTE v2 (dashboard RC -> Project settings -> API keys)
//   set -a; source backoffice/.env.local; set +a          # cible la PROD
//   node scripts/backfill-iap-rc-api.mjs                  # dry-run, acheteurs connus de la base
//   node scripts/backfill-iap-rc-api.mjs <customer_id...> # + des clients RC hors base (compte
//                                                         #   supprimé : l'id est dans l'URL de sa
//                                                         #   fiche RC, Customers -> profil)
//   node scripts/backfill-iap-rc-api.mjs --commit [ids]
//
// On ne PAGINE PAS tous les clients du projet : les acheteurs sont déjà connus
// (credit_transactions.user_id), on interroge directement leurs fiches. L'id d'ÉVÉNEMENT
// (external_id) n'est pas une ressource adressable de l'API, lui ne sert qu'au rapprochement.

const RC_KEY = process.env.RC_API_KEY ?? '';
const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const COMMIT = process.argv.includes('--commit');
const RC = 'https://api.revenuecat.com/v2';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const die = (m) => { console.error(`✗ ${m}`); process.exit(1); };
if (!RC_KEY) die('RC_API_KEY manquant (clé secrète v2, sk_...).');
if (!SUPABASE_URL || !SERVICE) die('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants (source un .env d\'abord).');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function rc(path, { okStatuses = [] } = {}) {
  // `next_page` peut revenir en chemin relatif (/v2/...) ou en URL absolue selon les endpoints :
  // on normalise ici au lieu de préfixer aveuglément (un double préfixe = 404 resource_missing).
  const full = path.startsWith('http') ? path : `${RC}${path.replace(/^\/v2/, '')}`;
  // Retries réseau : un ConnectTimeout ponctuel ne doit pas tuer tout le backfill.
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(full, { headers: { authorization: `Bearer ${RC_KEY}` } });
      if (r.ok) return r.json();
      if (okStatuses.includes(r.status)) return null;
      if ((r.status === 429 || r.status >= 500) && attempt < 4) { await sleep(attempt * 2000); continue; }
      die(`RC GET ${full} -> ${r.status}: ${await r.text()}`);
    } catch (e) {
      if (attempt >= 4) die(`RC GET ${full} -> ${String(e?.cause?.code ?? e?.message ?? e)} (après ${attempt} tentatives)`);
      console.log(`  … réseau capricieux (${String(e?.cause?.code ?? e?.message ?? e)}), retry ${attempt}/3`);
      await sleep(attempt * 2000);
    }
  }
}
/** Suit la pagination v2 (items + next_page). */
async function rcAll(path, opts) {
  const out = [];
  let url = `${path}${path.includes('?') ? '&' : '?'}limit=100`;
  while (url) {
    const page = await rc(url, opts);
    if (!page) return null; // 404 toléré (client inconnu de RC)
    out.push(...(page.items ?? []));
    url = page.next_page ?? null;
  }
  return out;
}
const sbHeaders = { apikey: SERVICE, authorization: `Bearer ${SERVICE}` };
async function sbGet(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders });
  if (!r.ok) die(`supabase GET ${path} -> ${r.status}: ${await r.text()}`);
  return r.json();
}

// ── contexte : projet RC, produits (id interne -> identifiant store), packs, crédits existants ──
const projects = (await rc('/projects?limit=20')).items ?? [];
if (!projects.length) die('aucun projet visible avec cette clé.');
const project = projects[0];
if (projects.length > 1) console.log(`! ${projects.length} projets, on prend "${project.name}" (${project.id}).`);
console.log(`Projet RC : ${project.name} (${project.id})`);

const products = await rcAll(`/projects/${project.id}/products`);
const storeIdByProduct = new Map(products.map((p) => [p.id, p.store_identifier]));

const packs = new Map((await sbGet('credit_packs?select=id,product_id')).map((p) => [p.product_id, p.id]));

// Lignes d'achat existantes, pour le rapprochement (external_id = event id du webhook d'origine).
const ctRows = await sbGet('credit_transactions?reason=eq.purchase&select=user_id,external_id,pack_id,created_at&order=created_at.asc');
const usedExternalIds = new Set();

const already = new Set((await sbGet('iap_events?select=event_id')).map((e) => e.event_id));

// ── clients ciblés : les acheteurs connus de la base + les ids passés en argument ─────────────
const extraIds = process.argv.slice(2).filter((a) => a !== '--commit');
const targets = [...new Set([...ctRows.map((c) => c.user_id), ...extraIds])];
console.log(`${targets.length} client(s) ciblé(s), ${ctRows.length} achats en base, ${already.size} événements déjà au registre.\n`);

let planned = 0, inserted = 0, skippedKnown = 0, notPack = 0;
for (const custId of targets) {
  const purchases = await rcAll(`/projects/${project.id}/customers/${encodeURIComponent(custId)}/purchases`, { okStatuses: [404] });
  if (purchases == null) { console.log(`  ! ${custId} inconnu de RevenueCat, ignoré`); continue; }
  for (const p of purchases) {
    const storeProductId = storeIdByProduct.get(p.product_id) ?? p.product_id ?? null;
    const packId = packs.get(storeProductId) ?? null;
    if (!packId) { notPack++; continue; } // abonnements Pro et inconnus : hors périmètre du backfill
    // Vécu : la doc dit `total_revenue_in_usd`, l'API renvoie `revenue_in_usd`. On lit les deux.
    const rev = p.revenue_in_usd ?? p.total_revenue_in_usd ?? {};
    const purchasedAt = p.purchased_at ? new Date(p.purchased_at).toISOString() : null;

    // Rapprochement : ligne de crédits du même user + pack, la plus proche en temps (< 24 h),
    // pas encore appariée. Son external_id devient l'event_id du registre.
    let match = null;
    if (UUID_RE.test(custId) && purchasedAt) {
      const t = new Date(purchasedAt).getTime();
      for (const ct of ctRows) {
        if (ct.user_id !== custId || ct.pack_id !== packId || !ct.external_id) continue;
        if (usedExternalIds.has(ct.external_id)) continue;
        const dt = Math.abs(new Date(ct.created_at).getTime() - t);
        if (dt < 24 * 3600_000 && (!match || dt < match.dt)) match = { ct, dt };
      }
    }
    const eventId = match ? match.ct.external_id : `rcapi:${p.id}`;
    if (match) usedExternalIds.add(match.ct.external_id);
    if (already.has(eventId)) { skippedKnown++; continue; }

    const gross = rev.gross ?? null;
    const row = {
      event_id: eventId,
      type: 'NON_RENEWING_PURCHASE',
      store: (p.store ?? '').toUpperCase() || null,
      environment: (p.environment ?? '').toUpperCase() || null, // le webhook écrit PRODUCTION/SANDBOX
      app_user_id: UUID_RE.test(custId) ? custId : null,
      product_id: storeProductId,
      pack_id: packId,
      transaction_id: p.store_purchase_identifier ?? null,
      original_transaction_id: null,
      price_usd: gross,
      price_local: null, // l'API v2 ne donne pas le prix payé en devise locale
      currency: rev.currency ?? 'USD',
      tax_percentage: gross ? (rev.tax ?? 0) / gross : null,
      commission_percentage: gross ? (rev.commission ?? 0) / gross : null,
      cancel_reason: null,
      purchased_at: purchasedAt,
      event: { source: 'rcapi-backfill', purchase: p },
    };
    planned++;
    console.log(`  ${COMMIT ? '→' : '·'} ${eventId}${match ? '' : '  (SANS ligne de crédits : compte disparu)'}\n      ${storeProductId}  ${gross ?? '?'} USD (comm ${rev.commission ?? '?'}, tax ${rev.tax ?? '?'})  ${row.environment}  ${purchasedAt}`);
    if (!COMMIT) continue;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/iap_events?on_conflict=event_id`, {
      method: 'POST',
      headers: { ...sbHeaders, 'content-type': 'application/json', prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify(row),
    });
    if (!r.ok) { console.error(`  ✗ insert -> ${r.status}: ${await r.text()}`); continue; }
    inserted++;
  }
}

console.log(`\n${planned} achat(s) de packs à insérer · ${skippedKnown} déjà au registre · ${notPack} achats hors packs ignorés (abonnements Pro…).`);
console.log(COMMIT ? `${inserted} insérés.` : 'Dry-run : rien écrit. Ajouter --commit pour insérer.');
