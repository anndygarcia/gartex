// Test-only: fetch api.resend.com and return status + body preview
export async function onRequestGet() {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test', 'content-type': 'application/json' },
      body: JSON.stringify({ from: 'test@example.com', to: ['test@example.com'], subject: 'x' }),
    });
    const text = await res.text();
    return new Response(JSON.stringify({
      status: res.status,
      ok: res.ok,
      body: text.slice(0, 500),
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, stack: e.stack }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
