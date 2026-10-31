'use strict';
// Points ledger. 1 point = 1 XOF. Integers only, append-only; user.balance is a cache of the sum.
const db = require('./db');
const { HttpError } = require('./http');

function post(user, amount, type, ref, note) {
  if (!Number.isInteger(amount)) throw new Error('ledger amount must be an integer');
  if (user.balance + amount < 0) throw new HttpError(402, 'Not enough points');
  user.balance += amount;
  const e = { id: db.id('ledger'), userId: user.id, type, amount, balance: user.balance, ref: ref || null, note: note || '', ts: Date.now() };
  db.data.ledger.push(e);
  db.save();
  return e;
}
const forUser = (uid) => db.data.ledger.filter(l => l.userId === uid).sort((a, b) => b.id - a.id);

// sanity check used by tests: balance must equal ledger sum
function audit() {
  const bad = [];
  for (const u of db.data.users) {
    const sum = db.data.ledger.filter(l => l.userId === u.id).reduce((s, l) => s + l.amount, 0);
    if (sum !== u.balance) bad.push({ userId: u.id, balance: u.balance, ledger: sum });
  }
  return bad;
}
module.exports = { post, forUser, audit };
