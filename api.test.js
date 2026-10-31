'use strict';
// API test: boots the server on a temp DB and walks every money path. Run: npm test
process.env.FF_DB = require('path').join(require('os').tmpdir(), 'ff-test-' + Date.now() + '.json');
const assert = require('assert');
const crypto = require('crypto');
const { server, db } = require('../server/index');
const ledger = require('../server/lib/ledger');
const L = require('../server/lib/lottery');

let base; const jars = {};
async function call(who, method, path, body, extraHeaders = {}) {
  const jar = jars[who] || (jars[who] = {});
  const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
  const res = await fetch(base + path, { method, headers: Object.assign({ 'Content-Type': 'application/json', cookie }, extraHeaders), body: body ? JSON.stringify(body) : undefined });
  for (const sc of res.headers.getSetCookie()) { const [kv] = sc.split(';'); const i = kv.indexOf('='); const v = kv.slice(i + 1); if (/Max-Age=0/.test(sc)) delete jar[kv.slice(0, i)]; else jar[kv.slice(0, i)] = v; }
  const txt = await res.text(); let json = {}; try { json = JSON.parse(txt); } catch (e) {}
  return { status: res.status, body: json };
}
let n = 0, failed = 0;
async function t(name, fn) { try { await fn(); n++; console.log('  ✓', name); } catch (e) { failed++; console.log('  ✗', name, '\n    ', e.message); } }
const ok = (r, s = 200) => assert.strictEqual(r.status, s, `expected ${s} got ${r.status}: ${JSON.stringify(r.body)}`);
const future = h => Date.now() + h * 3600e3;

