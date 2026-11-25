# Subcontractor Network — deployment & operations

The subcontractor network is a separate, auth-gated surface on the same
Cloudflare Pages project as the main site. It has its own routes so the
public marketing site is unaffected.

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/network/` | Auth-gated | Internal dashboard: leads, trades, stats, activity log |
| `/network/login` | Public | Admin-token sign-in |
| `/network/logout` | Auth-gated | Clears the session cookie |
| `/apply` | **Public** | Bilingual intake form (`?lang=es` for Spanish) |
| `/api/network/leads` | Auth-gated | Lead list (JSON) |
| `/api/network/stats` | Auth-gated | Aggregations by trade/status/language |
| `/api/network/log` | Auth-gated | Activity feed |
| `/api/network/intake` | **Public** | Intake submission (writes a lead) |
| `/api/network/file/<name>` | Auth-gated | Same-origin proxy for a stored attachment (COI / W9). Attaches the store secret server-side so the browser link needs no header |

`/network/*` and `/apply` are excluded in `robots.txt` and carry
`noindex`. The intake form is intentionally public and linkable — it is
the way contractors apply to join the network.

## Environment variables (Production)

Set these in **Workers & Pages → gartex-construction → Settings →
Environment variables → Production**:

| Variable | Type | Notes |
|---|---|---|
| `LEADS_API_URL` | Plain | Base URL of the local lead store, published through the Cloudflare Tunnel (`https://leads.gartex-construction.com`). The tunnel hostname is not a secret. |
| `LEADS_API_SECRET` | Secret | Shared secret sent as the `X-Leads-Secret` header on every store request. This is the actual gate. |
| `NETWORK_ADMIN_TOKEN` | Secret | The password for `/network/login`. The raw token is never stored in the cookie — only an HMAC of it |

The lead store itself is a SQLite file on Anndy's Mac
(`~/Gartex-Subcontractor-DB/leads.db`), served by `engine/local_api.py` on
`127.0.0.1:8788` and published through the tunnel. It is **not** a hosted
SaaS. The old Airtable path is retired; `AIRTABLE_PAT` and
`AIRTABLE_BASE_ID` must not be set.

Until `NETWORK_ADMIN_TOKEN` is set, `/network/login` returns
`503 Server not configured`. That is the healthy "not wired yet" signal.

**Newly-bound variables do not take effect until the next deploy.** Push a
commit after adding them.

## Authentication model

`/network/*` uses an HMAC-signed cookie, not a session store:

1. `POST /network/login` compares the submitted token to
   `NETWORK_ADMIN_TOKEN` in constant time.
2. On success it sets a cookie holding `expiry.hmac(expiry)` — never the
   raw token.
3. Each protected route re-derives the HMAC with `NETWORK_ADMIN_TOKEN`
   and rejects a mismatch or a tampered expiry.

The cookie is `HttpOnly`, `Secure`, and `SameSite=Strict`.

**Long-term replacement:** a Cloudflare Access policy (Zero Trust → Access →
Applications) in front of `/network/*`. The Access API is not reachable
with the project's API token, so that policy has to be created in the
dashboard. Once it exists, drop the token gate.

## Lead store schema

The store is the SQLite file `~/Gartex-Subcontractor-DB/leads.db`. The
site reads and writes it through the local API (`engine/local_api.py`),
never directly.

`Leads` table fields: `Name`, `Trades` (multi-select), `Status`, `Source`,
`Language`, `Source Listing URL`, `Seller Profile URL`, `Specialty`,
`Intake Token`, `Notes`, `Lead Score`, `Phone`, `Email`, `Insurance`,
`Registered Entity`, `Capacity`, `Service Area`, `Travel Radius`,
`Last Contacted`, `Next Follow-up`.

`Activity` table fields: `Type`, `Detail`, `Lead`, `At`.

**One seller = one lead.** The dedupe key is the seller's profile URL when
available, else the normalized display name, else the listing item id. A
contractor who relists the same service every week stays a single lead
with multiple trades.

## Local testing

```bash
cd engine
node local_test.mjs            # 66 checks against the real Pages Functions
```

`local_test.mjs` runs the actual `functions/` handlers against a fake
local lead store (the same HTTP API `leadstore.js` calls in production),
so auth, validation, and the bilingual form are all exercised without
touching production or the real tunnel.

## Never commit secrets

This repository is **public**. No token, secret, base id, or database
file may ever be committed. Secrets live only in Cloudflare Pages
environment variables and in the local `~/.hermes/.env` (mode 600). The
SQLite lead store lives outside the repo at
`~/Gartex-Subcontractor-DB/leads.db`.
