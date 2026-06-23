// Tiny zero-dependency static server for Mèche's landing + legal pages.
// - serves ./public, binds to Railway's $PORT
// - /healthz health check
// - / serves the marketing landing (public/index.html, FR)
// - bilingual legal: /fr/* and /en/* serve explicitly; the canonical /privacy, /terms,
//   /mentions-legales detect the language (?lang override -> Accept-Language header -> default fr),
//   so the store URLs stay stable. /fr and /en land on the legal hub.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, 'public');
const PAGES = new Set(['index', 'privacy', 'terms', 'mentions-legales', 'support']);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

// Cache policy by extension. Images/styles rarely change -> cache hard so
// browsers and Cloudflare's edge serve them without re-hitting the origin.
// HTML is short-lived so legal copy updates show up quickly.
function cacheControl(ext) {
  if (ext === '.jpg' || ext === '.png' || ext === '.svg' || ext === '.ico') {
    return 'public, max-age=2592000, stale-while-revalidate=86400'; // 30d
  }
  if (ext === '.css' || ext === '.js') return 'public, max-age=86400'; // 1d
  return 'public, max-age=300'; // html: 5min
}

function safeJoin(rel) {
  if (rel.indexOf('\0') !== -1) return null; // reject null-byte injection
  const filePath = path.normalize(path.join(ROOT, rel));
  return filePath.startsWith(ROOT) ? filePath : null; // path-traversal guard
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

function resolve(req) {
  const url = new URL(req.url, 'http://localhost');
  let p = decodeURIComponent(url.pathname);
  if (p === '/healthz') return { health: true };
  if (p === '/') return { file: safeJoin('/index.html') }; // marketing landing
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);

  // static asset (anything with a file extension) -> serve from public root
  if (path.extname(p)) return { file: safeJoin(p) };

  const parts = p.split('/').filter(Boolean);

  // explicit language: /fr, /en, /fr/privacy, /en/terms ...
  if (parts[0] === 'fr' || parts[0] === 'en') {
    const page = parts[1] || 'index';
    if (!PAGES.has(page)) return { notFound: true };
    return { file: safeJoin(`/${parts[0]}/${page}.html`) };
  }

  // canonical: /, /privacy, /terms -> language-detected
  const page = parts[0] || 'index';
  if (PAGES.has(page)) {
    return { file: safeJoin(`/${pickLang(req, url)}/${page}.html`) };
  }
  return { notFound: true };
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
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      return res.end('<!doctype html><meta charset="utf-8"><h1>404</h1><p><a href="/">Accueil / Home</a></p>');
    }
    const etag = `"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
    const headers = {
      'content-type': TYPES[ext] || 'application/octet-stream',
      'cache-control': cacheControl(ext),
      'etag': etag,
      'last-modified': stat.mtime.toUTCString(),
    };
    // Conditional request -> 304, no body. Saves the whole image on revalidation.
    const inm = req.headers['if-none-match'];
    if (inm && inm === etag) {
      res.writeHead(304, headers);
      return res.end();
    }
    fs.readFile(r.file, (rErr, data) => {
      if (rErr) {
        res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
        return res.end('<!doctype html><meta charset="utf-8"><h1>404</h1>');
      }
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

server.listen(PORT, '0.0.0.0', () => console.log(`Mèche legal server listening on :${PORT}`));