(async () => {
  await new Promise(r => server.listen(0, r)); base = 'http://localhost:' + server.address().port;
  const s = db.data.settings;

  await t('geo: Niger allowed, France blocked (451), admin bypass', async () => {
    ok(await call('p', 'GET', '/api/geo'));
    await call('fr', 'POST', '/api/dev/geo', { country: 'FR' });
    ok(await call('fr', 'GET', '/api/fixtures'), 451);
    ok(await call('fr', 'POST', '/api/auth/login', { email: 'player@frost.local', password: 'Player123!' }), 451);
    ok(await call('fr', 'POST', '/api/auth/login', { email: 'admin@frost.local', password: 'Admin123!' }));
    ok(await call('fr', 'GET', '/api/admin/dashboard'));
  });
  await t('register: validates age, phone country, password', async () => {
    const good = { name: 'Test Player', email: 't@x.com', phone: '96111222', password: 'Password1', dob: '1995-01-01', terms: true };
    ok(await call('x', 'POST', '/api/auth/register', Object.assign({}, good, { dob: '2015-01-01' })), 400);
    ok(await call('x', 'POST', '/api/auth/register', Object.assign({}, good, { phone: '+33612345678' })), 400);
    ok(await call('x', 'POST', '/api/auth/register', Object.assign({}, good, { password: 'short' })), 400);
    const r = await call('x', 'POST', '/api/auth/register', good); ok(r);
    assert.strictEqual(r.body.user.phone, '+22796111222');
    ok(await call('x', 'POST', '/api/auth/register', good), 400); // duplicate
  });
  await t('login: wrong password 401, right one works, /me', async () => {
    ok(await call('p', 'POST', '/api/auth/login', { email: 'player@frost.local', password: 'nope' }), 401);
    ok(await call('p', 'POST', '/api/auth/login', { email: 'player@frost.local', password: 'Player123!' }));
    assert.strictEqual((await call('p', 'GET', '/api/auth/me')).body.user.email, 'player@frost.local');
    ok(await call('anon', 'GET', '/api/wallet'), 401);
    ok(await call('p', 'GET', '/api/admin/dashboard'), 403);
    ok(await call('adm', 'POST', '/api/auth/login', { email: 'admin@frost.local', password: 'Admin123!' }));
  });
  await t('deposit: fee added, points credited once (idempotent), turnover set', async () => {
    const q = await call('x', 'GET', '/api/wallet/quote?type=deposit&amount=10000'); ok(q);
    assert.deepStrictEqual([q.body.fee, q.body.points], [300, 9700]);
    ok(await call('x', 'POST', '/api/wallet/deposit', { provider: 'wave', amount: 100 }), 400);
    ok(await call('x', 'POST', '/api/wallet/deposit', { provider: 'bitcoin', amount: 10000 }), 400);
    const d = await call('x', 'POST', '/api/wallet/deposit', { provider: 'wave', amount: 10000 }); ok(d);
    assert.strictEqual((await call('x', 'GET', '/api/wallet')).body.balance, 0);
    ok(await call('x', 'POST', `/api/dev/payments/${d.body.payment.id}/confirm`));
    ok(await call('x', 'POST', `/api/dev/payments/${d.body.payment.id}/confirm`)); // repeat
    const w = (await call('x', 'GET', '/api/wallet')).body;
    assert.strictEqual(w.balance, 9700); assert.strictEqual(w.wagerReq, 9700);
  });
  await t('webhook: bad signature rejected, good signature confirms', async () => {
    const d = await call('x', 'POST', '/api/wallet/deposit', { provider: 'nita', amount: 1000 }); ok(d);
    ok(await call('anon', 'POST', '/api/webhooks/payment', { reference: d.body.payment.ref, status: 'success' }, { 'x-signature': 'bad' }), 401);
    const sig = crypto.createHmac('sha256', s.webhookSecret).update(`${d.body.payment.ref}|success`).digest('hex');
    ok(await call('anon', 'POST', '/api/webhooks/payment', { reference: d.body.payment.ref, status: 'success' }, { 'x-signature': sig }));
    assert.strictEqual((await call('x', 'GET', '/api/wallet')).body.balance, 9700 + 970);
  });
  await t('odds desk: agent drafts, publish, bet, settle, payout', async () => {
    const fx = { league: 'Test', home: 'AAA', away: 'BBB', kickoff: future(5), odds: { h: 2.0, d: 3.0, a: 4.0 } };
    ok(await call('anon', 'POST', '/api/agent/fixtures', { fixtures: [fx] }, { authorization: 'Bearer wrong' }), 401);
    const up = await call('anon', 'POST', '/api/agent/fixtures', { fixtures: [fx, Object.assign({}, fx, { home: 'CCC', away: 'DDD', odds: { h: 1.5, d: 3, a: 6 } })] }, { authorization: 'Bearer ' + s.agentToken }); ok(up);
    assert.strictEqual(up.body.created, 2);
    const [a, b] = up.body.ids;
    assert.ok(!(await call('p', 'GET', '/api/fixtures')).body.fixtures.some(f => f.id === a), 'drafts must be hidden');
    ok(await call('p', 'POST', '/api/bets', { selections: [{ fixtureId: a, pick: 'h' }], stake: 500 }), 400);
    ok(await call('adm', 'POST', `/api/admin/fixtures/${a}/publish`)); ok(await call('adm', 'POST', `/api/admin/fixtures/${b}/publish`));
    const before = (await call('p', 'GET', '/api/auth/me')).body.user.balance;
    const bet = await call('p', 'POST', '/api/bets', { selections: [{ fixtureId: a, pick: 'h' }, { fixtureId: b, pick: 'h' }], stake: 1000 }); ok(bet);
    assert.strictEqual(bet.body.bet.totalOdds, 3); // 2.0*1.5
    ok(await call('adm', 'PUT', `/api/admin/fixtures/${a}`, { odds: { h: 9, d: 3, a: 4 } })); // odds change must not touch the placed bet
    ok(await call('adm', 'POST', `/api/admin/fixtures/${a}/settle`, { score: '2-1' }));
    ok(await call('adm', 'POST', `/api/admin/fixtures/${b}/settle`, { score: '3-0' }));
    const after = (await call('p', 'GET', '/api/auth/me')).body.user.balance;
    assert.strictEqual(after, before - 1000 + 3000);
    ok(await call('adm', 'POST', `/api/admin/fixtures/${b}/settle`, { score: '3-0' }), 400);
  });
  await t('bet limits', async () => {
    const f = (await call('p', 'GET', '/api/fixtures')).body.fixtures.find(x => x.status === 'open');
    ok(await call('p', 'POST', '/api/bets', { selections: [{ fixtureId: f.id, pick: 'h' }], stake: 99 }), 400);
    ok(await call('p', 'POST', '/api/bets', { selections: [{ fixtureId: f.id, pick: 'h' }], stake: 10_000_000 }), 400);
    ok(await call('p', 'POST', '/api/bets', { selections: [{ fixtureId: f.id, pick: 'h' }], stake: 5_000_000 }), 400);
    ok(await call('x', 'POST', '/api/bets', { selections: [{ fixtureId: f.id, pick: 'h' }], stake: 50000 }), 402); // not enough points
  });
  await t('turnover then withdraw: hold, reject refunds, approve completes', async () => {
    ok(await call('x', 'POST', '/api/wallet/withdraw', { provider: 'wave', points: 2000 }), 400); // still owes turnover
    const f = (await call('p', 'GET', '/api/fixtures')).body.fixtures.find(x => x.status === 'open');
    ok(await call('x', 'POST', '/api/bets', { selections: [{ fixtureId: f.id, pick: 'd' }], stake: 10670 - 1 > 10670 ? 1 : 10670 })); // wager all points
    db.data.users.find(u => u.email === 't@x.com').balance += 0;
    assert.strictEqual((await call('x', 'GET', '/api/wallet')).body.wagerReq, 0);
    ok(await call('adm', 'POST', `/api/admin/users/${db.data.users.find(u => u.email === 't@x.com').id}/adjust`, { amount: 5000, note: 'test top-up' }));
    const w = await call('x', 'POST', '/api/wallet/withdraw', { provider: 'wave', points: 3000 }); ok(w);
    assert.deepStrictEqual([w.body.payment.fee, w.body.payment.amount], [60, 2940]);
    assert.strictEqual(w.body.balance, 2000);
    ok(await call('adm', 'POST', `/api/admin/payments/${w.body.payment.id}/reject`, { reason: 'test' }));
    assert.strictEqual((await call('x', 'GET', '/api/wallet')).body.balance, 5000);
    const w2 = await call('x', 'POST', '/api/wallet/withdraw', { provider: 'airtel', points: 2000 }); ok(w2);
    ok(await call('adm', 'POST', `/api/admin/payments/${w2.body.payment.id}/approve`));
    ok(await call('adm', 'POST', `/api/admin/payments/${w2.body.payment.id}/approve`), 400);
    assert.strictEqual((await call('x', 'GET', '/api/wallet')).body.balance, 3000);
  });
  await t('fantasy props: light pay and high pay settle correctly', async () => {
    const props = (await call('p', 'GET', '/api/fantasy/props')).body.props; assert.ok(props.length >= 6);
    const picks = props.slice(0, 6).map(p => ({ propId: p.id, side: 'more' }));
    ok(await call('p', 'POST', '/api/fantasy/entries', { mode: 'light', stake: 1000, picks: picks.slice(0, 3) }), 400);
    const before = (await call('p', 'GET', '/api/auth/me')).body.user.balance;
    ok(await call('p', 'POST', '/api/fantasy/entries', { mode: 'light', stake: 1000, picks }));
    ok(await call('p', 'POST', '/api/fantasy/entries', { mode: 'high', stake: 1000, picks }));
    // 4 of 6 right: light wins x1.8, high loses
    props.slice(0, 6).forEach(async () => {});
    for (let i = 0; i < 6; i++) ok(await call('adm', 'POST', `/api/admin/props/${props[i].id}/settle`, { actual: i < 4 ? props[i].line + 1 : props[i].line - 1 }));
    const after = (await call('p', 'GET', '/api/auth/me')).body.user.balance;
    assert.strictEqual(after, before - 2000 + 1800);
  });
  await t('contest: join, settle, 50/30/20 payout with 10% rake', async () => {
    const players = (await call('p', 'GET', '/api/fantasy/players')).body.players;
    const mk = async (who, offset) => { const ids = players.slice(offset, offset + 11).map(x => x.id); const tm = await call(who, 'POST', '/api/fantasy/teams', { name: 'T' + offset, formation: '4-4-2', playerIds: ids }); ok(tm); return tm.body.team; };
    ok(await call('p', 'POST', '/api/fantasy/teams', { name: 'bad', playerIds: players.slice(0, 5).map(x => x.id) }), 400);
    const t1 = await mk('p', 0), t2 = await mk('p', 4), t3 = await mk('x', 2);
    const ct = (await call('adm', 'POST', '/api/admin/contests', { name: 'Test cup', entryFee: 1000, startsAt: future(1) })).body;
    ok(await call('p', 'POST', `/api/fantasy/contests/${ct.id}/join`, { teamId: t1.id }));
    ok(await call('p', 'POST', `/api/fantasy/contests/${ct.id}/join`, { teamId: t1.id }), 400);
    ok(await call('p', 'POST', `/api/fantasy/contests/${ct.id}/join`, { teamId: t2.id }));
    ok(await call('p', 'POST', `/api/fantasy/contests/${ct.id}/join`, { teamId: t3.id }), 400); // not owner
    // user x has no points left to enter; top up
    ok(await call('adm', 'POST', `/api/admin/users/${db.data.users.find(u => u.email === 't@x.com').id}/adjust`, { amount: 2000, note: 'x' }));
    ok(await call('x', 'POST', `/api/fantasy/contests/${ct.id}/join`, { teamId: t3.id }));
    const scores = {}; players.slice(0, 11).forEach(p => scores[p.id] = 5); players.slice(2, 13).forEach(p => scores[p.id] = (scores[p.id] || 0) + 1);
    const bal = async w => (await call(w, 'GET', '/api/auth/me')).body.user.balance;
    const b0 = await bal('p'), bx = await bal('x');
    ok(await call('adm', 'POST', `/api/admin/contests/${ct.id}/settle`, { playerScores: scores }));
    assert.strictEqual(db.data.contestEntries.reduce((s, e) => s + e.prize, 0) <= 2700, true);
    assert.strictEqual((await bal('p')) + (await bal('x')) - b0 - bx, 2700);
  });
  await t('predict & win pays the right answer once', async () => {
    const cat = (await call('p', 'GET', '/api/predict')).body.categories.sort((a, b) => a.id - b.id)[0];
    ok(await call('p', 'POST', '/api/predict/' + cat.id, { option: 'Nope' }), 400);
    ok(await call('p', 'POST', '/api/predict/' + cat.id, { option: cat.options[0] }));
    const b = (await call('p', 'GET', '/api/auth/me')).body.user.balance;
    ok(await call('adm', 'POST', `/api/admin/prediction/${cat.id}/settle`, { correct: cat.options[0] }));
    ok(await call('adm', 'POST', `/api/admin/prediction/${cat.id}/settle`, { correct: cat.options[0] }), 400);
    assert.strictEqual((await call('p', 'GET', '/api/auth/me')).body.user.balance, b + cat.reward);
  });
  await t('lottery: commit/reveal verifiable, prizes paid', async () => {
    const lot = (await call('p', 'GET', '/api/lottery')).body;
    assert.strictEqual(lot.current.seed, undefined); assert.ok(/^[0-9a-f]{64}$/.test(lot.current.commit));
    ok(await call('p', 'POST', '/api/lottery/tickets', { tickets: [[1, 1, 2]] }), 400);
    ok(await call('p', 'POST', '/api/lottery/tickets', { tickets: [[1, 2, 55]] }), 400);
    const draw = L.currentDraw(); const win = L.derive(draw.seed);
    const b = (await call('p', 'GET', '/api/auth/me')).body.user.balance;
    ok(await call('p', 'POST', '/api/lottery/tickets', { tickets: [win] })); // jackpot ticket
    { const o = [1, 2, 3, 4, 5, 6, 7, 8].find(x => !win.includes(x)); ok(await call('p', 'POST', '/api/lottery/tickets', { tickets: [[win[0], win[1], o === win[0] || o === win[1] ? 50 : o]] })); } // 2 matches
    ok(await call('p', 'POST', '/api/lottery/tickets', { quickPicks: 3 }));
    ok(await call('p', 'POST', '/api/admin/lottery/conduct'), 403);
    const res = await call('adm', 'POST', '/api/admin/lottery/conduct'); ok(res);
    assert.deepStrictEqual(res.body.draw.numbers, win);
    assert.strictEqual(L.sha(res.body.draw.seed), lot.current.commit); // anyone can verify
    const bal = (await call('p', 'GET', '/api/auth/me')).body.user.balance;
    assert.ok(bal >= b - 5 * 500 + 500 * 200 + 500 * 5, `balance ${bal}`);
    assert.notStrictEqual((await call('p', 'GET', '/api/lottery')).body.current.id, draw.id);
  });
  await t('admin settings: change fee and countries live; maintenance; suspend', async () => {
    ok(await call('adm', 'PUT', '/api/admin/settings', { depositFeePct: 5 }));
    assert.strictEqual((await call('x', 'GET', '/api/wallet/quote?type=deposit&amount=1000')).body.fee, 50);
    ok(await call('adm', 'PUT', '/api/admin/settings', { depositFeePct: 99 }), 400);
    ok(await call('adm', 'PUT', '/api/admin/settings', { allowedCountries: ['NE', 'FR'] }));
    ok(await call('fr', 'GET', '/api/fixtures')); // France now allowed
    ok(await call('adm', 'PUT', '/api/admin/settings', { allowedCountries: ['NE'] }));
    const uid = db.data.users.find(u => u.email === 't@x.com').id;
    ok(await call('adm', 'PATCH', `/api/admin/users/${uid}`, { status: 'suspended' }));
    ok(await call('x', 'GET', '/api/wallet'), 401);
  });
  await t('ledger invariant: every balance equals the sum of its entries', async () => { assert.deepStrictEqual(ledger.audit(), []); });
  await t('security: static traversal blocked, headers present', async () => {
    const r = await fetch(base + '/..%2f..%2fetc%2fpasswd'); assert.ok([403, 404].includes(r.status));
    const h = await fetch(base + '/'); assert.ok(h.headers.get('content-security-policy').includes("script-src 'self'"));
    const d = await fetch(base + '/data/db.json'); assert.strictEqual(d.status, 404);
  });
  console.log(`\n${n} passed, ${failed} failed`); server.close(); process.exit(failed ? 1 : 0);
})();
