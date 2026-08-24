// Écrit aux personnes dont les essais ont échoué pendant l'incident Gemini du 18-20 août 2026
// (plafond de dépense AI Studio atteint : tous les appels répondaient 429, aucun essai ne pouvait
// aboutir). Via l'API Resend, même canal et mêmes conventions que relance-verif-email.ts.
//
// LA LISTE EST RECALCULÉE À CHAQUE EXÉCUTION depuis le registre ai_calls (0036) : les échecs 429
// de la fenêtre de l'incident, un email par personne, jamais d'envoi groupé. Les comptes supprimés
// depuis (tombstone 0035) et les pros sont écartés. Vérifié avant l'envoi : les 110 générations
// échouées de la fenêtre sont toutes en status='failed' et toutes remboursées (aucun débit
// `gen:<id>` restant), donc le message peut affirmer « rien ne t'a été décompté ».
//
// LE MOT « CRÉDIT » EST ABSENT VOLONTAIREMENT : une partie des destinataires n'a jamais acheté, et
// le vocabulaire crédit n'existe pas avant le premier achat (règle UX du premier essai verrouillé).
// « Rien ne t'a été décompté » est vrai pour tout le monde.
//
//   set -a; source backoffice/.env.local; set +a      # prod (SUPABASE_URL + SERVICE_ROLE_KEY)
//   export RESEND_API_KEY=...                          # ou l'ajouter au même fichier
//   deno run --allow-env --allow-net scripts/relance-incident-gemini.ts
//   deno run --allow-env --allow-net scripts/relance-incident-gemini.ts --only moi@exemple.com --commit
//   deno run --allow-env --allow-net scripts/relance-incident-gemini.ts --commit
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
const FROM = Deno.env.get('RELANCE_FROM') ?? 'Mèche <support@mecheapp.com>';

// La fenêtre de l'incident, mesurée dans ai_calls : premier 429 le 18/08 à 14:14 UTC, dernier le
// 20/08 à 16:xx UTC, appels de nouveau verts à 19h UTC. Les bornes prennent un peu de marge.
const WINDOW_START = '2026-08-18T13:00:00Z';
const WINDOW_END = '2026-08-20T17:00:00Z';

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

const COPY = {
  fr: {
    subject: 'Tes essais Mèche ont échoué, c\'est réparé',
    body: `Bonjour,

Entre le 18 et le 20 août, tu as lancé un ou plusieurs essais de coiffure dans Mèche et ils ont échoué. Le problème venait entièrement de chez nous : notre service de génération d'images avait atteint sa limite et refusait toutes les demandes. Tu n'y étais pour rien.

Rien ne t'a été décompté. Chaque essai échoué a été annulé automatiquement.

C'est réparé, tout refonctionne normalement.

Toutes nos excuses pour la mauvaise expérience, et merci de retenter. Ton prochain essai aboutira.

L'équipe Mèche`,
  },
  en: {
    subject: 'Your Mèche try-ons failed, it\'s fixed now',
    body: `Hi,

Between August 18 and 20, you started one or more hair try-ons in Mèche and they failed. The problem was entirely on our side: our image generation service had hit its limit and was refusing every request. It was nothing you did.

Nothing was deducted from you. Every failed try-on was cancelled automatically.

It's fixed, everything is back to normal.

We're sorry for the poor experience, and thank you for trying again. Your next try-on will go through.

The Mèche team`,
  },
} as const;

const headers = { apikey: SERVICE, authorization: `Bearer ${SERVICE}` };

