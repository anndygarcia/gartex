// Cloudflare Pages Function: POST /api/plaid/accounts
//
// Reads the linked item: account list with balances, plus recent transactions.
// Read-only — there is deliberately no transfer/move-money path in this file.
// Moving money must never be a single unaudited call; if that is ever built,
// it needs an explicit per-transfer approval step, not an endpoint.

import {
  json, corsHeaders, preflight, requireAdmin,
  plaidFetch, plaidErrorMessage, getStoredItem,
} from '../../_lib/plaid.js';

export async function onRequestOptions({ request }) {
  return preflight(request);
}

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const days = Math.min(Math.max(parseInt(body.days, 10) || 30, 1), 180);

  const item = await getStoredItem(env);
  if (!item || !item.access_token) {
    return json({
      error: 'No linked Plaid item found.',
      detail: env.PLAID_KV
        ? 'Run the Link flow (/api/plaid/link then /api/plaid/exchange) first.'
        : 'PLAID_KV is not bound to this project, so no access_token can be ' +
          'stored. Bind a KV namespace named PLAID_KV in CF Pages settings, ' +
          'push a commit, then re-link.',
    }, 409, corsHeaders(request));
  }

  const accountsResult = await plaidFetch(env, '/accounts/get', {
    access_token: item.access_token,
  });
  if (!accountsResult.ok) {
    return json({
      error: 'Could not read accounts.',
      // ITEM_LOGIN_REQUIRED is the common one: the bank needs the user to
      // re-authenticate through Link's update mode. Say so plainly.
      detail: plaidErrorMessage(accountsResult),
      needs_relink: String(accountsResult.error?.error_code || '')
        .includes('ITEM_LOGIN_REQUIRED'),
    }, 502, corsHeaders(request));
  }

  const accounts = (accountsResult.data.accounts || []).map(a => ({
    account_id: a.account_id,
    name: a.name,
    mask: a.mask,
    type: a.type,
    subtype: a.subtype,
    // Plaid balances are CACHED unless the (paid) /accounts/balance/get is
    // used. Label it so nobody reads a stale figure as live.
    balances: {
      available: a.balances?.available ?? null,
      current: a.balances?.current ?? null,
      limit: a.balances?.limit ?? null,
      as_of: 'last successful item update (cached)',
    },
  }));

  // Transactions can take a few seconds to be ready right after Link; Plaid
  // returns PRODUCT_NOT_READY rather than an empty list in that window.
  let transactions = [];
  let transactionsNote = null;
  const txResult = await plaidFetch(env, '/transactions/get', {
    access_token: item.access_token,
    start_date: new Date(Date.now() - days * 86400000).toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    options: { count: 100, offset: 0 },
  });

  if (txResult.ok) {
    transactions = (txResult.data.transactions || [])
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 50)
      .map(t => ({
        transaction_id: t.transaction_id,
        date: t.date,
        name: t.name,
        merchant: t.merchant_name || null,
        amount: t.amount,
        category: (t.category || []).join(' / ') || null,
        pending: Boolean(t.pending),
      }));
  } else {
    transactionsNote = plaidErrorMessage(txResult);
  }

  return json({
    item_id: item.item_id,
    linked_at: item.linked_at,
    accounts,
    transactions,
    transactions_note: transactionsNote,
  }, 200, corsHeaders(request));
}