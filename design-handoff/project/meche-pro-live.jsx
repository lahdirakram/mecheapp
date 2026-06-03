// meche-pro-live.jsx — Essai Mèche au fauteuil · flow guidé en étapes
// Un seul écran interactif : selfie → idée (prompt et/ou galerie) → réglages →
// génération (loader comme la B2C) → résultat (réajuster / refaire).
// Globals: PScreenEssai  (+ legacy aliases for the canvas)

const { useState: lUS, useEffect: lUE, useRef: lUR } = React;

// Local slider — same look as B2C's MSlider, kept local so file is self-contained
function PSlider({ label, value, onChange, labels, accent }) {
  const ref = lUR(null);
  const handle = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = (e.touches?e.touches[0].clientX:e.clientX) - r.left;
    onChange(Math.max(0,Math.min(1,x/r.width)));
  };
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
        <div style={{fontSize:13,fontWeight:600}}>{label}</div>
        <div style={{fontSize:12,color:MPAL.mute}}>
          {labels[value<0.34?0:value<0.67?1:2]}
        </div>
      </div>
      <div ref={ref} onMouseDown={(e)=>{handle(e); const m=(e)=>handle(e); const u=()=>{window.removeEventListener('mousemove',m);window.removeEventListener('mouseup',u);}; window.addEventListener('mousemove',m); window.addEventListener('mouseup',u);}}
        onTouchMove={handle}
        style={{height:32,position:'relative',cursor:'ew-resize',padding:'14px 0'}}>
        <div style={{height:4,background:MPAL.subtle,borderRadius:2,position:'relative'}}>
          <div style={{position:'absolute',top:0,left:0,height:'100%',width:`${value*100}%`,
            background:accent,borderRadius:2}}/>
        </div>
        <div style={{position:'absolute',top:'50%',left:`${value*100}%`,transform:'translate(-50%,-50%)',
          width:22,height:22,borderRadius:11,background:'#fff',
          boxShadow:`0 2px 8px rgba(0,0,0,0.18),0 0 0 2px ${accent}`}}/>
      </div>
    </div>
  );
}

// Step header — progress segments + counter (shared by every step)
const PESSAI_STEPS = [
  { id:'selfie', fr:'Selfie',   en:'Selfie' },
  { id:'idea',   fr:'Idée',     en:'Idea' },
  { id:'adjust', fr:'Réglages', en:'Settings' },
  { id:'result', fr:'Aperçu',   en:'Preview' },
];

