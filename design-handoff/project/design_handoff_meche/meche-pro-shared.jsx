// meche-pro-shared.jsx — Pro-specific tokens, components, mock data
// Globals: PPAL, PWordmark, PTabBar, PTopBar, PIcon,
//          PDEMANDES, PBOOKINGS, PPORTFOLIO, PSTYLIST, PSALON, PNOTIF

// Pro palette extends MPAL with a plum accent reserved for "Pro" surfaces
const PPAL = {
  ...MPAL,
  pro:       '#15110E',     // Pro signature = ink (system-unified)
  proSoft:   '#F2ECE6',     // warm light neutral
  proInk:    '#15110E',
  ok:        '#1F8A5B',
  warn:      '#B5482F',
  gold:      '#B07F3C',     // = caramel sable
  chipBg:    '#F4ECE6',
};

// Wordmark with PRO badge
function PWordmark({ size = 32, color = MPAL.ink, accent = MPAL.sable, italic = false }) {
  return (
    <span style={{display:'inline-flex',alignItems:'flex-end',gap: size * 0.18}}>
      <MWordmark size={size} color={color} accent={accent} italic={italic}/>
      <span className="mono" style={{
        display:'inline-flex',alignItems:'center',
        padding: `${size*0.06}px ${size*0.18}px`,
        background: PPAL.pro,
        color: '#fff',
        borderRadius: 4,
        fontSize: size * 0.28,
        letterSpacing: '.16em',
        fontWeight: 700,
        transform: `translateY(-${size*0.18}px)`,
      }}>PRO</span>
    </span>
  );
}

// Top bar with serif title + optional pill chips
function PTopBar({ title, big, onBack, right, sub, dark = false }) {
  const c = dark ? '#fff' : MPAL.ink;
  return (
    <div style={{
      padding: big ? '6px 18px 8px' : '6px 12px',
      display:'flex',alignItems:'center',gap:10,minHeight: 44,color:c,
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          width:36,height:36,borderRadius:18,border:'none',
          background: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)',
          color:c,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',
        }}><MIcon name="chevronLeft" size={18}/></button>
      )}
      <div style={{flex:1,minWidth:0}}>
        {big ? (
          <>
            <div className="serif" style={{fontSize: 30, letterSpacing:'-0.02em', lineHeight: 1.05}}>{title}</div>
            {sub && <div style={{fontSize:12,color:dark?'rgba(255,255,255,0.6)':MPAL.mute,marginTop:2}}>{sub}</div>}
          </>
        ) : (
          <div style={{fontSize: 16, fontWeight:600, textAlign: onBack ? 'left' : 'center'}}>{title}</div>
        )}
      </div>
      {right}
    </div>
  );
}

