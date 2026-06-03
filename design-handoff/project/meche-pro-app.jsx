// meche-pro-app.jsx — Mèche Pro canvas

const P_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#15110E",
  "language": "fr",
  "showFrame": true
}/*EDITMODE-END*/;

function MecheProApp() {
  const [tw, setTw] = useTweaks(P_TWEAK_DEFAULTS);
  const accent = tw.accent;
  const lang = tw.language;

  const screens = [
    { id:'p01-welcome',   label:'01 · Welcome Pro',          Cmp: PScreenWelcome,        dark:false },
    { id:'p02-signup',    label:'02 · Crée ton salon',       Cmp: PScreenSignup,         dark:false },
    { id:'p03-setup',     label:'03 · Photos & services',    Cmp: PScreenSetup,          dark:false },
    { id:'p04-paywall',   label:'04 · Abonnement Pro',       Cmp: PScreenPaywall,        dark:true  },
    { id:'p05-today',     label:'05 · Aujourd\'hui',         Cmp: PScreenToday,          dark:false },
    { id:'p06-inbox',     label:'06 · Demandes (inbox)',     Cmp: PScreenInbox,          dark:false },
    { id:'p07-demande',   label:'07 · Demande · détail',     Cmp: PScreenDemandeDetail,  dark:false },
    { id:'p08-reply',     label:'08 · Réponse au client',    Cmp: PScreenReply,          dark:false },
    { id:'p09-essai',     label:'09 · Essai Mèche · flow guidé', Cmp: PScreenEssai,    dark:false },
    { id:'p10-agenda',    label:'10 · Agenda du jour',       Cmp: PScreenAgenda,         dark:false },
    { id:'p11-booking',   label:'11 · Réservation · détail', Cmp: PScreenBookingDetail,  dark:false },
    { id:'p12-salon',     label:'12 · Salon · accueil (onglet Salon)', Cmp: PScreenStats,   dark:false },
    { id:'p13-portfolio', label:'13 · Salon › Mes réalisations',  Cmp: PScreenPortfolio,  dark:false },
    { id:'p14-public',    label:'14 · Salon › Page publique (aperçu client)', Cmp: PScreenSalonPublic, dark:false },
  ];

  const W = 402, H = 874;
  const frameW = tw.showFrame ? W + 24 : W;
  const frameH = tw.showFrame ? H + 24 : H;

  const renderScreen = (s) => {
    const inner = <s.Cmp lang={lang} accent={accent}/>;
    if (!tw.showFrame) {
      return (
        <div style={{width:W,height:H,overflow:'hidden',borderRadius:32,
          background:s.dark?'#000':MPAL.bg,position:'relative'}}>
          {inner}
        </div>
      );
    }
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}>
        <IOSDevice width={W} height={H} dark={s.dark}>{inner}</IOSDevice>
      </div>
    );
  };

  return (
    <>
      <DesignCanvas>
        <DCSection id="brand" title="Mèche Pro — pour les coiffeurs"
          subtitle="iPhone vertical · l'app que les coiffeurs ouvrent entre deux mèches. Reçoivent les demandes, valident, montrent dans le miroir, coupent.">
          <DCArtboard id="overview-pro" label="Note de design — Pro" width={460} height={frameH}
            style={{background:'#FAF7F1'}}>
            <div style={{padding:'40px 36px',height:'100%',fontFamily:"'Geist',sans-serif",color:MPAL.ink,
              display:'flex',flexDirection:'column',gap:14,overflow:'hidden'}}>
              <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute}}>
                NOTE DE DESIGN · PRO · v1
              </div>
              <div style={{marginTop:4}}>
                <PWordmark size={56} color={MPAL.ink} accent={MPAL.sable}/>
              </div>
              <div className="serif" style={{fontSize:28,lineHeight:1.05,letterSpacing:'-0.02em',marginTop:6}}>
                Du <span style={{fontStyle:'italic',color:PPAL.pro}}>brief</span><br/>
                au fauteuil, sans friction.
              </div>
              <div style={{fontSize:13,lineHeight:1.55,color:'#3d342b',marginTop:6}}>
                Les clientes arrivent déjà avec leur idée — souvent générée par Mèche. Le coiffeur la reçoit en photo, valide, propose un créneau, puis montre dans le miroir avant la coupe. Tout est dans l'inbox.
              </div>
              <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:12}}>
                {[
                  ['Boucle','Demande (photo IA) → réponse → créneau → essai Mèche au fauteuil → coupe → portfolio.'],
                  ['Inbox','Cœur de l\'app : photos générées par les clientes, score de confiance, dossier (longueur, couleur cible, budget).'],
                  ['Essai','Le flow signature : selfie de la cliente → son idée (prompt et/ou galerie) → réglages → génération (loader) → aperçu avant/après, réajustable à volonté. ★ Illimité dans l\'abo Pro.'],
                  ['Tab bar','5 entrées · le bouton central « Essayer » est caramel et surélevé — exactement le bouton de la B2C, label sous le bouton.'],
                  ['Identité','Système v2 noir & blanc + touche caramel. Même palette que le B2C — la Pro se distingue par le badge PRO et ses écrans métier.'],
                  ['Modèle','Abonnement mensuel Pro : Solo 49€, Salon 89€, Maison 149€. Plus cher que le client (packs à 4,99€).'],
                ].map(([k,v])=>(
                  <div key={k} style={{display:'flex',gap:14,alignItems:'baseline'}}>
                    <div className="mono" style={{fontSize:9,letterSpacing:'.12em',color:MPAL.mute,
                      width:78,flexShrink:0,paddingTop:2}}>{k.toUpperCase()}</div>
                    <div style={{fontSize:13,lineHeight:1.45}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:'auto',paddingTop:18,borderTop:`1px solid ${MPAL.border}`,
                display:'flex',gap:8,flexWrap:'wrap',fontSize:11,color:MPAL.mute}}>
                <span style={{padding:'4px 10px',borderRadius:999,background:MPAL.subtle}}>iOS 26</span>
                <span style={{padding:'4px 10px',borderRadius:999,background:MPAL.subtle}}>FR · EN</span>
                <span style={{padding:'4px 10px',borderRadius:999,background:PPAL.proSoft,color:PPAL.pro,fontWeight:600}}>Abo. mensuel</span>
                <span style={{padding:'4px 10px',borderRadius:999,background:MPAL.subtle}}>14 écrans</span>
              </div>
              <div style={{marginTop:14,padding:14,borderRadius:14,background:PPAL.proSoft,
                display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:6,height:46,background:PPAL.pro,borderRadius:6,flexShrink:0}}/>
                <div style={{fontSize:12,lineHeight:1.45,color:'#3d342b'}}>
                  <b>Pont B2B↔B2C :</b> la photo qu'envoie la cliente vient de l'app Mèche grand public. Le score de match et le brief sont automatiques.
                </div>
              </div>
            </div>
          </DCArtboard>
        </DCSection>

        <DCSection id="onboarding-pro" title="Onboarding · 4 écrans"
          subtitle="Welcome (positionnement différent — 'les clients qui savent'), création salon, photos/services/horaires, et abonnement Pro (3 plans).">
          {screens.slice(0,4).map(s => (
            <DCArtboard key={s.id} id={s.id} label={s.label} width={frameW} height={frameH}
              style={{background:'transparent'}}>
              {renderScreen(s)}
            </DCArtboard>
          ))}
        </DCSection>

        <DCSection id="inbox-flow" title="Inbox des demandes · 4 écrans"
          subtitle="Aujourd'hui (dashboard), inbox (photos IA reçues), détail d'une demande avec dossier Mèche, et la conversation pour répondre + proposer un créneau.">
          {screens.slice(4,8).map(s => (
            <DCArtboard key={s.id} id={s.id} label={s.label} width={frameW} height={frameH}
              style={{background:'transparent'}}>
              {renderScreen(s)}
            </DCArtboard>
          ))}
        </DCSection>

        <DCSection id="live" title="Essai Mèche au fauteuil · flow guidé · ★ KILLER FEATURE"
          subtitle="Un seul écran, 4 étapes — clique pour le parcourir en vrai. (1) selfie de la cliente, (2) son idée : prompt et/ou pioche dans ta galerie, (3) ajustement aux curseurs, (4) génération avec loader à la B2C, puis aperçu avant/après avec Réajuster (retour à l'idée) ou Refaire (nouvelle variante). Illimité dans l'abo Pro.">
          <DCArtboard key={screens[8].id} id={screens[8].id} label={screens[8].label} width={frameW} height={frameH}
            style={{background:'transparent'}}>
            {renderScreen(screens[8])}
          </DCArtboard>
        </DCSection>

        <DCSection id="agenda" title="Agenda · 2 écrans"
          subtitle="Le calendrier du jour (rendez-vous confirmés, en cours, en attente) et le détail d'un rendez-vous avec le dossier de la cliente.">
          {screens.slice(9,11).map(s => (
            <DCArtboard key={s.id} id={s.id} label={s.label} width={frameW} height={frameH}
              style={{background:'transparent'}}>
              {renderScreen(s)}
            </DCArtboard>
          ))}
        </DCSection>

        <DCSection id="salon" title="Salon · 3 écrans · onglet « Salon »"
          subtitle="① Au clic sur l'onglet Salon → l'ACCUEIL du salon (profil, abonnement, stats, réglages). Depuis cet accueil, deux cartes mènent à ② Mes réalisations (le portfolio) et ③ la Page publique (l'aperçu que voient les clientes). Les deux sous-pages se ferment pour revenir à l'accueil.">
          {screens.slice(11).map(s => (
            <DCArtboard key={s.id} id={s.id} label={s.label} width={frameW} height={frameH}
              style={{background:'transparent'}}>
              {renderScreen(s)}
            </DCArtboard>
          ))}
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks · Mèche Pro">
        <TweakSection label="Langue"/>
        <TweakRadio value={lang} options={[{value:'fr',label:'Français'},{value:'en',label:'English'}]}
          onChange={(v)=>setTw('language', v)}/>

        <TweakSection label="Accent"/>
        <TweakColor value={accent} options={[
          '#15110E','#B07F3C','#2A2520','#C08A6E','#9A8C7C',
        ]} onChange={(v)=>setTw('accent', v)}/>

        <TweakSection label="Présentation"/>
        <TweakToggle label="Cadre iPhone" value={tw.showFrame}
          onChange={(v)=>setTw('showFrame', v)}/>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('p-root')).render(<MecheProApp/>);
