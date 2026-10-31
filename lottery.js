'use strict';
// Provably-fair lottery: at draw creation we publish commit = sha256(seed). The numbers are a pure
// function of the seed. After the draw the seed is revealed so anyone can recompute both.
const crypto = require('crypto');
const db = require('./db');
const ledger = require('./ledger');
const pay = require('./payments');
const { bad } = require('./http');

const POOL = 54, PICK = 3;
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const MATCH_MULT = { 3: 200, 2: 5 };

function derive(seed) {
  const nums = [];
  for (let i = 0; nums.length < PICK; i++) {
    const x = parseInt(sha(seed + ':' + i).slice(0, 8), 16);
    const n = (x % POOL) + 1;
    if (!nums.includes(n)) nums.push(n);
  }
  return nums.sort((a, b) => a - b);
}

function createDraw(hours = 24) {
  const seed = crypto.randomBytes(32).toString('hex');
  const d = { id: db.id('draw'), status: 'open', seed, commit: sha(seed), numbers: null, closesAt: Date.now() + hours * 3600e3, ticketPrice: db.data.settings.lotteryTicketPrice, createdAt: Date.now() };
  db.data.draws.push(d); db.save();
  return d;
}
function currentDraw() { return db.data.draws.find(d => d.status === 'open') || createDraw(); }

function validNumbers(n) {
  return Array.isArray(n) && n.length === PICK && n.every(x => Number.isInteger(x) && x >= 1 && x <= POOL) && new Set(n).size === PICK;
}

function buyTicket(user, numbers, quick) {
  const d = currentDraw();
  if (d.closesAt < Date.now()) throw bad('Ticket sales for this draw are closed');
  if (quick) { numbers = []; while (numbers.length < PICK) { const n = crypto.randomInt(1, POOL + 1); if (!numbers.includes(n)) numbers.push(n); } }
  if (!validNumbers(numbers)) throw bad(`Pick ${PICK} different numbers from 1 to ${POOL}`);
  numbers = [...numbers].sort((a, b) => a - b);
  if (db.data.tickets.filter(t => t.drawId === d.id && t.userId === user.id).length >= 20) throw bad('Maximum 20 tickets per draw');
  ledger.post(user, -d.ticketPrice, 'lottery_ticket', 'DRAW-' + d.id, `Lottery ticket, draw #${d.id}`);
  pay.noteWager(user, d.ticketPrice);
  const t = { id: db.id('ticket'), drawId: d.id, userId: user.id, numbers, price: d.ticketPrice, quick: !!quick, matches: null, prize: 0, ts: Date.now() };
  db.data.tickets.push(t); db.save();
  return t;
}

function conductDraw(d) {
  if (d.status !== 'open') throw bad('Draw already conducted');
  d.numbers = derive(d.seed);
  d.status = 'drawn'; d.drawnAt = Date.now();
  let paid = 0, winners = 0;
  for (const t of db.data.tickets.filter(x => x.drawId === d.id)) {
    t.matches = t.numbers.filter(n => d.numbers.includes(n)).length;
    const m = MATCH_MULT[t.matches];
    if (m) {
      t.prize = Math.min(t.price * m, db.data.settings.maxPayout);
      const u = db.data.users.find(x => x.id === t.userId);
      ledger.post(u, t.prize, 'lottery_win', 'DRAW-' + d.id, `Lottery win, draw #${d.id} (${t.matches} matches)`);
      db.data.notifications.push({ id: db.id('notif'), userId: u.id, title: 'Lottery win!', text: `Draw #${d.id}: ${t.matches} matches, ${t.prize} points.`, ts: Date.now(), read: false });
      paid += t.prize; winners++;
    }
  }
  d.paid = paid; d.winners = winners;
  db.save();
  createDraw();
  return d;
}

const view = (d) => ({ id: d.id, status: d.status, commit: d.commit, closesAt: d.closesAt, ticketPrice: d.ticketPrice, numbers: d.numbers, seed: d.status === 'drawn' ? d.seed : null, drawnAt: d.drawnAt || null, winners: d.winners || 0, paid: d.paid || 0 });

module.exports = { derive, createDraw, currentDraw, buyTicket, conductDraw, view, sha, POOL, PICK, MATCH_MULT };
