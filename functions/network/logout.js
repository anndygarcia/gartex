// POST /network/logout  →  clear the session cookie.

import { clearSessionCookie } from '../_lib/network-auth.js';

export async function onRequestPost() {
  return new Response(null, {
    status: 302,
    headers: {
      location: '/network/login',
      'set-cookie': clearSessionCookie()[0],
      'cache-control': 'no-store',
    },
  });
}
