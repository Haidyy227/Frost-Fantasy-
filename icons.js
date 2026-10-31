/* Inline SVG icon set (stroke icons, currentColor) */
const SVGI = (body, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${extra}>${body}</svg>`;

const I = {
  dashboard: SVGI('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
  sportbook: SVGI('<circle cx="12" cy="12" r="9"/><path d="M5.5 5.5c3 2.5 3.5 8.5 0 13M18.5 5.5c-3 2.5-3.5 8.5 0 13M3.2 9.5c4 .5 8 3 9.5 9.3M20.8 14.5c-4-.5-8-3-9.5-9.3"/>'),
  fantasy: SVGI('<path d="M4 7h10M4 12h10M4 17h6"/><path d="M18 18V7m0 0-3 3m3-3 3 3"/>'),
  lottery: SVGI('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M12 3.5c3 0 5.5 1.7 5.5 4.2M20 14c-1.2 2.7-3.7 3.5-6 2.7M5 15.5c-.5-3 1-5.5 3.5-6.5"/>'),
  wallet: SVGI('<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M16 14.5h2.2"/><path d="M6 6l9-3 1 3"/>'),
  logout: SVGI('<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 8l-4 4 4 4M6 12h10" transform="translate(-1 0)"/>'),
  search: SVGI('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
  bell: SVGI('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
  user: SVGI('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5z"/>'),
  chev: SVGI('<path d="m6 9 6 6 6-6"/>'),
  chevR: SVGI('<path d="m9 5 7 7-7 7"/>'),
  chevL: SVGI('<path d="m15 5-7 7 7 7"/>'),
  soccer: SVGI('<circle cx="12" cy="12" r="9.5"/><path d="m12 7.5 3.8 2.8-1.5 4.4H9.7l-1.5-4.4z"/><path d="M12 7.5V2.6M15.8 10.3l4.4-1.6M14.3 14.7l2.8 3.8M9.7 14.7l-2.8 3.8M8.2 10.3 3.8 8.7"/>'),
  basket: SVGI('<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5v19M5 5c3 3 3 11 0 14M19 5c-3 3-3 11 0 14"/>'),
  calendar: SVGI('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8.5 14h.01M12 14h.01M15.5 14h.01M8.5 17h.01M12 17h.01"/>'),
  closeC: SVGI('<circle cx="12" cy="12" r="9.5"/><path d="m8.5 8.5 7 7m0-7-7 7"/>'),
  check: SVGI('<path d="m5 12.5 4.5 4.5L19 7.5" stroke-width="2.4"/>'),
  upLeft: SVGI('<path d="M17 17 7 7M7 15V7h8" stroke-width="2"/>'),
  downRight: SVGI('<path d="M7 7l10 10M17 9v8H9" stroke-width="2"/>'),
  pencil: SVGI('<path d="m15 5 4 4L8 20H4v-4z" fill="currentColor" stroke-width="1"/>'),
  filter: SVGI('<path d="M4 7h16M7 12h10M10 17h4"/>'),
  bookmark: SVGI('<path d="M6.5 4h11v16.5L12 16l-5.5 4.5z"/>'),
  bookmarkF: SVGI('<path d="M6.5 4h11v16.5L12 16l-5.5 4.5z" fill="currentColor"/>'),
  medal: SVGI('<path d="M12 2.5 19.5 5v6c0 4.5-3 8.2-7.5 10C7.500 19.200 4.500 15.500 4.500 11V5z"/><path d="m12 8 1.200 2.500 2.700.4-2 1.900.5 2.700-2.400-1.300-2.400 1.300.5-2.700-2-1.900 2.700-.4z" fill="currentColor" stroke-width="1"/>'),
  dots: `<svg viewBox="0 0 3 14" fill="currentColor"><circle cx="1.5" cy="2" r="1.1"/><circle cx="1.5" cy="7" r="1.1"/><circle cx="1.5" cy="12" r="1.1"/></svg>`,
  plus: SVGI('<path d="M12 5v14M5 12h14"/>'),
  info: SVGI('<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5v.01" stroke-width="2.2"/>'),
  cap: SVGI('<circle cx="12" cy="12" r="9"/><path d="M13.500 9a3 3 0 1 0 0 6"/>'),
  ticket: `<svg viewBox="0 0 70 70"><g transform="rotate(-32 35 35)"><rect x="8" y="18" width="54" height="34" rx="5" fill="#f5b53d" stroke="#d98914" stroke-width="2"/><rect x="13" y="23" width="44" height="24" rx="3" fill="none" stroke="#fff6d8" stroke-width="1.5" stroke-dasharray="3 2"/><text x="35" y="34" font-size="7" font-weight="700" fill="#fff" text-anchor="middle" font-family="Inter">ADMIT</text><text x="35" y="43" font-size="7" font-weight="700" fill="#fff" text-anchor="middle" font-family="Inter">ONE</text></g></svg>`,
};
window.I = I;
