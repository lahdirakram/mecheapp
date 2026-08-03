// Studio-local i18n. No @meche/* import possible here (outside the pnpm workspace), so this is a
// deliberate, self-contained copy of the app's philosophy: seed from the environment, persist an
// explicit choice, never overwrite it.
//
// Detection order, first hit wins:
//   1. ?lang=fr|en        — the landing pages link /studio?lang=xx, explicit beats inference
//   2. localStorage       — a choice made in the studio itself (the header toggle)
//   3. the `lang` cookie  — set by server.js when the visitor picked a language on the site
//   4. navigator.language — fr* stays French, anything else reads English
// A ?lang hit is persisted, so the choice survives the OAuth redirect (which strips the query).
import { useSyncExternalStore } from 'react';

export type Lang = 'fr' | 'en';

const STORE_KEY = 'meche-lang';

function detect(): Lang {
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'fr' || q === 'en') {
      window.localStorage.setItem(STORE_KEY, q);
      return q;
    }
    const stored = window.localStorage.getItem(STORE_KEY);
    if (stored === 'fr' || stored === 'en') return stored;
    const cookie = document.cookie.match(/(?:^|;\s*)lang=(fr|en)(?:;|$)/)?.[1];
    if (cookie === 'fr' || cookie === 'en') return cookie;
  } catch {
    /* storage can be unavailable (private mode policies); detection just degrades */
  }
  return (navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

let lang: Lang = detect();
const listeners = new Set<() => void>();

/** Reflect the language into the document itself (lang attribute, title, meta description). */
function applyToDocument() {
  document.documentElement.lang = lang;
  document.title = STR[lang].title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', STR[lang].metaDesc);
}

export function getLang(): Lang {
  return lang;
}

export function setLang(next: Lang) {
  if (next === lang) return;
  lang = next;
  try {
    window.localStorage.setItem(STORE_KEY, next);
    // Keep the site cookie in step, so leaving the studio lands on the same language.
    document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* non-fatal */
  }
  applyToDocument();
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** React hook: re-renders on toggle. Components read strings through tr() in the same render. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang);
}

/* ── Strings ─────────────────────────────────────────────────────────────── */

