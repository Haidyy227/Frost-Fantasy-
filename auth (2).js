'use strict';
const db = require('../lib/db');
const auth = require('../lib/auth');
const geo = require('../lib/geo');
const ledger = require('../lib/ledger');
const { bad, HttpError, rateLimit, str } = require('../lib/http');

module.exports = (r, lib) => {
  r.get('/api/health', () => ({ ok: true, time: Date.now() }));
  r.get('/api/geo', (c) => c.geo);

  // DEV ONLY: pretend to be in another country so you can see the location lock
  r.post('/api/dev/geo', (c) => {
    if (!geo.DEV) throw new HttpError(404, 'Not found');
    const code = String(c.body.country || '').toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) throw bad('Country must be a 2-letter code');
    const cookie = `ff_geo=${code}; Path=/; SameSite=Lax; Max-Age=86400`;
    c.res.setHeader('Set-Cookie', [].concat(c.res.getHeader('Set-Cookie') || [], cookie));
    return { country: code };
  });

  r.get('/api/meta', (c) => {
    const s = db.data.settings;
    const { PROVIDERS } = require('../lib/seed');
    return {
      geo: c.geo, siteName: s.siteName, depositFeePct: s.depositFeePct, withdrawFeePct: s.withdrawFeePct,
      minDeposit: s.minDeposit, minWithdraw: s.minWithdraw, lotteryTicketPrice: s.lotteryTicketPrice,
      providers: Object.entries(PROVIDERS).filter(([k]) => s.providers[k]).map(([id, p]) => ({ id, name: p.name, kind: p.kind })),
    };
  });

  r.post('/api/auth/register', (c) => {
    const s = db.data.settings;
    rateLimit('reg:' + c.req.socket.remoteAddress, 10, 3600e3);
    if (!c.geo.allowed) throw new HttpError(451, `Sign-up is not available in ${c.geo.countryName || 'your location'}.`, { geo: c.geo });
    const name = str(c.body.name, 'Name', 80);
    const email = str(c.body.email, 'Email', 120).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw bad('Enter a valid email');
    const password = String(c.body.password || '');
    if (password.length < 8) throw bad('Password must be at least 8 characters');
    const phone = geo.normalizePhone(c.body.phone);
    if (!/^\+\d{8,15}$/.test(phone)) throw bad('Enter a valid phone number');
    const pc = geo.phoneCountry(phone);
    if (!pc || !geo.allowed().includes(pc)) throw bad(`Phone number must be from an enabled country (${geo.allowed().join(', ')})`);
    const dob = new Date(c.body.dob);
    if (isNaN(dob)) throw bad('Date of birth is required');
    const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600e3);
    if (age < s.minAge) throw bad(`You must be at least ${s.minAge} years old`);
    if (!c.body.terms) throw bad('Please accept the terms');
    const d = db.data;
    if (d.users.some(u => u.email === email)) throw bad('Email already registered');
    if (d.users.some(u => u.phone === phone)) throw bad('Phone already registered');
    const u = { id: db.id('user'), name, email, phone, country: pc, role: 'player', status: 'active', balance: 0, wagerReq: 0, tokenVersion: 0,
      password: auth.hashPassword(password), dob: c.body.dob, createdAt: Date.now(), lastSeen: Date.now(), signupGeo: c.geo.country };
    d.users.push(u);
    if (s.signupBonus > 0) ledger.post(u, s.signupBonus, 'bonus', null, 'Welcome bonus');
    db.save();
    auth.issue(c.res, u, c.secure);
    return { user: auth.publicUser(u) };
  });

  r.post('/api/auth/login', (c) => {
    const email = String(c.body.email || '').toLowerCase();
    rateLimit('login:' + c.req.socket.remoteAddress + ':' + email, 8, 15 * 60e3);
    const u = db.data.users.find(x => x.email === email);
    if (!u || !auth.verifyPassword(String(c.body.password || ''), u.password)) throw new HttpError(401, 'Wrong email or password');
    if (u.status === 'suspended') throw new HttpError(403, 'Account suspended. Contact support.');
    if (!c.geo.allowed && u.role !== 'admin') throw new HttpError(451, `Frost Fantasy is not available in ${c.geo.countryName || 'your location'}.`, { geo: c.geo });
    u.lastSeen = Date.now(); db.save();
    auth.issue(c.res, u, c.secure);
    return { user: auth.publicUser(u) };
  });

  r.post('/api/auth/logout', (c) => { auth.clear(c.res); return { ok: true }; });

  r.get('/api/auth/me', (c) => {
    const u = c.maybeUser();
    return { user: u ? auth.publicUser(u) : null, geo: c.geo };
  });

  r.put('/api/me', (c) => {
    const u = c.user();
    if (c.body.name !== undefined) u.name = str(c.body.name, 'Name', 80);
    db.save();
    return { user: auth.publicUser(u) };
  });

  r.post('/api/me/password', (c) => {
    const u = c.user();
    rateLimit('pw:' + u.id, 5, 3600e3);
    if (!auth.verifyPassword(String(c.body.current || ''), u.password)) throw bad('Current password is wrong');
    const n = String(c.body.next || '');
    if (n.length < 8) throw bad('New password must be at least 8 characters');
    u.password = auth.hashPassword(n);
    u.tokenVersion = (u.tokenVersion || 0) + 1; // revokes all other sessions
    db.save();
    auth.issue(c.res, u, c.secure);
    lib.audit(u, 'password.change');
    return { ok: true };
  });

  r.get('/api/me/notifications', (c) => {
    const u = c.user();
    return { items: db.data.notifications.filter(n => n.userId === u.id || n.userId === null).sort((a, b) => b.ts - a.ts).slice(0, 30) };
  });
  r.get('/api/content', () => db.data.content);
};
