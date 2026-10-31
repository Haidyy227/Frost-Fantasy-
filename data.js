/* Demo data. Everything is mock — swap for your API later (see README). */
const D = {};

D.matchDays = [
  ['Wednesday', '09 Aug'], ['Yesterday', '10 Aug'], ['Today', '11 Aug'],
  ['Tomorrow', '12 Aug'], ['Sunday', '13 Aug'], ['Monday', '14 Aug'],
];

D.leagues = [
  { name: 'World - FIFA Women\'s World Cup', round: 'Quarter Finals', crest: ['WC', '#2b6cb0'], matches: [
    { id: 'm1', t: 'Live', home: 'Spain', away: 'Netherlands', score: '2-1', o: [1.8, 2.1, 1.3] },
    { id: 'm2', t: '13:40', home: 'Japan', away: 'Sweden', o: [1.8, 2.1, 1.3] },
    { id: 'm3', t: '18:20', home: 'Olympiakos', away: 'Genk', o: [1.8, 2.1, 1.3] },
  ]},
  { name: 'Spain - La Liga', round: 'Quarter Finals', crest: ['LL', '#e2543b'], matches: [
    { id: 'm4', t: '01:43', home: 'Spain', away: 'Netherlands', o: [1.8, 2.1, 1.3] },
    { id: 'm5', t: '13:40', home: 'Japan', away: 'Sweden', o: [1.8, 2.1, 1.3] },
    { id: 'm6', t: '18:20', home: 'Olympiakos', away: 'Genk', o: [1.8, 2.1, 1.3] },
  ]},
  { name: 'Spain - La Liga', round: 'Quarter Finals', crest: ['LL', '#e2543b'], matches: [
    { id: 'm7', t: '01:43', home: 'Spain', away: 'Netherlands', o: [1.8, 2.1, 1.3] },
    { id: 'm8', t: '13:40', home: 'Japan', away: 'Sweden', o: [1.8, 2.1, 1.3] },
    { id: 'm9', t: '18:20', home: 'Olympiakos', away: 'Genk', o: [1.8, 2.1, 1.3] },
  ]},
  { name: 'Spain - La Liga', round: 'Quarter Finals', crest: ['LL', '#e2543b'], matches: [
    { id: 'm10', t: '01:43', home: 'Spain', away: 'Netherlands', o: [1.8, 2.1, 1.3] },
    { id: 'm11', t: '13:40', home: 'Japan', away: 'Sweden', o: [1.8, 2.1, 1.3] },
  ]},
];

D.crestColors = {
  Spain: '#c8102e', Netherlands: '#f36c21', Japan: '#2e3192', Sweden: '#1f8a4c', Olympiakos: '#d62828', Genk: '#1d5fb4',
  Liverpool: '#c8102e', 'Man United': '#da291c', 'Leicester City': '#2a62b8', Villareal: '#d9a600', Villarreal: '#d9a600',
  'Atlético Madrid': '#c8102e', 'Real Madrid': '#e8e8ee', Barcelona: '#a50044', Portugal: '#046a38', Belgium: '#f2c300',
};

D.leaderboardTable = [
  ['Liverpool', 6, 2, 21, 16, 33], ['Man United', 3, 3, 24, 9, 33], ['Leicester City', 2, 5, 21, 10, 32],
  ['Villareal', 8, 2, 10, 16, 32], ['Atlético Madrid', 2, 1, 6, 23, 38], ['Real Madrid', 4, 3, 7, 15, 37],
  ['Barcelona', 4, 4, 9, 20, 34], ['Villareal', 8, 2, 10, 16, 32],
];

