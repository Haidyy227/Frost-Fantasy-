/* Hash router + auth/geo gate */
const COUNTRY_CHOICES = [['NE', 'Niger'], ['US', 'United States'], ['FR', 'France'], ['NG', 'Nigeria'], ['BF', 'Burkina Faso']];

const authPage = (mode) => {
  const reg = mode === 'register';
  const dev = S.geo && S.geo.dev;
  return {
    html: `<div class="login"><form class="box" id="authf" autocomplete="on"><img class="logo" src="assets/logos/logo-dark-bg.png" alt="Frost Fantasy">
      <h1>${reg ? 'Create your account' : 'Welcome back'}</h1><p>${reg ? 'Adults 18+ in Niger. Play with points bought in XOF.' : 'Sign in to continue.'}</p>
      ${reg ? `<input class="pi" name="name" placeholder="Full name" aria-label="Full name" required autocomplete="name">` : ''}
      <input class="pi" name="email" type="email" placeholder="Email" aria-label="Email" required autocomplete="email">
      ${reg ? `<input class="pi" name="phone" type="tel" placeholder="Phone (+227 90 00 00 00)" aria-label="Phone" required autocomplete="tel"><label style="display:block;text-align:left;font-size:12px;color:var(--muted);margin:2px 0 6px">Date of birth</label><input class="pi" name="dob" type="date" aria-label="Date of birth" required>` : ''}
      <input class="pi" name="password" type="password" placeholder="Password${reg ? ' (8+ characters)' : ''}" aria-label="Password" required autocomplete="${reg ? 'new-password' : 'current-password'}">
      ${reg ? `<label style="display:flex;gap:10px;align-items:flex-start;text-align:left;font-size:12px;color:var(--muted);margin:4px 0 10px"><input type="checkbox" name="terms" style="margin-top:2px"> I am 18 or older and accept the terms. Play responsibly.</label>` : ''}
      <button class="btn btn-teal btn-lg" type="submit">${reg ? 'Create account' : 'Sign in'}</button>
      <div class="alt">${reg ? 'Already have an account? <a href="#/login">Sign in</a>' : 'New here? <a href="#/register">Create an account</a>'}</div>
      ${dev && !reg ? `<div class="alt" style="border-top:1px solid #2d2e34;padding-top:14px">Local demo: <a href="#" data-fill="player">fill player</a> · <a href="#" data-fill="admin">fill admin</a></div>` : ''}
      ${dev ? `<div class="alt">Dev location: ${U.esc(S.geo.countryName)} ${geoSelect()}</div>` : ''}</form></div>`,
    mount(root) {
      wireGeo(root);
      U.$$('[data-fill]', root).forEach(a => a.addEventListener('click', e => {
        e.preventDefault(); const f = U.$('#authf', root);
        f.email.value = a.dataset.fill === 'admin' ? 'admin@frost.local' : 'player@frost.local';
        f.password.value = a.dataset.fill === 'admin' ? 'Admin123!' : 'Player123!';
      }));
      U.$('#authf', root).addEventListener('submit', async e => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.target).entries()); d.terms = !!d.terms;
        const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
        try {
          const r = await API.post(reg ? '/api/auth/register' : '/api/auth/login', d);
          S.me = r.user; location.hash = r.user.role === 'admin' && !reg ? '#/admin/dashboard' : '#/dashboard'; render(true);
        } catch (err) { U.toast(err.message); if (err.status === 451) render(true); }
        btn.disabled = false;
      });
    }
  };
};

const geoSelect = () => `<select data-geo style="background:#1b1c21;color:#fff;border:1px solid #2d2e34;border-radius:8px;padding:4px 8px">${COUNTRY_CHOICES.map(c => `<option value="${c[0]}" ${S.geo && S.geo.country === c[0] ? 'selected' : ''}>${c[1]}</option>`).join('')}</select>`;
function wireGeo(root) {
  const g = U.$('[data-geo]', root); if (!g) return;
  g.addEventListener('change', async () => { await API.post('/api/dev/geo', { country: g.value }); render(true); });
}

const blockedPage = () => ({
  html: `<div class="login"><div class="box"><img class="logo" src="assets/logos/logo-dark-bg.png" alt="Frost Fantasy">
    <h1>Not available in your location</h1><p>Frost Fantasy can only be played from ${S.geo.allowedCountries.map(c => U.esc(c.name)).join(', ')}.<br>We detected: <b>${U.esc(S.geo.countryName || 'unknown location')}</b>.</p>
    ${S.geo.dev ? `<div class="alt">Local demo — pretend to be in: ${geoSelect()}</div>` : ''}
    <div class="alt"><a href="#/login">Admin sign in</a></div></div></div>`,
  mount: wireGeo
});

