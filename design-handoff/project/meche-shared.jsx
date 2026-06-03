// meche-shared.jsx — design tokens, helpers, mock data for B2C
// Globals: MPAL, MI18N, mt, MIcon, MPortrait, TabBar, TopBar, MWordmark
//          MFEED, MSALONS, MWARDROBE, MUSER

const MPAL = {
  bg: '#FCF8F4',        // blush white (brand v2)
  paper: '#FFFFFF',     // pure white card
  ink: '#15110E',       // near-black ink — the ONE true black (use everywhere)
  ink2: '#3D342B',      // secondary warm ink — body copy, helper text, captions
  mute: '#8E8580',
  border: '#EEE5DE',
  subtle: '#F4ECE6',    // light warm fill
  soft: '#F6E8E0',      // soft blush tint
  inkInv: '#FCF8F4',    // light text on ink
  accent: '#15110E',    // editorial: actions = ink/black
  accent2: '#2A2520',   // deep neutral (rare)
  sable: '#B07F3C',     // warm "highlight" touch — caramel (ex-coral)
  sableInk: '#15110E',  // text on sable
  rose: '#F6E8E0',
  bezel: '#15110E',
  // Semantic source colors — meaning, not decoration. Keep distinct from accent.
  salon: '#1F8A5B',     // green = real / trusted salon result
  community: '#4A88E0', // blue = community / user-generated
};

