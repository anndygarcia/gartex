export async function onRequestPost({ request, env }) {
  return new Response(JSON.stringify({
    from: env && env.LEAD_FROM,
    to: env && env.LEAD_TO,
    key_len: env && env.RESEND_API_KEY ? env.RESEND_API_KEY.length : 0,
    key_prefix: env && env.RESEND_API_KEY ? env.RESEND_API_KEY.slice(0, 6) : null,
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}
