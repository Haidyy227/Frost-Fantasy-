/* ═════════ Player pages wired to the API ═════════ */
const fee$ = (n, pct) => Math.ceil(n * pct / 100);
const stCls = s => ({ won: 'teal', completed: 'teal', lost: '', failed: '', void: '', pending: '', open: '' }[s] || '');
const statusPill = s => `<span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${{ won: 'rgba(50,203,211,.18)', completed: 'rgba(50,203,211,.18)', lost: 'rgba(242,66,75,.18)', failed: 'rgba(242,66,75,.18)', void: '#2b2c31', pending: 'rgba(242,165,43,.18)', open: 'rgba(242,165,43,.18)' }[s] || '#2b2c31'}">${s}</span>`;

/* ═════ Sportbook ═════ */
UP.sportbook = () => {
  const picks = UP.sbPicks = UP.sbPicks || new Set();
  let stake = UP.sbStake || 1000;
  const fxById = id => S.fixtures.fixtures.find(f => f.id === Number(id));
  const slip = () => {
    const items = [...picks].map(k => { const [id, p] = k.split(':'); const f = fxById(id); return f ? { f, p, odd: f.odds[p] } : null; }).filter(Boolean);
    const total = items.reduce((a, b) => a * b.odd, 1), win = items.length ? Math.floor(stake * total) : 0;
    return `<div class="slip-top"><div><b style="font-weight:500">${items.length} Selection</b><small>${items.length > 1 ? 'Accumulator · odds ' + total.toFixed(2) : 'Single'}</small></div><div style="font-size:15px;font-weight:500">To win → ${U.money(win)}</div></div>
      ${items.map(i => `<div style="font-size:12px;padding:6px 2px;color:#b9bbc3">${U.esc(i.f.home)} v ${U.esc(i.f.away)} · <b style="color:#fff">${{ h: '1', d: 'X', a: '2' }[i.p]}</b> @ ${i.odd.toFixed(2)}</div>`).join('')}
      <div class="amt"><input id="stake" type="number" min="100" step="100" value="${stake}" aria-label="Stake in points" style="background:none;border:0;outline:0;color:#fff;font-size:16px;width:70px">${I.upLeft.replace('<svg', '<svg style="transform:rotate(135deg)"')}<span>${U.pts(win)}</span><button class="mk" data-act="bet">Make a bet</button></div>
      <div class="chips">${[500, 1000, 2000, 5000, 10000, 20000].map(v => `<button data-act="chip" data-v="${v}" class="${v === stake ? 'on' : ''}">${v >= 1000 ? v / 1000 + 'k' : v}</button>`).join('')}</div>
      <p class="muted" style="font-size:11px;margin-top:14px">Balance: ${U.money(S.me.balance)}</p>`;
  };
  const mine = S.bets.bets.slice(0, 6).map(b => `<div class="rank" style="justify-content:space-between;font-size:12px;border-bottom:1px solid #26272c;padding:10px 0"><span>#${b.id} · ${b.legs.length} sel · ${U.money(b.stake)}</span><span>${b.status === 'open' ? 'To win ' + U.money(b.potential) : b.status === 'won' ? '+' + U.money(b.payout) : ''} ${statusPill(b.status)}</span></div>`).join('');
  const html = `<div style="display:flex;align-items:flex-start;position:relative;margin-bottom:12px"><h2 class="h-md" style="font-weight:500;font-size:16px;padding-top:6px;margin-right:auto">Sportbook</h2></div>
    <div class="dash" style="grid-template-columns:minmax(0,1fr) 318px;gap:32px"><div class="fx" id="fx">${UP.fixtures({ odds: true, picks })}</div>
    <div><div class="slip" id="slip" style="position:sticky;top:90px">${slip()}</div>
    <div class="panel" style="margin-top:22px"><h4 style="justify-content:flex-start;font-size:16px;font-weight:600">My bets</h4>${mine || '<p class="muted" style="font-size:12px">No bets yet.</p>'}</div></div></div>`;
  return {
    html: UP.shell('sportbook', html, { sports: false }), mount(root) {
      UP.afterShell(root);
      const search = U.$('[data-fxs]', root);
      const redraw = () => { U.$('#fx-list', root).innerHTML = UP.fxList(true, picks, search.value); U.$('#slip', root).innerHTML = slip(); wireStake(); };
      const wireStake = () => { const s = U.$('#stake', root); if (s) s.addEventListener('change', () => { stake = UP.sbStake = Math.max(0, Math.floor(+s.value || 0)); U.$('#slip', root).innerHTML = slip(); wireStake(); }); };
      wireStake();
      search.addEventListener('input', redraw);
      bind(root, {
        odd: t => { const k = t.dataset.k; const [id] = k.split(':'); ['h', 'd', 'a'].forEach(p => picks.delete(id + ':' + p)); if (!t.classList.contains('on')) picks.add(k); redraw(); },
        chip: t => { stake = UP.sbStake = +t.dataset.v; U.$('#slip', root).innerHTML = slip(); wireStake(); },
        day: t => { const i = +t.dataset.i; UP.dayIdx = UP.dayIdx === i ? null : i; U.$$('[data-act=day]', root).forEach(b => b.classList.toggle('on', +b.dataset.i === UP.dayIdx)); redraw(); },
        cal: () => U.toast('Pick a day above to filter matches'),
        bet: async () => {
          if (!picks.size) return U.toast('Select at least one outcome first');
          const selections = [...picks].map(k => { const [id, pick] = k.split(':'); return { fixtureId: +id, pick }; });
          const r = await act(() => API.post('/api/bets', { selections, stake }), { ok: r => `Bet placed: ${U.money(stake)} → to win ${U.money(r.bet.potential)}`, rerender: false });
          if (r) { picks.clear(); render(true); }
        },
      });
    }
  };
};

