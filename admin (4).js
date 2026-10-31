/* ═════════ Admin console (real data) ═════════ */
const AD = {};
const MAIN_TABS = [['dashboard', 'Dashboard'], ['users', 'Users'], ['odds', 'Odds Desk'], ['props', 'Line-up Props'], ['contests', 'Contest/Ticket'], ['teams', 'Team Mangt.'], ['prediction', 'Prediction / Win'], ['drawing', 'Drawing/Result'], ['rewards', 'Reward /Scoring'], ['payments', 'Payments'], ['other/leaderboard', 'Other'], ['settings', 'Settings']];
const SUB_TABS = [['leaderboard', 'Leaderboard Management'], ['antifraud', 'Anti-Fraud Management'], ['reports', 'View Reports and Statistics'], ['content', 'Content Management']];

AD.shell = (active, inner, sub) => `<div class="a-wrap">
  <header class="a-head"><a class="brand" href="#/admin/dashboard" aria-label="Frost Fantasy"><img src="assets/logos/logo-light-bg.png" alt="Frost Fantasy"></a>
    <div class="r"><span class="ttl">Admin</span><a class="sn" href="#/admin/notify" style="display:grid;place-items:center">Send Notification</a>
      <button class="sq" data-act="bell" aria-label="Notifications">${I.bell}<i class="dot-r"></i></button>
      <div style="position:relative" id="aum"><button class="sq" data-act="aum" aria-label="Account">${I.user}</button>
        <div class="userbtn open" style="position:static"><div class="dd" id="aumenu" style="display:none;top:44px;z-index:30"><a href="#/admin/profile">Admin Profile</a><a href="#/admin/password">Change Password</a><a href="#/dashboard">Player app</a><a href="#" data-logout>Logout</a></div></div></div></div></header>
  <nav class="a-tabs">${MAIN_TABS.map(t => `<button data-go="#/admin/${t[0]}" class="${t[0].split('/')[0] === active ? 'on' : ''}">${t[1]}</button>`).join('')}</nav>
  ${sub ? `<nav class="a-sub">${SUB_TABS.map(t => `<button data-go="#/admin/other/${t[0]}" class="${t[0] === sub ? 'on' : ''}">${t[1]}</button>`).join('')}</nav>` : ''}
  <div class="a-body">${inner}</div></div>`;

AD.after = root => {
  U.$$('[data-go]', root).forEach(b => b.addEventListener('click', () => location.hash = b.dataset.go));
  U.$$('[data-logout]', root).forEach(a => a.addEventListener('click', e => { e.preventDefault(); UP.logout(); }));
  const menu = U.$('#aumenu', root);
  bind(root, {
    aum: (t, e) => { e.stopPropagation(); menu.style.display = menu.style.display === 'none' ? 'block' : 'none'; document.addEventListener('click', () => menu.style.display = 'none', { once: true }); },
    bell: () => location.hash = '#/admin/odds',
  });
};

/* row ⋮ menu */
AD.rowMenu = (root, items) => {
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-dots]');
    U.$$('.rowmenu', root).forEach(m => m.remove());
    if (b) {
      e.stopPropagation();
      const m = document.createElement('div'); m.className = 'rowmenu';
      const its = items(b.dataset.dots);
      m.innerHTML = its.map(i => `<button class="${i.danger ? 'dg' : ''}" data-mi="${i.k}">${i.label}</button>`).join('');
      b.parentElement.appendChild(m);
      m.addEventListener('click', ev => { const k = ev.target.dataset.mi; if (k) { const it = its.find(x => x.k === k); m.remove(); it.run(); } });
    }
  });
  document.addEventListener('click', () => U.$$('.rowmenu', root).forEach(m => m.remove()));
};
const dots = id => `<td class="dots"><button data-dots="${id}" aria-label="Row actions">${I.dots}</button></td>`;
const inRange = (t, from, to) => { const d = new Date(t).toISOString().slice(0, 10); return (!from || d >= from) && (!to || d <= to); };
const dateIn = (id, label) => `<div><label>${label}</label><input class="a-in date" type="date" id="${id}"></div>`;
const none = (n, msg) => `<tr><td colspan="${n}" class="empty">${msg}</td></tr>`;
const norm = (arr, max = 9) => { const m = Math.max(...arr, 1); return arr.map(v => +(v / m * max * 0.9).toFixed(2)); };
const pill = s => `<span class="st-${s}" style="text-transform:capitalize">${s}</span>`;
const aact = (fn, ok) => act(fn, { ok });
const confirmBox = (msg) => window.confirm(msg);
const hookFilters = (root, F, draw) => { for (const [id, k] of [['f-q', 'q'], ['f-role', 'role'], ['f-st', 'status'], ['f-type', 'type'], ['f-from', 'from'], ['f-to', 'to']]) { const el = U.$('#' + id, root); if (el) el.addEventListener(el.tagName === 'SELECT' || el.type === 'date' ? 'change' : 'input', e => { F[k] = e.target.value; draw(); }); } };

