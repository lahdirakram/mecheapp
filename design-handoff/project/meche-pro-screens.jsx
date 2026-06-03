// meche-pro-screens.jsx — Mèche Pro screens (onboarding, paywall, inbox, agenda, salon)
// Live mode lives in meche-pro-live.jsx
// Globals: PScreenWelcome, PScreenSignup, PScreenSetup, PScreenPaywall,
//          PScreenToday, PScreenInbox, PScreenDemandeDetail, PScreenReply,
//          PScreenAgenda, PScreenBookingDetail, PScreenPortfolio,
//          PScreenSalonPublic, PScreenStats

const { useState: pUS, useEffect: pUE, useRef: pUR } = React;

// 01. WELCOME PRO ────────────────────────────────────────────────────────────
function PScreenWelcome({ lang, accent }) {
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:MPAL.bg,color:MPAL.ink,position:'relative'}}>
      {/* hero collage: stylist hands + portrait + chat bubble */}
      <div style={{flex:1,position:'relative',overflow:'hidden',padding:'50px 18px 0'}}>
        <div style={{position:'absolute',inset:'50px 18px 30px',borderRadius:24,overflow:'hidden',
          background:PPAL.pro}}>
          <MPortrait hair="bob" mood="blush" tint={accent}/>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, transparent 40%, rgba(26,18,22,0.7) 100%)'}}/>
        </div>

        {/* floating "demande" card */}
        <div style={{position:'absolute',top:'30%',left:38,right:'45%',
          background:'#FAF7F1',borderRadius:14,padding:'10px 12px',
          boxShadow:'0 14px 40px rgba(0,0,0,0.18)',transform:'rotate(-3deg)'}}>
          <div className="mono" style={{fontSize:8,letterSpacing:'.16em',color:PPAL.pro,fontWeight:700}}>
            · NOUVELLE DEMANDE
          </div>
          <div style={{display:'flex',gap:8,marginTop:6,alignItems:'center'}}>
            <div style={{width:34,height:42,borderRadius:6,overflow:'hidden',flexShrink:0}}>
              <MPortrait hair="bob" mood="warm" tint={accent}/>
            </div>
            <div style={{fontSize:11,lineHeight:1.3}}>
              <b>Camille R.</b> · {lang==='fr'?'samedi ?':'saturday?'}<br/>
              <span style={{color:MPAL.mute,fontSize:10}}>{lang==='fr'?'Carré flou caramel':'Caramel soft bob'}</span>
            </div>
          </div>
        </div>

        {/* studio chip */}
        <div style={{position:'absolute',bottom:'42%',right:30,
          background:'#fff',borderRadius:14,padding:'10px 14px',
          boxShadow:'0 14px 40px rgba(0,0,0,0.18)',transform:'rotate(4deg)',
          display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:10,height:10,borderRadius:5,background:'#1F8A5B'}}/>
          <div>
            <div className="mono" style={{fontSize:8,letterSpacing:'.16em',color:PPAL.pro,fontWeight:700}}>
              · STUDIO LIVE
            </div>
            <div style={{fontSize:11,fontWeight:600,marginTop:2}}>{lang==='fr'?'Essai en cours':'Live try-on'}</div>
          </div>
        </div>
      </div>

      <div style={{padding:'18px 26px 36px',display:'flex',flexDirection:'column',gap:14,
        background:`linear-gradient(180deg, transparent, ${MPAL.bg} 12%)`,marginTop:-30}}>
        <PWordmark size={22} color={MPAL.ink} accent={MPAL.sable}/>
        <div className="serif" style={{fontSize:42,lineHeight:1.0,letterSpacing:'-0.035em',marginTop:6}}>
          {lang==='fr' ? (
            <>Les clients qui<br/><span style={{fontStyle:'italic',color:PPAL.pro}}>savent</span> ce qu'ils veulent.</>
          ) : (
            <>Clients who<br/><span style={{fontStyle:'italic',color:PPAL.pro}}>already</span> know.</>
          )}
        </div>
        <div style={{fontSize:14,color:MPAL.mute,lineHeight:1.45,marginTop:2,maxWidth:330}}>
          {lang==='fr'
            ?'Reçois leur idée en photo, valide, réserve. Et montre-leur le résultat avant même la coupe.'
            :'Get their idea as a photo, approve, book. And show them the result before the cut.'}
        </div>
        <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:10}}>
          <PPrimary label={lang==='fr'?'Ouvrir mon salon':'Open my salon'} icon="arrowRight"/>
          <button style={{background:'transparent',border:'none',cursor:'pointer',color:MPAL.mute,
            fontSize:13,padding:'4px',fontWeight:500}}>
            {lang==='fr'?'J\'ai déjà un compte Pro':'I already have a Pro account'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 02. SIGNUP — salon basics ──────────────────────────────────────────────────
function PScreenSignup({ lang, accent }) {
  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,display:'flex',flexDirection:'column'}}>
      <div style={{height:54}}/>
      <PTopBar title={lang==='fr'?'Crée ton salon':'Open your salon'} big onBack={()=>{}}
        sub={lang==='fr'?'Étape 1 / 3 · les bases':'Step 1 / 3 · the basics'}/>
      <div style={{flex:1,overflowY:'auto',padding:'12px 22px 24px'}}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {[
            { l: lang==='fr'?'Nom du salon':'Salon name', v:'Atelier Bonaparte', ph:'' },
            { l: lang==='fr'?'Adresse':'Address',         v:'14 rue Bonaparte, 75006 Paris', ph:'' },
            { l: lang==='fr'?'Téléphone':'Phone',         v:'+33 1 42 ', ph:'+33 …', mono:true },
          ].map((f,i)=>(
            <label key={i} style={{display:'flex',flexDirection:'column',gap:6}}>
              <span className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600,textTransform:'uppercase'}}>
                {f.l}
              </span>
              <div style={{padding:'14px 16px',background:MPAL.paper,border:`1px solid ${MPAL.border}`,
                borderRadius:14,fontSize:15, fontFamily:f.mono?"'Geist Mono',monospace":'inherit'}}>
                {f.v}<span style={{color:MPAL.mute}}>{f.ph}</span>
              </div>
            </label>
          ))}

          <label style={{display:'flex',flexDirection:'column',gap:6,marginTop:4}}>
            <span className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600}}>
              {lang==='fr'?'TYPE DE LIEU':'PLACE TYPE'}
            </span>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {[
                {fr:'Salon',en:'Salon',on:true},
                {fr:'Indépendant·e',en:'Freelance'},
                {fr:'À domicile',en:'At-home'},
                {fr:'Studio privé',en:'Private studio'},
              ].map((t,i)=>(
                <div key={i} style={{
                  padding:'8px 14px',borderRadius:999,fontSize:12,fontWeight:600,cursor:'pointer',
                  background: t.on ? MPAL.ink : MPAL.paper,
                  color: t.on ? '#fff' : MPAL.ink,
                  border:`1px solid ${t.on ? MPAL.ink : MPAL.border}`,
                }}>{t[lang]}</div>
              ))}
            </div>
          </label>

          <label style={{display:'flex',flexDirection:'column',gap:6,marginTop:4}}>
            <span className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600}}>
              {lang==='fr'?'COIFFEUR·EUSE·S':'STYLISTS'}
            </span>
            <div style={{padding:'10px 14px',background:MPAL.paper,border:`1px solid ${MPAL.border}`,
              borderRadius:14,display:'flex',alignItems:'center',gap:10}}>
              {['Inès','Yann','Sofia'].map((n,i)=>(
                <div key={i} style={{padding:'6px 10px',borderRadius:999,background:MPAL.subtle,
                  fontSize:12,fontWeight:600,display:'flex',alignItems:'center',gap:6}}>
                  {n}<MIcon name="x" size={10}/></div>
              ))}
              <button style={{padding:'6px 10px',borderRadius:999,background:'transparent',
                border:`1px dashed ${MPAL.border}`,fontSize:12,color:MPAL.mute,cursor:'pointer',
                display:'flex',alignItems:'center',gap:4}}>
                <MIcon name="plus" size={12}/>{lang==='fr'?'Ajouter':'Add'}
              </button>
            </div>
          </label>
        </div>
      </div>
      <div style={{padding:'14px 22px 32px',borderTop:`1px solid ${MPAL.border}`}}>
        <PPrimary label={lang==='fr'?'Continuer':'Continue'} icon="arrowRight"/>
      </div>
    </div>
  );
}