function PStepHeader({ idx, lang, onBack, onClose, accent }) {
  return (
    <div style={{padding:'0 16px'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,minHeight:44}}>
        <button onClick={onBack} style={{width:36,height:36,borderRadius:18,border:'none',
          background:'rgba(0,0,0,0.05)',color:MPAL.ink,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center'}}>
          <MIcon name="chevronLeft" size={18}/>
        </button>
        <div style={{flex:1,textAlign:'center'}}>
          <div style={{fontSize:14,fontWeight:600}}>
            {lang==='fr'?'Essai Mèche':'Mèche try-on'}
          </div>
          <div className="mono" style={{fontSize:9,letterSpacing:'.14em',color:MPAL.mute,marginTop:1}}>
            {lang==='fr'?'ÉTAPE':'STEP'} {idx+1} / {PESSAI_STEPS.length} · {PESSAI_STEPS[idx][lang].toUpperCase()}
          </div>
        </div>
        <button onClick={onClose} style={{width:36,height:36,borderRadius:18,border:'none',
          background:'rgba(0,0,0,0.05)',color:MPAL.ink,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center'}}>
          <MIcon name="x" size={16}/>
        </button>
      </div>
      <div style={{display:'flex',gap:6,padding:'8px 0 6px'}}>
        {PESSAI_STEPS.map((s,i)=>(
          <div key={s.id} style={{flex:1,height:4,borderRadius:2,
            background: i<=idx ? accent : MPAL.subtle,
            transition:'background .25s'}}/>
        ))}
      </div>
    </div>
  );
}

// ─── Generation loader · même esprit que la B2C ────────────────────────────
function PEssaiLoader({ lang, accent, onDone }) {
  const [pct, setPct] = lUS(4);
  lUE(()=>{
    const id = setInterval(()=>{
      setPct(p=>{
        if (p>=100){ clearInterval(id); setTimeout(onDone, 280); return 100; }
        return Math.min(100, p + (p>80?3:6));
      });
    }, 90);
    return ()=>clearInterval(id);
  },[]);
  return (
    <div style={{height:'100%',background:'#0a0908',color:'#fff',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',inset:0,opacity:0.85}}>
        <MPortrait hair="medium" mood="warm" tint={accent}/>
      </div>
      <div style={{position:'absolute',inset:0,
        background:'radial-gradient(circle at 50% 40%, transparent, rgba(0,0,0,0.85))'}}/>
      {/* scanning line */}
      <div style={{position:'absolute',left:0,right:0,top:`${12+pct*0.7}%`,height:2,
        background:`linear-gradient(90deg, transparent, ${accent}, transparent)`,
        boxShadow:`0 0 16px ${accent}`,transition:'top .1s'}}/>
      {/* corner brackets */}
      <svg width="100%" height="100%" style={{position:'absolute',inset:0,pointerEvents:'none'}}>
        {[[40,180],[362,180],[40,640],[362,640]].map(([x,y],i)=>(
          <g key={i} stroke={accent} strokeWidth="2" fill="none">
            <path d={`M${x} ${y+14} L${x} ${y} L${x+14} ${y}`} transform={
              i===1?`scale(-1,1) translate(${-2*x},0)`:
              i===2?`scale(1,-1) translate(0,${-2*y})`:
              i===3?`scale(-1,-1) translate(${-2*x},${-2*y})`:''
            }/>
          </g>
        ))}
      </svg>

      <div style={{position:'absolute',top:150,left:0,right:0,textAlign:'center',padding:'0 30px'}}>
        <div className="mono" style={{fontSize:10,letterSpacing:'.16em',opacity:0.65,marginBottom:8}}>
          {lang==='fr'?'GÉNÉRATION · ÉTAPE 4 / 4':'GENERATING · STEP 4 / 4'}
        </div>
        <div className="serif" style={{fontSize:34,letterSpacing:'-0.02em',lineHeight:1.05}}>
          {lang==='fr'?'Mèche s\'en occupe…':'Mèche is on it…'}
        </div>
        <div style={{fontSize:13,opacity:0.7,marginTop:8}}>
          {lang==='fr'?'Montre-lui dans le miroir dans un instant.':'Show her in the mirror in a moment.'}
        </div>
      </div>

      <div style={{position:'absolute',bottom:90,left:24,right:24}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
          <div className="mono" style={{fontSize:11,letterSpacing:'.12em',opacity:0.7}}>
            {[
              lang==='fr'?'ANALYSE DU VISAGE':'FACE ANALYSIS',
              lang==='fr'?'LECTURE DE L\'IDÉE':'READING IDEA',
              lang==='fr'?'COMPOSITION':'COMPOSITION',
              lang==='fr'?'FINALISATION':'FINALISING',
            ][Math.min(3,Math.floor(pct/25))]}
          </div>
          <div className="mono" style={{fontSize:11,letterSpacing:'.12em',opacity:0.7}}>{pct}%</div>
        </div>
        <div style={{height:4,background:'rgba(255,255,255,0.12)',borderRadius:4,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${pct}%`,background:accent,transition:'width .12s'}}/>
        </div>
        <div style={{textAlign:'center',marginTop:14,fontSize:12,opacity:0.6}}>
          {lang==='fr'?'~ 20 secondes · inclus dans Mèche Pro':'~ 20 seconds · included in Mèche Pro'}
        </div>
      </div>
    </div>
  );
}

// ─── STEP 1 · selfie de la cliente ─────────────────────────────────────────
function PStepSelfie({ lang, accent, taken, onShoot }) {
  const [flash, setFlash] = lUS(false);
  const shoot = () => { setFlash(true); setTimeout(()=>{ setFlash(false); onShoot(); }, 360); };
  return (
    <div style={{height:'100%',background:'#0a0908',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',inset:0}}>
        <MPortrait hair="medium" mood="warm" label="viseur · live"/>
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.35)'}}/>
      </div>
      <svg width="100%" height="100%" viewBox="0 0 402 874" preserveAspectRatio="xMidYMid slice"
           style={{position:'absolute',inset:0,pointerEvents:'none'}}>
        <defs>
          <mask id="ovalmaskE"><rect width="402" height="874" fill="white"/>
            <ellipse cx="201" cy="390" rx="155" ry="220" fill="black"/></mask>
        </defs>
        <rect width="402" height="874" fill="rgba(0,0,0,0.55)" mask="url(#ovalmaskE)"/>
        <ellipse cx="201" cy="390" rx="155" ry="220" fill="none" stroke={accent} strokeWidth="2" strokeDasharray="6 6"/>
      </svg>

      <div style={{position:'absolute',top:130,left:0,right:0,textAlign:'center',color:'#fff',zIndex:5,padding:'0 30px'}}>
        <div className="mono" style={{fontSize:10,letterSpacing:'.18em',opacity:0.7,marginBottom:8}}>
          {lang==='fr'?'ÉTAPE 1 / 4 · LE SELFIE':'STEP 1 / 4 · THE SELFIE'}
        </div>
        <div className="serif" style={{fontSize:32,letterSpacing:'-0.02em'}}>
          {lang==='fr'?'Photo de la cliente':'A photo of her'}
        </div>
        <div style={{fontSize:13,opacity:0.8,marginTop:8}}>
          {lang==='fr'?'Visage dégagé, face au miroir.':'Face clear, looking at the mirror.'}
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
        <button onClick={shoot}
          style={{width:82,height:82,borderRadius:41,border:'5px solid #fff',background:'#fff',
            cursor:'pointer',boxShadow:'0 8px 30px rgba(0,0,0,0.5)'}}>
          <div style={{width:'100%',height:'100%',borderRadius:'50%',background:accent,transform:'scale(0.86)'}}/>
        </button>
        <button style={{width:54,height:54,borderRadius:27,background:'rgba(255,255,255,0.15)',
          border:'1px solid rgba(255,255,255,0.25)',cursor:'pointer',color:'#fff',
          display:'flex',alignItems:'center',justifyContent:'center'}}>
          <MIcon name="flip" size={18} color="#fff"/>
        </button>
      </div>

      <div style={{position:'absolute',bottom:50,left:0,right:0,textAlign:'center',zIndex:5}}>
        <button onClick={onShoot} style={{background:'none',border:'none',cursor:'pointer',padding:'8px 16px',
          color:'rgba(255,255,255,0.72)',fontSize:13,textDecoration:'underline',
          textUnderlineOffset:3,textDecorationColor:'rgba(255,255,255,0.35)'}}>
          {lang==='fr'?'Importer depuis la galerie':'Import from gallery'}
        </button>
      </div>
    </div>
  );
}

// ─── STEP 2 · point de départ · prompt ET/OU galerie ───────────────────────
function PStepIdea({ lang, accent, prompt, setPrompt, pick, setPick, onNext, header }) {
  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,display:'flex',flexDirection:'column'}}>
      <div style={{height:54}}/>
      {header}
      <div style={{flex:1,overflowY:'auto',padding:'8px 18px 18px'}}>
        {/* selfie confirmed chip */}
        <div style={{display:'flex',gap:12,marginBottom:18,padding:'10px 12px',
          background:MPAL.paper,border:`1px solid ${MPAL.border}`,borderRadius:14,alignItems:'center'}}>
          <div style={{width:46,height:60,borderRadius:8,overflow:'hidden',flexShrink:0}}>
            <MPortrait hair="medium" mood="warm"/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div className="mono" style={{fontSize:9,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600}}>
              {lang==='fr'?'SELFIE · OK':'SELFIE · OK'}
            </div>
            <div style={{fontSize:12,color:MPAL.ink,marginTop:3}}>
              {lang==='fr'?'Walk-in · prêt à essayer':'Walk-in · ready to try'}
            </div>
          </div>
          <span style={{width:22,height:22,borderRadius:11,background:'#1F8A5B',
            display:'flex',alignItems:'center',justifyContent:'center'}}>
            <MIcon name="check" size={12} color="#fff" stroke={2.6}/>
          </span>
        </div>

        <div className="serif" style={{fontSize:24,letterSpacing:'-0.02em',lineHeight:1.1,marginBottom:4}}>
          {lang==='fr'?'D\'où on part ?':'Where do we start?'}
        </div>
        <div style={{fontSize:12,color:MPAL.mute,marginBottom:16}}>
          {lang==='fr'?'Décris son idée, pioche dans ta galerie — ou les deux.':'Describe her idea, pick from your gallery — or both.'}
        </div>

        {/* PROMPT */}
        <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600,marginBottom:8}}>
          {lang==='fr'?'1 · CE QU\'ELLE TE DIT':'1 · WHAT SHE TELLS YOU'}
        </div>
        <div style={{padding:14,borderRadius:14,background:MPAL.paper,border:`1px solid ${MPAL.border}`,marginBottom:18}}>
          <textarea value={prompt} onChange={(e)=>setPrompt(e.target.value)}
            placeholder={lang==='fr'?'« plus court, reflets chauds, mais qui reste pro… »':'"shorter, warm highlights, still office-friendly…"'}
            style={{width:'100%',border:'none',background:'transparent',outline:'none',fontSize:14,
              color:MPAL.ink,fontFamily:"'Geist',sans-serif",resize:'none',lineHeight:1.5,minHeight:52}}/>
          <div style={{display:'flex',alignItems:'center',gap:10,marginTop:8}}>
            <button style={{padding:'8px 12px',borderRadius:999,background:accent,color:'#fff',
              border:'none',cursor:'pointer',fontSize:12,fontWeight:600,
              display:'flex',alignItems:'center',gap:6}}>
              <MIcon name="mic" size={13} color="#fff"/>{lang==='fr'?'Dicter':'Dictate'}
            </button>
            <span style={{fontSize:11,color:MPAL.mute}}>
              {lang==='fr'?'transcris ce qu\'elle raconte':'type what she says'}
            </span>
          </div>
        </div>

        {/* GALLERY */}
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:8}}>
          <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600}}>
            {lang==='fr'?'2 · PIOCHE DANS TA GALERIE':'2 · PICK FROM YOUR GALLERY'}
          </div>
          <span style={{fontSize:11,color:MPAL.mute}}>{lang==='fr'?'optionnel':'optional'}</span>
        </div>
        <div style={{display:'flex',gap:8,overflowX:'auto',padding:'0 2px 4px'}}>
          {PPORTFOLIO.map((p,i)=>{
            const on = pick === i;
            return (
              <div key={p.id} onClick={()=>setPick(on?null:i)}
                style={{minWidth:84,flexShrink:0,borderRadius:10,overflow:'hidden',
                  aspectRatio:'3/4',position:'relative',cursor:'pointer',
                  border: on ? `2px solid ${accent}` : `1px solid ${MPAL.border}`}}>
                <MPortrait hair={p.hair} mood={p.mood} tint={i%3===0?accent:undefined}/>
                {on && (
                  <div style={{position:'absolute',top:4,right:4,width:16,height:16,borderRadius:8,
                    background:accent,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <MIcon name="check" size={9} color="#fff" stroke={2.6}/>
                  </div>
                )}
                <div style={{position:'absolute',bottom:0,left:0,right:0,
                  background:'linear-gradient(to top, rgba(0,0,0,0.78), transparent)',
                  padding:'14px 5px 4px',color:'#fff',fontSize:8,fontWeight:600,lineHeight:1.15}}>
                  {p.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{padding:'12px 18px 28px',borderTop:`1px solid ${MPAL.border}`}}>
        <button onClick={onNext} style={{width:'100%',padding:'14px 22px',borderRadius:999,
          background:MPAL.ink,color:'#fff',border:'none',fontSize:15,fontWeight:600,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          {lang==='fr'?'Continuer · réglages':'Continue · settings'}
          <MIcon name="arrowRight" size={15} color="#fff"/>
        </button>
      </div>
    </div>
  );
}

// ─── STEP 3 · ajustement ───────────────────────────────────────────────────
function PStepAdjust({ lang, accent, st, onGenerate, header }) {
  const colors = ['#1A1612','#5A3A20','#A07242','#D9B987','#E8C9A0'];
  const colorNames = lang==='fr'
    ? ['Noir','Châtain','Caramel','Miel','Blond']
    : ['Black','Brown','Caramel','Honey','Blonde'];
  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{height:54}}/>
      {header}
      <div style={{flex:1,overflowY:'auto',padding:'8px 18px 18px'}}>
        <div className="serif" style={{fontSize:24,letterSpacing:'-0.02em',lineHeight:1.1,marginBottom:4}}>
          {lang==='fr'?'Ajuste avec elle':'Adjust with her'}
        </div>
        <div style={{fontSize:12,color:MPAL.mute,marginBottom:16}}>
          {lang==='fr'?'Affine les curseurs en parlant. Tu génères juste après.':'Tune the sliders as you talk. Generate right after.'}
        </div>

        <div style={{padding:18,borderRadius:14,background:MPAL.paper,border:`1px solid ${MPAL.border}`,
          display:'flex',flexDirection:'column',gap:16,marginBottom:18}}>
          <PSlider label={lang==='fr'?'Longueur':'Length'} value={st.len} onChange={st.setLen} accent={accent}
            labels={[lang==='fr'?'Court':'Short',lang==='fr'?'Mi-long':'Medium',lang==='fr'?'Long':'Long']}/>
          <PSlider label={lang==='fr'?'Volume':'Volume'} value={st.vol} onChange={st.setVol} accent={accent}
            labels={[lang==='fr'?'Discret':'Subtle',lang==='fr'?'Naturel':'Natural',lang==='fr'?'Audacieux':'Bold']}/>
          <PSlider label={lang==='fr'?'Frange':'Bangs'} value={st.fringe} onChange={st.setFringe} accent={accent}
            labels={[lang==='fr'?'Aucune':'None',lang==='fr'?'Rideau':'Curtain',lang==='fr'?'Frangée':'Full']}/>
          <div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:600}}>{lang==='fr'?'Couleur':'Color'}</div>
              <div style={{fontSize:12,color:MPAL.mute}}>{colorNames[st.col]}</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              {colors.map((c,i)=>(
                <button key={i} onClick={()=>st.setCol(i)} style={{
                  flex:1,height:42,borderRadius:10,background:c,cursor:'pointer',
                  border: st.col===i ? `3px solid ${accent}` : `1px solid ${MPAL.border}`,
                  outline: st.col===i ? `2px solid ${MPAL.paper}` : 'none', outlineOffset:-5,
                }}/>
              ))}
            </div>
          </div>
        </div>

        <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600,marginBottom:8}}>
          {lang==='fr'?'RACCOURCIS':'QUICK PRESETS'}
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {[
            lang==='fr'?'+ 2 cm plus court':'+ 2cm shorter',
            lang==='fr'?'reflets caramel':'caramel highlights',
            lang==='fr'?'frange rideau':'curtain bangs',
            lang==='fr'?'-1 ton':'-1 tone',
          ].map((c,i)=>(
            <span key={i} style={{padding:'7px 12px',borderRadius:999,fontSize:11,fontWeight:600,cursor:'pointer',
              background:MPAL.paper,border:`1px solid ${MPAL.border}`,color:MPAL.ink,
              display:'flex',alignItems:'center',gap:4}}>
              <MIcon name="plus" size={10} color={MPAL.mute}/>{c}
            </span>
          ))}
        </div>
      </div>

      <div style={{padding:'14px 18px 28px',borderTop:`1px solid ${MPAL.border}`}}>
        <button onClick={onGenerate} style={{width:'100%',padding:'14px 22px',borderRadius:999,
          background:accent,color:'#fff',border:'none',fontSize:15,fontWeight:600,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          <MIcon name="sparkle" size={14} color="#fff" fill="#fff" stroke={0}/>
          {lang==='fr'?'Générer l\'aperçu':'Generate preview'}
        </button>
        <div style={{textAlign:'center',marginTop:8,fontSize:11,color:MPAL.mute,
          display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
          <MIcon name="zap" size={11} color={MPAL.mute}/>
          {lang==='fr'?'~ 20 secondes · inclus dans Mèche Pro':'~ 20 seconds · included in Mèche Pro'}
        </div>
      </div>
    </div>
  );
}

// ─── STEP 4 · résultat · réajuster / refaire ───────────────────────────────
function PStepResult({ lang, accent, onReadjust, onRedo, header }) {
  const [pos, setPos] = lUS(0.55);
  const ref = lUR(null);
  const drag = (e) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.touches?e.touches[0].clientX:e.clientX) - r.left;
    setPos(Math.max(0.05,Math.min(0.95,x/r.width)));
  };
  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,display:'flex',flexDirection:'column'}}>
      <div style={{height:54}}/>
      {header}
      <div style={{flex:1,overflowY:'auto',padding:'8px 18px 18px'}}>
        <div ref={ref}
          onMouseDown={(e)=>{drag(e); const m=(e)=>drag(e); const u=()=>{window.removeEventListener('mousemove',m);window.removeEventListener('mouseup',u);}; window.addEventListener('mousemove',m); window.addEventListener('mouseup',u);}}
          onTouchMove={drag}
          style={{height:360,borderRadius:22,overflow:'hidden',position:'relative',cursor:'ew-resize',
            boxShadow:'0 12px 30px rgba(26,18,22,0.18)',marginBottom:14}}>
          <div style={{position:'absolute',inset:0}}>
            <MPortrait hair="medium" mood="warm"/>
          </div>
          <div style={{position:'absolute',top:0,left:0,bottom:0,width:`${pos*100}%`,overflow:'hidden'}}>
            <div style={{width:`${100/pos}%`,height:'100%'}}>
              <MPortrait hair="bob" mood="warm" tint={accent}/>
            </div>
          </div>
          <div style={{position:'absolute',top:14,left:14,padding:'5px 10px',borderRadius:999,
            background:'rgba(255,255,255,0.95)',fontSize:10,fontWeight:700,letterSpacing:'.1em',color:'#1a1612'}}>
            {lang==='fr'?'APRÈS':'AFTER'}
          </div>
          <div style={{position:'absolute',top:14,right:14,padding:'5px 10px',borderRadius:999,
            background:'rgba(0,0,0,0.6)',color:'#fff',fontSize:10,fontWeight:700,letterSpacing:'.1em'}}>
            {lang==='fr'?'AVANT':'BEFORE'}
          </div>
          <div style={{position:'absolute',top:0,bottom:0,left:`${pos*100}%`,width:2,background:'#fff',
            boxShadow:'0 0 12px rgba(0,0,0,0.4)'}}/>
          <div style={{position:'absolute',top:'50%',left:`${pos*100}%`,transform:'translate(-50%,-50%)',
            width:44,height:44,borderRadius:22,background:'#fff',boxShadow:'0 4px 14px rgba(0,0,0,0.3)',
            display:'flex',alignItems:'center',justifyContent:'center',color:'#1a1612'}}>
            <MIcon name="chevronLeft" size={12}/><MIcon name="chevronRight" size={12}/>
          </div>
          <div style={{position:'absolute',left:18,right:18,bottom:18,color:'#fff'}}>
            <div className="mono" style={{fontSize:9,letterSpacing:'.16em',opacity:0.75,fontWeight:700}}>
              · {lang==='fr'?'GÉNÉRÉ PAR MÈCHE · 96% MATCH':'MÈCHE-GENERATED · 96% MATCH'}
            </div>
            <div className="serif" style={{fontSize:22,letterSpacing:'-0.02em',marginTop:4}}>
              {lang==='fr'?'Carré flou caramel · ajusté':'Caramel soft bob · adjusted'}
            </div>
          </div>
        </div>

        <div style={{fontSize:12,color:MPAL.mute,textAlign:'center',marginBottom:14}}>
          {lang==='fr'?'Glisse pour comparer. Pas tout à fait ça ?':'Drag to compare. Not quite right?'}
        </div>

        {/* réajuster / refaire — les 2 options demandées */}
        <div style={{display:'flex',gap:10,marginBottom:8}}>
          <button onClick={onReadjust} style={{flex:1,padding:'13px 14px',borderRadius:999,
            background:MPAL.paper,border:`1px solid ${MPAL.border}`,color:MPAL.ink,
            fontSize:13,fontWeight:600,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:7}}>
            <MIcon name="settings" size={14}/>{lang==='fr'?'Réajuster':'Readjust'}
          </button>
          <button onClick={onRedo} style={{flex:1,padding:'13px 14px',borderRadius:999,
            background:MPAL.paper,border:`1px solid ${MPAL.border}`,color:MPAL.ink,
            fontSize:13,fontWeight:600,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:7}}>
            <MIcon name="flip" size={14}/>{lang==='fr'?'Refaire':'Redo'}
          </button>
        </div>
        <div style={{fontSize:11,color:MPAL.mute,textAlign:'center',marginBottom:18}}>
          {lang==='fr'?'Réajuster te ramène à l\'idée · Refaire relance une variante':'Readjust returns to the idea · Redo runs a new variant'}
        </div>

        {/* validate */}
        <button style={{width:'100%',padding:'14px 18px',borderRadius:999,background:accent,color:'#fff',
          border:'none',fontSize:14,fontWeight:600,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          <MIcon name="check" size={14} color="#fff" stroke={2.5}/>
          {lang==='fr'?'Elle valide · on coupe':'She approves · let\'s cut'}
        </button>
      </div>
    </div>
  );
}

// ─── The flow ──────────────────────────────────────────────────────────────
function PScreenEssai({ lang, accent }) {
  const ESS = MPAL.sable;                      // action accent — caramel, comme la B2C
  const [step, setStep] = lUS('selfie');       // selfie | idea | adjust | result
  const [gen, setGen]   = lUS(false);          // loader overlay
  const [prompt, setPrompt] = lUS('');
  const [pick, setPick] = lUS(0);
  const [len, setLen] = lUS(0.4);
  const [vol, setVol] = lUS(0.5);
  const [fringe, setFringe] = lUS(0.3);
  const [col, setCol] = lUS(2);

  const restart = () => { setStep('selfie'); setGen(false); };
  const idx = { selfie:0, idea:1, adjust:2, result:3 }[step];

  const generate = () => { setGen(true); };
  const loaderDone = () => { setGen(false); setStep('result'); };

  const header = (back) => (
    <PStepHeader idx={idx} lang={lang} accent={ESS} onClose={restart}
      onBack={back}/>
  );

  if (gen) return <PEssaiLoader lang={lang} accent={ESS} onDone={loaderDone}/>;

  if (step === 'selfie')
    return <PStepSelfie lang={lang} accent={ESS} onShoot={()=>setStep('idea')}/>;

  if (step === 'idea')
    return <PStepIdea lang={lang} accent={ESS} prompt={prompt} setPrompt={setPrompt}
      pick={pick} setPick={setPick} onNext={()=>setStep('adjust')}
      header={header(()=>setStep('selfie'))}/>;

  if (step === 'adjust')
    return <PStepAdjust lang={lang} accent={ESS}
      st={{len,setLen,vol,setVol,fringe,setFringe,col,setCol}}
      onGenerate={generate} header={header(()=>setStep('idea'))}/>;

  return <PStepResult lang={lang} accent={ESS}
    onReadjust={()=>setStep('idea')} onRedo={generate}
    header={header(()=>setStep('adjust'))}/>;
}

Object.assign(window, {
  PScreenEssai,
  // legacy aliases so any old reference still resolves to the new flow
  PScreenLiveLauncher: PScreenEssai,
  PScreenLiveMirror: PScreenEssai,
  PScreenLiveSummary: PScreenEssai,
});