const MI18N = {
  fr: {
    brand: 'Mèche',
    tagline: 'Sois de la mèche.',
    sub1: 'Vois la coupe avant la coupe — et trouve qui te la fait.',
    cta_start: 'Entrer',
    cta_login: 'J\'ai déjà un compte',
    take_selfie: 'Selfie, s\'il te plaît',
    selfie_hint: 'Lumière naturelle, cheveux dégagés',
    selfie_skip: 'Passer pour l\'instant',
    explore: 'Découvrir',
    wardrobe: 'Mes mèches',
    salons: 'Coiffeurs',
    profile: 'Profil',
    try_on: 'Essayer',
    use_meche: 'Utiliser Mèche',
    step_selfie: 'Étape 1 · Ton selfie',
    step_hub: 'Étape 2 · Choisis ta voie',
    try_look: 'Essayer ce look',
    see_more: 'Voir d\'autres',
    save: 'Garder',
    saved: 'Gardé',
    share: 'Partager',
    book: 'Réserver',
    customize: 'Ajuster',
    length: 'Longueur', color: 'Couleur', fringe: 'Frange', vibe: 'Mood',
    generate: 'Lancer l\'aperçu',
    generating: 'Mèche s\'en occupe…',
    before: 'Avant', after: 'Après',
    share_to: 'Partager sur',
    copy_link: 'Copier le lien',
    looks_saved: 'mèches',
    near_me: 'Près de toi',
    open_now: 'Ouvert',
    free_trials: 'essais gratuits',
    credits: 'crédits',
    credits_left: 'crédits restants',
    recharge: 'Recharger',
    recharge_title: 'Recharge tes crédits',
    recharge_sub: 'Un crédit = un aperçu IA. Pas d\'abonnement, pas de surprise.',
    pack_taste: 'Pack Essai',
    pack_taste_sub: 'Pour voir ce que ça donne',
    pack_star: 'Pack Star',
    pack_star_sub: 'Le plus choisi',
    pack_pro: 'Pack Pro',
    pack_pro_sub: 'Studio à volonté',
    most_popular: 'Le plus populaire',
    best_value: 'Meilleur rapport',
    per_credit: '/ crédit',
    pay_apple: 'Payer avec Apple Pay',
    pay_card: 'Payer par carte',
    no_credits_title: 'Plus de crédits',
    no_credits_sub: 'Recharge pour continuer à essayer.',
    upgrade: 'Recharger',
    auth_title: 'Crée ton compte',
    auth_sub: 'Tes mèches te suivent. Connecte-toi en deux secondes.',
    auth_apple: 'Continuer avec Apple',
    auth_google: 'Continuer avec Google',
    auth_email: 'Continuer avec un email',
    auth_or: 'ou',
    auth_terms: 'En continuant, tu acceptes les CGU et la politique de confidentialité.',
    auth_have_account: 'Déjà un compte ?',
    auth_signin: 'Me connecter',
    email_label: 'Email',
    email_ph: 'toi@exemple.com',
    pwd_label: 'Mot de passe',
    pwd_ph: '8 caractères minimum',
    create_account: 'Créer mon compte',
    confirm_title: 'Vérifie ta boîte mail',
    confirm_sub: 'On t\'a envoyé un lien à',
    confirm_action: 'J\'ai cliqué sur le lien',
    confirm_resend: 'Renvoyer le mail',
    confirm_change: 'Changer d\'adresse',
    confirm_help: 'Pense à regarder dans les spams.',
    member_since: 'Sur Mèche depuis',
    your_looks: 'Tes mèches',
    sort_recent: 'Récents',
    sort_loved: 'Préférés',
    sort_summer: 'Pour cet été',
    inspire_me: 'Inspire-moi',
    swipe_hint: 'Glisse vers le haut',
    inspire_title: 'Par où commencer ?',
    inspire_sub: '5 façons de trouver ta prochaine coupe.',
    path_feed: 'Le feed',
    path_feed_sub: 'Glisse, like, garde',
    path_gallery: 'La galerie',
    path_gallery_sub: 'Le catalogue, par style',
    path_prompt: 'Dis-le',
    path_prompt_sub: 'Texte ou voix',
    path_manual: 'Règle à la main',
    path_manual_sub: 'Curseurs, couleurs',
    path_ai: 'L\'IA te propose',
    path_ai_sub: 'Recommandé pour toi',
    recommended: 'Recommandé',
    accept_suggestion: 'Essayer ça',
    another_suggestion: 'Une autre',
    prompt_placeholder: 'Décris la coupe de tes rêves…',
    listening: 'Mèche t\'écoute…',
    tap_to_speak: 'Touche pour parler',
    gallery_filter_all: 'Toutes',
    gallery_filter_short: 'Courtes',
    gallery_filter_mid: 'Mi-longues',
    gallery_filter_long: 'Longues',
    gallery_filter_color: 'Couleurs',
    gallery_filter_trends: 'Tendances',
    why_this: 'Pourquoi ça',
    config: 'Réglages',
    go: 'Lance-toi',
  },
  en: {
    brand: 'Mèche',
    tagline: 'In on it.',
    sub1: 'See the cut before the cut — and find who does it.',
    cta_start: 'Get in',
    cta_login: 'I already have an account',
    take_selfie: 'Selfie, please',
    selfie_hint: 'Natural light, hair off your face',
    selfie_skip: 'Skip for now',
    explore: 'Discover',
    wardrobe: 'My looks',
    salons: 'Stylists',
    profile: 'Profile',
    try_on: 'Try on',
    use_meche: 'Use Mèche',
    step_selfie: 'Step 1 · Your selfie',
    step_hub: 'Step 2 · Pick your path',
    try_look: 'Try this look',
    see_more: 'See more',
    save: 'Keep',
    saved: 'Kept',
    share: 'Share',
    book: 'Book',
    customize: 'Tweak',
    length: 'Length', color: 'Color', fringe: 'Fringe', vibe: 'Mood',
    generate: 'Generate preview',
    generating: 'Mèche is on it…',
    before: 'Before', after: 'After',
    share_to: 'Share to',
    copy_link: 'Copy link',
    looks_saved: 'looks',
    near_me: 'Near you',
    open_now: 'Open',
    free_trials: 'free tries',
    credits: 'credits',
    credits_left: 'credits left',
    recharge: 'Top up',
    recharge_title: 'Top up your credits',
    recharge_sub: 'One credit = one AI preview. No subscription, no surprise.',
    pack_taste: 'Taster pack',
    pack_taste_sub: 'Just to see',
    pack_star: 'Star pack',
    pack_star_sub: 'Most picked',
    pack_pro: 'Pro pack',
    pack_pro_sub: 'Studio on tap',
    most_popular: 'Most popular',
    best_value: 'Best value',
    per_credit: '/ credit',
    pay_apple: 'Pay with Apple Pay',
    pay_card: 'Pay by card',
    no_credits_title: 'No credits left',
    no_credits_sub: 'Top up to keep trying looks.',
    upgrade: 'Top up',
    auth_title: 'Create your account',
    auth_sub: 'So your looks follow you. Two seconds, max.',
    auth_apple: 'Continue with Apple',
    auth_google: 'Continue with Google',
    auth_email: 'Continue with email',
    auth_or: 'or',
    auth_terms: 'By continuing, you agree to the Terms and Privacy Policy.',
    auth_have_account: 'Already have an account?',
    auth_signin: 'Sign in',
    email_label: 'Email',
    email_ph: 'you@example.com',
    pwd_label: 'Password',
    pwd_ph: '8 characters minimum',
    create_account: 'Create my account',
    confirm_title: 'Check your inbox',
    confirm_sub: 'We sent a link to',
    confirm_action: 'I clicked the link',
    confirm_resend: 'Resend email',
    confirm_change: 'Change email',
    confirm_help: 'Take a peek in spam, just in case.',
    member_since: 'On Mèche since',
    your_looks: 'Your looks',
    sort_recent: 'Recent',
    sort_loved: 'Loved',
    sort_summer: 'For this summer',
    inspire_me: 'Inspire me',
    swipe_hint: 'Swipe up',
    inspire_title: 'Where to start?',
    inspire_sub: '5 ways to find your next look.',
    path_feed: 'The feed',
    path_feed_sub: 'Swipe, like, keep',
    path_gallery: 'Gallery',
    path_gallery_sub: 'Catalog, by style',
    path_prompt: 'Just ask',
    path_prompt_sub: 'Text or voice',
    path_manual: 'Tweak it',
    path_manual_sub: 'Sliders, colors',
    path_ai: 'Let Mèche pick',
    path_ai_sub: 'Picked for you',
    recommended: 'Recommended',
    accept_suggestion: 'Try this',
    another_suggestion: 'Another',
    prompt_placeholder: 'Describe your dream cut…',
    listening: 'Mèche is listening…',
    tap_to_speak: 'Tap to speak',
    gallery_filter_all: 'All',
    gallery_filter_short: 'Short',
    gallery_filter_mid: 'Medium',
    gallery_filter_long: 'Long',
    gallery_filter_color: 'Color',
    gallery_filter_trends: 'Trending',
    why_this: 'Why this',
    config: 'Settings',
    go: 'Go',
  },
};
function mt(lang, key) { return (MI18N[lang] && MI18N[lang][key]) || MI18N.fr[key] || key; }