/* ═════ Fantasy ═════ */
UP.fanTabs = on => `<div class="utabs" style="width:721px;max-width:100%">${[['lineup', 'Current Line up'], ['teams', 'Team lists'], ['predict', 'Predict and Win']].map(t => `<a href="#/fantasy/${t[0]}"><button class="${on === t[0] ? 'on' : ''}" tabindex="-1">${t[1]}</button></a>`).join('')}</div>`;

UP.lineCard = sel => c => {
  const s = sel ? sel[c.id] : null;
  return `<div class="pcard ${s ? 'sel' : ''}" data-id="${c.id}" style="${sel ? '' : 'background:#212227'}">
    ${U.portrait(c.skin)}
    <div class="info"><div class="row1"><span class="chip">${I.soccer}Soccer</span><h3>${U.crest(c.club || 'FC', 18, true)}${U.esc(c.player)}</h3></div>
      <div class="meta">${U.dt(c.kickoff)} ${U.esc(c.match || '')} · ${U.esc(c.pos || '')}</div><div class="shots">${c.line} ${U.esc(c.stat)}</div></div>
    <div class="acts"><button class="btn ${s === 'less' ? 'btn-line' : 'btn-teal'}" data-act="pick" data-id="${c.id}" data-v="more">More</button>
      <button class="btn ${s === 'less' ? 'btn-teal' : 'btn-line'}" data-act="pick" data-id="${c.id}" data-v="less">Less</button></div></div>`;
};

UP.playerCard = (p, hi = false, extra = '') => `<div class="sp ${hi ? 'on' : ''}" data-act="spick" data-id="${p.id}" ${extra}>
  ${U.crest(p.club || 'Barcelona', 18, true)}<div class="nm">${U.esc(p.name)}</div><div class="pos">${U.esc(p.pos)}</div><div class="pr">${U.money(p.price)}</div>${U.portrait(p.skin)}</div>`;

