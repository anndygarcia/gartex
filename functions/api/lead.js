export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    return new Response(JSON.stringify({
      ok: true,
      received: body,
      from: env && env.LEAD_FROM,
      to: env && env.LEAD_TO,
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'content-type': 'application/json' },
    });
  }
}
