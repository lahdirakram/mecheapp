// meche-auth.jsx — Auth (login/signup/email confirm) + Recharge crédits
// Globals: MScreenAuthChoice, MScreenSignupEmail, MScreenEmailConfirm,
//          MScreenRecharge, MScreenOutOfCredits

const { useState: aUS } = React;

// ─── Auth choice ────────────────────────────────────────────────────────────
function MScreenAuthChoice({ lang, accent }) {
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:MPAL.bg,color:MPAL.ink,position:'relative'}}>
      {/* soft hero, three small portrait coins */}
      <div style={{height:60}}/>
      <div style={{padding:'0 26px'}}>
        <button style={{
          width:36,height:36,borderRadius:18,border:'none',
          background:'rgba(0,0,0,0.05)',color:MPAL.ink,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',
        }}><MIcon name="chevronLeft" size={18}/></button>
      </div>

      <div style={{flex:1,padding:'26px 26px 0',display:'flex',flexDirection:'column'}}>
        {/* coin trio */}
        <div style={{display:'flex',gap:-12,marginBottom:24,height:84,alignItems:'center'}}>
          {[
            {hair:'bob',   mood:'warm',  z:3, dx:0,   tint:accent},
            {hair:'curly', mood:'blush', z:2, dx:-18, tint:undefined},
            {hair:'pixie', mood:'night', z:1, dx:-36, tint:accent},
          ].map((c,i)=>(
            <div key={i} style={{
              width:72,height:72,borderRadius:36,overflow:'hidden',
              border:`3px solid ${MPAL.bg}`,marginLeft:c.dx,zIndex:c.z,
              boxShadow:'0 4px 14px rgba(0,0,0,0.08)',
            }}>
              <MPortrait hair={c.hair} mood={c.mood} tint={c.tint}/>
            </div>
          ))}
          <div style={{marginLeft:6,fontSize:12,color:MPAL.mute,maxWidth:120,lineHeight:1.35}}>
            {lang==='fr'?'12 482 mèches gardées cette semaine':'12,482 looks saved this week'}
          </div>
        </div>

        <MWordmark size={22} color={MPAL.ink} accent={MPAL.sable}/>
        <div className="serif" style={{fontSize:42,letterSpacing:'-0.035em',lineHeight:1.0,marginTop:14}}>
          {lang==='fr' ? (<>Crée ton<br/><span style={{fontStyle:'italic',color:accent}}>compte</span>.</>) : (<>Create your<br/><span style={{fontStyle:'italic',color:accent}}>account</span>.</>)}
        </div>
        <div style={{fontSize:14,color:MPAL.mute,lineHeight:1.45,marginTop:10,maxWidth:320}}>
          {mt(lang,'auth_sub')}
        </div>

        {/* buttons */}
        <div style={{marginTop:28,display:'flex',flexDirection:'column',gap:10}}>
          <button style={{
            width:'100%',padding:'15px 18px',borderRadius:999,
            background:MPAL.ink,color:'#fff',border:'none',cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:10,
            fontSize:15,fontWeight:600,
          }}>
            <MIcon name="apple" size={18} color="#fff" stroke={0} fill="#fff"/>
            {mt(lang,'auth_apple')}
          </button>

          <button style={{
            width:'100%',padding:'15px 18px',borderRadius:999,
            background:MPAL.paper,color:MPAL.ink,border:`1px solid ${MPAL.border}`,
            cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,
            fontSize:15,fontWeight:600,
          }}>
            <MIcon name="google" size={18}/>
            {mt(lang,'auth_google')}
          </button>

          <div style={{display:'flex',alignItems:'center',gap:10,padding:'4px 0',color:MPAL.mute}}>
            <div style={{flex:1,height:1,background:MPAL.border}}/>
            <div className="mono" style={{fontSize:10,letterSpacing:'.18em'}}>{mt(lang,'auth_or').toUpperCase()}</div>
            <div style={{flex:1,height:1,background:MPAL.border}}/>
          </div>

          <button style={{
            width:'100%',padding:'15px 18px',borderRadius:999,
            background:'transparent',color:MPAL.ink,border:`1px solid ${MPAL.border}`,
            cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,
            fontSize:15,fontWeight:600,
          }}>
            <MIcon name="mail" size={18}/>
            {mt(lang,'auth_email')}
          </button>
        </div>

        {/* footer */}
        <div style={{marginTop:'auto',padding:'22px 0 28px',textAlign:'center'}}>
          <div style={{fontSize:11,color:MPAL.mute,lineHeight:1.5,maxWidth:300,margin:'0 auto'}}>
            {mt(lang,'auth_terms')}
          </div>
          <div style={{fontSize:13,marginTop:14,color:MPAL.ink}}>
            <span style={{color:MPAL.mute}}>{mt(lang,'auth_have_account')} </span>
            <span style={{color:accent,fontWeight:600,textDecoration:'underline',textUnderlineOffset:3}}>
              {mt(lang,'auth_signin')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Signup with email (form) ──────────────────────────────────────────────
function MScreenSignupEmail({ lang, accent }) {
  const [email, setEmail] = aUS('camille.r@gmail.com');
  const [pwd, setPwd] = aUS('');
  const [show, setShow] = aUS(false);
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:MPAL.bg,color:MPAL.ink}}>
      <div style={{height:60}}/>
      <TopBar title="" onBack={()=>{}} />
      <div style={{padding:'0 26px',flex:1,display:'flex',flexDirection:'column'}}>
        <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:accent,fontWeight:600}}>
          ÉTAPE 1 · COMPTE
        </div>
        <div className="serif" style={{fontSize:36,letterSpacing:'-0.03em',lineHeight:1.05,marginTop:8}}>
          {lang==='fr' ? (<>Ton <span style={{fontStyle:'italic',color:accent}}>email</span> et un mot de passe.</>) : (<>Your <span style={{fontStyle:'italic',color:accent}}>email</span> and a password.</>)}
        </div>

        <div style={{marginTop:24,display:'flex',flexDirection:'column',gap:14}}>
          <Field label={mt(lang,'email_label')} icon="mail">
            <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)}
              placeholder={mt(lang,'email_ph')}
              style={inputStyle}/>
          </Field>

          <Field label={mt(lang,'pwd_label')} icon="lock"
            trailing={
              <button onClick={()=>setShow(s=>!s)} style={{
                background:'transparent',border:'none',cursor:'pointer',
                fontSize:11,color:MPAL.mute,fontWeight:600,letterSpacing:'.04em',
              }}>{show?(lang==='fr'?'CACHER':'HIDE'):(lang==='fr'?'VOIR':'SHOW')}</button>
            }>
            <input type={show?'text':'password'} value={pwd} onChange={(e)=>setPwd(e.target.value)}
              placeholder={mt(lang,'pwd_ph')} style={inputStyle}/>
          </Field>

          {/* mini password strength */}
          <div style={{display:'flex',gap:4,marginTop:-4}}>
            {[0,1,2,3].map(i=>(
              <div key={i} style={{
                flex:1,height:4,borderRadius:4,
                background: i < Math.min(4, Math.floor(pwd.length/2)) ? accent : MPAL.border,
              }}/>
            ))}
          </div>
          <div style={{fontSize:11,color:MPAL.mute,marginTop:-4}}>
            {lang==='fr'?'8 caractères, 1 chiffre. Tu choisis.':'8 characters, 1 number. Your call.'}
          </div>
        </div>

        <div style={{marginTop:'auto',padding:'20px 0 28px',display:'flex',flexDirection:'column',gap:10}}>
          <button style={{
            width:'100%',padding:'15px 22px',borderRadius:999,
            background:accent,color:'#fff',border:'none',cursor:'pointer',
            fontSize:15,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:8,
          }}>
            {mt(lang,'create_account')} <MIcon name="arrowRight" size={15} color="#fff"/>
          </button>
          <div style={{fontSize:11,color:MPAL.mute,textAlign:'center',lineHeight:1.5,maxWidth:300,margin:'0 auto'}}>
            {mt(lang,'auth_terms')}
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  flex:1,border:'none',background:'transparent',outline:'none',
  fontSize:15,color:MPAL.ink,fontFamily:"'Geist',sans-serif",padding:'4px 0',
};