UP.fantasy = tab => {
  const F = UP.F = UP.F || { sel: {}, plan: 'high', fee: 1000 };
  if (tab === 'lineup') for (const k of Object.keys(F.sel)) if (!S.props.props.some(p => String(p.id) === k)) delete F.sel[k];
  const R = tab === 'lineup' ? S.props.rules : null;
  const mult = () => (F.plan === 'high' ? R.high.mult : R.light.mult);
  const sidebar = () => {
    const n = Object.keys(F.sel).length;
    return `<div class="sel-bar"><b>${n} Players Selected</b><button class="clear" data-act="clear">${I.closeC}Clear</button></div>
      <div class="pay ${F.plan === 'light' ? 'on' : ''}" data-act="plan" data-v="light"><h5>Light Pay</h5>${F.plan === 'light' ? `<span class="ck">${U.cbx(true)}</span>` : ''}<p>Pick 4 to 6. You need at least 4 correct.</p>
        <div class="ln l1"><span style="background:none;min-width:0;height:auto;padding:0;display:block;font-weight:400;font-size:12px;margin:0">4+ correct</span><span>×${R.light.mult}</span></div></div>
      <div class="pay ${F.plan === 'high' ? 'on' : ''}" data-act="plan" data-v="high"><h5>High Pay</h5>${F.plan === 'high' ? `<span class="ck">${U.cbx(true)}</span>` : ''}<p>Pick 2 to 6. Every pick must be correct.</p>
        <div class="ln l1"><span style="background:none;min-width:0;height:auto;padding:0;display:block;font-weight:400;font-size:12px;margin:0">All correct</span><span>×${R.high.mult}</span></div></div>
      <div class="fee"><div><small>Entry (points)</small><div style="display:flex;align-items:center;font-size:24px;font-weight:600;margin-top:20px"><input id="fee" type="number" min="100" step="100" value="${F.fee}" style="margin:0;width:100%"></div></div>
        <div><small>To Win</small><span class="v" id="towin">${U.pts(Math.floor(F.fee * mult()))}</span></div></div>
      <button class="btn btn-teal" data-act="submit" style="width:100%;margin-top:14px;height:46px">Place entry</button>
      <div class="bal"><span>Balance: ${U.money(S.me.balance)}</span></div>`;
  };
  const head = `<div class="fan-top"><div style="flex:1">${UP.fanTabs(tab)}</div>${tab === 'lineup' ? `<div class="btns"><a class="btn btn-line" href="#/fantasy/create-team" style="width:156px">Create Team</a><a class="btn btn-teal" href="#/fantasy/predict">Join a Contest</a></div>` : ''}</div>`;
  let body = '';
  if (tab === 'lineup') {
    const ent = S.entries.entries.slice(0, 6).map(e => `<div class="rank" style="justify-content:space-between;font-size:12px;border-bottom:1px solid #26272c;padding:10px 0"><span>#${e.id} · ${e.mode === 'high' ? 'High' : 'Light'} Pay · ${e.legs.length} picks · ${U.money(e.stake)}</span><span>${e.status === 'won' ? '+' + U.money(e.payout) : e.status === 'open' ? 'To win ' + U.money(e.potential) : ''} ${statusPill(e.status)}</span></div>`).join('');
    body = `<div class="fan" style="margin-top:6px"><div><div class="lineup">${S.props.props.map(UP.lineCard(F.sel)).join('') || '<p class="muted">No line-up props are open right now.</p>'}</div>
      <div class="panel" style="margin-top:26px"><h4 style="justify-content:flex-start;font-size:16px;font-weight:600">My entries</h4>${ent || '<p class="muted" style="font-size:12px">No entries yet.</p>'}</div></div><div id="fside" style="padding-top:2px">${sidebar()}</div></div>`;
  } else if (tab === 'teams') {
    const teams = S.teams.teams;
    body = `<div style="margin-top:30px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h4 style="font-size:16px;font-weight:600">My teams</h4><a class="btn btn-teal" href="#/fantasy/create-team" style="width:160px">Create team</a></div>
      ${teams.length ? `<div class="pgrid" style="max-width:984px;gap:14px 12px">${teams.map(t => `<div class="ocard" style="width:auto"><b>${U.esc(t.name)}</b><div class="kv"><span>Formation</span><span>${U.esc(t.formation)}</span></div><div class="kv"><span>Players</span><span>${t.playerIds.length}</span></div><div class="kv"><span>Cost</span><span>${U.money(t.cost)}</span></div><a class="view-d" href="#" data-act="delteam" data-id="${t.id}">Delete</a></div>`).join('')}</div>` : '<p class="muted">You have no teams yet. Create one to enter contests.</p>'}
      <h4 style="font-size:16px;font-weight:600;margin:34px 0 14px">Player pool</h4><div class="pgrid" style="max-width:984px;gap:14px 12px">${S.players.players.map(p => UP.playerCard(p, false, 'style="cursor:default"').replace('data-act="spick"', '')).join('')}</div></div>`;
  } else {
    const cats = S.predict.categories;
    body = `<div class="fan" style="grid-template-columns:minmax(0,1fr) 318px;margin-top:22px"><div>
      <h4 style="font-size:16px;font-weight:600;margin-bottom:14px">Predict and Win</h4>
      ${cats.map(k => `<div class="panel" style="margin-bottom:16px;padding:20px"><div style="display:flex;justify-content:space-between;gap:12px"><b>${U.esc(k.title)}</b><span class="teal" style="white-space:nowrap">Win ${U.money(k.reward)}</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:14px">${k.options.map(o => `<button class="btn ${k.mine === o ? 'btn-teal' : 'btn-line'}" style="min-width:110px" data-act="predict" data-id="${k.id}" data-o="${U.esc(o)}" ${k.status !== 'open' ? 'disabled' : ''}>${U.esc(o)}</button>`).join('')}</div>
        <p class="muted" style="font-size:11px;margin-top:12px">${k.status === 'settled' ? 'Result: ' + U.esc(k.correct) + (k.mine ? (k.mine === k.correct ? ' · you won!' : ' · better luck next time') : '') : 'Free to play · closes ' + U.dt(k.closesAt)}</p></div>`).join('') || '<p class="muted">No prediction categories yet.</p>'}</div>
      <div id="pside"><h4 style="font-size:16px;font-weight:600;margin:0 0 14px">Contests</h4>${S.contests.contests.map(c => `<div class="ocard" style="margin-bottom:14px"><b>${U.esc(c.name)}</b><div class="kv"><span>Entries</span><span>${c.entries}/${c.maxEntries}</span></div><div class="kv"><span>Entry fee</span><span>${U.money(c.entryFee)}</span></div><div class="kv"><span>Status</span><span>${c.joined ? 'Joined' : c.status}</span></div><a class="view-d" href="#/fantasy/contest/${c.id}">View Details</a></div>`).join('') || '<p class="muted">No contests.</p>'}</div></div>`;
  }
  return {
    html: UP.shell('fantasy', head + body), mount(root) {
      UP.afterShell(root);
      const side = U.$('#fside', root);
      const refresh = () => { if (side) { side.innerHTML = sidebar(); bindFee(); U.$$('.pcard', root).forEach(c => { const s = F.sel[c.dataset.id]; c.classList.toggle('sel', !!s); const [b1, b2] = c.querySelectorAll('.acts .btn'); b1.className = 'btn ' + (s === 'less' ? 'btn-line' : 'btn-teal'); b2.className = 'btn ' + (s === 'less' ? 'btn-teal' : 'btn-line'); }); } };
      const bindFee = () => { const f = U.$('#fee', root); if (f) f.addEventListener('input', () => { F.fee = Math.max(0, Math.floor(+f.value || 0)); U.$('#towin', root).textContent = U.pts(Math.floor(F.fee * mult())); }); };
      bindFee();
      bind(root, {
        pick: t => { const id = t.dataset.id, v = t.dataset.v; if (F.sel[id] === v) delete F.sel[id]; else F.sel[id] = v; refresh(); },
        clear: () => { F.sel = {}; refresh(); },
        plan: t => { F.plan = t.dataset.v; refresh(); },
        submit: async () => {
          const picks = Object.entries(F.sel).map(([propId, side]) => ({ propId: +propId, side }));
          const r = await act(() => API.post('/api/fantasy/entries', { picks, mode: F.plan, stake: F.fee }), { ok: 'Entry placed — good luck!', rerender: false });
          if (r) { F.sel = {}; render(true); }
        },
        delteam: (t, e) => { e.preventDefault(); act(() => API.del('/api/fantasy/teams/' + t.dataset.id), { ok: 'Team deleted' }); },
        predict: t => act(() => API.post('/api/predict/' + t.dataset.id, { option: t.dataset.o }), { ok: 'Prediction saved' }),
      });
    }
  };
};

