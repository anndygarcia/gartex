export async function onRequestPost({ request, env }) {
  return new Response(JSON.stringify({
    from_raw: env && env.LEAD_FROM,
    to: env && env.LEAD_TO,
    has_key: !!(env && env.RESEND_API_KEY),
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}