// ─── Icons (reuse global Icon by name where possible, plus a few new) ──────
const MIcon = ({ name, size = 22, color = 'currentColor', stroke = 1.7, fill = 'none' }) => {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill, stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    heart: <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z"/>,
    bookmark: <path d="M6 3h12v18l-6-4-6 4V3Z"/>,
    share: <><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 11 16 7M8 13l8 4"/></>,
    sparkle: <path d="M12 2 14 10 22 12 14 14 12 22 10 14 2 12 10 10Z"/>,
    compass: <path fillRule="evenodd" clipRule="evenodd" d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.5 5.5-5 2-2 5 5-2 2-5Z"/>,
    home: <path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1v-9Z"/>,
    pin: <><path d="M12 22s7-7 7-13a7 7 0 0 0-14 0c0 6 7 13 7 13Z"/><circle cx="12" cy="9" r="2.5"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    chevronLeft: <path d="m15 6-6 6 6 6"/>,
    chevronRight: <path d="m9 6 6 6-6 6"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    check: <path d="m5 12 5 5 9-11"/>,
    star: <path d="M12 2 14.8 8 21 9l-4.5 4.4 1.1 6.6L12 17l-5.6 3 1.1-6.6L3 9l6.2-1L12 2Z"/>,
    flame: <path d="M12 22a6 6 0 0 0 6-6c0-4-4-6-4-10 0 0-3 1-5 5-1 2-3 3-3 6a6 6 0 0 0 6 5Z"/>,
    grid: <><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></>,
    mic: <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>,
    cam: <><path d="M3 8a2 2 0 0 1 2-2h2.5L9 4h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z"/><circle cx="12" cy="13" r="3.5"/></>,
    flip: <><path d="M4 6h12a4 4 0 0 1 4 4v2"/><path d="m13 9 3-3-3-3"/><path d="M20 18H8a4 4 0 0 1-4-4v-2"/><path d="m11 15-3 3 3 3"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8M4.6 9a1.7 1.7 0 0 0-.3-1.8M15 4.6a1.7 1.7 0 0 0 1.8-.3M9 19.4a1.7 1.7 0 0 0-1.8.3"/></>,
    crown: <path d="m3 8 4 3 5-6 5 6 4-3v10H3V8Z"/>,
    x: <path d="M6 6l12 12M6 18 18 6"/>,
    arrowUp: <path d="M12 19V5M5 12l7-7 7 7"/>,
    arrowRight: <path d="M5 12h14M13 5l7 7-7 7"/>,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></>,
    tiktok: <path d="M16 3v4a4 4 0 0 0 4 4M16 3v10.5a4.5 4.5 0 1 1-3-4.2"/>,
    snap: <path d="M12 3c4 0 5 4 5 7 1 0 2 1 2 2-1 1-3 1-3 3 0 0 1 3-4 4-1 0-2 1-2 1s-1-1-2-1c-5-1-4-4-4-4 0-2-2-2-3-3 0-1 1-2 2-2 0-3 1-7 5-7-1 1 0 0 2 0 1 0 2 0 2 0Z"/>,
    link: <><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
    apple: <path d="M16.4 12.6c0-2.4 2-3.5 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.5.8 1.2 1.8 2.5 3 2.4 1.2-.1 1.7-.8 3.2-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.6-1-2.7-3.7M14 5.5c.7-.8 1.1-1.9 1-3-.9 0-2.1.6-2.7 1.4-.6.7-1.2 1.8-1 2.9 1 .1 2-.5 2.7-1.3"/>,
    google: <><path d="M21.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.8 2.9-4.4 2.9-7.4Z" fill="#4285F4" stroke="none"/><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.2v2.6C4.8 19.9 8.1 22 12 22Z" fill="#34A853" stroke="none"/><path d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.2A10 10 0 0 0 2 12c0 1.6.4 3.2 1.2 4.6L6.4 14Z" fill="#FBBC05" stroke="none"/><path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9C16.9 3 14.7 2 12 2 8.1 2 4.8 4.1 3.2 7.4L6.4 10c.8-2.4 3-4 5.6-4Z" fill="#EA4335" stroke="none"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    lock: <><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/></>,
    zap: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>,
    coin: <><circle cx="12" cy="12" r="9"/><path d="M9 9h5a2 2 0 0 1 0 4H9m0 0h5a2 2 0 0 1 0 4H9m3-12v2m0 10v2"/></>,
  };
  return <svg {...props}>{paths[name] || null}</svg>;
};