/* ═════ Create team ═════ */
UP.createTeam = () => {
  const T = UP.T = UP.T || { name: 'My Team', formation: D.formations[0], sel: new Set(), cap: null };
  const pool = S.players.players, size = S.players.teamSize, budget = S.players.budget;
  const cost = () => pool.filter(p => T.sel.has(p.id)).reduce((a, p) => a + p.price, 0);
  const grids = () => {
    const chosen = pool.filter(p => T.sel.has(p.id));
    return `<label class="big-cb">${U.cbx(T.sel.size === size)}Select ${size} Players<span style="margin-left:auto;font-size:14px;font-weight:500">${T.sel.size}/${size} selected · ${U.money(cost())} of ${U.money(budget)}</span></label>
      <div class="pgrid" style="max-width:984px">${pool.map(p => UP.playerCard(p, T.sel.has(p.id))).join('')}</div>
      <label class="big-cb" style="margin-top:36px;margin-bottom:8px">${U.cbx(!!T.cap)}Select Captain (scores ×2)</label>
      <p class="muted" style="font-size:14px;margin-bottom:18px">Your captain's points count double in contests.</p>
      <div class="pgrid" style="max-width:984px">${chosen.length ? chosen.map(p => UP.playerCard(p, T.cap === p.id).replace('data-act="spick"', 'data-act="cap"')).join('') : '<p class="muted">Select players above to choose a captain.</p>'}</div>`;
  };
  const html = `<a class="back" href="#/fantasy/teams">${I.chevL}Back / Create Team</a>
    <div class="form3" style="max-width:990px;margin-top:34px"><div><label>Team Name</label><input class="fbox" id="tname" value="${U.esc(T.name)}" maxlength="40"></div>
      <div><label>Select Formation</label><div class="fbox" style="position:relative"><select id="tform">${D.formations.map(f => `<option ${f === T.formation ? 'selected' : ''}>${f}</option>`).join('')}</select>${I.chev.replace('<svg', '<svg width="18" height="18" style="position:absolute;right:26px;color:#8b8d96"')}</div></div>
      <div><label>Budget</label><div class="fbox" id="bud">${U.money(budget - cost())} left</div></div></div>
    <div id="tgrids">${grids()}</div><div class="create-row"><button class="btn" data-act="create">Create</button></div>`;
  return {
    html: UP.shell('fantasy', html), mount(root) {
      UP.afterShell(root);
      const g = () => { U.$('#tgrids', root).innerHTML = grids(); U.$('#bud', root).textContent = U.money(budget - cost()) + ' left'; };
      U.$('#tname', root).addEventListener('input', e => T.name = e.target.value);
      U.$('#tform', root).addEventListener('change', e => T.formation = e.target.value);
      bind(root, {
        spick: t => { const id = t.dataset.id; if (T.sel.has(id)) { T.sel.delete(id); if (T.cap === id) T.cap = null; } else if (T.sel.size >= size) return U.toast(`A team has ${size} players`); else T.sel.add(id); g(); },
        cap: t => { T.cap = T.cap === t.dataset.id ? null : t.dataset.id; g(); },
        create: async () => {
          if (!T.name.trim()) return U.toast('Give your team a name');
          if (T.sel.size !== size) return U.toast(`Select exactly ${size} players`);
          if (!T.cap) return U.toast('Select a captain');
          const r = await act(() => API.post('/api/fantasy/teams', { name: T.name, formation: T.formation, playerIds: [...T.sel], captain: T.cap }), { ok: `Team “${T.name}” created`, rerender: false });
          if (r) { UP.T = null; location.hash = '#/fantasy/teams'; }
        },
      });
    }
  };
};