D.players = [
  { id: 'p1', name: 'Brandon Baptista', pos: 'Goalkeeper', price: 2000, skin: 'dark' },
  { id: 'p2', name: 'Brandon Baptista', pos: 'Goalkeeper', price: 2000, skin: 'dark' },
  { id: 'p3', name: 'Brandon Baptista', pos: 'Goalkeeper', price: 2000, skin: 'dark' },
  { id: 'p4', name: 'Craig Vetrovs', pos: 'Right Back', price: 2000, skin: 'light' },
  { id: 'p5', name: 'Craig Vetrovs', pos: 'Right Back', price: 2000, skin: 'light' },
  { id: 'p6', name: 'Craig Vetrovs', pos: 'Right Back', price: 2000, skin: 'light' },
  { id: 'p7', name: 'Memphis Depay', pos: 'Striker', price: 2000, skin: 'dark' },
  { id: 'p8', name: 'Memphis Depay', pos: 'Striker', price: 2000, skin: 'dark' },
  { id: 'p9', name: 'Memphis Depay', pos: 'Striker', price: 2000, skin: 'dark' },
  { id: 'p10', name: 'Frenkie De Jong', pos: 'Attacking Midfielder', price: 2000, skin: 'light' },
  { id: 'p11', name: 'Frenkie De Jong', pos: 'Attacking Midfielder', price: 2000, skin: 'light' },
  { id: 'p12', name: 'Frenkie De Jong', pos: 'Attacking Midfielder', price: 2000, skin: 'light' },
  { id: 'p13', name: 'Frenkie De Jong', pos: 'Attacking Midfielder', price: 2000, skin: 'light' },
  { id: 'p14', name: 'Frenkie De Jong', pos: 'Attacking Midfielder', price: 2000, skin: 'light' },
  { id: 'p15', name: 'Frenkie De Jong', pos: 'Attacking Midfielder', price: 2000, skin: 'light' },
];

D.lineup = Array.from({ length: 8 }, (_, i) => ({
  id: 'l' + i, name: 'Barcelona - Midfielder', sport: 'Soccer', when: 'Sat, Sep 28 7:30 am vs Man City',
  stat: '10 Shots', skin: 'dark',
}));

D.formations = ['4- 4- 2', '4- 3- 3', '3- 5- 2', '4- 2- 3- 1', '5- 3- 2'];

D.notifs = [
  ['System Update', 'Lorem ipsum dolor sit amet consectetur. Id risus sapien amet eget bibendum erat turpis. Risus erat justo sed aliquam est sem. Fringilla nibh ut risus at massa ut rhoncus arcu. Interdum aliquam id nunc egestas aliquam elit.'],
  ['System Update', 'Lorem ipsum dolor sit amet consectetur. Id risus sapien amet eget bibendum erat turpis. Risus erat justo sed aliquam est sem. Fringilla nibh ut risus at massa ut rhoncus arcu. Interdum aliquam id nunc egestas aliquam elit.'],
  ['System Update', 'Lorem ipsum dolor sit amet consectetur. Id risus sapien amet eget bibendum erat turpis. Risus erat justo sed aliquam est sem. Fringilla nibh ut risus at massa ut rhoncus arcu. Interdum aliquam id nunc egestas aliquam elit.'],
];

D.winners = ['Domingo Langosh', 'Connie Windler', 'Tanya West', 'Ada Moore', 'Danielle O\'Reilly'];

D.news = [
  { t: 'Results And Scores From The Premier League....!!', d: '5 Hours Ago', hue: 205, big: true, bm: true },
  { t: 'Here Are The Top 100 Players And Managers', d: '11 Oct 2023, 06:00 AM', hue: 0 },
  { t: 'Results And Scores From The Premier League....!!', d: '10 Oct 2023, 09:00 PM', hue: 120 },
  { t: 'Join Or Start A Competition Now!', d: '10 Oct 2023, 02:40 PM', hue: 150, bm: true },
  { t: 'Results And Scores From The Premier League....!!', d: '09 Oct 2023, 08:12 AM', hue: 30, bm: true },
  { t: 'Results And Scores From The Premier League....!!', d: '09 Oct 2023, 02:00 PM', hue: 100 },
];