// 03. SETUP — photos + hours + services ─────────────────────────────────────
function PScreenSetup({ lang, accent }) {
  const services = [
    { fr:'Coupe femme',  en:'Women\'s cut',    p:'55 €', dur:'1h' },
    { fr:'Coupe homme',  en:'Men\'s cut',      p:'35 €', dur:'45 min' },
    { fr:'Balayage',     en:'Balayage',        p:'120 €', dur:'2h' },
    { fr:'Couleur racines', en:'Root touch-up',p:'70 €', dur:'1h15' },
  ];
  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,display:'flex',flexDirection:'column'}}>
      <div style={{height:54}}/>
      <PTopBar title={lang==='fr'?'Le salon':'The salon'} big onBack={()=>{}}
        sub={lang==='fr'?'Étape 2 / 3 · photos & services':'Step 2 / 3 · photos & services'}/>
      <div style={{flex:1,overflowY:'auto',padding:'10px 18px 24px'}}>
        <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600,marginBottom:8}}>
          {lang==='fr'?'PHOTOS DU SALON':'SALON PHOTOS'}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr 1fr',gap:8,marginBottom:6}}>
          <div style={{gridRow:'span 2',aspectRatio:'1/1.4',borderRadius:14,overflow:'hidden',
            background:MPAL.subtle,position:'relative'}}>
            <MPortrait hair="bob" mood="warm" tint={accent}/>
            <div style={{position:'absolute',bottom:8,left:8,padding:'3px 8px',borderRadius:4,
              background:'rgba(255,255,255,0.9)',fontSize:9,fontWeight:700,letterSpacing:'.06em'}}>COUVERTURE</div>
          </div>
          <div style={{aspectRatio:'1/1',borderRadius:14,overflow:'hidden',background:MPAL.subtle}}>
            <MPortrait hair="long" mood="cool"/>
          </div>
          <div style={{aspectRatio:'1/1',borderRadius:14,overflow:'hidden',background:MPAL.subtle}}>
            <MPortrait hair="pixie" mood="night" tint={accent}/>
          </div>
          <div style={{aspectRatio:'1/1',borderRadius:14,overflow:'hidden',background:MPAL.subtle}}>
            <MPortrait hair="curly" mood="blush"/>
          </div>
          <div style={{aspectRatio:'1/1',borderRadius:14,background:'transparent',
            border:`1px dashed ${MPAL.border}`,display:'flex',alignItems:'center',justifyContent:'center',
            color:MPAL.mute,fontSize:11,flexDirection:'column',gap:4}}>
            <MIcon name="plus" size={18}/>{lang==='fr'?'Ajouter':'Add'}
          </div>
        </div>

        <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600,marginTop:20,marginBottom:8}}>
          {lang==='fr'?'HORAIRES':'OPENING HOURS'}
        </div>
        <div style={{padding:'4px 14px',background:MPAL.paper,border:`1px solid ${MPAL.border}`,borderRadius:14}}>
          {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((d,i)=>{
            const closed = i === 0 || i === 6;
            return (
              <div key={i} style={{display:'flex',alignItems:'center',padding:'10px 0',
                borderBottom: i<6?`1px solid ${MPAL.border}`:'none'}}>
                <div style={{width:36,fontSize:12,fontWeight:600}}>{d}</div>
                <div style={{flex:1,fontSize:13, fontFamily:"'Geist Mono',monospace",
                  color: closed ? MPAL.mute : MPAL.ink}}>
                  {closed ? (lang==='fr'?'Fermé':'Closed') : '10:00 – 19:00'}
                </div>
                <div style={{width:36,height:22,borderRadius:11,
                  background: closed ? MPAL.subtle : PPAL.pro,
                  position:'relative'}}>
                  <div style={{position:'absolute',top:2,
                    left: closed ? 2 : 16,
                    width:18,height:18,borderRadius:9,background:'#fff'}}/>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600,marginTop:20,marginBottom:8}}>
          {lang==='fr'?'SERVICES & PRIX':'SERVICES & PRICES'}
        </div>
        <div style={{padding:'4px 14px',background:MPAL.paper,border:`1px solid ${MPAL.border}`,borderRadius:14}}>
          {services.map((s,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',padding:'12px 0',gap:12,
              borderBottom: i<services.length-1?`1px solid ${MPAL.border}`:'none'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600}}>{s[lang]}</div>
                <div style={{fontSize:11,color:MPAL.mute,marginTop:1}}>{s.dur}</div>
              </div>
              <div className="mono" style={{fontSize:13,fontWeight:600}}>{s.p}</div>
              <MIcon name="chevronRight" size={14} color={MPAL.mute}/>
            </div>
          ))}
          <div style={{padding:'12px 0',display:'flex',alignItems:'center',gap:8,color:PPAL.pro,
            fontSize:13,fontWeight:600}}>
            <MIcon name="plus" size={14} color={PPAL.pro}/>{lang==='fr'?'Ajouter un service':'Add service'}
          </div>
        </div>
      </div>
      <div style={{padding:'14px 22px 32px',borderTop:`1px solid ${MPAL.border}`}}>
        <PPrimary label={lang==='fr'?'Continuer':'Continue'} icon="arrowRight"/>
      </div>
    </div>
  );
}

