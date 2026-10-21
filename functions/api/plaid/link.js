// Cloudflare Pages Function: POST /api/plaid/link
//
// Creates a Plaid Link token and hands it to the browser, which boots Plaid's
// Link UI. Link is what actually authenticates the bank — the user's bank
// password is typed into Plaid's hosted iframe and never reaches this Function
// or Anndy's server. We only ever see the resulting public_token.
//
// Flow:  /api/plaid/link  ->  (Link iframe)  ->  /api/plaid/exchange

import {
  json, corsHeaders, preflight, getPlaidConfig, requireAdmin,
  plaidFetch, plaidErrorMessage,
} from '../../_lib/plaid.js';

export async function onRequestOptions({ request }) {
  return preflight(request);
}

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  const cfg = getPlaidConfig(env);
  if (!cfg.configured) {
    return json({
      error: 'Plaid not configured. Set PLAID_CLIENT_ID, PLAID_SECRET, and ' +
             'PLAID_ADMIN_TOKEN as Cloudflare Pages environment variables, ' +
             'then push a commit so the Functions pick them up.',
    }, 503, corsHeaders(request));
  }

  // client_user_id must be STABLE across sessions for the same user — Plaid
  // uses it to recognise a returning user. A random value per request creates a
  // brand-new user every time and breaks any identity the user already has.
  const clientUserId = env.PLAID_USER_ID || 'gartex-owner';

  const result = await plaidFetch(env, '/link/token/create', {
    user: { client_user_id: clientUserId },
    client_name: env.PLAID_CLIENT_NAME || 'Gartex Agent',
    products: ['transactions'],
    // Optional in production, but requesting days up front means the first
    // /transactions/sync call returns real history instead of an empty array.
    transactions: { days_requested: 180 },
    country_codes: ['US'],
    language: 'en',
  });

  if (!result.ok) {
    return json({
      error: 'Could not start the Plaid Link session.',
      detail: plaidErrorMessage(result),
    }, result.status >= 400 && result.status < 600 ? result.status : 502,
       corsHeaders(request));
  }

  return json({
    link_token: result.data.link_token,
    expiration: result.data.expiration,
    environment: cfg.envName,
  }, 200, corsHeaders(request));
}