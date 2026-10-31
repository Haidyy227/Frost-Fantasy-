/* Shared UI helpers */
const U = {};

U.$ = (s, r = document) => r.querySelector(s);
U.$$ = (s, r = document) => [...r.querySelectorAll(s)];
U.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
U.pts = n => Number(n || 0).toLocaleString('en-US');
U.money = n => U.pts(n) + ' pts';                       // points (1 pt = 1 XOF)
U.xof = n => Number(n || 0).toLocaleString('en-US') + ' XOF';
U.dt = t => t ? new Date(t).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
U.d = t => t ? new Date(t).toLocaleDateString('en-GB') : '—';
U.tm = t => t ? new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
U.local = t => { const d = new Date(t); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }; // for datetime-local inputs

/* tiny persisted store (localStorage, safe) */
U.store = {
  get(k, d) { try { const v = localStorage.getItem('ff:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('ff:' + k, JSON.stringify(v)); } catch {} },
};


U.toast = msg => {
  const t = U.$('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(U._tt); U._tt = setTimeout(() => t.classList.remove('show'), 2600);
};

/* ── generated placeholder art (swap for real photos / crests later) ── */
U.crest = (name, size = 22, sq = false) => {
  const c = D.crestColors[name] || '#4a6fa5';
  const ini = name.replace(/[^A-Za-zÀ-ÿ ]/g, '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return `<span class="crest${sq ? ' sq' : ''}" style="width:${size}px;height:${size}px;background:${c};font-size:${Math.round(size * .4)}px;${name === 'Real Madrid' ? 'color:#222' : ''}">${ini}</span>`;
};

U.portrait = (skin = 'light', cls = 'ph') => {
  const tone = skin === 'dark' ? ['#6b4430', '#4d2f20'] : ['#e8b99a', '#c98f6c'];
  const hair = skin === 'dark' ? '#16110e' : '#7a5a35';
  return `<svg class="${cls}" viewBox="0 0 120 140" aria-hidden="true">
    <defs><linearGradient id="j${skin}" x1="0" x2="1"><stop offset="0" stop-color="#16225a"/><stop offset=".5" stop-color="#1b2f86"/><stop offset="1" stop-color="#16225a"/></linearGradient>
    <pattern id="s${skin}" width="18" height="10" patternUnits="userSpaceOnUse"><rect width="9" height="10" fill="#32cbd3"/><rect x="9" width="9" height="10" fill="#1b2f86"/></pattern></defs>
    <path d="M6 140c0-26 14-40 38-45l16 12 16-12c24 5 38 19 38 45z" fill="url(#s${skin})"/>
    <path d="M44 95l16 12 16-12-6-10H50z" fill="${tone[1]}"/>
    <rect x="51" y="70" width="18" height="22" rx="7" fill="${tone[1]}"/>
    <ellipse cx="60" cy="48" rx="22" ry="26" fill="${tone[0]}"/>
    <path d="M38 44c0-18 10-26 22-26s22 8 22 26c-4-9-12-13-22-13s-18 4-22 13z" fill="${hair}"/>
    <circle cx="52" cy="50" r="2" fill="#241a14"/><circle cx="68" cy="50" r="2" fill="#241a14"/>
    <path d="M52 63c5 4 11 4 16 0" stroke="#7a4a3a" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`;
};

U.flag = (name, cls = 'flag') => {
  const f = { Portugal: ['#046a38', '#d62828'], Belgium: ['#111', '#f2c300', '#e8112d'] }[name] || ['#2b6cb0', '#fff'];
  const stops = f.length === 3
    ? `<rect width="33" height="100" fill="${f[0]}"/><rect x="33" width="34" height="100" fill="${f[1]}"/><rect x="67" width="33" height="100" fill="${f[2]}"/>`
    : `<rect width="40" height="100" fill="${f[0]}"/><rect x="40" width="60" height="100" fill="${f[1]}"/>`;
  return `<svg class="${cls}" viewBox="0 0 100 100"><clipPath id="c${name}"><circle cx="50" cy="50" r="50"/></clipPath><g clip-path="url(#c${name})">${stops}</g></svg>`;
};

/* ── modal ── */
U.modal = ({ title, fields = [], submit = 'Save', onSubmit, admin = false }) => {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:grid;place-items:center;z-index:90;padding:20px';
  const fieldHtml = fields.map(f => {
    const base = admin ? 'a-in' : 'pi';
    const style = admin ? 'width:100%' : '';
    if (f.type === 'select') return `<label class="a-lbl" style="margin-top:14px">${f.label}</label><div class="a-sel" style="width:100%"><select name="${f.name}">${f.options.map(o => { const v = o && o.v !== undefined ? o.v : o, l = o && o.l !== undefined ? o.l : o; return `<option value="${U.esc(v)}" ${String(v) === String(f.value) ? 'selected' : ''}>${U.esc(l)}</option>`; }).join('')}</select></div>`;
    return `<label class="a-lbl" style="margin-top:14px">${f.label}</label><input class="${base}" style="${style}" name="${f.name}" type="${f.type || 'text'}" value="${U.esc(f.value ?? '')}" ${f.req ? 'required' : ''} ${f.step ? `step="${f.step}"` : ''} autocomplete="off">`;
  }).join('');
  wrap.innerHTML = `<form style="background:#212227;border-radius:16px;padding:28px;width:420px;max-width:100%;max-height:90vh;overflow:auto;font-family:inherit"><h3 style="font-size:20px;font-weight:500;margin-bottom:6px">${U.esc(title)}</h3>${fieldHtml}
    <div style="display:flex;gap:10px;margin-top:26px"><button type="submit" class="btn btn-teal" style="flex:1">${submit}</button><button type="button" class="btn btn-ghost" data-x>Cancel</button></div></form>`;
  document.body.appendChild(wrap);
  const close = () => wrap.remove();
  wrap.addEventListener('click', e => { if (e.target === wrap || e.target.hasAttribute('data-x')) close(); });
  wrap.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const btn = wrap.querySelector('[type=submit]'); btn.disabled = true;
    let r; try { r = await onSubmit(data); } catch (err) { r = false; U.toast(err.message); }
    btn.disabled = false;
    if (r !== false) close();
  });
  const first = wrap.querySelector('input,select'); if (first) first.focus();
};

U.cbx = (on, cls = '') => `<span class="cbx ${on ? 'on' : ''} ${cls}">${I.check}</span>`;

window.U = U;
