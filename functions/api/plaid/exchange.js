// Cloudflare Pages Function: POST /api/plaid/exchange
//
// The browser hands back the ephemeral public_token that Link produced. Swap
// it for a long-lived access_token and store it in KV.
//
// This is the only place the access_token is ever written, and the token is
// never echoed back to the client — the response says where it was stored.

import {
  json, corsHeaders, preflight, requireAdmin,
  plaidFetch, plaidErrorMessage, getStoredItem, putStoredItem,
} from '../../_lib/plaid.js';

export async function onRequestOptions({ request }) {
  return preflight(request);
}

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400, corsHeaders(request));
  }

  const publicToken = String(body.public_token || '').trim();
  if (!publicToken) {
    return json({ error: 'Missing public_token.' }, 400, corsHeaders(request));
  }
  // Cheap shape check — catches a truncated or HTML error page before we send
  // it to Plaid and get back an opaque failure.
  if (!publicToken.startsWith('public-')) {
    return json({
      error: 'That does not look like a Plaid public_token.',
    }, 400, corsHeaders(request));
  }

  const result = await plaidFetch(env, '/item/public_token/exchange', {
    public_token: publicToken,
  });

  if (!result.ok) {
    return json({
      error: 'Could not exchange the Plaid public_token.',
      detail: plaidErrorMessage(result),
    }, 502, corsHeaders(request));
  }

  const { access_token, item_id } = result.data;
  const existing = await getStoredItem(env);
  const record = {
    item_id,
    access_token,
    // Keep the previous token around so a re-link does not silently orphan it.
    previous_item_id: existing && existing.item_id !== item_id
      ? existing.item_id
      : existing && existing.previous_item_id || null,
    linked_at: new Date().toISOString(),
  };

  const stored = await putStoredItem(env, record);

  return json({
    ok: true,
    item_id,
    stored,
    // Be explicit when there is no KV: saying "linked" while the token was
    // dropped on the floor is the failure mode worth engineering against.
    warning: stored ? null
      : 'Item linked, but PLAID_KV is not bound — the access_token was NOT ' +
        'persisted and /api/plaid/accounts will not be able to use it. Bind a ' +
        'KV namespace named PLAID_KV in CF Pages settings, then re-link.',
  }, 200, corsHeaders(request));
}