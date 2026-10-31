'use strict';
const crypto = require('crypto');
const db = require('../lib/db');
const auth = require('../lib/auth');
const ledger = require('../lib/ledger');
const pay = require('../lib/payments');
const betting = require('../lib/betting');
const F = require('../lib/fantasy');
const L = require('../lib/lottery');
const geo = require('../lib/geo');
const { PROVIDERS } = require('../lib/seed');
const { bad, int, str, HttpError } = require('../lib/http');

const find = (arr, id, what) => { const x = arr.find(i => i.id === Number(id)); if (!x) throw new HttpError(404, what + ' not found'); return x; };
const userOf = id => db.data.users.find(x => x.id === id) || {};
const num = (v, name) => { const n = Number(v); if (v === '' || v === null || !isFinite(n)) throw bad(name + ' must be a number'); return n; };
const odd = (v, name) => { const n = num(v, name); if (n < 1.01 || n > 1000) throw bad(`${name} must be between 1.01 and 1000`); return Math.round(n * 100) / 100; };
const ts = (v, name) => { const t = typeof v === 'number' ? v : Date.parse(v); if (!isFinite(t)) throw bad(name + ' is not a valid date'); return t; };

function readFixture(b, base = {}) {
  const o = b.odds || {}, bo = base.odds || {};
  return {
    league: str(b.league !== undefined ? b.league : base.league, 'League', 80),
    home: str(b.home !== undefined ? b.home : base.home, 'Home team', 60),
    away: str(b.away !== undefined ? b.away : base.away, 'Away team', 60),
    kickoff: ts(b.kickoff !== undefined ? b.kickoff : base.kickoff, 'Kick-off'),
    odds: { h: odd(o.h !== undefined ? o.h : bo.h, 'Home odds'), d: odd(o.d !== undefined ? o.d : bo.d, 'Draw odds'), a: odd(o.a !== undefined ? o.a : bo.a, 'Away odds') },
  };
}
const margin = f => Math.round((1 / f.odds.h + 1 / f.odds.d + 1 / f.odds.a - 1) * 1000) / 10;
const fxAdmin = f => Object.assign({}, f, { margin: margin(f), bets: db.data.bets.filter(b => b.legs.some(l => l.fixtureId === f.id)).length });

const PAYOUT_TYPES = ['bet_win', 'bet_refund', 'prop_win', 'prop_refund', 'contest_prize', 'contest_refund', 'lottery_win', 'prediction_win'];
const PRODUCTS = [['Sportsbook', 'bet_stake', ['bet_win', 'bet_refund']], ['Line-up props', 'prop_stake', ['prop_win', 'prop_refund']], ['Contests', 'contest_fee', ['contest_prize', 'contest_refund']], ['Lottery', 'lottery_ticket', ['lottery_win']], ['Predict & Win', null, ['prediction_win']]];

