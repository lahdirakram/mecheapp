#!/usr/bin/env node
// Visuels réseaux sociaux (YouTube / Instagram) — même charte et même pipeline que
// store/ads/render-ads.mjs (HTML → Chrome headless → PNG).
//
// - banner-youtube.png  2560×1440 : bannière de chaîne. TOUT l'essentiel (texte, téléphone)
//   tient dans la zone sûre YouTube de 1546×423 centrée (seule zone visible sur desktop/mobile) ;
//   le reste du canevas n'apparaît que sur TV et ne porte que du décor.
// - avatar-*.png  1024×1024 : photo de profil (crop circulaire côté plateforme, tout est
//   composé pour rester lisible dans le cercle inscrit).
//
// Usage: node render-social.mjs

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = join(HERE, 'out');
mkdirSync(OUT, { recursive: true });

const PAL = { bg: '#FCF8F4', ink: '#15110E', mute: 'rgba(252,248,244,0.6)', sable: '#B07F3C' };

const FONTS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400;1,9..144,600&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap');
`;

function dataUri(p) {
  const b = readFileSync(p);
  const mime = extname(p).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${b.toString('base64')}`;
}

const ICON = dataUri(join(ROOT, 'apps', 'meche', 'assets', 'icon.png'));
const RAW_HERO = dataUri(join(HERE, '..', 'screenshots', 'raw', 'en', 'IMG_0024.PNG'));
const LOOK_FEED = dataUri(join(ROOT, 'web', 'site', 'looks', 'feed-person.jpg'));
const LOOK_BOUCLES = dataUri(join(ROOT, 'web', 'site', 'looks', 'boucles.jpg'));

function shoot(name, w, h, body, extraCss = '') {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    ${FONTS_CSS}
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${w}px;height:${h}px;background:${PAL.ink};overflow:hidden}
    ${extraCss}
  </style></head><body>${body}</body></html>`;
  const htmlPath = join(TMP, `${name}.html`);
  const outPath = join(OUT, `${name}.png`);
  writeFileSync(htmlPath, html);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    '--force-device-scale-factor=1', `--window-size=${w},${h}`,
    '--default-background-color=00000000', '--virtual-time-budget=5000',
    `--screenshot=${outPath}`, `file://${htmlPath}`,
  ], { stdio: 'ignore' });
  console.log(`  out/${name}.png ${w}x${h}`);
}

const TMP = mkdtempSync(join(tmpdir(), 'meche-social-'));

