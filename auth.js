'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { HttpError } = require('./http');

const SECRET_FILE = path.join(path.dirname(db.FILE), '.secret');
function secret() {
  if (process.env.FF_SECRET) return process.env.FF_SECRET;
  try { return fs.readFileSync(SECRET_FILE, 'utf8'); } catch (e) {}
  const s = crypto.randomBytes(32).toString('hex');
  fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
  fs.writeFileSync(SECRET_FILE, s, { mode: 0o600 });
  return s;
}
let SECRET;
const getSecret = () => SECRET || (SECRET = secret());

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw, salt, 64);
  return salt.toString('hex') + ':' + h.toString('hex');
}
function verifyPassword(pw, stored) {
  const [s, h] = String(stored).split(':');
  if (!s || !h) return false;
  const calc = crypto.scryptSync(pw, Buffer.from(s, 'hex'), 64);
  const want = Buffer.from(h, 'hex');
  return want.length === calc.length && crypto.timingSafeEqual(calc, want);
}

const b64 = b => Buffer.from(b).toString('base64url');
function sign(payload) {
  const body = b64(JSON.stringify(payload));
  const mac = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return body + '.' + mac;
}
function unsign(token) {
  const [body, mac] = String(token || '').split('.');
  if (!body || !mac) return null;
  const want = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  const a = Buffer.from(mac), b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString()); } catch (e) { return null; }
}

const TTL = 7 * 24 * 3600e3;
function issue(res, user, secure) {
  const t = sign({ u: user.id, v: user.tokenVersion || 0, exp: Date.now() + TTL });
  addCookie(res, `ff_session=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${TTL / 1000}${secure ? '; Secure' : ''}`);
}
function clear(res) { addCookie(res, 'ff_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'); }
function addCookie(res, c) { const prev = res.getHeader('Set-Cookie') || []; res.setHeader('Set-Cookie', [].concat(prev, c)); }

function parseCookies(req) {
  const out = {};
  for (const p of String(req.headers.cookie || '').split(';')) {
    const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  }
  return out;
}
function currentUser(req) {
  if (req._user !== undefined) return req._user;
  const t = unsign(parseCookies(req).ff_session);
  let u = null;
  if (t && t.exp > Date.now()) {
    u = db.data.users.find(x => x.id === t.u) || null;
    if (u && ((u.tokenVersion || 0) !== t.v || u.status === 'suspended')) u = null;
  }
  return (req._user = u);
}
const requireUser = (req) => { const u = currentUser(req); if (!u) throw new HttpError(401, 'Please sign in'); return u; };
const requireAdmin = (req) => { const u = requireUser(req); if (u.role !== 'admin') throw new HttpError(403, 'Admin only'); return u; };

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, country: u.country, role: u.role, balance: u.balance, status: u.status, createdAt: u.createdAt, wagerReq: u.wagerReq || 0, avatar: u.avatar || null };
}

module.exports = { hashPassword, verifyPassword, sign, unsign, issue, clear, parseCookies, currentUser, requireUser, requireAdmin, publicUser, getSecret };
