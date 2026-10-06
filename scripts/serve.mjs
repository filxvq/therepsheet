// Local preview of dist/ the way Vercel serves it: /x/ -> x/index.html, /api/rates -> api/rates.js.
// node scripts/serve.mjs [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import rates from '../api/rates.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const port = Number(process.argv[2] || 4321);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.xml': 'application/xml', '.txt': 'text/plain' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.replace(/\/$/, '') === '/api/rates') {
    const shim = { setHeader: (k, v) => res.setHeader(k, v), status(c) { res.statusCode = c; return shim; }, json(o) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); } };
    return rates(req, shim);
  }
  let p = path.join(DIST, decodeURIComponent(url.pathname));
  if (!p.startsWith(DIST)) { res.statusCode = 403; return res.end(); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
    if (!url.pathname.endsWith('/')) { res.writeHead(308, { Location: url.pathname + '/' }); return res.end(); }
    p = path.join(p, 'index.html');
  }
  if (!fs.existsSync(p)) { res.statusCode = 404; p = path.join(DIST, '404.html'); }
  res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream');
  fs.createReadStream(p).pipe(res);
}).listen(port, () => console.log('http://localhost:' + port));
