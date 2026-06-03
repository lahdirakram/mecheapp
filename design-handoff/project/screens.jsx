// screens.jsx — the 10 screens of Reflet
// Globals: ScreenLogin, ScreenCapture, ScreenConfigure, ScreenGallery,
//          ScreenGenerating, ScreenBeforeAfter, ScreenCompare, ScreenUpsell,
//          ScreenRecap, ScreenDashboard

const { useState, useEffect, useRef } = React;

// ─── Shared bits ────────────────────────────────────────────────────────────
function StepDots({ pal, step, total = 6, accent }) {
  return (
    <div style={{display:'flex',gap:6,alignItems:'center'}}>
      {Array.from({length: total}).map((_, i) => (
        <div key={i} style={{
          width: i === step ? 24 : 6, height: 6, borderRadius: 6,
          background: i <= step ? accent : pal.border, transition: 'width .25s',
        }}/>
      ))}
    </div>
  );
}

function Header({ pal, lang, accent, step, title, onBack, right }) {
  return (
    <div style={{
      padding: '14px 28px 18px', display:'flex', alignItems:'center', justifyContent:'space-between',
      borderBottom: `1px solid ${pal.border}`,
    }}>
      <div style={{display:'flex',alignItems:'center',gap:14}}>
        {onBack ? (
          <button onClick={onBack} style={{
            width:36,height:36,borderRadius:18,border:`1px solid ${pal.border}`,background:pal.paper,
            display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:pal.ink,
          }}><Icon name="chevronLeft" size={18}/></button>
        ) : (
          <div className="serif" style={{fontSize:26,letterSpacing:'-0.01em',color:pal.ink}}>Reflet</div>
        )}
        <div>
          <div style={{fontSize:11,letterSpacing:'.16em',textTransform:'uppercase',color:pal.mute,fontWeight:500}}>
            {t(lang,'newSession')}
          </div>
          {title && <div className="serif" style={{fontSize:22,marginTop:2,color:pal.ink}}>{title}</div>}
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:14}}>
        {step != null && <StepDots pal={pal} step={step} accent={accent}/>}
        {right}
      </div>
    </div>
  );
}

function ActionBar({ pal, accent, children }) {
  return (
    <div style={{
      position:'absolute', left:0, right:0, bottom:0, padding:'18px 24px 26px',
      background:`linear-gradient(to top, ${pal.bg} 60%, ${pal.bg}00)`,
      display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,
    }}>{children}</div>
  );
}

function PrimaryBtn({ pal, accent, label, onClick, icon, full, ghost }) {
  return (
    <button onClick={onClick} style={{
      flex: full ? 1 : 'initial',
      padding: '14px 22px', borderRadius: 999,
      background: ghost ? 'transparent' : accent,
      color: ghost ? pal.ink : pal.inkInv,
      border: ghost ? `1px solid ${pal.border}` : 'none',
      fontSize: 15, fontWeight: 600, cursor: 'pointer',
      display:'flex',alignItems:'center',justifyContent:'center',gap:8,
      letterSpacing: '.01em',
    }}>
      {label}
      {icon && <Icon name={icon} size={16}/>}
    </button>
  );
}

// ─── 1. LOGIN ──────────────────────────────────────────────────────────────
function ScreenLogin({ pal, lang, accent }) {
  const [pin, setPin] = useState('');
  const [selected, setSelected] = useState('lea');
  const stylists = [
    { id:'lea', name:'Léa M.', role:'Senior' },
    { id:'karim', name:'Karim B.', role:'Coloriste' },
    { id:'sofia', name:'Sofia D.', role:'Junior' },
    { id:'theo', name:'Théo R.', role:'Barbier' },
  ];
  const press = (n) => setPin(p => (p.length<4 ? p+n : p));
  const back  = () => setPin(p => p.slice(0,-1));
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <StatusBar pal={pal}/>
      <div style={{
        padding: '40px 36px 24px',
        background: pal.paper,
        borderBottom: `1px solid ${pal.border}`,
      }}>
        <div className="serif" style={{fontSize:54,lineHeight:1.05,letterSpacing:'-0.02em',color:pal.ink}}>
          {t(lang,'hello')}.<br/>
          <span style={{fontStyle:'italic',color:accent}}>Reflet</span> vous attend.
        </div>
        <div style={{marginTop:14,color:pal.mute,fontSize:15,maxWidth:480}}>
          Salon République · 24 rue Bonaparte, Paris
        </div>
        <div className="mono" style={{marginTop:8,fontSize:11,color:pal.mute,letterSpacing:'.08em'}}>
          MARDI 14 MAI · 09:24 · {t(lang,'todaySessions',{n:7})}
        </div>
      </div>

      <div style={{padding:'28px 36px 0',display:'flex',gap:12}}>
        {stylists.map(s => (
          <button key={s.id} onClick={()=>{setSelected(s.id);setPin('');}} style={{
            flex:1,padding:14,borderRadius:16,cursor:'pointer',
            background: selected===s.id ? pal.ink : pal.paper,
            color: selected===s.id ? pal.inkInv : pal.ink,
            border:`1px solid ${selected===s.id ? pal.ink : pal.border}`,
            display:'flex',flexDirection:'column',alignItems:'center',gap:8,
            transition:'all .15s',
          }}>
            <div style={{
              width:48,height:48,borderRadius:24,
              background: selected===s.id ? accent : pal.subtle,
              display:'flex',alignItems:'center',justifyContent:'center',
              color: selected===s.id ? pal.inkInv : pal.ink, fontWeight:600, fontSize:18,
              fontFamily:"'Instrument Serif',serif",
            }}>{s.name[0]}</div>
            <div style={{fontSize:13,fontWeight:600}}>{s.name}</div>
            <div style={{fontSize:11,opacity:.7}}>{s.role}</div>
          </button>
        ))}
      </div>

      <div style={{flex:1,padding:'36px 36px 28px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <div style={{fontSize:13,letterSpacing:'.12em',textTransform:'uppercase',color:pal.mute,marginBottom:18}}>
          {t(lang,'enterPin')}
        </div>
        <div style={{display:'flex',gap:14,marginBottom:36}}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width:54,height:64,borderRadius:14,
              border:`1.5px solid ${pin.length===i ? accent : pal.border}`,
              background:pal.paper,
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:28,fontWeight:600,color:pal.ink,
            }}>{pin[i] ? '•' : ''}</div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,72px)',gap:12}}>
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} onClick={()=>press(String(n))} style={{
              width:72,height:60,borderRadius:14,background:pal.paper,border:`1px solid ${pal.border}`,
              fontSize:22,fontWeight:500,cursor:'pointer',color:pal.ink,
              fontFamily:"'Instrument Serif',serif",
            }}>{n}</button>
          ))}
          <div/>
          <button onClick={()=>press('0')} style={{
            width:72,height:60,borderRadius:14,background:pal.paper,border:`1px solid ${pal.border}`,
            fontSize:22,fontWeight:500,cursor:'pointer',color:pal.ink,
            fontFamily:"'Instrument Serif',serif",
          }}>0</button>
          <button onClick={back} style={{
            width:72,height:60,borderRadius:14,background:'transparent',border:`1px solid ${pal.border}`,
            cursor:'pointer',color:pal.mute,display:'flex',alignItems:'center',justifyContent:'center',
          }}><Icon name="chevronLeft" size={20}/></button>
        </div>
        <div style={{marginTop:24,fontSize:12,color:pal.mute}}>{t(lang,'forgotPin')}</div>
      </div>
    </div>
  );
}

