// Zero-dependency server for the whole meche.<tld> site:
//
//   /                     marketing landing        -> site/index.html
//   /privacy /terms ...   legal pages, bilingual   -> site/{fr,en}/*.html
//   /studio/*             the paid try-on SPA      -> dist/ (Vite build)
//
// ONE service on purpose. The studio wears the site's shell (same footer, same links), and a single
// origin means no proxy, no cross-service addressing, and one deploy. The tradeoff, stated so it is
// not rediscovered painfully: a FAILING STUDIO BUILD BLOCKS DEPLOYING THE LEGAL PAGES, which are an
// enforceable commitment. If that ever bites during an urgent policy fix, deploy with the build step
// removed, then restore it.
//
// Language handling: /fr/* and /en/* serve explicitly; the canonical /privacy, /terms,
// /mentions-legales and the landing / detect the language (?lang -> `lang` cookie ->
// Accept-Language -> default fr) so the store URLs stay stable.
//
// The landing is bilingual: / is the French page, /en the English one (a full landing, not the old
// legal hub), and /fr redirects to / so each language has exactly one canonical URL. An
// English-preferring visitor on / is 302-redirected to /en. Why this stays SEO-safe:
//   - the redirect is a 302, never a 301, so nothing consolidates onto /en;
//   - crawlers send no cookie and generally no Accept-Language, so they see the stable French 200
//     at / and follow the hreflang alternates declared in both pages' <head>;
//   - language-detected responses carry `vary: accept-language, cookie` so no shared cache can pin
//     one language onto the canonical URL.
// An explicit choice (visiting /en, /fr, or any ?lang=) is remembered in the `lang` cookie, which
// OUTRANKS Accept-Language: the FR/EN switch would otherwise bounce the visitor straight back.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

/** Hand-written landing + legal pages. Not a build output. */
const SITE = path.join(HERE, 'site');
/** The Vite build of the studio SPA. Absent until `npm run build`. */
const STUDIO = path.join(HERE, 'dist');

// ── Interrupteur d'arrêt du studio ───────────────────────────────────────────────────────────────
//
// Fermé, /studio n'est tout simplement PAS SERVI : ni le shell, ni les assets. C'est un refus du
// serveur, donc rien à contourner depuis le navigateur (une garde dans le bundle React se désactive
// en deux clics dans les devtools ; celle-ci n'envoie pas le bundle du tout).
//
// La landing et les pages légales continuent d'être servies : elles sont un engagement public
// opposable et ne doivent jamais tomber avec le studio. C'est toute la raison d'être de cet
// interrupteur plutôt que d'un arrêt du service Railway.
//
// La valeur vit dans `app_config.web_studio` (0034), donc la bascule est une ligne SQL, sans
// redéploiement ni redémarrage :
//   update app_config set value='0', updated_at=now() where key='web_studio';   -- fermé
//   update app_config set value='1', updated_at=now() where key='web_studio';   -- ouvert
// Relu toutes les 30 s en tâche de fond : la fermeture prend effet en moins d'une minute, et une
// requête n'attend jamais après Supabase pour être servie.
//
// FAIL OPEN : au démarrage, si les variables manquent, ou si la lecture échoue, le studio reste
// OUVERT. Une panne de Supabase ne doit pas fermer la boutique toute seule. Ne pas inverser.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const FLAG_TTL_MS = 30_000;

let studioOpen = true;