/* ═════ Dashboard ═════ */
AD.dashboard = () => {
  const d = S.a_dash, users = S.a_users.users.filter(u => u.role === 'player').slice(-6).reverse();
  const stat = (t, ico, v, w) => `<div class="stat-c" style="width:${w}px"><div class="t"><span>${ico}</span>${t}</div><div class="v">${v}</div></div>`;
  const ic = k => ({ u: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor"><rect x="1.5" y="2" width="11" height="10" rx="2"/><circle cx="5" cy="6" r=".8"/><circle cx="9" cy="6" r=".8"/><path d="M4.500 9c1.500 1 3.500 1 5 0"/></svg>', c: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor"><rect x="1.5" y="1.5" width="11" height="11" rx="2"/><path d="M4.500 10V7M7 10V4.500M9.500 10V6"/></svg>', d: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor"><circle cx="7" cy="7" r="5.500"/><path d="M7 3.500v7M8.800 5.200C8.300 4.500 5.300 4.500 5.300 6.200c0 2 3.500 1 3.500 3-.2 1.700-3.200 1.600-3.800.5"/></svg>' }[k]);
  const html = `<div class="stats" style="margin-top:38px">${stat('Players', ic('u'), U.pts(d.users), 150)}${stat('Open bets', ic('c'), U.pts(d.openBets), 150)}${stat('Points in wallets', ic('c'), U.pts(d.pointsInWallets), 200)}${stat('Total deposits (XOF)', ic('d'), U.pts(d.deposits), 210)}${stat('Fees earned (XOF)', ic('d'), U.pts(d.fees), 200)}${stat('Pending withdrawals', ic('d'), d.pendingWithdrawals, 200)}${stat('Draft matches', ic('c'), d.draftFixtures, 170)}</div>
    ${d.pendingWithdrawals || d.draftFixtures ? `<div class="gc" style="margin-top:22px;padding:16px 20px;font-size:14px">${d.pendingWithdrawals ? `<a class="teal" href="#/admin/payments">${d.pendingWithdrawals} withdrawal(s) waiting for review →</a>` : ''}${d.draftFixtures ? `<a class="teal" href="#/admin/odds" style="margin-left:${d.pendingWithdrawals ? 26 : 0}px">${d.draftFixtures} draft match(es) to review in the Odds Desk →</a>` : ''}</div>` : ''}
    <div class="dgrid"><div class="gc tr"><table><thead><tr><th>Newest players</th><th>Date Registered</th><th>Points</th></tr></thead><tbody>${users.map(t => `<tr><td>${U.esc(t.name)}</td><td>${U.d(t.createdAt)}</td><td>${U.pts(t.balance)}</td></tr>`).join('') || none(3, 'No players yet.')}</tbody></table><a href="#/admin/users" class="va" style="display:block">view all</a></div>
    <div class="gc chart-card" style="min-height:396px"><div class="hd" style="border:0;padding-bottom:0;margin-bottom:0"><div><small>Last 12 months</small><div class="tt">Deposits (XOF), peak ${U.pts(Math.max(...d.depositsByMonth))}</div></div><span class="ibtn">i</span></div>
      <div style="border-top:1px solid #2d2e34;margin-top:34px;padding-top:24px">${C.area({ data: norm(d.depositsByMonth), color: '#18b48a', w: 520, h: 250, yLabels: false })}<div class="chart-legend" style="margin-top:12px"><i style="background:#18b48a"></i>Deposits per month: ${d.months[0]} → ${d.months[11]}</div></div></div></div>
    <div class="dgrid2"><div class="gc chart-card" style="min-height:300px"><div class="hd"><div class="tt big">Fees earned (XOF), peak ${U.pts(Math.max(...d.feesByMonth))}</div><span class="ibtn">i</span></div>${C.area({ data: norm(d.feesByMonth), color: '#f2424b', w: 520, h: 215, yLabels: false })}<div class="chart-legend"><i style="background:#f2424b"></i>Deposit + withdrawal fees per month</div></div>
    <div class="gc" style="padding:24px"><div class="tt big" style="margin-bottom:12px">System health</div><p class="a-p" style="font-size:14px;line-height:1.9">Wallet ledger check: <b class="${d.ledgerOk ? 'teal' : ''}">${d.ledgerOk ? 'OK (every balance matches its ledger)' : 'MISMATCH — investigate'}</b><br>New players (7 days): <b>${d.newUsers7d}</b></p></div></div>`;
  return { html: AD.shell('dashboard', html), mount: AD.after };
};

/* ═════ Users ═════ */
AD.users = () => {
  const rows = S.a_users.users, F = { q: '', role: '', from: '', to: '' };
  const body = () => {
    const r = rows.filter(u => (!F.q || (u.name + ' ' + u.email + ' ' + u.phone).toLowerCase().includes(F.q.toLowerCase())) && (!F.role || u.role === F.role) && inRange(u.createdAt, F.from, F.to));
    return r.length ? r.map(u => `<tr><td>${U.esc(u.name)}</td><td>${U.esc(u.email)}</td><td>${U.esc(u.phone)}</td><td>${U.d(u.createdAt)}</td><td>${U.dt(u.lastSeen)}</td><td>${U.pts(u.balance)}</td><td>${u.role}</td><td>${pill(u.status === 'active' ? 'active' : 'suspended')}</td>${dots(u.id)}</tr>`).join('') : none(9, 'No users match these filters.');
  };
  const html = `<div class="filt"><div><label>Search user</label><input class="a-in" id="f-q" autocomplete="off"></div><div><label>Filter</label><div class="a-sel"><select id="f-role"><option value="">Role</option><option value="admin">admin</option><option value="player">player</option></select></div></div>${dateIn('f-from', 'From')}${dateIn('f-to', 'To')}</div>
    <table class="a-tbl"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Last seen</th><th>Points</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody id="tb">${body()}</tbody></table>`;
  return { html: AD.shell('users', html), mount(root) {
    AD.after(root); const draw = () => U.$('#tb', root).innerHTML = body(); hookFilters(root, F, draw);
    AD.rowMenu(root, id => { const u = rows.find(x => String(x.id) === id); return [
      { k: 'p', label: 'Adjust points', run: () => U.modal({ title: `Adjust points — ${u.name}`, admin: true, submit: 'Apply', fields: [{ label: 'Points (negative to remove)', name: 'amount', type: 'number', req: true }, { label: 'Reason (kept in audit log)', name: 'note', req: true }], onSubmit: async d => !!(await aact(() => API.post(`/api/admin/users/${u.id}/adjust`, { amount: +d.amount, note: d.note }), 'Points adjusted')) }) },
      { k: 's', label: u.status === 'active' ? 'Suspend' : 'Re-activate', danger: u.status === 'active', run: () => aact(() => API.put(`/api/admin/users/${u.id}`, { status: u.status === 'active' ? 'suspended' : 'active' }), 'User updated') },
      { k: 'r', label: u.role === 'admin' ? 'Make player' : 'Make admin', run: () => confirmBox(`Change role of ${u.name}?`) && aact(() => API.put(`/api/admin/users/${u.id}`, { role: u.role === 'admin' ? 'player' : 'admin' }), 'Role updated') }]; });
  } };
};