// ─── 2. CAPTURE ─────────────────────────────────────────────────────────────
function ScreenCapture({ pal, lang, accent }) {
  const [consent, setConsent] = useState(true);
  const [flash, setFlash] = useState(false);
  const shutter = () => { setFlash(true); setTimeout(()=>setFlash(false),350); };
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:pal.bg}}>
      <StatusBar pal={pal}/>
      <Header pal={pal} lang={lang} accent={accent} step={0} title={t(lang,'capturePhoto')}
        right={<button style={{background:'transparent',border:'none',cursor:'pointer',color:pal.mute,fontSize:14}}>{t(lang,'cancel')}</button>}/>
      <div style={{flex:1,padding:24,position:'relative'}}>
        <div style={{
          height:'100%',borderRadius:24,background:'#0a0908',position:'relative',overflow:'hidden',
          border:`1px solid ${pal.border}`,
        }}>
          {/* viewfinder backdrop */}
          <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 50% 35%, #2a2520 0%, #0a0908 70%)'}}/>
          <PortraitPlaceholder pal={pal} label="viseur · live" hair="medium"/>
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.35)'}}/>

          {/* face oval guide */}
          <svg width="100%" height="100%" viewBox="0 0 760 800" preserveAspectRatio="xMidYMid slice"
               style={{position:'absolute',inset:0}}>
            <defs>
              <mask id="ovalmask">
                <rect width="760" height="800" fill="white"/>
                <ellipse cx="380" cy="370" rx="210" ry="280" fill="black"/>
              </mask>
            </defs>
            <rect width="760" height="800" fill="rgba(0,0,0,0.55)" mask="url(#ovalmask)"/>
            <ellipse cx="380" cy="370" rx="210" ry="280" fill="none"
                     stroke={accent} strokeWidth="2" strokeDasharray="6 6"/>
            {/* corners */}
            {[[170,90],[590,90],[170,650],[590,650]].map(([x,y],i)=>(
              <g key={i} stroke="white" strokeWidth="2" fill="none" opacity="0.85">
                <path d={`M${x} ${y+14} L${x} ${y} L${x+14} ${y}`} transform={
                  i===1?`scale(-1,1) translate(${-2*x},0)`:
                  i===2?`scale(1,-1) translate(0,${-2*y})`:
                  i===3?`scale(-1,-1) translate(${-2*x},${-2*y})`:''
                }/>
              </g>
            ))}
          </svg>

          {/* top floating chip */}
          <div style={{
            position:'absolute',top:20,left:'50%',transform:'translateX(-50%)',
            padding:'8px 14px',borderRadius:999,background:'rgba(255,255,255,0.92)',
            display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#1a1612',fontWeight:500,
          }}>
            <span style={{width:6,height:6,borderRadius:6,background:accent}}/>
            {t(lang,'captureHint')}
          </div>

          {/* flash overlay */}
          {flash && <div style={{position:'absolute',inset:0,background:'white',opacity:0.85,transition:'opacity .3s'}}/>}

          {/* shutter */}
          <div style={{
            position:'absolute',bottom:32,left:0,right:0,
            display:'flex',alignItems:'center',justifyContent:'center',gap:32,
          }}>
            <button style={{
              width:52,height:52,borderRadius:26,border:'1px solid rgba(255,255,255,0.3)',
              background:'rgba(0,0,0,0.4)',color:'white',cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',
            }}><Icon name="bolt" size={18}/></button>
            <button onClick={shutter} style={{
              width:78,height:78,borderRadius:39,border:'4px solid white',
              background:'white',cursor:'pointer',
              boxShadow:'0 8px 24px rgba(0,0,0,0.4)',
            }}>
              <div style={{width:'100%',height:'100%',borderRadius:'50%',background:accent,
                transform:'scale(0.86)'}}/>
            </button>
            <button style={{
              width:52,height:52,borderRadius:26,border:'1px solid rgba(255,255,255,0.3)',
              background:'rgba(0,0,0,0.4)',color:'white',cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',
            }}><Icon name="camera" size={20}/></button>
          </div>
        </div>
      </div>
      <div style={{padding:'8px 28px 24px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setConsent(c=>!c)} style={{
          width:22,height:22,borderRadius:6,border:`1.5px solid ${consent?accent:pal.border}`,
          background:consent?accent:'transparent',cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
        }}>{consent && <Icon name="check" size={14} color={pal.inkInv} stroke={2.4}/>}</button>
        <div style={{fontSize:12,color:pal.mute,lineHeight:1.4}}>{t(lang,'consent')}</div>
      </div>
    </div>
  );
}

// ─── 3. CONFIGURE ───────────────────────────────────────────────────────────
function Slider({ pal, accent, label, value, onChange, labels }) {
  const ref = useRef(null);
  const handle = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = (e.touches?e.touches[0].clientX:e.clientX) - r.left;
    onChange(Math.max(0,Math.min(1,x/r.width)));
  };
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <div style={{fontSize:13,fontWeight:500,color:pal.ink}}>{label}</div>
        {labels && <div style={{fontSize:12,color:pal.mute}}>{labels[Math.round(value*(labels.length-1))]}</div>}
      </div>
      <div ref={ref} onMouseDown={(e)=>{handle(e); const m=(e)=>handle(e); const u=()=>{window.removeEventListener('mousemove',m);window.removeEventListener('mouseup',u);}; window.addEventListener('mousemove',m); window.addEventListener('mouseup',u);}}
        style={{height:32,position:'relative',cursor:'pointer',display:'flex',alignItems:'center'}}>
        <div style={{position:'absolute',left:0,right:0,height:4,borderRadius:4,background:pal.border}}/>
        <div style={{position:'absolute',left:0,width:`${value*100}%`,height:4,borderRadius:4,background:accent}}/>
        <div style={{position:'absolute',left:`calc(${value*100}% - 12px)`,width:24,height:24,borderRadius:12,
          background:pal.paper,border:`2px solid ${accent}`,boxShadow:'0 2px 6px rgba(0,0,0,0.12)'}}/>
        {labels && labels.map((_,i,a)=>(
          <div key={i} style={{position:'absolute',left:`${i/(a.length-1)*100}%`,top:24,fontSize:10,
            color:pal.mute,transform:'translateX(-50%)'}}>·</div>
        ))}
      </div>
    </div>
  );
}