/* ═════ Contest ═════ */
UP.contest = () => {
  const c = S.contest.contest, entries = S.contest.entries;
  const kv = (a, b) => `<div class="kv tall"><span>${a}</span><span>${b}</span></div>`;
  const oc = x => `<div class="ocard"><b>${U.esc(x.name)}</b>${kv('Entries', x.entries + '/' + x.maxEntries)}${kv('Entry Fees', U.money(x.entryFee))}<a class="view-d" href="#/fantasy/contest/${x.id}">View Details</a></div>`;
  const joined = S.contests.contests.find(x => x.id === c.id)?.joined;
  const html = `<div style="display:flex;justify-content:space-between;align-items:flex-start"><div><a class="back" href="#/fantasy/predict" style="margin-bottom:14px">${I.chevL}Back</a><h2 style="font-size:16px;font-weight:500;margin-top:4px">${U.esc(c.name)}</h2></div>
      ${c.status === 'open' && !joined ? `<button class="btn btn-teal" data-act="join" style="width:159px;height:44px">Participate</button>` : `<span class="muted" style="padding-top:10px">${joined ? 'You are in this contest' : 'Contest ' + c.status}</span>`}</div>
    <div class="contest" style="margin-top:6px"><div>
      <div class="card" style="padding:22px 0 0;border-radius:20px;background:#1b1c21;overflow:hidden"><b style="font-size:11px;padding:0 26px;display:block;margin-bottom:12px">Contest Details</b>
        <p style="font-size:12px;color:#8b8d96;line-height:1.5;padding:0 20px 14px">Build a team of 11 within budget and enter. Your team's score is the sum of its players' fantasy points (captain counts double). The top 3 share the prize pool: 50% / 30% / 20% after the platform rake.</p>
        <div style="background:#1b1c21">${[['Entries', c.entries + ' / ' + c.maxEntries], ['Starts', U.dt(c.startsAt)], ['Prize Pool', c.prizePool != null ? U.money(c.prizePool) : 'Grows with entries'], ['Entry Fees', U.money(c.entryFee)]].map((r, i) => `<div class="kv tall" style="padding:0 40px;${i % 2 === 0 ? 'background:#2b2c31' : ''};height:${i % 2 ? 66 : 50}px"><span>${r[0]}</span><span>${r[1]}</span></div>`).join('')}</div><div style="height:22px"></div></div>
      <div class="card" style="margin-top:22px;padding:18px;background:#1b1c21;border-radius:24px"><div class="tbl2"><table><thead><tr><th>Rank</th><th>Player</th><th>Score</th><th>Prize</th></tr></thead><tbody>
        ${entries.map(e => `<tr style="${e.mine ? 'color:var(--teal)' : ''}"><td>${e.rank ?? '–'}</td><td>${U.esc(e.name)}</td><td>${e.score ?? '–'}</td><td>${e.prize ? U.money(e.prize) : '–'}</td></tr>`).join('') || '<tr><td colspan="4" class="muted" style="padding:20px">No entries yet. Be the first!</td></tr>'}</tbody></table><div style="height:30px"></div></div></div>
    </div><div class="other"><h4>Other Contest</h4>${S.contests.contests.filter(x => x.id !== c.id).slice(0, 3).map(oc).join('') || '<p class="muted">No other contests.</p>'}</div></div>`;
  return {
    html: UP.shell('fantasy', html), mount(root) {
      UP.afterShell(root);
      bind(root, { join: () => {
        const teams = S.teams.teams;
        if (!teams.length) { U.toast('Create a team first'); return location.hash = '#/fantasy/create-team'; }
        U.modal({ title: `Join ${c.name} (${U.money(c.entryFee)})`, submit: 'Pay & join', fields: [{ label: 'Choose your team', name: 'teamId', type: 'select', options: teams.map(t => ({ v: t.id, l: t.name })), value: teams[0].id }],
          onSubmit: async d => { const r = await act(() => API.post(`/api/fantasy/contests/${c.id}/join`, { teamId: +d.teamId }), { ok: 'You have joined — good luck!' }); return r ? true : false; } });
      } });
    }
  };
};