/* ═════ Odds Desk — admin (or AI agent) controls the daily odds ═════ */
AD.odds = () => {
  const { fixtures, agentToken } = S.a_fx; const F = { status: '', q: '' };
  const label = { draft: 'draft', open: 'open', live: 'live', closed: 'closed', settled: 'settled', void: 'void' };
  const body = () => {
    const r = fixtures.filter(f => (!F.status || f.status === F.status) && (!F.q || (f.home + f.away + f.league).toLowerCase().includes(F.q.toLowerCase())));
    return r.length ? r.map(f => `<tr><td>${pill(label[f.status])}${f.source === 'agent' ? ' <small class="a-p">agent</small>' : ''}</td><td>${U.dt(f.kickoff)}</td><td>${U.esc(f.league)}</td><td>${U.esc(f.home)} v ${U.esc(f.away)}${f.score ? ' <b>' + f.score + '</b>' : ''}</td><td>${f.odds.h.toFixed(2)}</td><td>${f.odds.d.toFixed(2)}</td><td>${f.odds.a.toFixed(2)}</td><td>${f.margin}%</td><td>${f.bets}</td>${dots(f.id)}</tr>`).join('') : none(10, 'No matches. Add one, import a list, or let your agent upload drafts.');
  };
  const fxFields = (f = {}) => [
    { label: 'League / competition', name: 'league', value: f.league, req: true }, { label: 'Home team', name: 'home', value: f.home, req: true }, { label: 'Away team', name: 'away', value: f.away, req: true },
    { label: 'Kick-off', name: 'kickoff', type: 'datetime-local', value: U.local(f.kickoff || Date.now() + 86400e3), req: true },
    { label: 'Home win (1)', name: 'h', type: 'number', step: '0.01', value: f.odds ? f.odds.h : '', req: true }, { label: 'Draw (X)', name: 'd', type: 'number', step: '0.01', value: f.odds ? f.odds.d : '', req: true }, { label: 'Away win (2)', name: 'a', type: 'number', step: '0.01', value: f.odds ? f.odds.a : '', req: true }];
  const odds = d => ({ h: +d.h, d: +d.d, a: +d.a });
  const origin = location.origin;
  const html = `<div class="gc" style="margin-top:26px;padding:20px 24px"><b style="font-size:15px">Daily odds upload</b>
      <p class="a-p" style="margin:8px 0 12px;font-size:13px;line-height:1.7">You set the odds. Add matches by hand, paste a list (CSV), or let an AI agent / script push <b>drafts</b> through the API. Drafts are never visible to players until you publish them. Odds you change later never affect bets already placed.</p>
      <details><summary style="cursor:pointer;color:#2f6bd9;font-size:13px">Agent API (token + example)</summary><pre style="white-space:pre-wrap;word-break:break-all;background:#101a28;padding:14px;border-radius:8px;margin-top:10px;font-size:12px;line-height:1.6">curl -X POST ${origin}/api/agent/fixtures \\
  -H "Authorization: Bearer ${U.esc(agentToken)}" -H "Content-Type: application/json" \\
  -d '{"fixtures":[{"league":"England - Premier League","home":"Arsenal","away":"Chelsea","kickoff":"${new Date(Date.now() + 2 * 86400e3).toISOString()}","odds":{"h":1.95,"d":3.5,"a":3.9}}]}'</pre>
      <button class="add" data-act="rotate" style="margin-top:10px">Rotate token</button></details></div>
    <div class="filt"><div><label>Search</label><input class="a-in" id="f-q" autocomplete="off"></div><div><label>Status</label><div class="a-sel"><select id="f-st"><option value="">All</option>${Object.keys(label).map(s => `<option>${s}</option>`).join('')}</select></div></div>
      <div class="push" style="display:flex;gap:10px"><button class="add" data-act="pub">Publish all drafts (${fixtures.filter(f => f.status === 'draft').length})</button><button class="add" data-act="csv">Import list</button><button class="add" data-act="add">+ Add match</button></div></div>
    <table class="a-tbl"><thead><tr><th>Status</th><th>Kick-off</th><th>League</th><th>Match</th><th>1</th><th>X</th><th>2</th><th>Margin</th><th>Bets</th><th>Actions</th></tr></thead><tbody id="tb">${body()}</tbody></table>
    <p class="a-p" style="margin-top:14px;font-size:12px">Margin = bookmaker overround: how much the three odds add up above 100%. Typical 5–10%. Below 0% means you'd lose money on average.</p>`;
  return { html: AD.shell('odds', html), mount(root) {
    AD.after(root); const draw = () => U.$('#tb', root).innerHTML = body();
    const st = U.$('#f-st', root); st.addEventListener('change', e => { F.status = e.target.value; draw(); });
    U.$('#f-q', root).addEventListener('input', e => { F.q = e.target.value; draw(); });
    bind(root, {
      rotate: () => confirmBox('Rotate the agent token? The old one stops working immediately.') && aact(() => API.post('/api/admin/agent-token'), 'New token generated'),
      pub: () => aact(() => API.post('/api/admin/fixtures/bulk-publish', {}), r => `Published`),
      add: () => U.modal({ title: 'Add match', admin: true, fields: fxFields(), submit: 'Publish match', onSubmit: async d => !!(await aact(() => API.post('/api/admin/fixtures', { league: d.league, home: d.home, away: d.away, kickoff: new Date(d.kickoff).toISOString(), odds: odds(d), status: 'open' }), 'Match published')) }),
      csv: () => {
        const w = document.createElement('div'); w.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:grid;place-items:center;z-index:90;padding:20px';
        w.innerHTML = `<form style="background:#212227;border-radius:16px;padding:28px;width:640px;max-width:100%"><h3 style="font-size:20px;font-weight:500;margin-bottom:8px">Import matches (saved as drafts)</h3><p class="a-p" style="font-size:12px;margin-bottom:10px">One per line: <code>league, home, away, kickoff (YYYY-MM-DD HH:MM), 1, X, 2</code></p><textarea class="ta" id="csvt" style="width:100%;height:200px" placeholder="England - Premier League, Arsenal, Chelsea, ${new Date(Date.now() + 864e5).toISOString().slice(0, 10)} 18:00, 1.95, 3.50, 3.90"></textarea>
          <div style="display:flex;gap:10px;margin-top:18px"><button type="submit" class="btn btn-teal" style="flex:1">Import as drafts</button><button type="button" class="btn btn-ghost" data-x>Cancel</button></div></form>`;
        document.body.appendChild(w); w.addEventListener('click', e => { if (e.target === w || e.target.hasAttribute('data-x')) w.remove(); });
        w.querySelector('form').addEventListener('submit', async e => {
          e.preventDefault(); const lines = U.$('#csvt', w).value.split('\n').map(l => l.trim()).filter(Boolean); let n = 0, bad = [];
          for (const [i, l] of lines.entries()) { const c = l.split(',').map(x => x.trim()); try { if (c.length < 7) throw new Error('needs 7 columns'); await API.post('/api/admin/fixtures', { league: c[0], home: c[1], away: c[2], kickoff: new Date(c[3].replace(' ', 'T')).toISOString(), odds: { h: +c[4], d: +c[5], a: +c[6] }, status: 'draft' }); n++; } catch (err) { bad.push(`line ${i + 1}: ${err.message}`); } }
          w.remove(); U.toast(`${n} draft(s) imported${bad.length ? ' · ' + bad.slice(0, 2).join('; ') : ''}`); render(true);
        });
      },
    });
    AD.rowMenu(root, id => { const f = fixtures.find(x => String(x.id) === id); const fin = ['settled', 'void'].includes(f.status); const set = (status, msg) => aact(() => API.put(`/api/admin/fixtures/${f.id}`, { status }), msg); return fin ? [{ k: 'x', label: 'Finished', run() {} }] : [
      { k: 'e', label: 'Edit odds', run: () => U.modal({ title: `Edit odds — ${f.home} v ${f.away}`, admin: true, fields: fxFields(f).filter(x => ['h', 'd', 'a'].includes(x.name)), onSubmit: async d => !!(await aact(() => API.put(`/api/admin/fixtures/${f.id}`, { odds: odds(d) }), 'Odds updated')) }) },
      ...(f.status === 'draft' ? [{ k: 'p', label: 'Publish', run: () => set('open', 'Published') }] : []),
      ...(f.status === 'open' ? [{ k: 'l', label: 'Set live', run: () => set('live', 'Match is live') }, { k: 'c', label: 'Close betting', run: () => set('closed', 'Betting closed') }] : []),
      ...(f.status === 'live' ? [{ k: 'c', label: 'Close betting', run: () => set('closed', 'Betting closed') }] : []),
      ...(f.status === 'closed' ? [{ k: 'o', label: 'Re-open', run: () => set('open', 'Re-opened') }] : []),
      ...(f.status !== 'draft' ? [{ k: 's', label: 'Enter result & settle', run: () => U.modal({ title: `Final score — ${f.home} v ${f.away}`, admin: true, submit: 'Settle bets', fields: [{ label: 'Score (home-away), e.g. 2-1', name: 'score', req: true }], onSubmit: async d => !!(await aact(() => API.post(`/api/admin/fixtures/${f.id}/settle`, { score: d.score }), 'Settled — winners paid')) }) },
        { k: 'v', label: 'Void & refund', danger: true, run: () => confirmBox('Void this match and refund all stakes?') && aact(() => API.post(`/api/admin/fixtures/${f.id}/void`), 'Voided — stakes refunded') }] : []),
      ...(f.bets === 0 ? [{ k: 'd', label: 'Delete', danger: true, run: () => aact(() => API.del(`/api/admin/fixtures/${f.id}`), 'Deleted') }] : [])]; });
  } };
};

