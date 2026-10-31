/* ═════════ Player-facing app ═════════ */
const UP = {};

/* ── tiny event helper: delegate by [data-act] ── */
const bind = (root, handlers) => {
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-act]'); if (!t || !root.contains(t)) return;
    const fn = handlers[t.dataset.act]; if (fn) fn(t, e);
  });
};
UP.bind = bind;

const sportState = { sport: 'soccer' };

/* ── shell ── */
UP.shell = (active, inner, { sports = true } = {}) => {
  const nav = [['dashboard', 'Dashboard', '#/dashboard', I.dashboard], ['sportbook', 'Sportbook', '#/sportbook', I.sportbook],
    ['fantasy', 'Fantasy', '#/fantasy/lineup', I.fantasy], ['lottery', 'Lottery', '#/lottery', I.lottery], ['wallet', 'Wallet', '#/wallet', I.wallet]];
  const name = S.me ? S.me.name : '';
  const ini = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return `<div class="app">
    <aside class="side">
      <a class="brand dark" href="#/dashboard" aria-label="Frost Fantasy"><img src="assets/logos/logo-dark-bg.png" alt="Frost Fantasy"></a>
      <div class="menu-label">MENU</div>
      <nav class="nav">${nav.map(n => `<a href="${n[2]}" class="${n[0] === active ? 'on' : ''}">${n[3]}${n[1]}</a>`).join('')}</nav>
      <a class="logout" href="#" data-logout>${I.logout}Logout</a>
    </aside>
    <div class="main">
      <header class="top">
        <label class="search">${I.search.replace('<svg', '<svg width="16" height="16"')}<input type="text" placeholder="Type to search..." aria-label="Search"></label>
        ${sports ? `<div class="sports"><button data-sport="soccer" class="${sportState.sport === 'soccer' ? 'on' : ''}" aria-label="Football">${I.soccer}</button><button data-sport="basket" class="${sportState.sport === 'basket' ? 'on' : ''}" aria-label="Basketball">${I.basket}</button></div>` : ''}
        <div class="grow"></div>
        <a class="pill" href="#/wallet">${I.wallet}<span id="hdr-bal">${U.money(S.me.balance)}</span></a>
        <div class="userbtn" id="userbtn"><button aria-haspopup="true"><span class="avatar">${ini}</span>${U.esc(name)}${I.chev.replace('<svg', '<svg width="16" height="16" style="opacity:.6"')}</button>
          <div class="dd"><a href="#/profile/edit">Edit profile</a><a href="#/profile/security">Security</a>${S.me.role === 'admin' ? '<a href="#/admin/dashboard">Admin console</a>' : ''}<a href="#" data-logout>Logout</a></div></div>
      </header>
      <main class="page">${inner}</main>
    </div></div>`;
};

UP.logout = async () => { try { await API.post('/api/auth/logout'); } catch (e) {} S.me = null; location.hash = '#/login'; render(true); };
UP.afterShell = root => {
  U.$$('[data-logout]', root).forEach(a => a.addEventListener('click', e => { e.preventDefault(); UP.logout(); }));
  const ub = U.$('#userbtn', root);
  if (ub) {
    ub.querySelector('button').addEventListener('click', e => { e.stopPropagation(); ub.classList.toggle('open'); });
    document.addEventListener('click', () => ub.classList.remove('open'), { once: true });
  }
  U.$$('[data-sport]', root).forEach(b => b.addEventListener('click', () => {
    if (b.dataset.sport === sportState.sport) return;
    sportState.sport = b.dataset.sport;
    U.$$('[data-sport]', root).forEach(x => x.classList.toggle('on', x === b));
    U.toast(b.dataset.sport === 'basket' ? 'Basketball fixtures are coming soon — showing football for now' : 'Football selected');
  }));
};

