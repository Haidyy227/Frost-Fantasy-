'use strict';
const crypto = require('crypto');
const db = require('./db');
const auth = require('./auth');
const ledger = require('./ledger');

const DEFAULT_SETTINGS = {
  siteName: 'Frost Fantasy',
  allowedCountries: ['NE'],
  minAge: 18,
  depositFeePct: 3,          // fee added on deposits (taken out of the amount paid)
  withdrawFeePct: 2,
  minDeposit: 500, maxDeposit: 500000,
  minWithdraw: 1000, maxWithdraw: 1000000,
  withdrawTurnover: true,     // must wager deposited points at least once before withdrawing
  maxStake: 100000,
  maxPayout: 2000000,
  contestRakePct: 10,
  lotteryTicketPrice: 500,
  signupBonus: 0,
  providers: { airtel: true, orange: true, moov: true, wave: true, nita: true, amana: true, card: false },
  agentToken: crypto.randomBytes(24).toString('hex'),
  webhookSecret: crypto.randomBytes(24).toString('hex'),
  maintenance: false,
};

const PROVIDERS = {
  airtel: { name: 'Airtel Money', kind: 'mobile' }, orange: { name: 'Orange Money', kind: 'mobile' },
  moov: { name: 'Moov Money', kind: 'mobile' }, wave: { name: 'Wave', kind: 'mobile' },
  nita: { name: 'NITA', kind: 'mobile' }, amana: { name: 'Amana', kind: 'mobile' },
  card: { name: 'Bank card', kind: 'card' },
};

function mkUser({ name, email, phone, password, role = 'player', balance = 0 }) {
  const u = { id: db.id('user'), name, email: email.toLowerCase(), phone, country: 'NE', role, status: 'active', balance: 0, wagerReq: 0, tokenVersion: 0,
    password: auth.hashPassword(password), createdAt: Date.now(), lastSeen: Date.now() };
  db.data.users.push(u);
  if (balance) ledger.post(u, balance, 'bonus', null, 'Demo starting points');
  return u;
}

const ms = (h) => Date.now() + h * 3600e3;

function seed() {
  const d = db.data;
  d.settings = Object.assign({}, DEFAULT_SETTINGS, d.settings || {});
  if (d.users.length) return false;

  mkUser({ name: 'Admin', email: 'admin@frost.local', phone: '+22790000000', password: 'Admin123!', role: 'admin' });
  mkUser({ name: 'Juliet Jackson', email: 'player@frost.local', phone: '+22796000001', password: 'Player123!', balance: 20000 });

  // player pool
  const POS = ['Goalkeeper', 'Right Back', 'Striker', 'Attacking Midfielder'];
  const names = ['Brandon Baptista', 'Craig Vetrovs', 'Memphis Depay', 'Frenkie De Jong', 'Moussa Diallo', 'Amadou Keita', 'Lucas Moreau', 'Ibrahim Traoré',
    'Daniel Adams', 'Samuel Okafor', 'Marco Silva', 'Kevin Laurent', 'Ousmane Sy', 'Tariq Bello', 'Nuno Reis', 'Pablo Vidal', 'Joao Pires', 'Sadio Ba', 'Yann Lefèvre', 'Idris Mamane'];
  names.forEach((n, i) => d.players.push({ id: 'p' + (i + 1), name: n, pos: POS[i % 4], club: ['Barcelona', 'Man City', 'Real Madrid', 'Liverpool'][i % 4], price: 2000 + (i % 5) * 500, skin: i % 2 ? 'light' : 'dark' }));

  // fixtures (admin-managed odds)
  const fx = [
    ['World - FIFA Women\'s World Cup', 'Spain', 'Netherlands', -1, [1.8, 3.2, 4.1], 'live', '2-1'],
    ['World - FIFA Women\'s World Cup', 'Japan', 'Sweden', 3, [2.1, 3.1, 3.4]],
    ['World - FIFA Women\'s World Cup', 'Olympiakos', 'Genk', 5, [2.4, 3.0, 2.9]],
    ['Spain - La Liga', 'Real Madrid', 'Barcelona', 8, [2.3, 3.4, 2.8]],
    ['Spain - La Liga', 'Atlético Madrid', 'Villarreal', 10, [1.7, 3.5, 4.8]],
    ['England - Premier League', 'Liverpool', 'Man United', 26, [1.9, 3.6, 3.9]],
    ['England - Premier League', 'Leicester City', 'Man City', 28, [5.5, 4.2, 1.5]],
    ['Draft example (agent)', 'Portugal', 'Belgium', 30, [2.0, 3.2, 3.6], 'draft'],
  ];
  fx.forEach(([league, home, away, h, odds, status, score]) => d.fixtures.push({
    id: db.id('fixture'), league, home, away, kickoff: ms(h), odds: { h: odds[0], d: odds[1], a: odds[2] },
    status: status || 'open', score: score || null, source: status === 'draft' ? 'agent' : 'admin', createdAt: Date.now()
  }));

  // line-up props (More / Less)
  const stats = [['Shots', 3.5], ['Shots on target', 1.5], ['Passes', 42.5], ['Tackles', 2.5], ['Fouls', 1.5], ['Saves', 3.5], ['Assists', 0.5], ['Dribbles', 2.5]];
  stats.forEach(([stat, line], i) => d.props.push({ id: db.id('prop'), playerId: d.players[i].id, stat, line, kickoff: ms(20 + i), match: 'vs Man City', status: 'open', actual: null }));

  // contests
  [['Weekend Warriors', 1000, 8], ['High Rollers', 5000, 2]].forEach(([name, fee, h], i) => d.contests.push({ id: db.id('contest'), name, entryFee: fee, maxEntries: 100, startsAt: ms(h * 6), status: 'open', playerScores: {}, createdAt: Date.now() }));

  // predict & win
  d.predCats.push({ id: db.id('predcat'), title: 'Who wins La Liga this season?', options: ['Real Madrid', 'Barcelona', 'Atlético Madrid', 'Other'], reward: 2000, closesAt: ms(72), status: 'open', correct: null });
  d.predCats.push({ id: db.id('predcat'), title: 'Top scorer in Premier League?', options: ['Haaland', 'Salah', 'Kane', 'Other'], reward: 1500, closesAt: ms(96), status: 'open', correct: null });

  d.content = {
    faq: [{ q: 'How do I get points?', a: 'Deposit XOF with a mobile-money account (Airtel, Orange, Moov, Wave, NITA, Amana). 1 XOF = 1 point, minus the deposit fee shown before you pay.' },
      { q: 'How do I withdraw?', a: 'Request a withdrawal from your wallet. Our team approves it and sends money to your mobile-money number, minus the withdrawal fee.' },
      { q: 'Who can play?', a: 'Adults (18+) located in Niger and other enabled countries.' }],
    weekly: 'Weekly programme: play any product at least 3 times this week and win a bonus draw entry. Ask support for details.',
    support: { email: 'support@frost.local', phone: '+227 90 00 00 00' }
  };
  db.save();
  return true;
}

module.exports = { seed, PROVIDERS, DEFAULT_SETTINGS };