// ─── Portrait placeholder mobile (lush, gradient, no fake faces) ───────────
function MPortrait({ w = '100%', h = '100%', hair = 'medium', tint, label, mood = 'warm' }) {
  const id = 'mp' + Math.random().toString(36).slice(2, 8);
  const moods = {
    warm:    { a: '#E8C9A0', b: '#B8765A', c: '#3D2A1E' },
    cool:    { a: '#C6CFD3', b: '#7A88A0', c: '#1F2A38' },
    blush:   { a: '#F0CFC5', b: '#C68B7C', c: '#3B2520' },
    olive:   { a: '#C9CFA8', b: '#7A7E4F', c: '#2A2D1A' },
    night:   { a: '#3D3A55', b: '#1F1A2E', c: '#0A0814' },
    sand:    { a: '#E4D7B8', b: '#A78F60', c: '#3D311E' },
  };
  const m = moods[mood] || moods.warm;
  const hairPaths = {
    short:  'M58 70 Q72 38 100 38 Q128 38 142 70 L146 110 Q120 95 100 95 Q80 95 54 110 Z',
    medium: 'M52 78 Q64 38 100 38 Q136 38 148 78 L152 140 Q132 122 100 122 Q68 122 48 140 Z',
    long:   'M48 80 Q58 36 100 36 Q142 36 152 80 L160 240 Q140 220 130 220 L70 220 Q60 220 40 240 Z',
    curly:  'M44 92 Q34 50 100 36 Q166 50 156 92 Q150 64 130 60 Q140 50 120 50 Q125 42 100 46 Q75 42 80 50 Q60 50 70 60 Q50 64 44 92Z',
    pixie:  'M62 64 Q78 36 100 36 Q124 36 142 60 Q138 78 130 80 Q120 70 100 70 Q80 70 70 80 Q62 76 62 64Z',
    bob:    'M52 78 Q64 38 100 38 Q136 38 148 78 L150 154 Q130 156 100 156 Q70 156 50 154 Z',
  };
  const hp = hairPaths[hair] || hairPaths.medium;
  return (
    <div style={{ width: w, height: h, position: 'relative', overflow: 'hidden', background: m.b }}>
      <svg width="100%" height="100%" viewBox="0 0 200 280" preserveAspectRatio="xMidYMid slice" style={{display:'block'}}>
        <defs>
          <radialGradient id={id+'g'} cx="50%" cy="35%" r="80%">
            <stop offset="0%" stopColor={m.a} stopOpacity="0.95"/>
            <stop offset="60%" stopColor={m.b} stopOpacity="0.9"/>
            <stop offset="100%" stopColor={m.c} stopOpacity="0.95"/>
          </radialGradient>
          <pattern id={id+'gr'} width="3" height="3" patternUnits="userSpaceOnUse">
            <rect width="3" height="3" fill="rgba(255,255,255,0)"/>
            <circle cx="1.5" cy="1.5" r="0.3" fill="rgba(255,255,255,0.06)"/>
          </pattern>
        </defs>
        <rect width="200" height="280" fill={`url(#${id}g)`}/>
        {/* neck/shoulders */}
        <path d="M70 240 Q70 200 100 200 Q130 200 130 240 L200 240 L200 280 L0 280 L0 240 Z" fill="rgba(0,0,0,0.22)"/>
        {/* face */}
        <ellipse cx="100" cy="120" rx="42" ry="56" fill="rgba(0,0,0,0.18)"/>
        <ellipse cx="100" cy="118" rx="40" ry="54" fill="rgba(255,255,255,0.04)"/>
        {/* hair */}
        <path d={hp} fill={tint || 'rgba(0,0,0,0.5)'} opacity="0.85"/>
        <rect width="200" height="280" fill={`url(#${id}gr)`}/>
      </svg>
      {label && (
        <div className="mono" style={{
          position:'absolute', left: 10, bottom: 8, fontSize: 9, letterSpacing:'.1em',
          color:'rgba(255,255,255,0.85)', textTransform:'uppercase', mixBlendMode:'difference',
        }}>{label}</div>
      )}
    </div>
  );
}