// 1) Les user_id touchés, depuis le registre ai_calls. `*` est le joker PostgREST de `like`.
const q = new URLSearchParams({
  select: 'user_id',
  ok: 'eq.false',
  error: 'like.gemini 429*',
  user_id: 'not.is.null',
});
q.append('created_at', `gte.${WINDOW_START}`);
q.append('created_at', `lte.${WINDOW_END}`);
const callsRes = await fetch(`${SUPABASE_URL}/rest/v1/ai_calls?${q}`, { headers });
if (!callsRes.ok) {
  console.error(`lecture ai_calls impossible: ${callsRes.status} ${(await callsRes.text()).slice(0, 140)}`);
  Deno.exit(1);
}
const userIds = [...new Set(((await callsRes.json()) as { user_id: string }[]).map((r) => r.user_id))];

// 2) Leur profil : langue pour la version du message, et on écarte supprimés (tombstone 0035) et
// pros (autre relation, autre canal, et « rien ne t'a été décompté » ne décrit pas leur quota).
const profRes = await fetch(
  `${SUPABASE_URL}/rest/v1/profiles?id=in.(${userIds.join(',')})&select=id,lang,role,deleted_at`,
  { headers },
);
if (!profRes.ok) {
  console.error(`lecture profiles impossible: ${profRes.status} ${(await profRes.text()).slice(0, 140)}`);
  Deno.exit(1);
}
const profils = new Map(
  ((await profRes.json()) as { id: string; lang: string | null; role: string | null; deleted_at: string | null }[])
    .map((p) => [p.id, p]),
);

// 3) L'adresse, compte par compte, via l'API admin. Un compte introuvable est simplement écarté
// (supprimé entre-temps), jamais une erreur : la liste doit refléter l'état du moment de l'envoi.
type Cible = { email: string; lang: 'fr' | 'en' };
const cibles: Cible[] = [];
let ecartes = 0;
for (const id of userIds) {
  const p = profils.get(id);
  if (!p || p.deleted_at || p.role === 'pro') {
    ecartes++;
    continue;
  }
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { headers });
  if (!r.ok) {
    ecartes++;
    continue;
  }
  const u = (await r.json()) as { email?: string };
  // Adresses de test : elles rebondiraient et abîmeraient la réputation du domaine.
  if (!u.email || /@example\.com$/i.test(u.email)) {
    ecartes++;
    continue;
  }
  cibles.push({ email: u.email, lang: p.lang === 'en' ? 'en' : 'fr' });
}
cibles.sort((a, b) => a.email.localeCompare(b.email));

const envois: Cible[] = ONLY ? [{ email: ONLY, lang: 'fr' }] : cibles;

console.log(`${userIds.length} compte(s) touché(s) par l'incident, ${cibles.length} à écrire, ${ecartes} écarté(s).`);
if (ONLY) console.log(`--only : envoi de contrôle à ${ONLY} uniquement.`);
console.log(`expéditeur : ${FROM}\n`);
for (const c of envois) console.log(`  ${c.email}  (${c.lang})`);

if (!COMMIT) {
  console.log(`\nEssai à blanc, RIEN n'a été envoyé. Ajouter --commit pour envoyer.`);
  console.log(`\n--- FR : ${COPY.fr.subject} ---\n${COPY.fr.body}`);
  console.log(`\n--- EN : ${COPY.en.subject} ---\n${COPY.en.body}`);
  Deno.exit(0);
}
if (envois.length === 0) {
  console.log('\nPersonne à écrire.');
  Deno.exit(0);
}

// Endpoint batch : un message distinct par destinataire, 100 maximum par appel.
for (let i = 0; i < envois.length; i += 100) {
  const lot = envois.slice(i, i + 100);
  const r = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { authorization: `Bearer ${RESEND_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(
      lot.map((c) => ({ from: FROM, to: [c.email], subject: COPY[c.lang].subject, text: COPY[c.lang].body })),
    ),
  });
  const txt = await r.text();
  if (!r.ok) {
    console.error(`\nenvoi refusé (${r.status}) : ${txt.slice(0, 300)}`);
    Deno.exit(1);
  }
  console.log(`\n${lot.length} message(s) envoyé(s). Réponse Resend : ${txt.slice(0, 300)}`);
}
