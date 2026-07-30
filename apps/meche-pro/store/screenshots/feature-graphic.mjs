#!/usr/bin/env node
// Bannière Play Store "Image de présentation" — 1024x500, même charte que render.mjs.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const PAL = { bg: '#FCF8F4', ink: '#15110E', mute: 'rgba(252,248,244,0.65)', sable: '#B07F3C' };

const FONTS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400;1,9..144,600&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap');
`;

function dataUri(path) {
  const b = readFileSync(path);
  return `data:image/png;base64,${b.toString('base64')}`;
}

const COPY = {
  fr: {
    kicker: 'MÈCHE PRO · LE STUDIO',
    headline: 'Montre la coupe<br/><em>avant</em> la coupe.',
    sub: "L'essayage IA pour les coiffeurs. Sa photo, son idée, le rendu sur elle en 20 secondes.",
  },
  en: {
    kicker: 'MÈCHE PRO · THE STUDIO',
    headline: 'Show the cut<br/><em>before</em> the cut.',
    sub: 'AI try-on for hair professionals. Her photo, her idea, the result on her in 20 seconds.',
  },
};

const loc = process.argv[2] === 'en' ? 'en' : 'fr';
const copy = COPY[loc];
const img = dataUri(join(HERE, `raw/${loc}/2.PNG`));

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  ${FONTS_CSS}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1024px;height:500px;background:${PAL.ink};overflow:hidden}
  .wrap{width:1024px;height:500px;background:${PAL.ink};display:flex;position:relative}
  .left{width:58%;height:100%;display:flex;flex-direction:column;justify-content:center;padding:56px 0 56px 56px}
  .kicker{font-family:'Geist Mono';font-weight:500;font-size:19px;letter-spacing:4px;color:${PAL.sable};text-transform:uppercase}
  .headline{font-family:Fraunces;font-weight:600;font-size:56px;line-height:1.02;letter-spacing:-1.5px;color:${PAL.bg};margin-top:18px}
  .headline em{font-style:italic;color:${PAL.sable}}
  .sub{font-family:Geist;font-weight:400;font-size:19px;line-height:1.4;color:${PAL.mute};margin-top:18px;max-width:430px}
  .right{width:42%;height:100%;position:relative;overflow:hidden}
  .right img{position:absolute;top:-90px;right:-40px;width:520px;border-radius:32px;box-shadow:0 40px 90px rgba(0,0,0,0.5)}
  .fade{position:absolute;left:0;top:0;bottom:0;width:220px;background:linear-gradient(90deg, ${PAL.ink} 0%, rgba(21,17,14,0) 100%)}
</style></head><body>
  <div class="wrap">
    <div class="left">
      <div class="kicker">${copy.kicker}</div>
      <div class="headline">${copy.headline}</div>
      <div class="sub">${copy.sub}</div>
    </div>
    <div class="right">
      <img src="${img}"/>
      <div class="fade"></div>
    </div>
  </div>
</body></html>`;

const tmp = mkdtempSync(join(tmpdir(), 'meche-feature-'));
const htmlPath = join(tmp, 'feature.html');
writeFileSync(htmlPath, html);
const outPath = join(HERE, 'out', `feature-graphic-${loc}.png`);
execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
  '--force-device-scale-factor=1', '--window-size=1024,500',
  '--default-background-color=00000000', '--virtual-time-budget=3000',
  `--screenshot=${outPath}`, `file://${htmlPath}`,
], { stdio: 'inherit' });
console.log(`Bannière (${loc}) rendue -> ${outPath}`);
