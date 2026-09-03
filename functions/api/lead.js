export async function onRequestPost({ request, env }) {
  return new Response(JSON.stringify({
    from: env && env.LEAD_FROM,
    to: env && env.LEAD_TO,
    key: env && env.RESEND_API_KEY ? 'present' : 'missing',
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}
