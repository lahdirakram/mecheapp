// mobile-shared.jsx — design tokens, helpers, mock data for B2C
// Globals: MPAL, MI18N, mt, MIcon, MPortrait, TabBar, TopBar
//          MFEED, MSALONS, MWARDROBE, MUSER

const MPAL = {
  bg: '#F4EFE7',        // crème
  paper: '#FAF7F1',
  ink: '#1A1612',
  mute: '#6B6258',
  border: '#E6DFD2',
  subtle: '#EBE4D6',
  soft: '#EFE9DC',
  inkInv: '#FAF7F1',
  accent: '#B8765A',    // terracotta
  accent2: '#2A4A3A',   // sapin (rare)
  rose: '#E8B7A0',
  bezel: '#1A1612',
};

const MI18N = {
  fr: {
    brand: 'Reflet',
    tagline: 'Voyez-vous autrement.',
    sub1: 'Essayez n\'importe quelle coupe avant le premier coup de ciseaux.',
    cta_start: 'Commencer',
    cta_login: 'J\'ai déjà un compte',
    take_selfie: 'Prendre un selfie',
    selfie_hint: 'Lumière naturelle, cheveux dégagés du visage',
    explore: 'Explorer',
    wardrobe: 'Garde-robe',
    salons: 'Salons',
    profile: 'Profil',
    try_look: 'Essayer ce look',
    see_more: 'Voir d\'autres',
    save: 'Enregistrer',
    saved: 'Enregistré',
    share: 'Partager',
    book: 'Prendre RDV',
    customize: 'Personnaliser',
    length: 'Longueur', color: 'Couleur', fringe: 'Frange', vibe: 'Mood',
    generate: 'Lancer l\'aperçu',
    generating: 'Reflet imagine…',
    before: 'Avant', after: 'Après',
    share_to: 'Partager sur',
    copy_link: 'Copier le lien',
    looks_saved: 'looks',
    near_me: 'Près de chez moi',
    open_now: 'Ouvert',
    free_trials: 'essais gratuits',
    upgrade: 'Passer Premium',
    member_since: 'Membre depuis',
    your_looks: 'Tes looks',
    sort_recent: 'Récents',
    sort_loved: 'Préférés',
    sort_summer: 'Pour cet été',
    inspire_me: 'Inspire-moi',
    swipe_hint: 'Glisse vers le haut',
  },
  en: {
    brand: 'Reflet',
    tagline: 'See yourself, differently.',
    sub1: 'Try any haircut before a single snip.',
    cta_start: 'Get started',
    cta_login: 'I already have an account',
    take_selfie: 'Take a selfie',
    selfie_hint: 'Natural light, hair off your face',
    explore: 'Explore',
    wardrobe: 'Wardrobe',
    salons: 'Salons',
    profile: 'Profile',
    try_look: 'Try this look',
    see_more: 'See more',
    save: 'Save',
    saved: 'Saved',
    share: 'Share',
    book: 'Book now',
    customize: 'Customize',
    length: 'Length', color: 'Color', fringe: 'Fringe', vibe: 'Mood',
    generate: 'Generate preview',
    generating: 'Reflet is imagining…',
    before: 'Before', after: 'After',
    share_to: 'Share to',
    copy_link: 'Copy link',
    looks_saved: 'looks',
    near_me: 'Near me',
    open_now: 'Open',
    free_trials: 'free tries',
    upgrade: 'Go Premium',
    member_since: 'Member since',
    your_looks: 'Your looks',
    sort_recent: 'Recent',
    sort_loved: 'Loved',
    sort_summer: 'For this summer',
    inspire_me: 'Inspire me',
    swipe_hint: 'Swipe up',
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
    sparkle: <path d="M12 3v6m0 6v6M3 12h6m6 0h6M5.5 5.5l4 4m5 5 4 4m0-13-4 4m-5 5-4 4"/>,
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

// ─── Tab bar (floating, glass) ─────────────────────────────────────────────
function TabBar({ active, onChange, lang, dark = false }) {
  const items = [
    { id: 'explore',  icon: 'sparkle',  label: mt(lang,'explore') },
    { id: 'wardrobe', icon: 'bookmark', label: mt(lang,'wardrobe') },
    { id: 'salons',   icon: 'pin',      label: mt(lang,'salons') },
    { id: 'profile',  icon: 'user',     label: mt(lang,'profile') },
  ];
  return (
    <div style={{
      position:'absolute', bottom: 22, left: 14, right: 14, zIndex: 30,
      background: dark ? 'rgba(20,18,16,0.7)' : 'rgba(255,253,249,0.78)',
      backdropFilter:'blur(24px) saturate(160%)',
      WebkitBackdropFilter:'blur(24px) saturate(160%)',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
      borderRadius: 28, padding: '8px 6px',
      display:'flex',justifyContent:'space-around',
      boxShadow:'0 8px 30px rgba(0,0,0,0.12)',
    }}>
      {items.map(it => {
        const on = active === it.id;
        return (
          <button key={it.id} onClick={()=>onChange && onChange(it.id)} style={{
            background:'transparent',border:'none',cursor:'pointer',
            display:'flex',flexDirection:'column',alignItems:'center',gap:2,
            padding:'6px 14px',color: on ? MPAL.accent : (dark?'rgba(255,255,255,0.55)':MPAL.mute),
            position:'relative',
          }}>
            <MIcon name={it.icon} size={20} fill={on?MPAL.accent:'none'} color={on?MPAL.accent:'currentColor'} stroke={on?0:1.7}/>
            <span style={{fontSize:10,fontWeight:600,letterSpacing:'.02em'}}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Mock data B2C ─────────────────────────────────────────────────────────
const MFEED = [
  { id:'f1', name:{fr:'Carré flou caramel',en:'Caramel soft bob'},     tag:{fr:'TENDANCE',en:'TRENDING'}, hair:'bob',    mood:'warm',  loves:'12.4k', desc:{fr:'Doux aux épaules, reflets miel',en:'Shoulder-soft, honey highlights'} },
  { id:'f2', name:{fr:'Wolf cut',en:'Wolf cut'},                       tag:{fr:'NOUVEAU',en:'NEW'},       hair:'long',   mood:'cool',  loves:'8.1k',  desc:{fr:'Dégradé prononcé, énergie rock',en:'Sharp layers, rock energy'} },
  { id:'f3', name:{fr:'Pixie texturé',en:'Textured pixie'},            tag:{fr:'OSÉ',en:'BOLD'},          hair:'pixie',  mood:'night', loves:'4.7k',  desc:{fr:'Très court, mouvement aérien',en:'Very short, airy movement'} },
  { id:'f4', name:{fr:'Boucles définies',en:'Defined curls'},          tag:{fr:'POUR TOI',en:'FOR YOU'},  hair:'curly',  mood:'blush', loves:'19.3k', desc:{fr:'Boucles serrées, volume haut',en:'Tight curls, high volume'} },
  { id:'f5', name:{fr:'Long lisse cendré',en:'Sleek ash long'},        tag:{fr:'CLASSIQUE',en:'CLASSIC'}, hair:'long',   mood:'sand',  loves:'6.0k',  desc:{fr:'Cascade brillante, raie centrale',en:'Glossy fall, center part'} },
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
  since: '2026',
  credits: 2,        // free tries left this month
  free_cap: 3,
  premium: false,
};

Object.assign(window, {
  MPAL, MI18N, mt, MIcon, MPortrait, TopBar, TabBar,
  MFEED, MSALONS, MWARDROBE, MUSER,
});
