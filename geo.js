'use strict';
// Geo restriction. Production: trust the CDN country header (Cloudflare CF-IPCountry) and FAIL CLOSED.
// Local dev: a cookie lets you simulate where you are so you can see the lock in action.
const db = require('./db');

const DEV = process.env.NODE_ENV !== 'production';

// Phone calling codes -> ISO country (only what we need; extend as countries are enabled)
const DIAL = { '227': 'NE', '226': 'BF', '223': 'ML', '221': 'SN', '225': 'CI', '228': 'TG', '229': 'BJ', '234': 'NG', '233': 'GH', '235': 'TD', '237': 'CM', '33': 'FR', '1': 'US', '44': 'GB' };
const NAMES = { NE: 'Niger', BF: 'Burkina Faso', ML: 'Mali', SN: 'Senegal', CI: "Côte d'Ivoire", TG: 'Togo', BJ: 'Benin', NG: 'Nigeria', GH: 'Ghana', TD: 'Chad', CM: 'Cameroon', FR: 'France', US: 'United States', GB: 'United Kingdom' };

function allowed() { return (db.data.settings.allowedCountries || ['NE']).map(c => c.toUpperCase()); }

function detect(req) {
  if (DEV) {
    const m = /(?:^|;\s*)ff_geo=([A-Za-z]{2})/.exec(req.headers.cookie || '');
    return m ? m[1].toUpperCase() : (process.env.FF_DEV_COUNTRY || 'NE');
  }
  const h = req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || '';
  return /^[A-Za-z]{2}$/.test(h) ? h.toUpperCase() : null; // unknown -> null -> blocked
}

function status(req) {
  const country = detect(req);
  const ok = !!country && allowed().includes(country);
  return { country, countryName: NAMES[country] || country, allowed: ok, allowedCountries: allowed().map(c => ({ code: c, name: NAMES[c] || c })), dev: DEV };
}

function phoneCountry(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  if (!digits.startsWith('+')) return null;
  const n = digits.slice(1);
  for (const len of [3, 2, 1]) { const c = DIAL[n.slice(0, len)]; if (c) return c; }
  return null;
}
function normalizePhone(phone) {
  let p = String(phone || '').replace(/[^\d+]/g, '');
  if (p && !p.startsWith('+')) p = '+227' + p.replace(/^0+/, ''); // default: Niger
  return p;
}

module.exports = { detect, status, allowed, phoneCountry, normalizePhone, NAMES, DEV };
