'use strict';
class HttpError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; }
}
const bad = (m, x) => new HttpError(400, m, x);

function createRouter() {
  const routes = [];
  const add = (method) => (pattern, ...handlers) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    routes.push({ method, re, keys, handlers });
  };
  return {
    get: add('GET'), post: add('POST'), put: add('PUT'), patch: add('PATCH'), del: add('DELETE'),
    match(method, pathname) {
      for (const r of routes) {
        if (r.method !== method) continue;
        const m = pathname.match(r.re);
        if (m) { const params = {}; r.keys.forEach((k, i) => params[k] = decodeURIComponent(m[i + 1])); return { handlers: r.handlers, params }; }
      }
      return null;
    }
  };
}

function readBody(req, limit = 1e6) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new HttpError(413, 'Payload too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (e) { reject(bad('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

// very small in-memory rate limiter
const hits = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) throw new HttpError(429, 'Too many attempts, try again later');
  arr.push(now); hits.set(key, arr);
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some(t => now - t < 3600e3)) hits.delete(k); }, 600e3).unref();

const int = (v, name = 'value') => { const n = Number(v); if (!Number.isInteger(n)) throw bad(`${name} must be a whole number`); return n; };
const str = (v, name = 'value', max = 200) => { if (typeof v !== 'string' || !v.trim()) throw bad(`${name} is required`); if (v.length > max) throw bad(`${name} too long`); return v.trim(); };

module.exports = { HttpError, bad, createRouter, readBody, rateLimit, int, str };