async function refreshStudioFlag() {
  if (!SUPABASE_URL || !SUPABASE_ANON) return; // pas configuré -> on reste ouvert
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/app_config?key=eq.web_studio&select=value`,
      { headers: { apikey: SUPABASE_ANON, authorization: `Bearer ${SUPABASE_ANON}` } },
    );
    if (!r.ok) return; // on garde la dernière valeur connue
    const rows = await r.json();
    // Ligne absente ou valeur vide = ouvert. Seul un '0' explicite ferme.
    if (!Array.isArray(rows) || rows.length === 0) {
      studioOpen = true;
      return;
    }
    studioOpen = String(rows[0]?.value ?? '').trim() !== '0';
  } catch {
    /* réseau HS : on garde la dernière valeur connue, donc ouvert au pire */
  }
}

refreshStudioFlag();
// `unref` pour que ce minuteur n'empêche jamais le process de se terminer.
setInterval(refreshStudioFlag, FLAG_TTL_MS).unref();

/** 503 quand le studio est fermé. `no-store` est indispensable : une page de pause mise en cache
 *  survivrait à la réouverture. */
function sendStudioClosed(res) {
  const body =
    '<!doctype html><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Mèche Studio · en pause</title>' +
    '<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;' +
    'background:#FAF7F2;color:#15110E;font:16px/1.6 ui-sans-serif,system-ui,sans-serif;padding:24px}' +
    'main{max-width:30rem;text-align:center}h1{font-size:1.5rem;margin:0 0 .75rem}' +
    'p{margin:0 0 1.5rem;color:#5A5049}a{color:#B07F3C}</style>' +
    '<main><h1>Studio en pause</h1>' +
    "<p>Les essais en ligne sont suspendus quelques heures, le temps d'une mise au point de notre " +
    "côté. Rien n'a été prélevé. Si tu as déjà payé un essai, il n'est pas perdu, il t'attend ici " +
    'à la réouverture.</p>' +
    '<p><a href="/">Retour à l\'accueil</a></p></main>';
  res.writeHead(503, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'retry-after': '3600',
  });
  res.end(body);
}

const PAGES = new Set(['index', 'privacy', 'terms', 'mentions-legales', 'support', 'delete-account']);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

// Vite fingerprints the studio's asset filenames, so those are immutable. Everything else keeps the
// site's existing policy: images long, css/js a day, html short so copy changes surface quickly.
function cacheControl(filePath, ext) {
  if (filePath.startsWith(path.join(STUDIO, 'assets'))) return 'public, max-age=31536000, immutable';
  if (ext === '.jpg' || ext === '.png' || ext === '.svg' || ext === '.ico') {
    return 'public, max-age=2592000, stale-while-revalidate=86400'; // 30d
  }
  if (ext === '.css' || ext === '.js') return 'public, max-age=86400'; // 1d
  return 'public, max-age=300'; // html: 5min
}

/** Join under `base`, refusing null bytes and anything escaping the directory. */
function safeJoin(base, rel) {
  if (rel.indexOf('\0') !== -1) return null;
  const filePath = path.normalize(path.join(base, rel));
  return filePath.startsWith(base) ? filePath : null;
}

function cookieLang(req) {
  const m = /(?:^|;\s*)lang=(fr|en)(?:;|$)/.exec(req.headers.cookie || '');
  return m ? m[1] : null;
}

function pickLang(req, url) {
  const q = url.searchParams.get('lang');
  if (q === 'en' || q === 'fr') return q;
  const c = cookieLang(req);
  if (c) return c; // an explicit past choice beats the browser's guess
  const al = (req.headers['accept-language'] || '').toLowerCase();
  const en = al.indexOf('en');
  const fr = al.indexOf('fr');
  if (en === -1) return 'fr'; // no English preference -> French (brand default)
  if (fr === -1) return 'en';
  return en < fr ? 'en' : 'fr'; // whichever the browser lists first
}

/** /studio/* -> the SPA. A path with no extension is a route and gets the shell. */
function resolveStudio(p) {
  const rel = p === '/studio' ? '/' : p.slice('/studio'.length);
  if (rel === '' || rel === '/') return path.join(STUDIO, 'index.html');
  // A real asset must 404 when missing rather than fall back to HTML, or the browser gets a page
  // where it expected JavaScript and the failure is unreadable.
  if (!path.extname(rel)) return path.join(STUDIO, 'index.html');
  return safeJoin(STUDIO, rel);
}

function resolve(req) {
  const url = new URL(req.url, 'http://localhost');
  let p = decodeURIComponent(url.pathname);
  if (p === '/healthz') return { health: true };
  if (p === '/') {
    // Marketing landing, language-detected. `vary` because the same URL answers differently by
    // Accept-Language and cookie; `setLang` only on an EXPLICIT ?lang, never on a mere guess.
    const q = url.searchParams.get('lang');
    if (pickLang(req, url) === 'en') {
      return { redirect: '/en', vary: true, ...(q === 'en' ? { setLang: 'en' } : {}) };
    }
    return { file: safeJoin(SITE, '/index.html'), vary: true, ...(q === 'fr' ? { setLang: 'fr' } : {}) };
  }
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);

  // The studio owns everything under /studio, before the rules below.
  // Fermé, on ne résout AUCUN fichier : ni le shell, ni les assets fingerprintés. Rien du studio ne
  // quitte le serveur, donc il n'y a rien à réactiver côté navigateur.
  if (p === '/studio' || p.startsWith('/studio/')) {
    return studioOpen ? { file: resolveStudio(p) } : { studioClosed: true };
  }

  // static asset (anything with a file extension) -> serve from the site root
  if (path.extname(p)) return { file: safeJoin(SITE, p) };

  const parts = p.split('/').filter(Boolean);

  // explicit language: /fr, /en, /fr/privacy, /en/terms ...
  // /en is the English landing (site/en/index.html). The French landing lives at /, so /fr
  // redirects there instead of serving a file — one canonical URL per language. Visiting either
  // landing is an explicit choice and pins the `lang` cookie; the legal pages do not, reading
  // one document in English is not a decision about the whole site.
  if (parts[0] === 'fr' || parts[0] === 'en') {
    const page = parts[1] || 'index';
    if (page === 'index') {
      if (parts[0] === 'fr') return { redirect: '/', setLang: 'fr' };
      return { file: safeJoin(SITE, '/en/index.html'), setLang: 'en' };
    }
    if (!PAGES.has(page)) return { notFound: true };
    return { file: safeJoin(SITE, `/${parts[0]}/${page}.html`) };
  }

  // canonical: /privacy, /terms -> language-detected
  const page = parts[0] || 'index';
  if (PAGES.has(page)) {
    return { file: safeJoin(SITE, `/${pickLang(req, url)}/${page}.html`), vary: true };
  }

  return { notFound: true };
}

/** The `lang` cookie header, or nothing. One year: it records a choice, not a session. */
function langCookie(lang) {
  if (lang !== 'fr' && lang !== 'en') return {};
  return { 'set-cookie': `lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax` };
}

function send404(res) {
  res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><meta charset="utf-8"><h1>404</h1><p><a href="/">Accueil / Home</a></p>');
}

function handle(req, res) {
  let r;
  try {
    r = resolve(req);
  } catch {
    // malformed URL / bad percent-encoding etc. -> 400, never crash
    res.writeHead(400, { 'content-type': 'text/html; charset=utf-8' });
    return res.end('<!doctype html><meta charset="utf-8"><h1>400</h1>');
  }
  if (r.health) {
    // `/healthz` répond 200 même studio fermé : c'est la sonde Railway. La renvoyer en 503
    // ferait redémarrer le service en boucle, exactement ce qu'on cherche à éviter.
    res.writeHead(200, { 'content-type': 'text/plain' });
    return res.end('ok');
  }
  if (r.studioClosed) return sendStudioClosed(res);
  if (r.redirect) {
    // 302 + no-store, both deliberate: a cached or permanent language redirect would weld one
    // visitor's language onto the URL for everyone behind the same cache, and 301 would make
    // search engines consolidate / into /en.
    res.writeHead(302, {
      location: r.redirect,
      'cache-control': 'no-store',
      ...(r.vary ? { vary: 'accept-language, cookie' } : {}),
      ...langCookie(r.setLang),
    });
    return res.end();
  }
  if (r.notFound || !r.file) {
    res.writeHead(r.file === null ? 400 : 404, { 'content-type': 'text/html; charset=utf-8' });
    return res.end('<!doctype html><meta charset="utf-8"><h1>404</h1><p><a href="/">Accueil / Home</a></p>');
  }

  const ext = path.extname(r.file);
  fs.stat(r.file, (err, stat) => {
    if (err || !stat.isFile()) return send404(res);

    const etag = `"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
    const headers = {
      'content-type': TYPES[ext] || 'application/octet-stream',
      'cache-control': cacheControl(r.file, ext),
      etag,
      'last-modified': stat.mtime.toUTCString(),
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      ...(r.vary ? { vary: 'accept-language, cookie' } : {}),
      ...langCookie(r.setLang),
    };
    // Conditional request -> 304, no body. Saves the whole image on revalidation.
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, headers);
      return res.end();
    }
    fs.readFile(r.file, (rErr, data) => {
      if (rErr) return send404(res);
      res.writeHead(200, headers);
      res.end(data);
    });
  });
}

const server = http.createServer((req, res) => {
  try {
    handle(req, res);
  } catch {
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('error');
  }
});

// last-resort safety net: a single bad request must never take the process down
process.on('uncaughtException', (err) => console.error('uncaughtException', err));

server.listen(PORT, () => console.log(`Mèche site listening on :${PORT}`));
