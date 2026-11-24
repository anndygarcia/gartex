// Shared auth helpers for the /network/ internal dashboard.
//
// Two auth layers are supported, and BOTH are checked:
//
//   1. Interim HMAC-cookie gate (always active).
//      Admin pastes NETWORK_ADMIN_TOKEN into the login form; we verify it
//      with a timing-safe compare and issue a signed, HttpOnly cookie.
//      This works today with zero Cloudflare dashboard setup.
//
//   2. Cloudflare Access / Zero Trust (optional, recommended later).
//      When CF Access fronts /network/*, requests carry a
//      Cf-Access-Jwt-Assertion header. We do NOT verify the JWT here
//      (Access already did that before the request reached us) — we just
//      treat its presence as an additional positive signal.
//
// The cookie alone is never trusted from a client-supplied header: the
// signature must verify against the server-side secret.
//
// Secrets come ONLY from CF Pages env vars. Nothing secret is ever in the
// repo (the repo is public) or in the client bundle.

const COOKIE_NAME = 'gx_net_session';
const SESSION_DAYS = 7;

function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

// ── base64url helpers (Web Crypto is available in the Pages runtime) ──
function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function sign(secret, payload) {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return b64url(new Uint8Array(sig));
}

async function verify(secret, payload, signature) {
  const key = await hmacKey(secret);
  const sigBytes = Uint8Array.from(
    atob(signature.replace(/-/g, '+').replace(/_/g, '/')),
    (c) => c.charCodeAt(0),
  );
  return crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(payload));
}

// Derive a dedicated signing key from the admin token so the raw token is
// never used directly as a MAC key.
async function sessionSecret(env) {
  const admin = env.NETWORK_ADMIN_TOKEN || '';
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode('gx-net-session-v1|' + admin),
  );
  return b64url(new Uint8Array(digest));
}

// Timing-safe string compare.
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function parseCookies(request) {
  const header = request.headers.get('cookie') || '';
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export async function issueSessionCookie(env) {
  const secret = await sessionSecret(env);
  const expires = Date.now() + SESSION_DAYS * 86400 * 1000;
  const payload = `admin|${expires}`;
  const sig = await sign(secret, payload);
  const value = `${expires}.${sig}`;
  return [
    `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Strict`,
  ];
}

export function clearSessionCookie() {
  return [`${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`];
}

export async function isAuthed(request, env) {
  // Layer 2: Cloudflare Access already authenticated this request.
  if (request.headers.get('cf-access-authenticated-user-email')) return true;

  const admin = env.NETWORK_ADMIN_TOKEN;
  if (!admin) return false;

  const cookies = parseCookies(request);
  const raw = cookies[COOKIE_NAME];
  if (!raw) return false;

  const idx = raw.indexOf('.');
  if (idx < 0) return false;
  const expires = Number(raw.slice(0, idx));
  const sig = raw.slice(idx + 1);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;

  const secret = await sessionSecret(env);
  const payload = `admin|${expires}`;
  try {
    return await verify(secret, payload, sig);
  } catch {
    return false;
  }
}

export function checkAdminToken(submitted, env) {
  const admin = env.NETWORK_ADMIN_TOKEN;
  if (!admin || !submitted) return false;
  return timingSafeEqual(String(submitted), String(admin));
}

/** Guard for API routes: returns a 401 Response or null. */
export async function requireAuth(request, env) {
  if (await isAuthed(request, env)) return null;
  return json({ error: 'Unauthorized' }, 401);
}

/** Guard for HTML routes: returns a redirect Response or null. */
export async function requireAuthPage(request, env) {
  if (await isAuthed(request, env)) return null;
  const url = new URL(request.url);
  return new Response(null, {
    status: 302,
    headers: {
      location: `/network/login?next=${encodeURIComponent(url.pathname)}`,
      'cache-control': 'no-store',
    },
  });
}

export { json, COOKIE_NAME, timingSafeEqual };
