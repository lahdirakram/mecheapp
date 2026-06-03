// shared.jsx — palettes, i18n, Frame, icons, mock data
// Globals: PALETTES, I18N, t, makeStyles, Frame, StatusBar, TabBar, Icon, PortraitPlaceholder
//          MOCK_STYLES, MOCK_PRODUCTS, MOCK_KPIS

const PALETTES = {
  editorial: {
    bg: '#F4EFE7', paper: '#FAF7F1', ink: '#1A1612', mute: '#6B6258',
    border: '#E6DFD2', subtle: '#EBE4D6', soft: '#EFE9DC', chip: '#FFFFFF',
    inkInv: '#FAF7F1', bezel: '#1A1612',
  },
  minimal: {
    bg: '#FFFFFF', paper: '#FAFAFA', ink: '#0A0A0A', mute: '#737373',
    border: '#EAEAEA', subtle: '#F4F4F4', soft: '#F7F7F7', chip: '#FFFFFF',
    inkInv: '#FFFFFF', bezel: '#1A1A1A',
  },
  sombre: {
    bg: '#13110F', paper: '#1B1814', ink: '#F4EFE7', mute: '#8F867A',
    border: '#2A2622', subtle: '#1F1C18', soft: '#221E19', chip: '#221E19',
    inkInv: '#13110F', bezel: '#0A0908',
  },
};

const I18N = {
  fr: {
    brand: 'Reflet',
    hello: 'Bonjour',
    welcomeBack: 'Bon retour, {name}',
    enterPin: 'Entrez votre code',
    forgotPin: 'Mot de passe oublié',
    newSession: 'Nouvelle séance',
    todaySessions: '{n} séances aujourd\'hui',
    cancel: 'Annuler',
    back: 'Retour',
    next: 'Suivant',
    continue: 'Continuer',
    finish: 'Terminer',
    retake: 'Reprendre',
    capture: 'Capturer',
    capturePhoto: 'Photo du client',
    captureHint: 'Cadrez le visage dans le repère, lumière neutre',
    consent: 'J\'accepte que ma photo soit traitée pour générer un aperçu de coupe',
    configure: 'Configurer la coupe',
    configureHint: 'Décrivez la coupe ou ajustez les réglages',
    prompt: 'Description',
    promptPlaceholder: 'Carré flou aux épaules, mèches caramel, frange rideau…',
    holdToSpeak: 'Maintenir pour dicter',
    listening: 'À l\'écoute…',
    length: 'Longueur',
    fringe: 'Frange',
    volume: 'Volume',
    color: 'Coloration',
    texture: 'Texture',
    gallery: 'Galerie de coupes',
    galleryHint: 'Ou choisissez parmi les styles signature',
    generate: 'Générer l\'aperçu',
    generating: 'Génération en cours',
    generatingHint: 'Reflet compose la coupe sur le visage du client',
    estimated: 'Estimé : {s}s',
    result: 'Aperçu',
    before: 'Avant',
    after: 'Après',
    save: 'Enregistrer',
    share: 'Envoyer',
    variants: 'Variantes',
    pickFavorite: 'Le client choisit son préféré',
    addToBasket: 'Ajouter au devis',
    upsell: 'Recommandations',
    upsellHint: 'Produits & soins suggérés pour cette coupe',
    duration: 'Durée',
    estimate: 'Devis',
    recap: 'Récapitulatif',
    recapHint: 'Envoyez à votre client',
    byEmail: 'Par email',
    bySms: 'Par SMS',
    byQr: 'Scanner QR',
    dashboard: 'Tableau de bord',
    today: 'Aujourd\'hui',
    week: 'Cette semaine',
    month: 'Ce mois',
    conversions: 'Conversions',
    avgTicket: 'Panier moyen',
    sessions: 'Séances',
    topStyles: 'Coupes les plus générées',
    topStylists: 'Top coiffeurs',
    yes: 'Oui', no: 'Non',
    min: 'min', short: 'Court', medium: 'Mi-long', long: 'Long',
    none: 'Sans', curtain: 'Rideau', full: 'Pleine', side: 'Côté',
    flat: 'Plat', natural: 'Naturel', voluminous: 'Volumineux',
  },
  en: {
    brand: 'Reflet',
    hello: 'Hello',
    welcomeBack: 'Welcome back, {name}',
    enterPin: 'Enter your PIN',
    forgotPin: 'Forgot PIN',
    newSession: 'New session',
    todaySessions: '{n} sessions today',
    cancel: 'Cancel',
    back: 'Back',
    next: 'Next',
    continue: 'Continue',
    finish: 'Finish',
    retake: 'Retake',
    capture: 'Capture',
    capturePhoto: 'Client photo',
    captureHint: 'Frame the face in the guide, neutral light',
    consent: 'I consent to my photo being processed to generate a haircut preview',
    configure: 'Configure the cut',
    configureHint: 'Describe the cut or adjust the sliders',
    prompt: 'Description',
    promptPlaceholder: 'Shoulder-length blunt bob, caramel highlights, curtain bangs…',
    holdToSpeak: 'Hold to dictate',
    listening: 'Listening…',
    length: 'Length',
    fringe: 'Fringe',
    volume: 'Volume',
    color: 'Color',
    texture: 'Texture',
    gallery: 'Style gallery',
    galleryHint: 'Or pick from our signature styles',
    generate: 'Generate preview',
    generating: 'Generating',
    generatingHint: 'Reflet is composing the cut on the client\'s face',
    estimated: 'Est. {s}s',
    result: 'Preview',
    before: 'Before',
    after: 'After',
    save: 'Save',
    share: 'Send',
    variants: 'Variants',
    pickFavorite: 'Client picks their favorite',
    addToBasket: 'Add to quote',
    upsell: 'Recommendations',
    upsellHint: 'Suggested products & care for this cut',
    duration: 'Duration',
    estimate: 'Quote',
    recap: 'Summary',
    recapHint: 'Send to your client',
    byEmail: 'By email',
    bySms: 'By SMS',
    byQr: 'Scan QR',
    dashboard: 'Dashboard',
    today: 'Today',
    week: 'This week',
    month: 'This month',
    conversions: 'Conversions',
    avgTicket: 'Avg ticket',
    sessions: 'Sessions',
    topStyles: 'Most-generated cuts',
    topStylists: 'Top stylists',
    yes: 'Yes', no: 'No',
    min: 'min', short: 'Short', medium: 'Medium', long: 'Long',
    none: 'None', curtain: 'Curtain', full: 'Full', side: 'Side',
    flat: 'Flat', natural: 'Natural', voluminous: 'Voluminous',
  },
};