/* ═════ Line-up props (More / Less) ═════ */
AD.props = () => {
  const props = S.a_props.props, players = S.a_players.players;
  const html = `<div class="filt"><div class="push"><button class="add" data-act="add">+ Add prop</button></div></div>
    <table class="a-tbl"><thead><tr><th>Player</th><th>Stat</th><th>Line</th><th>Match</th><th>Kick-off</th><th>Entries</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${props.map(p => `<tr><td>${U.esc(p.player || '?')}</td><td>${U.esc(p.stat)}</td><td>${p.line}</td><td>${U.esc(p.match || '')}</td><td>${U.dt(p.kickoff)}</td><td>${p.entries}</td><td>${pill(p.status)}${p.actual != null ? ' (' + p.actual + ')' : ''}</td>${dots(p.id)}</tr>`).join('') || none(8, 'No props yet.')}</tbody></table>
    <p class="a-p" style="margin-top:14px;font-size:12px">Players choose More or Less than the line. If the actual value equals the line it is a push (that pick is dropped).</p>`;
  return { html: AD.shell('props', html), mount(root) {
    AD.after(root);
    bind(root, { add: () => U.modal({ title: 'Add line-up prop', admin: true, fields: [{ label: 'Player', name: 'playerId', type: 'select', options: players.map(p => ({ v: p.id, l: `${p.name} (${p.pos})` })) }, { label: 'Stat', name: 'stat', value: 'Shots', req: true }, { label: 'Line (e.g. 2.5)', name: 'line', type: 'number', step: '0.5', req: true }, { label: 'Match text', name: 'match', value: 'vs Man City' }, { label: 'Kick-off', name: 'kickoff', type: 'datetime-local', value: U.local(Date.now() + 86400e3), req: true }],
      onSubmit: async d => !!(await aact(() => API.post('/api/admin/props', { ...d, line: +d.line, kickoff: new Date(d.kickoff).toISOString() }), 'Prop added')) }) });
    AD.rowMenu(root, id => { const p = props.find(x => String(x.id) === id); return ['settled', 'void'].includes(p.status) ? [{ k: 'x', label: 'Finished', run() {} }] : [
      { k: 's', label: 'Enter actual & settle', run: () => U.modal({ title: `${p.player} — ${p.stat} (line ${p.line})`, admin: true, submit: 'Settle', fields: [{ label: 'Actual value', name: 'actual', type: 'number', step: '0.5', req: true }], onSubmit: async d => !!(await aact(() => API.post(`/api/admin/props/${p.id}/settle`, { actual: +d.actual }), 'Settled')) }) },
      { k: 'v', label: 'Void', danger: true, run: () => aact(() => API.post(`/api/admin/props/${p.id}/void`), 'Voided') }]; });
  } };
};

/* ═════ Contests ═════ */
AD.contests = () => {
  const rows = S.a_contests.contests, players = S.a_players ? S.a_players.players : [], F = { q: '', from: '', to: '' };
  const body = () => { const r = rows.filter(c => (!F.q || c.name.toLowerCase().includes(F.q.toLowerCase())) && inRange(c.createdAt, F.from, F.to));
    return r.length ? r.map(c => `<tr><td>#${c.id}</td><td>${U.esc(c.name)}</td><td>${U.money(c.entryFee)}</td><td>${c.entries}/${c.maxEntries}</td><td>${U.dt(c.startsAt)}</td><td>${pill(c.status === 'open' ? 'ongoing' : 'completed')}</td>${dots(c.id)}</tr>`).join('') : none(7, 'No contests found.'); };
  const html = `<div class="filt"><div><label>Search contest</label><input class="a-in" id="f-q"></div>${dateIn('f-from', 'Filter from')}${dateIn('f-to', 'Filter to')}<div class="push"><button class="add" data-act="add">+ New contest</button></div></div>
    <table class="a-tbl"><thead><tr><th>ID</th><th>Name</th><th>Entry fee</th><th>Entries</th><th>Starts</th><th>Status</th><th>Actions</th></tr></thead><tbody id="tb">${body()}</tbody></table>`;
  return { html: AD.shell('contests', html), mount(root) {
    AD.after(root); const draw = () => U.$('#tb', root).innerHTML = body(); hookFilters(root, F, draw);
    bind(root, { add: () => U.modal({ title: 'New contest', admin: true, fields: [{ label: 'Name', name: 'name', req: true }, { label: 'Entry fee (points)', name: 'entryFee', type: 'number', value: 1000, req: true }, { label: 'Max entries', name: 'maxEntries', type: 'number', value: 100 }, { label: 'Starts', name: 'startsAt', type: 'datetime-local', value: U.local(Date.now() + 2 * 86400e3), req: true }],
      onSubmit: async d => !!(await aact(() => API.post('/api/admin/contests', { ...d, entryFee: +d.entryFee, maxEntries: +d.maxEntries, startsAt: new Date(d.startsAt).toISOString() }), 'Contest created')) }) });
    AD.rowMenu(root, id => { const c = rows.find(x => String(x.id) === id); return [{ k: 'v', label: 'View leaderboard', run: () => location.hash = '#/fantasy/contest/' + c.id },
      ...(c.status === 'open' ? [{ k: 's', label: 'Enter scores & settle', run: () => U.modal({ title: `Player fantasy points — ${c.name}`, admin: true, submit: 'Settle contest', fields: players.map(p => ({ label: `${p.name} (${p.pos})`, name: p.id, type: 'number', step: '0.5', value: 0 })), onSubmit: async d => !!(await aact(() => API.post(`/api/admin/contests/${c.id}/settle`, { playerScores: d }), 'Contest settled — prizes paid')) }) }] : [])]; });
  } };
};

