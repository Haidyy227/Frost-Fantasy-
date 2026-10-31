'use strict';
const db = require('../lib/db');
const betting = require('../lib/betting');
const { bad, int, rateLimit, HttpError } = require('../lib/http');

const fxView = f => ({ id: f.id, league: f.league, home: f.home, away: f.away, kickoff: f.kickoff, status: f.status, odds: f.odds, score: f.score, result: f.result || null });

module.exports = (r) => {
  r.get('/api/fixtures', () => ({
    fixtures: db.data.fixtures.filter(f => ['open', 'live', 'closed', 'settled'].includes(f.status))
      .filter(f => f.status !== 'settled' || Date.now() - (f.kickoff || 0) < 3 * 24 * 3600e3)
      .sort((a, b) => a.kickoff - b.kickoff).map(fxView)
  }));
  r.get('/api/fixtures/:id', (c) => {
    const f = db.data.fixtures.find(x => x.id === Number(c.params.id) && x.status !== 'draft');
    if (!f) throw new HttpError(404, 'Match not found');
    return { fixture: fxView(f) };
  });
  r.post('/api/bets', (c) => {
    const u = c.user(); rateLimit('bet:' + u.id, 60, 60e3);
    const bet = betting.placeBet(u, c.body.selections, int(c.body.stake, 'Stake'));
    return { bet, balance: u.balance };
  });
  r.get('/api/bets', (c) => {
    const u = c.user();
    return { bets: db.data.bets.filter(b => b.userId === u.id).sort((a, b) => b.id - a.id).slice(0, 50) };
  });
};
