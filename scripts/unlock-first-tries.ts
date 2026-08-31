// Déverrouille GRATUITEMENT les premiers essais restés bloqués derrière le paywall, quand
// `app_config.locked_first_try` repasse à '0'.
//
// POURQUOI CE SCRIPT EXISTE : éteindre le verrou ne débloque PAS le passé. Les comptes qui ont
// essayé pendant que le flag était à '1' ont consommé leur crédit de bienvenue, leur image nette
// dort dans le bucket `vault`, et une fois le flag éteint ils se retrouvent à 0 crédit devant un
// résultat flouté que plus rien ne peut révéler : le seul chemin de révélation (`unlock`) coûte un
// crédit qu'ils n'ont pas et que le produit ne leur vend plus de la même manière. Sans ce script,
// leur image reste prisonnière pour toujours.
//
// LE DÉVERROUILLAGE EST OFFERT, DONC IL N'ÉCRIT RIEN AU GRAND LIVRE. Pas de `admin_grant_credits`
// suivi d'un débit : ce serait inventer un crédit acheté (`admin_grant` compte du côté PAYANT du
// replay free/paid, il ferait basculer ces comptes en « a déjà acheté ») pour le reprendre aussitôt,
// et un échec entre les deux laisserait un crédit fantôme. On fait donc ce que fait la fonction
// `unlock` MOINS le débit : déplacer vault → generated, repointer la ligne et le look, lever
// `locked`. L'invariant « débit avant révélation » (0026) n'est pas contourné, il est hors sujet :
// il protège le chemin PAYANT contre un client qui pollerait le chemin net prédictible ; ici c'est
// le service_role qui offre la révélation, délibérément.
//
// `unlocked_at` sans ligne `credit_transactions` d'`external_id = 'unlock:<gen>'` devient donc la
// SIGNATURE d'un déverrouillage offert. C'est ce qui permet de recalculer la liste des personnes à
// prévenir après coup (scripts/relance-first-try-offert.ts) au lieu de dépendre d'un fichier
// exporté : une fois `locked` levé, le critère d'origine a disparu.
//
// Ce qui est volontairement laissé de côté : les lignes verrouillées SANS `vault_path` (34 au
// 2026-08-31). Ce sont des looks supprimés par leur propriétaire, dont `unlock {discard:true}` a
// effacé l'image nette. Il n'y a rien à révéler, et rien à annoncer par email.
//
// Convention identique aux autres scripts : dry-run par défaut, --commit pour appliquer.
//
//   set -a; source backoffice/.env.local; set +a   # prod (SUPABASE_URL + SERVICE_ROLE_KEY)
//   deno run --allow-env --allow-net scripts/unlock-first-tries.ts
//   deno run --allow-env --allow-net scripts/unlock-first-tries.ts --limit 1 --commit   # essai réel
//   deno run --allow-env --allow-net scripts/unlock-first-tries.ts --commit
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!SUPABASE_URL || !SERVICE) {
  console.error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.');
  Deno.exit(1);
}
const COMMIT = Deno.args.includes('--commit');
// Pour dérouler la chaîne complète sur un seul compte avant la salve.
const limIdx = Deno.args.indexOf('--limit');
const LIMIT = limIdx === -1 ? Infinity : Number(Deno.args[limIdx + 1]);

const H = { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, 'content-type': 'application/json' };

type Gen = { id: string; user_id: string; result_path: string | null; vault_path: string; created_at: string };

const q = new URLSearchParams({
  select: 'id,user_id,result_path,vault_path,created_at',
  locked: 'is.true',
  status: 'eq.done',
  vault_path: 'not.is.null',
  order: 'created_at.asc',
});
const res = await fetch(`${SUPABASE_URL}/rest/v1/generations?${q}`, { headers: H });
if (!res.ok) {
  console.error(`lecture generations impossible: ${res.status} ${(await res.text()).slice(0, 200)}`);
  Deno.exit(1);
}
const rows = (await res.json()) as Gen[];

