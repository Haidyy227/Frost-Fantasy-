'use strict';
const db = require('./db');
const ledger = require('./ledger');
const pay = require('./payments');
const { bad } = require('./http');

const LABEL = { h: 'Home', d: 'Draw', a: 'Away' };
const round2 = n => Math.round(n * 100) / 100;

function placeBet(user, selections, stake) {
  const s = db.data.settings;
  if (!Array.isArray(selections) || !selections.length) throw bad('Pick at least one outcome');
  if (selections.length > 10) throw bad('Maximum 10 selections');
  if (!Number.isInteger(stake) || stake < 100) throw bad('Minimum stake is 100 points');
  if (stake > s.maxStake) throw bad(`Maximum stake is ${s.maxStake} points`);
  const seen = new Set(); const sel = [];
  for (const x of selections) {
    const f = db.data.fixtures.find(f => f.id === Number(x.fixtureId));
    if (!f || !['open', 'live'].includes(f.status)) throw bad('A selected match is no longer open');
    if (f.status === 'open' && f.kickoff < Date.now()) throw bad(`${f.home} v ${f.away} has already started`);
    if (!['h', 'd', 'a'].includes(x.pick)) throw bad('Invalid pick');
    if (seen.has(f.id)) throw bad('Only one pick per match');
    seen.add(f.id);
    sel.push({ fixtureId: f.id, pick: x.pick, odds: f.odds[x.pick], match: `${f.home} v ${f.away}`, label: x.pick === 'h' ? f.home : x.pick === 'a' ? f.away : 'Draw', result: null });
  }
  const totalOdds = round2(sel.reduce((p, x) => p * x.odds, 1));
  const potential = Math.min(Math.floor(stake * totalOdds), s.maxPayout);
  const bet = { id: db.id('bet'), userId: user.id, legs: sel, stake, totalOdds, potential, status: 'open', placedAt: Date.now(), payout: 0 };
  ledger.post(user, -stake, 'bet_stake', 'BET-' + bet.id, `Bet #${bet.id}`);
  pay.noteWager(user, stake);
  db.data.bets.push(bet);
  db.save();
  return bet;
}

function resolveBet(bet) {
  if (bet.status !== 'open' || bet.legs.some(x => x.result === null)) return;
  const user = db.data.users.find(u => u.id === bet.userId);
  bet.settledAt = Date.now();
  if (bet.legs.some(x => x.result === 'lost')) { bet.status = 'lost'; return; }
  const live = bet.legs.filter(x => x.result === 'won');
  if (!live.length) { bet.status = 'void'; bet.payout = bet.stake; }
  else {
    bet.status = 'won';
    bet.payout = Math.min(Math.floor(bet.stake * live.reduce((p, x) => p * x.odds, 1)), db.data.settings.maxPayout);
  }
  ledger.post(user, bet.payout, bet.status === 'won' ? 'bet_win' : 'bet_refund', 'BET-' + bet.id, `Bet #${bet.id} ${bet.status}`);
  db.data.notifications.push({ id: db.id('notif'), userId: user.id, title: bet.status === 'won' ? 'You won!' : 'Bet refunded', text: `Bet #${bet.id}: ${bet.payout} points.`, ts: Date.now(), read: false });
}

function settleFixture(f, score, voided) {
  if (['settled', 'void'].includes(f.status)) throw bad('Already settled');
  let result = null;
  if (voided) { f.status = 'void'; }
  else {
    const m = /^(\d+)\s*-\s*(\d+)$/.exec(String(score || ''));
    if (!m) throw bad('Score must look like 2-1');
    const a = +m[1], b = +m[2];
    f.score = `${a}-${b}`; f.result = result = a > b ? 'h' : a < b ? 'a' : 'd'; f.status = 'settled';
  }
  for (const bet of db.data.bets) {
    if (bet.status !== 'open') continue;
    for (const x of bet.legs) if (x.fixtureId === f.id) x.result = voided ? 'void' : (x.pick === result ? 'won' : 'lost');
    resolveBet(bet);
  }
  db.save();
}

module.exports = { placeBet, settleFixture, LABEL, round2 };