D.faq = [
  ['What is a Payment Gateway?', ['A payment gateway is an ecommerce service that processes online payments for online as well as offline businesses. Payment gateways help accept payments by transferring key information from their merchant websites to issuing banks, card associations and online wallet players.', 'Payment gateways play a vital role in the online transaction process, which is the realisation of value, and hence are seen as an important pillar of ecommerce.']],
  ['Do I need to pay to Instapay even when there is no transaction going on in my business?', ['No. You only pay when a transaction is processed on your account. There is no charge for idle periods.']],
  ['What platforms does Instapay payment gateway support?', ['Instapay supports web, Android and iOS checkouts, as well as hosted payment links and plugins for common storefront platforms.']],
  ['Does Instapay provide international payments support?', ['Yes. International cards and multiple currencies are supported, subject to the settlement rules of your account.']],
  ['Is there any setup fee or annual maintainance fee that I need to pay regularly?', ['There is no setup fee and no annual maintenance fee. You are charged a small per-transaction fee only.']],
];

D.portugalBelgium = {
  home: { n: 'Portugal', f: '4-3-3', c: '#046a38', c2: '#d62828' },
  away: { n: 'Belgium', f: '3-4-3', c: '#111', c2: '#f2c300' },
  stats: [['Pass', 542, 431], ['Shoot', 8, 6], ['Shoot on Target', 7, 5], ['Ball Possession', '54%', '46%'], ['Red Card', 0, 0], ['Yellow Card', 2, 5], ['Offside', 4, 2], ['Corners', 9, 4]],
  lineup: [['GK', 'Diogo Costa', 'T. Courtois', 'GK'], ['DF', 'Danilo Pereira', 'Wout Faes', 'DF'], ['DF', 'Pepe', 'T. Meunier', 'DF'], ['DF', 'Rúben Dias', 'A. Theate', 'DF'], ['MF', 'Bernardo Silva', 'Kevin D.B', 'MF'], ['MF', 'Bruno .F', 'Axel Witsel', 'MF'], ['MF', 'João Palhinha', 'H. Vanaken', 'MF'], ['MF', 'Nuno Mendes', 'A. Onana', 'MF'], ['FW', 'C. Ronaldo', 'R. Lukaku', 'FW'], ['FW', 'João Félix', 'E. Hazard', 'FW'], ['FQ', 'Ricardo Horta', 'D. Mertens', 'FW']],
  red: [[8, 50], [10, 63], [5, 47], [4, 20], [6, 33], [11, 17], [7, 27], [8, 41], [9, 90], [2, 40], [3, 58]],
};

/* ───── Admin data ───── */
const FN = ['Cleus', 'Amadou', 'Fatima', 'Ibrahim', 'Marie', 'Samuel', 'Aïcha', 'Lucas', 'Zainab', 'Daniel', 'Chloé', 'Moussa'];
const LN = ['Cleus', 'Diallo', 'Haidara', 'Moore', 'Traoré', 'Okafor', 'Smith', 'Keita', 'Laurent', 'Adams', 'Boubacar', 'Reed'];
const pad = n => String(n).padStart(2, '0');
D.fmtDate = d => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
D.iso = d => d.toISOString().slice(0, 10);
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

D.users = Array.from({ length: 11 }, (_, i) => ({
  id: i + 1, first: FN[i], last: LN[i], email: (FN[i] + '.' + LN[i]).toLowerCase().replace(/[^a-z.]/g, '') + '@gmail.com',
  added: D.iso(daysAgo(60 - i * 5)), seen: D.iso(daysAgo(i % 4)), time: ['5:45 pm', '9:12 am', '1:30 pm', '7:05 pm'][i % 4],
  role: i % 5 === 0 ? 'Admin' : i % 3 === 0 ? 'Moderator' : 'Player',
}));
D.users[0].role = 'Admin';

D.contests = [23, 10, 4, 10, 23, 43, 22, 12, 32, 22, 12].map((t, i) => ({
  id: '#' + (13242 + i), team: t, date: D.iso(daysAgo(40 - i * 3)), status: i < 4 ? 'Ongoing' : 'Completed',
}));

