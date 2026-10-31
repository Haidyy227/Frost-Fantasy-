/* API client + server-state cache (S). Pages read from S; the router fills it before each render. */
const S = { me: null, geo: null, meta: null };

const API = {
  async req(method, url, body) {
    let res;
    try {
      res = await fetch(url, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    } catch (e) { const err = new Error('Cannot reach the server. Is it running?'); err.status = 0; throw err; }
    let data = {}; try { data = await res.json(); } catch (e) {}
    if (!res.ok) { const err = new Error(data.error || 'Something went wrong'); err.status = res.status; err.data = data; throw err; }
    return data;
  },
  get: (u) => API.req('GET', u),
  post: (u, b) => API.req('POST', u, b || {}),
  put: (u, b) => API.req('PUT', u, b || {}),
  del: (u) => API.req('DELETE', u),
};

/* run an action, toast errors, optionally re-render */
async function act(fn, { ok, rerender = true } = {}) {
  try {
    const r = await fn();
    if (ok) U.toast(typeof ok === 'function' ? ok(r) : ok);
    if (rerender) await window.render(true);
    return r;
  } catch (e) {
    if (e.status === 451 || e.status === 401) return window.render(true);
    U.toast(e.message); return null;
  }
}

/* data each route needs: [stateKey, url] */
const NEED = [
  [/^\/dashboard$/, [['fixtures', '/api/fixtures'], ['props', '/api/fantasy/props'], ['notifs', '/api/me/notifications'], ['content', '/api/content'], ['contests', '/api/fantasy/contests']]],
  [/^\/sportbook$/, [['fixtures', '/api/fixtures'], ['bets', '/api/bets']]],
  [/^\/fantasy\/lineup$/, [['props', '/api/fantasy/props'], ['entries', '/api/fantasy/entries']]],
  [/^\/fantasy\/teams$/, [['teams', '/api/fantasy/teams'], ['players', '/api/fantasy/players'], ['contests', '/api/fantasy/contests']]],
  [/^\/fantasy\/predict$/, [['predict', '/api/predict'], ['contests', '/api/fantasy/contests']]],
  [/^\/fantasy\/create-team$/, [['players', '/api/fantasy/players']]],
  [/^\/fantasy\/contest\/(\d+)$/, m => [['contest', `/api/fantasy/contests/${m[1]}`], ['contests', '/api/fantasy/contests'], ['teams', '/api/fantasy/teams']]],
  [/^\/match\/(\d+)$/, m => [['fixture', `/api/fixtures/${m[1]}`]]],
  [/^\/lottery$/, [['lottery', '/api/lottery']]],
  [/^\/wallet$/, [['wallet', '/api/wallet']]],
  [/^\/profile\/(support|faq)$/, [['content', '/api/content']]],
  [/^\/admin\/dashboard$/, [['a_dash', '/api/admin/dashboard'], ['a_users', '/api/admin/users']]],
  [/^\/admin\/users$/, [['a_users', '/api/admin/users']]],
  [/^\/admin\/odds$/, [['a_fx', '/api/admin/fixtures']]],
  [/^\/admin\/props$/, [['a_props', '/api/admin/props'], ['a_players', '/api/admin/players']]],
  [/^\/admin\/contests$/, [['a_contests', '/api/admin/contests'], ['a_players', '/api/admin/players']]],
  [/^\/admin\/teams$/, [['a_teams', '/api/admin/teams']]],
  [/^\/admin\/teams\/(\d+)$/, m => [['a_team', `/api/admin/teams/${m[1]}`]]],
  [/^\/admin\/prediction$/, [['a_pred', '/api/admin/prediction']]],
  [/^\/admin\/drawing$/, [['a_lot', '/api/admin/lottery']]],
  [/^\/admin\/rewards$/, [['content', '/api/content'], ['a_contests', '/api/admin/contests']]],
  [/^\/admin\/payments$/, [['a_pay', '/api/admin/payments']]],
  [/^\/admin\/other\/leaderboard$/, [['a_users', '/api/admin/users']]],
  [/^\/admin\/other\/antifraud$/, [['a_fraud', '/api/admin/antifraud']]],
  [/^\/admin\/other\/reports$/, [['a_rep', '/api/admin/reports'], ['a_dash', '/api/admin/dashboard']]],
  [/^\/admin\/other\/content$/, [['content', '/api/content']]],
  [/^\/admin\/settings$/, [['a_set', '/api/admin/settings'], ['a_audit', '/api/admin/audit']]],
];

async function loadFor(path) {
  for (const [re, need] of NEED) {
    const m = path.match(re);
    if (!m) continue;
    const list = typeof need === 'function' ? need(m) : need;
    await Promise.all(list.map(async ([k, url]) => { S[k] = await API.get(url); }));
    return;
  }
}

window.S = S; window.API = API; window.act = act; window.loadFor = loadFor;
