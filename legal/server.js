// Tiny zero-dependency static server for Mèche's legal pages.
// - serves ./public, binds to Railway's $PORT
// - /healthz health check
// - bilingual: /fr/* and /en/* serve explicitly; the canonical /, /privacy, /terms detect the
//   language (?lang override -> Accept-Language header -> default fr), so the store URLs stay stable
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, 'public');
const PAGES = new Set(['index', 'privacy', 'terms']);
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

function safeJoin(rel) {
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

const server = http.createServer((req, res) => {
  const r = resolve(req);
  if (r.health) {
    res.writeHead(200, { 'content-type': 'text/plain' });
    return res.end('ok');
  }
  if (r.notFound || !r.file) {
    res.writeHead(r.file === null ? 400 : 404, { 'content-type': 'text/html; charset=utf-8' });
    return res.end('<!doctype html><meta charset="utf-8"><h1>404</h1><p><a href="/">Accueil / Home</a></p>');
  }
  fs.readFile(r.file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      return res.end('<!doctype html><meta charset="utf-8"><h1>404</h1><p><a href="/">Accueil / Home</a></p>');
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(r.file)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => console.log(`Mèche legal server listening on :${PORT}`));
