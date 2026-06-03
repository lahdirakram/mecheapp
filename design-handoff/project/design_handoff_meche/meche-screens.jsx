// meche-screens.jsx — 10 B2C screens for Mèche
// Globals: MScreenWelcome, MScreenSelfie, MScreenFeed, MScreenCustomize,
//          MScreenGenerating, MScreenResult, MScreenWardrobe, MScreenSalons,
//          MScreenShare, MScreenProfile

const { useState: mUS, useEffect: mUE, useRef: mUR } = React;

// ─── Shared bits ────────────────────────────────────────────────────────────
function MPrimary({ label, onClick, icon, full = true, ghost = false, dark = false, accent }) {
  const a = accent || MPAL.accent;
  return (
    <button onClick={onClick} style={{
      width: full ? '100%' : 'auto', padding: '15px 22px', borderRadius: 999,
      background: ghost ? 'transparent' : a,
      color: ghost ? (dark?'#fff':MPAL.ink) : MPAL.inkInv,
      border: ghost ? `1px solid ${dark?'rgba(255,255,255,0.25)':MPAL.border}` : 'none',
      fontSize: 16, fontWeight: 600, cursor:'pointer',
      display:'flex',alignItems:'center',justifyContent:'center',gap:8,
      fontFamily:"'Geist',system-ui,sans-serif",letterSpacing:'.01em',
    }}>
      {label}
      {icon && <MIcon name={icon} size={16}/>}
    </button>
  );
}

// 1. WELCOME ─────────────────────────────────────────────────────────────────
function MScreenWelcome({ lang, accent }) {
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:MPAL.bg,color:MPAL.ink,position:'relative'}}>
      {/* top portraits collage */}
      <div style={{flex:1,position:'relative',overflow:'hidden',padding:'50px 18px 0'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'200px 220px',gap:10,height:'100%'}}>
          <div style={{borderRadius:24,overflow:'hidden',transform:'translateY(20px)'}}>
            <MPortrait hair="bob" mood="warm"/>
          </div>
          <div style={{borderRadius:24,overflow:'hidden'}}>
            <MPortrait hair="pixie" mood="night" tint={accent}/>
          </div>
          <div style={{borderRadius:24,overflow:'hidden'}}>
            <MPortrait hair="curly" mood="blush"/>
          </div>
          <div style={{borderRadius:24,overflow:'hidden',transform:'translateY(-10px)'}}>
            <MPortrait hair="long" mood="cool" tint={accent}/>
          </div>
        </div>
        {/* fade */}
        <div style={{position:'absolute',left:0,right:0,bottom:0,height:140,
          background:`linear-gradient(to bottom, ${MPAL.bg}00, ${MPAL.bg})`}}/>
      </div>
      <div style={{padding:'18px 26px 32px',display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <MWordmark size={20} color={MPAL.ink} accent={MPAL.sable}/>
          <span className="mono" style={{fontSize:10,letterSpacing:'.18em',color:accent,fontWeight:600}}>
            · BÊTA
          </span>
        </div>
        <div className="serif" style={{fontSize:46,lineHeight:1.0,letterSpacing:'-0.035em'}}>
          {lang==='fr' ? (
            <>Sois de la <span style={{fontStyle:'italic',color:accent}}>mèche</span>.</>
          ) : (
            <>In <span style={{fontStyle:'italic',color:accent}}>on</span> it.</>
          )}
        </div>
        <div style={{fontSize:15,color:MPAL.mute,lineHeight:1.45,marginTop:2,maxWidth:320}}>
          {mt(lang,'sub1')}
        </div>
        <div style={{marginTop:14,display:'flex',flexDirection:'column',gap:10}}>
          <MPrimary label={mt(lang,'cta_start')} icon="arrowRight" accent={accent}/>
          <button style={{
            background:'transparent',border:'none',cursor:'pointer',color:MPAL.mute,
            fontSize:14,padding:'4px',fontWeight:500,
          }}>{mt(lang,'cta_login')}</button>
        </div>
      </div>
    </div>
  );
}

