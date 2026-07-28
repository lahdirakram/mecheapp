#!/usr/bin/env node
// Visuels Google Ads (campagnes App) — même charte que store/screenshots/render.mjs.
// Réutilise les captures brutes de ../screenshots/raw/<loc>/ et rend chaque créa dans les
// 3 formats demandés par Google : paysage 1200×628, carré 1200×1200, portrait 1200×1500.
//
// Usage:
//   node render-ads.mjs          rend toutes les langues (ads.<loc>.json présents)
//   node render-ads.mjs fr       rend seulement le français
//
// Sortie: out/<loc>/<id>-<format>.png  (ex: out/fr/hero-square.png)

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_ROOT = join(HERE, '..', 'screenshots', 'raw');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const PAL = { bg: '#FCF8F4', ink: '#15110E', mute: '#8B8178', sable: '#B07F3C', inkInv: '#FCF8F4' };

const FONTS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400;1,9..144,600&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap');
`;

// Google Ads : ratios 1.91:1, 1:1 et 4:5. Chaque format définit sa mise en page.
const FORMATS = {
  landscape: { w: 1200, h: 628, kicker: 20, headline: 58, sub: 24, screenW: 330, textW: 640, pad: '60px 64px' },
  square: { w: 1200, h: 1200, kicker: 24, headline: 84, sub: 30, screenW: 560, textW: 920, pad: '92px 84px 0' },
  portrait: { w: 1200, h: 1500, kicker: 26, headline: 92, sub: 32, screenW: 640, textW: 960, pad: '110px 90px 0' },
};

const LOCALES = readdirSync(HERE)
  .map((f) => f.match(/^ads\.([a-z]{2})\.json$/))
  .filter(Boolean)
  .map((m) => m[1]);

function headlineHtml(s, accent) {
  return s.replace(/\{([^}]+)\}/g, `<em style="font-style:italic;color:${accent}">$1</em>`);
}

function dataUri(rawDir, file) {
  const p = join(rawDir, file);
  if (!existsSync(p)) return null;
  const b = readFileSync(p);
  return `data:image/png;base64,${b.toString('base64')}`;
}

function pngSize(rawDir, file) {
  const p = join(rawDir, file);
  if (!existsSync(p)) return { w: 1284, h: 2778 };
  const b = readFileSync(p);
  if (b.length > 24 && b.toString('ascii', 12, 16) === 'IHDR') {
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  }
  return { w: 1284, h: 2778 };
}

function phoneCss(screenW, ratio) {
  const bezel = Math.max(8, Math.round((15 * screenW) / 1020));
  const rOut = Math.round((92 * screenW) / 1020);
  const rIn = Math.round((78 * screenW) / 1020);
  const screenH = Math.round(screenW * ratio);
  return { bezel, rOut, rIn, w: screenW + bezel * 2, h: screenH + bezel * 2 };
}

function adHtml(creative, fmtName, fmt, rawDir) {
  const dark = creative.theme === 'dark';
  const bg = dark ? PAL.ink : PAL.bg;
  const fg = dark ? PAL.inkInv : PAL.ink;
  const mute = dark ? 'rgba(252,248,244,0.6)' : PAL.mute;
  const accent = PAL.sable;
  const img = dataUri(rawDir, creative.raw);
  const { w: iw, h: ih } = pngSize(rawDir, creative.raw);
  const ph = phoneCss(fmt.screenW, ih / iw);

  const screen = img
    ? `<img src="${img}" style="width:100%;height:100%;object-fit:cover;display:block"/>`
    : `<div style="width:100%;height:100%;background:${PAL.bg}"></div>`;

  const phone = `<div style="width:${ph.w}px;height:${ph.h}px;background:#0B0907;border-radius:${ph.rOut}px;
      padding:${ph.bezel}px;box-shadow:0 40px 90px rgba(21,17,14,${dark ? '0.55' : '0.22'}), 0 0 0 2px rgba(255,255,255,0.04)">
      <div style="width:100%;height:100%;border-radius:${ph.rIn}px;overflow:hidden;background:${PAL.bg}">${screen}</div>
    </div>`;

  // Paysage : texte à gauche centré verticalement, téléphone ancré à droite qui déborde en bas.
  // Carré / portrait : texte en haut, téléphone centré qui déborde en bas (même geste que les
  // captures store).
  const stage =
    fmtName === 'landscape'
      ? `<div style="position:absolute;right:70px;top:70px">${phone}</div>`
      : `<div style="position:absolute;left:0;right:0;bottom:-${Math.round(ph.h * 0.45)}px;display:flex;justify-content:center">${phone}</div>`;

  const textBlock = `
    <div class="kicker">${creative.kicker}</div>
    <div class="headline">${headlineHtml(creative.headline, accent)}</div>
    <div class="sub">${creative.subhead}</div>`;

  const wrapLayout =
    fmtName === 'landscape'
      ? `display:flex;flex-direction:column;justify-content:center`
      : `display:flex;flex-direction:column`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${FONTS_CSS}
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${fmt.w}px;height:${fmt.h}px;background:${bg};overflow:hidden}
    .wrap{width:${fmt.w}px;height:${fmt.h}px;background:${bg};position:relative;padding:${fmt.pad};${wrapLayout}}
    .kicker{font-family:'Geist Mono';font-weight:500;font-size:${fmt.kicker}px;letter-spacing:4px;
      color:${accent};text-transform:uppercase}
    .headline{font-family:Fraunces;font-weight:600;font-size:${fmt.headline}px;line-height:0.98;
      letter-spacing:-2px;color:${fg};margin-top:${Math.round(fmt.headline * 0.3)}px;max-width:${fmt.textW}px}
    .sub{font-family:Geist;font-weight:400;font-size:${fmt.sub}px;line-height:1.35;color:${mute};
      margin-top:${Math.round(fmt.sub * 0.9)}px;max-width:${fmtName === 'landscape' ? 560 : 820}px}
  </style></head><body>
    <div class="wrap">${textBlock}${stage}</div>
  </body></html>`;
}