/* ═════ Teams ═════ */
AD.teams = () => {
  const rows = S.a_teams.teams, F = { from: '', to: '' };
  const body = () => { const r = rows.filter(t => inRange(t.createdAt, F.from, F.to)); return r.length ? r.map(t => `<tr><td>#${t.id} ${U.esc(t.name)}</td><td>${U.esc(t.owner)}</td><td>${t.players}</td><td>${U.money(t.cost)}</td><td>${U.d(t.createdAt)}</td>${dots(t.id)}</tr>`).join('') : none(6, 'No teams yet.'); };
  const html = `<div class="filt">${dateIn('f-from', 'Filter from')}${dateIn('f-to', 'Filter to')}</div>
    <table class="a-tbl" style="width:auto"><thead><tr><th>Team</th><th>Owner</th><th>Players</th><th>Cost</th><th>Date Created</th><th>Actions</th></tr></thead><tbody id="tb">${body()}</tbody></table>`;
  return { html: AD.shell('teams', html), mount(root) {
    AD.after(root); const draw = () => U.$('#tb', root).innerHTML = body(); hookFilters(root, F, draw);
    AD.rowMenu(root, id => [{ k: 'v', label: 'View players', run: () => location.hash = '#/admin/teams/' + id }]);
  } };
};
AD.teamDetail = () => {
  const t = S.a_team.team;
  const html = `<div style="padding-top:31px"><a href="#/admin/teams" class="btn" style="border:1px solid #6b6d76;border-radius:3px;height:37px;width:94px;gap:18px;font-size:16px;font-family:var(--font-admin);justify-content:flex-start;padding-left:14px">${I.chevL.replace('<svg', '<svg width="14" height="14"')}Back</a>
    <h2 class="a-h2" style="margin:24px 0 6px">${U.esc(t.name)} · ${U.esc(t.formation)}</h2><p class="a-p" style="margin-bottom:22px">Owner: ${U.esc(t.owner)} (${U.esc(t.email)}) · cost ${U.money(t.cost)} · captain: ${U.esc((t.players.find(p => p.id === t.captain) || {}).name || '—')}</p>
    <div class="pgrid" style="width:818px;max-width:100%;gap:14px 33px;grid-template-columns:repeat(3,250px)">${t.players.map(p => UP.playerCard(p, p.id === t.captain, 'style="cursor:default"').replace('data-act="spick"', '').replace('class="sp', 'class="sp ad')).join('')}</div></div>`;
  return { html: AD.shell('teams', html), mount: AD.after };
};

/* ═════ Prediction ═════ */
AD.prediction = () => {
  const cats = S.a_pred.categories;
  const html = `<div class="filt"><div class="push"><button class="add" data-act="add">+ New prediction</button></div></div>
    <table class="a-tbl"><thead><tr><th>Question</th><th>Options</th><th>Reward</th><th>Picks</th><th>Closes</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${cats.map(k => `<tr><td>${U.esc(k.title)}</td><td>${k.options.map(U.esc).join(', ')}</td><td>${U.money(k.reward)}</td><td>${k.picks}</td><td>${U.dt(k.closesAt)}</td><td>${pill(k.status === 'settled' ? 'completed' : 'ongoing')}${k.correct ? ' ' + U.esc(k.correct) : ''}</td>${dots(k.id)}</tr>`).join('') || none(7, 'No predictions yet.')}</tbody></table>`;
  return { html: AD.shell('prediction', html), mount(root) {
    AD.after(root);
    bind(root, { add: () => U.modal({ title: 'New prediction', admin: true, fields: [{ label: 'Question', name: 'title', req: true }, { label: 'Options (comma separated)', name: 'options', req: true, value: 'Team A, Team B, Draw' }, { label: 'Reward per correct pick (points)', name: 'reward', type: 'number', value: 1000, req: true }, { label: 'Closes', name: 'closesAt', type: 'datetime-local', value: U.local(Date.now() + 2 * 86400e3), req: true }],
      onSubmit: async d => !!(await aact(() => API.post('/api/admin/prediction', { title: d.title, options: d.options.split(','), reward: +d.reward, closesAt: new Date(d.closesAt).toISOString() }), 'Prediction created')) }) });
    AD.rowMenu(root, id => { const k = cats.find(x => String(x.id) === id); return k.status === 'settled' ? [{ k: 'x', label: 'Finished', run() {} }] : [{ k: 's', label: 'Set correct answer & pay', run: () => U.modal({ title: k.title, admin: true, submit: 'Settle', fields: [{ label: 'Correct option', name: 'correct', type: 'select', options: k.options }], onSubmit: async d => !!(await aact(() => API.post(`/api/admin/prediction/${k.id}/settle`, { correct: d.correct }), 'Settled — winners paid')) }) }]; });
  } };
};

