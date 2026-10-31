'use strict';
const db = require('../lib/db');
const F = require('../lib/fantasy');
const { bad, int, str, rateLimit, HttpError } = require('../lib/http');

const player = id => db.data.players.find(p => p.id === id);
const propView = p => { const pl = player(p.playerId) || {}; return { id: p.id, stat: p.stat, line: p.line, kickoff: p.kickoff, match: p.match, status: p.status, player: pl.name, pos: pl.pos, club: pl.club, skin: pl.skin }; };
const contestView = (c, uid) => {
  const es = db.data.contestEntries.filter(e => e.contestId === c.id);
  return { id: c.id, name: c.name, entryFee: c.entryFee, maxEntries: c.maxEntries, startsAt: c.startsAt, status: c.status, entries: es.length, prizePool: F.prizePool(c), joined: es.filter(e => e.userId === uid).length, createdAt: c.createdAt };
};
const rules = () => { const s = db.data.settings; return { light: { mult: s.lightPayMultiplier || 1.8, min: F.RANGE.light[0], max: F.RANGE.light[1] }, high: { mult: s.highPayMultiplier || 10, min: F.RANGE.high[0], max: F.RANGE.high[1] } }; };

module.exports = (r, lib) => {
  r.get('/api/fantasy/players', (c) => { c.user(); return { players: db.data.players, budget: F.BUDGET, teamSize: F.TEAM_SIZE }; });

  // ----- line-up props
  r.get('/api/fantasy/props', () => ({ props: db.data.props.filter(p => p.status === 'open' && p.kickoff > Date.now()).sort((a, b) => a.kickoff - b.kickoff).map(propView), rules: rules() }));
  r.post('/api/fantasy/entries', (c) => {
    const u = c.user(); rateLimit('pe:' + u.id, 30, 60e3);
    const e = F.placePropEntry(u, c.body.mode, int(c.body.stake, 'Stake'), c.body.picks);
    return { entry: e, balance: u.balance };
  });
  r.get('/api/fantasy/entries', (c) => {
    const u = c.user();
    return { entries: db.data.propEntries.filter(e => e.userId === u.id).sort((a, b) => b.id - a.id).slice(0, 30) };
  });

  // ----- teams
  r.get('/api/fantasy/teams', (c) => {
    const u = c.user();
    return { teams: db.data.teams.filter(t => t.userId === u.id).sort((a, b) => b.id - a.id) };
  });
  r.post('/api/fantasy/teams', (c) => ({ team: F.createTeam(c.user(), c.body.name, c.body.formation, c.body.playerIds, c.body.captain) }));
  r.del('/api/fantasy/teams/:id', (c) => {
    const u = c.user();
    const t = db.data.teams.find(x => x.id === Number(c.params.id) && x.userId === u.id);
    if (!t) throw new HttpError(404, 'Team not found');
    if (db.data.contestEntries.some(e => e.teamId === t.id)) throw bad('This team is entered in a contest and cannot be deleted');
    db.data.teams.splice(db.data.teams.indexOf(t), 1); db.save();
    return { ok: true };
  });

  // ----- contests
  r.get('/api/fantasy/contests', (c) => {
    const u = c.maybeUser();
    return { contests: db.data.contests.slice().sort((a, b) => b.id - a.id).map(x => contestView(x, u && u.id)) };
  });
  r.get('/api/fantasy/contests/:id', (c) => {
    const u = c.maybeUser();
    const ct = db.data.contests.find(x => x.id === Number(c.params.id));
    if (!ct) throw new HttpError(404, 'Contest not found');
    const entries = db.data.contestEntries.filter(e => e.contestId === ct.id).sort((a, b) => (a.rank || 999) - (b.rank || 999) || a.joinedAt - b.joinedAt)
      .map(e => { const usr = db.data.users.find(x => x.id === e.userId); const parts = usr.name.split(' '); return { rank: e.rank, name: parts[0] + (parts[1] ? ' ' + parts[1][0] + '.' : ''), score: e.score, prize: e.prize, mine: !!u && e.userId === u.id }; });
    return { contest: contestView(ct, u && u.id), entries };
  });
  r.post('/api/fantasy/contests/:id/join', (c) => {
    const u = c.user();
    const ct = db.data.contests.find(x => x.id === Number(c.params.id));
    if (!ct) throw new HttpError(404, 'Contest not found');
    const t = db.data.teams.find(x => x.id === Number(c.body.teamId) && x.userId === u.id);
    if (!t) throw bad('Choose one of your teams');
    F.joinContest(u, ct, t);
    return { contest: contestView(ct, u.id), balance: u.balance };
  });

  // ----- predict & win
  r.get('/api/predict', (c) => {
    const u = c.maybeUser();
    return { categories: db.data.predCats.slice().sort((a, b) => b.id - a.id).map(p => {
      const mine = u && db.data.predictions.find(x => x.catId === p.id && x.userId === u.id);
      return { id: p.id, title: p.title, options: p.options, reward: p.reward, closesAt: p.closesAt, status: p.status, correct: p.correct, mine: mine ? mine.option : null };
    }) };
  });
  r.post('/api/predict/:id', (c) => {
    const u = c.user();
    const cat = db.data.predCats.find(x => x.id === Number(c.params.id));
    if (!cat || cat.status !== 'open' || cat.closesAt < Date.now()) throw bad('Predictions are closed');
    const option = str(c.body.option, 'Option', 80);
    if (!cat.options.includes(option)) throw bad('Invalid option');
    const p = db.data.predictions.find(x => x.catId === cat.id && x.userId === u.id);
    if (p) p.option = option; else db.data.predictions.push({ id: db.id('pred'), catId: cat.id, userId: u.id, option, won: null, ts: Date.now() });
    db.save();
    return { ok: true };
  });
};