/* ═════ Lottery ═════ */
UP.lottery = () => {
  const L = UP.L = UP.L || { sel: [] };
  const lot = S.lottery, cur = lot.current, price = cur.ticketPrice, last = lot.past[0];
  const rows = 'ABCDEF'.split('');
  const grid = () => rows.map((r, ri) => `<div class="r"><b>${r}</b>${Array.from({ length: 9 }, (_, c) => { const n = ri * 9 + c + 1; return `<span class="ball ${L.sel.includes(n) ? 'out' : ''}" data-act="num" data-n="${n}">${n}</span>`; }).join('')}</div>`).join('');
  const sel = () => [0, 1, 2].map(i => `<span class="ball ${L.sel[i] ? 'out' : ''}" style="${L.sel[i] ? '' : 'background:#27282c;border-color:transparent'}">${L.sel[i] ?? '-'}</span>`).join('');
  const tickets = lot.myTickets.slice(0, 12).map(t => `<div class="rank" style="justify-content:space-between;font-size:13px;padding:8px 0;border-bottom:1px solid #26272c"><span>#${t.id} · Draw ${t.drawId} · <b>${t.numbers.join(' - ')}</b></span><span>${t.matches == null ? statusPill('open') : t.prize ? `<span class="teal">+${U.money(t.prize)} (${t.matches} match)</span>` : `${t.matches} match`}</span></div>`).join('');
  const past = lot.past.slice(0, 5).map(d => `<div style="padding:12px 0;border-bottom:1px solid #26272c;font-size:12px;line-height:1.7"><b style="font-size:13px">Draw #${d.id}</b> · ${d.numbers.join(' - ')} · ${d.tickets} tickets, ${d.winners} winners <span data-verify="${d.id}" style="margin-left:6px">…</span>
    <div class="muted" style="word-break:break-all">commit sha256: ${d.commit}<br>seed: ${d.seed}</div></div>`).join('');
  const html = `<h2 style="font-size:15px;font-weight:600;margin:8px 0 14px 10px">Lottery · Draw #${cur.id}</h2>
    <div class="banner"><div class="figs">${UP.figure('#c0262d', '#c98f6c', 1)}${UP.figure('#274a9a', '#e8b99a', 0)}</div>
      <div class="mid"><span class="tk">${I.ticket}</span>Lottery Ticket Purchase<span class="tk">${I.ticket}</span></div>
      <div class="rt">${U.money(price)}<button class="btn btn-teal" data-act="buy">Purchase Ticket</button></div></div>
    <div class="lot-status">Closes ${U.dt(cur.closesAt)} · ${cur.tickets} tickets sold · Win ${lot.rules.prizes[3]}× for 3 matches, ${lot.rules.prizes[2]}× for 2</div>
    <div class="lot-title"><b>Pick 3 numbers from 1–${lot.rules.pool}</b><span class="no"><a href="#" data-act="quick" style="color:var(--teal)">Quick pick</a> · <a href="#" data-act="quick5" style="color:var(--teal)">Buy 5 quick picks</a></span></div>
    <div class="lot-sec" style="margin-top:38px"><h5>Last Winning Numbers ${last ? '(Draw #' + last.id + ')' : ''}</h5><div class="balls">${[0, 1, 2].map(i => `<span class="ball win" style="width:42px;height:42px">${last ? last.numbers[i] : '-'}</span>`).join('')}</div></div>
    <div class="lot-sec" style="margin-top:32px"><h5>Selected Numbers</h5><div class="balls" id="selb">${sel()}</div></div>
    <div class="grid-l" id="lgrid">${grid()}</div>
    <div class="panel" style="margin-top:34px;max-width:720px"><h4 style="justify-content:flex-start;font-size:16px;font-weight:600">My tickets</h4>${tickets || '<p class="muted" style="font-size:12px">No tickets yet.</p>'}</div>
    <div class="panel" style="margin-top:22px;max-width:720px"><h4 style="justify-content:flex-start;font-size:16px;font-weight:600">Provably fair</h4>
      <p class="muted" style="font-size:12px;line-height:1.7">Before tickets go on sale we publish a fingerprint (SHA-256) of a secret seed. After the draw we reveal the seed — anyone can check it matches the fingerprint and recompute the winning numbers.</p>
      <p style="font-size:12px;word-break:break-all;margin:10px 0">Draw #${cur.id} commitment:<br><code>${cur.commit}</code></p>${past}</div>`;
  return {
    html: UP.shell('lottery', html), mount(root) {
      UP.afterShell(root);
      // verify past draws in the browser: sha256(seed) == commit, and numbers are re-derived from the seed
      (async () => {
        const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
        for (const d of lot.past.slice(0, 5)) {
          let ok = (await sha(d.seed)) === d.commit; const nums = [];
          for (let i = 0; nums.length < 3; i++) { const n = (parseInt((await sha(d.seed + ':' + i)).slice(0, 8), 16) % 54) + 1; if (!nums.includes(n)) nums.push(n); }
          ok = ok && nums.sort((a, b) => a - b).join() === d.numbers.join();
          const el = U.$(`[data-verify="${d.id}"]`, root); if (el) el.innerHTML = ok ? '<span class="teal">✓ verified in your browser</span>' : '<span style="color:#f2424b">✗ mismatch</span>';
        }
      })().catch(() => {});
      bind(root, {
        num: t => {
          const n = +t.dataset.n, i = L.sel.indexOf(n);
          if (i >= 0) L.sel.splice(i, 1); else if (L.sel.length < 3) L.sel.push(n); else return U.toast('You can pick up to 3 numbers — deselect one first');
          U.$('#lgrid', root).innerHTML = grid(); U.$('#selb', root).innerHTML = sel();
        },
        quick: (t, e) => { e.preventDefault(); const s = new Set(); while (s.size < 3) s.add(1 + Math.floor(Math.random() * 54)); L.sel = [...s].sort((a, b) => a - b); U.$('#lgrid', root).innerHTML = grid(); U.$('#selb', root).innerHTML = sel(); },
        quick5: (t, e) => { e.preventDefault(); act(() => API.post('/api/lottery/tickets', { quickPicks: 5 }), { ok: r => `5 quick-pick tickets bought for ${U.money(price * 5)}` }); },
        buy: async () => {
          if (L.sel.length < 3) return U.toast('Pick 3 numbers first (or use Quick pick)');
          const r = await act(() => API.post('/api/lottery/tickets', { tickets: [L.sel] }), { ok: `Ticket bought: ${L.sel.join('-')}`, rerender: false });
          if (r) { L.sel = []; render(true); }
        },
      });
    }
  };
};

