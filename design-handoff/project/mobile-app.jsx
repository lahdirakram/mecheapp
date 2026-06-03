// mobile-app.jsx — Reflet B2C canvas

const M_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#B8765A",
  "language": "fr",
  "showFrame": true
}/*EDITMODE-END*/;

function MobileApp() {
  const [tw, setTw] = useTweaks(M_TWEAK_DEFAULTS);
  const accent = tw.accent;
  const lang = tw.language;

  const screens = [
    { id:'m01-welcome',    label:'01 · Welcome',        Cmp: MScreenWelcome,    dark:false },
    { id:'m02-selfie',     label:'02 · Selfie',         Cmp: MScreenSelfie,     dark:true  },
    { id:'m03-feed',       label:'03 · Feed découverte',Cmp: MScreenFeed,       dark:true  },
    { id:'m04-customize',  label:'04 · Personnaliser',  Cmp: MScreenCustomize,  dark:false },
    { id:'m05-generating', label:'05 · Génération',     Cmp: MScreenGenerating, dark:true  },
    { id:'m06-result',     label:'06 · Avant / après',  Cmp: MScreenResult,     dark:false },
    { id:'m07-wardrobe',   label:'07 · Garde-robe',     Cmp: MScreenWardrobe,   dark:false },
    { id:'m08-salons',     label:'08 · Salons partenaires', Cmp: MScreenSalons, dark:false },
    { id:'m09-share',      label:'09 · Partage',        Cmp: MScreenShare,      dark:false },
    { id:'m10-profile',    label:'10 · Profil & Premium', Cmp: MScreenProfile,  dark:false },
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
        <DCSection id="brand" title="Reflet — B2C grand public"
          subtitle="iPhone vertical · même marque que l'app salon, repensée pour un usage perso, social et freemium.">
          <DCArtboard id="overview-b2c" label="Note de design — B2C" width={460} height={frameH}
            style={{background:'#FAF7F1'}}>
            <div style={{padding:'40px 36px',height:'100%',fontFamily:"'Geist',sans-serif",color:'#1a1612',
              display:'flex',flexDirection:'column',gap:14,overflow:'hidden'}}>
              <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:'#6B6258'}}>
                NOTE DE DESIGN · B2C · v1
              </div>
              <div className="serif" style={{fontSize:42,lineHeight:1.05,letterSpacing:'-0.02em',marginTop:4}}>
                <span style={{fontStyle:'italic',color:accent}}>Reflet</span><br/>
                de l'app salon<br/>au feed social.
              </div>
              <div style={{fontSize:13,lineHeight:1.55,color:'#3d342b',marginTop:8}}>
                Même marque, même IA, mais conçue pour le téléphone que les gens ont dans la poche.
                Le pari : l'essai virtuel devient un acte de découverte avant de devenir un acte d'achat.
              </div>
              <div style={{marginTop:14,display:'flex',flexDirection:'column',gap:12}}>
                {[
                  ['Boucle', 'Découvre (feed) → Essaie (selfie + IA) → Garde (wardrobe) → Réserve (salon partenaire).'],
                  ['Modèle', 'Freemium : 3 essais/mois gratuits, watermark sur partages. Premium 7,99€/mois.'],
                  ['Pont B2B', 'Les salons configurés via l\'app B2B apparaissent dans le finder — match% calculé sur la coupe générée.'],
                  ['Social', 'Carte avant/après prête pour Stories/TikTok. Watermark Reflet = canal d\'acquisition viral.'],
                  ['Différence', 'Pas un copy-paste du B2B : feed swipe, wardrobe émotionnelle, paywall, et bouton "RDV" partout.'],
                ].map(([k,v])=>(
                  <div key={k} style={{display:'flex',gap:14,alignItems:'baseline'}}>
                    <div className="mono" style={{fontSize:9,letterSpacing:'.12em',color:'#6B6258',
                      width:78,flexShrink:0,paddingTop:2}}>{k.toUpperCase()}</div>
                    <div style={{fontSize:13,lineHeight:1.45}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:'auto',paddingTop:18,borderTop:'1px solid #E6DFD2',
                display:'flex',gap:8,flexWrap:'wrap',fontSize:11,color:'#6B6258'}}>
                <span style={{padding:'4px 10px',borderRadius:999,background:'#EFE9DC'}}>iOS 26</span>
                <span style={{padding:'4px 10px',borderRadius:999,background:'#EFE9DC'}}>FR · EN</span>
                <span style={{padding:'4px 10px',borderRadius:999,background:'#EFE9DC'}}>Freemium</span>
                <span style={{padding:'4px 10px',borderRadius:999,background:'#EFE9DC'}}>10 écrans</span>
              </div>
              <div style={{marginTop:14,padding:14,borderRadius:14,background:'#EFE9DC',
                display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:6,height:46,background:accent,borderRadius:6,flexShrink:0}}/>
                <div style={{fontSize:12,lineHeight:1.45,color:'#3d342b'}}>
                  <b>Note :</b> tu as déjà la version B2B sur le canvas voisin (<i>index.html</i>).
                  Les deux apps partagent l'identité Reflet — couleurs, typographie, accent terracotta.
                </div>
              </div>
            </div>
          </DCArtboard>
        </DCSection>

        <DCSection id="discovery" title="Découverte & essai · 6 écrans"
          subtitle="Le flux principal : onboarding, capture, exploration et génération.">
          {screens.slice(0,6).map(s => (
            <DCArtboard key={s.id} id={s.id} label={s.label} width={frameW} height={frameH}
              style={{background:'transparent'}}>
              {renderScreen(s)}
            </DCArtboard>
          ))}
        </DCSection>

        <DCSection id="loyalty" title="Conversion & rétention · 4 écrans"
          subtitle="Là où l'app gagne de l'argent : wardrobe → salon → partage → premium.">
          {screens.slice(6).map(s => (
            <DCArtboard key={s.id} id={s.id} label={s.label} width={frameW} height={frameH}
              style={{background:'transparent'}}>
              {renderScreen(s)}
            </DCArtboard>
          ))}
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks · Reflet B2C">
        <TweakSection label="Langue"/>
        <TweakRadio value={lang} options={[{value:'fr',label:'Français'},{value:'en',label:'English'}]}
          onChange={(v)=>setTw('language', v)}/>

        <TweakSection label="Accent"/>
        <TweakColor value={accent} options={[
          '#B8765A','#7A6D5C','#2A4A3A','#6B5BD6','#D4B07A','#C44545',
        ]} onChange={(v)=>setTw('accent', v)}/>

        <TweakSection label="Présentation"/>
        <TweakToggle label="Cadre iPhone" value={tw.showFrame}
          onChange={(v)=>setTw('showFrame', v)}/>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('m-root')).render(<MobileApp/>);