// ---------------------------------------------------------------- bannière YouTube
// Zone sûre : 1546×423 centrée dans 2560×1440 → x:507..2053, y:508..932.
{
  const W = 2560, H = 1440;
  const SAFE = { x: 507, y: 508, w: 1546, h: 424 };

  // téléphone (même geste que render-ads.mjs), dimensionné pour tenir dans la zone sûre
  const screenW = 165;
  const ratio = 2778 / 1284;
  const bezel = Math.max(6, Math.round((15 * screenW) / 1020));
  const rOut = Math.round((92 * screenW) / 1020);
  const rIn = Math.round((78 * screenW) / 1020);
  const phW = screenW + bezel * 2;
  const phH = Math.round(screenW * ratio) + bezel * 2;

  const body = `
  <div style="position:relative;width:${W}px;height:${H}px;background:${PAL.ink}">
    <!-- décor TV uniquement (hors zone sûre) : glyphe m̀ géant très discret + halo -->
    <div style="position:absolute;inset:0;background:
      radial-gradient(1200px 700px at 78% 45%, rgba(176,127,60,0.10), transparent 70%),
      radial-gradient(1000px 800px at 15% 20%, rgba(252,248,244,0.035), transparent 70%)"></div>
    <img src="${ICON}" style="position:absolute;right:-160px;top:-260px;width:980px;opacity:0.05;filter:grayscale(1)"/>
    <div style="position:absolute;left:0;right:0;top:${SAFE.y - 3}px;height:1px;background:rgba(252,248,244,0.07)"></div>
    <div style="position:absolute;left:0;right:0;top:${SAFE.y + SAFE.h + 2}px;height:1px;background:rgba(252,248,244,0.07)"></div>

    <!-- zone sûre : tout l'essentiel vit ici -->
    <div style="position:absolute;left:${SAFE.x}px;top:${SAFE.y}px;width:${SAFE.w}px;height:${SAFE.h}px;
        display:flex;align-items:center;gap:70px;padding:0 40px">
      <div style="flex:1">
        <div style="font-family:'Geist Mono';font-weight:500;font-size:24px;letter-spacing:5px;color:${PAL.sable};text-transform:uppercase">
          MÈCHE · AI TRY-ON</div>
        <div style="font-family:Fraunces;font-weight:600;font-size:76px;line-height:1.0;letter-spacing:-2px;color:${PAL.bg};margin-top:22px">
          See the cut <em style="font-style:italic;color:${PAL.sable}">before</em> the cut.</div>
        <div style="font-family:Geist;font-weight:400;font-size:27px;line-height:1.35;color:${PAL.mute};margin-top:24px;max-width:760px">
          Before / after on your real photo. Without cutting a thing.</div>
      </div>
      <div style="width:${phW}px;height:${phH}px;background:#0B0907;border-radius:${rOut}px;padding:${bezel}px;
          flex:none;box-shadow:0 30px 70px rgba(0,0,0,0.55), 0 0 0 2px rgba(255,255,255,0.05)">
        <div style="width:100%;height:100%;border-radius:${rIn}px;overflow:hidden;background:${PAL.bg}">
          <img src="${RAW_HERO}" style="width:100%;height:100%;object-fit:cover;display:block"/>
        </div>
      </div>
    </div>
  </div>`;
  shoot('banner-youtube', W, H, body);
}

// ---------------------------------------------------------------- photos de profil
// 1024×1024, pensées pour le crop circulaire : le badge m̀ reste dans le cercle inscrit.
function avatarBadge(name, portrait) {
  const W = 1024;
  const badge = 230;
  const body = `
  <div style="position:relative;width:${W}px;height:${W}px;background:${PAL.ink}">
    <img src="${portrait}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"/>
    <div style="position:absolute;left:50%;top:${W - 118}px;transform:translate(-50%,-50%);
        width:${badge}px;height:${badge}px;border-radius:50%;overflow:hidden;
        box-shadow:0 12px 34px rgba(0,0,0,0.45), 0 0 0 7px ${PAL.bg}">
      <img src="${ICON}" style="width:100%;height:100%;object-fit:cover;transform:scale(1.18)"/>
    </div>
  </div>`;
  shoot(name, W, W, body);
}
avatarBadge('avatar-badge-feed', LOOK_FEED);
avatarBadge('avatar-badge-boucles', LOOK_BOUCLES);

// variante « cadrée » : portrait dans un médaillon cerclé d'or sur fond sombre, m̀ discret en bas
{
  const W = 1024;
  const body = `
  <div style="position:relative;width:${W}px;height:${W}px;background:${PAL.ink}">
    <div style="position:absolute;inset:0;background:radial-gradient(620px 620px at 50% 42%, rgba(176,127,60,0.14), transparent 72%)"></div>
    <div style="position:absolute;left:50%;top:435px;transform:translate(-50%,-50%);width:610px;height:610px;
        border-radius:50%;overflow:hidden;box-shadow:0 0 0 8px ${PAL.sable}, 0 24px 60px rgba(0,0,0,0.5)">
      <img src="${LOOK_FEED}" style="width:100%;height:100%;object-fit:cover"/>
    </div>
    <img src="${ICON}" style="position:absolute;left:50%;top:850px;transform:translate(-50%,-50%);
        width:150px;height:150px;border-radius:50%;box-shadow:0 0 0 6px rgba(252,248,244,0.9)"/>
  </div>`;
  shoot('avatar-medaillon', W, W, body);
}

console.log('Fait.');
