// Prévient les personnes dont le premier essai a été débloqué gratuitement par
// scripts/unlock-first-tries.ts. Via l'API Resend, mêmes conventions que relance-verif-email.ts et
// relance-incident-gemini.ts.
//
// LA LISTE EST RECALCULÉE À CHAQUE EXÉCUTION, jamais lue dans un fichier exporté. Le critère : une
// génération dont `unlocked_at` est posé APRÈS la date de bascule et qui ne porte AUCUNE ligne
// `credit_transactions` d'`external_id = 'unlock:<gen>'`. Un déverrouillage payé écrit toujours ce
// débit (RPC `unlock_generation`, 0026), donc son absence est la signature d'un déverrouillage
// offert. C'est ce qui rend la liste reconstructible alors même que `locked` est retombé à false et
// que le critère d'origine a disparu.
//
// Les comptes supprimés depuis (tombstone 0035) et les pros sont écartés, comme dans les autres
// relances. Un email par personne, jamais d'envoi groupé.
//
// LE MOT « CRÉDIT » EST ABSENT VOLONTAIREMENT : ces destinataires n'ont jamais acheté, et le
// vocabulaire crédit n'existe pas avant le premier achat. Le message ne promet PAS non plus un
// nouvel essai : leur crédit de bienvenue est consommé, ils ont leur image, pas un essai de plus.
// Annoncer l'inverse serait faux dès qu'ils ouvrent l'app.
//
//   set -a; source backoffice/.env.local; set +a      # prod (SUPABASE_URL + SERVICE_ROLE_KEY)
//   export RESEND_API_KEY=...
//   deno run --allow-env --allow-net scripts/relance-first-try-offert.ts
//   deno run --allow-env --allow-net scripts/relance-first-try-offert.ts --only moi@exemple.com --commit
//   deno run --allow-env --allow-net scripts/relance-first-try-offert.ts --commit
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
const FROM = Deno.env.get('RELANCE_FROM') ?? 'Mèche <support@mecheapp.com>';

// Bascule de `locked_first_try` à '0' le 2026-08-31 vers 16h UTC. Tout `unlocked_at` antérieur
// appartient au régime payant, même sans débit retrouvé.
const SINCE = '2026-08-31T15:00:00Z';

if (!SUPABASE_URL || !SERVICE) {
  console.error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.');
  Deno.exit(1);
}
const COMMIT = Deno.args.includes('--commit');
const onlyIdx = Deno.args.indexOf('--only');
const ONLY = onlyIdx === -1 ? null : Deno.args[onlyIdx + 1];
if (COMMIT && !RESEND_KEY) {
  console.error('RESEND_API_KEY est requis pour envoyer (--commit).');
  Deno.exit(1);
}

const COPY = {
  fr: {
    subject: 'Cadeau : ton résultat Mèche est débloqué',
    lignes: [
      "Ton premier essai de coiffure dans Mèche s'était affiché en aperçu flouté, et découvrir le résultat net demandait un achat.",
      "On te l'offre. Ton résultat est déjà débloqué sur ton compte, en net, rien à payer et rien à faire.",
      "Il t'attend dans tes looks. Merci d'avoir essayé Mèche.",
    ],
    bonjour: 'Bonjour,',
    cta: 'Voir mon résultat',
    // Passerelle web/site/open.html : elle tente `meche://` et retombe sur la fiche store. Un lien
    // `meche://` posé directement dans le mail serait ignoré par une partie des clients (Gmail).
    url: 'https://mecheapp.com/ouvrir?lang=fr',
    signature: "L'équipe Mèche",
    aide: "Le bouton ouvre l'app Mèche sur ton téléphone.",
  },
  en: {
    subject: 'A gift: your Mèche result is unlocked',
    lignes: [
      'Your first hair try-on in Mèche came out as a blurred preview, and seeing the clear result meant buying it.',
      "It's our gift. Your result is already unlocked on your account, in full, nothing to pay and nothing to do.",
      'It is waiting in your looks. Thanks for trying Mèche.',
    ],
    bonjour: 'Hi,',
    cta: 'See my result',
    url: 'https://mecheapp.com/ouvrir?lang=en',
    signature: 'The Mèche team',
    aide: 'The button opens the Mèche app on your phone.',
  },
} as const;

