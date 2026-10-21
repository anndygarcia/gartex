# Plaid setup (Sandbox first)

The Plaid Functions are deployed and responding, but they are **inert until
credentials are set**. Everything below happens in Cloudflare's dashboard, not
in chat — do not paste any secret into a conversation.

## Why Link, not a bank login

The bank password is typed into **Plaid's hosted iframe**, never into this code
or Gartex's server. After you consent, Plaid hands back a token and this site
reads *tokenized* data. That is the entire point of using Plaid instead of
storing credentials — do not "simplify" it later by adding a direct bank login.

## 1. Create the Plaid app

1. Sign up at <https://dashboard.plaid.com> (developer tier is free).
2. Dashboard → **Developers → Create app**, name it e.g. `Gartex-Hermes`.
3. Open the app → **Settings / Keys**. Copy:
   - **Client ID**
   - **Sandbox secret** (the one literally labelled Sandbox — the production
     secret will not work against Sandbox and vice versa)

## 2. Set Cloudflare Pages environment variables

Cloudflare dashboard → Workers & Pages → `gartex-construction` →
**Settings → Environment variables → Production** → Add:

| Variable | Value |
|---|---|
| `PLAID_CLIENT_ID` | from step 1 |
| `PLAID_SECRET` | the **Sandbox** secret |
| `PLAID_ADMIN_TOKEN` | a password you invent here (see below) |
| `PLAID_ENV` | `sandbox` |

`PLAID_ADMIN_TOKEN` is **not** a Plaid credential — it's ours. It gates every
endpoint so that anyone who guesses `/api/plaid/accounts` cannot read your
balances. Invent a long random string; the test harness asks for it.

## 3. Bind a KV namespace (required — do not skip)

The `access_token` is long-lived. Cloudflare Function instances are ephemeral
and horizontally scaled, so it cannot live in a module variable. It must go in
KV.

Dashboard → **Storage & Databases → KV → Create a namespace**, name it
`PLAID_KV`. Then in the project's **Settings → Functions → Bindings**, add a
**KV namespace** binding with variable name **`PLAID_KV`** pointing at it.

> The current API token cannot create KV namespaces (it returns
> `Authentication error` on the KV API), so this one step is manual.

**After binding, push a commit** — new bindings only apply to the next deploy.
`echo "<!-- plaid kv bound -->" >> README.md && git add -A && git commit -m "bind PLAID_KV" && git push origin main`

Without KV bound, `exchange.js` will say so explicitly rather than pretending
it saved the token.

## 4. Run the Link flow

Open **`https://gartex-construction.com/tools/plaid-test`** and paste your
`PLAID_ADMIN_TOKEN` into the box. It is `noindex` and linked from nowhere.

Click **Connect a bank** → pick a sandbox institution → Plaid lists test
credentials (typically `user_good` / `pass_good`). Balances and transactions
that come back are **fake sandbox data**, not real accounts.

## Troubleshooting

| Symptom | Cause |
|---|---|
| HTTP 503 `missing PLAID_ADMIN_TOKEN` | env var not set, or no deploy since setting it |
| HTTP 503 `missing PLAID_CLIENT_ID / PLAID_SECRET` | wrong var name, or set on Preview only |
| `INVALID_API_KEYS` | Sandbox secret pasted where production expected, or vice versa — check `PLAID_ENV` matches the secret you copied |
| `PRODUCT_NOT_READY` | transactions still settling right after Link — wait ~30s and retry |
| `ITEM_LOGIN_REQUIRED` | the institution needs re-auth; re-run Link in update mode |
| `accounts.js` says no KV bound | binding name is not exactly `PLAID_KV`, or no deploy since binding |

## What is deliberately NOT here

There is **no transfer / move-money endpoint**. Read access only. If moving
money is ever added it must require an explicit per-transfer approval step —
never a single call an agent can fire on its own.

Going from Sandbox to real accounts requires Plaid's Production approval
(a form in the dashboard, typically several days), and real bank credentials
then flow through Plaid's real Link UI — not the sandbox one.