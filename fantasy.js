'use strict';
const db = require('./db');
const ledger = require('./ledger');
const pay = require('./payments');
const { bad } = require('./http');

const RANGE = { light: [4, 6], high: [2, 6] };
const mult = (mode) => mode === 'high' ? (db.data.settings.highPayMultiplier || 10) : (db.data.settings.lightPayMultiplier || 1.8);
const userOf = id => db.data.users.find(u => u.id === id);
const note = (userId, title, text) => db.data.notifications.push({ id: db.id('notif'), userId, title, text, ts: Date.now(), read: false });

// ---------- Props (More / Less) ----------
function placePropEntry(user, mode, stake, picks) {
  const s = db.data.settings;
  if (!['light', 'high'].includes(mode)) throw bad('Choose Light Pay or High Pay');
  if (!Number.isInteger(stake) || stake < 100) throw bad('Minimum stake is 100 points');
  if (stake > s.maxStake) throw bad(`Maximum stake is ${s.maxStake} points`);
  const [lo, hi] = RANGE[mode];
  if (!Array.isArray(picks) || picks.length < lo || picks.length > hi) throw bad(`${mode === 'high' ? 'High' : 'Light'} Pay needs ${lo} to ${hi} picks`);
  const seen = new Set(); const out = [];
  for (const p of picks) {
    const prop = db.data.props.find(x => x.id === Number(p.propId));
    if (!prop || prop.status !== 'open' || prop.kickoff < Date.now()) throw bad('A selected prop is no longer open');
    if (!['more', 'less'].includes(p.side)) throw bad('Pick More or Less');
    if (seen.has(prop.id)) throw bad('Duplicate prop');
    seen.add(prop.id);
    out.push({ propId: prop.id, side: p.side, line: prop.line, result: null });
  }
  const m = mult(mode);
  const entry = { id: db.id('propEntry'), userId: user.id, mode, stake, legs: out, multiplier: m, potential: Math.min(Math.floor(stake * m), s.maxPayout), status: 'open', payout: 0, placedAt: Date.now() };
  ledger.post(user, -stake, 'prop_stake', 'PROP-' + entry.id, `${mode === 'high' ? 'High' : 'Light'} Pay entry #${entry.id}`);
  pay.noteWager(user, stake);
  db.data.propEntries.push(entry);
  db.save();
  return entry;
}

function resolvePropEntry(e) {
  if (e.status !== 'open' || e.legs.some(p => p.result === null)) return;
  const user = userOf(e.userId);
  const live = e.legs.filter(p => p.result !== 'void');
  const correct = live.filter(p => p.result === 'win').length;
  e.settledAt = Date.now();
  const need = e.mode === 'high' ? live.length : 4;
  if (live.length < RANGE[e.mode][0]) { e.status = 'void'; e.payout = e.stake; }
  else if (correct >= need) { e.status = 'won'; e.payout = e.potential; }
  else { e.status = 'lost'; e.payout = 0; }
  e.correct = correct;
  if (e.payout) { ledger.post(user, e.payout, e.status === 'won' ? 'prop_win' : 'prop_refund', 'PROP-' + e.id, `Entry #${e.id} ${e.status}`); note(user.id, e.status === 'won' ? 'Line-up won!' : 'Entry refunded', `Entry #${e.id}: ${e.payout} points.`); }
}

function settleProp(prop, actual) {
  if (prop.status === 'settled') throw bad('Already settled');
  const n = Number(actual); if (!isFinite(n)) throw bad('Enter the actual stat value');
  prop.actual = n; prop.status = 'settled';
  for (const e of db.data.propEntries) {
    if (e.status !== 'open') continue;
    for (const p of e.legs) if (p.propId === prop.id) p.result = n === prop.line ? 'void' : ((n > prop.line) === (p.side === 'more') ? 'win' : 'loss');
    resolvePropEntry(e);
  }
  db.save();
}

function voidProp(prop) {
  if (prop.status !== 'open') throw bad('Already settled');
  prop.status = 'void';
  for (const e of db.data.propEntries) {
    if (e.status !== 'open') continue;
    for (const p of e.legs) if (p.propId === prop.id) p.result = 'void';
    resolvePropEntry(e);
  }
  db.save();
}