/* ═════ Lottery draw ═════ */
AD.drawing = () => {
  const { draws } = S.a_lot, cur = draws.find(d => d.status === 'open'), past = draws.filter(d => d.status === 'drawn');
  const html = `<div class="a-form" style="padding-top:34px;margin-left:0"><div class="gc" style="padding:22px 26px;max-width:760px"><b style="font-size:16px">Current draw #${cur.id}</b>
      <p class="a-p" style="font-size:13px;line-height:1.9;margin:10px 0 16px">Tickets sold: <b>${cur.tickets}</b> · Ticket price: <b>${U.money(cur.ticketPrice)}</b> · Closes: <b>${U.dt(cur.closesAt)}</b><br>Public commitment (SHA-256 of the secret seed):<br><code style="word-break:break-all">${cur.commit}</code></p>
      <div class="row" style="gap:31px;align-items:flex-end"><div class="col"><label class="a-lbl">Schedule closing time</label><input class="a-in" type="datetime-local" id="sched" value="${U.local(cur.closesAt)}" style="width:262px"></div><button class="a-save" data-act="sched" style="margin:0">Save</button></div>
      <div style="margin-top:34px"><button class="a-save" data-act="draw" style="width:262px;background:#c0392b">Conduct draw now</button><p class="a-p" style="font-size:12px;margin-top:10px">Winning numbers are derived from the secret seed already committed. Nobody (including you) can change them after tickets are sold. Prizes are paid instantly and a new draw opens.</p></div></div>
    <h2 class="a-h2" style="margin:34px 0 14px">Past draws</h2><table class="a-tbl" style="width:auto"><thead><tr><th>Draw</th><th>Date</th><th>Numbers</th><th>Tickets</th><th>Winners</th><th>Verified</th></tr></thead><tbody>${past.map(d => `<tr><td>#${d.id}</td><td>${U.dt(d.drawnAt)}</td><td>${d.numbers.join(' - ')}</td><td>${d.tickets}</td><td>${d.winners}</td><td>${d.verified ? '✓' : '✗'}</td></tr>`).join('') || none(6, 'No draws conducted yet.')}</tbody></table></div>`;
  return { html: AD.shell('drawing', html), mount(root) {
    AD.after(root);
    bind(root, {
      sched: () => aact(() => API.post('/api/admin/lottery/schedule', { closesAt: new Date(U.$('#sched', root).value).toISOString() }), 'Lottery draw scheduled'),
      draw: () => confirmBox(`Conduct draw #${cur.id} now with ${cur.tickets} ticket(s)? This pays winners and cannot be undone.`) && aact(() => API.post('/api/admin/lottery/conduct'), r => `Draw conducted — winning numbers: ${r.draw.numbers.join(', ')}`),
    });
  } };
};

/* ═════ Rewards / weekly programme ═════ */
AD.rewards = () => {
  const html = `<div class="a-form" style="padding-top:34px;margin-left:0"><div class="row" style="gap:31px;margin-bottom:34px"><div class="col"><label class="a-lbl">Weekly Reward Program (shown on every player's dashboard)</label><textarea class="ta" id="weekly" style="height:120px;width:520px;max-width:100%" placeholder="Type text">${U.esc((S.content && S.content.weekly) || '')}</textarea></div></div><button class="a-save" data-act="save">Publish</button>
    <div class="gc" style="margin-top:44px;padding:20px 24px;max-width:760px"><b>How scoring and rewards work</b><p class="a-p" style="font-size:13px;line-height:1.8;margin-top:10px">• <b>Sportsbook</b>: winnings = stake × locked odds.<br>• <b>Line-up props</b>: Light Pay ×1.8 (4+ correct), High Pay ×10 (all correct).<br>• <b>Contests</b>: enter each player's fantasy points under <i>Contest/Ticket → Enter scores &amp; settle</i>. Captain counts ×2. Prizes 50/30/20% of the pool after the platform rake (${S.contests ? '' : ''}set in Settings).<br>• <b>Predict &amp; Win</b>: free picks, fixed reward per correct answer.<br>• <b>Lottery</b>: 3 numbers of 54; 3 matches ×200, 2 matches ×5 of the ticket price.</p></div></div>`;
  return { html: AD.shell('rewards', html), mount(root) { AD.after(root); bind(root, { save: () => aact(() => API.put('/api/admin/content', { weekly: U.$('#weekly', root).value }), 'Weekly reward programme published to the player dashboard') }); } };
};

/* ═════ Payments ═════ */
AD.payments = () => {
  const rows = S.a_pay.payments, F = { type: '', status: '', from: '', to: '' };
  const body = () => { const r = rows.filter(p => (!F.type || p.type === F.type) && (!F.status || p.status === F.status) && inRange(p.createdAt, F.from, F.to));
    return r.length ? r.map(p => `<tr><td style="text-transform:capitalize">${p.type}</td><td>${U.esc(p.name)}</td><td>${U.esc(p.phone)}</td><td>${U.dt(p.createdAt)}</td><td>${p.type === 'deposit' ? U.xof(p.amount) + '<br><small class="a-p">fee ' + U.pts(p.fee) + ' → ' + U.pts(p.points) + ' pts</small>' : U.pts(p.points) + ' pts<br><small class="a-p">fee ' + U.pts(p.fee) + ' → pay ' + U.xof(p.amount) + '</small>'}</td><td>${U.esc(p.providerName || p.provider)}</td><td>${pill(p.status)}</td>${p.status === 'pending' ? dots(p.id) : '<td></td>'}</tr>`).join('') : none(8, 'No payments match these filters.'); };
  const html = `<div class="filt"><div><label>Filter</label><div class="a-sel"><select id="f-type"><option value="">Payment Type</option><option value="deposit">deposit</option><option value="withdrawal">withdrawal</option></select></div></div><div><label>Filter</label><div class="a-sel"><select id="f-st"><option value="">Status</option><option>pending</option><option>completed</option><option>failed</option></select></div></div>${dateIn('f-from', 'From')}${dateIn('f-to', 'To')}</div>
    <table class="a-tbl"><thead><tr><th>Type</th><th>Name</th><th>Mobile money no.</th><th>Date</th><th>Amount</th><th>Method</th><th>Status</th><th>Actions</th></tr></thead><tbody id="tb">${body()}</tbody></table>
    <p class="a-p" style="margin-top:14px;font-size:12px">Approving a withdrawal sends the payout (mock in this local version — connect your real provider in <code>server/lib/payments.js</code>). Rejecting refunds the held points.</p>`;
  return { html: AD.shell('payments', html), mount(root) {
    AD.after(root); const draw = () => U.$('#tb', root).innerHTML = body(); hookFilters(root, F, draw);
    AD.rowMenu(root, id => { const p = rows.find(x => String(x.id) === id); return [{ k: 'a', label: p.type === 'deposit' ? 'Mark received' : 'Approve & pay out', run: () => aact(() => API.post(`/api/admin/payments/${p.id}/approve`), 'Payment approved') }, { k: 'r', label: 'Reject', danger: true, run: () => aact(() => API.post(`/api/admin/payments/${p.id}/reject`, {}), 'Payment rejected') }]; });
  } };
};