/* ═════ Wallet (points) ═════ */
UP.wallet = () => {
  const W = UP.W = UP.W || { mode: 'deposit', provider: null, amt: '', phone: '' };
  const meta = S.meta, w = S.wallet;
  if (!W.provider || !meta.providers.some(p => p.id === W.provider)) W.provider = meta.providers[0] && meta.providers[0].id;
  if (!W.phone) W.phone = S.me.phone.replace(/^\+227/, '');
  const pending = w.payments.filter(p => p.status === 'pending');
  const hist = () => w.payments.map(p => `<div class="tr ${p.type === 'withdrawal' ? 'w' : 'd'}"><span>${p.type === 'withdrawal' ? 'Withdrawal' : 'Deposit'} · ${U.esc((meta.providers.find(x => x.id === p.provider) || {}).name || p.provider)}</span><span>${p.type === 'withdrawal' ? U.money(p.points) : U.xof(p.amount)}</span><span>${U.d(p.createdAt)} ${statusPill(p.status)}</span></div>
      ${p.status === 'pending' && p.type === 'deposit' && meta.geo.dev ? `<div style="padding:4px 0 10px;font-size:12px">Dev: <a href="#" data-act="devok" data-id="${p.id}" class="teal">simulate “approved on phone”</a> · <a href="#" data-act="devfail" data-id="${p.id}" style="color:#f2424b">simulate declined</a></div>` : ''}`).join('')
    + w.ledger.slice(0, 8).map(l => `<div class="tr ${l.amount < 0 ? 'w' : 'd'}" style="opacity:.8"><span>${U.esc(l.note || l.type)}</span><span>${l.amount > 0 ? '+' : ''}${U.pts(l.amount)} pts</span><span>${U.d(l.ts)}</span></div>`).join('');
  const quote = () => {
    const n = Math.floor(+W.amt || 0);
    if (n <= 0) return '<p class="muted" style="font-size:12px;margin:6px 0 16px">Enter an amount to see the fee.</p>';
    if (W.mode === 'deposit') { const f = fee$(n, meta.depositFeePct); return `<div class="note" style="margin:6px 0 16px;line-height:1.8">You pay <b>${U.xof(n)}</b><br>Deposit fee (${meta.depositFeePct}%): −${U.pts(f)}<br>You get <b class="teal">${U.money(n - f)}</b></div>`; }
    const f = fee$(n, meta.withdrawFeePct); return `<div class="note" style="margin:6px 0 16px;line-height:1.8">Points withdrawn <b>${U.money(n)}</b><br>Withdrawal fee (${meta.withdrawFeePct}%): −${U.pts(f)}<br>You receive <b class="teal">${U.xof(n - f)}</b></div>`;
  };
  const gate = () => `<h5>${W.mode === 'deposit' ? 'Buy points' : 'Withdraw points'}</h5>
    <div class="opts" style="flex-wrap:wrap;gap:10px 18px">${meta.providers.map(p => `<label data-act="method" data-v="${p.id}">${U.cbx(W.provider === p.id)}${U.esc(p.name)}</label>`).join('')}</div>
    <small>Mobile-money number</small><input class="in-pill" id="phone" inputmode="tel" value="${U.esc(W.phone)}" placeholder="90 00 00 00">
    <small>${W.mode === 'deposit' ? `Amount (XOF) · min ${U.pts(meta.minDeposit)} · 1 XOF = 1 point` : `Points to withdraw · min ${U.pts(meta.minWithdraw)}`}</small><input class="in-pill" id="amt" type="number" min="1" step="100" placeholder="${W.mode === 'deposit' ? 'e.g. 10000' : 'e.g. 5000'}" value="${U.esc(W.amt)}">
    <div id="quote">${quote()}</div>
    ${W.mode === 'withdraw' && w.wagerReq > 0 ? `<p class="note" style="color:#f2a52b">Turnover rule: play ${U.money(w.wagerReq)} more before you can withdraw.</p>` : ''}
    <button class="btn btn-teal pay-btn" data-act="pay">${W.mode === 'deposit' ? 'Pay with ' + U.esc((meta.providers.find(p => p.id === W.provider) || {}).name || '') : 'Request withdrawal'}</button>
    <p class="muted" style="text-align:center;font-size:11px;margin-top:14px">${W.mode === 'deposit' ? 'Local demo: no real money moves. Payment is approved with the “simulate” link in your history.' : 'Withdrawals are reviewed by our team, then sent to your mobile-money number.'}</p>`;
  const html = `<div class="wal"><div><h5>Points Balance</h5><div class="balance">${I.wallet}<span id="wbal">${U.pts(S.me.balance)} pts</span></div>
      <p class="muted" style="margin:-6px 0 14px;font-size:12px">1 point = 1 XOF${pending.length ? ' · ' + pending.length + ' payment(s) pending' : ''}</p>
      <div class="wbtns"><button class="btn btn-pill ${W.mode === 'deposit' ? 'on' : ''}" data-act="mode" data-v="deposit">${I.upLeft}Buy points</button><button class="btn btn-pill ${W.mode === 'withdraw' ? 'on' : ''}" data-act="mode" data-v="withdraw">${I.downRight}Withdraw</button></div>
      <div class="hist"><h5>Transaction History</h5><div id="hist">${hist() || '<p class="muted">Nothing yet.</p>'}</div></div></div>
      <div class="gate" id="gate" style="margin-top:22px">${gate()}</div></div>`;
  return {
    html: UP.shell('wallet', html, { sports: false }), mount(root) {
      UP.afterShell(root);
      const wire = () => {
        const a = U.$('#amt', root); if (a) a.addEventListener('input', () => { W.amt = a.value; U.$('#quote', root).innerHTML = quote(); });
        const p = U.$('#phone', root); if (p) p.addEventListener('input', () => W.phone = p.value);
      };
      const redraw = () => { U.$('#gate', root).innerHTML = gate(); U.$$('.wbtns .btn', root).forEach(b => b.classList.toggle('on', b.dataset.v === W.mode)); wire(); };
      wire();
      bind(root, {
        mode: t => { W.mode = t.dataset.v; redraw(); },
        method: t => { W.provider = t.dataset.v; redraw(); },
        devok: (t, e) => { e.preventDefault(); act(() => API.post(`/api/dev/payments/${t.dataset.id}/confirm`), { ok: 'Payment approved — points added' }); },
        devfail: (t, e) => { e.preventDefault(); act(() => API.post(`/api/dev/payments/${t.dataset.id}/fail`), { ok: 'Payment declined' }); },
        pay: async () => {
          const n = Math.floor(+W.amt || 0); if (n <= 0) return U.toast('Enter an amount first');
          if (W.mode === 'deposit') {
            const r = await act(() => API.post('/api/wallet/deposit', { provider: W.provider, phone: W.phone, amount: n }), { rerender: false });
            if (r) { W.amt = ''; U.toast(r.instructions); render(true); }
          } else {
            const r = await act(() => API.post('/api/wallet/withdraw', { provider: W.provider, phone: W.phone, points: n }), { rerender: false });
            if (r) { W.amt = ''; U.toast('Withdrawal requested — waiting for review'); render(true); }
          }
        },
      });
    }
  };
};

window.UP = UP;
