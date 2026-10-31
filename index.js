'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./lib/db');
const auth = require('./lib/auth');
const geo = require('./lib/geo');
const { HttpError, createRouter, readBody } = require('./lib/http');
const { seed } = require('./lib/seed');

db.load();
seed();

const PORT = Number(process.env.PORT) || 5173;
const PUBLIC = path.join(__dirname, '..', 'public');
const router = createRouter();

function audit(user, action, detail) {
  db.data.audit.push({ id: db.id('audit'), ts: Date.now(), userId: user ? user.id : null, who: user ? user.email : 'system', action, detail: detail || '' });
  db.save();
}
const notify = (userId, title, text) => { db.data.notifications.push({ id: db.id('notif'), userId, title, text, ts: Date.now(), read: false }); db.save(); };
const ctxLib = { audit, notify };

for (const m of ['auth', 'wallet', 'sports', 'fantasy', 'lottery', 'admin']) require('./routes/' + m)(router, ctxLib);

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

function secHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
}
function json(res, status, obj) {
  const b = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(b) });
  res.end(b);
}

// endpoints reachable even from a blocked country
const GEO_OPEN = [/^\/api\/health$/, /^\/api\/geo$/, /^\/api\/dev\/geo$/, /^\/api\/auth\/(me|login|logout)$/, /^\/api\/webhooks\//, /^\/api\/agent\//];

async function handleApi(req, res, url) {
  const m = router.match(req.method, url.pathname);
  if (!m) throw new HttpError(404, 'Not found');
  const secure = (req.headers['x-forwarded-proto'] || '').includes('https');

  if (req.method !== 'GET') {
    const origin = req.headers.origin;
    if (origin && !url.pathname.startsWith('/api/webhooks') && !url.pathname.startsWith('/api/agent')) {
      let ok = false; try { ok = new URL(origin).host === req.headers.host; } catch (e) {}
      if (!ok) throw new HttpError(403, 'Bad origin');
    }
  }
  const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? await readBody(req) : {};
  const query = Object.fromEntries(url.searchParams);
  const ctx = {
    req, res, body, query, params: m.params, secure, geo: geo.status(req),
    user: () => auth.requireUser(req), admin: () => auth.requireAdmin(req), maybeUser: () => auth.currentUser(req), lib: ctxLib,
  };

  // geo + maintenance gate (admins bypass)
  if (!GEO_OPEN.some(r => r.test(url.pathname))) {
    const u = auth.currentUser(req);
    const isAdmin = u && u.role === 'admin';
    if (!ctx.geo.allowed && !isAdmin) throw new HttpError(451, `Frost Fantasy is not available in your location (${ctx.geo.countryName || 'unknown'}).`, { geo: ctx.geo });
    if (db.data.settings.maintenance && !isAdmin) throw new HttpError(503, 'Down for maintenance, back soon.');
  }
  for (const h of m.handlers) {
    const out = await h(ctx);
    if (out !== undefined) return json(res, 200, out);
  }
  json(res, 204, {});
}

function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': ext === '.html' ? 'no-cache' : 'no-cache' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  secHeaders(res);
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    serveStatic(req, res, url);
  } catch (e) {
    if (e instanceof HttpError) return json(res, e.status, Object.assign({ error: e.message }, e.extra || {}));
    console.error(e);
    json(res, 500, { error: 'Something went wrong' });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`\n  Frost Fantasy running → http://localhost:${PORT}`);
    console.log(`  Player: player@frost.local / Player123!`);
    console.log(`  Admin : admin@frost.local  / Admin123!`);
    console.log(`  Mode  : ${geo.DEV ? 'development (location simulator ON)' : 'production'}\n`);
  });
}
module.exports = { server, db };