// ─── Mèche wordmark (with coral grave accent) ─────────────────────────────
function MWordmark({ size = 32, color = MPAL.ink, accent = MPAL.sable, italic = false }) {
  // The è is rendered as plain "e" plus a coral stroke positioned by glyph top.
  const fs = size;
  return (
    <span style={{
      fontFamily: "'Fraunces', serif",
      fontWeight: 400,
      fontStyle: italic ? 'italic' : 'normal',
      fontSize: fs,
      letterSpacing: '-0.045em',
      lineHeight: 1,
      color,
      display: 'inline-block',
      whiteSpace: 'nowrap',
      position: 'relative',
    }}>
      m<span style={{ position: 'relative', display: 'inline-block', lineHeight: 1 }}>
        e
        <span style={{
          position: 'absolute',
          top: '0.18em',
          left: '0.18em',
          width: '0.5em',
          height: Math.max(2, fs * 0.07) + 'px',
          background: accent,
          transform: 'rotate(22deg)',
          transformOrigin: 'left center',
          borderRadius: 999,
          pointerEvents: 'none',
        }}/>
      </span>che
    </span>
  );
}

// ─── Top bar (replacement for IOSNavBar with serif title) ──────────────────
function TopBar({ title, big, onBack, right, dark = false }) {
  const c = dark ? '#fff' : MPAL.ink;
  return (
    <div style={{
      padding: big ? '6px 20px 8px' : '6px 12px',
      display:'flex',alignItems:'center',gap:8,minHeight: 44,
      color: c,
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          width:36,height:36,borderRadius:18,border:'none',
          background: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)',
          color: c, display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',
          backdropFilter:'blur(20px)',
        }}><MIcon name="chevronLeft" size={18}/></button>
      )}
      <div style={{flex:1, minWidth:0}}>
        {big ? (
          <div className="serif" style={{fontSize: 30, letterSpacing:'-0.02em', lineHeight: 1.05}}>{title}</div>
        ) : (
          <div style={{fontSize: 16, fontWeight:600, textAlign: onBack ? 'left' : 'center'}}>{title}</div>
        )}
      </div>
      {right}
    </div>
  );
}

