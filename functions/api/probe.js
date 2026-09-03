export async function onRequestGet({ env }) {
  return new Response(JSON.stringify({
    from: env.LEAD_FROM,
    to: env.LEAD_TO,
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}
