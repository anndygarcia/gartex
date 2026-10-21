// Shared helpers for the Plaid Functions.
//
// This file lives in functions/_lib/ rather than functions/api/ on purpose:
// Cloudflare Pages only auto-routes files under functions/api/ to HTTP
// handlers, so anything in api/ becomes a public endpoint by accident.
// _lib/ is bundled into every function that imports it and is never routable.
//
// Storage model: the access_token returned by /item/public_token/exchange is
// long-lived and MUST NOT be kept in a module-level variable or an env var.
// Cloudflare Functions instances are ephemeral and horizontally scaled, so
// in-memory state does not survive between requests. The correct home is a KV
// namespace bound as PLAID_KV. Until that binding exists, getStoredItem()
// reports `stored: false` and the endpoints stay in "not configured" mode
// rather than pretending a token was saved.

const PLAID_VERSION = '2020-09-14';

// Sandbox vs production are different hosts AND different secrets. Picking the
// wrong pair produces INVALID_CREDENTIALS errors that look like a typo.
const HOSTS = {
  sandbox: 'https://sandbox.plaid.com',
  production: 'https://production.plaid.com',
};

export function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Responses here are financial data. Never let a shared cache hold them.
      'cache-control': 'private, no-store',
      ...headers,
    },
  });
}

export function corsHeaders(request) {
  const origin = request.headers.get('origin') || '';
  // Same-origin only. These endpoints are authenticated (see requireAdmin),
  // so we echo back the caller's own origin rather than '*'.
  const allow = origin && /^https:\/\/(www\.)?gartex-construction\.com$/.test(origin)
    ? origin
    : null;
  const h = {};
  if (allow) {
    h['access-control-allow-origin'] = allow;
    h['access-control-allow-methods'] = 'POST, OPTIONS';
    h['access-control-allow-headers'] = 'content-type';
    h['access-control-max-age'] = '86400';
    h.vary = 'Origin';
  }
  return h;
}

export function preflight(request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function getPlaidConfig(env) {
  const clientId = env.PLAID_CLIENT_ID;
  const secret = env.PLAID_SECRET;
  const envName = (env.PLAID_ENV || 'sandbox').toLowerCase();
  const host = HOSTS[envName];
  return {
    clientId,
    secret,
    envName,
    host,
    configured: Boolean(clientId && secret && host),
  };
}

/**
 * Gate every endpoint behind a shared secret.
 *
 * These functions expose bank balances and transactions. Plaid's own Link flow
 * authenticates the END USER, but that is not authorization for US to call
 * these endpoints later on their behalf — anyone who discovers the URL could
 * read their balances. PLAID_ADMIN_TOKEN is the second gate: a secret Anndy
 * sets as a CF Pages env var and sends in the X-Plaid-Token header.
 *
 * Constant-time-ish comparison; the values are not length-secret.
 */
export function requireAdmin(request, env) {
  const expected = env.PLAID_ADMIN_TOKEN;
  if (!expected) {
    return json({
      error: 'Plaid admin not configured (missing PLAID_ADMIN_TOKEN).',
    }, 503, corsHeaders(request));
  }
  const provided = request.headers.get('x-plaid-token') || '';
  if (provided.length !== expected.length ||
      !provided.split('').reduce((eq, ch, i) => eq && ch === expected[i], true)) {
    return json({ error: 'Unauthorized.' }, 401, corsHeaders(request));
  }
  return null;
}

/**
 * Thin Plaid REST client. Plaid accepts client_id/secret in the body, which
 * keeps the credentials out of headers that might get logged upstream.
 */
export async function plaidFetch(env, path, body) {
  const cfg = getPlaidConfig(env);
  if (!cfg.configured) {
    return { ok: false, status: 503, error: {
      error_type: 'CONFIG_ERROR',
      error_message: 'Missing PLAID_CLIENT_ID / PLAID_SECRET.',
    } };
  }
  let res;
  try {
    res = await fetch(`${cfg.host}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: cfg.clientId,
        secret: cfg.secret,
        ...body,
      }),
    });
  } catch (e) {
    return { ok: false, status: 502, error: {
      error_type: 'NETWORK_ERROR',
      error_message: `Could not reach Plaid: ${e && e.message}`,
    } };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, status: res.status, error: data };
  }
  return { ok: true, status: res.status, data };
}

export function plaidErrorMessage(result) {
  const e = result && result.error;
  if (!e) return 'Plaid request failed.';
  // Surface Plaid's own error_code — it is the only useful signal when
  // diagnosing (INVALID_API_KEYS, PRODUCT_NOT_READY, ITEM_LOGIN_REQUIRED, ...).
  return [e.error_code || e.error_type, e.error_message].filter(Boolean).join(': ');
}

export async function getStoredItem(env) {
  if (!env.PLAID_KV) return null;
  try {
    const raw = await env.PLAID_KV.get('item', 'json');
    return raw || null;
  } catch {
    return null;
  }
}

export async function putStoredItem(env, item) {
  if (!env.PLAID_KV) return false;
  try {
    await env.PLAID_KV.put('item', JSON.stringify(item));
    return true;
  } catch {
    return false;
  }
}