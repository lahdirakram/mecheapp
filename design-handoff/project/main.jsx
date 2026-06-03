// app.jsx — Reflet design canvas + tweaks

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "aesthetic": "editorial",
  "accent": "#B8765A",
  "language": "fr",
  "showFrame": true
}/*EDITMODE-END*/;

function App() {
  const [tw, setTw] = useTweaks(TWEAK_DEFAULTS);
  const pal = PALETTES[tw.aesthetic] || PALETTES.editorial;
  const accent = tw.accent;
  const lang = tw.language;

  const screens = [
    { id: 's01-login',      label: '01 · Login coiffeur',         Cmp: ScreenLogin },
    { id: 's02-capture',    label: '02 · Capture photo',          Cmp: ScreenCapture },
    { id: 's03-configure',  label: '03 · Configuration · prompt', Cmp: ScreenConfigure },
    { id: 's04-gallery',    label: '04 · Galerie de coupes',      Cmp: ScreenGallery },
    { id: 's05-generating', label: '05 · Génération',             Cmp: ScreenGenerating },
    { id: 's06-result',     label: '06 · Avant / après',          Cmp: ScreenBeforeAfter },
    { id: 's07-compare',    label: '07 · Comparaison · 4 var.',   Cmp: ScreenCompare },
    { id: 's08-upsell',     label: '08 · Upsell · produits',      Cmp: ScreenUpsell },
    { id: 's09-recap',      label: '09 · Récap & partage',        Cmp: ScreenRecap },
    { id: 's10-dashboard',  label: '10 · Dashboard manager',      Cmp: ScreenDashboard },
  ];

  // Optional non-frame mode — show inner UI only, no iPad bezel
  const W = tw.showFrame ? FRAME_W : FRAME_W - 24;
  const H = tw.showFrame ? FRAME_H : FRAME_H - 24;

  return (
    <>
      <DesignCanvas>
        <DCSection id="brand" title="Reflet — app coiffeur"
          subtitle="iPad vertical · prototype B2B pour salons · 10 écrans">
          <DCArtboard id="overview" label="Note de design" width={460} height={FRAME_H} style={{background:'#FAF7F1'}}>
            <div style={{padding:'40px 36px',height:'100%',fontFamily:"'Geist',sans-serif",color:'#1a1612',
              display:'flex',flexDirection:'column',gap:14,overflow:'hidden'}}>
              <div className="mono" style={{fontSize:10,letterSpacing:'.14em',color:'#6B6258'}}>
                NOTE DE DESIGN · v1
              </div>
              <div className="serif" style={{fontSize:42,lineHeight:1.05,letterSpacing:'-0.02em',marginTop:4}}>
                <span style={{fontStyle:'italic',color:accent}}>Reflet</span><br/>
                projeter, vendre,<br/>fidéliser.
              </div>
              <div style={{fontSize:13,lineHeight:1.55,color:'#3d342b',marginTop:8}}>
                Le client se voit avec sa nouvelle coupe avant le premier coup de ciseaux.
                Le coiffeur configure l'aperçu en parlant ou en réglant des curseurs.
                À la fin, un récap chiffré convertit la séance basique en vraie prestation.
              </div>
              <div style={{marginTop:14,display:'flex',flexDirection:'column',gap:12}}>
                {[
                  ['Cible', 'Chaînes premium ET mass-market. Une seule app, deux densités.'],
                  ['Surface', 'iPad vertical posé sur la station — gauche miroir, droite tablette.'],
                  ['Vocabulaire', 'Éditorial chic : Instrument Serif pour les titres, Geist pour l\'UI, accent terracotta. Variantes Minimal et Sombre disponibles via Tweaks.'],
                  ['Flux', '6 étapes : Login → Capture → Configurer → Générer → Comparer → Recap. Le manager a un dashboard à part.'],
                  ['Conversion', 'L\'upsell n\'est pas un écran d\'achat — c\'est un devis chiffré que le coiffeur valide avec le client.'],
                ].map(([k,v])=>(
                  <div key={k} style={{display:'flex',gap:14,alignItems:'baseline'}}>
                    <div className="mono" style={{fontSize:9,letterSpacing:'.12em',color:'#6B6258',
                      width:78,flexShrink:0,paddingTop:2}}>{k.toUpperCase()}</div>
                    <div style={{fontSize:13,lineHeight:1.45}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:'auto',paddingTop:18,borderTop:'1px solid #E6DFD2',
                display:'flex',gap:10,fontSize:11,color:'#6B6258'}}>
                <span style={{padding:'4px 10px',borderRadius:999,background:'#EFE9DC'}}>FR · EN</span>
                <span style={{padding:'4px 10px',borderRadius:999,background:'#EFE9DC'}}>3 thèmes</span>
                <span style={{padding:'4px 10px',borderRadius:999,background:'#EFE9DC'}}>Voice + sliders</span>
              </div>
            </div>
          </DCArtboard>
        </DCSection>

        <DCSection id="flow" title="Flux client · 9 écrans"
          subtitle="Du PIN du coiffeur au QR de récap. Faites glisser pour réordonner, double-clic pour focus.">
          {screens.slice(0,9).map(s => (
            <DCArtboard key={s.id} id={s.id} label={s.label} width={W} height={H} style={{background:pal.bezel}}>
              {tw.showFrame ? (
                <Frame pal={pal}><s.Cmp pal={pal} lang={lang} accent={accent}/></Frame>
              ) : (
                <div style={{width:'100%',height:'100%',background:pal.bg,color:pal.ink,
                  fontFamily:"'Geist',sans-serif"}}>
                  <s.Cmp pal={pal} lang={lang} accent={accent}/>
                </div>
              )}
            </DCArtboard>
          ))}
        </DCSection>

        <DCSection id="manager" title="Côté manager"
          subtitle="L'accès KPI réservé aux gérants de salon — visible par le siège pour piloter le déploiement multi-magasins.">
          {screens.slice(9).map(s => (
            <DCArtboard key={s.id} id={s.id} label={s.label} width={W} height={H} style={{background:pal.bezel}}>
              {tw.showFrame ? (
                <Frame pal={pal}><s.Cmp pal={pal} lang={lang} accent={accent}/></Frame>
              ) : (
                <div style={{width:'100%',height:'100%',background:pal.bg,color:pal.ink}}>
                  <s.Cmp pal={pal} lang={lang} accent={accent}/>
                </div>
              )}
            </DCArtboard>
          ))}
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks · Reflet">
        <TweakSection label="Langue"/>
        <TweakRadio value={lang} options={[{value:'fr',label:'Français'},{value:'en',label:'English'}]}
          onChange={(v)=>setTw('language', v)}/>

        <TweakSection label="Esthétique"/>
        <TweakRadio value={tw.aesthetic} options={[
          {value:'editorial', label:'Éditorial'},
          {value:'minimal',   label:'Minimal'},
          {value:'sombre',    label:'Sombre'},
        ]} onChange={(v)=>setTw('aesthetic', v)}/>

        <TweakSection label="Accent"/>
        <TweakColor value={accent} options={[
          '#B8765A',  // terracotta
          '#7A6D5C',  // mocha
          '#2A4A3A',  // sapin
          '#6B5BD6',  // violet
          '#D4B07A',  // doré
          '#C44545',  // rouge
        ]} onChange={(v)=>setTw('accent', v)}/>

        <TweakSection label="Présentation"/>
        <TweakToggle label="Cadre iPad" value={tw.showFrame}
          onChange={(v)=>setTw('showFrame', v)}/>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