// Palette de l'app (packages/core/src/theme/palette.ts) : fond blush, encre chaude, bouton encre.
// Tables + styles en ligne, 600px : c'est le seul HTML que les clients mail rendent tous pareil.
// Un <style> en tête serait retiré par Gmail, un flex ignoré par Outlook.
const html = (c: (typeof COPY)[keyof typeof COPY]) => `<!doctype html>
<html lang="${c === COPY.en ? 'en' : 'fr'}"><body style="margin:0;padding:0;background:#FCF8F4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FCF8F4;padding:32px 16px;">
 <tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid #EEE5DE;border-radius:16px;">
   <tr><td style="padding:36px 36px 8px 36px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2;color:#15110E;letter-spacing:-0.3px;">Mèche</td></tr>
   <tr><td style="padding:8px 36px 0 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#3D342B;">
    <p style="margin:0 0 16px 0;">${c.bonjour}</p>
    ${c.lignes.map((l) => `<p style="margin:0 0 16px 0;">${l}</p>`).join('\n    ')}
   </td></tr>
   <tr><td style="padding:12px 36px 4px 36px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
     <td style="background:#15110E;border-radius:999px;">
      <a href="${c.url}" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;color:#FCF8F4;text-decoration:none;">${c.cta}</a>
     </td>
    </tr></table>
   </td></tr>
   <tr><td style="padding:12px 36px 32px 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#8E8580;">
    <p style="margin:0 0 20px 0;">${c.aide}</p>
    <p style="margin:0;color:#3D342B;font-size:16px;">${c.signature}</p>
   </td></tr>
  </table>
 </td></tr>
</table>
</body></html>`;

// Repli texte, envoyé dans le même message : un client qui refuse le HTML doit lire la même chose.
const texte = (c: (typeof COPY)[keyof typeof COPY]) =>
  `${c.bonjour}\n\n${c.lignes.join('\n\n')}\n\n${c.cta} : ${c.url}\n\n${c.signature}`;

const headers = { apikey: SERVICE, authorization: `Bearer ${SERVICE}` };

// 1) Les générations déverrouillées depuis la bascule.
const q = new URLSearchParams({
  select: 'id,user_id',
  locked: 'is.false',
  unlocked_at: `gte.${SINCE}`,
});
const genRes = await fetch(`${SUPABASE_URL}/rest/v1/generations?${q}`, { headers });
if (!genRes.ok) {
  console.error(`lecture generations impossible: ${genRes.status} ${(await genRes.text()).slice(0, 140)}`);
  Deno.exit(1);
}
const gens = (await genRes.json()) as { id: string; user_id: string }[];

// 2) Celles qui ont été PAYÉES portent un débit 'unlock:<gen>' : on les retire. `*` est le joker
// PostgREST de `like`.
const txRes = await fetch(
  `${SUPABASE_URL}/rest/v1/credit_transactions?external_id=like.unlock:*&select=external_id`,
  { headers },
);
if (!txRes.ok) {
  console.error(`lecture credit_transactions impossible: ${txRes.status} ${(await txRes.text()).slice(0, 140)}`);
  Deno.exit(1);
}
const payees = new Set(((await txRes.json()) as { external_id: string }[]).map((t) => t.external_id.slice(7)));
const offertes = gens.filter((g) => !payees.has(g.id));
const userIds = [...new Set(offertes.map((g) => g.user_id))];

if (userIds.length === 0) {
  console.log('Aucun déverrouillage offert trouvé depuis la bascule. Rien à envoyer.');
  Deno.exit(0);
}

// 3) Profil : langue du message, et on écarte supprimés (tombstone 0035) et pros.
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

// 4) L'adresse, compte par compte, via l'API admin. Un compte introuvable est écarté sans erreur
// (supprimé entre-temps) : la liste doit refléter l'état du moment de l'envoi.
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

console.log(`${userIds.length} compte(s) débloqué(s) gratuitement, ${cibles.length} à écrire, ${ecartes} écarté(s).`);
if (ONLY) console.log(`--only : envoi de contrôle à ${ONLY} uniquement.`);
console.log(`expéditeur : ${FROM}\n`);
for (const c of envois) console.log(`  ${c.email}  (${c.lang})`);

if (!COMMIT) {
  console.log(`\nEssai à blanc, RIEN n'a été envoyé. Ajouter --commit pour envoyer.`);
  console.log(`\n--- FR : ${COPY.fr.subject} ---\n${texte(COPY.fr)}`);
  console.log(`\n--- EN : ${COPY.en.subject} ---\n${texte(COPY.en)}`);
  // Le HTML rendu est écrit à côté pour relecture dans un navigateur avant l'envoi.
  await Deno.writeTextFile('/tmp/meche-relance-fr.html', html(COPY.fr));
  await Deno.writeTextFile('/tmp/meche-relance-en.html', html(COPY.en));
  console.log(`\nAperçu HTML : /tmp/meche-relance-fr.html et /tmp/meche-relance-en.html`);
  Deno.exit(0);
}

// Endpoint batch : un message distinct par destinataire, 100 maximum par appel.
for (let i = 0; i < envois.length; i += 100) {
  const lot = envois.slice(i, i + 100);
  const r = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { authorization: `Bearer ${RESEND_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(
      lot.map((c) => ({
        from: FROM,
        to: [c.email],
        subject: COPY[c.lang].subject,
        html: html(COPY[c.lang]),
        text: texte(COPY[c.lang]),
      })),
    ),
  });
  const txt = await r.text();
  if (!r.ok) {
    console.error(`\nenvoi refusé (${r.status}) : ${txt.slice(0, 300)}`);
    Deno.exit(1);
  }
  console.log(`\n${lot.length} message(s) envoyé(s). Réponse Resend : ${txt.slice(0, 300)}`);
}
