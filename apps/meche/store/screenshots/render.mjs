#!/usr/bin/env node
// Habillage des captures App Store — template à la marque Mèche -> Chrome headless -> PNG exact.
//
// Multi-langue. Une langue = un fichier captions.<loc>.json + un dossier raw/<loc>/ -> out/<loc>/.
//
// Usage:
//   node render.mjs              rend TOUTES les langues détectées
//   node render.mjs en           rend seulement l'anglais
//   node render.mjs fr 2 5       rend les slides 2 et 5 en français
//
// Dépose tes captures iPhone brutes dans raw/<loc>/ (mêmes noms que dans captions.<loc>.json).
// Une slide sans capture correspondante affiche un placeholder pour valider le design.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const PAL = {
  bg: '#FCF8F4', ink: '#15110E', mute: '#8B8178', sable: '#B07F3C', inkInv: '#FCF8F4',
};

const FONTS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400;1,9..144,600&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap');
`;

// langues disponibles = captions.<loc>.json présents
const LOCALES = readdirSync(HERE)
  .map((f) => f.match(/^captions\.([a-z]{2})\.json$/))
  .filter(Boolean)
  .map((m) => m[1]);

// {mot} dans headline -> accent serif italique caramel
function headlineHtml(s, accent) {
  return s.replace(/\{([^}]+)\}/g, `<em style="font-style:italic;color:${accent}">$1</em>`);
}

function dataUri(rawDir, file) {
  const p = join(rawDir, file);
  if (!existsSync(p)) return null;
  const b = readFileSync(p);
  const ext = file.split('.').pop().toLowerCase();
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
  return `data:${mime};base64,${b.toString('base64')}`;
}

// Dimensions natives de la capture PNG (entête IHDR) -> ratio d'écran exact, sans rognage.
function pngSize(rawDir, file) {
  const p = join(rawDir, file);
  if (!existsSync(p)) return { w: 828, h: 1792 };
  const b = readFileSync(p);
  if (b.length > 24 && b.toString('ascii', 12, 16) === 'IHDR') {
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  }
  return { w: 828, h: 1792 };
}

function slideHtml(slide, rawDir, W, H) {
  const dark = slide.theme === 'dark';
  const bg = dark ? PAL.ink : PAL.bg;
  const fg = dark ? PAL.inkInv : PAL.ink;
  const mute = dark ? 'rgba(252,248,244,0.6)' : PAL.mute;
  const accent = PAL.sable;
  const img = dataUri(rawDir, slide.raw);

  // Écran du mockup : largeur fixe, hauteur déduite du ratio natif de la capture (zéro rognage).
  // Large -> le mockup remonte sous le texte et déborde en bas (pas de bande morte au milieu).
  const SCREEN_W = 1020;
  const { w: iw, h: ih } = pngSize(rawDir, slide.raw);
  const SCREEN_H = Math.round((SCREEN_W * ih) / iw);
  const BEZEL = 15;
  const PHONE_W = SCREEN_W + BEZEL * 2;
  const PHONE_H = SCREEN_H + BEZEL * 2;

  const screen = img
    ? `<img src="${img}" style="width:100%;height:100%;object-fit:cover;display:block"/>`
    : `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
         background:${PAL.bg};color:${PAL.mute};font-family:'Geist Mono';gap:18px">
         <div style="font-family:Fraunces;font-size:120px;color:${PAL.ink};line-height:1">M</div>
         <div style="font-size:26px;letter-spacing:3px">${slide.raw}</div>
         <div style="font-size:20px;opacity:.7">manquante</div>
       </div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${FONTS_CSS}
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${W}px;height:${H}px;background:${bg};overflow:hidden}
    .wrap{width:${W}px;height:${H}px;background:${bg};display:flex;flex-direction:column;
      padding:150px 96px 0;position:relative}
    .kicker{font-family:'Geist Mono';font-weight:500;font-size:30px;letter-spacing:5px;
      color:${accent};text-transform:uppercase}
    .headline{font-family:Fraunces;font-weight:600;font-size:104px;line-height:0.98;
      letter-spacing:-3px;color:${fg};margin-top:34px;max-width:1040px}
    .sub{font-family:Geist;font-weight:400;font-size:34px;line-height:1.35;color:${mute};
      margin-top:34px;max-width:880px}
    .phone-stage{position:absolute;left:0;right:0;bottom:-130px;display:flex;justify-content:center}
    .phone{width:${PHONE_W}px;height:${PHONE_H}px;background:#0B0907;border-radius:92px;padding:${BEZEL}px;
      box-shadow:0 60px 120px rgba(21,17,14,${dark ? '0.55' : '0.22'}), 0 0 0 2px rgba(255,255,255,0.04)}
    .screen{width:100%;height:100%;border-radius:78px;overflow:hidden;background:${PAL.bg}}
  </style></head><body>
    <div class="wrap">
      <div class="kicker">${slide.kicker}</div>
      <div class="headline">${headlineHtml(slide.headline, accent)}</div>
      <div class="sub">${slide.subhead}</div>
      <div class="phone-stage"><div class="phone"><div class="screen">${screen}</div></div></div>
    </div>
  </body></html>`;
}

function renderLocale(loc, which, tmp) {
  const cfg = JSON.parse(readFileSync(join(HERE, `captions.${loc}.json`), 'utf8'));
  const { w: W, h: H } = cfg.size;
  const rawDir = join(HERE, 'raw', loc);
  const outDir = join(HERE, 'out', loc);
  console.log(`\n[${loc}]  raw/${loc}/ -> out/${loc}/`);
  let done = 0;
  cfg.slides.forEach((slide, i) => {
    const n = i + 1;
    if (which.length && !which.includes(n)) return;
    const nn = String(n).padStart(2, '0');
    const htmlPath = join(tmp, `${loc}-${nn}.html`);
    const outPath = join(outDir, `${nn}.png`);
    writeFileSync(htmlPath, slideHtml(slide, rawDir, W, H));
    execFileSync(CHROME, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
      '--force-device-scale-factor=1', `--window-size=${W},${H}`,
      '--default-background-color=00000000', '--virtual-time-budget=3000',
      `--screenshot=${outPath}`, `file://${htmlPath}`,
    ], { stdio: 'ignore' });
    const has = existsSync(join(rawDir, slide.raw));
    console.log(`  out/${loc}/${nn}.png   ${has ? 'capture ✓' : 'PLACEHOLDER (raw/' + loc + '/' + slide.raw + ' manquant)'}  — "${slide.headline.replace(/[{}]/g, '')}"`);
    done++;
  });
  return done;
}

// args: [locale?] [slide numbers...]
const argv = process.argv.slice(2);
const locArg = argv[0] && LOCALES.includes(argv[0]) ? argv[0] : null;
const targets = locArg ? [locArg] : LOCALES;
const which = argv.slice(locArg ? 1 : 0).map(Number).filter((n) => !isNaN(n));

if (!LOCALES.length) {
  console.error('Aucun captions.<loc>.json trouvé.');
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), 'meche-shots-'));
let total = 0;
targets.forEach((loc) => { total += renderLocale(loc, which, tmp); });
console.log(`\n${total} slide(s) rendue(s) — langues: ${targets.join(', ')}`);