// Pro Tab Bar with center "Live" button — the killer feature lives here
function PTabBar({ active, onChange, lang, badges = {} }) {
  const items = [
    { id:'today',  icon:'flame',    label: lang==='fr'?'Aujourd\'hui':'Today' },
    { id:'inbox',  icon:'mail',     label: lang==='fr'?'Demandes':'Requests' },
    { id:'live',   icon:'sparkle',  label: lang==='fr'?'Essayer':'Try on', center:true },
    { id:'agenda', icon:'calendar', label: lang==='fr'?'Agenda':'Agenda' },
    { id:'salon',  icon:'user',     label: lang==='fr'?'Salon':'Salon' },
  ];
  return (
    <div style={{
      position:'absolute', bottom: 18, left: 12, right: 12, zIndex:30,
      background:'rgba(255,253,249,0.82)',
      backdropFilter:'blur(24px) saturate(160%)',
      border:`1px solid rgba(0,0,0,0.06)`,
      borderRadius: 30, padding:'6px 6px',
      display:'flex',alignItems:'center',justifyContent:'space-around',
      boxShadow:'0 12px 36px rgba(26,18,22,0.15)',
    }}>
      {items.map(it=>{
        const on = active === it.id;
        const badge = badges[it.id];
        if (it.center) {
          return (
            <div key={it.id} style={{display:'flex',flexDirection:'column',alignItems:'center',
              width:64,flexShrink:0}}>
              <button onClick={()=>onChange&&onChange(it.id)} aria-label={it.label} style={{
                position:'relative',
                width:58,height:58,borderRadius:29,border:'none',cursor:'pointer',
                background: MPAL.sable, color:'#fff',
                display:'flex',alignItems:'center',justifyContent:'center',
                boxShadow:`0 10px 24px ${MPAL.sable}66, 0 2px 6px rgba(0,0,0,0.25)`,
                transform:'translateY(-18px)',
              }}>
                <span style={{position:'absolute',inset:3,borderRadius:26,
                  border:'1.5px solid rgba(255,255,255,0.35)'}}/>
                <MIcon name={it.icon} size={26} color="#fff" fill="#fff" stroke={0}/>
              </button>
              {/* label OUTSIDE the button — comme la B2C */}
              <span style={{fontSize:10,fontWeight:700,letterSpacing:'.02em',color:MPAL.ink,
                marginTop:-14,whiteSpace:'nowrap'}}>
                {it.label}
              </span>
            </div>
          );
        }
        return (
          <button key={it.id} onClick={()=>onChange&&onChange(it.id)} style={{
            background:'transparent',border:'none',cursor:'pointer',
            display:'flex',flexDirection:'column',alignItems:'center',gap:2,
            padding:'6px 12px',color: on ? MPAL.accent : MPAL.mute,
            position:'relative',flex:1,
          }}>
            <div style={{position:'relative'}}>
              <MIcon name={it.icon} size={20} color={on?MPAL.accent:'currentColor'}
                fill={on?MPAL.accent:'none'} stroke={on?0:1.7}/>
              {badge && (
                <div style={{position:'absolute',top:-4,right:-8,
                  minWidth:16,height:16,padding:'0 4px',borderRadius:8,background:PPAL.pro,
                  color:'#fff',fontSize:9,fontWeight:700,
                  display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {badge}
                </div>
              )}
            </div>
            <span style={{fontSize:10,fontWeight:600,letterSpacing:'.02em'}}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Pro button
function PPrimary({ label, onClick, icon, full=true, ghost=false, dark=false, color, danger=false }) {
  const bg = danger ? '#B84A33' : (color || PPAL.pro);
  return (
    <button onClick={onClick} style={{
      width: full ? '100%' : 'auto', padding:'14px 22px', borderRadius:999,
      background: ghost ? 'transparent' : bg,
      color: ghost ? (dark?'#fff':MPAL.ink) : '#fff',
      border: ghost ? `1px solid ${dark?'rgba(255,255,255,0.25)':MPAL.border}` : 'none',
      fontSize: 15, fontWeight:600, cursor:'pointer',
      display:'flex',alignItems:'center',justifyContent:'center',gap:8,
      fontFamily:"'Geist',system-ui,sans-serif",
    }}>
      {label}
      {icon && <MIcon name={icon} size={15}/>}
    </button>
  );
}

// ─── Mock data ─────────────────────────────────────────────────────────────

const PSTYLIST = {
  name: 'Inès Moreau',
  handle: '@ines.cuts',
  role: 'fondatrice · coloriste',
  since: '2024',
  plan: 'Mèche Pro',
  rating: 4.9,
  reviews: 312,
};

const PSALON = {
  name: 'Atelier Bonaparte',
  area: 'Saint-Germain · Paris 6',
  address: '14 rue Bonaparte, 75006 Paris',
  hours: 'Mar–Sam · 10h–19h',
  price: '€€€',
  team: 3,
  match_default: 96,
};

// Client requests — clients sent a Mèche-generated photo asking "tu peux faire ça ?"
const PDEMANDES = [
  { id:'d1', name:'Camille R.',  handle:'@camille.r', when:'il y a 12 min', unread:true,
    cut:'Carré flou caramel', hair:'bob', mood:'warm',
    msg:{fr:'Salut ! Vu ta page, ce carré me va bien tu crois ? Dispo samedi ?',
         en:'Hi! Saw your page — does this bob suit me? Available Saturday?'},
    confidence:96, length:'shoulder', baseColor:'châtain', target:'caramel·miel', budget:'~140€' },
  { id:'d2', name:'Théo B.',     handle:'@theo.bz',   when:'il y a 1 h', unread:true,
    cut:'Wolf cut châtain', hair:'long', mood:'cool',
    msg:{fr:'Hello, je veux passer du long au wolf — tu prends les rdv en semaine ?',
         en:'Hi, going from long to wolf — do you take weekday slots?'},
    confidence:88, length:'mid-long', baseColor:'noir', target:'châtain', budget:'~90€' },
  { id:'d3', name:'Léa D.',      handle:'@lea.dpt',   when:'il y a 3 h', unread:false,
    cut:'Pixie texturé noir', hair:'pixie', mood:'night',
    msg:{fr:'Je voudrais un truc audacieux mais qui reste pro. Possible ?',
         en:'Want something bold but still office-friendly. Doable?'},
    confidence:91, length:'short', baseColor:'noir', target:'noir·encre', budget:'~80€' },
  { id:'d4', name:'Sasha K.',    handle:'@sasha.k',   when:'hier', unread:false,
    cut:'Boucles miel', hair:'curly', mood:'blush',
    msg:{fr:'Tu fais ce genre de boucles ? Mes cheveux sont raides à la base.',
         en:'Do you do curls like this? My hair is straight to start.'},
    confidence:74, length:'mid', baseColor:'châtain clair', target:'miel cendré', budget:'~180€' },
];

// Today's bookings
const PBOOKINGS = [
  { id:'b1', time:'10:30', dur:'1h15', client:'Sarah V.',   service:'Carré flou + balayage', stylist:'Inès',  status:'confirmed' },
  { id:'b2', time:'13:00', dur:'45 min', client:'Marc P.',  service:'Coupe homme',           stylist:'Yann',  status:'confirmed' },
  { id:'b3', time:'14:30', dur:'2h',   client:'Camille R.', service:'Carré flou caramel',    stylist:'Inès',  status:'live',     match:96 },
  { id:'b4', time:'17:00', dur:'1h',   client:'Léna T.',    service:'Coupe + brushing',      stylist:'Inès',  status:'pending' },
];

// Stylist portfolio
const PPORTFOLIO = [
  { id:'p1', name:'Carré flou caramel',  hair:'bob',   mood:'warm',  loves:'1.2k', booked:18 },
  { id:'p2', name:'Wolf cut châtain',    hair:'long',  mood:'cool',  loves:'884',  booked:11 },
  { id:'p3', name:'Pixie noir encre',    hair:'pixie', mood:'night', loves:'2.1k', booked:24 },
  { id:'p4', name:'Boucles miel',        hair:'curly', mood:'blush', loves:'612',  booked:7 },
  { id:'p5', name:'Long ash glossy',     hair:'long',  mood:'sand',  loves:'543',  booked:9 },
  { id:'p6', name:'Bob aile olive',      hair:'bob',   mood:'olive', loves:'381',  booked:5 },
];

// Pro subscription plans
const PPLANS = [
  { id:'solo', name:{fr:'Solo',en:'Solo'},   price:'49 €',
    sub:{fr:'pour 1 coiffeur indépendant',en:'for 1 independent stylist'},
    perks:[
      {fr:'Inbox demandes illimitées',en:'Unlimited request inbox'},
      {fr:'Studio Mèche en salon (50 essais / mois)',en:'In-salon Mèche Studio (50 tries / mo)'},
      {fr:'Profil + portfolio public',en:'Public profile + portfolio'},
      {fr:'Réservations directes',en:'Direct bookings'},
    ]},
  { id:'salon', name:{fr:'Salon',en:'Salon'}, price:'89 €',
    sub:{fr:'jusqu\'à 5 coiffeurs',en:'up to 5 stylists'}, badge:'popular',
    perks:[
      {fr:'Tout Solo, en équipe',en:'Everything in Solo, for the team'},
      {fr:'Studio Mèche illimité',en:'Unlimited Mèche Studio'},
      {fr:'Calendrier partagé + caisse',en:'Shared agenda + register'},
      {fr:'Mise en avant locale',en:'Featured locally'},
    ]},
  { id:'maison', name:{fr:'Maison',en:'House'}, price:'149 €',
    sub:{fr:'multi-salons & enseignes',en:'multi-location & brands'},
    perks:[
      {fr:'Tout Salon, multi-établissements',en:'Everything in Salon, multi-location'},
      {fr:'Voix de marque & looks signature',en:'Brand voice & signature looks'},
      {fr:'Analytique avancée',en:'Advanced analytics'},
      {fr:'Support dédié',en:'Dedicated support'},
    ]},
];

const PSTATS = {
  bookingsWeek: 23,
  bookingsDelta: '+6',
  revenuesWeek: '2 840 €',
  revenuesDelta: '+18%',
  inboundWeek: 41,         // demandes
  inboundDelta: '+12',
  conversion: '58%',
  studioTries: 127,         // in-salon Mèche tries this month
  topLook: 'Carré flou caramel',
};

const PNOTIF = { inbox: 4, agenda: 0 };

// Returns an accent guaranteed legible on DARK surfaces. If the chosen accent
// is too dark (near-ink), swap to the caramel highlight so text/icons never
// disappear black-on-black when the user picks an ink accent.
function pOnDark(accent) {
  const hex = String(accent || '').replace('#', '');
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 90) return MPAL.sable;   // caramel #B07F3C
  }
  return accent;
}

Object.assign(window, {
  PPAL, PWordmark, PTabBar, PTopBar, PPrimary, pOnDark,
  PDEMANDES, PBOOKINGS, PPORTFOLIO, PSTYLIST, PSALON, PPLANS, PSTATS, PNOTIF,
});
