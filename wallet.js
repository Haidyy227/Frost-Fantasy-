'use strict';
const db = require('../lib/db');
const ledger = require('../lib/ledger');
const pay = require('../lib/payments');
const geo = require('../lib/geo');
const { bad, HttpError, int, rateLimit } = require('../lib/http');

const view = (p) => ({ id: p.id, ref: p.ref, type: p.type, provider: p.provider, phone: p.phone, amount: p.amount, fee: p.fee, points: p.points, status: p.status, createdAt: p.createdAt, completedAt: p.completedAt || null });

module.exports = (r, lib) => {
  r.get('/api/wallet', (c) => {
    const u = c.user();
    return {
      balance: u.balance, wagerReq: u.wagerReq || 0,
      ledger: ledger.forUser(u.id).slice(0, 60),
      payments: db.data.payments.filter(p => p.userId === u.id).sort((a, b) => b.id - a.id).slice(0, 30).map(view),
    };
  });

  r.get('/api/wallet/quote', (c) => {
    c.user();
    const type = c.query.type === 'withdrawal' ? 'withdrawal' : 'deposit';
    const n = Number(c.query.amount);
    if (!Number.isInteger(n) || n <= 0) throw bad('Enter a whole amount');
    return pay.quote(type, n);
  });

  r.post('/api/wallet/deposit', (c) => {
    const u = c.user();
    rateLimit('dep:' + u.id, 10, 3600e3);
    const phone = geo.normalizePhone(c.body.phone || u.phone);
    // local mobile-money number must belong to an enabled country
    const pc = geo.phoneCountry(phone);
    if (!pc || !geo.allowed().includes(pc)) throw bad('Payment number must be from an enabled country');
    const out = pay.createDeposit(u, { provider: String(c.body.provider), phone, amount: int(c.body.amount, 'Amount') });
    lib.audit(u, 'deposit.create', out.payment.ref);
    return { payment: view(out.payment), instructions: out.instructions, devConfirm: geo.DEV };
  });

  r.post('/api/wallet/withdraw', (c) => {
    const u = c.user();
    rateLimit('wd:' + u.id, 10, 3600e3);
    const phone = geo.normalizePhone(c.body.phone || u.phone);
    const pc = geo.phoneCountry(phone);
    if (!pc || !geo.allowed().includes(pc)) throw bad('Payout number must be from an enabled country');
    const p = pay.createWithdrawal(u, { provider: String(c.body.provider), phone, points: int(c.body.points, 'Points') });
    lib.audit(u, 'withdraw.create', p.ref);
    return { payment: view(p), balance: u.balance };
  });

  // DEV ONLY: stand-in for the mobile-money prompt being approved on the phone
  r.post('/api/dev/payments/:id/confirm', (c) => {
    if (!geo.DEV) throw new HttpError(404, 'Not found');
    const u = c.user();
    const p = db.data.payments.find(x => x.id === Number(c.params.id) && (x.userId === u.id || u.role === 'admin'));
    if (!p) throw new HttpError(404, 'Payment not found');
    pay.confirmDeposit(p, 'DEV-' + Date.now());
    return { payment: view(p), balance: db.data.users.find(x => x.id === p.userId).balance };
  });
  r.post('/api/dev/payments/:id/fail', (c) => {
    if (!geo.DEV) throw new HttpError(404, 'Not found');
    const u = c.user();
    const p = db.data.payments.find(x => x.id === Number(c.params.id) && (x.userId === u.id || u.role === 'admin'));
    if (!p) throw new HttpError(404, 'Payment not found');
    pay.failPayment(p, 'Declined on phone');
    return { payment: view(p) };
  });

  // Real providers call this. Body: { reference, status: 'success'|'failed', providerRef }, header x-signature = HMAC-SHA256(secret, `${reference}|${status}`)
  r.post('/api/webhooks/payment', (c) => {
    const { reference, status, providerRef } = c.body;
    if (!pay.verifyWebhook(reference, status, c.req.headers['x-signature'])) throw new HttpError(401, 'Bad signature');
    const p = db.data.payments.find(x => x.ref === reference);
    if (!p) throw new HttpError(404, 'Unknown reference');
    if (status === 'success') pay.confirmDeposit(p, providerRef); else pay.failPayment(p, 'Provider reported failure');
    return { ok: true, status: p.status };
  });
};