const fr = {
  title: 'Mèche Studio · Vois-toi avant.',
  metaDesc: "Essaie une coupe sur ta propre photo, en trente secondes. Sans installer d'application.",

  /** Under-frame caption, one per funnel step. */
  captions: {
    portrait: 'Un portrait de face, bien éclairé, cheveux dégagés du visage.',
    look: 'Ton portrait. La coupe sera posée dessus, ton visage ne change pas.',
    account: 'Ton portrait. La coupe sera posée dessus, ton visage ne change pas.',
    generating: 'Ton visage, ta lumière et ton cadrage sont conservés.',
    paywall: "Aperçu basse définition. L'image nette attend, elle n'a jamais quitté le serveur.",
    revealing: "L'image nette arrive. Elle n'a jamais quitté le serveur, on vient d'en ouvrir l'accès.",
    result: 'Même visage, même lumière, même cadrage.',
  },

  steps: ['Portrait', 'Look', 'Compte', 'Résultat'] as readonly [string, string, string, string],
  stepsAria: 'Étapes',

  header: {
    credits: (n: number) => `${n} essai${n > 1 ? 's' : ''}`,
    signOutAria: (email: string) => `Se déconnecter de ${email}`,
    signOutFallbackAccount: 'ce compte',
    signOutTitle: 'Se déconnecter',
    signingOut: 'Sortie',
    signOut: 'Déconnexion',
  },

  frame: {
    empty: 'Ton portrait apparaît ici',
    altResult: (name: string) => `Résultat, ${name}`,
    altTeaser: 'Aperçu flouté de ton résultat',
    altPortrait: 'Ton portrait',
    badgeRevealing: 'Déverrouillage',
    badgeLocked: 'Aperçu verrouillé',
    badgeClear: 'Résultat net',
  },

  fallbackLook: 'ton essai',

  errors: {
    welcomeUsed: "Ton essai offert a déjà été utilisé sur ce compte. Prends des crédits pour lancer un nouvel essai.",
    launchFailed: "L'essai n'a pas pu être lancé. Réessaie.",
    revealFailed: "La révélation a échoué. Réessaie, aucun crédit n'a été perdu.",
    prepareFailed: "Cette photo n'a pas pu être préparée.",
  },

  portrait: {
    kicker: 'Étape 01',
    h: 'Commence par ',
    hEm: 'ton visage.',
    sub: 'Pas un mannequin, pas une simulation générique. La coupe est posée sur ta photo, avec ton visage, ta carnation et ta lumière.',
    dropBig: 'Dépose ta photo',
    dropSmall: 'ou clique pour choisir un fichier · JPG, PNG ou WebP',
    note: "Ta photo sert à générer ton essai, et à rien d'autre. Elle n'est jamais publiée, jamais utilisée pour entraîner un modèle. Tu peux la supprimer à tout moment.",
  },

  look: {
    kicker: 'Étape 02',
    h: 'Choisis, ou ',
    hEm: 'décris.',
    sub: "Une sélection éditoriale, ou tes propres mots. Tu n'as pas besoin de connaître le vocabulaire du salon.",
    fromFeed: 'Repéré dans le feed',
    fieldLabel: 'Ou dis-le avec tes mots',
    placeholder: 'un carré flou, plus court derrière, reflets miel',
    continue: 'Continuer',
    changePhoto: 'Changer de photo',
  },

  account: {
    kicker: 'Étape 03',
    h: "Où on t'envoie ",
    hEm: 'ton essai.',
    sub: 'La génération prend une trentaine de secondes. Ton essai reste rattaché à ce compte, donc tu le retrouves en revenant sur cette page.',
    google: 'Continuer avec Google',
    apple: 'Continuer avec Apple',
    or: 'ou',
    emailLabel: 'Ton email',
    emailPlaceholder: 'prenom@email.com',
    sending: 'Envoi…',
    sendCode: 'Recevoir mon code',
    note: (len: number) => `Pas de mot de passe à retenir. On envoie un code à ${len} chiffres, valable quelques minutes.`,
    sentH: 'Ton code est ',
    sentHEm: 'parti.',
    sentSub1: "On l'a envoyé à ",
    sentSub2: (len: number) => `. Il fait ${len} chiffres et se vérifie tout seul dès le dernier.`,
    codeLabel: 'Le code',
    changeAddress: "Changer d'adresse ou redemander un code",
    sessionFailed: 'La session ne s’est pas ouverte. Redemande un code.',
    startFailed: "La connexion n'a pas pu démarrer.",
    sendFailed: "Le code n'a pas pu être envoyé.",
    codeInvalid: 'Ce code est invalide ou expiré.',
  },

  generating: {
    kicker: 'Étape 04',
    h: 'On pose ta ',
    hEm: 'coupe.',
    phases: [
      'Lecture de ton portrait.',
      'Repérage de la ligne de cheveux.',
      'Pose de la coupe, brin par brin.',
      'Réglage de la lumière et de la matière.',
      'Presque prêt.',
    ],
    note: "Le calcul continue même si tu fermes cet onglet. Reviens sur cette page connecté et ton essai t'attend.",
  },

  revealing: {
    kicker: 'Étape 05',
    confirming: {
      head: 'Paiement',
      em: 'accepté.',
      sub: "On attend la confirmation, puis tes essais arrivent sur ton compte. C'est notre serveur qui répond, quelques secondes.",
    },
    fetching: {
      head: 'Crédits',
      em: 'reçus.',
      sub: "On sort la version nette de ton image. Elle est déjà calculée, il ne reste qu'à te la donner.",
    },
    note: "Ton paiement est enregistré. Même si la page se ferme maintenant, ton résultat t'attend ici.",
  },

  paywall: {
    kicker: 'Ton essai est prêt',
    h: "Il ne reste qu'à ",
    hEm: 'le voir.',
    sub: 'Ton résultat existe, en pleine définition. Révèle-le, et garde de quoi essayer autant de coupes que tu veux.',
    packsFailed: "Les offres n'ont pas pu être chargées. Recharge la page, ton résultat t'attend.",
    packTitle: 'Ton résultat net ',
    packExtra: (n: number) => `+ ${n} essais`,
    perTry: (unit: string) => `${unit} l'essai`,
    revealing: 'Révélation…',
    reveal: 'Révéler mon résultat',
    trust: ['Paiement par Paddle', 'TVA incluse', 'Sans abonnement'] as readonly [string, string, string],
  },

  result: {
    h1: 'Voilà ',
    hEm: 'toi,',
    h2: (name: string) => ` en ${name.toLowerCase()}.`,
    sub: 'Télécharge-le, montre-le à ton coiffeur, ou relance un essai.',
    remaining1: 'Il te reste ',
    remainingStrong: (n: number) => `${n} essai${n > 1 ? 's' : ''}`,
    remaining2: '.',
    download: 'Télécharger',
    again: 'Essayer un autre look',
    appTitle: "Continue sur l'app",
    appBodyCredits1: 'Tes ',
    appBodyCreditsStrong: (n: number) => `${n} essais`,
    appBodyCredits2: ' et tous tes résultats sont sur ton compte. Connecte-toi avec la même adresse et tu les retrouves.',
    appBody: 'Tes résultats sont sur ton compte. Connecte-toi avec la même adresse et tu les retrouves.',
    appDownload: 'Télécharger Mèche',
    appFine:
      "Si tu t'es connecté avec Google ou Apple, utilise le même bouton dans l'app. Avec ton email, choisis « Me connecter avec un code » et saisis le code reçu.",
  },

  footer: {
    home: '/',
    tag: 'Vois-toi avant. Change après. Paris vers partout.',
    product: 'Produit',
    tryon: 'Try-on',
    how: 'Comment ça marche',
    why: 'Pourquoi Mèche',
    download: 'Télécharger',
    stylists: 'Coiffeurs',
    pro: 'Mèche Pro',
    join: 'Rejoindre',
    pricing: 'Tarification',
    soon: 'Bientôt',
    brand: 'Mèche',
    support: 'Assistance',
    supportHref: '/support',
    deleteAccount: 'Suppression de compte',
    deleteHref: '/delete-account',
    privacy: 'Confidentialité',
    privacyHref: '/privacy',
    terms: 'CGU',
    termsHref: '/terms',
    legal: 'Mentions légales',
    legalHref: '/mentions-legales',
    cookies: 'Cookies',
  },

  tryon: {
    needCredit: 'Il faut un crédit pour lancer cet essai.',
    dailyCap:
      "Beaucoup de monde aujourd'hui, la limite des essais gratuits est atteinte. Reviens demain, ou prends des crédits pour passer devant.",
    rateLimited: "Tu as enchaîné beaucoup d'essais. Réessaie dans quelques minutes.",
    invalidImage: "Cette photo n'a pas pu être lue. Essaie une autre image.",
    promptTooLong: 'Ta description est trop longue. Raccourcis-la.',
    launchFailed: "L'essai n'a pas pu être lancé. Réessaie.",
    stateUnreadable: "L'état de ton essai n'a pas pu être lu.",
    watchAborted: 'Suivi interrompu.',
    takingLong: "Ton essai prend plus longtemps que prévu. Reviens sur cette page dans quelques minutes, il t'attendra ici.",
    failedNoCredits: "Ton essai offert a déjà été utilisé sur ce compte. Prends des crédits pour en relancer un.",
    failedReaped: "Ton essai précédent s'est interrompu et n'a pas abouti. Ton crédit a été rendu, tu peux recommencer.",
    failedKept: "Ton essai précédent n'a pas abouti. Ton crédit a été conservé, tu peux recommencer.",
    creditsSlow:
      "Ton paiement est bien passé, mais tes crédits mettent plus longtemps que prévu à arriver. Recharge la page dans une minute, ton résultat t'attend.",
  },

  auth: {
    badEmail: 'Cette adresse ne ressemble pas à un email.',
    tooMany: 'Trop de demandes. Attends une minute avant de redemander un code.',
    sendFailed: "Le code n'a pas pu être envoyé. Vérifie ton adresse.",
    codeLength: (len: number) => `Le code fait ${len} chiffres.`,
    codeInvalid: 'Ce code est invalide ou expiré. Redemande-en un.',
    appleFailed: "La connexion avec Apple n'a pas pu démarrer. Utilise ton email.",
    googleFailed: "La connexion avec Google n'a pas pu démarrer. Utilise ton email.",
  },

  image: {
    badFormat: 'Format non reconnu. Choisis un JPG, un PNG ou un WebP.',
    unreadable: "Cette image n'a pas pu être ouverte. Essaie une autre photo.",
    browserFailed: "Ton navigateur n'a pas pu préparer l'image.",
    readFailed: "La lecture de l'image a échoué.",
  },

  packs: {
    popular: 'Le plus pris',
    best: 'Le meilleur prix',
  },

  paddle: {
    unavailable: 'Le paiement est indisponible pour le moment.',
    interrupted: 'Paiement interrompu.',
    notConfigured: "Le paiement n'est pas encore disponible ici.",
  },

  looks: {
    fallbackName: 'Ce look',
  },
};

