#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// copy-feed.mjs — copy the AI-generated feed from one Supabase project to another
// (staging -> prod), so the exact items you validated go live without re-generating.
//
// It moves BOTH halves that `db push` can't:
//   • the feed_items rows (generated ones = catalog_id is not null)
//   • their images (downloaded from the source `feed` bucket, re-uploaded to the dest)
// and it fixes the two things that break a naive copy:
//   • image_url is rewritten to the destination bucket
//   • catalog_id is remapped by slug (haircut_catalog ids differ per project)
//
// PREREQUISITE: push migrations 0014 + 0015 to the destination FIRST, so its
// haircut_catalog + `feed` bucket exist. This script only moves data.
//
// Dry-run by default (no writes). Add --commit to actually copy. Idempotent
// (upserts by id + x-upsert on storage), so it's safe to re-run.
//
//   # source defaults to your existing staging vars in .env.gen-feed
//   source .env.gen-feed
//   export DEST_URL=https://hqhnvjjbohzktoapsytj.supabase.co     # prod
//   export DEST_KEY=<PROD service_role key>                       # from meche-prod
//   node scripts/copy-feed.mjs                 # dry run: shows what would copy
//   node scripts/copy-feed.mjs --commit        # do it (default: published only)
//   node scripts/copy-feed.mjs --status all --publish --commit
//
// Requires Node 22.
// ─────────────────────────────────────────────────────────────────────────────
import { fileURLToPath } from 'node:url';

const SRC_URL = (process.env.SRC_URL ?? process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const SRC_KEY = process.env.SRC_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const DEST_URL = (process.env.DEST_URL ?? '').replace(/\/$/, '');
const DEST_KEY = process.env.DEST_KEY ?? '';

// image_url -> storage path inside the `feed` bucket (e.g. "studio/<uuid>.jpg")
export function pathFromUrl(url) {
  const marker = '/object/public/feed/';
  const i = (url ?? '').indexOf(marker);
  return i >= 0 ? url.slice(i + marker.length) : null;
}

function api(base, key) {
  const h = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };
  return {
    get: async (path) => {
      const r = await fetch(`${base}/rest/v1/${path}`, { headers: h });
      if (!r.ok) throw new Error(`GET ${path} -> ${r.status}: ${await r.text()}`);
      return r.json();
    },
    upsert: async (table, row, onConflict) => {
      const r = await fetch(`${base}/rest/v1/${table}?on_conflict=${onConflict}`, {
        method: 'POST',
        headers: { ...h, prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(row),
      });
      if (!r.ok) throw new Error(`UPSERT ${table} -> ${r.status}: ${await r.text()}`);
    },
    upload: async (path, bytes, contentType) => {
      const r = await fetch(`${base}/storage/v1/object/feed/${path}`, {
        method: 'POST',
        headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': contentType, 'x-upsert': 'true' },
        body: bytes,
      });
      if (!r.ok) throw new Error(`UPLOAD ${path} -> ${r.status}: ${await r.text()}`);
    },
  };
}

async function pool(items, n, worker) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await worker(items[idx], idx); }
  }));
  return out;
}

// Columns carried over (everything the app + provenance need; id/created_at preserved for idempotency).
const COLS = ['id', 'kind', 'name', 'tag', 'hair', 'mood', 'loves', 'descr', 'label', 'by', 'match', 'gen_meta', 'created_at'];

