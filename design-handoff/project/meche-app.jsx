// meche-app.jsx — Mèche B2C canvas

const M_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#15110E",
  "language": "fr",
  "showFrame": true
}/*EDITMODE-END*/;

function MobileApp() {
  const [tw, setTw] = useTweaks(M_TWEAK_DEFAULTS);
  const accent = tw.accent;
  const lang = tw.language;

  const screens = [
    { id:'m01-welcome',    label:'01 · Welcome',         Cmp: MScreenWelcome,     dark:false },
    { id:'m01b-auth',      label:'01b · Compte (choix)', Cmp: MScreenAuthChoice,  dark:false },
    { id:'m01c-signup',    label:'01c · Email (form)',   Cmp: MScreenSignupEmail, dark:false },
    { id:'m01d-confirm',   label:'01d · Vérif. email',   Cmp: MScreenEmailConfirm,dark:false },
    { id:'m02-selfie',     label:'02 · Selfie',         Cmp: MScreenSelfie,     dark:true  },
    { id:'m03-inspire',    label:'03 · Hub Mèche (selfie → voies)',   Cmp: MScreenInspireHub, dark:false },
    { id:'m04-feed',       label:'04 · Feed — Studio',   Cmp: MScreenFeedStudio, dark:true  },
    { id:'m04b-feed-salon', label:'04b · Feed — Salon partenaire', Cmp: MScreenFeedSalon, dark:true },
    { id:'m04c-feed-user',  label:'04c · Feed — Communauté',       Cmp: MScreenFeedUser,  dark:true },
    { id:'m05-gallery',    label:'05 · Galerie',         Cmp: MScreenGallery,    dark:false },
    { id:'m06-prompt',     label:'06 · Prompt (txt/voix)',Cmp: MScreenPrompt,     dark:false },
    { id:'m07-aipropose',  label:'07 · L\'IA propose',   Cmp: MScreenAIPropose,  dark:false },
    { id:'m08-customize',  label:'08 · Réglages manuels',Cmp: MScreenCustomize,  dark:false },
    { id:'m09-generating', label:'09 · Génération',     Cmp: MScreenGenerating, dark:true  },
    { id:'m10-result',     label:'10 · Avant / après',  Cmp: MScreenResult,     dark:false },
    { id:'m10b-recharge',  label:'10b · Recharge (déclencheur)', Cmp: MScreenOutOfCredits, dark:false },
    { id:'m11-wardrobe',   label:'11 · Mes mèches',     Cmp: MScreenWardrobe,   dark:false },
    { id:'m12-salons',     label:'12 · Coiffeurs',         Cmp: MScreenSalons, dark:false },
    { id:'m13-share',      label:'13 · Partage',        Cmp: MScreenShare,      dark:false },
    { id:'m14-profile',    label:'14 · Profil & crédits', Cmp: MScreenProfile,  dark:false },
    { id:'m15-recharge',   label:'15 · Recharge (depuis profil)', Cmp: MScreenRecharge, dark:false },
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
        <DCSection id="brand" title="Mèche — B2C"
          subtitle="iPhone vertical · le salon dans la poche, pour la génération qui sait déjà qui coupe.">
          <DCArtboard id="overview-b2c" label="Note de design — B2C" width={460} height={frameH}
            style={{background:MPAL.bg}}>
            <div style={{padding:'40px 36px',height:'100%',fontFamily:"'Geist',sans-serif",color:MPAL.ink,
              display:'flex',flexDirection:'column',gap:14,overflow:'hidden'}}>
              <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:MPAL.mute}}>
                NOTE DE DESIGN · B2C · v1
              </div>
              <div style={{marginTop:4}}>
                <MWordmark size={68} color={MPAL.ink} accent={MPAL.sable}/>
              </div>
              <div className="serif" style={{fontSize:30,lineHeight:1.05,letterSpacing:'-0.02em',marginTop:6}}>
                Du <span style={{fontStyle:'italic'}}>feed</span> au fauteuil,<br/>
                en deux taps.
              </div>
              <div style={{fontSize:13,lineHeight:1.55,color:MPAL.ink2,marginTop:6}}>
                On te trouve un coiffeur. Pas un salon. La génération cible suit des personnes, pas des adresses — Mèche fait pareil. <i>Être de mèche</i>, c'est savoir qui coupe.
              </div>
              <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:12}}>
                {[
                  ['Boucle', 'Compte → Découvre (le feed, direct) → Essaie (bouton Mèche : selfie → hub, 1 crédit) → Garde (mèches) → Réserve (le coiffeur, pas le salon).'],
                  ['Compte', 'Apple, Google ou email (avec confirmation). Sans compte, pas de mèches.'],
                  ['Nav', 'Barre à 4 onglets + bouton Mèche central. Découvrir ouvre le feed direct ; le bouton central lance selfie → hub des 5 voies.'],
                  ['Entrées', 'Hub d\'inspiration (via bouton Mèche) · feed swipe, galerie, prompt (texte/voix), suggestion IA, réglage manuel.'],
                  ['Modèle', 'Crédits IA rechargeables, sans abonnement : packs 5 / 20 / 60. 1 essai offert.'],
                  ['Pont B2B', 'Les salons configurés via l\'app pro apparaissent dans le finder — match% calculé sur la coupe générée.'],
                  ['Voix', 'Insider, chaleureuse, qui sait. Pas un mot de plus que nécessaire.'],
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
                <span style={{padding:'4px 10px',borderRadius:999,background:MPAL.subtle}}>Crédits IA</span>
                <span style={{padding:'4px 10px',borderRadius:999,background:MPAL.subtle}}>19 écrans</span>
              </div>
              <div style={{marginTop:14,padding:14,borderRadius:14,background:MPAL.soft,
                display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:6,height:46,background:MPAL.sable,borderRadius:6,flexShrink:0}}/>
                <div style={{fontSize:12,lineHeight:1.45,color:MPAL.ink2}}>
                  <b>Note :</b> identité Mèche v2 — noir &amp; blanc, touche sable, Fraunces. Le trait du wordmark (ex-corail) reste sable.
                  Voir <i>Mèche Brand Identity.html</i> pour le système complet.
                </div>
              </div>
            </div>
          </DCArtboard>
        </DCSection>

        <DCSection id="onboarding" title="Onboarding · 5 écrans"
          subtitle="Entrée, compte (Apple / Google / email), confirmation email, puis selfie. La porte d'entrée du modèle crédit. (Le selfie se relance aussi via le bouton Mèche de la barre.)">
          {screens.slice(0,5).map(s => (
            <DCArtboard key={s.id} id={s.id} label={s.label} width={frameW} height={frameH}
              style={{background:'transparent'}}>
              {renderScreen(s)}
            </DCArtboard>
          ))}
        </DCSection>

        <DCSection id="inspire" title="Inspiration · bouton Mèche (selfie → hub) + feed × 3 sources"
          subtitle="Découvrir ouvre le feed directement. Le bouton Mèche central lance le selfie puis propose le hub des 5 voies. Le feed unifié mélange 3 sources — Studio Mèche, salons partenaires, communauté.">
          {screens.slice(5,13).map(s => (
            <DCArtboard key={s.id} id={s.id} label={s.label} width={frameW} height={frameH}
              style={{background:'transparent'}}>
              {renderScreen(s)}
            </DCArtboard>
          ))}
        </DCSection>

        <DCSection id="preview" title="Aperçu IA + recharge · 3 écrans"
          subtitle="Génération, puis comparaison avant/après. Toute nouvelle action après l'essai gratuit déclenche l'écran de recharge.">
          {screens.slice(13,16).map(s => (
            <DCArtboard key={s.id} id={s.id} label={s.label} width={frameW} height={frameH}
              style={{background:'transparent'}}>
              {renderScreen(s)}
            </DCArtboard>
          ))}
        </DCSection>

        <DCSection id="loyalty" title="Conversion & rétention · 5 écrans"
          subtitle="Là où Mèche garde sa place : tes mèches → le coiffeur → le partage → le profil et la recharge depuis le compte.">
          {screens.slice(16).map(s => (
            <DCArtboard key={s.id} id={s.id} label={s.label} width={frameW} height={frameH}
              style={{background:'transparent'}}>
              {renderScreen(s)}
            </DCArtboard>
          ))}
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks · Mèche B2C">
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

ReactDOM.createRoot(document.getElementById('m-root')).render(<MobileApp/>);