// Posséder la ligne n'est pas posséder le chemin : le service_role passe outre les policies storage,
// donc on ne touche jamais un chemin hors du dossier de son propriétaire (même garde que `unlock`).
const cibles = rows.filter((g) => g.vault_path.startsWith(`${g.user_id}/`));
const suspects = rows.length - cibles.length;

console.log(
  `${rows.length} essai(s) verrouillé(s) avec une image nette en vault, ${cibles.length} à débloquer` +
    (suspects ? `, ${suspects} écarté(s) (chemin hors du dossier propriétaire)` : '') +
    `${COMMIT ? '' : '   (essai à blanc, rien ne sera modifié)'}\n`,
);

if (!COMMIT) {
  for (const g of cibles.slice(0, 10)) console.log(`  ${g.created_at.slice(0, 10)}  ${g.user_id}  ${g.vault_path}`);
  if (cibles.length > 10) console.log(`  ... et ${cibles.length - 10} autre(s)`);
  console.log(`\nRIEN n'a été fait. Ajouter --commit pour débloquer.`);
  Deno.exit(0);
}

/** Déplace un objet d'un bucket à l'autre en gardant le même chemin. */
async function move(from: string, to: string, key: string): Promise<boolean> {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/move`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ bucketId: from, sourceKey: key, destinationBucket: to, destinationKey: key }),
  });
  if (r.ok) return true;
  // Une exécution précédente a pu déjà le déplacer : ce n'est un échec que si le fichier est
  // confirmé absent de la destination.
  const slash = key.lastIndexOf('/');
  const l = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${to}`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ prefix: key.slice(0, slash), limit: 1, search: key.slice(slash + 1) }),
  });
  return l.ok && ((await l.json()) as unknown[]).length > 0;
}

let ok = 0;
let echecs = 0;
for (const g of cibles.slice(0, LIMIT)) {
  const clear = g.vault_path;
  const thumb = `${g.user_id}/${g.id}-thumb.jpg`;

  // 1) L'image nette d'abord. Tant qu'elle n'a pas atterri, on ne touche à rien : une ligne
  // déverrouillée qui pointe sur un objet absent afficherait une image cassée, pire que le flou.
  if (!(await move('vault', 'generated', clear))) {
    console.error(`  ÉCHEC déplacement  ${g.id}  ${clear}`);
    echecs++;
    continue;
  }
  // La vignette est une optimisation : les lignes d'avant 0028 n'en ont pas, et son absence fait
  // seulement retomber les grilles sur l'image pleine.
  const withThumb = await move('vault', 'generated', thumb);

  // 2) La ligne, puis le look. `locked` tombe dans le même update que le repointage, jamais avant.
  const patch = await fetch(`${SUPABASE_URL}/rest/v1/generations?id=eq.${g.id}`, {
    method: 'PATCH',
    headers: H,
    body: JSON.stringify({
      result_path: clear,
      thumb_path: withThumb ? thumb : null,
      vault_path: null,
      locked: false,
      unlocked_at: new Date().toISOString(),
    }),
  });
  if (!patch.ok) {
    console.error(`  ÉCHEC update generations  ${g.id}  ${patch.status} ${(await patch.text()).slice(0, 140)}`);
    echecs++;
    continue;
  }
  await fetch(`${SUPABASE_URL}/rest/v1/looks?generation_id=eq.${g.id}`, {
    method: 'PATCH',
    headers: H,
    body: JSON.stringify({ image_url: clear }),
  });
  // Le teaser flouté n'est plus référencé. Best-effort : un résidu est inerte.
  if (g.result_path && g.result_path !== clear) {
    await fetch(`${SUPABASE_URL}/storage/v1/object/generated`, {
      method: 'DELETE',
      headers: H,
      body: JSON.stringify({ prefixes: [g.result_path] }),
    });
  }
  ok++;
  if (ok % 25 === 0) console.log(`  ${ok} débloqué(s)...`);
}

console.log(`\n${ok} essai(s) débloqué(s), ${echecs} échec(s).`);
console.log(`Relancer le script reprend les échecs : il ne lit que les lignes encore verrouillées.`);