function ScreenConfigure({ pal, lang, accent }) {
  const [prompt, setPrompt] = useState(lang==='fr'
    ? 'Carré flou aux épaules, frange rideau légère, reflets caramel discrets'
    : 'Shoulder soft bob, light curtain bangs, subtle caramel highlights');
  const [listening, setListening] = useState(false);
  const [len, setLen]   = useState(0.45);
  const [fri, setFri]   = useState(0.6);
  const [vol, setVol]   = useState(0.4);
  const [col, setCol]   = useState(2);
  const [tex, setTex]   = useState(0.5);
  const colors = ['#1A1612', '#5A3A20', '#A07242', '#D9B987', '#E8C9A0', '#C2C2C2'];

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <StatusBar pal={pal}/>
      <Header pal={pal} lang={lang} accent={accent} step={1} title={t(lang,'configure')} onBack={()=>{}}/>
      <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column',padding:'20px 28px 0'}}>
        {/* photo + prompt */}
        <div style={{display:'flex',gap:18,marginBottom:22}}>
          <div style={{width:140,height:180,borderRadius:14,overflow:'hidden',flexShrink:0,
            border:`1px solid ${pal.border}`}}>
            <PortraitPlaceholder pal={pal} label="client · base" hair="medium"/>
          </div>
          <div style={{flex:1,display:'flex',flexDirection:'column'}}>
            <div style={{fontSize:11,letterSpacing:'.12em',textTransform:'uppercase',color:pal.mute,marginBottom:8,fontWeight:500}}>
              {t(lang,'prompt')}
            </div>
            <textarea value={prompt} onChange={(e)=>setPrompt(e.target.value)}
              style={{
                flex:1,padding:'12px 14px',borderRadius:14,border:`1px solid ${pal.border}`,
                background:pal.paper,color:pal.ink,fontSize:14,lineHeight:1.45,resize:'none',
                fontFamily:"'Geist',sans-serif",outline:'none',
                minHeight:120,
              }}/>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:10}}>
              <button onMouseDown={()=>setListening(true)} onMouseUp={()=>setListening(false)}
                onMouseLeave={()=>setListening(false)} style={{
                display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderRadius:999,
                background: listening ? accent : pal.paper, color: listening ? pal.inkInv : pal.ink,
                border:`1px solid ${listening ? accent : pal.border}`, cursor:'pointer', fontSize:13, fontWeight:500,
              }}>
                <Icon name="mic" size={14}/>
                {listening ? t(lang,'listening') : t(lang,'holdToSpeak')}
                {listening && <span style={{display:'inline-flex',gap:2}}>
                  {[8,12,6,10].map((h,i)=><span key={i} style={{width:2,height:h,background:pal.inkInv,borderRadius:1,animation:`pulse 0.6s ${i*0.1}s infinite`}}/>)}
                </span>}
              </button>
              <div style={{fontSize:11,color:pal.mute}} className="mono">{prompt.length} / 280</div>
            </div>
          </div>
        </div>

        {/* sliders */}
        <div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 1fr',gap:'22px 28px',
          padding:'22px 24px',background:pal.paper,borderRadius:18,border:`1px solid ${pal.border}`,
          alignContent:'start'}}>
          <Slider pal={pal} accent={accent} label={t(lang,'length')} value={len} onChange={setLen}
            labels={[t(lang,'short'),t(lang,'medium'),t(lang,'long')]}/>
          <Slider pal={pal} accent={accent} label={t(lang,'fringe')} value={fri} onChange={setFri}
            labels={[t(lang,'none'),t(lang,'curtain'),t(lang,'full'),t(lang,'side')]}/>
          <Slider pal={pal} accent={accent} label={t(lang,'volume')} value={vol} onChange={setVol}
            labels={[t(lang,'flat'),t(lang,'natural'),t(lang,'voluminous')]}/>
          <Slider pal={pal} accent={accent} label={t(lang,'texture')} value={tex} onChange={setTex}
            labels={['Lisse','Ondulé','Bouclé','Crépu']}/>
          <div style={{gridColumn:'1 / -1'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:500}}>{t(lang,'color')}</div>
              <div style={{fontSize:12,color:pal.mute}}>{['Noir','Châtain foncé','Châtain clair','Caramel','Blond','Gris cendré'][col]}</div>
            </div>
            <div style={{display:'flex',gap:10}}>
              {colors.map((c,i)=>(
                <button key={i} onClick={()=>setCol(i)} style={{
                  flex:1,height:42,borderRadius:12,background:c,cursor:'pointer',
                  border: col===i ? `2.5px solid ${accent}` : `1px solid ${pal.border}`,
                  outline: col===i ? `2px solid ${pal.bg}` : 'none', outlineOffset: -5,
                  boxShadow: col===i ? `0 0 0 1.5px ${accent}` : 'none',
                }}/>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{padding:'18px 28px 26px',display:'flex',alignItems:'center',gap:12}}>
        <PrimaryBtn pal={pal} accent={accent} ghost label={t(lang,'gallery')}/>
        <div style={{flex:1}}/>
        <PrimaryBtn pal={pal} accent={accent} label={t(lang,'generate')} icon="sparkle"/>
      </div>
      <style>{`@keyframes pulse{0%,100%{transform:scaleY(0.5)}50%{transform:scaleY(1)}}`}</style>
    </div>
  );
}