async function main() {
  const argv = process.argv.slice(2);
  const has = (f) => argv.includes(f);
  const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
  if (has('--help') || has('-h')) {
    console.log('Usage: node scripts/copy-feed.mjs [--status published|draft|all] [--publish] [--commit] [--concurrency N]');
    return;
  }
  const COMMIT = has('--commit');
  const PUBLISH = has('--publish'); // force status=published on the destination
  const STATUS = val('--status', 'published'); // which source items to copy
  const CONCURRENCY = Math.max(1, Math.min(6, Number(val('--concurrency', '3')) || 3));

  const die = (m) => { console.error(`✗ ${m}`); process.exit(1); };
  if (!SRC_URL || !SRC_KEY) die('source not set (SRC_URL/SRC_KEY, or SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY).');
  if (!DEST_URL || !DEST_KEY) die('destination not set (DEST_URL + DEST_KEY).');
  if (SRC_URL === DEST_URL) die('source and destination are the same project.');
  if (!['published', 'draft', 'all'].includes(STATUS)) die(`--status must be published | draft | all (got "${STATUS}").`);

  const src = api(SRC_URL, SRC_KEY);
  const dest = api(DEST_URL, DEST_KEY);
  const srcHost = SRC_URL.replace(/^https?:\/\//, '').split('.')[0];
  const destHost = DEST_URL.replace(/^https?:\/\//, '').split('.')[0];
  console.log(`\nCopy feed  ·  ${srcHost} -> ${destHost}  ·  ${COMMIT ? 'COMMIT' : 'DRY RUN'}\n`);

  // Destination must already have the catalog (0014/0015). Build slug -> prod id remap.
  let destCat;
  try { destCat = await dest.get('haircut_catalog?select=id,slug'); } catch (e) { die(`can't read destination catalog: ${e.message}`); }
  if (!destCat.length) die('destination haircut_catalog is empty. Push migrations 0014 + 0015 to prod first.');
  const slugToId = Object.fromEntries(destCat.map((c) => [c.slug, c.id]));

  // Breakdown of generated items on the source (catalog_id is not null == came from gen-feed).
  const allGen = await src.get('feed_items?select=status&catalog_id=not.is.null');
  const byStatus = allGen.reduce((m, r) => ((m[r.status] = (m[r.status] || 0) + 1), m), {});
  console.log(`source generated items: ${allGen.length}  (${Object.entries(byStatus).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none'})`);

  const statusFilter = STATUS === 'all' ? '' : `&status=eq.${STATUS}`;
  const rows = await src.get(`feed_items?select=${COLS.join(',')},status,image_url,haircut_catalog(slug)&catalog_id=not.is.null${statusFilter}&order=created_at.asc`);
  console.log(`selected to copy (--status ${STATUS}): ${rows.length}${PUBLISH ? ', forced to published on dest' : ''}\n`);

  const missingSlug = rows.filter((r) => r.haircut_catalog?.slug && !slugToId[r.haircut_catalog.slug]).length;
  if (missingSlug) console.log(`! ${missingSlug} row(s) reference a style slug not on the destination -> their catalog_id will be null.\n`);

  if (!COMMIT) {
    rows.slice(0, 12).forEach((r, i) => console.log(`  ${String(i + 1).padStart(2, '0')}  ${r.status}  ${r.haircut_catalog?.slug ?? '(no style)'}  ${pathFromUrl(r.image_url)}`));
    if (rows.length > 12) console.log(`  … and ${rows.length - 12} more`);
    console.log(`\nDry run: would copy ${rows.length} item(s) + images. Re-run with --commit.\n`);
    return;
  }

  let ok = 0;
  const fails = [];
  await pool(rows, CONCURRENCY, async (r, idx) => {
    const label = `#${String(idx + 1).padStart(2, '0')} ${r.haircut_catalog?.slug ?? '?'}`;
    try {
      const path = pathFromUrl(r.image_url);
      if (!path) throw new Error('image_url has no feed path');
      // Source bucket is public — fetch the image directly, re-upload to the destination bucket.
      const imgRes = await fetch(r.image_url);
      if (!imgRes.ok) throw new Error(`download ${imgRes.status}`);
      const bytes = Buffer.from(await imgRes.arrayBuffer());
      const ct = imgRes.headers.get('content-type') || (path.endsWith('.png') ? 'image/png' : 'image/jpeg');
      await dest.upload(path, bytes, ct);

      const rowOut = {};
      for (const c of COLS) rowOut[c] = r[c];
      rowOut.image_url = `${DEST_URL}/storage/v1/object/public/feed/${path}`;
      rowOut.catalog_id = r.haircut_catalog?.slug ? (slugToId[r.haircut_catalog.slug] ?? null) : null;
      rowOut.status = PUBLISH ? 'published' : r.status;
      await dest.upsert('feed_items', [rowOut], 'id');
      ok++;
      console.log(`  ✓ ${label}  ${path}`);
    } catch (e) {
      const msg = String(e?.message ?? e);
      fails.push({ label, msg });
      console.log(`  ✗ ${label}  ${msg.slice(0, 120)}`);
    }
  });

  console.log(`\nDone. ${ok} copied, ${fails.length} failed.`);
  if (!PUBLISH) console.log('Items keep their source status. Publish drafts on prod when ready:\n  update feed_items set status=\'published\' where status=\'draft\' and catalog_id is not null;');
  console.log('');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(`✗ ${e?.message ?? e}`); process.exit(1); });
}
