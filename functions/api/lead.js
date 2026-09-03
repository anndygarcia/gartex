export async function onRequestPost({ request, env }) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    return json({ error: 'Server not configured (missing RESEND_API_KEY).' }, 503);
  }
  const from = env.LEAD_FROM;
  const to = env.LEAD_TO || 'gartexbuilders@gmail.com';
  if (!from) {
    return json({ error: 'Server not configured (missing LEAD_FROM). Set LEAD_FROM in CF Pages env vars.' }, 503);
  }
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const project = String(body.project || '').trim();
    if (name.length < 2) return json({ error: 'Please enter your name.' }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Please enter a valid email.' }, 400);
    if (project.length < 4) return json({ error: 'Tell us a bit about your project.' }, 400);

    const text = [
      `Name: ${name}`,
      `Phone: ${body.phone || '-'}`,
      `Email: ${email}`,
      `Project location: ${body.location || '-'}`,
      '',
      'Project details:',
      project,
      '',
      '-- submitted via gartex-construction.com --',
    ].join('\n');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `New project inquiry from ${name}`,
        text,
      }),
    });
    const detail = await res.text().catch(() => '');
    return json({
      ok: res.ok,
      status: res.status,
      from_used: from,
      to,
      detail: detail.slice(0, 500),
    }, res.ok ? 200 : 502);
  } catch (e) {
    return json({ error: `Server error: ${e.message}` }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}

function json(o, s = 200) {
  return new Response(JSON.stringify(o), {
    status: s,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': 'https://gartex-construction.com',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  });
}