// ---------- Teams & contests ----------
const BUDGET = 40000, TEAM_SIZE = 11;
function createTeam(user, name, formation, playerIds, captain) {
  if (!Array.isArray(playerIds) || new Set(playerIds).size !== TEAM_SIZE) throw bad(`Pick ${TEAM_SIZE} different players`);
  const players = playerIds.map(id => db.data.players.find(p => p.id === id));
  if (players.some(p => !p)) throw bad('Unknown player');
  const cost = players.reduce((s, p) => s + p.price, 0);
  if (cost > BUDGET) throw bad(`Over budget (${cost} / ${BUDGET})`);
  if (captain && !playerIds.includes(captain)) throw bad('Captain must be one of your players');
  const t = { id: db.id('team'), userId: user.id, name: String(name || 'My team').slice(0, 40), formation: String(formation || '4-4-2').slice(0, 12), playerIds, captain: captain || null, cost, createdAt: Date.now() };
  db.data.teams.push(t); db.save();
  return t;
}

function joinContest(user, contest, team) {
  if (contest.status !== 'open' || contest.startsAt < Date.now()) throw bad('Contest is closed');
  const entries = db.data.contestEntries.filter(e => e.contestId === contest.id);
  if (entries.length >= contest.maxEntries) throw bad('Contest is full');
  if (entries.some(e => e.userId === user.id && e.teamId === team.id)) throw bad('This team is already in the contest');
  if (entries.filter(e => e.userId === user.id).length >= 3) throw bad('Maximum 3 entries per contest');
  ledger.post(user, -contest.entryFee, 'contest_fee', 'CON-' + contest.id, `Entry: ${contest.name}`);
  pay.noteWager(user, contest.entryFee);
  const e = { id: db.id('centry'), contestId: contest.id, userId: user.id, teamId: team.id, score: null, rank: null, prize: 0, joinedAt: Date.now() };
  db.data.contestEntries.push(e); db.save();
  return e;
}

function prizePool(contest) {
  const n = db.data.contestEntries.filter(e => e.contestId === contest.id).length;
  return Math.floor(n * contest.entryFee * (1 - db.data.settings.contestRakePct / 100));
}

function settleContest(contest, playerScores) {
  if (contest.status === 'settled') throw bad('Already settled');
  const entries = db.data.contestEntries.filter(e => e.contestId === contest.id);
  contest.playerScores = playerScores || {};
  contest.status = 'settled';
  if (entries.length < 2) { // not enough players: refund
    for (const e of entries) { ledger.post(userOf(e.userId), contest.entryFee, 'contest_refund', 'CON-' + contest.id, `Refund: ${contest.name}`); e.prize = contest.entryFee; }
    db.save(); return;
  }
  for (const e of entries) {
    const t = db.data.teams.find(x => x.id === e.teamId);
    e.score = Math.round(t.playerIds.reduce((s, id) => s + (Number(contest.playerScores[id]) || 0) * (id === t.captain ? 2 : 1), 0) * 10) / 10;
  }
  entries.sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt);
  const pool = prizePool(contest);
  const split = [0.5, 0.3, 0.2].slice(0, Math.min(3, entries.length));
  const tot = split.reduce((a, b) => a + b, 0);
  entries.forEach((e, i) => {
    e.rank = i + 1;
    if (i < split.length) {
      e.prize = Math.floor(pool * split[i] / tot);
      if (e.prize) { ledger.post(userOf(e.userId), e.prize, 'contest_prize', 'CON-' + contest.id, `Rank ${i + 1}: ${contest.name}`); note(e.userId, 'Contest prize', `You finished #${i + 1} in ${contest.name}: ${e.prize} points.`); }
    }
  });
  db.save();
}

// ---------- Predict & win ----------
function settlePred(cat, correct) {
  if (cat.status === 'settled') throw bad('Already settled');
  if (!cat.options.includes(correct)) throw bad('Correct answer must be one of the options');
  cat.correct = correct; cat.status = 'settled';
  for (const p of db.data.predictions.filter(x => x.catId === cat.id)) {
    if (p.option === correct) { p.won = true; ledger.post(userOf(p.userId), cat.reward, 'prediction_win', 'PRED-' + cat.id, `Prediction: ${cat.title}`); note(p.userId, 'Prediction correct!', `+${cat.reward} points.`); }
    else p.won = false;
  }
  db.save();
}

module.exports = { placePropEntry, settleProp, voidProp, createTeam, joinContest, prizePool, settleContest, settlePred, BUDGET, TEAM_SIZE, RANGE };