function t(lang, key, vars) {
  let s = (I18N[lang] && I18N[lang][key]) || I18N.fr[key] || key;
  if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
  return s;
}

// ─── Frame: iPad-vertical bezel ─────────────────────────────────────────────
const FRAME_W = 760, FRAME_H = 1080;

function Frame({ pal, children, label, dark }) {
  return (
    <div style={{
      width: FRAME_W, height: FRAME_H, borderRadius: 38, padding: 12,
      background: pal.bezel,
      boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 24px 60px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)',
      position: 'relative',
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 28, overflow: 'hidden',
        background: pal.bg, color: pal.ink, position: 'relative',
        fontFamily: "'Geist', system-ui, sans-serif",
      }}>
        {children}
      </div>
      {/* camera dot */}
      <div style={{ position:'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, borderRadius: 8, background: '#000', opacity: 0.5 }} />
    </div>
  );
}

function StatusBar({ pal, time = '9:41' }) {
  return (
    <div style={{
      height: 40, padding: '0 28px', display:'flex', alignItems:'center',
      justifyContent:'space-between', fontSize: 13, fontWeight: 600, color: pal.ink,
    }}>
      <span>{time}</span>
      <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,opacity:0.8}}>
        <span style={{display:'inline-flex',gap:1.5,alignItems:'flex-end'}}>
          {[4,6,8,10].map(h => <span key={h} style={{width:3,height:h,background:pal.ink,borderRadius:1}}/>)}
        </span>
        <span style={{fontSize:11}}>5G</span>
        <span style={{
          width:22,height:11,border:`1.2px solid ${pal.ink}`,borderRadius:3,position:'relative',
        }}>
          <span style={{position:'absolute',inset:1.5,width:'70%',background:pal.ink,borderRadius:1.5}}/>
        </span>
      </div>
    </div>
  );
}

