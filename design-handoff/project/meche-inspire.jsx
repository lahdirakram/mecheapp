// meche-inspire.jsx — 4 new entry-point screens for inspiration
// Globals: MScreenInspireHub, MScreenGallery, MScreenPrompt, MScreenAIPropose

const { useState: iUS, useEffect: iUE, useRef: iUR } = React;

// ─── HUB ────────────────────────────────────────────────────────────────────
function MScreenInspireHub({ lang, accent }) {
  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,position:'relative',display:'flex',flexDirection:'column'}}>
      <div style={{height:54}}/>
      <MInspireHubBody lang={lang} accent={accent}/>
      <TabBar active="explore" lang={lang}/>
    </div>
  );
}

// Reusable hub content (title + 5 entry cards) — also used by the
// central "Mèche" button overlay (selfie → hub).
function MInspireHubBody({ lang, accent, padBottom = 110 }) {
  return (
    <>
      <div style={{padding:'6px 20px 14px'}}>
        <div className="mono" style={{fontSize:10,letterSpacing:'.18em',color:MPAL.mute,fontWeight:600,marginBottom:8}}>
          {mt(lang,'inspire_me').toUpperCase()}
        </div>
        <div className="serif" style={{fontSize:34,letterSpacing:'-0.025em',lineHeight:1.0}}>
          {mt(lang,'inspire_title')}
        </div>
        <div style={{fontSize:13,color:MPAL.mute,marginTop:6,lineHeight:1.45}}>
          {mt(lang,'inspire_sub')}
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:`4px 16px ${padBottom}px`,display:'flex',flexDirection:'column',gap:10}}>

        {/* 1 — FEED hero card */}
        <button style={{
          height:160,borderRadius:20,overflow:'hidden',position:'relative',cursor:'pointer',
          border:'none',padding:0,textAlign:'left',background:'#000',
        }}>
          <div style={{position:'absolute',inset:0,display:'grid',gridTemplateColumns:'repeat(3,1fr)'}}>
            <MPortrait hair="bob" mood="warm"/>
            <MPortrait hair="curly" mood="blush" tint={accent}/>
            <MPortrait hair="long" mood="cool"/>
          </div>
          <div style={{position:'absolute',inset:0,
            background:'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.15) 60%)'}}/>
          <div style={{position:'absolute',top:14,right:14,
            padding:'4px 8px',borderRadius:6,background:'rgba(255,255,255,0.95)',
            fontSize:9,fontWeight:700,letterSpacing:'.14em',color:MPAL.ink,fontFamily:"'Geist Mono',monospace"}}>
            01
          </div>
          <div style={{position:'absolute',left:18,bottom:16,right:18,color:'#fff'}}>
            <div className="mono" style={{fontSize:10,letterSpacing:'.18em',opacity:0.85,marginBottom:4}}>
              <MIcon name="sparkle" size={12} color="#fff"/> <span style={{verticalAlign:'super',marginLeft:4}}>POUR TOI</span>
            </div>
            <div className="serif" style={{fontSize:26,letterSpacing:'-0.02em',lineHeight:1.05}}>
              {mt(lang,'path_feed')}
            </div>
            <div style={{fontSize:12,opacity:0.85,marginTop:2}}>
              {mt(lang,'path_feed_sub')}
            </div>
          </div>
        </button>

        {/* 2 — AI proposes — secondary hero, recommended */}
        <button style={{
          padding:18,borderRadius:20,background:MPAL.ink,color:MPAL.inkInv,position:'relative',overflow:'hidden',
          cursor:'pointer',border:'none',textAlign:'left',
          display:'flex',alignItems:'center',gap:14,
        }}>
          <div style={{position:'absolute',top:-40,right:-40,width:160,height:160,borderRadius:80,
            background:`radial-gradient(circle, ${accent}55, transparent 65%)`}}/>
          <div style={{width:54,height:54,borderRadius:16,background:accent,flexShrink:0,
            display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',position:'relative'}}>
            <MIcon name="sparkle" size={26} color="#fff"/>
          </div>
          <div style={{flex:1,minWidth:0,position:'relative'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
              <span style={{padding:'2px 7px',borderRadius:4,background:accent,color:'#fff',
                fontSize:9,fontWeight:700,letterSpacing:'.1em',fontFamily:"'Geist Mono',monospace"}}>
                {mt(lang,'recommended').toUpperCase()}
              </span>
              <span className="mono" style={{fontSize:9,letterSpacing:'.16em',opacity:0.6}}>02</span>
            </div>
            <div className="serif" style={{fontSize:22,letterSpacing:'-0.02em',lineHeight:1.1}}>
              {mt(lang,'path_ai')}
            </div>
            <div style={{fontSize:12,opacity:0.7,marginTop:2}}>
              {mt(lang,'path_ai_sub')}
            </div>
          </div>
          <MIcon name="arrowRight" size={18} color={accent}/>
        </button>

        {/* 3 & 4 — Gallery + Prompt (2-col) */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {/* Gallery */}
          <button style={{
            padding:14,borderRadius:18,background:MPAL.paper,border:`1px solid ${MPAL.border}`,
            cursor:'pointer',textAlign:'left',display:'flex',flexDirection:'column',gap:8,minHeight:150,
          }}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:3,flex:1,borderRadius:10,overflow:'hidden'}}>
              <MPortrait hair="pixie" mood="night"/>
              <MPortrait hair="bob" mood="warm"/>
              <MPortrait hair="curly" mood="blush" tint={accent}/>
              <MPortrait hair="long" mood="cool"/>
              <MPortrait hair="medium" mood="sand"/>
              <MPortrait hair="bob" mood="olive"/>
            </div>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span className="mono" style={{fontSize:9,letterSpacing:'.16em',color:MPAL.mute}}>03</span>
                <span className="serif" style={{fontSize:16,letterSpacing:'-0.01em'}}>
                  {mt(lang,'path_gallery')}
                </span>
              </div>
              <div style={{fontSize:11,color:MPAL.mute,marginTop:2}}>{mt(lang,'path_gallery_sub')}</div>
            </div>
          </button>

          {/* Prompt */}
          <button style={{
            padding:14,borderRadius:18,background:MPAL.soft,border:`1px solid ${MPAL.border}`,
            cursor:'pointer',textAlign:'left',display:'flex',flexDirection:'column',gap:8,minHeight:150,
            position:'relative',overflow:'hidden',
          }}>
            <div style={{flex:1,display:'flex',alignItems:'flex-end',position:'relative'}}>
              <div style={{
                fontSize:12,lineHeight:1.4,fontStyle:'italic',color:MPAL.ink,
                fontFamily:"'Fraunces',serif",fontWeight:400,
              }}>
                <span style={{opacity:0.45}}>“ Un carré flou caramel,</span><br/>
                <span style={{opacity:0.9}}>doux à l'épaule…”</span>
                <span style={{display:'inline-block',width:2,height:14,
                  background:accent,marginLeft:2,verticalAlign:'middle',animation:'b 1s steps(2) infinite'}}/>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:30,height:30,borderRadius:15,background:accent,
                display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <MIcon name="mic" size={14} color="#fff"/>
              </div>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span className="mono" style={{fontSize:9,letterSpacing:'.16em',color:MPAL.mute}}>04</span>
                  <span className="serif" style={{fontSize:16,letterSpacing:'-0.01em'}}>
                    {mt(lang,'path_prompt')}
                  </span>
                </div>
                <div style={{fontSize:11,color:MPAL.mute,marginTop:2}}>{mt(lang,'path_prompt_sub')}</div>
              </div>
            </div>
            <style>{`@keyframes b{50%{opacity:0}}`}</style>
          </button>
        </div>

        {/* 5 — Manual — wide row */}
        <button style={{
          padding:'16px 18px',borderRadius:18,background:MPAL.paper,border:`1px solid ${MPAL.border}`,
          cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:14,
        }}>
          <div style={{flexShrink:0,width:80,display:'flex',flexDirection:'column',gap:6}}>
            {[0.35, 0.65, 0.5].map((v,i)=>(
              <div key={i} style={{height:4,borderRadius:4,background:MPAL.border,position:'relative'}}>
                <div style={{position:'absolute',left:0,top:0,bottom:0,width:`${v*100}%`,background:accent,borderRadius:4}}/>
                <div style={{position:'absolute',left:`calc(${v*100}% - 5px)`,top:-2,
                  width:8,height:8,borderRadius:4,background:'#fff',border:`1.5px solid ${accent}`}}/>
              </div>
            ))}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span className="mono" style={{fontSize:9,letterSpacing:'.16em',color:MPAL.mute}}>05</span>
              <span className="serif" style={{fontSize:18,letterSpacing:'-0.01em'}}>
                {mt(lang,'path_manual')}
              </span>
            </div>
            <div style={{fontSize:11,color:MPAL.mute,marginTop:2}}>{mt(lang,'path_manual_sub')}</div>
          </div>
          <MIcon name="chevronRight" size={18} color={MPAL.mute}/>
        </button>

      </div>
    </>
  );
}

// ─── GALLERY ────────────────────────────────────────────────────────────────
function MScreenGallery({ lang, accent }) {
  const [filter, setFilter] = iUS(0);
  const filters = [
    mt(lang,'gallery_filter_all'),
    mt(lang,'gallery_filter_trends'),
    mt(lang,'gallery_filter_short'),
    mt(lang,'gallery_filter_mid'),
    mt(lang,'gallery_filter_long'),
    mt(lang,'gallery_filter_color'),
  ];

  const items = [
    { n: lang==='fr'?'Carré flou':'Soft bob',        hair:'bob',    mood:'warm',  loves:'12k', hot:true },
    { n: lang==='fr'?'Wolf cut':'Wolf cut',          hair:'long',   mood:'cool',  loves:'8k',  hot:true },
    { n: lang==='fr'?'Pixie texturé':'Pixie',        hair:'pixie',  mood:'night', loves:'4.7k' },
    { n: lang==='fr'?'Boucles miel':'Honey curls',   hair:'curly',  mood:'blush', loves:'19k', hot:true },
    { n: lang==='fr'?'Long lisse':'Sleek long',      hair:'long',   mood:'sand',  loves:'6k' },
    { n: lang==='fr'?'Bob aile':'Wing bob',          hair:'bob',    mood:'olive', loves:'3.1k' },
    { n: lang==='fr'?'Short rouge':'Short red',      hair:'pixie',  mood:'blush', loves:'2.4k' },
    { n: lang==='fr'?'Curly platine':'Platinum curl',hair:'curly',  mood:'cool',  loves:'5.3k' },
  ];

  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,position:'relative',display:'flex',flexDirection:'column'}}>
      <div style={{height:54}}/>
      <TopBar title={mt(lang,'path_gallery')} big onBack={()=>{}} right={
        <button style={{width:36,height:36,borderRadius:18,border:'none',
          background:'rgba(0,0,0,0.05)',cursor:'pointer',color:MPAL.ink,
          display:'flex',alignItems:'center',justifyContent:'center'}}>
          <MIcon name="settings" size={16}/></button>
      }/>

      <div style={{padding:'4px 18px 14px',display:'flex',gap:8,overflowX:'auto'}}>
        {filters.map((f,i)=>(
          <button key={i} onClick={()=>setFilter(i)} style={{
            padding:'7px 14px',borderRadius:999,fontSize:13,fontWeight:600,cursor:'pointer',
            background: filter===i ? MPAL.ink : MPAL.paper, color: filter===i ? MPAL.inkInv : MPAL.ink,
            border:`1px solid ${filter===i ? MPAL.ink : MPAL.border}`,whiteSpace:'nowrap',
          }}>{f}</button>
        ))}
      </div>

      <div style={{padding:'0 18px 6px',display:'flex',alignItems:'baseline',justifyContent:'space-between'}}>
        <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600}}>
          {lang==='fr'?'TENDANCES MAI 2026':'TRENDING MAY 2026'}
        </div>
        <div className="mono" style={{fontSize:10,letterSpacing:'.08em',color:MPAL.mute}}>
          {items.length} {lang==='fr'?'COUPES':'LOOKS'}
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'10px 16px 110px'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {items.map((it,i)=>(
            <div key={i} style={{
              borderRadius:16,overflow:'hidden',position:'relative',aspectRatio:'3/4',
              background:MPAL.paper,border:`1px solid ${MPAL.border}`,cursor:'pointer',
              transform: i%2 ? 'translateY(10px)' : 'translateY(0)',
            }}>
              <MPortrait hair={it.hair} mood={it.mood} tint={i%3===0?accent:undefined}/>
              {it.hot && (
                <div style={{position:'absolute',top:8,left:8,padding:'3px 7px',borderRadius:5,
                  background:accent,color:'#fff',fontSize:9,fontWeight:700,letterSpacing:'.08em',
                  fontFamily:"'Geist Mono',monospace",display:'flex',alignItems:'center',gap:4}}>
                  <MIcon name="flame" size={10} color="#fff" fill="#fff" stroke={0}/>
                  {lang==='fr'?'CHAUD':'HOT'}
                </div>
              )}
              <button style={{position:'absolute',top:8,right:8,width:28,height:28,borderRadius:14,
                background:'rgba(255,255,255,0.92)',border:'none',cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                <MIcon name="plus" size={14} color={MPAL.ink}/>
              </button>
              <div style={{position:'absolute',left:0,right:0,bottom:0,
                background:'linear-gradient(to top, rgba(0,0,0,0.75), transparent)',
                padding:'24px 10px 10px',color:'#fff'}}>
                <div style={{fontSize:13,fontWeight:600,letterSpacing:'-0.01em'}}>{it.n}</div>
                <div style={{display:'flex',alignItems:'center',gap:4,fontSize:10,opacity:0.85,marginTop:2}}>
                  <MIcon name="heart" size={10} color="#fff" fill="#fff" stroke={0}/>
                  {it.loves}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="explore" lang={lang}/>
    </div>
  );
}

// ─── PROMPT (text + voice) ──────────────────────────────────────────────────
function MScreenPrompt({ lang, accent }) {
  const [text, setText] = iUS('');
  const [listening, setListening] = iUS(false);
  const placeholder = mt(lang,'prompt_placeholder');
  const examples = lang==='fr' ? [
    'Wolf cut châtain',
    'Carré flou caramel',
    'Pixie audacieux',
    'Boucles définies',
    'Reflets miel doux',
  ] : [
    'Wolf cut, ash brown',
    'Soft caramel bob',
    'Bold pixie cut',
    'Defined curls',
    'Soft honey highlights',
  ];

  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,position:'relative',display:'flex',flexDirection:'column'}}>
      <div style={{height:54}}/>
      <TopBar title="" onBack={()=>{}}/>

      <div style={{padding:'4px 24px 14px'}}>
        <div className="mono" style={{fontSize:10,letterSpacing:'.18em',color:accent,fontWeight:600,marginBottom:8}}>
          {mt(lang,'path_prompt').toUpperCase()}
        </div>
        <div className="serif" style={{fontSize:36,letterSpacing:'-0.025em',lineHeight:1.0}}>
          {lang==='fr' ? <>Dis-le. <span style={{fontStyle:'italic',color:accent}}>Mèche</span> comprend.</>
                       : <>Just say it. <span style={{fontStyle:'italic',color:accent}}>Mèche</span> gets it.</>}
        </div>
      </div>

      {/* Text area */}
      <div style={{padding:'4px 18px 0',flex:1,display:'flex',flexDirection:'column'}}>
        <div style={{
          flex:1,minHeight:160,padding:18,borderRadius:18,background:MPAL.paper,
          border:`1px solid ${MPAL.border}`,position:'relative',
          display:'flex',flexDirection:'column',
        }}>
          <textarea value={text} onChange={(e)=>setText(e.target.value)} placeholder={placeholder}
            style={{
              flex:1,width:'100%',border:'none',background:'transparent',outline:'none',
              fontSize:18,color:MPAL.ink,fontFamily:"'Fraunces',serif",fontWeight:400,
              fontStyle: text?'normal':'italic',resize:'none',lineHeight:1.4,
              letterSpacing:'-0.01em',
            }}/>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:10}}>
            <div className="mono" style={{fontSize:10,letterSpacing:'.1em',color:MPAL.mute}}>
              {text.length} / 240
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setText('')} style={{
                width:30,height:30,borderRadius:15,background:'transparent',
                border:`1px solid ${MPAL.border}`,cursor:'pointer',color:MPAL.mute,
                display:'flex',alignItems:'center',justifyContent:'center',
              }}><MIcon name="x" size={14}/></button>
            </div>
          </div>
        </div>

        {/* Examples */}
        <div style={{margin:'14px 0 0'}}>
          <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600,marginBottom:8}}>
            {lang==='fr'?'EXEMPLES':'EXAMPLES'}
          </div>
          <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4,margin:'0 -18px',padding:'0 18px 4px'}}>
            {examples.map((e,i)=>(
              <button key={i} onClick={()=>setText(e)} style={{
                padding:'8px 12px',borderRadius:999,background:MPAL.paper,border:`1px solid ${MPAL.border}`,
                cursor:'pointer',fontSize:12,color:MPAL.ink,fontWeight:500,whiteSpace:'nowrap',
                fontFamily:"'Fraunces',serif",fontStyle:'italic',
              }}>{e}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Voice + CTA */}
      <div style={{padding:'18px 18px 32px',display:'flex',alignItems:'center',gap:14}}>
        <button onClick={()=>setListening(l=>!l)} style={{
          width:64,height:64,borderRadius:32,flexShrink:0,
          background: listening ? accent : MPAL.paper,
          border: listening ? 'none' : `1px solid ${MPAL.border}`,
          cursor:'pointer',color: listening ? '#fff' : MPAL.ink,
          display:'flex',alignItems:'center',justifyContent:'center',
          position:'relative',boxShadow: listening ? `0 0 0 8px ${accent}22` : 'none',
          transition:'all .2s',
        }}>
          <MIcon name="mic" size={24} color={listening ? '#fff' : MPAL.ink}/>
          {listening && (
            <span style={{position:'absolute',inset:-6,borderRadius:38,border:`2px solid ${accent}`,
              opacity:0.5,animation:'p 1.4s ease-out infinite'}}/>
          )}
        </button>
        <div style={{flex:1,minWidth:0}}>
          {listening ? (
            <>
              <div className="serif" style={{fontSize:18,fontStyle:'italic',color:accent,letterSpacing:'-0.01em'}}>
                {mt(lang,'listening')}
              </div>
              <div style={{fontSize:11,color:MPAL.mute,marginTop:2}}>
                {lang==='fr'?'Parle, je transcris.':"Talk, I'll transcribe."}
              </div>
            </>
          ) : (
            <>
              <div style={{fontSize:13,fontWeight:600,color:MPAL.ink}}>{mt(lang,'tap_to_speak')}</div>
              <div style={{fontSize:11,color:MPAL.mute,marginTop:2}}>
                {lang==='fr'?'FR · EN · IT · ES':'FR · EN · IT · ES'}
              </div>
            </>
          )}
        </div>
        <button disabled={!text && !listening} style={{
          padding:'14px 20px',borderRadius:999,background: (text||listening) ? accent : MPAL.subtle,
          color: (text||listening) ? '#fff' : MPAL.mute,
          border:'none',cursor: (text||listening) ? 'pointer' : 'default',fontSize:14,fontWeight:600,
          display:'flex',alignItems:'center',gap:6,
        }}>
          {mt(lang,'go')} <MIcon name="arrowRight" size={14} color={(text||listening) ? '#fff' : MPAL.mute}/>
        </button>
        <style>{`@keyframes p{0%{transform:scale(1);opacity:.5}100%{transform:scale(1.6);opacity:0}}`}</style>
      </div>
    </div>
  );
}