type Dict = typeof fr;

const en: Dict = {
  title: 'Mèche Studio · See yourself first.',
  metaDesc: 'Try a haircut on your own photo, in thirty seconds. No app to install.',

  captions: {
    portrait: 'A front-facing portrait, well lit, hair away from your face.',
    look: 'Your portrait. The cut goes on top of it, your face does not change.',
    account: 'Your portrait. The cut goes on top of it, your face does not change.',
    generating: 'Your face, your light and your framing are preserved.',
    paywall: 'Low-definition preview. The clear image is waiting, it has never left the server.',
    revealing: 'The clear image is coming. It never left the server, we just opened access to it.',
    result: 'Same face, same light, same framing.',
  },

  steps: ['Portrait', 'Look', 'Account', 'Result'],
  stepsAria: 'Steps',

  header: {
    credits: (n: number) => `${n} ${n > 1 ? 'tries' : 'try'}`,
    signOutAria: (email: string) => `Sign out of ${email}`,
    signOutFallbackAccount: 'this account',
    signOutTitle: 'Sign out',
    signingOut: 'Signing out',
    signOut: 'Sign out',
  },

  frame: {
    empty: 'Your portrait appears here',
    altResult: (name: string) => `Result, ${name}`,
    altTeaser: 'Blurred preview of your result',
    altPortrait: 'Your portrait',
    badgeRevealing: 'Unlocking',
    badgeLocked: 'Locked preview',
    badgeClear: 'Clear result',
  },

  fallbackLook: 'your try-on',

  errors: {
    welcomeUsed: 'Your free try has already been used on this account. Get credits to start a new one.',
    launchFailed: 'The try-on could not start. Try again.',
    revealFailed: 'The reveal failed. Try again, no credit was lost.',
    prepareFailed: 'This photo could not be prepared.',
  },

  portrait: {
    kicker: 'Step 01',
    h: 'Start with ',
    hEm: 'your face.',
    sub: 'Not a model, not a generic simulation. The cut goes on your photo, with your face, your skin tone and your light.',
    dropBig: 'Drop your photo',
    dropSmall: 'or click to pick a file · JPG, PNG or WebP',
    note: 'Your photo is used to generate your try-on, and for nothing else. It is never published, never used to train a model. You can delete it at any time.',
  },

  look: {
    kicker: 'Step 02',
    h: 'Pick one, or ',
    hEm: 'describe it.',
    sub: 'An editorial selection, or your own words. No salon vocabulary needed.',
    fromFeed: 'Spotted in the feed',
    fieldLabel: 'Or say it in your own words',
    placeholder: 'a soft bob, shorter in the back, honey highlights',
    continue: 'Continue',
    changePhoto: 'Change photo',
  },

  account: {
    kicker: 'Step 03',
    h: 'Where we send ',
    hEm: 'your try-on.',
    sub: 'Generating takes about thirty seconds. Your try-on stays attached to this account, so you can find it again by coming back to this page.',
    google: 'Continue with Google',
    apple: 'Continue with Apple',
    or: 'or',
    emailLabel: 'Your email',
    emailPlaceholder: 'name@email.com',
    sending: 'Sending…',
    sendCode: 'Send me my code',
    note: (len: number) => `No password to remember. We send a ${len}-digit code, valid for a few minutes.`,
    sentH: 'Your code is ',
    sentHEm: 'on its way.',
    sentSub1: 'We sent it to ',
    sentSub2: (len: number) => `. It has ${len} digits and verifies itself on the last one.`,
    codeLabel: 'The code',
    changeAddress: 'Change address or ask for a new code',
    sessionFailed: 'The session did not open. Ask for a new code.',
    startFailed: 'Sign-in could not start.',
    sendFailed: 'The code could not be sent.',
    codeInvalid: 'This code is invalid or expired.',
  },

  generating: {
    kicker: 'Step 04',
    h: 'Placing your ',
    hEm: 'cut.',
    phases: [
      'Reading your portrait.',
      'Finding your hairline.',
      'Placing the cut, strand by strand.',
      'Adjusting light and texture.',
      'Almost ready.',
    ],
    note: 'The work continues even if you close this tab. Come back to this page signed in and your try-on will be waiting.',
  },

  revealing: {
    kicker: 'Step 05',
    confirming: {
      head: 'Payment',
      em: 'accepted.',
      sub: 'We are waiting for confirmation, then your tries land on your account. Our server answers in a few seconds.',
    },
    fetching: {
      head: 'Credits',
      em: 'received.',
      sub: 'We are fetching the clear version of your image. It is already computed, all that is left is to hand it to you.',
    },
    note: 'Your payment is recorded. Even if this page closes now, your result will be waiting here.',
  },

  paywall: {
    kicker: 'Your try-on is ready',
    h: 'All that is left is ',
    hEm: 'to see it.',
    sub: 'Your result exists, in full definition. Reveal it, and keep enough to try as many cuts as you want.',
    packsFailed: 'The offers could not be loaded. Reload the page, your result is waiting.',
    packTitle: 'Your clear result ',
    packExtra: (n: number) => `+ ${n} tries`,
    perTry: (unit: string) => `${unit} per try`,
    revealing: 'Revealing…',
    reveal: 'Reveal my result',
    trust: ['Payment by Paddle', 'VAT included', 'No subscription'],
  },

  result: {
    h1: "Here's ",
    hEm: 'you,',
    h2: (name: string) => ` in ${name.toLowerCase()}.`,
    sub: 'Download it, show it to your stylist, or start another try-on.',
    remaining1: 'You have ',
    remainingStrong: (n: number) => `${n} ${n > 1 ? 'tries' : 'try'}`,
    remaining2: ' left.',
    download: 'Download',
    again: 'Try another look',
    appTitle: 'Continue in the app',
    appBodyCredits1: 'Your ',
    appBodyCreditsStrong: (n: number) => `${n} tries`,
    appBodyCredits2: ' and all your results are on your account. Sign in with the same address and they are right there.',
    appBody: 'Your results are on your account. Sign in with the same address and they are right there.',
    appDownload: 'Get Mèche',
    appFine:
      'If you signed in with Google or Apple, use the same button in the app. With your email, pick "Sign in with a code" and enter the code you receive.',
  },

  footer: {
    home: '/en',
    tag: 'See yourself first. Change after. Paris to everywhere.',
    product: 'Product',
    tryon: 'Try-on',
    how: 'How it works',
    why: 'Why Mèche',
    download: 'Download',
    stylists: 'Stylists',
    pro: 'Mèche Pro',
    join: 'Join',
    pricing: 'Pricing',
    soon: 'Soon',
    brand: 'Mèche',
    support: 'Support',
    supportHref: '/en/support',
    deleteAccount: 'Delete account',
    deleteHref: '/en/delete-account',
    privacy: 'Privacy',
    privacyHref: '/en/privacy',
    terms: 'Terms',
    termsHref: '/en/terms',
    legal: 'Legal notice',
    legalHref: '/en/mentions-legales',
    cookies: 'Cookies',
  },

  tryon: {
    needCredit: 'A credit is needed to start this try-on.',
    dailyCap: 'Busy day, the free-try limit has been reached. Come back tomorrow, or get credits to skip the line.',
    rateLimited: 'You have chained a lot of tries. Try again in a few minutes.',
    invalidImage: 'This photo could not be read. Try another image.',
    promptTooLong: 'Your description is too long. Shorten it.',
    launchFailed: 'The try-on could not start. Try again.',
    stateUnreadable: 'The state of your try-on could not be read.',
    watchAborted: 'Watching interrupted.',
    takingLong: 'Your try-on is taking longer than expected. Come back to this page in a few minutes, it will be waiting.',
    failedNoCredits: 'Your free try has already been used on this account. Get credits to start another one.',
    failedReaped: 'Your previous try-on was interrupted and did not finish. Your credit was returned, you can start again.',
    failedKept: 'Your previous try-on did not finish. Your credit was kept, you can start again.',
    creditsSlow:
      'Your payment went through, but your credits are taking longer than expected to arrive. Reload the page in a minute, your result is waiting.',
  },

  auth: {
    badEmail: 'This address does not look like an email.',
    tooMany: 'Too many requests. Wait a minute before asking for a new code.',
    sendFailed: 'The code could not be sent. Check your address.',
    codeLength: (len: number) => `The code has ${len} digits.`,
    codeInvalid: 'This code is invalid or expired. Ask for a new one.',
    appleFailed: 'Sign-in with Apple could not start. Use your email.',
    googleFailed: 'Sign-in with Google could not start. Use your email.',
  },

  image: {
    badFormat: 'Unrecognized format. Pick a JPG, a PNG or a WebP.',
    unreadable: 'This image could not be opened. Try another photo.',
    browserFailed: 'Your browser could not prepare the image.',
    readFailed: 'Reading the image failed.',
  },

  packs: {
    popular: 'Most picked',
    best: 'Best price',
  },

  paddle: {
    unavailable: 'Payment is unavailable right now.',
    interrupted: 'Payment interrupted.',
    notConfigured: 'Payment is not available here yet.',
  },

  looks: {
    fallbackName: 'This look',
  },
};

const STR: Record<Lang, Dict> = { fr, en };

// Runs once at module load, and necessarily AFTER the dictionary above: the bundler keeps this
// file's statement order, and calling it any earlier reads STR before it exists.
applyToDocument();

/** The current dictionary. Read at call time, so lib errors thrown later use the active language. */
export function tr(): Dict {
  return STR[lang];
}