/* ═════ Other management ═════ */
AD.leaderboard = () => {
  const F = { from: '', to: '' }, rows = S.a_users.users.filter(u => u.role === 'player').sort((a, b) => b.balance - a.balance);
  const body = () => { const r = rows.filter(u => inRange(u.createdAt, F.from, F.to)); return r.length ? r.map((u, i) => `<tr><td style="width:217px">${U.esc(u.name)}</td><td style="width:240px">${U.esc(u.email)}</td><td>${U.pts(u.balance)}</td><td>${i + 1}</td></tr>`).join('') : none(4, 'No players in this range.'); };
  const html = `<div class="filt" style="margin-top:6px;margin-bottom:42px">${dateIn('f-from', 'Registered from')}${dateIn('f-to', 'To')}</div><table class="a-tbl" style="width:auto"><thead><tr><th>Name</th><th>Emails</th><th>Points</th><th>Rank</th></tr></thead><tbody id="tb">${body()}</tbody></table>`;
  return { html: AD.shell('other', html, 'leaderboard'), mount(root) { AD.after(root); const draw = () => U.$('#tb', root).innerHTML = body(); hookFilters(root, F, draw); } };
};
AD.antifraud = () => {
  const flags = S.a_fraud.flags;
  const html = `<div style="padding-top:20px"><h2 style="font-size:20px;font-weight:400;margin-bottom:12px">Anti-Fraud Management</h2><p class="a-p" style="margin:0 0 20px;font-size:14px">Automatic flags (review manually, then suspend from Users). Rules: ≥3 failed deposits · withdrawal within 1h of sign-up · winnings above 20× deposits · sign-up from a non-allowed country. Built-in protections: turnover rule before withdrawals, max stake/payout caps, rate limits, per-phone and per-email uniqueness.</p>
    <table class="a-tbl" style="width:auto"><thead><tr><th>Player</th><th>Email</th><th>Rule</th><th>Detail</th></tr></thead><tbody>${flags.map(f => `<tr><td>${U.esc(f.name)}</td><td>${U.esc(f.email)}</td><td>${U.esc(f.rule)}</td><td>${U.esc(f.detail)}</td></tr>`).join('') || none(4, 'No suspicious activity detected.')}</tbody></table></div>`;
  return { html: AD.shell('other', html, 'antifraud'), mount: AD.after };
};
AD.content = () => {
  const c = S.content;
  const html = `<div style="padding-top:20px;max-width:640px"><h2 style="font-size:20px;font-weight:400;margin-bottom:14px">Content Management</h2><p class="a-p" style="margin:0 0 14px;font-size:14px">Customer-service contact shown to players, and FAQ (one per block: question on the first line, answer below, blank line between).</p>
    <label class="a-lbl">Support email</label><input class="a-in" id="se" value="${U.esc((c.support || {}).email || '')}" style="width:337px"><label class="a-lbl" style="margin-top:16px">Support phone / WhatsApp</label><input class="a-in" id="sp" value="${U.esc((c.support || {}).phone || '')}" style="width:337px">
    <label class="a-lbl" style="margin-top:16px">FAQ</label><textarea class="ta" id="faq" style="width:100%;height:240px">${U.esc((c.faq || []).map(f => f.q + '\n' + f.a).join('\n\n'))}</textarea><br><button class="a-save" data-act="save" style="margin-top:24px">Save</button></div>`;
  return { html: AD.shell('other', html, 'content'), mount(root) { AD.after(root); bind(root, { save: () => { const faq = U.$('#faq', root).value.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean).map(b => { const [q, ...a] = b.split('\n'); return { q: q.trim(), a: a.join(' ').trim() || '—' }; }); aact(() => API.put('/api/admin/content', { faq, support: { email: U.$('#se', root).value, phone: U.$('#sp', root).value } }), 'Content saved'); } }); } };
};
AD.reports = () => {
  const r = S.a_rep, d = S.a_dash;
  const html = `<h2 class="a-h2" style="margin-top:28px;margin-bottom:24px">Money in / out (XOF)</h2>
    <div class="stats"><div class="stat-c" style="width:210px"><div class="t">Deposits received</div><div class="v">${U.pts(r.deposits)}</div></div><div class="stat-c" style="width:210px"><div class="t">Deposit fees</div><div class="v">${U.pts(r.depositFees)}</div></div><div class="stat-c" style="width:210px"><div class="t">Withdrawals paid</div><div class="v">${U.pts(r.withdrawals)}</div></div><div class="stat-c" style="width:210px"><div class="t">Withdrawal fees</div><div class="v">${U.pts(r.withdrawFees)}</div></div><div class="stat-c" style="width:240px"><div class="t">Points owed to players</div><div class="v">${U.pts(r.liability)}</div></div></div>
    <h2 class="a-h2" style="margin-top:40px;margin-bottom:18px">Gaming revenue by product (points)</h2>
    <table class="a-tbl" style="width:auto"><thead><tr><th>Product</th><th>Stakes in</th><th>Payouts out</th><th>Gross gaming revenue</th></tr></thead><tbody>${r.products.map(p => `<tr><td>${p.product}</td><td>${U.pts(p.stakes)}</td><td>${U.pts(p.payouts)}</td><td class="${p.ggr >= 0 ? 'teal' : ''}">${U.pts(p.ggr)}</td></tr>`).join('')}</tbody></table>
    <div class="rep" style="margin-top:34px"><div class="gc chart-card" style="min-height:300px"><div class="hd"><div class="tt big">Deposits per month (peak ${U.pts(Math.max(...d.depositsByMonth))} XOF)</div></div>${C.area({ data: norm(d.depositsByMonth), color: '#18b48a', w: 520, h: 215, yLabels: false })}<div class="chart-legend"><i style="background:#18b48a"></i>${d.months[0]} → ${d.months[11]}</div></div>
    <div class="gc chart-card" style="min-height:300px"><div class="hd"><div class="tt big">Fees per month (peak ${U.pts(Math.max(...d.feesByMonth))} XOF)</div></div>${C.area({ data: norm(d.feesByMonth), color: '#f2424b', w: 520, h: 215, yLabels: false })}<div class="chart-legend"><i style="background:#f2424b"></i>${d.months[0]} → ${d.months[11]}</div></div></div>`;
  return { html: AD.shell('other', html, 'reports'), mount: AD.after };
};