module.exports = (r, lib) => {
  const A = (fn) => (c) => { c.adminUser = c.admin(); return fn(c); };
  const put = (path, fn) => { r.put(path, A(fn)); r.patch(path, A(fn)); };

  // ---------- agent endpoint (drafts only) ----------
  const agentAuth = (c) => {
    const h = String(c.req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const a = Buffer.from(h), b = Buffer.from(db.data.settings.agentToken);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new HttpError(401, 'Bad agent token');
  };
  r.post('/api/agent/fixtures', (c) => {
    agentAuth(c);
    const list = Array.isArray(c.body.fixtures) ? c.body.fixtures : [];
    if (!list.length || list.length > 200) throw bad('Send 1–200 fixtures');
    const made = [], skipped = [];
    list.forEach((x, i) => {
      let f; try { f = readFixture(x); } catch (e) { skipped.push(`#${i + 1}: ${e.message}`); return; }
      if (db.data.fixtures.some(y => y.home === f.home && y.away === f.away && Math.abs(y.kickoff - f.kickoff) < 6 * 3600e3 && !['settled', 'void'].includes(y.status))) { skipped.push(`#${i + 1}: duplicate`); return; }
      const rec = Object.assign({ id: db.id('fixture'), status: 'draft', score: null, source: 'agent', createdAt: Date.now() }, f);
      db.data.fixtures.push(rec); made.push(rec.id);
    });
    lib.audit(null, 'agent.upload', `${made.length} drafts, ${skipped.length} skipped`);
    db.save();
    return { created: made.length, ids: made, skipped, note: 'Drafts only. An admin must review and publish them.' };
  });
  r.get('/api/agent/fixtures', (c) => { agentAuth(c); return { fixtures: db.data.fixtures.filter(f => f.status === 'draft') }; });

  // ---------- dashboard ----------
  r.get('/api/admin/dashboard', A(() => {
    const d = db.data, now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 11 + i, 1));
    const idx = t => { const x = new Date(t); const k = (x.getFullYear() - months[0].getFullYear()) * 12 + x.getMonth() - months[0].getMonth(); return k >= 0 && k < 12 ? k : -1; };
    const dep = Array(12).fill(0), fee = Array(12).fill(0);
    let deposits = 0, fees = 0;
    for (const p of d.payments) {
      if (p.status !== 'completed') continue;
      const f = p.type === 'deposit' ? p.fee : p.fee; const k = idx(p.createdAt);
      fees += f; if (p.type === 'deposit') deposits += p.amount;
      if (k >= 0) { fee[k] += f; if (p.type === 'deposit') dep[k] += p.amount; }
    }
    return {
      users: d.users.filter(u => u.role === 'player').length, openBets: d.bets.filter(b => b.status === 'open').length,
      pointsInWallets: d.users.reduce((s, u) => s + u.balance, 0), deposits, fees,
      pendingWithdrawals: d.payments.filter(p => p.type === 'withdrawal' && p.status === 'pending').length,
      draftFixtures: d.fixtures.filter(f => f.status === 'draft').length,
      depositsByMonth: dep, feesByMonth: fee, months: months.map(m => m.toLocaleString('en', { month: 'short' })),
      ledgerOk: ledger.audit().length === 0, newUsers7d: d.users.filter(u => Date.now() - u.createdAt < 7 * 864e5 && u.role === 'player').length,
    };
  }));

  // ---------- users ----------
  r.get('/api/admin/users', A((c) => ({ users: db.data.users.map(u => Object.assign(auth.publicUser(u), { lastSeen: u.lastSeen })) })));
  put('/api/admin/users/:id', (c) => {
    const u = find(db.data.users, c.params.id, 'User');
    if (c.body.status) { if (!['active', 'suspended'].includes(c.body.status)) throw bad('Bad status'); if (u.id === c.adminUser.id) throw bad("You can't suspend yourself"); u.status = c.body.status; u.tokenVersion++; }
    if (c.body.role) { if (!['player', 'admin'].includes(c.body.role)) throw bad('Bad role'); if (u.id === c.adminUser.id) throw bad("You can't change your own role"); u.role = c.body.role; }
    lib.audit(c.adminUser, 'user.update', `${u.email} ${JSON.stringify(c.body)}`); db.save();
    return auth.publicUser(u);
  });
  r.post('/api/admin/users/:id/adjust', A((c) => {
    const u = find(db.data.users, c.params.id, 'User');
    const amt = int(c.body.amount, 'Amount'); if (!amt) throw bad('Amount cannot be 0');
    ledger.post(u, amt, 'adjustment', null, str(c.body.note, 'Reason', 120));
    lib.audit(c.adminUser, 'points.adjust', `${u.email} ${amt}`);
    return auth.publicUser(u);
  }));

  // ---------- odds desk ----------
  r.get('/api/admin/fixtures', A(() => ({ fixtures: db.data.fixtures.slice().sort((a, b) => b.kickoff - a.kickoff).map(fxAdmin), agentToken: db.data.settings.agentToken })));
  r.post('/api/admin/fixtures', A((c) => {
    const st = ['draft', 'open'].includes(c.body.status) ? c.body.status : 'draft';
    const f = Object.assign({ id: db.id('fixture'), status: st, score: null, source: 'admin', createdAt: Date.now() }, readFixture(c.body));
    db.data.fixtures.push(f); lib.audit(c.adminUser, 'fixture.create', `${f.home} v ${f.away} (${st})`); db.save();
    return fxAdmin(f);
  }));
  put('/api/admin/fixtures/:id', (c) => {
    const f = find(db.data.fixtures, c.params.id, 'Match');
    if (['settled', 'void'].includes(f.status)) throw bad('Settled matches cannot be edited');
    Object.assign(f, readFixture(c.body, f));
    if (c.body.status) { if (!['draft', 'open', 'live', 'closed'].includes(c.body.status)) throw bad('Bad status'); f.status = c.body.status; }
    lib.audit(c.adminUser, 'fixture.update', `#${f.id} ${f.odds.h}/${f.odds.d}/${f.odds.a} ${f.status}`); db.save();
    return fxAdmin(f);
  });
  r.post('/api/admin/fixtures/bulk-publish', A((c) => {
    let n = 0; for (const f of db.data.fixtures) if (f.status === 'draft') { f.status = 'open'; n++; }
    lib.audit(c.adminUser, 'fixture.bulk-publish', `${n} matches`); db.save(); return { published: n };
  }));
  r.post('/api/admin/fixtures/:id/publish', A((c) => {
    const f = find(db.data.fixtures, c.params.id, 'Match');
    if (f.status !== 'draft') throw bad('Only drafts can be published');
    f.status = 'open'; lib.audit(c.adminUser, 'fixture.publish', `#${f.id}`); db.save(); return fxAdmin(f);
  }));
  r.post('/api/admin/fixtures/:id/settle', A((c) => {
    const f = find(db.data.fixtures, c.params.id, 'Match');
    betting.settleFixture(f, c.body.score, false);
    lib.audit(c.adminUser, 'fixture.settle', `#${f.id} ${f.score}`); return fxAdmin(f);
  }));
  r.post('/api/admin/fixtures/:id/void', A((c) => {
    const f = find(db.data.fixtures, c.params.id, 'Match');
    betting.settleFixture(f, null, true);
    lib.audit(c.adminUser, 'fixture.void', `#${f.id}`); return fxAdmin(f);
  }));
  r.del('/api/admin/fixtures/:id', A((c) => {
    const f = find(db.data.fixtures, c.params.id, 'Match');
    if (fxAdmin(f).bets) throw bad('This match has bets; void it instead');
    db.data.fixtures.splice(db.data.fixtures.indexOf(f), 1); lib.audit(c.adminUser, 'fixture.delete', `#${f.id}`); db.save(); return { ok: true };
  }));
  r.post('/api/admin/agent-token', A((c) => {
    db.data.settings.agentToken = crypto.randomBytes(24).toString('hex'); lib.audit(c.adminUser, 'agent.rotate'); db.save();
    return { agentToken: db.data.settings.agentToken };
  }));

  // ---------- fantasy ----------
  r.get('/api/admin/players', A(() => ({ players: db.data.players })));
  r.post('/api/admin/players', A((c) => {
    const p = { id: 'p' + (db.id('player') + 100), name: str(c.body.name, 'Name', 60), pos: str(c.body.pos, 'Position', 30), club: String(c.body.club || '').slice(0, 40), price: int(c.body.price || 2000, 'Price'), skin: c.body.skin === 'light' ? 'light' : 'dark' };
    db.data.players.push(p); db.save(); return p;
  }));
  r.get('/api/admin/props', A(() => ({ props: db.data.props.slice().sort((a, b) => b.id - a.id).map(p => Object.assign({}, p, { player: (db.data.players.find(x => x.id === p.playerId) || {}).name, entries: db.data.propEntries.filter(e => e.legs.some(l => l.propId === p.id)).length })) })));
  r.post('/api/admin/props', A((c) => {
    const pl = db.data.players.find(p => p.id === c.body.playerId); if (!pl) throw bad('Choose a player');
    const p = { id: db.id('prop'), playerId: pl.id, stat: str(c.body.stat, 'Stat', 40), line: num(c.body.line, 'Line'), kickoff: ts(c.body.kickoff, 'Kick-off'), match: String(c.body.match || '').slice(0, 60), status: 'open', actual: null };
    db.data.props.push(p); lib.audit(c.adminUser, 'prop.create', `#${p.id} ${pl.name} ${p.stat} ${p.line}`); db.save(); return p;
  }));
  r.post('/api/admin/props/:id/settle', A((c) => { const p = find(db.data.props, c.params.id, 'Prop'); F.settleProp(p, c.body.actual); lib.audit(c.adminUser, 'prop.settle', `#${p.id} ${p.actual}`); return p; }));
  r.post('/api/admin/props/:id/void', A((c) => { const p = find(db.data.props, c.params.id, 'Prop'); F.voidProp(p); lib.audit(c.adminUser, 'prop.void', `#${p.id}`); return p; }));

  r.get('/api/admin/contests', A(() => ({ contests: db.data.contests.slice().sort((a, b) => b.id - a.id).map(c => Object.assign({}, c, { entries: db.data.contestEntries.filter(e => e.contestId === c.id).length, prizePool: F.prizePool(c) })) })));
  r.post('/api/admin/contests', A((c) => {
    const ct = { id: db.id('contest'), name: str(c.body.name, 'Name', 60), entryFee: int(c.body.entryFee, 'Entry fee'), maxEntries: int(c.body.maxEntries || 100, 'Max entries'), startsAt: ts(c.body.startsAt, 'Start'), status: 'open', playerScores: {}, createdAt: Date.now() };
    if (ct.entryFee < 100) throw bad('Entry fee must be at least 100');
    db.data.contests.push(ct); lib.audit(c.adminUser, 'contest.create', ct.name); db.save(); return ct;
  }));
  r.post('/api/admin/contests/:id/settle', A((c) => { const ct = find(db.data.contests, c.params.id, 'Contest'); F.settleContest(ct, c.body.playerScores || {}); lib.audit(c.adminUser, 'contest.settle', ct.name); return ct; }));

  r.get('/api/admin/teams', A(() => ({ teams: db.data.teams.slice().sort((a, b) => b.id - a.id).map(t => ({ id: t.id, name: t.name, owner: userOf(t.userId).name, formation: t.formation, cost: t.cost, players: t.playerIds.length, createdAt: t.createdAt })) })));
  r.get('/api/admin/teams/:id', A((c) => {
    const t = find(db.data.teams, c.params.id, 'Team'), o = userOf(t.userId);
    return { team: { id: t.id, name: t.name, formation: t.formation, cost: t.cost, captain: t.captain, owner: o.name, email: o.email, players: t.playerIds.map(i => db.data.players.find(p => p.id === i)).filter(Boolean) } };
  }));

  r.get('/api/admin/prediction', A(() => ({ categories: db.data.predCats.slice().sort((a, b) => b.id - a.id).map(p => Object.assign({}, p, { picks: db.data.predictions.filter(x => x.catId === p.id).length })) })));
  r.post('/api/admin/prediction', A((c) => {
    const opts = (Array.isArray(c.body.options) ? c.body.options : String(c.body.options || '').split(',')).map(s => String(s).trim()).filter(Boolean);
    if (opts.length < 2 || opts.length > 8) throw bad('Give 2–8 options');
    const p = { id: db.id('predcat'), title: str(c.body.title, 'Question', 120), options: opts, reward: int(c.body.reward, 'Reward'), closesAt: ts(c.body.closesAt, 'Closing time'), status: 'open', correct: null };
    db.data.predCats.push(p); lib.audit(c.adminUser, 'prediction.create', p.title); db.save(); return p;
  }));
  r.post('/api/admin/prediction/:id/settle', A((c) => { const p = find(db.data.predCats, c.params.id, 'Category'); F.settlePred(p, c.body.correct); lib.audit(c.adminUser, 'prediction.settle', p.title); return p; }));

  // ---------- lottery ----------
  r.get('/api/admin/lottery', A(() => {
    const cur = L.currentDraw();
    const draws = db.data.draws.slice().sort((a, b) => b.id - a.id).slice(0, 25).map(d => ({
      id: d.id, status: d.status, commit: d.commit, closesAt: d.closesAt, ticketPrice: d.ticketPrice, numbers: d.numbers, drawnAt: d.drawnAt, winners: d.winners || 0,
      tickets: db.data.tickets.filter(t => t.drawId === d.id).length, verified: d.status === 'drawn' && L.sha(d.seed) === d.commit && L.derive(d.seed).join() === d.numbers.join(),
    }));
    return { draws, currentId: cur.id };
  }));
  r.post('/api/admin/lottery/conduct', A((c) => { const d = L.conductDraw(L.currentDraw()); lib.audit(c.adminUser, 'lottery.draw', `#${d.id} ${d.numbers.join('-')}`); return { draw: L.view(d) }; }));
  r.post('/api/admin/lottery/schedule', A((c) => { const d = L.currentDraw(); d.closesAt = ts(c.body.closesAt, 'Closing time'); lib.audit(c.adminUser, 'lottery.schedule', new Date(d.closesAt).toISOString()); db.save(); return { draw: L.view(d) }; }));

  // ---------- payments ----------
  r.get('/api/admin/payments', A(() => ({ payments: db.data.payments.slice().sort((a, b) => b.id - a.id).map(p => { const u = userOf(p.userId); return Object.assign({}, p, { name: u.name, email: u.email, providerName: (PROVIDERS[p.provider] || {}).name }); }) })));
  r.post('/api/admin/payments/:id/approve', A((c) => { const p = find(db.data.payments, c.params.id, 'Payment'); if (p.type === 'deposit') pay.confirmDeposit(p, 'ADMIN'); else pay.approveWithdrawal(p); lib.audit(c.adminUser, p.type + '.approve', p.ref); return p; }));
  r.post('/api/admin/payments/:id/reject', A((c) => { const p = find(db.data.payments, c.params.id, 'Payment'); if (p.status !== 'pending') throw bad('Already processed'); pay.failPayment(p, 'Rejected by admin'); lib.audit(c.adminUser, p.type + '.reject', p.ref); return p; }));

  // ---------- settings ----------
  const NUMERIC = ['minAge', 'depositFeePct', 'withdrawFeePct', 'minDeposit', 'maxDeposit', 'minWithdraw', 'maxWithdraw', 'maxStake', 'maxPayout', 'contestRakePct', 'lotteryTicketPrice', 'signupBonus', 'lightPayMultiplier', 'highPayMultiplier'];
  r.get('/api/admin/settings', A(() => {
    const s = Object.assign({}, db.data.settings); delete s.webhookSecret; delete s.agentToken;
    return { settings: s, providers: PROVIDERS, webhookSecret: db.data.settings.webhookSecret };
  }));
  put('/api/admin/settings', (c) => {
    const s = db.data.settings, b = c.body;
    for (const k of NUMERIC) if (b[k] !== undefined && !Number.isNaN(b[k])) { const n = num(b[k], k); if (n < 0) throw bad(k + ' cannot be negative'); if (k.endsWith('Pct') && n > 50) throw bad(k + ' is too high'); s[k] = n; }
    if (b.allowedCountries) { if (!Array.isArray(b.allowedCountries) || !b.allowedCountries.length || !b.allowedCountries.every(x => /^[A-Za-z]{2}$/.test(x))) throw bad('Use 2-letter country codes, at least one'); s.allowedCountries = b.allowedCountries.map(x => x.toUpperCase()); }
    if (b.providers) for (const k of Object.keys(s.providers)) if (b.providers[k] !== undefined) s.providers[k] = !!b.providers[k];
    for (const k of ['withdrawTurnover', 'maintenance']) if (b[k] !== undefined) s[k] = !!b[k];
    lib.audit(c.adminUser, 'settings.update', Object.keys(b).join(',')); db.save();
    return { ok: true };
  });

  // ---------- notify / content / audit / antifraud / reports ----------
  r.post('/api/admin/notify', A((c) => {
    const n = { id: db.id('notif'), userId: null, title: str(c.body.title, 'Title', 80), text: str(c.body.text, 'Message', 500), ts: Date.now(), read: false };
    db.data.notifications.push(n); lib.audit(c.adminUser, 'notify', n.title); db.save(); return n;
  }));
  put('/api/admin/content', (c) => {
    const ct = db.data.content;
    if (c.body.faq) ct.faq = c.body.faq.slice(0, 30).map(x => ({ q: String(x.q).slice(0, 200), a: String(x.a).slice(0, 2000) }));
    if (c.body.support) ct.support = { email: String(c.body.support.email || '').slice(0, 100), phone: String(c.body.support.phone || '').slice(0, 40) };
    if (c.body.weekly !== undefined) ct.weekly = String(c.body.weekly).slice(0, 1500);
    lib.audit(c.adminUser, 'content.update', Object.keys(c.body).join(',')); db.save(); return ct;
  });
  r.get('/api/admin/audit', A(() => ({ items: db.data.audit.slice(-200).reverse() })));

  r.get('/api/admin/antifraud', A(() => {
    const flags = [], d = db.data;
    for (const u of d.users.filter(x => x.role === 'player')) {
      const row = (rule, detail) => flags.push({ userId: u.id, name: u.name, email: u.email, rule, detail });
      const pays = d.payments.filter(p => p.userId === u.id);
      const failed = pays.filter(p => p.type === 'deposit' && p.status === 'failed').length;
      if (failed >= 3) row('Repeated failed deposits', `${failed} failed deposits`);
      const early = pays.find(p => p.type === 'withdrawal' && p.createdAt - u.createdAt < 3600e3);
      if (early) row('Withdrawal within 1h of sign-up', early.ref);
      const dep = pays.filter(p => p.type === 'deposit' && p.status === 'completed').reduce((s, p) => s + p.amount, 0);
      const won = d.ledger.filter(l => l.userId === u.id && /_win$|_prize$/.test(l.type)).reduce((s, l) => s + l.amount, 0);
      if (dep > 0 && won > dep * 20) row('Winnings above 20× deposits', `${won} won vs ${dep} deposited`);
      if (u.signupGeo && !geo.allowed().includes(u.signupGeo)) row('Sign-up from a non-allowed country', u.signupGeo);
      if (d.users.some(x => x.id !== u.id && x.phone === u.phone)) row('Phone shared with another account', u.phone);
    }
    return { flags };
  }));

  r.get('/api/admin/reports', A(() => {
    const d = db.data, sum = (types) => d.ledger.filter(l => types.includes(l.type)).reduce((s, l) => s + l.amount, 0);
    const done = (type) => d.payments.filter(p => p.type === type && p.status === 'completed');
    return {
      deposits: done('deposit').reduce((s, p) => s + p.amount, 0), depositFees: done('deposit').reduce((s, p) => s + p.fee, 0),
      withdrawals: done('withdrawal').reduce((s, p) => s + p.amount, 0), withdrawFees: done('withdrawal').reduce((s, p) => s + p.fee, 0),
      liability: d.users.reduce((s, u) => s + u.balance, 0),
      products: PRODUCTS.map(([product, stakeType, payTypes]) => { const stakes = stakeType ? -sum([stakeType]) : 0, payouts = sum(payTypes); return { product, stakes, payouts, ggr: stakes - payouts }; }),
    };
  }));
};