const argv = process.argv.slice(2);
const targets = argv[0] && LOCALES.includes(argv[0]) ? [argv[0]] : LOCALES;
if (!LOCALES.length) {
  console.error('Aucun ads.<loc>.json trouvé.');
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), 'meche-ads-'));
let total = 0;
for (const loc of targets) {
  const cfg = JSON.parse(readFileSync(join(HERE, `ads.${loc}.json`), 'utf8'));
  const rawDir = join(RAW_ROOT, loc);
  const outDir = join(HERE, 'out', loc);
  mkdirSync(outDir, { recursive: true });
  console.log(`\n[${loc}] -> out/${loc}/`);
  for (const creative of cfg.creatives) {
    for (const [fmtName, fmt] of Object.entries(FORMATS)) {
      const htmlPath = join(tmp, `${loc}-${creative.id}-${fmtName}.html`);
      const outPath = join(outDir, `${creative.id}-${fmtName}.png`);
      writeFileSync(htmlPath, adHtml(creative, fmtName, fmt, rawDir));
      execFileSync(CHROME, [
        '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
        '--force-device-scale-factor=1', `--window-size=${fmt.w},${fmt.h}`,
        '--default-background-color=00000000', '--virtual-time-budget=3000',
        `--screenshot=${outPath}`, `file://${htmlPath}`,
      ], { stdio: 'ignore' });
      const has = existsSync(join(rawDir, creative.raw));
      console.log(`  ${creative.id}-${fmtName}.png ${fmt.w}x${fmt.h}  ${has ? '✓' : 'CAPTURE MANQUANTE: ' + creative.raw}`);
      total++;
    }
  }
}
console.log(`\n${total} visuel(s) rendu(s).`);