/* ═════ Settings ═════ */
AD.settings = () => {
  const s = S.a_set.settings, prov = S.a_set.providers, audit = S.a_audit.items;
  const num = (k, label, hint = '') => `<div class="col"><label class="a-lbl">${label}</label><input class="a-in" data-k="${k}" type="number" step="any" value="${s[k]}" style="width:200px">${hint ? `<small class="a-p" style="display:block;margin-top:4px">${hint}</small>` : ''}</div>`;
  const html = `<div class="a-form" style="padding-top:30px;margin-left:0;max-width:980px">
    <h2 class="a-h2" style="margin-bottom:18px">Fees &amp; limits</h2>
    <div class="row" style="gap:31px;flex-wrap:wrap;margin-bottom:26px">${num('depositFeePct', 'Deposit fee %', 'taken from what the player pays')}${num('withdrawFeePct', 'Withdrawal fee %')}${num('contestRakePct', 'Contest rake %')}${num('lotteryTicketPrice', 'Lottery ticket (points)')}</div>
    <div class="row" style="gap:31px;flex-wrap:wrap;margin-bottom:26px">${num('minDeposit', 'Min deposit (XOF)')}${num('maxDeposit', 'Max deposit (XOF)')}${num('minWithdraw', 'Min withdrawal (pts)')}${num('maxWithdraw', 'Max withdrawal (pts)')}${num('maxStake', 'Max stake (pts)')}${num('maxPayout', 'Max payout per bet (pts)')}${num('signupBonus', 'Sign-up bonus (pts)')}</div>
    <h2 class="a-h2" style="margin:34px 0 14px">Location lock</h2>
    <label class="a-lbl">Allowed countries (2-letter codes, comma separated)</label><input class="a-in" id="countries" value="${s.allowedCountries.join(', ')}" style="width:337px"><p class="a-p" style="font-size:12px;margin-top:6px">Players must connect from one of these countries <i>and</i> register with a phone number from one. In production the country comes from your CDN (Cloudflare CF-IPCountry) and unknown = blocked. Admins bypass the lock.</p>
    <h2 class="a-h2" style="margin:34px 0 14px">Payment methods</h2><div class="row" style="gap:26px;flex-wrap:wrap">${Object.entries(prov).map(([k, p]) => `<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" data-prov="${k}" ${s.providers[k] ? 'checked' : ''}>${p.name}</label>`).join('')}</div>
    <h2 class="a-h2" style="margin:34px 0 14px">Rules</h2><label style="display:flex;gap:8px;align-items:center;font-size:14px;margin-bottom:10px"><input type="checkbox" id="turn" ${s.withdrawTurnover ? 'checked' : ''}> Turnover rule: players must play their deposited points at least once before withdrawing (anti money-laundering)</label>
    <label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="maint" ${s.maintenance ? 'checked' : ''}> Maintenance mode (players locked out, admins still work)</label>
    <p class="a-p" style="margin-top:22px;font-size:12px">Webhook secret for real payment providers (HMAC-SHA256 of <code>reference|status</code>): <code style="word-break:break-all">${U.esc(S.a_set.webhookSecret)}</code></p>
    <button class="a-save" data-act="save" style="margin-top:26px">Save settings</button>
    <h2 class="a-h2" style="margin:48px 0 14px">Audit log (latest 200 admin actions)</h2><table class="a-tbl" style="width:auto"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Detail</th></tr></thead><tbody>${audit.slice(0, 50).map(a => `<tr><td>${U.dt(a.ts)}</td><td>${U.esc(a.who)}</td><td>${U.esc(a.action)}</td><td>${U.esc(a.detail)}</td></tr>`).join('') || none(4, 'Nothing yet.')}</tbody></table></div>`;
  return { html: AD.shell('settings', html), mount(root) {
    AD.after(root);
    bind(root, { save: () => {
      const body = {}; U.$$('[data-k]', root).forEach(i => body[i.dataset.k] = +i.value);
      body.allowedCountries = U.$('#countries', root).value.split(',').map(x => x.trim()).filter(Boolean);
      body.providers = {}; U.$$('[data-prov]', root).forEach(i => body.providers[i.dataset.prov] = i.checked);
      body.withdrawTurnover = U.$('#turn', root).checked; body.maintenance = U.$('#maint', root).checked;
      aact(() => API.put('/api/admin/settings', body), 'Settings saved');
    } });
  } };
};

/* ═════ Dashboard sub-pages ═════ */
AD.notify = () => ({
  html: AD.shell('dashboard', `<div class="nf"><h2>Send Notification</h2><label>Header</label><textarea class="ta h" id="nh" style="height:100px;margin-bottom:32px" maxlength="80" placeholder="------"></textarea><label>Message</label><textarea class="ta h" id="nm" style="height:160px;margin-bottom:32px" maxlength="500" placeholder="----------"></textarea><button class="a-save" data-act="send">Send to all players</button></div>`),
  mount(root) { AD.after(root); bind(root, { send: async () => { const h = U.$('#nh', root).value.trim(), m = U.$('#nm', root).value.trim(); if (!h || !m) return U.toast('Add a header and a message'); const r = await act(() => API.post('/api/admin/notify', { title: h, text: m }), { ok: 'Notification sent to all players', rerender: false }); if (r) U.$('#nh', root).value = U.$('#nm', root).value = ''; } }); }
});
AD.profile = () => ({
  html: AD.shell('dashboard', `<div class="pf" style="padding-left:9px;padding-top:34px"><h2>Admin Profile</h2><label>Email</label><input class="pi2" value="${U.esc(S.me.email)}" readonly><label>Name</label><input class="pi2" value="${U.esc(S.me.name)}" id="an"><label>Role</label><input class="pi2" value="Admin" readonly><br><button class="a-save" data-act="save">Save</button></div>`),
  mount(root) { AD.after(root); bind(root, { save: () => aact(() => API.put('/api/me', { name: U.$('#an', root).value }), 'Admin profile saved') }); }
});
AD.password = () => ({
  html: AD.shell('dashboard', `<div class="pf" style="padding-left:9px;padding-top:34px"><h2>Change Password</h2><label>Old Password</label><input class="pi2" type="password" id="o" placeholder="************" autocomplete="current-password"><label>New Password</label><input class="pi2" type="password" id="n" placeholder="************" autocomplete="new-password"><label>Confirm Password</label><input class="pi2" type="password" id="c" placeholder="************" autocomplete="new-password"><br><button class="a-save" data-act="save">Change Password</button></div>`),
  mount(root) { AD.after(root); bind(root, { save: () => { const o = U.$('#o', root).value, n = U.$('#n', root).value, c = U.$('#c', root).value; if (!o || !n) return U.toast('Fill in all fields'); if (n.length < 8) return U.toast('New password must be at least 8 characters'); if (n !== c) return U.toast('Passwords do not match'); aact(() => API.post('/api/me/password', { current: o, next: n }), 'Password changed'); } }); }
});

window.AD = AD;
