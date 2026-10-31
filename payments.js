'use strict';
// Payment core: fee maths, mock mobile-money adapters, idempotent confirmation, withdrawal review.
// To go live, replace `initiate()` per provider with the aggregator/operator API call and
// point the provider's webhook at POST /api/webhooks/payment (HMAC-signed).
const crypto = require('crypto');
const db = require('./db');
const ledger = require('./ledger');
const { bad, HttpError } = require('./http');
const { PROVIDERS } = require('./seed');

const feeOf = (amount, pct) => Math.ceil(amount * pct / 100);

function quote(type, amount) {
  const s = db.data.settings;
  if (type === 'deposit') {
    const fee = feeOf(amount, s.depositFeePct);
    return { type, amount, fee, feePct: s.depositFeePct, points: amount - fee, youPay: amount };
  }
  const fee = feeOf(amount, s.withdrawFeePct);
  return { type, points: amount, fee, feePct: s.withdrawFeePct, amount: amount - fee, youReceive: amount - fee };
}

function checkProvider(p) {
  if (!PROVIDERS[p] || !db.data.settings.providers[p]) throw bad('This payment method is not available');
}

// ---- mock adapter -------------------------------------------------------
const adapters = {
  initiate(provider, { phone, amount, ref }) {
    return { ok: true, message: `A payment request of ${amount} XOF was sent to ${phone} on ${PROVIDERS[provider].name}. Approve it on your phone.`, mock: true, ref };
  },
  payout(provider, { phone, amount, ref }) { return { ok: true, mock: true }; },
};

function createDeposit(user, { provider, phone, amount }) {
  const s = db.data.settings;
  checkProvider(provider);
  if (!Number.isInteger(amount)) throw bad('Amount must be a whole number');
  if (amount < s.minDeposit) throw bad(`Minimum deposit is ${s.minDeposit} XOF`);
  if (amount > s.maxDeposit) throw bad(`Maximum deposit is ${s.maxDeposit} XOF`);
  const q = quote('deposit', amount);
  const p = { id: db.id('payment'), ref: 'DEP-' + crypto.randomBytes(5).toString('hex').toUpperCase(), userId: user.id, type: 'deposit', provider, phone,
    amount, fee: q.fee, points: q.points, status: 'pending', createdAt: Date.now() };
  db.data.payments.push(p);
  const out = adapters.initiate(provider, { phone, amount, ref: p.ref });
  db.save();
  return { payment: p, instructions: out.message };
}

function confirmDeposit(p, providerRef) {
  if (p.type !== 'deposit') throw bad('Not a deposit');
  if (p.status !== 'pending') return p; // idempotent: webhooks may repeat
  const user = db.data.users.find(u => u.id === p.userId);
  p.status = 'completed'; p.completedAt = Date.now(); p.providerRef = providerRef || null;
  ledger.post(user, p.points, 'deposit', p.ref, `Deposit ${p.amount} XOF (fee ${p.fee})`);
  if (db.data.settings.withdrawTurnover) user.wagerReq = (user.wagerReq || 0) + p.points;
  db.data.notifications.push({ id: db.id('notif'), userId: user.id, title: 'Deposit received', text: `${p.points} points were added to your wallet.`, ts: Date.now(), read: false });
  db.save();
  return p;
}
function failPayment(p, reason) {
  if (p.status !== 'pending') return p;
  p.status = 'failed'; p.note = reason || 'Failed';
  if (p.type === 'withdrawal') { // refund the held points
    const user = db.data.users.find(u => u.id === p.userId);
    ledger.post(user, p.points, 'withdraw_refund', p.ref, 'Withdrawal not completed');
  }
  db.save();
  return p;
}

function createWithdrawal(user, { provider, phone, points }) {
  const s = db.data.settings;
  checkProvider(provider);
  if (!Number.isInteger(points)) throw bad('Points must be a whole number');
  if (points < s.minWithdraw) throw bad(`Minimum withdrawal is ${s.minWithdraw} points`);
  if (points > s.maxWithdraw) throw bad(`Maximum withdrawal is ${s.maxWithdraw} points`);
  if (s.withdrawTurnover && (user.wagerReq || 0) > 0) throw bad(`Play ${user.wagerReq} more points before withdrawing (turnover rule).`);
  const pending = db.data.payments.filter(p => p.userId === user.id && p.type === 'withdrawal' && p.status === 'pending').length;
  if (pending >= 3) throw bad('You already have 3 withdrawals waiting for review');
  const q = quote('withdrawal', points);
  const p = { id: db.id('payment'), ref: 'WDR-' + crypto.randomBytes(5).toString('hex').toUpperCase(), userId: user.id, type: 'withdrawal', provider, phone,
    amount: q.amount, fee: q.fee, points, status: 'pending', createdAt: Date.now() };
  ledger.post(user, -points, 'withdraw_hold', p.ref, `Withdrawal request ${points} pts`); // throws if not enough
  db.data.payments.push(p);
  db.save();
  return p;
}
function approveWithdrawal(p) {
  if (p.type !== 'withdrawal') throw bad('Not a withdrawal');
  if (p.status !== 'pending') throw bad('Already processed');
  const out = adapters.payout(p.provider, { phone: p.phone, amount: p.amount, ref: p.ref });
  if (!out.ok) throw new HttpError(502, 'Payout failed at provider');
  p.status = 'completed'; p.completedAt = Date.now();
  const user = db.data.users.find(u => u.id === p.userId);
  db.data.notifications.push({ id: db.id('notif'), userId: user.id, title: 'Withdrawal sent', text: `${p.amount} XOF is on its way to ${p.phone}.`, ts: Date.now(), read: false });
  db.save();
  return p;
}

// stake counts toward turnover
function noteWager(user, stake) { user.wagerReq = Math.max(0, (user.wagerReq || 0) - stake); }

function verifyWebhook(ref, status, sig) {
  const want = crypto.createHmac('sha256', db.data.settings.webhookSecret).update(`${ref}|${status}`).digest('hex');
  const a = Buffer.from(String(sig || '')), b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const signWebhook = (ref, status) => crypto.createHmac('sha256', db.data.settings.webhookSecret).update(`${ref}|${status}`).digest('hex');

module.exports = { quote, createDeposit, confirmDeposit, failPayment, createWithdrawal, approveWithdrawal, noteWager, verifyWebhook, signWebhook, feeOf };