/* ── fixtures table (real data from the Odds Desk) ── */
UP.dayIdx = null;
UP.days = () => Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i - 1); return { start: d.getTime(), a: i === 1 ? 'Today' : i === 0 ? 'Yesterday' : i === 2 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'long' }), b: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) }; });
UP.fixtures = ({ odds = true, picks = new Set() }) => {
  const days = UP.days(), live = S.fixtures.fixtures.filter(f => f.status === 'live').length;
  return `<div class="fx-bar"><div class="live-chip"><i></i>Live <b>[${live}]</b></div>
    <label class="fx-search">${I.search}<input type="text" placeholder="Search For Matches" data-fxs></label>
    <div class="fx-all">All Matches ${I.chev.replace('<svg', '<svg width="14" height="14"')}</div></div>
  <div class="days">${days.map((d, i) => `<button data-act="day" data-i="${i}" class="${i === UP.dayIdx ? 'on' : ''}">${d.a}<br>${d.b}</button>`).join('')}
    <button class="cal" data-act="cal">${I.calendar}<span>View<br>Calendrer</span></button></div>
  ${odds ? `<div class="fx-head"><span>Date</span><span style="text-align:center">Matches</span><span>1X</span><span>X</span><span>X2</span></div>` : ''}
  <div id="fx-list">${UP.fxList(odds, picks, '')}</div>`;
};
UP.fxList = (odds, picks, q) => {
  q = q.trim().toLowerCase();
  const days = UP.days(), day = UP.dayIdx == null ? null : days[UP.dayIdx];
  const by = {};
  for (const f of S.fixtures.fixtures) {
    if (q && !(f.home + ' ' + f.away + ' ' + f.league).toLowerCase().includes(q)) continue;
    if (day && !(f.kickoff >= day.start && f.kickoff < day.start + 86400e3)) continue;
    (by[f.league] = by[f.league] || []).push(f);
  }
  const abbr = n => n.replace(/[^A-Za-z ]/g, ' ').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const out = Object.entries(by).map(([lg, ms]) => `<div class="league"><div class="league-h">${U.crest(abbr(lg), 22)}<span>${U.esc(lg)}</span></div>
      ${ms.map(m => { const t = m.status === 'live' ? 'Live' : m.status === 'settled' ? 'FT' : U.tm(m.kickoff);
        const open = m.status === 'open' || m.status === 'live';
        return `<div class="match" style="${odds ? '' : 'grid-template-columns:100px 1fr'}"><span class="t ${m.status === 'live' ? 'live' : ''}">${t}</span>
        <a class="teams" href="#/match/${m.id}"><span>${U.esc(m.home)}&nbsp;&nbsp;${U.crest(m.home, 20)}</span><b class="sc">${m.score || '-'}</b><span>${U.crest(m.away, 20)}&nbsp;&nbsp;${U.esc(m.away)}</span></a>
        ${odds ? ['h', 'd', 'a'].map(k => `<button class="odd ${picks.has(m.id + ':' + k) ? 'on' : ''}" ${open ? '' : 'disabled'} data-act="odd" data-k="${m.id}:${k}">${m.odds[k].toFixed(2)}</button>`).join('') : ''}</div>`; }).join('')}</div>`).join('');
  return out || '<p class="muted" style="padding:30px;text-align:center">No matches found.</p>';
};

