export async function onRequestPost({ request, env }) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'no key' }), { status: 503, headers: { 'content-type': 'application/json' } });
  }
  try {
    const body = await request.json();
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: 'Gartex Website <onboarding@resend.dev>',
        to: ['gartexbuilders@gmail.com'],
        subject: `Inquiry from ${body.name || 'unknown'}`,
        text: `Name: ${body.name}\nPhone: ${body.phone}\nEmail: ${body.email}\nLocation: ${body.location}\n\nProject:\n${body.project}`,
      }),
    });
    const text = await res.text();
    return new Response(JSON.stringify({ status: res.status, body: text.slice(0, 500) }), {
      status: 200, headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}