// ─── AI PROPOSES ────────────────────────────────────────────────────────────
function MScreenAIPropose({ lang, accent }) {
  const reasons = lang==='fr' ? [
    'Visage ovale',
    'Style streetwear',
    '3 looks gardés similaires',
    'Printemps 2026',
  ] : [
    'Oval face shape',
    'Streetwear style',
    '3 similar saved looks',
    'Spring 2026',
  ];

  const config = lang==='fr' ? [
    {l:'Longueur', v:'Mi-long, asymétrique'},
    {l:'Couleur',  v:'Châtain caramel'},
    {l:'Mood',     v:'Naturel, audacieux'},
    {l:'Frange',   v:'Effilée, longue'},
  ] : [
    {l:'Length', v:'Mid, asymmetric'},
    {l:'Color',  v:'Caramel brown'},
    {l:'Mood',   v:'Natural, bold'},
    {l:'Bangs',  v:'Long, wispy'},
  ];

  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,position:'relative',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{height:54}}/>
      <TopBar title="" onBack={()=>{}} right={
        <button style={{width:36,height:36,borderRadius:18,border:'none',
          background:'rgba(0,0,0,0.05)',cursor:'pointer',color:MPAL.ink,
          display:'flex',alignItems:'center',justifyContent:'center'}}>
          <MIcon name="settings" size={16}/></button>
      }/>

      <div style={{padding:'4px 22px 12px'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
          <MIcon name="sparkle" size={14} color={accent}/>
          <span className="mono" style={{fontSize:10,letterSpacing:'.18em',color:accent,fontWeight:600}}>
            {mt(lang,'path_ai').toUpperCase()}
          </span>
        </div>
        <div className="serif" style={{fontSize:30,letterSpacing:'-0.025em',lineHeight:1.05}}>
          {lang==='fr' ? <>Pour toi : <span style={{fontStyle:'italic',color:accent}}>wolf cut</span> châtain doux.</>
                       : <>For you: a soft <span style={{fontStyle:'italic',color:accent}}>wolf cut</span> in caramel brown.</>}
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'4px 18px 18px'}}>

        {/* Hero look card */}
        <div style={{
          borderRadius:20,overflow:'hidden',position:'relative',aspectRatio:'4/3',
          background:'#000',marginBottom:14,
        }}>
          <MPortrait hair="long" mood="warm" tint={accent}/>
          <div style={{position:'absolute',inset:0,
            background:'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.75) 100%)'}}/>
          <div style={{position:'absolute',top:12,left:12,padding:'4px 9px',borderRadius:6,
            background:'rgba(255,255,255,0.95)',fontSize:9,fontWeight:700,letterSpacing:'.12em',
            color:MPAL.ink,fontFamily:"'Geist Mono',monospace",display:'flex',alignItems:'center',gap:5}}>
            <MIcon name="sparkle" size={10} color={accent}/> {mt(lang,'recommended').toUpperCase()}
          </div>
          <div style={{position:'absolute',top:12,right:12,padding:'4px 9px',borderRadius:6,
            background:'rgba(0,0,0,0.55)',color:'#fff',fontSize:10,fontWeight:600,
            letterSpacing:'.06em',fontFamily:"'Geist Mono',monospace",display:'flex',alignItems:'center',gap:4}}>
            <MIcon name="flame" size={11} color="#fff" fill="#fff" stroke={0}/> 94%
          </div>
          <div style={{position:'absolute',left:14,bottom:14,right:14,color:'#fff'}}>
            <div className="serif" style={{fontSize:22,letterSpacing:'-0.02em',lineHeight:1.0}}>
              {lang==='fr'?'Wolf cut caramel doux':'Soft caramel wolf cut'}
            </div>
            <div style={{fontSize:11,opacity:0.8,marginTop:3}}>
              {lang==='fr'?'2h30 · €70–€120 en moyenne':'2h30 · €70–€120 typical'}
            </div>
          </div>
        </div>

        {/* Why this */}
        <div style={{marginBottom:14}}>
          <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600,marginBottom:8}}>
            {mt(lang,'why_this').toUpperCase()}
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {reasons.map((r,i)=>(
              <span key={i} style={{
                padding:'6px 11px',borderRadius:999,background:MPAL.paper,border:`1px solid ${MPAL.border}`,
                fontSize:12,color:MPAL.ink,fontWeight:500,
              }}>{r}</span>
            ))}
          </div>
        </div>

        {/* Suggested config */}
        <div style={{padding:14,borderRadius:16,background:MPAL.paper,border:`1px solid ${MPAL.border}`}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600}}>
              {mt(lang,'config').toUpperCase()}
            </div>
            <button style={{
              padding:'4px 10px',borderRadius:999,background:'transparent',border:`1px solid ${MPAL.border}`,
              cursor:'pointer',fontSize:11,color:MPAL.ink,fontWeight:500,display:'flex',alignItems:'center',gap:4,
            }}>
              <MIcon name="settings" size={11}/> {mt(lang,'customize')}
            </button>
          </div>
          {config.map((c,i)=>(
            <div key={i} style={{
              display:'flex',justifyContent:'space-between',alignItems:'baseline',
              padding:'8px 0',borderTop: i ? `1px solid ${MPAL.subtle}` : 'none',
            }}>
              <div className="mono" style={{fontSize:10,letterSpacing:'.12em',color:MPAL.mute,fontWeight:600}}>
                {c.l.toUpperCase()}
              </div>
              <div style={{fontSize:13,color:MPAL.ink,fontFamily:"'Fraunces',serif",fontStyle:'italic'}}>
                {c.v}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Actions */}
      <div style={{padding:'14px 18px 32px',display:'flex',gap:10}}>
        <button style={{
          flex:1,padding:'13px 14px',borderRadius:999,background:'transparent',
          border:`1px solid ${MPAL.border}`,color:MPAL.ink,cursor:'pointer',fontSize:14,fontWeight:600,
          display:'flex',alignItems:'center',justifyContent:'center',gap:8,
        }}>
          <MIcon name="sparkle" size={14}/> {mt(lang,'another_suggestion')}
        </button>
        <button style={{
          flex:1.4,padding:'13px 14px',borderRadius:999,background:accent,color:'#fff',
          border:'none',cursor:'pointer',fontSize:14,fontWeight:600,
          display:'flex',alignItems:'center',justifyContent:'center',gap:8,
        }}>
          {mt(lang,'accept_suggestion')} <MIcon name="arrowRight" size={14} color="#fff"/>
        </button>
      </div>
    </div>
  );
}

Object.assign(window, {
  MScreenInspireHub, MInspireHubBody, MScreenGallery, MScreenPrompt, MScreenAIPropose,
});