// ─── Icons ──────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20, color = 'currentColor', stroke = 1.6 }) => {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    camera: <><path d="M3 8a2 2 0 0 1 2-2h2.5L9 4h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z"/><circle cx="12" cy="13" r="3.5"/></>,
    mic: <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>,
    sparkle: <><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.5 5.5l4 4M14.5 14.5l4 4M18.5 5.5l-4 4M9.5 14.5l-4 4"/></>,
    chevronRight: <path d="m9 6 6 6-6 6"/>,
    chevronLeft: <path d="m15 6-6 6 6 6"/>,
    chevronDown: <path d="m6 9 6 6 6-6"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    check: <path d="m5 12 5 5 9-11"/>,
    x: <path d="M6 6l12 12M6 18 18 6"/>,
    share: <><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4M12 2v14"/></>,
    qr: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M14 20h7"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    sms: <path d="M21 12a8 8 0 1 1-3.2-6.4L21 4l-1 4.5A8 8 0 0 1 21 12Z"/>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    scissors: <><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M9 8 20 19M9 16 20 5"/></>,
    palette: <><path d="M12 21a9 9 0 1 1 9-9c0 2.5-2 3-3.5 3H16a2 2 0 0 0-2 2c0 1 .5 1.5.5 2.5a1.5 1.5 0 0 1-2.5 1.5"/><circle cx="7" cy="10" r="1"/><circle cx="12" cy="6" r="1"/><circle cx="17" cy="10" r="1"/></>,
    sliders: <><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h14M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></>,
    home: <path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1v-9Z"/>,
    chart: <><path d="M3 21h18"/><path d="M6 17V10M10 17V6M14 17v-4M18 17v-9"/></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>,
    bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
    bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    trash: <><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></>,
    arrowRight: <path d="M5 12h14M13 5l7 7-7 7"/>,
  };
  return <svg {...props}>{paths[name] || null}</svg>;
};

// ─── Portrait placeholder (subtle stripes, no fake faces) ───────────────────
function PortraitPlaceholder({ pal, w = '100%', h = '100%', label = 'photo client', tint, hair }) {
  // tint: hex for hair-band area; hair: 'short'|'medium'|'long'|'curly'
  const t1 = tint || '#C9B8A0';
  const t2 = hair === 'long' ? '#7A5A3E' : hair === 'curly' ? '#4A2E1E' : hair === 'short' ? '#2A1F18' : '#5A3E2A';
  const id = 'ph' + Math.random().toString(36).slice(2, 8);
  return (
    <div style={{ width: w, height: h, position: 'relative', overflow: 'hidden', background: pal.subtle }}>
      <svg width="100%" height="100%" viewBox="0 0 200 280" preserveAspectRatio="xMidYMid slice" style={{display:'block'}}>
        <defs>
          <linearGradient id={id + 'bg'} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t1} stopOpacity="0.55"/>
            <stop offset="100%" stopColor={t2} stopOpacity="0.35"/>
          </linearGradient>
          <pattern id={id + 'stripe'} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.18)" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="200" height="280" fill={`url(#${id}bg)`}/>
        <rect width="200" height="280" fill={`url(#${id}stripe)`}/>
        {/* abstract head silhouette */}
        <ellipse cx="100" cy="115" rx="48" ry="58" fill="rgba(0,0,0,0.12)"/>
        <path d={
          hair === 'long' ? 'M52 90 Q60 50 100 50 Q140 50 148 90 L155 220 Q140 200 130 200 L70 200 Q60 200 45 220 Z'
          : hair === 'curly' ? 'M48 95 Q40 55 100 45 Q160 55 152 95 Q145 70 100 65 Q55 70 48 95Z'
          : hair === 'short' ? 'M58 80 Q70 50 100 50 Q130 50 142 80 L145 110 Q120 95 100 95 Q80 95 55 110 Z'
          : 'M55 85 Q65 50 100 50 Q135 50 145 85 L148 130 Q130 115 100 115 Q70 115 52 130 Z'
        } fill="rgba(0,0,0,0.32)"/>
        <rect x="0" y="240" width="200" height="40" fill="rgba(0,0,0,0.15)"/>
      </svg>
      <div className="mono" style={{
        position:'absolute', left: 10, bottom: 8, fontSize: 9, letterSpacing: '.05em',
        color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase',
        mixBlendMode: 'difference', opacity: 0.7,
      }}>{label}</div>
    </div>
  );
}

