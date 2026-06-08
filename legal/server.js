// Tiny zero-dependency static server for Mèche's legal pages.
// Serves ./public, supports clean URLs (/privacy -> privacy.html), and a /healthz check.
// Binds to Railway's $PORT.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, 'public');
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

function resolveFile(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p === '/') p = '/index.html';
  if (!path.extname(p)) p += '.html'; // /privacy -> /privacy.html
  const filePath = path.normalize(path.join(ROOT, p));
  if (!filePath.startsWith(ROOT)) return null; // path-traversal guard
  return filePath;
}

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    return res.end('ok');
  }
  const filePath = resolveFile(req.url || '/');
  if (!filePath) {
    res.writeHead(400, { 'content-type': 'text/plain' });
    return res.end('bad request');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      return res.end('<!doctype html><meta charset="utf-8"><h1>404</h1><p><a href="/">Accueil</a></p>');
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => console.log(`Mèche legal server listening on :${PORT}`));
