'use strict';
// Tiny JSON-file store. All access goes through this module so it can be swapped for Postgres later.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILE = process.env.FF_DB || path.join(__dirname, '..', '..', 'data', 'db.json');

const EMPTY = () => ({
  seq: {}, settings: {}, users: [], ledger: [], payments: [], fixtures: [], bets: [],
  players: [], props: [], propEntries: [], teams: [], contests: [], contestEntries: [],
  predCats: [], predictions: [], draws: [], tickets: [], audit: [], notifications: [], content: {}, flags: []
});

let data = EMPTY();
let timer = null;

function load() {
  try { data = Object.assign(EMPTY(), JSON.parse(fs.readFileSync(FILE, 'utf8'))); return true; }
  catch (e) { data = EMPTY(); return false; }
}
function flush() {
  clearTimeout(timer); timer = null;
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, FILE); // atomic replace
}
function save() { if (!timer) timer = setTimeout(flush, 50); }
function id(prefix) { data.seq[prefix] = (data.seq[prefix] || 0) + 1; return data.seq[prefix]; }
function uid() { return crypto.randomBytes(8).toString('hex'); }
process.on('exit', () => { if (timer) try { flush(); } catch (e) {} });
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => process.exit(0));

module.exports = { load, save, flush, id, uid, get data() { return data; }, FILE };