const ROUTES = [
  [/^\/login$/, () => authPage('login')],
  [/^\/register$/, () => authPage('register')],
  [/^\/dashboard$/, UP.dashboard],
  [/^\/sportbook$/, UP.sportbook],
  [/^\/fantasy\/lineup$/, () => UP.fantasy('lineup')],
  [/^\/fantasy\/teams$/, () => UP.fantasy('teams')],
  [/^\/fantasy\/predict$/, () => UP.fantasy('predict')],
  [/^\/fantasy\/create-team$/, UP.createTeam],
  [/^\/fantasy\/contest\/\d+$/, UP.contest],
  [/^\/match\/\w+$/, UP.match],
  [/^\/lottery$/, UP.lottery],
  [/^\/wallet$/, UP.wallet],
  [/^\/profile\/(edit|support|security|faq)$/, m => UP.profile(m[1])],
  [/^\/admin\/dashboard$/, AD.dashboard],
  [/^\/admin\/users$/, AD.users],
  [/^\/admin\/odds$/, AD.odds],
  [/^\/admin\/props$/, AD.props],
  [/^\/admin\/contests$/, AD.contests],
  [/^\/admin\/teams$/, AD.teams],
  [/^\/admin\/teams\/\d+$/, AD.teamDetail],
  [/^\/admin\/prediction$/, AD.prediction],
  [/^\/admin\/drawing$/, AD.drawing],
  [/^\/admin\/rewards$/, AD.rewards],
  [/^\/admin\/payments$/, AD.payments],
  [/^\/admin\/other\/leaderboard$/, AD.leaderboard],
  [/^\/admin\/other\/antifraud$/, AD.antifraud],
  [/^\/admin\/other\/reports$/, AD.reports],
  [/^\/admin\/other\/content$/, AD.content],
  [/^\/admin\/settings$/, AD.settings],
  [/^\/admin\/notify$/, AD.notify],
  [/^\/admin\/profile$/, AD.profile],
  [/^\/admin\/password$/, AD.password],
];

let renderSeq = 0;
async function render(fromAction) {
  const seq = ++renderSeq;
  let path = (location.hash.replace(/^#/, '') || '/dashboard').split('?')[0];
  const isAuthPath = /^\/(login|register)$/.test(path);
  let page = null;
  try {
    const me = await API.get('/api/auth/me'); S.me = me.user; S.geo = me.geo;
    const admin = S.me && S.me.role === 'admin';
    if (!S.geo.allowed && !admin && path !== '/login') page = blockedPage(); // /login stays reachable so admins can sign in from anywhere
    else if (!S.me && !isAuthPath) { location.hash = '#/login'; return; }
    else if (S.me && isAuthPath) { location.hash = admin ? '#/admin/dashboard' : '#/dashboard'; return; }
    else if (path.startsWith('/admin') && !admin) { location.hash = '#/dashboard'; return; }
    if (!page) {
      if (!S.me) S.meta = await API.get('/api/meta'); else { S.meta = await API.get('/api/meta'); await loadFor(path); }
    }
  } catch (e) {
    if (e.status === 451) { try { S.geo = e.data.geo; } catch (x) {} page = blockedPage(); }
    else if (e.status === 401) { if (!isAuthPath) { location.hash = '#/login'; return; } }
    else if (e.status === 503 || e.status === 0) page = { html: `<div class="login"><div class="box"><img class="logo" src="assets/logos/logo-dark-bg.png" alt=""><h1>${e.status ? 'Down for maintenance' : 'Server unreachable'}</h1><p>${U.esc(e.message)}</p><button class="btn btn-teal btn-lg" onclick="render()">Try again</button></div></div>`, mount() {} };
    else { U.toast(e.message); }
  }
  if (seq !== renderSeq) return; // a newer navigation superseded this one
  const old = document.getElementById('root');
  const root = old.cloneNode(false); old.replaceWith(root); // fresh node → drops previous page's listeners
  if (!page) {
    for (const [re, fn] of ROUTES) {
      const m = path.match(re);
      if (m) { page = fn(m); break; }
    }
  }
  if (!page) { location.hash = '#/dashboard'; return; }
  const scroll = window.scrollY;
  document.body.classList.toggle('admin', path.startsWith('/admin') && !!(S.me && S.me.role === 'admin'));
  root.innerHTML = page.html;
  page.mount(root);
  window.scrollTo(0, render._last === path ? scroll : 0);
  render._last = path;
  document.title = 'Frost Fantasy';
}
window.render = render;
window.addEventListener('hashchange', () => render());
window.addEventListener('DOMContentLoaded', () => render());