// 2. SELFIE ──────────────────────────────────────────────────────────────────
function MScreenSelfie({ lang }) {
  const accent = MPAL.sable;
  const [flash, setFlash] = mUS(false);
  return (
    <div style={{height:'100%',background:'#0a0908',position:'relative',overflow:'hidden'}}>
      {/* camera viewfinder */}
      <div style={{position:'absolute',inset:0}}>
        <MPortrait hair="medium" mood="warm" label="viseur · live"/>
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.35)'}}/>
      </div>

      {/* oval guide */}
      <svg width="100%" height="100%" viewBox="0 0 402 874" preserveAspectRatio="xMidYMid slice"
           style={{position:'absolute',inset:0,pointerEvents:'none'}}>
        <defs>
          <mask id="ovalmaskM"><rect width="402" height="874" fill="white"/>
            <ellipse cx="201" cy="380" rx="155" ry="220" fill="black"/></mask>
        </defs>
        <rect width="402" height="874" fill="rgba(0,0,0,0.6)" mask="url(#ovalmaskM)"/>
        <ellipse cx="201" cy="380" rx="155" ry="220" fill="none" stroke={accent} strokeWidth="2" strokeDasharray="6 6"/>
      </svg>

      {/* top — back + flip */}
      <div style={{position:'absolute',top:60,left:0,right:0,padding:'0 16px',
        display:'flex',justifyContent:'space-between',alignItems:'center',zIndex:5}}>
        <button style={{width:40,height:40,borderRadius:20,background:'rgba(0,0,0,0.5)',border:'none',
          color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <MIcon name="x" size={18} color="#fff"/>
        </button>
        <div style={{padding:'8px 14px',borderRadius:999,background:'rgba(255,255,255,0.92)',
          display:'flex',alignItems:'center',gap:8,fontSize:12,color:MPAL.ink,fontWeight:500}}>
          <span style={{width:6,height:6,borderRadius:6,background:accent}}/>
          {mt(lang,'selfie_hint')}
        </div>
        <button style={{width:40,height:40,borderRadius:20,background:'rgba(0,0,0,0.5)',border:'none',
          color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <MIcon name="flip" size={18} color="#fff"/>
        </button>
      </div>

      {/* title */}
      <div style={{position:'absolute',top:130,left:0,right:0,textAlign:'center',color:'#fff',zIndex:5}}>
        <div className="serif" style={{fontSize:32,letterSpacing:'-0.02em'}}>
          {mt(lang,'take_selfie')}
        </div>
      </div>

      {/* flash */}
      {flash && <div style={{position:'absolute',inset:0,background:'#fff',opacity:0.8,zIndex:20}}/>}

      {/* shutter */}
      <div style={{position:'absolute',bottom:90,left:0,right:0,
        display:'flex',alignItems:'center',justifyContent:'center',gap:36,zIndex:5}}>
        <button style={{width:54,height:54,borderRadius:27,background:'rgba(255,255,255,0.15)',
          border:'1px solid rgba(255,255,255,0.25)',cursor:'pointer',color:'#fff',
          display:'flex',alignItems:'center',justifyContent:'center'}}>
          <MIcon name="grid" size={18} color="#fff"/>
        </button>
        <button onClick={()=>{setFlash(true);setTimeout(()=>setFlash(false),350);}}
          style={{width:82,height:82,borderRadius:41,border:'5px solid #fff',background:'#fff',
            cursor:'pointer',boxShadow:'0 8px 30px rgba(0,0,0,0.5)'}}>
          <div style={{width:'100%',height:'100%',borderRadius:'50%',background:accent,transform:'scale(0.86)'}}/>
        </button>
        <button style={{width:54,height:54,borderRadius:27,background:'rgba(255,255,255,0.15)',
          border:'1px solid rgba(255,255,255,0.25)',cursor:'pointer',color:'#fff',
          display:'flex',alignItems:'center',justifyContent:'center'}}>
          <MIcon name="cam" size={20} color="#fff"/>
        </button>
      </div>

      {/* skip */}
      <div style={{position:'absolute',bottom:44,left:0,right:0,textAlign:'center',zIndex:5}}>
        <button style={{background:'none',border:'none',cursor:'pointer',padding:'8px 16px',
          color:'rgba(255,255,255,0.72)',fontSize:13,letterSpacing:'0.01em',
          textDecoration:'underline',textUnderlineOffset:3,textDecorationColor:'rgba(255,255,255,0.35)'}}>
          {mt(lang,'selfie_skip')}
        </button>
      </div>
    </div>
  );
}

// 3. FEED (TikTok-style discovery) ──────────────────────────────────────────
const SRC_META = {
  studio: { icon:'sparkle', tint:MPAL.ink }, // ink, brand
  salon:  { icon:'pin',     tint:MPAL.salon }, // green = real / trusted
  user:   { icon:'user',    tint:MPAL.community }, // blue = community
};

function MScreenFeed({ lang, accent, srcIdx = 0, activeFilter }) {
  const card = MFEED[srcIdx % MFEED.length];
  const src = card.source;
  const meta = SRC_META[src.kind];
  const filters = [
    { id:'all',    l: lang==='fr'?'Pour toi':'For you' },
    { id:'studio', l: lang==='fr'?'Studio':'Studio' },
    { id:'salon',  l: lang==='fr'?'Salons':'Salons' },
    { id:'user',   l: lang==='fr'?'Commu':'Community' },
  ];
  const actFilter = activeFilter || 'all';

  return (
    <div style={{height:'100%',position:'relative',background:'#000',overflow:'hidden'}}>
      {/* full-bleed portrait */}
      <div style={{position:'absolute',inset:0}}>
        <MPortrait hair={card.hair} mood={card.mood} tint={accent}/>
      </div>
      {/* bottom gradient */}
      <div style={{position:'absolute',inset:0,
        background:'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 20%, transparent 50%, rgba(0,0,0,0.85) 100%)',
        pointerEvents:'none'}}/>

      {/* top: source filters (scrollable feel) */}
      <div style={{position:'absolute',top:60,left:0,right:0,padding:'0 16px',
        display:'flex',gap:6,zIndex:5,overflowX:'auto'}}>
        {filters.map(f=>{
          const on = actFilter === f.id;
          return (
            <button key={f.id} style={{
              padding:'8px 14px',borderRadius:999,fontSize:13,fontWeight:600,cursor:'pointer',
              background: on ? '#fff' : 'rgba(0,0,0,0.4)',
              color: on ? MPAL.ink : '#fff',
              border: on ? 'none' : '1px solid rgba(255,255,255,0.18)',
              backdropFilter: on ? 'none' : 'blur(20px)',whiteSpace:'nowrap',flexShrink:0,
            }}>{f.l}</button>
          );
        })}
      </div>

      {/* right side actions */}
      <div style={{position:'absolute',right:14,bottom:230,display:'flex',flexDirection:'column',gap:16,zIndex:5}}>
        {[
          {ic:'heart',label:card.loves,fill:false},
          {ic:'bookmark',label:'1.2k',fill:false},
          {ic:'share',label:lang==='fr'?'Partager':'Share'},
        ].map((a,i)=>(
          <button key={i} style={{background:'transparent',border:'none',cursor:'pointer',
            display:'flex',flexDirection:'column',alignItems:'center',gap:4,color:'#fff'}}>
            <div style={{width:46,height:46,borderRadius:23,background:'rgba(255,255,255,0.12)',
              backdropFilter:'blur(20px)',display:'flex',alignItems:'center',justifyContent:'center',
              border:'1px solid rgba(255,255,255,0.18)'}}>
              <MIcon name={a.ic} size={20} color="#fff" fill={a.fill?'#fff':'none'}/>
            </div>
            <div style={{fontSize:11,fontWeight:600}}>{a.label}</div>
          </button>
        ))}
      </div>

      {/* SOURCE PILL — distinctive per kind, top of bottom card */}
      <div style={{position:'absolute',left:0,right:0,bottom:130,padding:'0 18px',color:'#fff',zIndex:5}}>
        <div style={{
          display:'inline-flex',alignItems:'center',gap:8,
          padding:'6px 12px 6px 6px',borderRadius:999,
          background:'rgba(255,255,255,0.14)',
          backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.18)',
          marginBottom:12,
        }}>
          <div style={{width:22,height:22,borderRadius:11,background:meta.tint,
            display:'flex',alignItems:'center',justifyContent:'center'}}>
            <MIcon name={meta.icon} size={12} color="#fff"
              fill={src.kind==='studio'?'#fff':'none'} stroke={src.kind==='studio'?0:1.8}/>
          </div>
          <div style={{display:'flex',flexDirection:'column',lineHeight:1.1}}>
            <span className="mono" style={{fontSize:9,letterSpacing:'.14em',fontWeight:700,opacity:0.95}}>
              · {src.label[lang]}
            </span>
            <span style={{fontSize:10,opacity:0.7,marginTop:1}}>{src.by[lang]}</span>
          </div>
          {src.match && (
            <div style={{
              marginLeft:6,padding:'3px 8px',borderRadius:999,background:accent,
              fontSize:10,fontWeight:700,letterSpacing:'.04em',whiteSpace:'nowrap',
            }}>
              {src.match}% {lang==='fr'?'pour toi':'for you'}
            </div>
          )}
        </div>

        <div className="serif" style={{fontSize:32,letterSpacing:'-0.02em',lineHeight:1.05}}>
          {card.name[lang]}
        </div>
        <div style={{fontSize:13,opacity:0.85,marginTop:4,maxWidth:280}}>{card.desc[lang]}</div>

        {/* CTA row — varies by source */}
        <div style={{marginTop:14,display:'flex',gap:10}}>
          <button style={{
            flex:1,padding:'13px 18px',borderRadius:999,background:'#fff',color:MPAL.ink,
            border:'none',cursor:'pointer',fontSize:14,fontWeight:600,
            display:'flex',alignItems:'center',justifyContent:'center',gap:8,
          }}>
            <MIcon name="sparkle" size={15}/> {mt(lang,'try_look')}
          </button>
          {src.kind === 'salon' && (
            <button style={{
              padding:'13px 16px',borderRadius:999,background:accent,color:'#fff',
              border:'none',cursor:'pointer',fontSize:13,fontWeight:600,
              display:'flex',alignItems:'center',justifyContent:'center',gap:6,whiteSpace:'nowrap',
            }}>
              <MIcon name="pin" size={14} color="#fff"/>{mt(lang,'book')}
            </button>
          )}
          {src.kind === 'user' && (
            <button style={{
              padding:'13px 16px',borderRadius:999,background:'rgba(255,255,255,0.14)',color:'#fff',
              border:'1px solid rgba(255,255,255,0.22)',backdropFilter:'blur(20px)',
              cursor:'pointer',fontSize:13,fontWeight:600,whiteSpace:'nowrap',
            }}>
              {lang==='fr'?'Voir profil':'See profile'}
            </button>
          )}
          {src.kind === 'studio' && (
            <button style={{
              width:48,height:48,borderRadius:24,background:'rgba(255,255,255,0.14)',
              backdropFilter:'blur(20px)',border:'1px solid rgba(255,255,255,0.22)',
              cursor:'pointer',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',
            }}><MIcon name="bookmark" size={18} color="#fff"/></button>
          )}
        </div>
      </div>

      {/* swipe hint */}
      <div style={{position:'absolute',right:14,top:130,color:'#fff',
        display:'flex',flexDirection:'column',alignItems:'center',gap:4,opacity:0.55,zIndex:5}}>
        <MIcon name="arrowUp" size={13} color="#fff"/>
        <div style={{fontSize:10,letterSpacing:'.08em',writingMode:'vertical-rl'}}>{mt(lang,'swipe_hint')}</div>
      </div>
      <TabBar active="explore" lang={lang} dark/>
    </div>
  );
}

// Variants for canvas — each picks a different source from MFEED
function MScreenFeedStudio({lang,accent}){return <MScreenFeed lang={lang} accent={accent} srcIdx={0} activeFilter="all"/>;}
function MScreenFeedSalon({lang,accent}){ return <MScreenFeed lang={lang} accent={accent} srcIdx={1} activeFilter="salon"/>;}
function MScreenFeedUser({lang,accent}){  return <MScreenFeed lang={lang} accent={accent} srcIdx={2} activeFilter="user"/>;}

// 4. CUSTOMIZE ──────────────────────────────────────────────────────────────
function MSlider({ label, value, onChange, labels, accent }) {
  const ref = mUR(null);
  const handle = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = (e.touches?e.touches[0].clientX:e.clientX) - r.left;
    onChange(Math.max(0,Math.min(1,x/r.width)));
  };
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <div style={{fontSize:13,fontWeight:600,color:MPAL.ink}}>{label}</div>
        {labels && <div style={{fontSize:12,color:MPAL.mute}}>{labels[Math.round(value*(labels.length-1))]}</div>}
      </div>
      <div ref={ref} onMouseDown={(e)=>{handle(e); const m=(e)=>handle(e); const u=()=>{window.removeEventListener('mousemove',m);window.removeEventListener('mouseup',u);}; window.addEventListener('mousemove',m); window.addEventListener('mouseup',u);}}
        style={{height:32,position:'relative',cursor:'pointer',display:'flex',alignItems:'center'}}>
        <div style={{position:'absolute',left:0,right:0,height:5,borderRadius:5,background:MPAL.border}}/>
        <div style={{position:'absolute',left:0,width:`${value*100}%`,height:5,borderRadius:5,background:accent}}/>
        <div style={{position:'absolute',left:`calc(${value*100}% - 13px)`,width:26,height:26,borderRadius:13,
          background:MPAL.paper,border:`2.5px solid ${accent}`,boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}/>
      </div>
    </div>
  );
}

function MScreenCustomize({ lang, accent }) {
  const [prompt, setPrompt] = mUS(lang==='fr'?'Reflets caramel doux, un peu plus court':'Soft caramel highlights, a bit shorter');
  const [len, setLen] = mUS(0.4);
  const [vol, setVol] = mUS(0.5);
  const [col, setCol] = mUS(2);
  const colors = ['#1A1612','#5A3A20','#A07242','#D9B987','#E8C9A0'];
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:MPAL.bg,color:MPAL.ink,overflow:'hidden'}}>
      <div style={{height:54}}/>
      <TopBar title={mt(lang,'customize')} big onBack={()=>{}}/>
      <div style={{flex:1,overflowY:'auto',padding:'0 18px 18px'}}>
        {/* preview card */}
        <div style={{
          display:'flex',gap:14,padding:12,borderRadius:18,background:MPAL.paper,
          border:`1px solid ${MPAL.border}`,marginBottom:18,
        }}>
          <div style={{width:90,height:114,borderRadius:12,overflow:'hidden',flexShrink:0}}>
            <MPortrait hair="bob" mood="warm" tint={accent}/>
          </div>
          <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center'}}>
            <div className="mono" style={{fontSize:9,letterSpacing:'.12em',color:MPAL.mute,fontWeight:600}}>
              {lang==='fr'?'BASE':'BASE'}
            </div>
            <div className="serif" style={{fontSize:22,marginTop:2,letterSpacing:'-0.01em',lineHeight:1.1}}>
              Carré flou caramel
            </div>
            <div style={{fontSize:11,color:MPAL.mute,marginTop:4}}>
              {lang==='fr'?'Sélectionné dans le feed':'Picked from feed'}
            </div>
          </div>
        </div>

        {/* prompt */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:11,letterSpacing:'.12em',textTransform:'uppercase',color:MPAL.mute,
            fontWeight:600,marginBottom:8}}>{lang==='fr'?'Ta vision':'Your vision'}</div>
          <div style={{
            padding:14,borderRadius:14,background:MPAL.paper,border:`1px solid ${MPAL.border}`,
          }}>
            <textarea value={prompt} onChange={(e)=>setPrompt(e.target.value)}
              style={{
                width:'100%',border:'none',background:'transparent',outline:'none',
                fontSize:14,color:MPAL.ink,fontFamily:"'Geist',sans-serif",resize:'none',
                lineHeight:1.5,minHeight:50,
              }}/>
            <div style={{display:'flex',alignItems:'center',gap:10,marginTop:8}}>
              <button style={{
                padding:'8px 12px',borderRadius:999,background:accent,color:'#fff',
                border:'none',cursor:'pointer',fontSize:12,fontWeight:600,
                display:'flex',alignItems:'center',gap:6,
              }}><MIcon name="mic" size={13} color="#fff"/> {lang==='fr'?'Dicter':'Dictate'}</button>
              <button style={{
                padding:'8px 12px',borderRadius:999,background:'transparent',color:MPAL.ink,
                border:`1px solid ${MPAL.border}`,cursor:'pointer',fontSize:12,fontWeight:500,
                display:'flex',alignItems:'center',gap:6,
              }}><MIcon name="sparkle" size={13}/> {mt(lang,'inspire_me')}</button>
            </div>
          </div>
        </div>

        {/* sliders */}
        <div style={{display:'flex',flexDirection:'column',gap:16,
          padding:18,borderRadius:14,background:MPAL.paper,border:`1px solid ${MPAL.border}`}}>
          <MSlider label={mt(lang,'length')} value={len} onChange={setLen} accent={accent}
            labels={[lang==='fr'?'Court':'Short',lang==='fr'?'Mi-long':'Medium',lang==='fr'?'Long':'Long']}/>
          <MSlider label={mt(lang,'vibe')} value={vol} onChange={setVol} accent={accent}
            labels={[lang==='fr'?'Discret':'Subtle',lang==='fr'?'Naturel':'Natural',lang==='fr'?'Audacieux':'Bold']}/>
          <div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:600}}>{mt(lang,'color')}</div>
              <div style={{fontSize:12,color:MPAL.mute}}>
                {['Noir','Châtain','Caramel','Miel','Blond'][col]}
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              {colors.map((c,i)=>(
                <button key={i} onClick={()=>setCol(i)} style={{
                  flex:1,height:44,borderRadius:12,background:c,cursor:'pointer',
                  border: col===i ? `3px solid ${accent}` : `1px solid ${MPAL.border}`,
                  outline: col===i ? `2px solid ${MPAL.bg}` : 'none', outlineOffset:-5,
                }}/>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{padding:'14px 18px 32px',background:`linear-gradient(to top, ${MPAL.bg} 70%, ${MPAL.bg}00)`}}>
        <MPrimary label={mt(lang,'generate')} icon="sparkle" accent={accent}/>
        <div style={{textAlign:'center',marginTop:8,fontSize:11,color:MPAL.mute,
          display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
          <MIcon name="coin" size={11} color={MPAL.mute}/>
          {lang==='fr'?`Utilise 1 crédit · ${MUSER.credits} crédits restants`:`Uses 1 credit · ${MUSER.credits} credits left`}
        </div>
      </div>
    </div>
  );
}

// 5. GENERATING ─────────────────────────────────────────────────────────────
function MScreenGenerating({ lang }) {
  const accent = MPAL.sable;
  const [pct, setPct] = mUS(0);
  mUE(()=>{
    const id = setInterval(()=>setPct(p=>p>=90?15:p+2),120);
    return ()=>clearInterval(id);
  },[]);
  return (
    <div style={{height:'100%',background:'#0a0908',color:'#fff',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',inset:0,opacity:0.85}}>
        <MPortrait hair="medium" mood="warm" tint={accent}/>
      </div>
      <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 50% 40%, transparent, rgba(0,0,0,0.85))'}}/>
      {/* scanning lines */}
      <div style={{position:'absolute',left:0,right:0,top:`${pct*0.85}%`,height:2,
        background:`linear-gradient(90deg, transparent, ${accent}, transparent)`,
        boxShadow:`0 0 16px ${accent}`,transition:'top .12s'}}/>
      {/* corner brackets */}
      <svg width="100%" height="100%" style={{position:'absolute',inset:0,pointerEvents:'none'}}>
        {[[40,140],[362,140],[40,560],[362,560]].map(([x,y],i)=>(
          <g key={i} stroke={accent} strokeWidth="2" fill="none">
            <path d={`M${x} ${y+14} L${x} ${y} L${x+14} ${y}`} transform={
              i===1?`scale(-1,1) translate(${-2*x},0)`:
              i===2?`scale(1,-1) translate(0,${-2*y})`:
              i===3?`scale(-1,-1) translate(${-2*x},${-2*y})`:''
            }/>
          </g>
        ))}
      </svg>
      {/* texts */}
      <div style={{position:'absolute',top:120,left:0,right:0,textAlign:'center',padding:'0 30px'}}>
        <div className="mono" style={{fontSize:10,letterSpacing:'.14em',opacity:0.65,marginBottom:8}}>
          ÉTAPE 3 / 3
        </div>
        <div className="serif" style={{fontSize:34,letterSpacing:'-0.02em',lineHeight:1.05}}>
          {mt(lang,'generating')}
        </div>
      </div>
      {/* progress */}
      <div style={{position:'absolute',bottom:80,left:24,right:24}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
          <div className="mono" style={{fontSize:11,letterSpacing:'.12em',opacity:0.7}}>
            {[
              lang==='fr'?'ANALYSE DU VISAGE':'FACE ANALYSIS',
              lang==='fr'?'LECTURE DU PROMPT':'READING PROMPT',
              lang==='fr'?'COMPOSITION':'COMPOSITION',
              lang==='fr'?'FINALISATION':'FINALISING',
            ][Math.min(3,Math.floor(pct/25))]}
          </div>
          <div className="mono" style={{fontSize:11,letterSpacing:'.12em',opacity:0.7}}>
            {pct}%
          </div>
        </div>
        <div style={{height:4,background:'rgba(255,255,255,0.12)',borderRadius:4,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${pct}%`,background:accent,transition:'width .15s'}}/>
        </div>
        <div style={{textAlign:'center',marginTop:14,fontSize:12,opacity:0.6}}>
          {lang==='fr'?'~ 20 secondes':'~ 20 seconds'}
        </div>
      </div>
    </div>
  );
}

// 6. RESULT (Before/After) ──────────────────────────────────────────────────
function MScreenResult({ lang, accent }) {
  const [pos, setPos] = mUS(0.55);
  const [saved, setSaved] = mUS(false);
  const ref = mUR(null);
  const drag = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = (e.touches?e.touches[0].clientX:e.clientX) - r.left;
    setPos(Math.max(0.05,Math.min(0.95,x/r.width)));
  };
  return (
    <div style={{height:'100%',background:MPAL.bg,position:'relative',display:'flex',flexDirection:'column'}}>
      <div style={{height:54}}/>
      <TopBar
        title="" onBack={()=>{}}
        right={
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setSaved(s=>!s)} style={{
              width:36,height:36,borderRadius:18,border:'none',cursor:'pointer',
              background:saved?accent:'rgba(0,0,0,0.05)',color:saved?'#fff':MPAL.ink,
              display:'flex',alignItems:'center',justifyContent:'center',
            }}><MIcon name="heart" size={18} color={saved?'#fff':MPAL.ink} fill={saved?'#fff':'none'}/></button>
            <button style={{
              width:36,height:36,borderRadius:18,border:'none',cursor:'pointer',
              background:'rgba(0,0,0,0.05)',color:MPAL.ink,
              display:'flex',alignItems:'center',justifyContent:'center',
            }}><MIcon name="share" size={18}/></button>
          </div>
        }
      />
      <div style={{padding:'0 18px 6px'}}>
        <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:accent,fontWeight:600}}>
          ✦ TON APERÇU
        </div>
        <div className="serif" style={{fontSize:30,letterSpacing:'-0.02em',marginTop:4,lineHeight:1.05}}>
          Carré flou caramel
        </div>
        <div style={{fontSize:13,color:MPAL.mute,marginTop:4}}>
          {lang==='fr'?'Tu peux glisser pour comparer':'Drag to compare'}
        </div>
      </div>
      <div style={{flex:1,padding:'14px 18px 0'}}>
        <div ref={ref}
          onMouseDown={(e)=>{drag(e); const m=(e)=>drag(e); const u=()=>{window.removeEventListener('mousemove',m);window.removeEventListener('mouseup',u);}; window.addEventListener('mousemove',m); window.addEventListener('mouseup',u);}}
          style={{
            height:'100%',borderRadius:24,overflow:'hidden',position:'relative',
            cursor:'ew-resize',
          }}>
          <div style={{position:'absolute',inset:0}}>
            <MPortrait hair="medium" mood="warm" label="AVANT"/>
          </div>
          <div style={{position:'absolute',top:0,left:0,bottom:0,width:`${pos*100}%`,overflow:'hidden'}}>
            <div style={{width:`${100/pos}%`,height:'100%'}}>
              <MPortrait hair="bob" mood="warm" tint={accent} label="APRÈS"/>
            </div>
          </div>
          <div style={{position:'absolute',top:14,left:14,padding:'5px 10px',borderRadius:999,
            background:'rgba(255,255,255,0.95)',fontSize:10,fontWeight:700,letterSpacing:'.1em',color:MPAL.ink}}>
            {mt(lang,'after').toUpperCase()}
          </div>
          <div style={{position:'absolute',top:14,right:14,padding:'5px 10px',borderRadius:999,
            background:'rgba(0,0,0,0.6)',color:'#fff',fontSize:10,fontWeight:700,letterSpacing:'.1em'}}>
            {mt(lang,'before').toUpperCase()}
          </div>
          <div style={{position:'absolute',top:0,bottom:0,left:`${pos*100}%`,width:2,background:'#fff',
            boxShadow:'0 0 12px rgba(0,0,0,0.4)'}}/>
          <div style={{position:'absolute',top:'50%',left:`${pos*100}%`,transform:'translate(-50%,-50%)',
            width:48,height:48,borderRadius:24,background:'#fff',boxShadow:'0 4px 14px rgba(0,0,0,0.3)',
            display:'flex',alignItems:'center',justifyContent:'center',color:MPAL.ink}}>
            <MIcon name="chevronLeft" size={14}/><MIcon name="chevronRight" size={14}/>
          </div>
        </div>
      </div>
      <div style={{padding:'14px 18px 32px',display:'flex',gap:10}}>
        <button style={{
          flex:1,padding:'13px 14px',borderRadius:999,background:'transparent',
          border:`1px solid ${MPAL.border}`,color:MPAL.ink,cursor:'pointer',fontSize:14,fontWeight:600,
          display:'flex',alignItems:'center',justifyContent:'center',gap:8,
        }}>
          <MIcon name="sparkle" size={15}/> {mt(lang,'see_more')}
        </button>
        <button style={{
          flex:1.4,padding:'13px 14px',borderRadius:999,background:accent,color:'#fff',
          border:'none',cursor:'pointer',fontSize:14,fontWeight:600,
          display:'flex',alignItems:'center',justifyContent:'center',gap:8,
        }}>
          <MIcon name="pin" size={15} color="#fff"/> {mt(lang,'book')}
        </button>
      </div>
    </div>
  );
}

// 7. WARDROBE ───────────────────────────────────────────────────────────────
function MScreenWardrobe({ lang, accent }) {
  const [tab, setTab] = mUS(0);
  const tabs = [mt(lang,'sort_recent'), mt(lang,'sort_loved'), mt(lang,'sort_summer')];
  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,position:'relative',display:'flex',flexDirection:'column'}}>
      <div style={{height:54}}/>
      <TopBar title={mt(lang,'your_looks')} big right={
        <button style={{width:36,height:36,borderRadius:18,border:'none',
          background:'rgba(0,0,0,0.05)',cursor:'pointer',color:MPAL.ink,
          display:'flex',alignItems:'center',justifyContent:'center'}}>
          <MIcon name="plus" size={18}/></button>
      }/>
      <div style={{padding:'4px 18px 12px',display:'flex',gap:8,overflowX:'auto'}}>
        {tabs.map((label,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{
            padding:'7px 14px',borderRadius:999,fontSize:13,fontWeight:600,cursor:'pointer',
            background: tab===i ? MPAL.ink : MPAL.paper, color: tab===i ? MPAL.inkInv : MPAL.ink,
            border:`1px solid ${tab===i ? MPAL.ink : MPAL.border}`,whiteSpace:'nowrap',
          }}>{label}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'0 16px 110px'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {MWARDROBE.map((w,i)=>(
            <div key={w.id} style={{
              borderRadius:18,overflow:'hidden',position:'relative',aspectRatio:'3/4',
              background:MPAL.paper,border:`1px solid ${MPAL.border}`,
              transform: i%2 ? 'translateY(12px)' : 'translateY(0)',
            }}>
              <MPortrait hair={w.hair} mood={w.mood} tint={i%3===0?accent:undefined}/>
              {w.loved && (
                <div style={{position:'absolute',top:8,right:8,width:28,height:28,borderRadius:14,
                  background:'rgba(255,255,255,0.92)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <MIcon name="heart" size={14} color={accent} fill={accent} stroke={0}/>
                </div>
              )}
              <div style={{position:'absolute',left:0,right:0,bottom:0,
                background:'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                padding:'24px 10px 10px',color:'#fff'}}>
                <div style={{fontSize:12,fontWeight:600,letterSpacing:'-0.01em',lineHeight:1.2}}>{w.name}</div>
                <div className="mono" style={{fontSize:9,letterSpacing:'.1em',opacity:0.75,marginTop:2}}>
                  · {w.tag.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{marginTop:18,padding:'18px',borderRadius:18,background:MPAL.paper,
          border:`1px dashed ${MPAL.border}`,display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:48,height:48,borderRadius:24,background:MPAL.subtle,
            display:'flex',alignItems:'center',justifyContent:'center',color:accent}}>
            <MIcon name="sparkle" size={22} color={accent}/>
          </div>
          <div style={{flex:1}}>
            <div className="serif" style={{fontSize:18,letterSpacing:'-0.01em'}}>
              {lang==='fr'?'Essaye une coupe surprise':'Try a surprise cut'}
            </div>
            <div style={{fontSize:11,color:MPAL.mute,marginTop:2}}>
              {lang==='fr'?'Mèche choisit pour toi':'Mèche picks for you'}
            </div>
          </div>
          <MIcon name="chevronRight" size={18} color={MPAL.mute}/>
        </div>
      </div>
      <TabBar active="wardrobe" lang={lang}/>
    </div>
  );
}

// 8. SALONS ─────────────────────────────────────────────────────────────────
function MScreenSalons({ lang, accent }) {
  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,position:'relative',display:'flex',flexDirection:'column'}}>
      <div style={{height:54}}/>
      <TopBar title={mt(lang,'salons')} big right={
        <button style={{width:36,height:36,borderRadius:18,border:'none',
          background:'rgba(0,0,0,0.05)',cursor:'pointer',color:MPAL.ink,
          display:'flex',alignItems:'center',justifyContent:'center'}}>
          <MIcon name="settings" size={18}/></button>
      }/>
      {/* mini-map */}
      <div style={{margin:'4px 16px 14px',height:160,borderRadius:18,overflow:'hidden',position:'relative',
        background:`linear-gradient(135deg, #DDD3BD, #C2B391)`,border:`1px solid ${MPAL.border}`}}>
        <svg width="100%" height="100%" viewBox="0 0 360 160" preserveAspectRatio="xMidYMid slice"
             style={{display:'block'}}>
          {/* roads */}
          {[
            'M0 60 L360 70', 'M0 110 L360 100', 'M80 0 L70 160', 'M180 0 L190 160', 'M280 0 L270 160',
          ].map((d,i)=>(
            <path key={i} d={d} stroke="rgba(255,255,255,0.7)" strokeWidth="2" fill="none"/>
          ))}
          {/* blocks */}
          {[[20,12,50,40],[100,18,50,30],[160,75,40,30],[210,15,50,38],[290,68,30,40],[100,115,60,30],[200,115,50,30]].map(([x,y,w,h],i)=>(
            <rect key={i} x={x} y={y} width={w} height={h} fill="rgba(0,0,0,0.06)" rx="2"/>
          ))}
          {/* pins */}
          {[{x:90,y:70,m:96},{x:200,y:95,m:92},{x:280,y:60,m:88},{x:140,y:130,m:81}].map((p,i)=>(
            <g key={i}>
              <ellipse cx={p.x} cy={p.y+10} rx="8" ry="3" fill="rgba(0,0,0,0.15)"/>
              <path d={`M${p.x} ${p.y-16} A8 8 0 1 1 ${p.x+0.01} ${p.y-16} L${p.x} ${p.y} Z`}
                fill={i===0?accent:MPAL.ink}/>
              <circle cx={p.x} cy={p.y-14} r="3.5" fill="#fff"/>
            </g>
          ))}
          {/* user pos */}
          <circle cx="180" cy="80" r="6" fill={MPAL.community} stroke="#fff" strokeWidth="2"/>
          <circle cx="180" cy="80" r="18" fill={MPAL.community} opacity="0.18"/>
        </svg>
        <div style={{position:'absolute',top:10,left:10,padding:'5px 10px',borderRadius:999,
          background:'rgba(255,255,255,0.92)',fontSize:11,fontWeight:600,
          display:'flex',alignItems:'center',gap:6,color:MPAL.ink}}>
          <span style={{width:6,height:6,borderRadius:6,background:accent}}/>
          {lang==='fr'?'Salons compatibles':'Matching salons'}
        </div>
        <div style={{position:'absolute',bottom:10,right:10,padding:'5px 10px',borderRadius:999,
          background:'rgba(255,255,255,0.92)',fontSize:11,fontWeight:600,color:MPAL.ink}}>
          {mt(lang,'near_me')}
        </div>
      </div>

      <div style={{padding:'0 18px 6px',display:'flex',alignItems:'baseline',justifyContent:'space-between'}}>
        <div style={{fontSize:11,letterSpacing:'.12em',textTransform:'uppercase',color:MPAL.mute,fontWeight:600}}>
          {lang==='fr'?'AVEC CETTE COUPE':'WITH THIS CUT'}
        </div>
        <div className="mono" style={{fontSize:10,letterSpacing:'.08em',color:MPAL.mute}}>4 SALONS</div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'10px 16px 110px'}}>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {MSALONS.map((s,i)=>(
            <div key={s.id} style={{
              padding:14,borderRadius:16,background:MPAL.paper,border:`1px solid ${MPAL.border}`,
              display:'flex',gap:12,alignItems:'center',
            }}>
              <div style={{width:54,height:54,borderRadius:12,background:MPAL.subtle,flexShrink:0,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontFamily:"'Instrument Serif',serif",fontSize:22,color:MPAL.ink,fontStyle:'italic'}}>
                {s.name[0]}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{fontSize:14,fontWeight:600,color:MPAL.ink,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {s.name}
                  </div>
                  {s.open && <span style={{
                    padding:'2px 6px',borderRadius:4,background:'#1F8A5B',color:'#fff',
                    fontSize:9,fontWeight:700,letterSpacing:'.05em'}}>OUVERT</span>}
                </div>
                <div style={{fontSize:11,color:MPAL.mute,marginTop:2}}>{s.area} · {s.dist}</div>
                <div style={{display:'flex',alignItems:'center',gap:10,marginTop:6,fontSize:11,whiteSpace:'nowrap'}}>
                  <span style={{display:'flex',alignItems:'center',gap:3,whiteSpace:'nowrap'}}>
                    <MIcon name="star" size={11} fill={accent} color={accent} stroke={0}/>
                    <span style={{fontWeight:600,color:MPAL.ink}}>{s.rating}</span>
                    <span style={{color:MPAL.mute}}>({s.reviews})</span>
                  </span>
                  <span style={{color:MPAL.mute,whiteSpace:'nowrap'}}>{s.price}</span>
                  <span style={{display:'flex',alignItems:'center',gap:3,color:i===0?accent:MPAL.mute,fontWeight:600,whiteSpace:'nowrap'}}>
                    <MIcon name="flame" size={11} color={i===0?accent:MPAL.mute} fill={i===0?accent:'none'} stroke={i===0?0:1.7}/>
                    {s.match}%
                  </span>
                </div>
              </div>
              <button style={{
                padding:'10px 14px',borderRadius:999,background:i===0?accent:'transparent',
                color:i===0?'#fff':MPAL.ink,border:i===0?'none':`1px solid ${MPAL.border}`,
                cursor:'pointer',fontSize:12,fontWeight:600,flexShrink:0,whiteSpace:'nowrap',
              }}>{mt(lang,'book')}</button>
            </div>
          ))}
        </div>
      </div>
      <TabBar active="salons" lang={lang}/>
    </div>
  );
}

// 9. SHARE ──────────────────────────────────────────────────────────────────
function MScreenShare({ lang, accent }) {
  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,position:'relative',display:'flex',flexDirection:'column'}}>
      <div style={{height:54}}/>
      <TopBar title={mt(lang,'share')} big onBack={()=>{}}/>

      <div style={{padding:'4px 24px 14px',textAlign:'center'}}>
        <div style={{fontSize:13,color:MPAL.mute,maxWidth:300,margin:'0 auto'}}>
          {lang==='fr'?'Carte prête à publier — Stories, posts, lien direct.':'Ready-to-post card — Stories, posts, direct link.'}
        </div>
      </div>

      {/* preview card */}
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 24px'}}>
        <div style={{
          width:240,aspectRatio:'9/16',borderRadius:22,overflow:'hidden',
          background:MPAL.ink,position:'relative',
          boxShadow:'0 24px 60px rgba(0,0,0,0.25), 0 0 0 6px #fff',
          transform:'rotate(-3deg)',
        }}>
          {/* before/after split */}
          <div style={{position:'absolute',inset:0,display:'flex'}}>
            <div style={{flex:1,position:'relative'}}>
              <MPortrait hair="medium" mood="warm"/>
              <div style={{position:'absolute',top:10,left:10,padding:'3px 8px',
                background:'rgba(255,255,255,0.92)',borderRadius:4,
                fontSize:8,fontWeight:700,letterSpacing:'.12em',color:MPAL.ink}}>AVANT</div>
            </div>
            <div style={{flex:1,position:'relative'}}>
              <MPortrait hair="bob" mood="warm" tint={accent}/>
              <div style={{position:'absolute',top:10,right:10,padding:'3px 8px',
                background:accent,borderRadius:4,
                fontSize:8,fontWeight:700,letterSpacing:'.12em',color:'#fff'}}>APRÈS</div>
            </div>
          </div>
          <div style={{position:'absolute',left:'50%',top:0,bottom:0,width:1,
            background:'rgba(255,255,255,0.6)',transform:'translateX(-0.5px)'}}/>
          {/* bottom watermark */}
          <div style={{position:'absolute',left:0,right:0,bottom:0,
            background:'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
            padding:'30px 14px 12px',color:'#fff'}}>
            <MWordmark size={22} color="#fff" accent={MPAL.sable}/>
            <div style={{fontSize:9,opacity:0.75,marginTop:4,letterSpacing:'.04em'}}>
              Carré flou caramel · @camille.r
            </div>
          </div>
        </div>
      </div>

      {/* share grid */}
      <div style={{padding:'14px 18px 0'}}>
        <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600,marginBottom:10}}>
          {mt(lang,'share_to').toUpperCase()}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          {[
            {ic:'instagram',label:'Story',bg:'linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)',c:'#fff'},
            {ic:'instagram',label:'Post',bg:MPAL.paper,c:MPAL.ink},
            {ic:'tiktok',label:'TikTok',bg:MPAL.ink,c:'#fff'},
            {ic:'snap',label:'Snap',bg:'#FFFC00',c:MPAL.ink},
          ].map((o,i)=>(
            <button key={i} style={{
              padding:'14px 8px',borderRadius:16,background:o.bg,color:o.c,border:'none',cursor:'pointer',
              display:'flex',flexDirection:'column',alignItems:'center',gap:6,
            }}>
              <MIcon name={o.ic} size={22} color={o.c}/>
              <span style={{fontSize:11,fontWeight:600}}>{o.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:'14px 18px 32px'}}>
        <div style={{
          padding:'14px 16px',borderRadius:16,background:MPAL.paper,border:`1px solid ${MPAL.border}`,
          display:'flex',alignItems:'center',gap:12,
        }}>
          <div style={{width:36,height:36,borderRadius:18,background:MPAL.subtle,
            display:'flex',alignItems:'center',justifyContent:'center',color:MPAL.ink}}>
            <MIcon name="link" size={18}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600}}>{mt(lang,'copy_link')}</div>
            <div className="mono" style={{fontSize:10,color:MPAL.mute,letterSpacing:'.05em',
              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:2}}>
              mecheapp.com/r/AX72-9KQ4
            </div>
          </div>
          <button style={{
            padding:'8px 14px',borderRadius:999,background:MPAL.ink,color:'#fff',
            border:'none',cursor:'pointer',fontSize:12,fontWeight:600,
          }}>{lang==='fr'?'Copier':'Copy'}</button>
        </div>
      </div>
    </div>
  );
}

// 10. PROFILE / PAYWALL ─────────────────────────────────────────────────────
function MScreenProfile({ lang, accent }) {
  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,position:'relative',display:'flex',flexDirection:'column'}}>
      <div style={{height:54}}/>
      <TopBar title={mt(lang,'profile')} big right={
        <button style={{width:36,height:36,borderRadius:18,border:'none',
          background:'rgba(0,0,0,0.05)',cursor:'pointer',color:MPAL.ink,
          display:'flex',alignItems:'center',justifyContent:'center'}}>
          <MIcon name="settings" size={18}/></button>
      }/>

      <div style={{flex:1,overflowY:'auto',padding:'4px 18px 110px'}}>
        {/* avatar / identity */}
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:18}}>
          <div style={{width:72,height:72,borderRadius:36,overflow:'hidden',
            border:`2px solid ${accent}`,padding:3,background:MPAL.bg}}>
            <div style={{width:'100%',height:'100%',borderRadius:'50%',overflow:'hidden'}}>
              <MPortrait hair="medium" mood="warm"/>
            </div>
          </div>
          <div>
            <div className="serif" style={{fontSize:24,letterSpacing:'-0.01em'}}>{MUSER.name}</div>
            <div style={{fontSize:12,color:MPAL.mute,marginTop:2}}>{MUSER.handle} · {mt(lang,'member_since')} {MUSER.since}</div>
          </div>
        </div>

        {/* credits balance card */}
        <div style={{
          padding:18,borderRadius:18,background:MPAL.ink,color:MPAL.inkInv,
          position:'relative',overflow:'hidden',marginBottom:14,
        }}>
          <div style={{position:'absolute',top:-40,right:-40,width:180,height:180,borderRadius:90,
            background:`radial-gradient(circle, ${MPAL.sable}55, transparent 70%)`}}/>
          <div style={{position:'relative'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <MIcon name="coin" size={16} color={MPAL.sable} stroke={1.8}/>
              <div className="mono" style={{fontSize:10,letterSpacing:'.18em',color:MPAL.sable,fontWeight:600}}>
                {lang==='fr'?'CRÉDITS IA':'AI CREDITS'}
              </div>
            </div>
            <div style={{display:'flex',alignItems:'baseline',gap:8}}>
              <div className="serif" style={{fontSize:56,letterSpacing:'-0.03em',lineHeight:1}}>{MUSER.credits}</div>
              <div style={{fontSize:14,opacity:0.6}}>{mt(lang,'credits_left')}</div>
            </div>
            <div style={{fontSize:11,opacity:0.55,marginTop:6}}>
              {lang==='fr'?`Dernier achat · ${MUSER.last_pack}`:`Last purchase · ${MUSER.last_pack}`}
            </div>
            <div style={{marginTop:14,display:'flex',gap:10,alignItems:'center'}}>
              <button style={{
                padding:'10px 16px',borderRadius:999,background:MPAL.sable,color:MPAL.sableInk,
                border:'none',cursor:'pointer',fontSize:13,fontWeight:600,
                display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap',
              }}>
                <MIcon name="zap" size={14} color={MPAL.sableInk} fill={MPAL.sableInk} stroke={0}/>
                {mt(lang,'recharge')}
              </button>
              <div style={{fontSize:11,opacity:0.55,lineHeight:1.4}}>
                {lang==='fr'?'À partir de 4,99 € · sans abonnement':'From €4.99 · no subscription'}
              </div>
            </div>
          </div>
        </div>

        {/* recent history */}
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:10}}>
          <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600}}>
            {lang==='fr'?'TES DERNIERS ESSAIS':'YOUR RECENT TRIES'}
          </div>
          <div style={{fontSize:12,color:MPAL.mute}}>{lang==='fr'?'Tout voir':'See all'}</div>
        </div>
        <div style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:8,marginBottom:14}}>
          {MWARDROBE.slice(0,4).map((w,i)=>(
            <div key={w.id} style={{width:100,flexShrink:0,borderRadius:14,overflow:'hidden',
              background:MPAL.paper,border:`1px solid ${MPAL.border}`}}>
              <div style={{aspectRatio:'3/4'}}>
                <MPortrait hair={w.hair} mood={w.mood} tint={i%3===0?accent:undefined}/>
              </div>
              <div style={{padding:'6px 8px',fontSize:10,fontWeight:600,
                whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{w.name}</div>
            </div>
          ))}
        </div>

        {/* settings rows */}
        <div style={{borderRadius:16,background:MPAL.paper,border:`1px solid ${MPAL.border}`}}>
          {[
            {ic:'calendar',l:lang==='fr'?'Mes rendez-vous':'My appointments',sub:lang==='fr'?'1 à venir':'1 upcoming'},
            {ic:'heart',   l:lang==='fr'?'Salons favoris':'Favorite salons',sub:'3'},
            {ic:'settings',l:lang==='fr'?'Préférences':'Preferences',sub:lang==='fr'?'Langue, notifs':'Language, notifs'},
          ].map((r,i,arr)=>(
            <div key={i} style={{
              padding:'14px 16px',display:'flex',alignItems:'center',gap:14,
              borderTop: i ? `1px solid ${MPAL.border}`:'none',
            }}>
              <div style={{width:36,height:36,borderRadius:18,background:MPAL.subtle,
                display:'flex',alignItems:'center',justifyContent:'center',color:MPAL.ink}}>
                <MIcon name={r.ic} size={16}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600}}>{r.l}</div>
                <div style={{fontSize:11,color:MPAL.mute,marginTop:1}}>{r.sub}</div>
              </div>
              <MIcon name="chevronRight" size={16} color={MPAL.mute}/>
            </div>
          ))}
        </div>
      </div>
      <TabBar active="profile" lang={lang}/>
    </div>
  );
}

Object.assign(window, {
  MScreenWelcome, MScreenSelfie, MScreenFeed, MScreenFeedStudio, MScreenFeedSalon, MScreenFeedUser, MScreenCustomize,
  MScreenGenerating, MScreenResult, MScreenWardrobe, MScreenSalons,
  MScreenShare, MScreenProfile,
});
