// Relance les comptes restés bloqués en vérification d'email, via l'API Resend.
//
// POURQUOI CE SCRIPT EXISTE : Resend est configuré dans Supabase comme serveur SMTP, et ça ne sert
// QU'aux emails d'authentification (confirmation, réinitialisation). Supabase n'expose aucun moyen
// d'envoyer un message arbitraire. Le compte Resend, lui, le fait très bien par son API : c'est le
// même fournisseur et le même domaine vérifié, donc la même délivrabilité que les emails de l'app.
//
// LA LISTE EST RECALCULÉE À CHAQUE EXÉCUTION, jamais lue depuis un CSV figé. Entre le moment où on
// prépare l'envoi et celui où on l'exécute, quelqu'un peut très bien avoir confirmé son compte tout
// seul. Lui écrire "ton compte est bloqué" serait au mieux ridicule, au pire inquiétant.
//
// UN EMAIL PAR PERSONNE (endpoint batch), jamais un envoi groupé : seize adresses de vraies
// utilisatrices dans un même champ To se divulgueraient les unes aux autres.
//
// Convention identique à purge-orphan-media.ts : dry-run par défaut, --commit pour envoyer.
//
//   set -a; source backoffice/.env.local; set +a      # prod (SUPABASE_URL + SERVICE_ROLE_KEY)
//   export RESEND_API_KEY=...                          # ou l'ajouter au même fichier
//   deno run --allow-env --allow-net scripts/relance-verif-email.ts
//   deno run --allow-env --allow-net scripts/relance-verif-email.ts --only moi@exemple.com --commit
//   deno run --allow-env --allow-net scripts/relance-verif-email.ts --commit
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
const FROM = Deno.env.get('RELANCE_FROM') ?? 'Mèche <support@mecheapp.com>';

if (!SUPABASE_URL || !SERVICE) {
  console.error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.');
  Deno.exit(1);
}
const COMMIT = Deno.args.includes('--commit');
// Envoi de contrôle à une seule adresse (la tienne) avant la vraie salve.
const onlyIdx = Deno.args.indexOf('--only');
const ONLY = onlyIdx === -1 ? null : Deno.args[onlyIdx + 1];
if (COMMIT && !RESEND_KEY) {
  console.error('RESEND_API_KEY est requis pour envoyer (--commit).');
  Deno.exit(1);
}

const SUBJECT = 'Ton compte Mèche est débloqué';
const BODY = `Bonjour,

Tu as créé un compte Mèche ces derniers jours, et tu n'as jamais pu valider ton adresse email.
Le problème venait de chez nous : le code que tu recevais n'avait pas le format attendu par
l'application, qui le refusait quoi que tu fasses. Tu n'y étais pour rien.

C'est réparé.

Pour entrer, en trois points :

1. Ouvre l'application Mèche, puis choisis "Créer un compte" avec cette même adresse email.
   C'est bien "Créer un compte" et non "Se connecter", sinon l'erreur reviendra.
2. Reprends le mot de passe que tu avais choisi la première fois, si tu l'as encore en tête.
3. Tu recevras un nouveau code à 6 chiffres. Celui-là fonctionnera.

Ton essai t'attend, il n'a pas bougé.

Toutes nos excuses pour le temps perdu, et merci de retenter.

L'équipe Mèche`;

type AdminUser = {
  email?: string;
  email_confirmed_at?: string | null;
  created_at?: string;
  app_metadata?: { provider?: string };
};

// Pagination explicite : la liste doit être complète, un oubli silencieux se traduirait par
// quelqu'un qu'on laisse bloqué.
const users: AdminUser[] = [];
for (let page = 1; ; page++) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=200`, {
    headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}` },
  });
  if (!r.ok) {
    console.error(`lecture des comptes impossible: ${r.status} ${(await r.text()).slice(0, 140)}`);
    Deno.exit(1);
  }
  const batch = ((await r.json()).users ?? []) as AdminUser[];
  users.push(...batch);
  if (batch.length < 200) break;
}

const cibles = users
  .filter((u) => !!u.email)
  .filter((u) => u.app_metadata?.provider === 'email')
  .filter((u) => !u.email_confirmed_at)
  // Adresses de test : elles rebondiraient et abîmeraient la réputation du domaine.
  .filter((u) => !/@example\.com$/i.test(u.email!))
  .map((u) => ({ email: u.email!, cree: (u.created_at ?? '').slice(0, 10) }))
  .sort((a, b) => a.cree.localeCompare(b.cree));

const envois = ONLY ? [{ email: ONLY, cree: 'controle' }] : cibles;

console.log(`${users.length} compte(s) au total, ${cibles.length} bloqué(s) en vérification.`);
if (ONLY) console.log(`--only : envoi de contrôle à ${ONLY} uniquement.`);
console.log(`expéditeur : ${FROM}`);
console.log(`objet      : ${SUBJECT}\n`);
for (const c of envois) console.log(`  ${c.email}  (inscrit le ${c.cree})`);

if (!COMMIT) {
  console.log(`\nEssai à blanc, RIEN n'a été envoyé. Ajouter --commit pour envoyer.`);
  console.log(`\n--- corps du message ---\n${BODY}`);
  Deno.exit(0);
}
if (envois.length === 0) {
  console.log('\nPersonne à relancer.');
  Deno.exit(0);
}

// Endpoint batch : un message distinct par destinataire, 100 maximum par appel.
for (let i = 0; i < envois.length; i += 100) {
  const lot = envois.slice(i, i + 100);
  const r = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { authorization: `Bearer ${RESEND_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(lot.map((c) => ({ from: FROM, to: [c.email], subject: SUBJECT, text: BODY }))),
  });
  const txt = await r.text();
  if (!r.ok) {
    console.error(`\nenvoi refusé (${r.status}) : ${txt.slice(0, 300)}`);
    Deno.exit(1);
  }
  console.log(`\n${lot.length} message(s) envoyé(s). Réponse Resend : ${txt.slice(0, 300)}`);
}
