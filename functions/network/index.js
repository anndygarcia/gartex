// GET /network/  →  the authenticated dashboard shell.
//
// The HTML is generated from functions/_lib/network-html.js rather than
// served as a static file, so the shell itself is never reachable without
// passing the auth gate below.
//
// Airtable is the source of truth. If it isn't configured yet, the page
// still renders (so Anndy can see the tool exists) but the API calls
// return 503 with a clear message instead of pretending there is no data.

import { requireAuthPage } from '../_lib/network-auth.js';
import { dashboardHtml } from '../_lib/network-html.js';

export async function onRequestGet({ request, env }) {
  const denial = await requireAuthPage(request, env);
  if (denial) return denial;

  return new Response(dashboardHtml(), {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, private',
      'x-robots-tag': 'noindex, nofollow, noarchive',
    },
  });
}