// ─── Mock data ──────────────────────────────────────────────────────────────
const MOCK_STYLES = [
  { id: 's1', name: { fr: 'Carré flou', en: 'Soft bob' }, len:'medium', desc:{fr:'Aux épaules, dégradé invisible',en:'Shoulder, invisible layers'} },
  { id: 's2', name: { fr: 'Wolf cut', en: 'Wolf cut' }, len:'long', desc:{fr:'Dégradé prononcé, énergie rock',en:'Sharp layers, rock energy'} },
  { id: 's3', name: { fr: 'Pixie texturé', en: 'Textured pixie' }, len:'short', desc:{fr:'Très court, mouvement aérien',en:'Very short, airy movement'} },
  { id: 's4', name: { fr: 'Long lisse', en: 'Sleek long' }, len:'long', desc:{fr:'Cascade brillante, raie centrale',en:'Glossy fall, center part'} },
  { id: 's5', name: { fr: 'Frange rideau', en: 'Curtain bangs' }, len:'medium', desc:{fr:'Mi-long avec frange ouverte',en:'Mid-length, open fringe'} },
  { id: 's6', name: { fr: 'Boucles définies', en: 'Defined curls' }, len:'curly', desc:{fr:'Boucles serrées, volume haut',en:'Tight curls, high volume'} },
];

const MOCK_PRODUCTS = [
  { id: 'p1', name: { fr: 'Soin réparateur Olaplex N°3', en: 'Olaplex N°3 repair' }, kind:{fr:'Soin maison',en:'At-home care'}, price: 32, ml: '100 ml' },
  { id: 'p2', name: { fr: 'Mousse volume Kérastase', en: 'Kérastase volume mousse' }, kind:{fr:'Coiffant',en:'Styling'}, price: 28, ml: '150 ml' },
  { id: 'p3', name: { fr: 'Patine caramel', en: 'Caramel glaze' }, kind:{fr:'Coloration salon',en:'Salon color'}, price: 65, ml: '+45 min' },
  { id: 'p4', name: { fr: 'Brushing signature', en: 'Signature blow-dry' }, kind:{fr:'Service',en:'Service'}, price: 38, ml: '+30 min' },
];

const MOCK_KPIS = {
  conversions: { value: 64, delta: '+12', spark: [22,28,30,34,40,46,52,58,55,60,64] },
  avgTicket:   { value: '€78', delta: '+€9', spark: [60,62,65,64,70,72,74,76,75,78,78] },
  sessions:    { value: 142, delta: '+28', spark: [80,85,92,95,110,118,120,128,132,138,142] },
};

const TOP_STYLES_FR = [
  { name: 'Carré flou', count: 48 },
  { name: 'Frange rideau', count: 36 },
  { name: 'Wolf cut', count: 27 },
  { name: 'Long lisse', count: 18 },
  { name: 'Pixie texturé', count: 11 },
];
const TOP_STYLISTS = [
  { name: 'Léa M.', count: 42, conv: 72 },
  { name: 'Karim B.', count: 38, conv: 64 },
  { name: 'Sofia D.', count: 31, conv: 58 },
  { name: 'Théo R.', count: 24, conv: 49 },
];

Object.assign(window, {
  PALETTES, I18N, t, Frame, StatusBar, Icon, PortraitPlaceholder,
  FRAME_W, FRAME_H,
  MOCK_STYLES, MOCK_PRODUCTS, MOCK_KPIS, TOP_STYLES_FR, TOP_STYLISTS,
});
