'use strict';
const db = require('../lib/db');
const L = require('../lib/lottery');
const { bad } = require('../lib/http');
const { rateLimit } = require('../lib/http');

const past = d => ({ id: d.id, numbers: d.numbers, commit: d.commit, seed: d.seed, drawnAt: d.drawnAt, winners: d.winners || 0, paid: d.paid || 0, tickets: db.data.tickets.filter(t => t.drawId === d.id).length });

module.exports = (r) => {
  r.get('/api/lottery', (c) => {
    const u = c.maybeUser();
    const cur = L.currentDraw();
    return {
      current: { id: cur.id, commit: cur.commit, closesAt: cur.closesAt, ticketPrice: cur.ticketPrice, tickets: db.data.tickets.filter(t => t.drawId === cur.id).length },
      rules: { pool: L.POOL, pick: L.PICK, prizes: L.MATCH_MULT },
      past: db.data.draws.filter(d => d.status === 'drawn').sort((a, b) => b.id - a.id).slice(0, 10).map(past),
      myTickets: u ? db.data.tickets.filter(t => t.userId === u.id).sort((a, b) => b.id - a.id).slice(0, 40) : [],
    };
  });
  r.post('/api/lottery/tickets', (c) => {
    const u = c.user(); rateLimit('tk:' + u.id, 60, 60e3);
    const out = [];
    if (c.body.quickPicks) {
      const n = Number(c.body.quickPicks);
      if (!Number.isInteger(n) || n < 1 || n > 10) throw bad('Quick picks must be 1–10');
      for (let i = 0; i < n; i++) out.push(L.buyTicket(u, null, true));
    } else if (Array.isArray(c.body.tickets) && c.body.tickets.length && c.body.tickets.length <= 10) {
      for (const nums of c.body.tickets) out.push(L.buyTicket(u, nums.map(Number), false));
    } else throw bad('Choose your numbers');
    return { tickets: out, balance: u.balance };
  });
};
