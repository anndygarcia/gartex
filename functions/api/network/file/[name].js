// GET /api/network/file/<stored-name>  →  download a lead document.
//
// The lead store keeps uploaded COI / W-9 / photos on Anndy's Mac and
// exposes them at /api/network/attachment/<stored-name> — but that
// endpoint requires the X-Leads-Secret header, and a plain <a href> in the
// dashboard cannot send one.
//
// So the SITE proxies the download: the browser hits this same-origin
// route (carrying its own session cookie), this function authenticates
// the caller, and the secret is attached server-side. The lead store's
// secret never reaches the browser, and the dashboard never has to know
// where the files actually live.
//
// The <stored-name> is "<8 hex chars>_<sanitized original name>". The
// lead store validates that shape too, but it is checked here as well so
// a hostile name never even leaves the edge.

import { requireAuth } from '../../_lib/network-auth.js';

const STORED_NAME = /^[0-9a-f]{8}_[A-Za-z0-9._-]{1,120}$/;

const CONTENT_TYPES = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  txt: 'text/plain; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function contentTypeFor(storedName) {
  const original = String(storedName).split('_').slice(1).join('_');
  const ext = original.includes('.')
    ? original.split('.').pop().toLowerCase()
    : '';
  return CONTENT_TYPES[ext] || 'application/octet-stream';
}

export async function onRequestGet({ request, env, params }) {
  const denial = await requireAuth(request, env);
  if (denial) return denial;

  if (!env.LEADS_API_URL || !env.LEADS_API_SECRET) {
    return new Response(
      JSON.stringify({ error: 'Lead store not configured (missing LEADS_API_URL / LEADS_API_SECRET).' }),
      { status: 503, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } },
    );
  }

  const stored = params && params.name ? decodeURIComponent(params.name) : '';
  if (!STORED_NAME.test(stored)) {
    return new Response(JSON.stringify({ error: 'not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const base = String(env.LEADS_API_URL).replace(/\/+$/, '');
  const url = `${base}/api/network/attachment/${encodeURIComponent(stored)}`;

  let res;
  try {
    res = await fetch(url, { headers: { 'X-Leads-Secret': env.LEADS_API_SECRET } });
  } catch (e) {
    return new Response(JSON.stringify({ error: `lead store unreachable: ${e.message}` }), {
      status: 502,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  if (!res.ok) {
    return new Response(JSON.stringify({ error: 'not found' }), {
      status: res.status === 404 ? 404 : 502,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const original = stored.split('_').slice(1).join('_') || stored;
  return new Response(res.body, {
    status: 200,
    headers: {
      'content-type': contentTypeFor(stored),
      'content-disposition': `inline; filename="${original.replace(/"/g, '')}"`,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
