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
// Language handling for the legal pages is unchanged from when this lived in legal/server.js:
// /fr/* and /en/* serve explicitly; the canonical /privacy, /terms, /mentions-legales detect the
// language (?lang -> Accept-Language -> default fr) so the store URLs stay stable.
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

function pickLang(req, url) {
  const q = url.searchParams.get('lang');
  if (q === 'en' || q === 'fr') return q;
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
  if (p === '/') return { file: safeJoin(SITE, '/index.html') }; // marketing landing
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);

  // The studio owns everything under /studio, before the rules below.
  if (p === '/studio' || p.startsWith('/studio/')) return { file: resolveStudio(p) };

  // static asset (anything with a file extension) -> serve from the site root
  if (path.extname(p)) return { file: safeJoin(SITE, p) };

  const parts = p.split('/').filter(Boolean);

  // explicit language: /fr, /en, /fr/privacy, /en/terms ...
  if (parts[0] === 'fr' || parts[0] === 'en') {
    const page = parts[1] || 'index';
    if (!PAGES.has(page)) return { notFound: true };
    return { file: safeJoin(SITE, `/${parts[0]}/${page}.html`) };
  }

  // canonical: /privacy, /terms -> language-detected
  const page = parts[0] || 'index';
  if (PAGES.has(page)) return { file: safeJoin(SITE, `/${pickLang(req, url)}/${page}.html`) };

  return { notFound: true };
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
    res.writeHead(200, { 'content-type': 'text/plain' });
    return res.end('ok');
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
