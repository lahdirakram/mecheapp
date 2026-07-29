// Re-encode the feed's PNG images to JPEG. Egress is billed per byte and the feed is the most-read
// asset in the app: every new user scrolls it, while a generated result is only ever read by its own
// author. Measured on a production image: 1633 KB PNG -> 147 KB JPEG at the SAME resolution and no
// visible difference, because PNG is a format for flat colour and text, not photographs.
//
// Run with Deno (same imagescript encoder as the edge functions, so the output matches what the
// server produces). Requires the service key, like scripts/gen-feed.mjs:
//
//   export SUPABASE_URL=https://<ref>.supabase.co
//   export SUPABASE_SERVICE_ROLE_KEY=<service-role key for that project>
//
//   deno run --allow-env --allow-net scripts/reencode-feed.ts              # dry run, prints savings
//   deno run --allow-env --allow-net scripts/reencode-feed.ts --commit     # rewrite + repoint
//   deno run --allow-env --allow-net scripts/reencode-feed.ts --commit --delete-png
//
// Idempotent: it only looks at feed_items still pointing at a .png, so running it again after a
// gen-feed batch converts just the new ones. Staging first, then prod.
//
// It repoints `looks.image_url` as well: a look saved from the feed stores the image's FULL public
// URL, and the explore screen decides whether a card is already saved by comparing those strings.
// Rewriting feed_items alone would both break those thumbnails and lose the saved state.
import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts';

const QUALITY = 82; // no resize: the feed is displayed full-bleed, only the format changes

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!SUPABASE_URL || !SERVICE) {
  console.error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.');
  Deno.exit(1);
}
const COMMIT = Deno.args.includes('--commit');
const DELETE_PNG = Deno.args.includes('--delete-png');
const H = { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, 'content-type': 'application/json' };
const kb = (n: number) => `${(n / 1024).toFixed(0)} Ko`;

const items = (await (
  await fetch(`${SUPABASE_URL}/rest/v1/feed_items?select=id,image_url&image_url=like.*.png`, { headers: H })
).json()) as { id: string; image_url: string }[];

console.log(`${items.length} image(s) PNG dans le feed${COMMIT ? '' : '  (essai a blanc, rien ne sera ecrit)'}\n`);
let before = 0;
let after = 0;
let done = 0;

for (const [i, item] of items.entries()) {
  const label = `#${String(i + 1).padStart(2, '0')}`;
  try {
    const res = await fetch(item.image_url);
    if (!res.ok) throw new Error(`telechargement ${res.status}`);
    const png = new Uint8Array(await res.arrayBuffer());
    const img = (await Image.decode(png)) as Image;
    const jpg = (await img.encodeJPEG(QUALITY)) as Uint8Array;
    before += png.length;
    after += jpg.length;

    // `.../object/public/feed/studio/<uuid>.png` -> the storage path after the bucket name
    const path = item.image_url.split('/object/public/feed/')[1];
    if (!path) throw new Error('URL feed inattendue');
    const newPath = path.replace(/\.png$/i, '.jpg');
    const newUrl = `${SUPABASE_URL}/storage/v1/object/public/feed/${newPath}`;

    if (COMMIT) {
      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/feed/${newPath}`, {
        method: 'POST',
        headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, 'content-type': 'image/jpeg', 'x-upsert': 'true' },
        body: new Blob([jpg as BlobPart], { type: 'image/jpeg' }),
      });
      if (!up.ok) throw new Error(`upload ${up.status}: ${(await up.text()).slice(0, 120)}`);

      // Repoint the catalog row, then every look saved from it (matched on the exact old URL).
      const patch = async (table: string, query: string, body: unknown) => {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { method: 'PATCH', headers: H, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(`patch ${table} ${r.status}: ${(await r.text()).slice(0, 120)}`);
      };
      await patch('feed_items', `id=eq.${item.id}`, { image_url: newUrl });
      await patch('looks', `image_url=eq.${encodeURIComponent(item.image_url)}`, { image_url: newUrl });

      if (DELETE_PNG) {
        await fetch(`${SUPABASE_URL}/storage/v1/object/feed/${path}`, { method: 'DELETE', headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}` } });
      }
    }
    done++;
    console.log(`  ok ${label}  ${kb(png.length)} -> ${kb(jpg.length)}  (${(png.length / jpg.length).toFixed(1)}x)`);
  } catch (e) {
    console.log(`  KO ${label}  ${String(e instanceof Error ? e.message : e).slice(0, 140)}`);
  }
}

if (done) {
  console.log(`\n${done}/${items.length} traitees`);
  console.log(`total  ${kb(before)} -> ${kb(after)}   soit ${(before / after).toFixed(1)}x moins par lecture complete du feed`);
  if (!COMMIT) console.log('\nRelancer avec --commit pour appliquer.');
  else if (!DELETE_PNG) console.log('\nLes PNG sont conserves. Une fois le feed verifie dans l app, relancer avec --commit --delete-png pour les supprimer.');
}

// ── Suppression des PNG devenus orphelins ────────────────────────────────────────────────────────
// Passe SEPAREE, et volontairement pas liee a la boucle ci-dessus : apres un --commit les lignes
// pointent sur les .jpg, donc la requete du debut ne retrouve plus rien et il n'y aurait plus aucun
// PNG a supprimer. On repart donc du BUCKET, et on ne supprime qu'un fichier dont on a verifie
// qu'aucune ligne ne le reference (ni le catalogue, ni une meche enregistree depuis le feed).
if (DELETE_PNG) {
  if (!COMMIT) {
    console.log('\n--delete-png demande sans --commit : rien ne sera supprime.');
  } else {
    const listed: string[] = [];
    for (let offset = 0; ; offset += 100) {
      const r = await fetch(`${SUPABASE_URL}/storage/v1/object/list/feed`, {
        method: 'POST',
        headers: H,
        body: JSON.stringify({ prefix: 'studio', limit: 100, offset }),
      });
      if (!r.ok) throw new Error(`list ${r.status}: ${(await r.text()).slice(0, 140)}`);
      const page = (await r.json()) as { name: string }[];
      listed.push(...page.filter((o) => o.name.toLowerCase().endsWith('.png')).map((o) => `studio/${o.name}`));
      if (page.length < 100) break;
    }
    console.log(`\n${listed.length} PNG dans le bucket`);

    let removed = 0;
    for (const path of listed) {
      const url = `${SUPABASE_URL}/storage/v1/object/public/feed/${path}`;
      const q = `image_url=eq.${encodeURIComponent(url)}&select=id&limit=1`;
      const [inFeed, inLooks] = await Promise.all([
        (await fetch(`${SUPABASE_URL}/rest/v1/feed_items?${q}`, { headers: H })).json(),
        (await fetch(`${SUPABASE_URL}/rest/v1/looks?${q}`, { headers: H })).json(),
      ]);
      if (inFeed.length || inLooks.length) {
        console.log(`  garde  ${path}  (encore reference)`);
        continue;
      }
      const del = await fetch(`${SUPABASE_URL}/storage/v1/object/feed/${path}`, { method: 'DELETE', headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}` } });
      if (del.ok) removed++;
      else console.log(`  KO     ${path}  ${del.status}`);
    }
    console.log(`${removed} PNG supprimes`);
  }
}