function Field({ label, icon, trailing, children }) {
  return (
    <div>
      <div style={{fontSize:11,letterSpacing:'.12em',textTransform:'uppercase',color:MPAL.mute,
        fontWeight:600,marginBottom:6}}>{label}</div>
      <div style={{
        display:'flex',alignItems:'center',gap:10,
        padding:'12px 14px',borderRadius:14,background:MPAL.paper,
        border:`1px solid ${MPAL.border}`,
      }}>
        <MIcon name={icon} size={17} color={MPAL.mute}/>
        {children}
        {trailing}
      </div>
    </div>
  );
}

// ─── Email confirmation screen ──────────────────────────────────────────────
function MScreenEmailConfirm({ lang, accent }) {
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:MPAL.bg,color:MPAL.ink}}>
      <div style={{height:60}}/>
      <TopBar title="" onBack={()=>{}} />

      <div style={{padding:'0 26px',flex:1,display:'flex',flexDirection:'column'}}>
        <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:accent,fontWeight:600}}>
          ÉTAPE 2 · VÉRIFICATION
        </div>

        {/* envelope illustration */}
        <div style={{marginTop:24,display:'flex',alignItems:'center',justifyContent:'center',
          height:180,position:'relative'}}>
          <div style={{
            width:180,height:130,borderRadius:14,background:MPAL.paper,
            border:`1px solid ${MPAL.border}`,position:'relative',
            boxShadow:'0 14px 40px rgba(60,40,30,0.10)',transform:'rotate(-3deg)',
          }}>
            {/* envelope fold */}
            <svg width="100%" height="100%" viewBox="0 0 180 130" style={{position:'absolute',inset:0}}>
              <path d="M2 8 L90 70 L178 8" fill="none" stroke={MPAL.border} strokeWidth="1.5"/>
              <path d="M2 122 L72 70 M178 122 L108 70" fill="none" stroke={MPAL.border} strokeWidth="1.5"/>
            </svg>
            {/* stamp */}
            <div style={{position:'absolute',top:10,right:10,width:32,height:38,
              background:accent,borderRadius:3,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <MWordmark size={12} color="#fff" accent="#fff"/>
            </div>
            {/* paper hint of link */}
            <div style={{position:'absolute',left:18,bottom:14,right:18,
              display:'flex',flexDirection:'column',gap:5}}>
              <div style={{height:5,background:MPAL.border,borderRadius:3,width:'70%'}}/>
              <div style={{height:5,background:accent,borderRadius:3,width:'45%'}}/>
            </div>
          </div>
          {/* sparkle */}
          <div style={{position:'absolute',top:14,left:'52%',color:accent}}>
            <MIcon name="sparkle" size={22} color={accent}/>
          </div>
        </div>

        <div className="serif" style={{fontSize:36,letterSpacing:'-0.03em',lineHeight:1.05,marginTop:18,textAlign:'center'}}>
          {mt(lang,'confirm_title')}
        </div>
        <div style={{fontSize:14,color:MPAL.mute,lineHeight:1.5,marginTop:10,textAlign:'center'}}>
          {mt(lang,'confirm_sub')}<br/>
          <span style={{color:MPAL.ink,fontWeight:600}}>{MUSER.email}</span>
        </div>

        <div style={{marginTop:22,padding:'12px 14px',borderRadius:12,background:MPAL.soft,
          display:'flex',alignItems:'center',gap:10}}>
          <MIcon name="mail" size={16} color={MPAL.ink}/>
          <div style={{fontSize:12,color:MPAL.ink2,lineHeight:1.45}}>
            {mt(lang,'confirm_help')}
          </div>
        </div>

        <div style={{marginTop:'auto',padding:'22px 0 28px',display:'flex',flexDirection:'column',gap:10}}>
          <button style={{
            width:'100%',padding:'15px 22px',borderRadius:999,
            background:accent,color:'#fff',border:'none',cursor:'pointer',
            fontSize:15,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:8,
          }}>
            <MIcon name="check" size={15} color="#fff"/> {mt(lang,'confirm_action')}
          </button>
          <div style={{display:'flex',gap:10}}>
            <button style={{
              flex:1,padding:'13px 14px',borderRadius:999,background:'transparent',
              border:`1px solid ${MPAL.border}`,color:MPAL.ink,cursor:'pointer',
              fontSize:13,fontWeight:600,
            }}>{mt(lang,'confirm_resend')}</button>
            <button style={{
              flex:1,padding:'13px 14px',borderRadius:999,background:'transparent',
              border:`1px solid ${MPAL.border}`,color:MPAL.ink,cursor:'pointer',
              fontSize:13,fontWeight:600,
            }}>{mt(lang,'confirm_change')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Recharge crédits (3 packs) ─────────────────────────────────────────────
function MScreenRecharge({ lang, accent, lowBalance = false }) {
  const [sel, setSel] = aUS('star');
  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',background:MPAL.bg,color:MPAL.ink,overflow:'hidden'}}>
      <div style={{height:54}}/>
      <TopBar title="" onBack={()=>{}}
        right={
          <button style={{
            width:36,height:36,borderRadius:18,border:'none',
            background:'rgba(0,0,0,0.05)',color:MPAL.ink,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',
          }}><MIcon name="x" size={18}/></button>
        }/>

      <div style={{flex:1,overflowY:'auto',padding:'0 22px 18px'}}>
        {lowBalance && (
          <div style={{
            padding:'10px 14px',borderRadius:12,background:MPAL.ink,color:'#fff',
            display:'flex',alignItems:'center',gap:10,marginBottom:18,
          }}>
            <div style={{width:30,height:30,borderRadius:15,background:`${accent}33`,
              display:'flex',alignItems:'center',justifyContent:'center',color:accent}}>
              <MIcon name="zap" size={15} color={accent} fill={accent} stroke={0}/>
            </div>
            <div style={{flex:1,fontSize:12,lineHeight:1.4}}>
              <b>{mt(lang,'no_credits_title')}.</b> {mt(lang,'no_credits_sub')}
            </div>
          </div>
        )}

        <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:accent,fontWeight:600}}>
          ✦ {lang==='fr'?'CRÉDITS IA':'AI CREDITS'}
        </div>
        <div className="serif" style={{fontSize:34,letterSpacing:'-0.03em',lineHeight:1.05,marginTop:6}}>
          {mt(lang,'recharge_title')}
        </div>
        <div style={{fontSize:13,color:MPAL.mute,lineHeight:1.5,marginTop:8,maxWidth:320}}>
          {mt(lang,'recharge_sub')}
        </div>

        {/* current balance */}
        <div style={{
          marginTop:16,padding:'12px 14px',borderRadius:12,background:MPAL.paper,
          border:`1px solid ${MPAL.border}`,
          display:'flex',alignItems:'center',gap:10,
        }}>
          <div style={{width:34,height:34,borderRadius:17,background:MPAL.subtle,
            display:'flex',alignItems:'center',justifyContent:'center',color:accent}}>
            <MIcon name="coin" size={17} color={accent}/>
          </div>
          <div style={{flex:1}}>
            <div className="mono" style={{fontSize:9,letterSpacing:'.14em',color:MPAL.mute,fontWeight:600}}>
              {lang==='fr'?'SOLDE ACTUEL':'CURRENT BALANCE'}
            </div>
            <div style={{fontSize:14,fontWeight:600,marginTop:2}}>
              {lowBalance ? 0 : MUSER.credits} <span style={{color:MPAL.mute,fontWeight:400}}>· {mt(lang,'credits')}</span>
            </div>
          </div>
        </div>

        {/* packs */}
        <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:18}}>
          {MPACKS.map(p => {
            const on = sel === p.id;
            const popular = p.badge === 'popular';
            const best = p.badge === 'best';
            return (
              <button key={p.id} onClick={()=>setSel(p.id)} style={{
                textAlign:'left',padding:'16px 16px',borderRadius:18,cursor:'pointer',
                background: on ? MPAL.ink : MPAL.paper,
                color: on ? MPAL.inkInv : MPAL.ink,
                border: on ? `1px solid ${MPAL.ink}` : `1px solid ${popular ? accent : MPAL.border}`,
                position:'relative',
                boxShadow: popular && !on ? `0 0 0 2px ${accent}33` : 'none',
              }}>
                {(popular || best) && (
                  <div className="mono" style={{
                    position:'absolute',top:-9,left:14,padding:'3px 10px',borderRadius:999,
                    background: popular ? accent : MPAL.ink,
                    color:'#fff',fontSize:9,letterSpacing:'.14em',fontWeight:700,
                  }}>
                    {popular ? mt(lang,'most_popular').toUpperCase() : mt(lang,'best_value').toUpperCase()}
                  </div>
                )}
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <div style={{
                    width:24,height:24,borderRadius:12,
                    border:`2px solid ${on?'#fff':MPAL.border}`,
                    background: on ? accent : 'transparent',
                    display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
                  }}>
                    {on && <MIcon name="check" size={12} color="#fff"/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'baseline',gap:8,flexWrap:'wrap'}}>
                      <div className="serif" style={{fontSize:22,letterSpacing:'-0.01em',lineHeight:1.1}}>
                        {p.credits} <span style={{fontSize:14, opacity:0.6,fontStyle:'italic'}}>{mt(lang,'credits')}</span>
                      </div>
                    </div>
                    <div style={{fontSize:11,opacity:on?0.7:0.65,marginTop:3}}>
                      {mt(lang, p.id==='taste'?'pack_taste_sub':p.id==='star'?'pack_star_sub':'pack_pro_sub')}
                      <span style={{opacity:0.7}}> · {p.unit} {mt(lang,'per_credit')}</span>
                    </div>
                  </div>
                  <div className="serif" style={{fontSize:22,letterSpacing:'-0.01em',whiteSpace:'nowrap'}}>
                    {p.price}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* trust row */}
        <div style={{display:'flex',gap:14,flexWrap:'wrap',marginTop:18,fontSize:11,color:MPAL.mute}}>
          {[
            lang==='fr'?'Paiement unique':'One-time payment',
            lang==='fr'?'Crédits sans expiration':'Credits never expire',
            lang==='fr'?'Sans abonnement':'No subscription',
          ].map((t,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
              <MIcon name="check" size={12} color={accent}/>
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{padding:'12px 22px 30px',background:`linear-gradient(to top, ${MPAL.bg} 80%, ${MPAL.bg}00)`,
        display:'flex',flexDirection:'column',gap:10}}>
        <button style={{
          width:'100%',padding:'15px 22px',borderRadius:999,background:MPAL.ink,color:'#fff',
          border:'none',cursor:'pointer',fontSize:15,fontWeight:600,
          display:'flex',alignItems:'center',justifyContent:'center',gap:10,
        }}>
          <MIcon name="apple" size={17} color="#fff" stroke={0} fill="#fff"/>
          {mt(lang,'pay_apple')}
        </button>
        <button style={{
          width:'100%',padding:'13px 22px',borderRadius:999,background:'transparent',
          border:`1px solid ${MPAL.border}`,color:MPAL.ink,cursor:'pointer',
          fontSize:14,fontWeight:600,
        }}>
          {mt(lang,'pay_card')}
        </button>
      </div>
    </div>
  );
}

// Variant: same screen pre-filled in "out of credits" state (after first try)
function MScreenOutOfCredits({ lang, accent }) {
  return <MScreenRecharge lang={lang} accent={accent} lowBalance={true}/>;
}

Object.assign(window, {
  MScreenAuthChoice, MScreenSignupEmail, MScreenEmailConfirm,
  MScreenRecharge, MScreenOutOfCredits,
});