// ─── Tab bar (floating, glass) — 4 tabs + central "Mèche" action button ─────
// The central button runs the live flow: tap → selfie → inspiration hub.
function TabBar({ active, onChange, lang, dark = false, screenH = 874 }) {
  const [step, setStep] = React.useState(null); // null | 'selfie' | 'hub'
  const [flash, setFlash] = React.useState(false);

  const left = [
    { id: 'explore',  icon: 'compass',  label: mt(lang,'explore') },
    { id: 'wardrobe', icon: 'bookmark', label: mt(lang,'wardrobe') },
  ];
  const right = [
    { id: 'salons',   icon: 'pin',      label: mt(lang,'salons') },
    { id: 'profile',  icon: 'user',     label: mt(lang,'profile') },
  ];

  const onColor = dark ? MPAL.inkInv : MPAL.accent;
  const offColor = dark ? 'rgba(255,255,255,0.55)' : MPAL.mute;

  const tabBtn = (it) => {
    const on = active === it.id;
    return (
      <button key={it.id} onClick={()=>onChange && onChange(it.id)} style={{
        background:'transparent',border:'none',cursor:'pointer',
        display:'flex',flexDirection:'column',alignItems:'center',gap:3,
        padding:'6px 8px',color: on ? onColor : offColor,flex:1,
      }}>
        <MIcon name={it.icon} size={20} fill={on?onColor:'none'} color={on?onColor:'currentColor'} stroke={on?0:1.7}/>
        <span style={{fontSize:10,fontWeight:600,letterSpacing:'.02em'}}>{it.label}</span>
      </button>
    );
  };

  const capture = () => { setFlash(true); setTimeout(()=>{ setFlash(false); setStep('hub'); }, 420); };
  const close = () => setStep(null);

  return (
    <>
      <div style={{
        position:'absolute', bottom: 22, left: 14, right: 14, zIndex: 30,
        background: dark ? 'rgba(20,18,16,0.7)' : 'rgba(255,253,249,0.78)',
        backdropFilter:'blur(24px) saturate(160%)',
        WebkitBackdropFilter:'blur(24px) saturate(160%)',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: 28, padding: '8px 8px',
        display:'flex',alignItems:'center',
        boxShadow:'0 8px 30px rgba(0,0,0,0.12)',
      }}>
        <div style={{display:'flex',flex:1}}>{left.map(tabBtn)}</div>
        <div style={{width:64,flexShrink:0}}/>
        <div style={{display:'flex',flex:1}}>{right.map(tabBtn)}</div>

        {/* central Mèche action button — elevated */}
        <button onClick={()=>setStep('selfie')} aria-label={mt(lang,'use_meche')} style={{
          position:'absolute', left:'50%', top:'50%',
          transform:'translate(-50%, calc(-50% - 16px))',
          width:58, height:58, borderRadius:29, border:'none', cursor:'pointer',
          background: MPAL.sable, color:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:`0 10px 24px ${MPAL.sable}66, 0 2px 6px rgba(0,0,0,0.25)`,
        }}>
          <span style={{position:'absolute',inset:3,borderRadius:26,border:'1.5px solid rgba(255,255,255,0.35)'}}/>
          <MIcon name="sparkle" size={26} color="#fff" fill="#fff" stroke={0}/>
        </button>
        <span style={{
          position:'absolute', left:'50%', bottom:6, transform:'translateX(-50%)',
          fontSize:10, fontWeight:700, letterSpacing:'.02em',
          color: dark ? MPAL.inkInv : MPAL.ink, whiteSpace:'nowrap',
        }}>{mt(lang,'try_on')}</span>
      </div>

      {/* ── Central-button flow overlay: selfie → hub ─────────────────────── */}
      {step && (
        <div style={{
          position:'absolute', inset:0, zIndex:60,
          overflow:'hidden', animation:'mSheet .28s cubic-bezier(.2,.8,.2,1)',
        }}>
          {step === 'selfie' && (
            <div style={{height:'100%',background:'#0a0908',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',inset:0}}>
                <MPortrait hair="medium" mood="warm" label="viseur · live"/>
                <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.35)'}}/>
              </div>
              <svg width="100%" height="100%" viewBox={`0 0 402 ${screenH}`} preserveAspectRatio="xMidYMid slice"
                   style={{position:'absolute',inset:0,pointerEvents:'none'}}>
                <defs>
                  <mask id="ovalmaskTB"><rect width="402" height={screenH} fill="white"/>
                    <ellipse cx="201" cy={screenH*0.43} rx="155" ry="220" fill="black"/></mask>
                </defs>
                <rect width="402" height={screenH} fill="rgba(0,0,0,0.6)" mask="url(#ovalmaskTB)"/>
                <ellipse cx="201" cy={screenH*0.43} rx="155" ry="220" fill="none" stroke={MPAL.sable} strokeWidth="2" strokeDasharray="6 6"/>
              </svg>

              <div style={{position:'absolute',top:58,left:0,right:0,padding:'0 16px',
                display:'flex',justifyContent:'space-between',alignItems:'center',zIndex:5}}>
                <button onClick={close} style={{width:40,height:40,borderRadius:20,background:'rgba(0,0,0,0.5)',border:'none',
                  color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <MIcon name="x" size={18} color="#fff"/>
                </button>
                <div style={{padding:'8px 14px',borderRadius:999,background:'rgba(255,255,255,0.92)',
                  display:'flex',alignItems:'center',gap:8,fontSize:12,color:MPAL.ink,fontWeight:500}}>
                  <span style={{width:6,height:6,borderRadius:6,background:MPAL.sable}}/>
                  {mt(lang,'selfie_hint')}
                </div>
                <button style={{width:40,height:40,borderRadius:20,background:'rgba(0,0,0,0.5)',border:'none',
                  color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <MIcon name="flip" size={18} color="#fff"/>
                </button>
              </div>

              <div style={{position:'absolute',top:118,left:0,right:0,textAlign:'center',color:'#fff',zIndex:5}}>
                <div className="mono" style={{fontSize:10,letterSpacing:'.18em',opacity:0.7,marginBottom:8}}>
                  {mt(lang,'step_selfie').toUpperCase()}
                </div>
                <div className="serif" style={{fontSize:32,letterSpacing:'-0.02em'}}>
                  {mt(lang,'take_selfie')}
                </div>
              </div>

              {flash && <div style={{position:'absolute',inset:0,background:'#fff',opacity:0.85,zIndex:20}}/>}

              <div style={{position:'absolute',bottom:96,left:0,right:0,
                display:'flex',alignItems:'center',justifyContent:'center',gap:36,zIndex:5}}>
                <button style={{width:54,height:54,borderRadius:27,background:'rgba(255,255,255,0.15)',
                  border:'1px solid rgba(255,255,255,0.25)',cursor:'pointer',color:'#fff',
                  display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <MIcon name="grid" size={18} color="#fff"/>
                </button>
                <button onClick={capture}
                  style={{width:82,height:82,borderRadius:41,border:'5px solid #fff',background:'#fff',
                    cursor:'pointer',boxShadow:'0 8px 30px rgba(0,0,0,0.5)'}}>
                  <div style={{width:'100%',height:'100%',borderRadius:'50%',background:MPAL.sable,transform:'scale(0.86)'}}/>
                </button>
                <button style={{width:54,height:54,borderRadius:27,background:'rgba(255,255,255,0.15)',
                  border:'1px solid rgba(255,255,255,0.25)',cursor:'pointer',color:'#fff',
                  display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <MIcon name="cam" size={20} color="#fff"/>
                </button>
              </div>

              <div style={{position:'absolute',bottom:48,left:0,right:0,textAlign:'center',zIndex:5}}>
                <button onClick={()=>setStep('hub')} style={{background:'none',border:'none',cursor:'pointer',padding:'8px 16px',
                  color:'rgba(255,255,255,0.72)',fontSize:13,textDecoration:'underline',
                  textUnderlineOffset:3,textDecorationColor:'rgba(255,255,255,0.35)'}}>
                  {mt(lang,'selfie_skip')}
                </button>
              </div>
            </div>
          )}

          {step === 'hub' && (
            <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,position:'relative',display:'flex',flexDirection:'column'}}>
              <div style={{height:46}}/>
              <div style={{padding:'8px 16px 4px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <button onClick={()=>setStep('selfie')} style={{width:36,height:36,borderRadius:18,border:'none',
                  background:'rgba(0,0,0,0.05)',color:MPAL.ink,cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <MIcon name="chevronLeft" size={18}/>
                </button>
                <div className="mono" style={{fontSize:10,letterSpacing:'.16em',color:MPAL.mute,fontWeight:600}}>
                  {mt(lang,'step_hub').toUpperCase()}
                </div>
                <button onClick={close} style={{width:36,height:36,borderRadius:18,border:'none',
                  background:'rgba(0,0,0,0.05)',color:MPAL.ink,cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <MIcon name="x" size={18}/>
                </button>
              </div>
              {window.MInspireHubBody
                ? <MInspireHubBody lang={lang} accent={MPAL.sable} padBottom={28}/>
                : <div style={{padding:24}}>Hub</div>}
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes mSheet{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </>
  );
}

// ─── Mock data B2C ─────────────────────────────────────────────────────────
const MFEED = [
  { id:'f1', name:{fr:'Carré flou caramel',en:'Caramel soft bob'},     tag:{fr:'TENDANCE',en:'TRENDING'}, hair:'bob',    mood:'warm',  loves:'12.4k', desc:{fr:'Doux aux épaules, reflets miel',en:'Shoulder-soft, honey highlights'},
    source:{kind:'studio', label:{fr:'STUDIO MÈCHE',en:'MÈCHE STUDIO'}, by:{fr:'Édition Été 26',en:'Summer 26 edit'}} },
  { id:'f2', name:{fr:'Wolf cut',en:'Wolf cut'},                       tag:{fr:'NOUVEAU',en:'NEW'},       hair:'long',   mood:'cool',  loves:'8.1k',  desc:{fr:'Dégradé prononcé, énergie rock',en:'Sharp layers, rock energy'},
    source:{kind:'salon',  label:{fr:'CHEZ ATELIER BONAPARTE',en:'AT ATELIER BONAPARTE'}, by:{fr:'Saint-Germain · Paris 6',en:'Saint-Germain · Paris 6'}, match:96} },
  { id:'f3', name:{fr:'Pixie texturé',en:'Textured pixie'},            tag:{fr:'OSÉ',en:'BOLD'},          hair:'pixie',  mood:'night', loves:'4.7k',  desc:{fr:'Très court, mouvement aérien',en:'Very short, airy movement'},
    source:{kind:'user',   label:{fr:'@léa.dpt',en:'@lea.dpt'}, by:{fr:'A essayé · gardé en mèche',en:'Tried · kept'}} },
  { id:'f4', name:{fr:'Boucles définies',en:'Defined curls'},          tag:{fr:'POUR TOI',en:'FOR YOU'},  hair:'curly',  mood:'blush', loves:'19.3k', desc:{fr:'Boucles serrées, volume haut',en:'Tight curls, high volume'},
    source:{kind:'studio', label:{fr:'STUDIO MÈCHE',en:'MÈCHE STUDIO'}, by:{fr:'Référence éditoriale',en:'Editorial reference'}} },
  { id:'f5', name:{fr:'Long lisse cendré',en:'Sleek ash long'},        tag:{fr:'CLASSIQUE',en:'CLASSIC'}, hair:'long',   mood:'sand',  loves:'6.0k',  desc:{fr:'Cascade brillante, raie centrale',en:'Glossy fall, center part'},
    source:{kind:'salon',  label:{fr:'CHEZ STUDIO MARAIS',en:'AT STUDIO MARAIS'}, by:{fr:'Marais · Paris 4',en:'Marais · Paris 4'}, match:92} },
];

const MSALONS = [
  { id:'s1', name:'Atelier Bonaparte', area:'Saint-Germain · Paris 6', dist:'0.4 km', rating:4.8, reviews:312, price:'€€€', open:true,  match:96 },
  { id:'s2', name:'Studio Marais',    area:'Marais · Paris 4',        dist:'1.1 km', rating:4.7, reviews:198, price:'€€',  open:true,  match:92 },
  { id:'s3', name:'République Coiff', area:'République · Paris 11',   dist:'2.3 km', rating:4.5, reviews:84,  price:'€€',  open:false, match:88 },
  { id:'s4', name:'La Maison Olive',  area:'Batignolles · Paris 17',  dist:'3.0 km', rating:4.9, reviews:421, price:'€€€€',open:true,  match:81 },
];

const MWARDROBE = [
  { id:'w1', name:'Carré flou caramel', hair:'bob',  mood:'warm',  loved:true,  tag:'été' },
  { id:'w2', name:'Wolf cut châtain',   hair:'long', mood:'cool',  loved:false, tag:'audace' },
  { id:'w3', name:'Pixie noir',         hair:'pixie',mood:'night', loved:true,  tag:'pro' },
  { id:'w4', name:'Boucles miel',       hair:'curly',mood:'blush', loved:false, tag:'été' },
  { id:'w5', name:'Long ash',           hair:'long', mood:'sand',  loved:true,  tag:'classique' },
  { id:'w6', name:'Bob aile',           hair:'bob',  mood:'olive', loved:false, tag:'audace' },
];

const MUSER = {
  name: 'Camille',
  handle: '@camille.r',
  email: 'camille.r@gmail.com',
  since: '2026',
  credits: 7,        // AI credits remaining (rechargeable, no subscription)
  total_purchased: 30,
  last_pack: 'Pack Star',
};

const MPACKS = [
  { id:'taste',  credits:10, price:'4,99 €',  unit:'0,50 €',  badge:null },
  { id:'star',   credits:25, price:'9,99 €',  unit:'0,40 €',  badge:'popular' },
  { id:'pro',    credits:60, price:'19,99 €', unit:'0,33 €',  badge:'best' },
];

Object.assign(window, {
  MPAL, MI18N, mt, MIcon, MPortrait, TopBar, TabBar, MWordmark,
  MFEED, MSALONS, MWARDROBE, MUSER, MPACKS,
});
