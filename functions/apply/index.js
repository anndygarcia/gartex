// GET /apply  →  the public bilingual intake form (English by default, ?lang=es for Spanish).
//
// This page is intentionally PUBLIC — subcontractors fill it in after they
// reply to a Marketplace message. It carries noindex and is unlinked from
// the public site, so it never shows up in search.

import { intakeHtml } from '../_lib/intake-html.js';

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const lang = url.searchParams.get('lang') === 'es' ? 'es' : 'en';
  return new Response(intakeHtml(lang), {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}
