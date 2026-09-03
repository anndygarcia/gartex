export async function onRequestGet({ env }) {
  const apiKey = env && env.RESEND_API_KEY;
  if (!apiKey) return new Response('NO KEY', { status: 500 });
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: env.LEAD_FROM,
        to: [env.LEAD_TO],
        subject: 'Hermes test',
        text: 'test',
      }),
    });
    const text = await res.text();
    return new Response(JSON.stringify({
      status: res.status,
      body: text.slice(0, 500),
      from_used: env.LEAD_FROM,
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, stack: e.stack }), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }
}