D.adminTeams = Array.from({ length: 11 }, (_, i) => ({ id: '#' + (13242 + i), players: 14, date: D.iso(daysAgo(50 - i * 4)) }));

D.payments = [
  ['Deposit', 'Cleus', 'Cleus@gmail.com', 'Transfer', 'Pending', 250],
  ['Withdrawal', 'Amadou', 'amadou.diallo@gmail.com', 'Credit/Debit Card', 'Pending', 120],
  ['Deposit', 'Fatima', 'fatima.haidara@gmail.com', 'Transfer', 'Pending', 75],
  ['Deposit', 'Ibrahim', 'ibrahim.moore@gmail.com', 'Transfer', 'Approved', 500],
  ['Withdrawal', 'Marie', 'marie.traore@gmail.com', 'Transfer', 'Approved', 90],
  ['Deposit', 'Samuel', 'samuel.okafor@gmail.com', 'Transfer', 'Approved', 300],
  ['Deposit', 'Aïcha', 'aicha.smith@gmail.com', 'Credit/Debit Card', 'Approved', 40],
  ['Withdrawal', 'Lucas', 'lucas.keita@gmail.com', 'Transfer', 'Approved', 150],
  ['Deposit', 'Zainab', 'zainab.laurent@gmail.com', 'Transfer', 'Approved', 600],
  ['Deposit', 'Daniel', 'daniel.adams@gmail.com', 'Transfer', 'Approved', 80],
  ['Withdrawal', 'Chloé', 'chloe.boubacar@gmail.com', 'Transfer', 'Approved', 200],
].map((r, i) => ({ id: i + 1, type: r[0], name: r[1], email: r[2], gateway: r[3], status: r[4], amount: r[5], date: D.iso(daysAgo(30 - i * 2)) }));

D.traders = Array.from({ length: 6 }, () => ({ n: 'Cleus', d: '25 - 04 - 2024', a: '$ 200,000' }));

D.leaderboard = Array.from({ length: 11 }, (_, i) => ({ first: FN[i], last: LN[i], email: (FN[i] + '.' + LN[i]).toLowerCase().replace(/[^a-z.]/g, '') + '@gmail.com', rank: i + 1, date: D.iso(daysAgo(i * 3)) }));

D.chartGreen = [7, 8.2, 9.2, 6.3, 5.8, 6.3, 3.6, 7.8, 9];
D.chartRed = [4, 6, 8.8, 5, 3, 5, 1.2, 5.8, 8];
D.scatter = [[1, 3, 31], [1.3, 5, 87], [2, 4, 47], [2.5, 5, 50], [2.5, 6, 75], [3.4, 6, 66], [3.7, 7, 78], [4.1, 8, 71], [5.5, 9, 62], [6.2, 10, 58], [8, 11, 28], [8.4, 12, 66], [9.2, 13, 66], [9.7, 14, 34], [10, 15, 80], [10.5, 16, 26], [12, 17, 84], [12.6, 18, 31], [13, 19, 87], [13.4, 20, 33], [14.2, 21, 48], [14.7, 22, 75], [15.5, 23, 48], [16, 24, 66], [16.6, 25, 78], [17.2, 26, 70], [19, 27, 62], [19.7, 28, 58], [21.4, 29, 28], [22.2, 30, 66], [23, 31, 66], [23.6, 32, 32], [24, 33, 80], [24.5, 34, 26], [26.5, 35, 84], [27, 36, 31], [29, 37, 62], [30, 38, 58], [33.6, 39, 66], [34.3, 40, 30]];
D.barGBP = [3.2, 2.5, 1.8, 4.5, 3.1, 6.8, 1.8, 2.5, 5.6, 6.6, 4, 5.4];
D.barUSD = [1.9, 2.8, 2.1, 3.2, 5, 2.8, 3.8, 4.4, 4.5, 2.4, 1.8, 1.4];
D.months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

window.D = D;