/* generic athlete bust (original artwork, placeholder for photography) */
UP.figure = (jersey, skin = '#c98f6c', pose = 0) => `<svg viewBox="0 0 200 230" aria-hidden="true">
  <path d="M10 230c0-52 34-80 90-86 56 6 90 34 90 86z" fill="${jersey}"/>
  <path d="M72 148l28 24 28-24-8-20H80z" fill="${skin}" opacity=".92"/>
  <path d="M82 140l18 16 18-16" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="4"/>
  <rect x="84" y="108" width="32" height="40" rx="14" fill="${skin}"/>
  <ellipse cx="100" cy="76" rx="38" ry="46" fill="${skin}"/>
  <path d="M60 70c-2-34 18-50 40-50s42 16 40 50c-8-16-22-24-40-24s-32 8-40 24z" fill="${pose ? '#3b2a1b' : '#1c1410'}"/>
  <circle cx="86" cy="80" r="3.2" fill="#2a1c15"/><circle cx="114" cy="80" r="3.2" fill="#2a1c15"/>
  <path d="M86 102c8 6 20 6 28 0" stroke="#7a4a3a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;

/* ═════ Dashboard ═════ */
UP.dashboard = () => {
  const nextF = S.fixtures.fixtures.filter(f => f.status === 'open' && f.kickoff > Date.now())[0];
  const target = nextF ? nextF.kickoff : Date.now();
  const notifs = S.notifs.items.slice(0, 4).map(n => ({ h: n.title, m: n.text }));
  const weekly = (S.content && S.content.weekly) || 'Lorem ipsum dolor sit amet consectetur. Id risus sapien amet eget bibendum erat turpis. Risus erat justo sed aliquam est sem. Fringilla nibh ut risus at massa ut rhoncus arcu. Interdum aliquam id nunc egestas aliquam elit. Fringilla nibh ut risus at massa ut rhoncus arcu. Interdum aliquam id nunc egestas aliquam elit.';
  const bm = U.store.get('bm', D.news.map(n => !!n.bm));
  const html = `<div class="dash">
    <div>
      <div class="hero"><div class="side-fig l">${UP.figure('#e8ecf4', '#d9a98a')}</div><div class="side-fig r">${UP.figure('#2fa9bf', '#e8b99a', 1)}</div>
        <div class="ctr"><img src="assets/logos/icon.png" alt=""><h2>${nextF ? U.esc(nextF.home) + ' vs ' + U.esc(nextF.away) : 'No upcoming match'}</h2><p>Upcoming Featured Match</p>
          <div class="count" id="cd"><div><b>03</b><small>Day</small></div><i>:</i><div><b>12</b><small>Hours</small></div><i>:</i><div><b>43</b><small>Minutes</small></div><i>:</i><div><b>14</b><small>Seconds</small></div></div></div></div>
      <div class="lineup-wrap"><a href="#/fantasy/lineup" class="view-all">View All</a>
        ${S.props.props.slice(0, 3).map(UP.lineCard(null)).join('')}</div>
      <div class="fx" style="margin-top:22px;padding:18px 16px 24px;max-height:900px;overflow:hidden" id="dfx">${UP.fixtures({ odds: false })}</div>
    </div>
    <div>
      <div class="panel"><h4>${I.bell.replace('<svg', '<svg width="20" height="20"')}Notification</h4>
        ${notifs.length ? '' : '<p class="muted" style="padding:10px 0">No notifications yet.</p>'}${notifs.map(n => `<div class="notif"><b>${U.esc(n.h)}</b><p>${U.esc(n.m)}</p></div>`).join('')}
        <a href="#/profile/support" class="view-all" style="text-align:center;margin:10px 0 2px">View All</a></div>
      <div class="panel"><h4 style="justify-content:flex-start;font-size:18px;font-weight:600">Open Contests</h4>
        ${S.contests.contests.filter(c => c.status === 'open').slice(0, 5).map((c, i) => `<a class="rank" href="#/fantasy/contest/${c.id}" style="justify-content:space-between"><span>${U.esc(c.name)}</span><span class="teal">${U.money(c.entryFee)}</span></a>`).join('') || '<p class="muted">No open contests.</p>'}</div>
      <div class="panel"><h4 style="justify-content:flex-start;font-size:18px;font-weight:600">Weekly Program Update</h4><p class="muted" style="font-size:12px;line-height:1.7;color:#8b8d96">${U.esc(weekly)}</p></div>
      <div class="panel" style="margin-top:34px;padding:24px 16px"><h4 style="justify-content:space-between;font-size:18px;font-weight:600">Trending News<span class="teal">${I.chevR.replace('<svg', '<svg width="20" height="20"')}</span></h4>
        ${D.news.map((n, i) => n.big ? `<div class="news-big" style="margin-top:20px"><div class="img" style="background:linear-gradient(135deg,hsl(${n.hue} 70% 45%),hsl(${n.hue + 80} 50% 30%))"></div>
          <div class="news-item" style="margin-top:12px;align-items:flex-start"><div><b style="font-size:17px">${U.esc(n.t)}</b><small style="display:block;margin-top:8px">${n.d}</small></div><span class="bm" data-act="bm" data-i="${i}">${bm[i] ? I.bookmarkF : I.bookmark}</span></div></div>`
          : `<div class="news-item"><div class="thumb" style="background:linear-gradient(135deg,hsl(${n.hue} 55% 40%),hsl(${n.hue + 60} 45% 24%))"></div><div><b>${U.esc(n.t)}</b><small>${n.d}</small></div><span class="bm" data-act="bm" data-i="${i}">${bm[i] ? I.bookmarkF : I.bookmark}</span></div>`).join('')}</div>
    </div></div>`;
  return {
    html: UP.shell('dashboard', html), mount(root) {
      UP.afterShell(root);
      const upd = () => {
        let s = Math.max(0, Math.floor((target - Date.now()) / 1000));
        const v = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60].map(x => String(x).padStart(2, '0'));
        U.$$('#cd b', root).forEach((b, i) => b.textContent = v[i]);
      };
      if (!nextF) U.$$('#cd b', root).forEach(b => b.textContent = '00'); else upd(); const iv = setInterval(() => { if (!U.$('#cd')) return clearInterval(iv); upd(); }, 1000);
      bind(root, {
        bm: t => { const i = +t.dataset.i; bm[i] = !bm[i]; U.store.set('bm', bm); t.innerHTML = bm[i] ? I.bookmarkF : I.bookmark; },
        day: t => { const i = +t.dataset.i; UP.dayIdx = UP.dayIdx === i ? null : i; U.$$('[data-act=day]', root).forEach(b => b.classList.toggle('on', +b.dataset.i === UP.dayIdx)); U.$('#fx-list', root).innerHTML = UP.fxList(false, new Set(), (U.$('[data-fxs]', root) || {}).value || ''); },
        cal: () => U.toast('Pick a day above to filter matches'),
        pick: () => location.hash = '#/fantasy/lineup',
      });
      const s = U.$('[data-fxs]', root); if (s) s.addEventListener('input', () => U.$('#fx-list', root).innerHTML = UP.fxList(false, new Set(), s.value));
    }
  };
};






/* ═════ Match detail ═════ */
UP.match = () => {
  const f = S.fixture.fixture, H = f.home, A = f.away;
  const m = Object.assign({}, D.portugalBelgium, { home: { n: H, f: '4-3-3' }, away: { n: A, f: '3-4-3' } });
  const dots = (arr, cls, flip) => arr.map(([n, y], i) => '').join('');
  const redPts = [[4, 468, 1140], [11, 620, 1133], [7, 538, 1175], [3, 446, 1210], [1, 392, 1262], [8, 538, 1262], [10, 613, 1262], [2, 446, 1328], [6, 538, 1350], [5, 468, 1397], [9, 620, 1392]];
  const yelPts = [[8, 803, 1137], [11, 711, 1165], [2, 890, 1182], [7, 803, 1225], [10, 711, 1269], [3, 890, 1269], [1, 951, 1269], [6, 803, 1312], [9, 711, 1371], [4, 890, 1356], [5, 803, 1398]];
  const dot = (c, p) => `<span class="dot ${c}" style="left:${((p[1] - 340) / 664 * 100).toFixed(2)}%;top:${((p[2] - 1080) / 376 * 100).toFixed(2)}%">${p[0]}</span>`;
  const bar = (l, r) => { const mx = Math.max(parseFloat(l), parseFloat(r)); const f = v => mx === 0 ? 55 : Math.max(10, Math.round(parseFloat(v) / mx * 68)); return `<div class="bars"><div style="direction:rtl"><i style="position:absolute;top:0;right:0;left:auto;width:${f(l)}%;height:3px;background:#57e12a;border-radius:2px"></i></div><div><i style="position:absolute;top:0;left:0;right:auto;width:${f(r)}%;height:3px;background:#f2a52b;border-radius:2px"></i></div></div>`; };
  const html = `<a class="back" href="#/sportbook" style="margin-bottom:20px">${I.chevL}Back</a>
    <div class="mh"><div style="position:absolute;top:22px;left:0;right:0;text-align:center;font-size:16px">${U.esc(f.league)}</div><div style="margin-top:20px"><div class="row"><div class="tm">${U.flag(H)}${U.esc(H)}</div><div class="sc">${f.score ? f.score.split('-').map(x => `<span>${x}</span>`).join('<span>:</span>') : '<span>-</span><span>:</span><span>-</span>'}</div><div class="tm">${U.esc(A)}${U.flag(A)}</div></div>
      <div class="od" id="modd">${['h', 'd', 'a'].map(k => `<button data-act="mo" data-i="${k}" class="${k === 'h' ? 'on' : ''}" ${f.status === 'open' || f.status === 'live' ? '' : 'disabled'}>${f.odds[k].toFixed(2)}</button>`).join('')}</div><div class="dr">Draw · ${U.dt(f.kickoff)} · <a href="#/sportbook" style="color:var(--teal)">Bet on this match</a></div></div></div>
    <div class="det"><div class="perf"><div class="hd"><h4>Graphic Performance <small style="font-size:11px;color:#8b8d96;font-weight:400">(sample data — live stats feed not connected)</small></h4><span class="flt">Filter ${I.filter.replace('<svg', '<svg width="14" height="14"')}</span></div>
      <div style="margin-top:30px">${C.perf({})}</div>
      <div class="legend" style="margin-top:34px"><span><i style="background:#0b8a1f"></i>${U.esc(H)}</span><span><i style="background:#5a1423"></i>${U.esc(A)}</span></div>
      <hr style="border:0;border-top:1px solid #2b2c31;margin:30px 0 28px"><h4 style="font-size:19px;font-weight:500;margin-bottom:38px">Team Formation</h4>
      <div class="fm" style="margin-top:0"><div class="tm">${U.flag(H, 'flag')}<div><b>${U.esc(H)}</b><small>4-3-3</small></div></div><span style="color:#8b8d96">:</span><div class="tm" style="text-align:right"><div><b>${U.esc(A)}</b><small>3-4-3</small></div>${U.flag(A, 'flag')}</div></div>
      <div class="pitch"><div class="mid"></div><div class="cc"></div><div class="box l"></div><div class="box r"></div><div class="six l"></div><div class="six r"></div>${redPts.map(p => dot('a', p)).join('')}${yelPts.map(p => dot('b', p)).join('')}</div></div>
    <div><div class="panel" style="padding:24px 22px 12px;border-radius:20px"><h4 style="margin-bottom:14px">Team Statistic</h4>${m.stats.map(s => `<div class="stat"><div class="lbl">${s[0]}</div><div class="nums"><span class="${s[0] === 'Corners' ? 'g' : ''}">${s[1]}</span><span>${s[2]}</span></div>${bar(s[1], s[2])}</div>`).join('')}</div>
      <div class="panel" style="padding:24px 22px 20px;margin-top:22px;border-radius:20px"><h4 style="margin-bottom:14px;font-size:16px">Team Line Up</h4><div class="lu">${m.lineup.map(r => `<span><b>${r[0]}</b>${r[1]}</span><span>${r[2]}<b>${r[3]}</b></span>`).join('')}</div></div></div></div>`;
  return { html: UP.shell('sportbook', html), mount(root) { UP.afterShell(root); bind(root, { mo: t => { location.hash = '#/sportbook'; } }); } };
};



/* ═════ Profile ═════ */
UP.profile = tab => {
  const tabs = [['edit', 'Edit Profile'], ['support', 'Customer Service'], ['security', 'Security'], ['faq', 'FAQ']];
  const head = `<div class="ptabs" style="width:1050px;max-width:100%;padding:0">${tabs.map(t => `<a href="#/profile/${t[0]}"><button class="${tab === t[0] ? 'on' : ''}" tabindex="-1" style="padding-left:16px;padding-right:16px">${t[1]}</button></a>`).join('')}</div>`;
  const me = S.me; let body = '';
  if (tab === 'edit') {
    body = `<div class="pform"><div class="av"><span class="avatar lg" style="background:linear-gradient(135deg,#d6a58f,#7b4a45)">${me.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span></div>
      <label class="lbl2">Full name</label><input class="pi" id="pname" value="${U.esc(me.name)}">
      <label class="lbl2">Email</label><input class="pi" value="${U.esc(me.email)}" readonly style="opacity:.6">
      <label class="lbl2">Phone</label><input class="pi" value="${U.esc(me.phone)}" readonly style="opacity:.6">
      <label class="lbl2">Country</label><input class="pi" value="${U.esc(me.country)}" readonly style="opacity:.6">
      <button class="btn btn-teal save" data-act="save">Save</button></div>`;
  } else if (tab === 'support') {
    const c = (S.content && S.content.support) || {};
    body = `<div style="padding-top:26px;max-width:520px"><h5 style="font-size:18px;margin-bottom:18px">Customer service</h5><p class="muted" style="line-height:1.8">Email: <b style="color:#fff">${U.esc(c.email || '')}</b><br>Phone / WhatsApp: <b style="color:#fff">${U.esc(c.phone || '')}</b></p>
      <p class="muted" style="margin-top:18px;font-size:13px">Quote your account email and the payment reference (e.g. DEP-XXXXXX) so we can help faster.</p></div>`;
  } else if (tab === 'security') {
    body = `<div class="sec"><h5 style="margin:6px 0 20px">Change Password</h5><label class="lbl2">Current Password</label><input class="pi" type="password" id="pw1" placeholder="**********" autocomplete="current-password"><label class="lbl2">New Password</label><input class="pi" type="password" id="pw2" placeholder="**********" autocomplete="new-password">
      <div style="width:510px;max-width:100%;text-align:right;margin-top:-4px"><button class="btn btn-teal btn-lg" data-act="pw" style="width:190px">Save</button></div></div>`;
  } else {
    const faq = ((S.content && S.content.faq) || []).map(f => [f.q, [f.a]]);
    const q = Math.min(UP.faqI ?? 0, Math.max(0, faq.length - 1));
    body = faq.length ? `<h2 class="faq-h">Frequently Asked Questions</h2><div class="faq"><div class="faq-l">${faq.map((f, i) => `<button class="faq-q ${i === q ? 'on' : ''}" data-act="faq" data-i="${i}"><i></i><span>${U.esc(f[0])}</span>${I.chevR}</button>`).join('')}</div>
      <div class="faq-r"><h6>${U.esc(faq[q][0])}</h6>${faq[q][1].map(p => `<p>${U.esc(p)}</p>`).join('')}</div></div>` : '<p class="muted">No FAQ yet.</p>';
  }
  return {
    html: UP.shell('dashboard', `<div class="prof">${head}${body}</div>`), mount(root) {
      UP.afterShell(root);
      bind(root, {
        save: () => act(() => API.put('/api/me', { name: U.$('#pname', root).value }), { ok: 'Profile saved' }),
        pw: () => { const a = U.$('#pw1', root).value, b = U.$('#pw2', root).value; if (!a || !b) return U.toast('Fill in both password fields'); act(() => API.post('/api/me/password', { current: a, next: b }), { ok: 'Password updated' }); },
        faq: t => { UP.faqI = +t.dataset.i; render(true); },
      });
    }
  };
};
const U$$ = (s, r) => [...r.querySelectorAll(s)];

window.UP = UP;
