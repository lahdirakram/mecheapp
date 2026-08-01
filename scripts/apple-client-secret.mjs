#!/usr/bin/env node
// Génère le "Secret Key (for OAuth)" du provider Apple de Supabase.
//
// ── Ce champ n'est PAS le fichier .p8 ───────────────────────────────────────────────────────────
// C'est un JWT signé AVEC le .p8. La confusion est facile et coûte une session : coller le contenu
// du .p8 est accepté par le formulaire et échoue silencieusement à la première connexion web.
// Le bandeau « Apple OAuth secret keys expire every 6 months » du dashboard est le signe qui
// tranche : un .p8 n'expire jamais, un JWT si. Apple plafonne `exp` à 6 mois (15777000 s).
//
// ── À REFAIRE TOUS LES 6 MOIS ──────────────────────────────────────────────────────────────────
// Passé l'expiration, la connexion Apple sur le WEB casse d'un coup, sans rien changer au code, et
// sans que rien ne prévienne. La connexion Apple NATIVE dans l'app n'est pas concernée (elle passe
// par le bundle id, pas par ce secret), donc la panne ne touche que le studio : facile à
// diagnostiquer de travers. La date d'expiration est affichée à la fin, à noter quelque part.
//
// Usage :
//   node scripts/apple-client-secret.mjs \
//     --team-id ABCDE12345 \
//     --key-id  KEY1234567 \
//     --services-id com.meche.web \
//     --p8 ~/Downloads/AuthKey_KEY1234567.p8
//
// Où trouver quoi, sur developer.apple.com :
//   team-id      : en haut à droite (Membership), 10 caractères
//   key-id       : Keys -> la clé "Sign In with Apple" -> Key ID
//   services-id  : Identifiers -> le Services ID (PAS l'App ID), c'est l'identifiant lui-même
//   p8           : téléchargé UNE SEULE FOIS à la création de la clé. Perdu = en recréer une.
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1]);
}

const teamId = args.get('team-id');
const keyId = args.get('key-id');
const servicesId = args.get('services-id');
const p8Path = args.get('p8');

if (!teamId || !keyId || !servicesId || !p8Path) {
  console.error('Manque un argument. Voir l\'en-tête du fichier pour les 4 requis et où les trouver.');
  process.exit(1);
}

const key = readFileSync(p8Path.replace(/^~/, process.env.HOME ?? '~'), 'utf8');
if (!key.includes('BEGIN PRIVATE KEY')) {
  console.error(`Ce fichier n'a pas l'air d'être une clé .p8 Apple : ${p8Path}`);
  process.exit(1);
}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

const now = Math.floor(Date.now() / 1000);
const SIX_MONTHS = 15777000; // le maximum accepté par Apple
const exp = now + SIX_MONTHS;

const header = { alg: 'ES256', kid: keyId };
const payload = {
  iss: teamId,
  iat: now,
  exp,
  aud: 'https://appleid.apple.com',
  // `sub` est le SERVICES ID (le client web), pas le bundle de l'app.
  sub: servicesId,
};

const signingInput = `${b64(header)}.${b64(payload)}`;
// `ieee-p1363` est obligatoire : JOSE veut la signature en r||s brut. Le défaut de Node est du DER,
// qu'Apple rejette avec un « invalid_client » qui ne dit pas pourquoi.
const signature = createSign('SHA256')
  .update(signingInput)
  .sign({ key, dsaEncoding: 'ieee-p1363' })
  .toString('base64url');

console.log(`${signingInput}.${signature}`);
console.error(`\n→ Colle ce JWT dans Supabase : Auth -> Providers -> Apple -> "Secret Key (for OAuth)".`);
console.error(`→ Expire le ${new Date(exp * 1000).toISOString().slice(0, 10)}. À refaire avant cette date.`);
