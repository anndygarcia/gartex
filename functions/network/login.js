// GET  /network/login  →  login form
// POST /network/login  →  verify the admin token, set a signed session cookie
//
// The token is compared with a timing-safe compare. On success we set an
// HttpOnly, Secure, SameSite=Strict cookie signed with a key derived from
// NETWORK_ADMIN_TOKEN — the raw token itself is never used as a cookie
// value and never appears in the browser.

import {
  json,
  checkAdminToken,
  issueSessionCookie,
  clearSessionCookie,
} from '../_lib/network-auth.js';
import { loginHtml } from '../_lib/network-html.js';

function safeNext(next) {
  // Only allow same-origin relative paths — blocks open-redirect tricks.
  if (typeof next !== 'string') return '/network/';
  if (!next.startsWith('/') || next.startsWith('//')) return '/network/';
  return next;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get('next'));

  if (!env.NETWORK_ADMIN_TOKEN) {
    return new Response(
      loginHtml(next).replace(
        '<p>Internal tool. Enter the administrator token to continue.</p>',
        '<div class="err">Server not configured: NETWORK_ADMIN_TOKEN is not set in Cloudflare Pages environment variables.</div>',
      ),
      { status: 503, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
    );
  }

  return new Response(loginHtml(next), {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow, noarchive',
    },
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.NETWORK_ADMIN_TOKEN) {
    return json({ error: 'Server not configured (missing NETWORK_ADMIN_TOKEN).' }, 503);
  }

  let submitted = '';
  let next = '/network/';
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const body = await request.json();
      submitted = body.token || '';
      next = safeNext(body.next);
    } else {
      const form = await request.formData();
      submitted = form.get('token') || '';
      next = safeNext(form.get('next'));
    }
  } catch {
    return json({ error: 'Bad request.' }, 400);
  }

  if (!checkAdminToken(submitted, env)) {
    // Small delay blunts brute-force attempts.
    await new Promise((r) => setTimeout(r, 600));
    if (request.headers.get('accept')?.includes('application/json')) {
      return json({ error: 'Incorrect token.' }, 401);
    }
    return new Response(
      loginHtml(next).replace(
        '<p>Internal tool. Enter the administrator token to continue.</p>',
        '<div class="err">Incorrect token. Try again.</div>',
      ),
      { status: 401, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
    );
  }

  return new Response(null, {
    status: 302,
    headers: {
      location: next,
      'set-cookie': (await issueSessionCookie(env))[0],
      'cache-control': 'no-store',
    },
  });
}
