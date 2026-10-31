/* Tiny dependency-free SVG chart helpers */
const C = {};

// Catmull-Rom → cubic bezier path through points
C.smooth = pts => {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const t = 0.18;
    d += ` C${p1[0] + (p2[0] - p0[0]) * t},${p1[1] + (p2[1] - p0[1]) * t} ${p2[0] - (p3[0] - p1[0]) * t},${p2[1] - (p3[1] - p1[1]) * t} ${p2[0]},${p2[1]}`;
  }
  return d;
};

let uid = 0;

/* Area line chart in a gridded box (admin dashboard / reports) */
C.area = ({ data, color, fill, w = 500, h = 250, ymax = 9, yLabels = true }) => {
  const id = 'a' + (++uid);
  const L = 28, R = 4, T = 28, B = 26;
  const bx = L, bw = w - L - R, by = T + 14, bh = h - by - B;
  const xs = i => bx + (i / (data.length - 1)) * bw;
  const ys = v => by + bh - (Math.min(v, ymax) / ymax) * bh * 1.14 + bh * 0.0;
  const pts = data.map((v, i) => [xs(i), Math.max(T - 4, ys(v))]);
  const path = C.smooth(pts);
  let g = '';
  for (let i = 0; i <= 8; i++) { const y = by + (bh * i) / 8; g += `<line x1="${bx}" x2="${bx + bw}" y1="${y}" y2="${y}" stroke="#d9dde0" stroke-opacity=".5" stroke-dasharray="2 2"/>`; }
  for (let i = 0; i < data.length; i++) g += `<line y1="${by}" y2="${by + bh}" x1="${xs(i)}" x2="${xs(i)}" stroke="#d9dde0" stroke-opacity=".45" stroke-dasharray="2 2"/>`;
  const yl = yLabels ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(v => `<text x="${bx - 8}" y="${by + bh - (v / 9) * bh + 3}" fill="#5c5e66" font-size="7" text-anchor="end">${v}</text>`).join('') : '';
  const xl = data.map((_, i) => `<text x="${xs(i)}" y="${by + bh + 14}" fill="#5c5e66" font-size="7" text-anchor="middle">${i + 1}</text>`).join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="chart">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity=".12"/></linearGradient></defs>
    <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="none" stroke="#c9cdd0" stroke-opacity=".6"/>
    <path d="${path} L${xs(data.length - 1)},${by + bh} L${xs(0)},${by + bh} Z" fill="url(#${id})"/>
    ${g}${yl}${xl}
    <path d="${path}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>
    ${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="2.6" fill="${color}"/>`).join('')}
  </svg>`;
};

/* Scatter (red dots, W1…W49) */
C.scatter = ({ pts, w = 590, h = 190 }) => {
  const L = 30, R = 14, T = 8, B = 22, bw = w - L - R, bh = h - T - B;
  let g = '';
  for (let i = 0; i <= 10; i++) { const y = T + (bh * i) / 10; g += `<line x1="${L}" x2="${L + bw}" y1="${y}" y2="${y}" stroke="#555" stroke-opacity=".5" stroke-dasharray="2 2"/>`; g += `<text x="${L - 8}" y="${y + 3}" fill="#c9cacf" font-size="7" text-anchor="end">${100 - i * 10}</text>`; }
  for (let i = 0; i <= 12; i++) { const x = L + (bw * i) / 12; g += `<line y1="${T}" y2="${T + bh}" x1="${x}" x2="${x}" stroke="#555" stroke-opacity=".5" stroke-dasharray="2 2"/>`; g += `<text x="${x}" y="${T + bh + 13}" fill="#c9cacf" font-size="7" text-anchor="middle">W${1 + i * 4}</text>`; }
  const dots = pts.map(p => `<circle cx="${L + (p[0] * 1.32 / 49) * bw}" cy="${T + bh - (p[2] / 100) * bh}" r="3" fill="#f24040"/>`).join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="100%">${g}<rect x="${L}" y="${T}" width="${bw}" height="${bh}" fill="none" stroke="#666" stroke-opacity=".8"/>${dots}</svg>`;
};

/* Grouped bars GBP/USD */
C.bars = ({ a, b, labels, w = 650, h = 215 }) => {
  const L = 44, R = 20, T = 16, B = 28, bw = w - L - R, bh = h - T - B;
  let g = '';
  [0, 1.25, 2.5, 3.75, 5, 6.25, 7.5, 8.75, 10].forEach(v => { const y = T + bh - (v / 10) * bh; g += `<line x1="${L}" x2="${L + bw}" y1="${y}" y2="${y}" stroke="#777" stroke-opacity=".5" stroke-dasharray="2 2"/><text x="${L - 10}" y="${y + 3}" fill="#d7d8dc" font-size="8" text-anchor="end">${v}</text>`; });
  const step = bw / labels.length;
  let bs = '';
  labels.forEach((m, i) => {
    const cx = L + step * i + step / 2;
    g += `<line y1="${T}" y2="${T + bh}" x1="${cx}" x2="${cx}" stroke="#777" stroke-opacity=".5" stroke-dasharray="2 2"/><text x="${cx}" y="${T + bh + 16}" fill="#f1f1f3" font-size="8.5" text-anchor="middle">${m}</text>`;
    const ha = (a[i] / 10) * bh, hb = (b[i] / 10) * bh;
    bs += `<rect x="${cx - 14}" y="${T + bh - ha}" width="5" height="${ha}" fill="#f0444c"/><rect x="${cx + 4}" y="${T + bh - hb}" width="5" height="${hb}" fill="#8bc34a" opacity=".85"/>`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" width="100%"><rect x="${L}" y="${T}" width="${bw}" height="${bh}" fill="none" stroke="#777" stroke-opacity=".6"/>${g}${bs}</svg>`;
};

/* Two-series performance line (match detail) */
C.perf = ({ w = 670, h = 270 }) => {
  const id = 'p' + (++uid);
  const T = 10, B = 30, bh = h - T - B;
  const A = [0.05, .32, .5, .38, .52, .46, .35, .3, .22, .24, .36, .5, .38, .36, .5, .55, .38, .28, .16, .12, .17, .3, .38, .52, .78, .86, .68, .55, .82, .9, .86, .72, .76, .92, .84, .65, .72, .84, 1];
  const Bv = [.28, .3, .3, .33, .27, .3, .24, .16, .18, .32, .36, .3, .22, .17, .12, .08, .16, .26, .28, .2, .1, .15, .27, .24, .17, .08, .16, .26, .22, .12, .08, .17, .3, .26, .12, .16, .22, .3, .35];
  const mk = arr => arr.map((v, i) => [(i / (arr.length - 1)) * w, T + bh - v * bh * 0.82 - bh * 0.1]);
  const pa = mk(A), pb = mk(Bv);
  const grid = [0, 1, 2, 3, 4, 5].map(i => `<line x1="0" x2="${w}" y1="${T + (bh * i) / 5}" y2="${T + (bh * i) / 5}" stroke="#6b6d74" stroke-opacity=".7" stroke-dasharray="4 4"/>`).join('');
  const lbl = ['0m', '15m', '30m', '45m', '60m', '75m', '90m'].map((t, i) => `<text x="${(i / 6) * (w - 30)}" y="${h - 6}" fill="#9a9ca4" font-size="11">${t}</text>`).join('');
  const area = (p, c, o) => `<path d="${C.smooth(p)} L${w},${T + bh} L0,${T + bh} Z" fill="url(#${id}${c})" opacity="${o}"/>`;
  return `<svg viewBox="0 0 ${w} ${h}" width="100%"><defs>
    <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#39ff14" stop-opacity=".28"/><stop offset="1" stop-color="#39ff14" stop-opacity="0"/></linearGradient>
    <linearGradient id="${id}y" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6b422" stop-opacity=".25"/><stop offset="1" stop-color="#e6b422" stop-opacity="0"/></linearGradient></defs>
    ${grid}${area(pa, 'g', 1)}${area(pb, 'y', 1)}
    <path d="${C.smooth(pb)}" fill="none" stroke="#e6b422" stroke-width="2"/><path d="${C.smooth(pa)}" fill="none" stroke="#39ff14" stroke-width="2"/>${lbl}</svg>`;
};

window.C = C;