// ─── 4. GALLERY ─────────────────────────────────────────────────────────────
function ScreenGallery({ pal, lang, accent }) {
  const [selected, setSelected] = useState('s1');
  const cats = lang==='fr'
    ? ['Tous','Courts','Mi-longs','Longs','Bouclés','Hommes']
    : ['All','Short','Medium','Long','Curly','Men'];
  const [cat, setCat] = useState(0);
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <StatusBar pal={pal}/>
      <Header pal={pal} lang={lang} accent={accent} step={1} title={t(lang,'gallery')} onBack={()=>{}}/>
      <div style={{padding:'16px 28px 0',display:'flex',gap:8,overflowX:'auto'}}>
        {cats.map((c,i)=>(
          <button key={i} onClick={()=>setCat(i)} style={{
            padding:'8px 16px',borderRadius:999,fontSize:13,fontWeight:500,cursor:'pointer',
            background: cat===i ? pal.ink : pal.paper, color: cat===i ? pal.inkInv : pal.ink,
            border:`1px solid ${cat===i ? pal.ink : pal.border}`,whiteSpace:'nowrap',
          }}>{c}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'18px 28px'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          {MOCK_STYLES.map((s)=>(
            <button key={s.id} onClick={()=>setSelected(s.id)} style={{
              padding:0,border:'none',background:'transparent',cursor:'pointer',textAlign:'left',
            }}>
              <div style={{
                position:'relative',aspectRatio:'4/5',borderRadius:16,overflow:'hidden',
                border: selected===s.id ? `2.5px solid ${accent}` : `1px solid ${pal.border}`,
              }}>
                <PortraitPlaceholder pal={pal} label={s.name[lang]} hair={s.len}/>
                {selected===s.id && (
                  <div style={{
                    position:'absolute',top:10,right:10,
                    width:28,height:28,borderRadius:14,background:accent,
                    display:'flex',alignItems:'center',justifyContent:'center',
                  }}><Icon name="check" size={16} color={pal.inkInv} stroke={2.4}/></div>
                )}
              </div>
              <div style={{padding:'10px 4px 0'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                  <div className="serif" style={{fontSize:18,color:pal.ink}}>{s.name[lang]}</div>
                  <div className="mono" style={{fontSize:10,color:pal.mute,letterSpacing:'.05em'}}>
                    {s.len.toUpperCase()}
                  </div>
                </div>
                <div style={{fontSize:12,color:pal.mute,marginTop:2}}>{s.desc[lang]}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div style={{padding:'16px 28px 24px',display:'flex',alignItems:'center',gap:12,
        borderTop:`1px solid ${pal.border}`,background:pal.paper}}>
        <PrimaryBtn pal={pal} accent={accent} ghost label={t(lang,'prompt')} icon="sliders"/>
        <div style={{flex:1}}/>
        <PrimaryBtn pal={pal} accent={accent} label={t(lang,'generate')} icon="sparkle"/>
      </div>
    </div>
  );
}

// ─── 5. GENERATING ──────────────────────────────────────────────────────────
function ScreenGenerating({ pal, lang, accent }) {
  const [pct, setPct] = useState(0);
  useEffect(()=>{
    const id = setInterval(()=>setPct(p => p>=92 ? 12 : p+2), 120);
    return ()=>clearInterval(id);
  },[]);
  const steps = lang==='fr'
    ? ['Analyse du visage','Étude du prompt','Composition','Texture & lumière','Finalisation']
    : ['Face analysis','Reading prompt','Composition','Texture & light','Finalising'];
  const activeStep = Math.min(steps.length-1, Math.floor(pct/20));
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <StatusBar pal={pal}/>
      <Header pal={pal} lang={lang} accent={accent} step={2} title={t(lang,'generating')}/>
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0 36px'}}>
        <div style={{position:'relative',width:300,height:380,marginBottom:36}}>
          <div style={{
            width:'100%',height:'100%',borderRadius:24,overflow:'hidden',
            border:`1px solid ${pal.border}`,
          }}>
            <PortraitPlaceholder pal={pal} label="" hair="medium"/>
          </div>
          {/* scanning bar */}
          <div style={{
            position:'absolute',left:0,right:0,top:`${pct*0.85}%`,height:2,
            background:`linear-gradient(90deg, transparent, ${accent}, transparent)`,
            boxShadow:`0 0 12px ${accent}`,
          }}/>
          <div style={{
            position:'absolute',inset:0,borderRadius:24,
            background:`linear-gradient(180deg, ${accent}10 0%, transparent ${pct}%, transparent 100%)`,
            pointerEvents:'none',
          }}/>
          {/* corner brackets */}
          {[{t:0,l:0,r:'0 0 0 1.5px'},{t:0,r:0,r2:'0 1.5px 0 0'},{b:0,l:0,r2:'1.5px 0 0 0'},{b:0,r:0,r2:'0 0 1.5px 0'}].map((p,i)=>(
            <div key={i} style={{position:'absolute',top:p.t,left:p.l,right:p.r,bottom:p.b,
              width:20,height:20,
              borderTop: p.t===0 ? `1.5px solid ${accent}` : 'none',
              borderBottom: p.b===0 ? `1.5px solid ${accent}` : 'none',
              borderLeft: p.l===0 ? `1.5px solid ${accent}` : 'none',
              borderRight: p.r===0 ? `1.5px solid ${accent}` : 'none',
            }}/>
          ))}
        </div>
        <div className="serif" style={{fontSize:32,color:pal.ink,letterSpacing:'-0.01em',marginBottom:6}}>
          {t(lang,'generatingHint')}
        </div>
        <div className="mono" style={{fontSize:11,color:pal.mute,letterSpacing:'.1em',marginBottom:28}}>
          {t(lang,'estimated',{s:Math.max(1,Math.ceil((100-pct)/20))})}
        </div>
        <div style={{width:'100%',maxWidth:380}}>
          <div style={{height:4,background:pal.border,borderRadius:4,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${pct}%`,background:accent,transition:'width .15s'}}/>
          </div>
          <div style={{marginTop:18,display:'flex',flexDirection:'column',gap:8}}>
            {steps.map((s,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,
                color: i<activeStep ? pal.mute : i===activeStep ? pal.ink : pal.mute,
                opacity: i<=activeStep ? 1 : 0.4, fontSize:13,transition:'opacity .2s'}}>
                <span style={{width:14,height:14,borderRadius:7,border:`1.5px solid ${i<=activeStep?accent:pal.border}`,
                  background: i<activeStep ? accent : 'transparent',
                  display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {i<activeStep && <Icon name="check" size={9} color={pal.inkInv} stroke={3}/>}
                  {i===activeStep && <span style={{width:6,height:6,borderRadius:3,background:accent,animation:'pulse 1s infinite'}}/>}
                </span>
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 6. BEFORE / AFTER ──────────────────────────────────────────────────────
function ScreenBeforeAfter({ pal, lang, accent }) {
  const [pos, setPos] = useState(0.55);
  const ref = useRef(null);
  const drag = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = (e.touches?e.touches[0].clientX:e.clientX) - r.left;
    setPos(Math.max(0.05,Math.min(0.95,x/r.width)));
  };
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <StatusBar pal={pal}/>
      <Header pal={pal} lang={lang} accent={accent} step={3} title={t(lang,'result')} onBack={()=>{}}
        right={<button style={{padding:'6px 12px',borderRadius:999,border:`1px solid ${pal.border}`,
          background:'transparent',cursor:'pointer',fontSize:12,color:pal.ink,display:'flex',gap:6,alignItems:'center'}}>
          <Icon name="history" size={12}/> v1 / 4</button>}/>
      <div style={{padding:'18px 28px 8px',display:'flex',alignItems:'baseline',justifyContent:'space-between'}}>
        <div className="serif" style={{fontSize:30,color:pal.ink,letterSpacing:'-0.01em'}}>
          Carré flou, frange rideau
        </div>
        <div className="mono" style={{fontSize:11,color:pal.mute,letterSpacing:'.08em'}}>
          GEN · 18s
        </div>
      </div>
      <div style={{flex:1,padding:'8px 28px 0',position:'relative'}}>
        <div ref={ref}
          onMouseDown={(e)=>{drag(e); const m=(e)=>drag(e); const u=()=>{window.removeEventListener('mousemove',m);window.removeEventListener('mouseup',u);}; window.addEventListener('mousemove',m); window.addEventListener('mouseup',u);}}
          style={{
            height:'100%',borderRadius:20,overflow:'hidden',position:'relative',
            border:`1px solid ${pal.border}`,cursor:'ew-resize',
          }}>
          {/* before (full width) */}
          <div style={{position:'absolute',inset:0}}>
            <PortraitPlaceholder pal={pal} label={t(lang,'before').toUpperCase()} hair="medium"/>
          </div>
          {/* after (clipped) */}
          <div style={{position:'absolute',top:0,left:0,bottom:0,width:`${pos*100}%`,overflow:'hidden'}}>
            <div style={{width:`${100/pos}%`,height:'100%'}}>
              <PortraitPlaceholder pal={pal} label={t(lang,'after').toUpperCase()} hair="long" tint={accent}/>
            </div>
          </div>
          {/* labels */}
          <div style={{position:'absolute',top:18,left:18,padding:'6px 12px',borderRadius:999,
            background:'rgba(255,255,255,0.95)',fontSize:11,fontWeight:600,letterSpacing:'.08em',color:'#1a1612'}}>
            {t(lang,'after').toUpperCase()}
          </div>
          <div style={{position:'absolute',top:18,right:18,padding:'6px 12px',borderRadius:999,
            background:'rgba(0,0,0,0.65)',color:'#fff',fontSize:11,fontWeight:600,letterSpacing:'.08em'}}>
            {t(lang,'before').toUpperCase()}
          </div>
          {/* divider */}
          <div style={{position:'absolute',top:0,bottom:0,left:`${pos*100}%`,width:2,background:'white',
            boxShadow:'0 0 12px rgba(0,0,0,0.4)'}}/>
          <div style={{position:'absolute',top:'50%',left:`${pos*100}%`,transform:'translate(-50%,-50%)',
            width:42,height:42,borderRadius:21,background:'white',boxShadow:'0 4px 14px rgba(0,0,0,0.3)',
            display:'flex',alignItems:'center',justifyContent:'center',color:'#1a1612'}}>
            <Icon name="chevronLeft" size={14}/><Icon name="chevronRight" size={14}/>
          </div>
        </div>
      </div>
      <div style={{padding:'18px 28px 26px',display:'flex',alignItems:'center',gap:10}}>
        <PrimaryBtn pal={pal} accent={accent} ghost label={t(lang,'retake')} icon="camera"/>
        <PrimaryBtn pal={pal} accent={accent} ghost label={t(lang,'variants')} icon="sparkle"/>
        <div style={{flex:1}}/>
        <PrimaryBtn pal={pal} accent={accent} ghost label={t(lang,'save')}/>
        <PrimaryBtn pal={pal} accent={accent} label={t(lang,'continue')} icon="arrowRight"/>
      </div>
    </div>
  );
}

// ─── 7. COMPARE (4 variants) ────────────────────────────────────────────────
function ScreenCompare({ pal, lang, accent }) {
  const [favs, setFavs] = useState({a:true});
  const variants = [
    { id:'a', name: lang==='fr'?'Carré flou':'Soft bob', sub:'18 cm · caramel', hair:'medium' },
    { id:'b', name: lang==='fr'?'Wolf cut':'Wolf cut', sub:'longueurs · noir',  hair:'long' },
    { id:'c', name: lang==='fr'?'Pixie texturé':'Textured pixie', sub:'court · châtain', hair:'short' },
    { id:'d', name: lang==='fr'?'Boucles définies':'Defined curls', sub:'mi-long · caramel', hair:'curly' },
  ];
  const toggle = (id) => setFavs(f => ({...f, [id]: !f[id]}));
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <StatusBar pal={pal}/>
      <Header pal={pal} lang={lang} accent={accent} step={3} title={t(lang,'variants')} onBack={()=>{}}
        right={<button style={{padding:'6px 12px',borderRadius:999,border:`1px solid ${pal.border}`,
          background:'transparent',cursor:'pointer',fontSize:12,color:pal.ink,display:'flex',gap:6,alignItems:'center'}}>
          <Icon name="plus" size={12}/> {lang==='fr'?'Nouvelle variante':'New variant'}</button>}/>
      <div style={{padding:'14px 28px 8px',display:'flex',alignItems:'center',gap:10}}>
        <div style={{fontSize:13,color:pal.mute,flex:1}}>{t(lang,'pickFavorite')}</div>
        <div className="mono" style={{fontSize:11,color:pal.mute,letterSpacing:'.06em'}}>
          {Object.values(favs).filter(Boolean).length} / 4 ♥
        </div>
      </div>
      <div style={{flex:1,padding:'8px 28px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {variants.map(v => (
          <div key={v.id} style={{
            borderRadius:18,overflow:'hidden',position:'relative',
            border: favs[v.id] ? `2.5px solid ${accent}` : `1px solid ${pal.border}`,
            background:pal.paper, display:'flex',flexDirection:'column',
          }}>
            <div style={{flex:1,position:'relative',minHeight:0}}>
              <PortraitPlaceholder pal={pal} label="" hair={v.hair}/>
              <button onClick={()=>toggle(v.id)} style={{
                position:'absolute',top:12,right:12,width:36,height:36,borderRadius:18,
                background:'rgba(255,255,255,0.92)',border:'none',cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',
                color: favs[v.id] ? accent : '#666',
                boxShadow:'0 2px 8px rgba(0,0,0,0.15)',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={favs[v.id]?accent:'none'} stroke={favs[v.id]?accent:'#666'} strokeWidth="2">
                  <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z"/>
                </svg>
              </button>
              <div style={{
                position:'absolute',top:12,left:12,width:24,height:24,borderRadius:12,
                background: favs[v.id] ? accent : 'rgba(0,0,0,0.5)',
                color:'white',fontSize:11,fontWeight:600,
                display:'flex',alignItems:'center',justifyContent:'center',
              }}>{v.id.toUpperCase()}</div>
            </div>
            <div style={{padding:'12px 14px',borderTop:`1px solid ${pal.border}`,background:pal.paper}}>
              <div className="serif" style={{fontSize:18,color:pal.ink}}>{v.name}</div>
              <div className="mono" style={{fontSize:10,color:pal.mute,letterSpacing:'.05em',marginTop:2}}>
                {v.sub.toUpperCase()}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{padding:'16px 28px 24px',display:'flex',alignItems:'center',gap:12}}>
        <PrimaryBtn pal={pal} accent={accent} ghost label={t(lang,'back')}/>
        <div style={{flex:1}}/>
        <PrimaryBtn pal={pal} accent={accent} label={lang==='fr'?'Continuer avec A':'Continue with A'} icon="arrowRight"/>
      </div>
    </div>
  );
}

// ─── 8. UPSELL ──────────────────────────────────────────────────────────────
function ScreenUpsell({ pal, lang, accent }) {
  const [picked, setPicked] = useState({p1:true, p4:true});
  const toggle = (id) => setPicked(p => ({...p, [id]: !p[id]}));
  const total = MOCK_PRODUCTS.filter(p => picked[p.id]).reduce((s,p) => s+p.price, 0);
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <StatusBar pal={pal}/>
      <Header pal={pal} lang={lang} accent={accent} step={4} title={t(lang,'upsell')} onBack={()=>{}}/>
      <div style={{flex:1,overflowY:'auto',padding:'20px 28px'}}>
        {/* chosen cut card */}
        <div style={{
          display:'flex',gap:14,padding:14,borderRadius:16,background:pal.paper,
          border:`1px solid ${pal.border}`, marginBottom:20,
        }}>
          <div style={{width:80,height:100,borderRadius:10,overflow:'hidden',flexShrink:0}}>
            <PortraitPlaceholder pal={pal} label="" hair="medium"/>
          </div>
          <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center'}}>
            <div className="mono" style={{fontSize:10,letterSpacing:'.1em',color:pal.mute}}>
              {lang==='fr'?'COUPE CHOISIE':'CHOSEN CUT'}
            </div>
            <div className="serif" style={{fontSize:22,color:pal.ink,marginTop:2}}>
              Carré flou, frange rideau
            </div>
            <div style={{fontSize:12,color:pal.mute,marginTop:4}}>
              Caramel discret · 18 cm · {t(lang,'duration')}: 1h30
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            <div className="serif" style={{fontSize:28,color:pal.ink}}>€48</div>
            <div className="mono" style={{fontSize:10,letterSpacing:'.08em',color:pal.mute}}>
              {lang==='fr'?'BASE':'BASE'}
            </div>
          </div>
        </div>

        <div style={{fontSize:11,letterSpacing:'.12em',textTransform:'uppercase',color:pal.mute,
          fontWeight:500,marginBottom:12}}>
          {t(lang,'upsellHint')}
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {MOCK_PRODUCTS.map(p => (
            <button key={p.id} onClick={()=>toggle(p.id)} style={{
              display:'flex',alignItems:'center',gap:14,padding:14,borderRadius:14,
              background: picked[p.id] ? pal.paper : 'transparent',
              border: picked[p.id] ? `1.5px solid ${accent}` : `1px solid ${pal.border}`,
              cursor:'pointer',textAlign:'left',transition:'all .15s',
            }}>
              <div style={{
                width:54,height:54,borderRadius:10,background:pal.subtle,flexShrink:0,
                display:'flex',alignItems:'center',justifyContent:'center',color:pal.mute,
              }}><Icon name={p.id==='p3'?'palette':p.id==='p4'?'scissors':'sparkle'} size={22}/></div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'baseline',gap:8}}>
                  <div style={{fontSize:14,fontWeight:600,color:pal.ink}}>{p.name[lang]}</div>
                  <div className="mono" style={{fontSize:10,color:pal.mute,letterSpacing:'.05em'}}>
                    · {p.kind[lang].toUpperCase()}
                  </div>
                </div>
                <div style={{fontSize:12,color:pal.mute,marginTop:2}}>{p.ml}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div className="serif" style={{fontSize:22,color:pal.ink}}>€{p.price}</div>
              </div>
              <div style={{
                width:28,height:28,borderRadius:14,
                background: picked[p.id] ? accent : 'transparent',
                border: picked[p.id] ? 'none' : `1.5px solid ${pal.border}`,
                display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
              }}>{picked[p.id] ? <Icon name="check" size={14} color={pal.inkInv} stroke={2.4}/> : null}</div>
            </button>
          ))}
        </div>
      </div>
      <div style={{padding:'16px 28px 22px',background:pal.paper,borderTop:`1px solid ${pal.border}`,
        display:'flex',alignItems:'center',gap:14}}>
        <div>
          <div className="mono" style={{fontSize:10,letterSpacing:'.12em',color:pal.mute,fontWeight:500}}>
            {t(lang,'estimate').toUpperCase()}
          </div>
          <div className="serif" style={{fontSize:32,color:pal.ink,lineHeight:1}}>€{48+total}</div>
        </div>
        <div style={{flex:1}}/>
        <PrimaryBtn pal={pal} accent={accent} label={t(lang,'addToBasket')} icon="arrowRight"/>
      </div>
    </div>
  );
}

// ─── 9. RECAP ───────────────────────────────────────────────────────────────
function MiniQR({ size=110, color='#1a1612' }) {
  // crude deterministic-looking QR mock
  const cells = 17;
  const seed = [1,3,4,6,7,9,11,12,14,16,2,5,8,10,13,15];
  const isOn = (x,y) => {
    if ((x<7 && y<7) || (x>=10 && y<7) || (x<7 && y>=10)) {
      // finder
      const dx = Math.min(x,6-x,Math.abs(x-(cells-4)));
      const inner = (x===0||x===6||y===0||y===6||x===10||x===16) || (x>=2&&x<=4&&y>=2&&y<=4) || (x>=12&&x<=14&&y>=2&&y<=4) || (x>=2&&x<=4&&y>=12&&y<=14);
      return inner;
    }
    return ((x*31 + y*17 + seed[(x+y)%seed.length]) % 7) < 3;
  };
  const s = size/cells;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${cells} ${cells}`} style={{display:'block'}}>
      {Array.from({length:cells*cells}).map((_,i)=>{
        const x=i%cells, y=Math.floor(i/cells);
        return isOn(x,y) ? <rect key={i} x={x} y={y} width="1" height="1" fill={color}/> : null;
      })}
    </svg>
  );
}

function ScreenRecap({ pal, lang, accent }) {
  const [method, setMethod] = useState('email');
  const items = [
    { kind:lang==='fr'?'Coupe':'Cut', label:'Carré flou + frange rideau', price:48 },
    { kind:lang==='fr'?'Coloration':'Color', label:'Patine caramel', price:65 },
    { kind:lang==='fr'?'Service':'Service', label:'Brushing signature', price:38 },
    { kind:lang==='fr'?'Soin':'Care', label:'Olaplex N°3 (maison)', price:32 },
  ];
  const total = items.reduce((s,i)=>s+i.price,0);
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <StatusBar pal={pal}/>
      <Header pal={pal} lang={lang} accent={accent} step={5} title={t(lang,'recap')} onBack={()=>{}}/>
      <div style={{flex:1,overflowY:'auto',padding:'18px 28px'}}>
        <div style={{
          display:'flex',gap:18,padding:18,borderRadius:18,
          background:pal.paper,border:`1px solid ${pal.border}`,marginBottom:16,
        }}>
          <div style={{display:'flex',gap:8,flexShrink:0}}>
            <div style={{width:88,height:108,borderRadius:10,overflow:'hidden',border:`1px solid ${pal.border}`}}>
              <PortraitPlaceholder pal={pal} label="" hair="medium"/>
              <div style={{position:'absolute',bottom:2,left:4,fontSize:8,letterSpacing:'.1em'}}/>
            </div>
            <div style={{width:88,height:108,borderRadius:10,overflow:'hidden',border:`1.5px solid ${accent}`}}>
              <PortraitPlaceholder pal={pal} label="" hair="long" tint={accent}/>
            </div>
          </div>
          <div style={{flex:1}}>
            <div className="mono" style={{fontSize:10,letterSpacing:'.12em',color:pal.mute,fontWeight:500}}>
              {lang==='fr'?'CLIENT':'CLIENT'} · #2487
            </div>
            <div className="serif" style={{fontSize:24,color:pal.ink,marginTop:2,lineHeight:1.1}}>
              Camille Roux
            </div>
            <div style={{fontSize:12,color:pal.mute,marginTop:6,lineHeight:1.5}}>
              Mardi 14 mai · 09:50<br/>
              avec Léa M. (Senior)<br/>
              {lang==='fr'?'Durée estimée':'Est. duration'} : 2h15
            </div>
          </div>
        </div>

        <div style={{borderRadius:18,background:pal.paper,border:`1px solid ${pal.border}`,marginBottom:16}}>
          {items.map((it,i)=>(
            <div key={i} style={{
              padding:'14px 18px',display:'flex',alignItems:'center',gap:14,
              borderTop: i ? `1px solid ${pal.border}` : 'none',
            }}>
              <div className="mono" style={{fontSize:10,letterSpacing:'.1em',color:pal.mute,
                width:80,fontWeight:500}}>{it.kind.toUpperCase()}</div>
              <div style={{flex:1,fontSize:14,color:pal.ink}}>{it.label}</div>
              <div className="serif" style={{fontSize:20,color:pal.ink}}>€{it.price}</div>
            </div>
          ))}
          <div style={{padding:'14px 18px',display:'flex',alignItems:'baseline',
            borderTop:`1px solid ${pal.border}`,background:pal.soft,borderRadius:'0 0 18px 18px'}}>
            <div style={{flex:1,fontSize:13,letterSpacing:'.1em',textTransform:'uppercase',color:pal.mute,fontWeight:500}}>Total</div>
            <div className="serif" style={{fontSize:34,color:pal.ink,letterSpacing:'-0.01em'}}>€{total}</div>
          </div>
        </div>

        <div style={{fontSize:11,letterSpacing:'.12em',textTransform:'uppercase',color:pal.mute,
          fontWeight:500,marginBottom:10}}>{t(lang,'recapHint')}</div>
        <div style={{display:'flex',gap:10}}>
          {[
            {id:'email',label:t(lang,'byEmail'),icon:'mail'},
            {id:'sms',label:t(lang,'bySms'),icon:'sms'},
            {id:'qr',label:t(lang,'byQr'),icon:'qr'},
          ].map(o => (
            <button key={o.id} onClick={()=>setMethod(o.id)} style={{
              flex:1,padding:'14px 12px',borderRadius:14,cursor:'pointer',
              background: method===o.id ? pal.ink : pal.paper,
              color: method===o.id ? pal.inkInv : pal.ink,
              border:`1px solid ${method===o.id ? pal.ink : pal.border}`,
              display:'flex',flexDirection:'column',alignItems:'center',gap:6,
            }}>
              <Icon name={o.icon} size={20}/>
              <span style={{fontSize:12,fontWeight:500}}>{o.label}</span>
            </button>
          ))}
        </div>

        {method==='qr' && (
          <div style={{
            marginTop:16,padding:18,borderRadius:18,background:pal.paper,border:`1px solid ${pal.border}`,
            display:'flex',alignItems:'center',gap:18,
          }}>
            <div style={{padding:8,background:'white',borderRadius:10,border:`1px solid ${pal.border}`}}>
              <MiniQR size={110} color="#1a1612"/>
            </div>
            <div>
              <div className="serif" style={{fontSize:20,color:pal.ink}}>
                {lang==='fr'?'Le client scanne ici':'Client scans here'}
              </div>
              <div style={{fontSize:12,color:pal.mute,marginTop:4,maxWidth:240,lineHeight:1.4}}>
                {lang==='fr'?'Récupère avant/après, devis et liens vers les produits sur son téléphone.':
                  'They get before/after, quote and product links on their phone.'}
              </div>
              <div className="mono" style={{fontSize:10,color:pal.mute,marginTop:8,letterSpacing:'.08em'}}>
                reflet.app/r/AX72-9KQ4
              </div>
            </div>
          </div>
        )}
      </div>
      <div style={{padding:'14px 28px 22px',display:'flex',gap:10}}>
        <PrimaryBtn pal={pal} accent={accent} ghost label={t(lang,'back')}/>
        <div style={{flex:1}}/>
        <PrimaryBtn pal={pal} accent={accent} label={t(lang,'share')} icon="share"/>
        <PrimaryBtn pal={pal} accent={accent} ghost label={t(lang,'finish')} icon="check"/>
      </div>
    </div>
  );
}

// ─── 10. DASHBOARD ──────────────────────────────────────────────────────────
function Sparkline({ data, color, w=120, h=36 }) {
  const max = Math.max(...data), min = Math.min(...data);
  const norm = (v) => (v-min)/(max-min || 1);
  const pts = data.map((v,i) => [i/(data.length-1)*w, h - norm(v)*(h-6) - 3]);
  const d = pts.map((p,i)=> (i===0?'M':'L')+p[0]+' '+p[1]).join(' ');
  return (
    <svg width={w} height={h} style={{display:'block',overflow:'visible'}}>
      <path d={d+` L${w} ${h} L0 ${h} Z`} fill={color} opacity="0.12"/>
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="3" fill={color}/>
    </svg>
  );
}

function ScreenDashboard({ pal, lang, accent }) {
  const [range, setRange] = useState('week');
  const ranges = [
    { id:'today', label:t(lang,'today')},
    { id:'week', label:t(lang,'week')},
    { id:'month', label:t(lang,'month')},
  ];
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column'}}>
      <StatusBar pal={pal}/>
      <div style={{
        padding: '14px 28px 18px', display:'flex', alignItems:'center', justifyContent:'space-between',
        borderBottom: `1px solid ${pal.border}`,
      }}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div className="serif" style={{fontSize:26,letterSpacing:'-0.01em',color:pal.ink}}>Reflet</div>
          <div>
            <div style={{fontSize:11,letterSpacing:'.16em',textTransform:'uppercase',color:pal.mute,fontWeight:500}}>
              {lang==='fr'?'Manager · République':'Manager · Republique'}
            </div>
            <div className="serif" style={{fontSize:22,marginTop:2,color:pal.ink}}>{t(lang,'dashboard')}</div>
          </div>
        </div>
        <div style={{display:'flex',gap:6,padding:4,borderRadius:999,background:pal.subtle}}>
          {ranges.map(r => (
            <button key={r.id} onClick={()=>setRange(r.id)} style={{
              padding:'6px 14px',borderRadius:999,fontSize:12,cursor:'pointer',
              background: range===r.id ? pal.paper : 'transparent',
              color: range===r.id ? pal.ink : pal.mute,
              border:'none',fontWeight:500,
              boxShadow: range===r.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>{r.label}</button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'20px 28px'}}>
        {/* KPI cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:22}}>
          {[
            { label: t(lang,'conversions'), value: MOCK_KPIS.conversions.value+'%', delta:'+12 pts', spark: MOCK_KPIS.conversions.spark, accent: true },
            { label: t(lang,'avgTicket'),   value: MOCK_KPIS.avgTicket.value,        delta:'+€9',    spark: MOCK_KPIS.avgTicket.spark },
            { label: t(lang,'sessions'),    value: MOCK_KPIS.sessions.value,         delta:'+28',    spark: MOCK_KPIS.sessions.spark },
          ].map((k,i)=>(
            <div key={i} style={{
              padding:'16px 16px 14px',borderRadius:16,background:pal.paper,border:`1px solid ${pal.border}`,
              display:'flex',flexDirection:'column',gap:6,
            }}>
              <div style={{fontSize:11,letterSpacing:'.1em',textTransform:'uppercase',color:pal.mute,fontWeight:500}}>{k.label}</div>
              <div className="serif" style={{fontSize:34,letterSpacing:'-0.02em',color:pal.ink,lineHeight:1}}>{k.value}</div>
              <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:8,marginTop:'auto'}}>
                <div style={{fontSize:12,color: k.accent ? accent : pal.mute, fontWeight:500}}>
                  ↑ {k.delta}
                </div>
                <Sparkline data={k.spark} color={k.accent ? accent : pal.mute} w={90} h={34}/>
              </div>
            </div>
          ))}
        </div>

        {/* Top styles bar chart */}
        <div style={{padding:'18px 18px 18px',borderRadius:18,background:pal.paper,border:`1px solid ${pal.border}`,marginBottom:18}}>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:14}}>
            <div className="serif" style={{fontSize:20,color:pal.ink}}>{t(lang,'topStyles')}</div>
            <div className="mono" style={{fontSize:10,letterSpacing:'.08em',color:pal.mute}}>140 GEN · 7J</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:11}}>
            {TOP_STYLES_FR.map((s,i)=>{
              const pct = s.count / 48 * 100;
              return (
                <div key={i} style={{display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:120,fontSize:13,color:pal.ink}}>{s.name}</div>
                  <div style={{flex:1,height:8,background:pal.subtle,borderRadius:8,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:i===0?accent:pal.ink,opacity: 1 - i*0.12,
                      borderRadius:8,transition:'width .3s'}}/>
                  </div>
                  <div className="mono" style={{width:36,textAlign:'right',fontSize:12,color:pal.mute}}>{s.count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top stylists */}
        <div style={{padding:'18px',borderRadius:18,background:pal.paper,border:`1px solid ${pal.border}`}}>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:12}}>
            <div className="serif" style={{fontSize:20,color:pal.ink}}>{t(lang,'topStylists')}</div>
            <div className="mono" style={{fontSize:10,letterSpacing:'.08em',color:pal.mute}}>
              {lang==='fr'?'CETTE SEMAINE':'THIS WEEK'}
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column'}}>
            {TOP_STYLISTS.map((s,i)=>(
              <div key={i} style={{
                display:'flex',alignItems:'center',gap:14,padding:'12px 0',
                borderBottom: i<TOP_STYLISTS.length-1 ? `1px solid ${pal.border}` : 'none',
              }}>
                <div style={{
                  width:36,height:36,borderRadius:18,background:i===0?accent:pal.subtle,
                  color: i===0 ? pal.inkInv : pal.ink, fontWeight:600,fontSize:14,
                  display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Instrument Serif',serif",
                }}>{s.name[0]}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,color:pal.ink,fontWeight:500}}>{s.name}</div>
                  <div style={{fontSize:11,color:pal.mute,marginTop:1}}>
                    {s.count} {t(lang,'sessions').toLowerCase()} · {s.conv}% {t(lang,'conversions').toLowerCase()}
                  </div>
                </div>
                <div style={{width:80}}>
                  <Sparkline data={[s.count-12,s.count-8,s.count-5,s.count-2,s.count]}
                    color={i===0?accent:pal.mute} w={80} h={24}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  ScreenLogin, ScreenCapture, ScreenConfigure, ScreenGallery, ScreenGenerating,
  ScreenBeforeAfter, ScreenCompare, ScreenUpsell, ScreenRecap, ScreenDashboard,
  Header, StepDots, PrimaryBtn, ActionBar, Slider, Sparkline, MiniQR,
});
