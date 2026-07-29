// Supprime les fichiers des buckets privés dont le compte propriétaire n'existe plus.
//
// POURQUOI CE SCRIPT EXISTE : `delete-account` retire bien les fichiers, mais une suppression faite
// autrement (dashboard, API admin, SQL) ne le fait pas — et Supabase interdit désormais de supprimer
// dans storage.objects en SQL, donc ces fichiers ne partent avec RIEN d'autre. Or la politique de
// confidentialité publiée promet l'effacement complet, et ces objets sont des photos de visage.
// Ils sont déjà inatteignables (les policies sont indexées sur l'uid du dossier, qui n'existe plus),
// mais inatteignable n'est pas effacé.
//
// Convention identique à gen-feed.mjs : dry-run par défaut, --commit pour appliquer.
//
//   source .env.gen-feed                 # ou exporter SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
//   deno run --allow-env --allow-net scripts/purge-orphan-media.ts
//   deno run --allow-env --allow-net scripts/purge-orphan-media.ts --commit
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!SUPABASE_URL || !SERVICE) {
  console.error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.');
  Deno.exit(1);
}
const COMMIT = Deno.args.includes('--commit');
const H = { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, 'content-type': 'application/json' };
const BUCKETS = ['selfies', 'generated', 'vault'];

// La liste de référence : tout dossier qui n'est pas l'uid d'un compte vivant est orphelin.
const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}` } });
if (!usersRes.ok) {
  console.error(`lecture des comptes impossible: ${usersRes.status}`);
  Deno.exit(1);
}
const alive = new Set(((await usersRes.json()).users as { id: string }[]).map((u) => u.id));
console.log(`${alive.size} compte(s) vivant(s)${COMMIT ? '' : '   (essai a blanc, rien ne sera supprime)'}\n`);

async function list(bucket: string, prefix: string) {
  const out: { name: string; id: string | null }[] = [];
  for (let offset = 0; ; offset += 100) {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ prefix, limit: 100, offset }),
    });
    if (!r.ok) throw new Error(`list ${bucket} ${r.status}: ${(await r.text()).slice(0, 140)}`);
    const page = (await r.json()) as { name: string; id: string | null }[];
    out.push(...page);
    if (page.length < 100) break;
  }
  return out;
}

let totalFiles = 0;
for (const bucket of BUCKETS) {
  // Au premier niveau, chaque entrée est un dossier nommé d'après l'uid (id null = dossier).
  const folders = (await list(bucket, '')).filter((e) => e.id === null).map((e) => e.name);
  const orphans = folders.filter((f) => !alive.has(f));
  console.log(`${bucket}: ${folders.length} dossier(s), ${orphans.length} orphelin(s)`);
  for (const uid of orphans) {
    const files = (await list(bucket, uid)).filter((e) => e.id !== null).map((e) => `${uid}/${e.name}`);
    totalFiles += files.length;
    console.log(`  ${uid}  ${files.length} fichier(s)`);
    if (COMMIT && files.length) {
      const del = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}`, {
        method: 'DELETE',
        headers: H,
        body: JSON.stringify({ prefixes: files }),
      });
      if (!del.ok) console.log(`    KO ${del.status}: ${(await del.text()).slice(0, 140)}`);
    }
  }
}
console.log(`\n${totalFiles} fichier(s) ${COMMIT ? 'supprime(s)' : 'a supprimer'}`);
if (!COMMIT && totalFiles) console.log('Relancer avec --commit pour appliquer.');
