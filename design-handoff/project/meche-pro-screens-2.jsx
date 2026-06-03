// meche-pro-screens-2.jsx — Reply chat, Agenda, Booking detail, Portfolio, Public salon, Stats
// Globals: PScreenReply, PScreenAgenda, PScreenBookingDetail,
//          PScreenPortfolio, PScreenSalonPublic, PScreenStats

// 08. REPLY — coiffeur composes response with photo annotations ──────────────
function PScreenReply({ lang, accent }) {
  const d = PDEMANDES[0];
  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,display:'flex',flexDirection:'column'}}>
      <div style={{height:54}}/>
      <PTopBar title={d.name} onBack={()=>{}} sub={d.cut}
        right={<button style={{width:36,height:36,borderRadius:18,border:'none',background:'rgba(0,0,0,0.05)',
          cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <MIcon name="user" size={16}/></button>}/>

      {/* conversation */}
      <div style={{flex:1,overflowY:'auto',padding:'8px 16px 12px',display:'flex',flexDirection:'column',gap:10}}>
        <div className="mono" style={{fontSize:9,letterSpacing:'.16em',color:MPAL.mute,textAlign:'center',padding:'4px 0'}}>
          · {lang==='fr'?'IL Y A 12 MIN':'12 MIN AGO'} ·
        </div>

        {/* client message: photo + text */}
        <div style={{alignSelf:'flex-start',maxWidth:'78%'}}>
          <div style={{width:130,height:180,borderRadius:'14px 14px 14px 4px',overflow:'hidden',
            background:MPAL.subtle,position:'relative',marginBottom:6}}>
            <MPortrait hair={d.hair} mood={d.mood} tint={accent}/>
            <div style={{position:'absolute',top:6,left:6,padding:'2px 6px',borderRadius:3,
              background:'rgba(255,255,255,0.92)',fontSize:8,fontWeight:700,letterSpacing:'.12em',color:PPAL.pro}}>
              · MÈCHE
            </div>
          </div>
          <div style={{padding:'10px 12px',background:MPAL.paper,border:`1px solid ${MPAL.border}`,
            borderRadius:'14px 14px 14px 4px',fontSize:13,lineHeight:1.45}}>
            {d.msg[lang]}
          </div>
        </div>

        {/* stylist quick replies (your turn) */}
        <div style={{alignSelf:'flex-end',maxWidth:'82%'}}>
          <div style={{padding:'10px 14px',background:PPAL.pro,color:'#fff',
            borderRadius:'14px 14px 4px 14px',fontSize:13,lineHeight:1.45}}>
            {lang==='fr'
              ?'Hello Camille ! Beau choix — sur tes cheveux fins on partira sur un dégradé doux et un balayage caramel. Compte 2h, ~150€. Sam 14h ?'
              :'Hi Camille! Great pick — on your fine hair we\'ll go soft layers + caramel balayage. 2h, ~€150. Sat 2pm?'}
          </div>
          <div style={{fontSize:10,color:MPAL.mute,textAlign:'right',marginTop:3}}>
            {lang==='fr'?'Brouillon · Inès':'Draft · Inès'}
          </div>
        </div>

        {/* attach: annotated reference */}
        <div style={{alignSelf:'flex-end',maxWidth:'82%'}}>
          <div style={{padding:10,background:PPAL.pro,color:'#fff',borderRadius:'14px 14px 4px 14px',
            display:'flex',gap:10,alignItems:'center'}}>
            <div style={{width:54,height:72,borderRadius:8,overflow:'hidden',flexShrink:0,position:'relative'}}>
              <MPortrait hair="bob" mood="warm" tint={accent}/>
              <div style={{position:'absolute',top:4,right:4,width:18,height:18,borderRadius:9,
                background:accent,display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:9,fontWeight:700,color:'#fff'}}>✏</div>
            </div>
            <div style={{flex:1,minWidth:0,fontSize:12}}>
              <div className="mono" style={{fontSize:9,letterSpacing:'.14em',opacity:0.7,fontWeight:600}}>
                {lang==='fr'?'· MA PROPOSITION':'· MY PROPOSAL'}
              </div>
              <div style={{marginTop:4,lineHeight:1.4}}>
                {lang==='fr'
                  ?'Annoté · longueur 2cm plus haute, frange rideau légère.'
                  :'Annotated · 2cm shorter, soft curtain bangs.'}
              </div>
            </div>
          </div>
        </div>

        {/* slot proposal card */}
        <div style={{alignSelf:'flex-end',maxWidth:'82%',padding:10,
          background:'#FAF7F1',border:`1px solid ${PPAL.pro}40`,borderRadius:'14px 14px 4px 14px'}}>
          <div className="mono" style={{fontSize:9,letterSpacing:'.14em',color:PPAL.pro,fontWeight:700,marginBottom:6}}>
            · {lang==='fr'?'CRÉNEAU PROPOSÉ':'PROPOSED SLOT'}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{textAlign:'center',padding:'4px 10px',background:PPAL.pro,color:'#fff',borderRadius:10}}>
              <div className="mono" style={{fontSize:9,letterSpacing:'.08em'}}>SAM</div>
              <div className="serif" style={{fontSize:22,letterSpacing:'-0.02em',lineHeight:1}}>29</div>
            </div>
            <div style={{fontSize:13,flex:1}}>
              <div style={{fontWeight:600}}>{lang==='fr'?'Samedi 29 — 14h00':'Sat 29 — 2:00 PM'}</div>
              <div style={{fontSize:11,color:MPAL.mute,marginTop:2}}>{lang==='fr'?'~ 2h · ~ 150 €':'~ 2h · ~ €150'}</div>
            </div>
            <span style={{padding:'4px 8px',borderRadius:6,background:MPAL.subtle,
              fontSize:10,fontWeight:600,color:MPAL.mute}}>{lang==='fr'?'En attente':'Pending'}</span>
          </div>
        </div>
      </div>

      {/* compose bar */}
      <div style={{padding:'10px 12px 26px',borderTop:`1px solid ${MPAL.border}`,
        background:MPAL.bg}}>
        <div style={{display:'flex',gap:6,marginBottom:8,overflowX:'auto'}}>
          {[
            {ic:'sparkle',l:lang==='fr'?'Suggéré · "OK pour sam 14h ?"':'Suggested · "OK Sat 2pm?"',hi:true},
            {ic:'cam',l:lang==='fr'?'Photo':'Photo'},
            {ic:'calendar',l:lang==='fr'?'Créneau':'Slot'},
            {ic:'pin',l:lang==='fr'?'Itinéraire':'Directions'},
          ].map((q,i)=>(
            <div key={i} style={{padding:'6px 10px',borderRadius:999,
              background: q.hi ? PPAL.pro+'15' : MPAL.paper,
              border:`1px solid ${q.hi?PPAL.pro+'40':MPAL.border}`,
              fontSize:11,fontWeight:600,color: q.hi?PPAL.pro:MPAL.ink,
              display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap',flexShrink:0}}>
              <MIcon name={q.ic} size={11} color={q.hi?PPAL.pro:MPAL.mute}/>{q.l}
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',padding:'8px 8px 8px 14px',
          background:MPAL.paper,border:`1px solid ${MPAL.border}`,borderRadius:24}}>
          <div style={{flex:1,fontSize:13,color:MPAL.mute}}>
            {lang==='fr'?'Ta réponse…':'Your reply…'}
          </div>
          <button style={{width:36,height:36,borderRadius:18,background:MPAL.subtle,border:'none',
            color:MPAL.ink,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <MIcon name="mic" size={14}/>
          </button>
          <button style={{width:36,height:36,borderRadius:18,background:PPAL.pro,border:'none',
            color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <MIcon name="arrowUp" size={14} color="#fff"/>
          </button>
        </div>
      </div>
    </div>
  );
}

// 09. AGENDA / CALENDRIER ────────────────────────────────────────────────────
function PScreenAgenda({ lang, accent, onTabChange }) {
  const days = [
    {d:'Lun',n:24,off:true},{d:'Mar',n:25,c:2},{d:'Mer',n:26,c:5},
    {d:'Jeu',n:27,c:4,today:true},{d:'Ven',n:28,c:6},{d:'Sam',n:29,c:8},{d:'Dim',n:30,off:true},
  ];
  const hours = ['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];
  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,display:'flex',flexDirection:'column',position:'relative'}}>
      <div style={{height:54}}/>
      <PTopBar title={lang==='fr'?'Jeudi 27':'Thursday 27'} big sub={lang==='fr'?'Mai · 4 rendez-vous':'May · 4 bookings'}
        right={<div style={{display:'flex',gap:8}}>
          <button style={{width:36,height:36,borderRadius:18,border:'none',background:'rgba(0,0,0,0.05)',
            cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <MIcon name="grid" size={16}/></button>
          <button style={{width:36,height:36,borderRadius:18,border:'none',background:PPAL.pro,
            cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'}}>
            <MIcon name="plus" size={16} color="#fff"/></button>
        </div>}/>

      {/* week strip */}
      <div style={{padding:'4px 14px 12px',display:'flex',gap:6}}>
        {days.map((d,i)=>{
          const on = d.today;
          return (
            <div key={i} style={{flex:1,padding:'10px 4px',borderRadius:12,
              background: on ? MPAL.ink : (d.off?'transparent':MPAL.paper),
              color: on ? '#fff' : (d.off?MPAL.mute:MPAL.ink),
              border:`1px solid ${on?MPAL.ink:(d.off?'transparent':MPAL.border)}`,
              textAlign:'center',cursor:'pointer'}}>
              <div className="mono" style={{fontSize:9,letterSpacing:'.1em',opacity:0.7}}>{d.d}</div>
              <div className="serif" style={{fontSize:18,letterSpacing:'-0.02em',marginTop:2,lineHeight:1}}>{d.n}</div>
              {d.c && (
                <div style={{marginTop:4,display:'flex',justifyContent:'center',gap:2}}>
                  {Array.from({length:Math.min(d.c,4)}).map((_,j)=>(
                    <span key={j} style={{width:3,height:3,borderRadius:2,
                      background: on ? accent : PPAL.pro}}/>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* day timeline */}
      <div style={{flex:1,overflowY:'auto',padding:'0 16px 110px'}}>
        <div style={{position:'relative'}}>
          {hours.map((h,i)=>(
            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,minHeight:50}}>
              <div className="mono" style={{width:42,fontSize:10,color:MPAL.mute,letterSpacing:'.06em',
                paddingTop:2,flexShrink:0}}>{h}</div>
              <div style={{flex:1,borderTop:`1px solid ${MPAL.border}`,minHeight:50,position:'relative'}}>
                {/* now line at 14:30 — between 14:00 and 15:00 (i=4) */}
                {i === 4 && (
                  <div style={{position:'absolute',top:25,left:-4,right:0}}>
                    <div style={{height:2,background:'#1F8A5B',borderRadius:1}}/>
                    <div style={{position:'absolute',left:-8,top:-4,width:10,height:10,borderRadius:5,background:'#1F8A5B'}}/>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* booking blocks absolutely positioned */}
          {[
            {b:PBOOKINGS[0], top:36,   h:62},  // 10:30 -> ~36 from top, 1h15
            {b:PBOOKINGS[1], top:152,  h:36},  // 13:00, 45min
            {b:PBOOKINGS[2], top:228,  h:100}, // 14:30, 2h — LIVE
            {b:PBOOKINGS[3], top:362,  h:50},  // 17:00, 1h
          ].map((blk,i)=>{
            const b = blk.b;
            const live = b.status === 'live';
            const pending = b.status === 'pending';
            return (
              <div key={i} style={{
                position:'absolute',left:52,right:0,
                top:blk.top,height:blk.h,
                borderRadius:12,padding:'8px 12px',
                background: live ? PPAL.pro : (pending ? MPAL.subtle : MPAL.paper),
                color: live ? '#fff' : MPAL.ink,
                border: pending ? `1px dashed ${MPAL.border}` : `1px solid ${live?PPAL.pro:MPAL.border}`,
                display:'flex',flexDirection:'column',gap:2,overflow:'hidden',
                boxShadow: live ? '0 4px 14px rgba(61,42,51,0.3)' : 'none',
              }}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div className="mono" style={{fontSize:9,letterSpacing:'.1em',fontWeight:700,
                    opacity: live?0.95:0.7,color: live?'#fff':MPAL.mute}}>
                    {b.time} · {b.dur}
                  </div>
                  {live && (
                    <span style={{padding:'1px 6px',borderRadius:4,background:'rgba(255,255,255,0.22)',
                      fontSize:8,fontWeight:700,letterSpacing:'.1em'}}>EN COURS</span>
                  )}
                  {pending && (
                    <span style={{padding:'1px 6px',borderRadius:4,background:'#fff',
                      fontSize:8,fontWeight:700,letterSpacing:'.1em',color:MPAL.mute}}>EN ATTENTE</span>
                  )}
                </div>
                <div style={{fontSize:13,fontWeight:600,marginTop:2}}>{b.client}</div>
                <div style={{fontSize:11,opacity:0.8}}>{b.service} · {b.stylist}</div>
                {live && b.match && (
                  <div style={{marginTop:'auto',display:'flex',alignItems:'center',gap:6,fontSize:11}}>
                    <MIcon name="sparkle" size={12} color="#fff" fill="#fff" stroke={0}/>
                    {b.match}% match · {lang==='fr'?'essai Mèche prêt':'Mèche try-on ready'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <PTabBar active="agenda" lang={lang} badges={{inbox:4}} onChange={onTabChange}/>
    </div>
  );
}

// 10. BOOKING DETAIL ────────────────────────────────────────────────────────
function PScreenBookingDetail({ lang, accent }) {
  const b = PBOOKINGS[2]; // Camille, live
  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,display:'flex',flexDirection:'column'}}>
      <div style={{height:54}}/>
      <PTopBar title={lang==='fr'?'Rendez-vous':'Booking'} onBack={()=>{}}
        right={<button style={{width:36,height:36,borderRadius:18,border:'none',background:'rgba(0,0,0,0.05)',
          cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <MIcon name="mail" size={16}/></button>}/>

      <div style={{flex:1,overflowY:'auto',padding:'8px 18px 24px'}}>
        {/* time + status banner */}
        <div style={{padding:'14px 16px',borderRadius:16,background:PPAL.pro,color:'#fff',
          display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
          <div style={{textAlign:'center',padding:'4px 12px',background:'rgba(255,255,255,0.15)',
            border:'1px solid rgba(255,255,255,0.22)',borderRadius:10}}>
            <div className="mono" style={{fontSize:9,letterSpacing:'.1em',opacity:0.7}}>JEU 27</div>
            <div className="serif" style={{fontSize:22,letterSpacing:'-0.02em',lineHeight:1,marginTop:2}}>{b.time}</div>
          </div>
          <div style={{flex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{width:8,height:8,borderRadius:4,background:'#7BE0A8'}}/>
              <span className="mono" style={{fontSize:10,letterSpacing:'.14em',opacity:0.95,fontWeight:700}}>EN COURS · {b.dur}</span>
            </div>
            <div style={{fontSize:14,fontWeight:600,marginTop:4}}>{b.service}</div>
            <div style={{fontSize:11,opacity:0.75,marginTop:2}}>{lang==='fr'?'Avec':'With'} {b.stylist}</div>
          </div>
        </div>

        {/* client card */}
        <div style={{padding:'14px 16px',borderRadius:16,background:MPAL.paper,
          border:`1px solid ${MPAL.border}`,display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
          <div style={{width:54,height:54,borderRadius:27,overflow:'hidden'}}>
            <MPortrait hair="bob" mood="warm" tint={accent}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:600}}>{b.client}</div>
            <div style={{fontSize:11,color:MPAL.mute,marginTop:2}}>
              {lang==='fr'?'3e visite · cliente régulière':'3rd visit · regular'}
            </div>
            <div style={{display:'flex',gap:6,marginTop:6}}>
              <span style={{padding:'2px 6px',borderRadius:4,background:MPAL.subtle,fontSize:9,fontWeight:600,color:MPAL.mute,letterSpacing:'.04em'}}>
                {lang==='fr'?'CHEVEUX FINS':'FINE HAIR'}
              </span>
              <span style={{padding:'2px 6px',borderRadius:4,background:MPAL.subtle,fontSize:9,fontWeight:600,color:MPAL.mute,letterSpacing:'.04em'}}>
                ALLERGIE PPD
              </span>
            </div>
          </div>
          <button style={{width:36,height:36,borderRadius:18,border:`1px solid ${MPAL.border}`,
            background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <MIcon name="user" size={14}/></button>
        </div>

        {/* the look she booked */}
        <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600,marginBottom:10}}>
          {lang==='fr'?'LA COUPE BOOKÉE':'BOOKED LOOK'}
        </div>
        <div style={{display:'flex',gap:10,marginBottom:14}}>
          <div style={{flex:1,borderRadius:14,overflow:'hidden',aspectRatio:'1/1.3',position:'relative'}}>
            <MPortrait hair="medium" mood="warm" label="AVANT"/>
          </div>
          <div style={{flex:1,borderRadius:14,overflow:'hidden',aspectRatio:'1/1.3',position:'relative'}}>
            <MPortrait hair="bob" mood="warm" tint={accent} label="APRÈS"/>
            <div style={{position:'absolute',top:8,left:8,padding:'3px 8px',borderRadius:999,
              background:accent,fontSize:9,fontWeight:700,letterSpacing:'.1em',color:'#fff'}}>· {b.match}%</div>
          </div>
        </div>

        {/* notes coiffeur */}
        <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600,marginBottom:10}}>
          {lang==='fr'?'NOTES INÈS':'INÈS\' NOTES'}
        </div>
        <div style={{padding:'12px 14px',borderRadius:14,background:MPAL.paper,border:`1px solid ${MPAL.border}`,
          fontSize:12,lineHeight:1.5,color:MPAL.ink,marginBottom:14}}>
          {lang==='fr'
            ?'Dégradé doux. Garder 2cm sous épaules. Balayage caramel sur racines naturelles, pas de décoloration globale.'
            :'Soft layers. Keep 2cm below shoulders. Caramel balayage on natural roots, no full lift.'}
        </div>

        {/* CTAs */}
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <PPrimary label={lang==='fr'?'Ouvrir l’essai Mèche':'Open Mèche try-on'} icon="sparkle" color={accent}/>
          <button style={{padding:'12px',borderRadius:999,background:'transparent',
            border:`1px solid ${MPAL.border}`,color:MPAL.ink,fontSize:13,fontWeight:600,cursor:'pointer'}}>
            {lang==='fr'?'Reprogrammer':'Reschedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 11. PORTFOLIO ─────────────────────────────────────────────────────────────
function PScreenPortfolio({ lang, accent, onTabChange }) {
  const [view, setView] = pUS(0); // 0 grid, 1 stats
  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,display:'flex',flexDirection:'column',position:'relative'}}>
      <div style={{height:54}}/>
      <PTopBar title={lang==='fr'?'Mes réalisations':'My work'} big
        sub={lang==='fr'?'24 looks · ce que les clients verront':'24 looks · public-facing'}
        right={<button style={{width:36,height:36,borderRadius:18,border:'none',background:PPAL.pro,
          cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <MIcon name="plus" size={16} color="#fff"/></button>}/>

      <div style={{padding:'4px 18px 12px',display:'flex',gap:8}}>
        {[
          {l:lang==='fr'?'Galerie':'Gallery',i:'grid'},
          {l:lang==='fr'?'Performance':'Performance',i:'flame'},
        ].map((t,i)=>(
          <button key={i} onClick={()=>setView(i)} style={{
            padding:'8px 14px',borderRadius:999,fontSize:13,fontWeight:600,cursor:'pointer',
            background: view===i ? MPAL.ink : MPAL.paper, color: view===i ? '#fff' : MPAL.ink,
            border:`1px solid ${view===i ? MPAL.ink : MPAL.border}`,
            display:'flex',alignItems:'center',gap:6,
          }}>
            <MIcon name={t.i} size={12} color={view===i?'#fff':MPAL.ink}/>{t.l}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'0 16px 110px'}}>
        {view === 0 ? (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {PPORTFOLIO.map((p,i)=>(
              <div key={p.id} style={{
                borderRadius:18,overflow:'hidden',position:'relative',aspectRatio:'3/4',
                background:MPAL.paper,border:`1px solid ${MPAL.border}`,
                transform: i%2 ? 'translateY(14px)' : 'translateY(0)',
              }}>
                <MPortrait hair={p.hair} mood={p.mood} tint={i%3===0?accent:undefined}/>
                <div style={{position:'absolute',top:8,left:8,display:'flex',gap:4}}>
                  <span style={{padding:'3px 7px',borderRadius:999,background:'rgba(255,255,255,0.92)',
                    fontSize:9,fontWeight:700,letterSpacing:'.04em',color:PPAL.pro}}>· {p.booked} BOOK</span>
                </div>
                <div style={{position:'absolute',left:0,right:0,bottom:0,
                  background:'linear-gradient(to top, rgba(0,0,0,0.72), transparent)',
                  padding:'24px 10px 10px',color:'#fff'}}>
                  <div style={{fontSize:12,fontWeight:600,lineHeight:1.2}}>{p.name}</div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4,fontSize:10,opacity:0.85}}>
                    <span style={{display:'flex',alignItems:'center',gap:3}}>
                      <MIcon name="heart" size={10} color="#fff" fill="#fff" stroke={0}/>{p.loves}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {PPORTFOLIO.map((p,i)=>(
              <div key={p.id} style={{padding:12,borderRadius:14,background:MPAL.paper,
                border:`1px solid ${MPAL.border}`,display:'flex',gap:12,alignItems:'center'}}>
                <div style={{width:54,height:72,borderRadius:10,overflow:'hidden',flexShrink:0}}>
                  <MPortrait hair={p.hair} mood={p.mood} tint={i%3===0?accent:undefined}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600}}>{p.name}</div>
                  <div style={{display:'flex',gap:14,marginTop:6,fontSize:11,color:MPAL.mute}}>
                    <span style={{display:'flex',alignItems:'center',gap:3}}>
                      <MIcon name="heart" size={11} color={accent} fill={accent} stroke={0}/>{p.loves}
                    </span>
                    <span style={{display:'flex',alignItems:'center',gap:3}}>
                      <MIcon name="calendar" size={11} color={PPAL.pro}/>{p.booked} {lang==='fr'?'résa':'book'}
                    </span>
                    <span style={{display:'flex',alignItems:'center',gap:3}}>
                      <MIcon name="sparkle" size={11} color={MPAL.mute}/>{(i+3)*7} {lang==='fr'?'essais':'tries'}
                    </span>
                  </div>
                  <div style={{marginTop:8,height:4,borderRadius:2,background:MPAL.subtle,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${30+(i*13)%70}%`,background:PPAL.pro,borderRadius:2}}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <PTabBar active="salon" lang={lang} badges={{inbox:4}} onChange={onTabChange}/>
    </div>
  );
}

// 12. PUBLIC SALON PAGE (preview of what clients see) ───────────────────────
function PScreenSalonPublic({ lang, accent }) {
  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,display:'flex',flexDirection:'column'}}>
      {/* hero photo */}
      <div style={{position:'relative',height:240,overflow:'hidden'}}>
        <MPortrait hair="bob" mood="warm" tint={accent}/>
        <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, rgba(26,18,22,0.4) 0%, transparent 40%)'}}/>

        <div style={{position:'absolute',top:54,left:14,right:14,display:'flex',justifyContent:'space-between'}}>
          <button style={{width:38,height:38,borderRadius:19,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(20px)',
            border:'none',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            <MIcon name="chevronLeft" size={18} color="#fff"/></button>
          <div style={{padding:'7px 12px',borderRadius:999,background:'rgba(255,255,255,0.92)',
            fontSize:11,fontWeight:600,color:MPAL.ink,display:'flex',alignItems:'center',gap:6}}>
            <MIcon name="settings" size={12}/>{lang==='fr'?'Aperçu client':'Client preview'}
          </div>
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'0 0 24px',marginTop:-30,position:'relative',
        background:MPAL.bg,borderRadius:'24px 24px 0 0'}}>
        <div style={{padding:'22px 20px 6px'}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
            <div>
              <div className="serif" style={{fontSize:30,letterSpacing:'-0.02em',lineHeight:1.05}}>{PSALON.name}</div>
              <div style={{fontSize:12,color:MPAL.mute,marginTop:4}}>{PSALON.area} · {PSALON.price}</div>
            </div>
            <div style={{padding:'6px 10px',borderRadius:10,background:PPAL.pro,color:'#fff',
              display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:700,whiteSpace:'nowrap'}}>
              <MIcon name="flame" size={11} color="#fff" fill="#fff" stroke={0}/>
              {PSALON.match_default}%
            </div>
          </div>
          <div style={{display:'flex',gap:14,marginTop:10,fontSize:12,alignItems:'center'}}>
            <span style={{display:'flex',alignItems:'center',gap:4}}>
              <MIcon name="star" size={12} color={accent} fill={accent} stroke={0}/>
              <b>{PSTYLIST.rating}</b><span style={{color:MPAL.mute}}>({PSTYLIST.reviews})</span>
            </span>
            <span style={{color:MPAL.mute}}>·</span>
            <span style={{color:MPAL.ink,fontWeight:600,display:'flex',alignItems:'center',gap:4}}>
              <span style={{width:6,height:6,borderRadius:3,background:'#1F8A5B'}}/>
              {lang==='fr'?'Ouvert':'Open'}
            </span>
            <span style={{color:MPAL.mute}}>·</span>
            <span style={{color:MPAL.mute}}>0,4 km</span>
          </div>
        </div>

        {/* signature looks strip */}
        <div style={{padding:'14px 20px 0'}}>
          <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600,marginBottom:10}}>
            {lang==='fr'?'LOOKS SIGNATURE':'SIGNATURE LOOKS'}
          </div>
        </div>
        <div style={{padding:'0 20px',display:'flex',gap:8,overflowX:'auto',paddingBottom:8}}>
          {PPORTFOLIO.slice(0,5).map((p,i)=>(
            <div key={p.id} style={{minWidth:130,flexShrink:0,borderRadius:14,overflow:'hidden',position:'relative',
              aspectRatio:'3/4'}}>
              <MPortrait hair={p.hair} mood={p.mood} tint={i%3===0?accent:undefined}/>
              <div style={{position:'absolute',bottom:0,left:0,right:0,
                background:'linear-gradient(to top, rgba(0,0,0,0.75), transparent)',
                padding:'18px 8px 8px',color:'#fff'}}>
                <div style={{fontSize:10,fontWeight:600,lineHeight:1.2}}>{p.name}</div>
              </div>
            </div>
          ))}
        </div>

        {/* about */}
        <div style={{padding:'18px 20px'}}>
          <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600,marginBottom:8}}>
            {lang==='fr'?'À PROPOS':'ABOUT'}
          </div>
          <div style={{fontSize:13,lineHeight:1.55,color:MPAL.ink}}>
            {lang==='fr'
              ?'Salon de quartier, trois mains et beaucoup d\'écoute. Spécialiste balayage doux et coupes ondulées.'
              :'Neighborhood salon, three hands and a lot of listening. Soft balayage and wavy cuts.'}
          </div>
        </div>

        {/* team */}
        <div style={{padding:'4px 20px'}}>
          <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600,marginBottom:10}}>
            {lang==='fr'?'L\'ÉQUIPE':'THE TEAM'}
          </div>
          <div style={{display:'flex',gap:10}}>
            {[
              {n:'Inès', r:lang==='fr'?'Fondatrice':'Founder', m:'warm', h:'medium'},
              {n:'Yann', r:lang==='fr'?'Coupe homme':'Men\'s cut', m:'cool', h:'short'},
              {n:'Sofia',r:lang==='fr'?'Coloriste':'Colorist',  m:'blush', h:'long'},
            ].map((t,i)=>(
              <div key={i} style={{flex:1,padding:'10px',borderRadius:14,background:MPAL.paper,
                border:`1px solid ${MPAL.border}`,textAlign:'center'}}>
                <div style={{width:54,height:54,borderRadius:27,overflow:'hidden',margin:'0 auto 8px'}}>
                  <MPortrait hair={t.h} mood={t.m} tint={i===0?accent:undefined}/>
                </div>
                <div style={{fontSize:12,fontWeight:600}}>{t.n}</div>
                <div style={{fontSize:10,color:MPAL.mute,marginTop:2}}>{t.r}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{padding:'18px 20px 0'}}>
          <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600,marginBottom:10}}>
            {lang==='fr'?'INFOS':'INFO'}
          </div>
          {[
            {l:lang==='fr'?'Adresse':'Address', v:PSALON.address, i:'pin'},
            {l:lang==='fr'?'Horaires':'Hours',  v:PSALON.hours,   i:'calendar'},
          ].map((r,i)=>(
            <div key={i} style={{padding:'12px 0',borderTop:i?`1px solid ${MPAL.border}`:'none',
              display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:34,height:34,borderRadius:17,background:MPAL.subtle,
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                <MIcon name={r.i} size={14}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:MPAL.mute,letterSpacing:'.08em',fontWeight:600,textTransform:'uppercase'}}>{r.l}</div>
                <div style={{fontSize:13,marginTop:1}}>{r.v}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{padding:'12px 18px 26px',borderTop:`1px solid ${MPAL.border}`,background:MPAL.bg,
        display:'flex',gap:8}}>
        <button style={{padding:'14px',borderRadius:999,background:'transparent',
          border:`1px solid ${MPAL.border}`,color:MPAL.ink,fontSize:13,fontWeight:600,cursor:'pointer'}}>
          {lang==='fr'?'Envoyer une demande':'Send request'}
        </button>
        <button style={{flex:1,padding:'14px',borderRadius:999,background:PPAL.pro,color:'#fff',
          border:'none',fontSize:14,fontWeight:600,cursor:'pointer'}}>
          {lang==='fr'?'Réserver chez Inès':'Book with Inès'}
        </button>
      </div>
    </div>
  );
}

// 13. STATS / SALON HOME ────────────────────────────────────────────────────
function PScreenStats({ lang, accent, onTabChange }) {
  const aDark = pOnDark(accent);
  return (
    <div style={{height:'100%',background:MPAL.bg,color:MPAL.ink,display:'flex',flexDirection:'column',position:'relative'}}>
      <div style={{height:54}}/>
      <PTopBar title={lang==='fr'?'Le salon':'The salon'} big sub={PSALON.name + ' · ' + PSALON.area}
        right={<button style={{width:36,height:36,borderRadius:18,border:'none',background:'rgba(0,0,0,0.05)',
          cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <MIcon name="settings" size={16}/></button>}/>

      <div style={{flex:1,overflowY:'auto',padding:'4px 18px 110px'}}>
        {/* identity */}
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14,
          padding:'12px',background:MPAL.paper,border:`1px solid ${MPAL.border}`,borderRadius:14}}>
          <div style={{width:54,height:54,borderRadius:12,background:MPAL.subtle,
            display:'flex',alignItems:'center',justifyContent:'center',
            fontFamily:"'Instrument Serif',serif",fontSize:24,color:MPAL.ink,fontStyle:'italic'}}>
            {PSALON.name[0]}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600}}>{PSTYLIST.name}</div>
            <div style={{fontSize:11,color:MPAL.mute,marginTop:1}}>{PSTYLIST.role}</div>
          </div>
          <div className="mono" style={{padding:'4px 8px',borderRadius:6,background:PPAL.pro,color:'#fff',
            fontSize:9,fontWeight:700,letterSpacing:'.12em'}}>{PSTYLIST.plan.toUpperCase()}</div>
        </div>

        {/* navigation vers les 2 sous-pages du Salon */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
          {[
            {ic:'grid', l:lang==='fr'?'Mes réalisations':'My work',
              sub:lang==='fr'?'24 looks · portfolio':'24 looks · portfolio'},
            {ic:'pin',  l:lang==='fr'?'Aperçu public':'Public preview',
              sub:lang==='fr'?'Ce que voient les clientes':'What clients see'},
          ].map((c,i)=>(
            <button key={i} style={{textAlign:'left',padding:'14px',borderRadius:14,cursor:'pointer',
              background:MPAL.paper,border:`1px solid ${MPAL.border}`,
              display:'flex',flexDirection:'column',gap:10}}>
              <span style={{width:38,height:38,borderRadius:19,background:MPAL.subtle,
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                <MIcon name={c.ic} size={17} color={MPAL.ink}/>
              </span>
              <span>
                <span style={{display:'flex',alignItems:'center',gap:5}}>
                  <span style={{fontSize:13,fontWeight:600,color:MPAL.ink}}>{c.l}</span>
                  <MIcon name="arrowRight" size={12} color={MPAL.mute}/>
                </span>
                <span style={{display:'block',fontSize:10.5,color:MPAL.mute,marginTop:2}}>{c.sub}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Pro subscription strip */}
        <div style={{padding:'14px 16px',borderRadius:16,background:MPAL.ink,color:'#fff',
          position:'relative',overflow:'hidden',marginBottom:18}}>
          <div style={{position:'absolute',top:-40,right:-40,width:160,height:160,borderRadius:80,
            background:`radial-gradient(circle, ${PPAL.pro}aa, transparent 70%)`}}/>
          <div style={{position:'relative',display:'flex',alignItems:'center',gap:12}}>
            <MIcon name="crown" size={20} color={aDark} fill={aDark} stroke={0}/>
            <div style={{flex:1}}>
              <div className="mono" style={{fontSize:9,letterSpacing:'.16em',color:aDark,fontWeight:700}}>
                · {lang==='fr'?'ABONNEMENT PRO · SALON':'PRO SUBSCRIPTION · SALON'}
              </div>
              <div style={{fontSize:13,marginTop:3,opacity:0.85}}>
                {lang==='fr'?'89 €/mois · renouvelle le 12 juin':'€89/mo · renews June 12'}
              </div>
            </div>
            <button style={{padding:'8px 12px',borderRadius:999,background:'rgba(255,255,255,0.12)',
              border:'1px solid rgba(255,255,255,0.18)',color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer'}}>
              {lang==='fr'?'Gérer':'Manage'}
            </button>
          </div>
        </div>

        {/* this week stats */}
        <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600,marginBottom:10}}>
          {lang==='fr'?'CETTE SEMAINE':'THIS WEEK'}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
          {[
            {l:lang==='fr'?'Revenus':'Revenue',     v:PSTATS.revenuesWeek,d:PSTATS.revenuesDelta},
            {l:lang==='fr'?'Rendez-vous':'Bookings',v:PSTATS.bookingsWeek,d:PSTATS.bookingsDelta},
            {l:lang==='fr'?'Demandes':'Requests',   v:PSTATS.inboundWeek, d:PSTATS.inboundDelta, hi:true},
            {l:lang==='fr'?'Conversion':'Conversion',v:PSTATS.conversion, d:'+4 pts'},
          ].map((k,i)=>(
            <div key={i} style={{padding:'14px 14px',borderRadius:14,
              background: k.hi ? PPAL.proSoft : MPAL.paper,
              border:`1px solid ${k.hi ? PPAL.pro+'40' : MPAL.border}`}}>
              <div className="mono" style={{fontSize:9,letterSpacing:'.12em',color:MPAL.mute,fontWeight:600}}>{k.l}</div>
              <div style={{display:'flex',alignItems:'baseline',gap:8,marginTop:4}}>
                <div className="serif" style={{fontSize:24,letterSpacing:'-0.02em',lineHeight:1}}>{k.v}</div>
                <div className="mono" style={{fontSize:11,color:k.hi?PPAL.pro:'#1F8A5B',fontWeight:700}}>{k.d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Studio Mèche usage */}
        <div style={{marginTop:8,padding:'16px',borderRadius:16,
          background:'#1A1714',color:'#fff',position:'relative',overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between'}}>
            <div>
              <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:aDark,fontWeight:700}}>
                · STUDIO MÈCHE EN SALON
              </div>
              <div style={{display:'flex',alignItems:'baseline',gap:8,marginTop:8}}>
                <div className="serif" style={{fontSize:38,letterSpacing:'-0.02em',lineHeight:1}}>{PSTATS.studioTries}</div>
                <div style={{fontSize:12,opacity:0.7}}>{lang==='fr'?'essais ce mois':'tries this month'}</div>
              </div>
            </div>
            <div style={{padding:'4px 8px',borderRadius:6,background:'rgba(255,255,255,0.12)',
              fontSize:10,fontWeight:600,letterSpacing:'.06em'}}>
              ∞ {lang==='fr'?'INCLUS':'INCLUDED'}
            </div>
          </div>
          {/* mini bar chart */}
          <div style={{display:'flex',alignItems:'flex-end',gap:5,marginTop:14,height:42}}>
            {[24,30,18,42,38,55,48,38].map((v,i)=>(
              <div key={i} style={{flex:1,height:`${v}%`,
                background: i===5 ? aDark : 'rgba(255,255,255,0.22)',
                borderRadius:3}}/>
            ))}
          </div>
          <div className="mono" style={{fontSize:9,letterSpacing:'.1em',opacity:0.55,marginTop:6}}>
            {lang==='fr'?'8 DERNIÈRES SEMAINES':'LAST 8 WEEKS'}
          </div>
        </div>

        {/* top look */}
        <div style={{marginTop:14,padding:'14px 16px',borderRadius:14,background:MPAL.paper,
          border:`1px solid ${MPAL.border}`,display:'flex',gap:12,alignItems:'center'}}>
          <div style={{width:48,height:64,borderRadius:10,overflow:'hidden'}}>
            <MPortrait hair="bob" mood="warm" tint={accent}/>
          </div>
          <div style={{flex:1}}>
            <div className="mono" style={{fontSize:9,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600}}>
              {lang==='fr'?'LOOK QUI CARTONNE':'TOP LOOK'}
            </div>
            <div style={{fontSize:14,fontWeight:600,marginTop:3}}>{PSTATS.topLook}</div>
            <div style={{fontSize:11,color:MPAL.mute,marginTop:2}}>
              {lang==='fr'?'18 réservations · 7,2k essais':'18 bookings · 7.2k tries'}
            </div>
          </div>
          <MIcon name="chevronRight" size={16} color={MPAL.mute}/>
        </div>

        {/* settings */}
        <div style={{marginTop:18,borderRadius:16,background:MPAL.paper,border:`1px solid ${MPAL.border}`}}>
          {[
            {ic:'calendar',l:lang==='fr'?'Horaires & congés':'Hours & time off',sub:'Mar–Sam · 10h–19h'},
            {ic:'crown',   l:lang==='fr'?'Plan & facturation':'Plan & billing',sub:'Mèche Pro · Salon'},
            {ic:'settings',l:lang==='fr'?'Préférences':'Preferences',sub:lang==='fr'?'Langue, notifs':'Language, notifs'},
          ].map((r,i,arr)=>(
            <div key={i} style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:14,
              borderTop:i?`1px solid ${MPAL.border}`:'none',cursor:'pointer'}}>
              <div style={{width:36,height:36,borderRadius:18,background:MPAL.subtle,
                display:'flex',alignItems:'center',justifyContent:'center'}}>
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
      <PTabBar active="salon" lang={lang} badges={{inbox:4}} onChange={onTabChange}/>
    </div>
  );
}

Object.assign(window, {
  PScreenReply, PScreenAgenda, PScreenBookingDetail,
  PScreenPortfolio, PScreenSalonPublic, PScreenStats,
});
