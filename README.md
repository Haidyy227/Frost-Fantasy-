# Frost Fantasy — local full version

Points-based sportsbook, fantasy and lottery for Niger. Zero dependencies: you only need **Node 18+**.

```bash
node server/index.js        # then open http://localhost:5173
npm test                    # 15 API tests (money paths, geo lock, fairness)
npm run reset               # wipe data/db.json and start fresh
```

| Account | Email | Password |
|---|---|---|
| Player (20,000 demo points) | player@frost.local | Player123! |
| Admin | admin@frost.local | Admin123! |

The login page has "fill player / fill admin" links and a **dev location switcher** so you can see the country lock.

## How the money works
- **1 point = 1 XOF.** Players buy points through mobile money. A **deposit fee** (default 3%) is taken from what they pay: pay 10,000 XOF → 9,700 points. The quote is shown before paying.
- Withdrawals: points are held immediately, admin approves, player gets XOF minus the withdrawal fee (default 2%). Rejecting refunds the points.
- **Turnover rule** (anti-laundering): deposited points must be played once before a withdrawal.
- Every change goes through an append-only ledger; the admin dashboard checks that every balance equals its ledger.
- Fees, limits, countries, payment methods: **Admin → Settings**.
- Payment methods in the list: Airtel, Orange, Moov, Wave, NITA, Amana (+ bank card, off by default). Locally they are **mock**: after "Pay", click *simulate approved on phone* in the wallet history.

## Odds (you control them)
**Admin → Odds Desk**: add matches by hand, import a CSV list, edit odds, set live / close betting, enter result (pays winners automatically) or void (refunds). Odds are locked into each bet when placed. Margin is shown per match.

An AI agent or script can upload the day's odds as **drafts** (players never see drafts until you publish):
```bash
curl -X POST http://localhost:5173/api/agent/fixtures \
  -H "Authorization: Bearer <token from Odds Desk → Agent API>" -H "Content-Type: application/json" \
  -d '{"fixtures":[{"league":"England - Premier League","home":"Arsenal","away":"Chelsea","kickoff":"2026-11-02T18:00:00Z","odds":{"h":1.95,"d":3.5,"a":3.9}}]}'
```

## Products
- **Sportbook**: 1X2 singles and accumulators, stake/payout caps.
- **Fantasy line-up (More/Less)**: Light Pay ×1.8 (4–6 picks, ≥4 right), High Pay ×10 (2–6 picks, all right). Admin adds props and enters actual stats.
- **Teams & contests**: 11 players within budget + captain (×2). Admin enters player points; top 3 share the pool 50/30/20 after a 10% rake.
- **Predict & Win**: free picks, fixed reward.
- **Lottery**: pick 3 of 54, 500 pts per ticket; 3 matches ×200, 2 matches ×5. **Provably fair**: the seed's SHA-256 is published before sales, revealed after the draw; players' browsers re-check it. Admin schedules and conducts draws.

## Location lock
Server-side, on every API call: country must be in the allowed list (default **NE only**, change in Settings), sign-up needs a phone number from an allowed country, 18+ check. Blocked = HTTP 451 and a "not available" page. Admins bypass. In production the country comes from your CDN header (Cloudflare `CF-IPCountry`) and **unknown = blocked**; set `NODE_ENV=production`. IP geolocation can be bypassed with a VPN, which is why the phone-number and mobile-money-number checks matter.

## Going live (what is NOT done)
1. Replace the mock in `server/lib/payments.js` with a real aggregator/operator API; point its webhook at `POST /api/webhooks/payment` (HMAC-SHA256 of `reference|status`, secret in Settings).
2. Swap the JSON store (`server/lib/db.js`) for Postgres, run behind HTTPS and a CDN.
3. **Legal first.** Real-money gambling in Niger is, as far as research showed, a state monopoly (LONANI) with no private online licence route; buying points with money is very likely still gambling. This is unverified and not legal advice. Get a Niger gaming lawyer's written opinion and the licence/partnership route before taking any real money.
4. Responsible-gaming tools (self-exclusion, limits), KYC for withdrawals, real support channel.

## Layout
`server/` API (routes/, lib/) · `public/` the app (hash-routed, no build) · `test/api.test.js` · `data/` JSON database (created on first run)