// 04. PAYWALL PRO ────────────────────────────────────────────────────────────
function PScreenPaywall({ lang, accent }) {
  const aDark = pOnDark(accent);
  return (
    <div style={{height:'100%',background:MPAL.ink,color:'#fff',display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
      {/* warm glow */}
      <div style={{position:'absolute',top:-80,right:-80,width:300,height:300,borderRadius:200,
        background:`radial-gradient(circle, ${accent}55, transparent 65%)`}}/>
      <div style={{position:'absolute',bottom:-100,left:-80,width:280,height:280,borderRadius:200,
        background:`radial-gradient(circle, ${PPAL.pro}aa, transparent 65%)`}}/>

      <div style={{height:54}}/>
      <div style={{padding:'4px 22px 0',position:'relative',zIndex:2,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <button style={{width:36,height:36,borderRadius:18,background:'rgba(255,255,255,0.12)',
          border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <MIcon name="x" size={16} color="#fff"/>
        </button>
        <div className="mono" style={{fontSize:10,letterSpacing:'.16em',color:'rgba(255,255,255,0.6)'}}>
          {lang==='fr'?'ÉTAPE 3 / 3':'STEP 3 / 3'}
        </div>
      </div>

      <div style={{padding:'24px 22px 8px',position:'relative',zIndex:2}}>
        <PWordmark size={26} color="#fff" accent={MPAL.sable}/>
        <div className="serif" style={{fontSize:38,lineHeight:1.0,letterSpacing:'-0.03em',marginTop:14}}>
          {lang==='fr'?<>Pour les coiffeurs<br/>qui <span style={{fontStyle:'italic',color:aDark}}>savent</span>.</>
          :<>For stylists<br/>who <span style={{fontStyle:'italic',color:aDark}}>know</span>.</>}
        </div>
        <div style={{fontSize:13,color:'rgba(255,255,255,0.7)',marginTop:8,maxWidth:300}}>
          {lang==='fr'
            ?'Le client arrive avec la coupe. Tu valides, tu réserves, tu coupes.'
            :'The client shows up with the cut. You confirm, book, then cut.'}
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'18px 18px 14px',position:'relative',zIndex:2}}>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {PPLANS.map(p => {
            const popular = p.badge === 'popular';
            return (
              <div key={p.id} style={{
                padding:'18px 18px',borderRadius:18,
                background: popular ? '#FAF7F1' : 'rgba(255,255,255,0.06)',
                color: popular ? MPAL.ink : '#fff',
                border: popular ? `2px solid ${accent}` : '1px solid rgba(255,255,255,0.12)',
                position:'relative',
              }}>
                {popular && (
                  <div className="mono" style={{
                    position:'absolute',top:-9,left:18,padding:'3px 10px',borderRadius:999,
                    background:aDark,color:'#fff',fontSize:9,letterSpacing:'.16em',fontWeight:700,
                  }}>{lang==='fr'?'· LE PLUS CHOISI':'· MOST CHOSEN'}</div>
                )}
                <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:12}}>
                  <div>
                    <div className="serif" style={{fontSize:24,letterSpacing:'-0.02em'}}>{p.name[lang]}</div>
                    <div style={{fontSize:11,color: popular ? MPAL.mute : 'rgba(255,255,255,0.55)',marginTop:2}}>{p.sub[lang]}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div className="serif" style={{fontSize:30,letterSpacing:'-0.02em',lineHeight:1}}>{p.price}</div>
                    <div style={{fontSize:10,color: popular?MPAL.mute:'rgba(255,255,255,0.55)',marginTop:2}}>
                      {lang==='fr'?'/ mois HT':'/ mo excl. tax'}
                    </div>
                  </div>
                </div>
                <div style={{marginTop:14,display:'flex',flexDirection:'column',gap:6}}>
                  {p.perks.map((perk,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8,fontSize:12,
                      color: popular ? MPAL.ink : 'rgba(255,255,255,0.85)'}}>
                      <MIcon name="check" size={14} color={popular?accent:aDark} stroke={2.2}/>
                      <span>{perk[lang]}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.45)',textAlign:'center',marginTop:14,lineHeight:1.4}}>
          {lang==='fr'
            ?'Sans engagement. Annule en un tap.'
            :'No commitment. Cancel in a tap.'}
        </div>
      </div>

      <div style={{padding:'14px 18px 32px',position:'relative',zIndex:2}}>
        <PPrimary label={lang==='fr'?'S\'abonner · Salon · 89 €/mois':'Subscribe · Salon · €89/mo'}
          color={aDark}/>
      </div>
    </div>
  );
}

// 05. TODAY (dashboard) ──────────────────────────────────────────────────────
function PScreenToday({ lang, accent, onTabChange }) {
  const next = PBOOKINGS.find(b => b.status === 'live') || PBOOKINGS[0];
  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,display:'flex',flexDirection:'column',position:'relative'}}>
      <div style={{height:54}}/>
      <div style={{padding:'4px 18px 4px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <PWordmark size={20} color={MPAL.ink} accent={MPAL.sable}/>
        <button style={{width:36,height:36,borderRadius:18,border:'none',
          background:'rgba(0,0,0,0.05)',cursor:'pointer',color:MPAL.ink,
          display:'flex',alignItems:'center',justifyContent:'center'}}>
          <MIcon name="settings" size={16}/></button>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'8px 18px 110px'}}>
        <div className="serif" style={{fontSize:34,letterSpacing:'-0.02em',lineHeight:1.05}}>
          {lang==='fr'?'Bonjour Inès.':'Hi Inès.'}
        </div>
        <div style={{fontSize:13,color:MPAL.mute,marginTop:4}}>
          {lang==='fr'
            ?<>Tu as <b style={{color:MPAL.ink}}>4 rendez-vous</b> aujourd'hui.</>
            :<>You have <b style={{color:MPAL.ink}}>4 bookings</b> today.</>}
        </div>

        {/* hero — live now */}
        <div style={{marginTop:16,borderRadius:20,overflow:'hidden',background:MPAL.ink,color:'#fff',
          position:'relative'}}>
          <div style={{aspectRatio:'16/9',position:'relative'}}>
            <MPortrait hair={next.client === 'Camille R.' ? 'bob' : 'medium'} mood="warm" tint={accent}/>
            <div style={{position:'absolute',inset:0,background:'linear-gradient(90deg, rgba(26,18,22,0.92) 0%, rgba(26,18,22,0.4) 60%, transparent 100%)'}}/>
            <div style={{position:'absolute',top:14,left:14,display:'flex',alignItems:'center',gap:6,
              padding:'5px 10px',borderRadius:999,background:'rgba(255,255,255,0.95)',color:MPAL.ink,
              fontSize:11,fontWeight:600}}>
              <span style={{width:6,height:6,borderRadius:6,background:'#1F8A5B'}}/>
              {lang==='fr'?'EN COURS · 14:30':'LIVE · 14:30'}
            </div>
            <div style={{position:'absolute',left:18,right:120,bottom:14}}>
              <div className="mono" style={{fontSize:9,letterSpacing:'.16em',opacity:0.7}}>
                {lang==='fr'?'PROCHAIN RDV':'NEXT BOOKING'}
              </div>
              <div className="serif" style={{fontSize:22,marginTop:4,letterSpacing:'-0.01em'}}>{next.client}</div>
              <div style={{fontSize:12,opacity:0.75,marginTop:2}}>{next.service} · {next.dur}</div>
            </div>
          </div>
          <div style={{padding:'12px 14px',display:'flex',gap:8,background:'rgba(0,0,0,0.4)'}}>
            <button onClick={()=>onTabChange && onTabChange('live')} style={{
              flex:1,padding:'10px 12px',borderRadius:999,background:MPAL.sable,color:MPAL.sableInk,
              border:'none',cursor:'pointer',fontSize:13,fontWeight:600,
              display:'flex',alignItems:'center',justifyContent:'center',gap:6,
            }}>
              <MIcon name="sparkle" size={14} color={MPAL.sableInk} fill={MPAL.sableInk} stroke={0}/>
              {lang==='fr'?'Essayer une coupe':'Try a look'}
            </button>
            <button style={{padding:'10px 14px',borderRadius:999,background:'rgba(255,255,255,0.12)',
              color:'#fff',border:'1px solid rgba(255,255,255,0.2)',cursor:'pointer',fontSize:13}}>
              {lang==='fr'?'Fiche':'Card'}
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{marginTop:18,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          {[
            { l: lang==='fr'?'Demandes':'Requests',  v: '4', d:'+2', icon:'mail',    accentCol: PPAL.pro },
            { l: lang==='fr'?'RDV jour':'Bookings',  v: '4', d:'1 en cours', icon:'calendar',accentCol: '#1F8A5B' },
            { l: lang==='fr'?'Essais salon':'Tries', v: '7', d:'+3', icon:'sparkle', accentCol: accent },
          ].map((k,i)=>(
            <div key={i} style={{padding:'12px 12px',borderRadius:14,background:MPAL.paper,
              border:`1px solid ${MPAL.border}`}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <MIcon name={k.icon} size={14} color={k.accentCol}/>
                <span className="mono" style={{fontSize:9,letterSpacing:'.1em',color:k.accentCol,fontWeight:700}}>{k.d}</span>
              </div>
              <div className="serif" style={{fontSize:26,letterSpacing:'-0.02em',lineHeight:1,marginTop:8}}>{k.v}</div>
              <div style={{fontSize:10,color:MPAL.mute,marginTop:2}}>{k.l}</div>
            </div>
          ))}
        </div>

      </div>

      <PTabBar active="today" lang={lang} badges={{inbox:4}} onChange={onTabChange}/>
    </div>
  );
}

// 06. INBOX (demandes) ───────────────────────────────────────────────────────
function PScreenInbox({ lang, accent, onTabChange }) {
  const [tab, setTab] = pUS(0);
  const tabs = [
    {fr:'À traiter',en:'To handle', count:4},
    {fr:'En cours',en:'Open',       count:2},
    {fr:'Archivées',en:'Archived',  count:18},
  ];
  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,display:'flex',flexDirection:'column',position:'relative'}}>
      <div style={{height:54}}/>
      <PTopBar title={lang==='fr'?'Demandes':'Requests'} big
        sub={lang==='fr'?'Photos générées par Mèche · "tu peux faire ça ?"':'Mèche-generated photos · "can you do this?"'}
        right={
          <div style={{display:'flex',gap:8}}>
            <button style={{width:36,height:36,borderRadius:18,border:'none',background:'rgba(0,0,0,0.05)',
              cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <MIcon name="settings" size={16}/></button>
          </div>
        }/>
      <div style={{padding:'4px 18px 12px',display:'flex',gap:8,overflowX:'auto'}}>
        {tabs.map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{
            padding:'8px 14px',borderRadius:999,fontSize:13,fontWeight:600,cursor:'pointer',
            background: tab===i ? MPAL.ink : MPAL.paper,
            color: tab===i ? '#fff' : MPAL.ink,
            border:`1px solid ${tab===i ? MPAL.ink : MPAL.border}`,
            display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap',
          }}>
            {t[lang]}
            <span style={{
              padding:'1px 6px',borderRadius:6,background: tab===i?'rgba(255,255,255,0.18)':MPAL.subtle,
              fontSize:10,letterSpacing:'.04em',fontWeight:600,
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'0 16px 110px'}}>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {PDEMANDES.map((d,i)=>(
            <div key={d.id} style={{
              padding:12,borderRadius:16,
              background: d.unread ? MPAL.paper : 'transparent',
              border:`1px solid ${d.unread?PPAL.pro+'40':MPAL.border}`,
              display:'flex',gap:12,position:'relative',
            }}>
              {d.unread && <div style={{position:'absolute',left:-1,top:14,bottom:14,width:3,
                borderRadius:2,background:PPAL.pro}}/>}
              {/* the photo the client sent */}
              <div style={{width:72,height:96,borderRadius:12,overflow:'hidden',flexShrink:0,position:'relative'}}>
                <MPortrait hair={d.hair} mood={d.mood} tint={accent}/>
                <div style={{position:'absolute',bottom:4,left:4,padding:'2px 5px',borderRadius:3,
                  background:'rgba(255,255,255,0.92)',fontSize:7,fontWeight:700,letterSpacing:'.1em',color:PPAL.pro}}>
                  · MÈCHE
                </div>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:8}}>
                  <div style={{fontSize:14,fontWeight:600}}>{d.name}</div>
                  <div style={{fontSize:11,color:MPAL.mute,whiteSpace:'nowrap'}}>{d.when}</div>
                </div>
                <div style={{fontSize:11,color:PPAL.pro,fontWeight:600,marginTop:2}}>
                  {d.cut}
                </div>
                <div style={{fontSize:12,color: d.unread?MPAL.ink:MPAL.mute,marginTop:6,lineHeight:1.4,
                  display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                  {d.msg[lang]}
                </div>
                <div style={{display:'flex',gap:6,marginTop:8,alignItems:'center'}}>
                  <span style={{padding:'3px 8px',borderRadius:999,background:MPAL.subtle,
                    fontSize:10,fontWeight:600,color:MPAL.ink}}>
                    {d.confidence}% match
                  </span>
                  <span style={{padding:'3px 8px',borderRadius:999,background:MPAL.subtle,
                    fontSize:10,fontWeight:600,color:MPAL.mute}}>
                    {d.budget}
                  </span>
                  <div style={{marginLeft:'auto',fontSize:12,color:PPAL.pro,fontWeight:600,
                    display:'flex',alignItems:'center',gap:3}}>
                    {lang==='fr'?'Répondre':'Reply'}<MIcon name="chevronRight" size={12} color={PPAL.pro}/>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <PTabBar active="inbox" lang={lang} badges={{inbox:4}} onChange={onTabChange}/>
    </div>
  );
}

// 07. DEMANDE DETAIL ─────────────────────────────────────────────────────────
function PScreenDemandeDetail({ lang, accent }) {
  const d = PDEMANDES[0]; // Camille R.
  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,display:'flex',flexDirection:'column'}}>
      {/* dark image header */}
      <div style={{position:'relative',height:380,background:'#000',overflow:'hidden'}}>
        <MPortrait hair={d.hair} mood={d.mood} tint={accent}/>
        <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 30%, rgba(26,18,22,0.85) 100%)'}}/>

        <div style={{position:'absolute',top:54,left:14,right:14,display:'flex',justifyContent:'space-between'}}>
          <button style={{width:38,height:38,borderRadius:19,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(20px)',
            border:'none',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            <MIcon name="chevronLeft" size={18} color="#fff"/></button>
          <div style={{display:'flex',gap:8}}>
            <button style={{padding:'8px 14px',borderRadius:999,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(20px)',
              border:'1px solid rgba(255,255,255,0.18)',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer'}}>
              {lang==='fr'?'Archiver':'Archive'}
            </button>
          </div>
        </div>

        {/* MÈCHE-generated badge */}
        <div style={{position:'absolute',top:120,left:18,
          display:'inline-flex',alignItems:'center',gap:8,
          padding:'6px 12px 6px 6px',borderRadius:999,
          background:'rgba(255,255,255,0.14)',backdropFilter:'blur(20px)',
          border:'1px solid rgba(255,255,255,0.22)',color:'#fff'}}>
          <div style={{width:22,height:22,borderRadius:11,background:MPAL.sable,
            display:'flex',alignItems:'center',justifyContent:'center'}}>
            <MIcon name="sparkle" size={11} color={MPAL.sableInk} fill={MPAL.sableInk} stroke={0}/>
          </div>
          <div className="mono" style={{fontSize:9,letterSpacing:'.16em',fontWeight:700}}>
            · GÉNÉRÉ PAR MÈCHE
          </div>
        </div>

        <div style={{position:'absolute',bottom:18,left:18,right:18,color:'#fff'}}>
          <div className="serif" style={{fontSize:28,letterSpacing:'-0.02em'}}>{d.cut}</div>
          <div style={{fontSize:13,opacity:0.8,marginTop:2}}>
            {lang==='fr'?'Aperçu IA · à partir du selfie de':'AI preview · from selfie of'} {d.name}
          </div>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'14px 18px 20px'}}>
        {/* client identity */}
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
          <div style={{width:44,height:44,borderRadius:22,background:MPAL.subtle,overflow:'hidden'}}>
            <MPortrait hair="medium" mood="warm"/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600}}>{d.name}</div>
            <div style={{fontSize:11,color:MPAL.mute}}>{d.handle} · {d.when}</div>
          </div>
          <button style={{padding:'8px 10px',borderRadius:999,background:'transparent',
            border:`1px solid ${MPAL.border}`,color:MPAL.ink,fontSize:11,fontWeight:600,cursor:'pointer'}}>
            {lang==='fr'?'Profil':'Profile'}
          </button>
        </div>

        {/* message bubble */}
        <div style={{padding:'12px 14px',background:MPAL.paper,border:`1px solid ${MPAL.border}`,
          borderRadius:'14px 14px 14px 4px',fontSize:13,lineHeight:1.5,marginBottom:14}}>
          {d.msg[lang]}
        </div>

        {/* Mèche dossier — what the AI tells the stylist */}
        <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600,marginBottom:10}}>
          {lang==='fr'?'DOSSIER MÈCHE':'MÈCHE BRIEF'}
        </div>
        <div style={{padding:'14px 16px',borderRadius:14,background:PPAL.proSoft,
          border:`1px solid ${PPAL.pro}30`,display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px 16px',marginBottom:14}}>
          {[
            { l: lang==='fr'?'Confiance IA':'AI confidence', v:`${d.confidence}%`, hi:true },
            { l: lang==='fr'?'Longueur visée':'Target length', v:'épaules' },
            { l: lang==='fr'?'Base':'Base color', v:d.baseColor },
            { l: lang==='fr'?'Cible':'Target', v:d.target },
            { l: lang==='fr'?'Budget client':'Client budget', v:d.budget },
            { l: lang==='fr'?'Texture':'Texture', v:'fine, légère' },
          ].map((row,i)=>(
            <div key={i}>
              <div className="mono" style={{fontSize:9,letterSpacing:'.1em',color:MPAL.mute,fontWeight:600}}>{row.l}</div>
              <div style={{fontSize:13,fontWeight:600,color:row.hi?PPAL.pro:MPAL.ink,marginTop:2}}>{row.v}</div>
            </div>
          ))}
        </div>

        {/* time slots offered */}
        <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600,marginBottom:10}}>
          {lang==='fr'?'CRÉNEAUX QUE TU PEUX PROPOSER':'SLOTS YOU CAN OFFER'}
        </div>
        <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:6}}>
          {[
            { d:'Sam', date:'29', t:'10h30', on:true },
            { d:'Sam', date:'29', t:'14h00' },
            { d:'Lun', date:'01', t:'11h00' },
            { d:'Mer', date:'03', t:'15h30' },
          ].map((s,i)=>(
            <div key={i} style={{
              padding:'10px 14px',borderRadius:14,
              background: s.on ? PPAL.pro : MPAL.paper,
              color: s.on ? '#fff' : MPAL.ink,
              border:`1px solid ${s.on ? PPAL.pro : MPAL.border}`,
              minWidth:84,textAlign:'center',cursor:'pointer',
            }}>
              <div className="mono" style={{fontSize:9,letterSpacing:'.1em',opacity:s.on?0.7:0.6}}>{s.d}</div>
              <div className="serif" style={{fontSize:20,letterSpacing:'-0.02em',marginTop:2}}>{s.date}</div>
              <div style={{fontSize:11,fontWeight:600,marginTop:2}}>{s.t}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{padding:'12px 18px 28px',borderTop:`1px solid ${MPAL.border}`,
        display:'flex',gap:8}}>
        <button style={{padding:'14px 18px',borderRadius:999,background:'transparent',
          border:`1px solid ${MPAL.border}`,color:MPAL.ink,fontSize:13,fontWeight:600,cursor:'pointer'}}>
          {lang==='fr'?'Décliner':'Decline'}
        </button>
        <button style={{flex:1,padding:'14px 18px',borderRadius:999,background:'transparent',
          border:`1px solid ${MPAL.ink}`,color:MPAL.ink,fontSize:14,fontWeight:600,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
          {lang==='fr'?'Discuter':'Discuss'}<MIcon name="mail" size={14}/>
        </button>
        <button style={{flex:1.4,padding:'14px 18px',borderRadius:999,background:PPAL.pro,color:'#fff',
          border:'none',fontSize:14,fontWeight:600,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
          {lang==='fr'?'Proposer le créneau':'Offer slot'}<MIcon name="check" size={14} color="#fff"/>
        </button>
      </div>
    </div>
  );
}

Object.assign(window, {
  PScreenWelcome, PScreenSignup, PScreenSetup, PScreenPaywall,
  PScreenToday, PScreenInbox, PScreenDemandeDetail,
});
