// CF Pages Function: contact form → Resend → gartexbuilders@gmail.com
// Simplified version to isolate the 502.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { name, phone, email, location, project } = body || {};
    if (!name || name.length < 2) return json({ error: 'name' }, 400);
    if (!email || !EMAIL_RE.test(email)) return json({ error: 'email' }, 400);
    if (!project || project.length < 4) return json({ error: 'project' }, 400);

    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) return json({ error: 'no key' }, 503);

    let from = env.LEAD_FROM || 'Gartex Website <onboarding@resend.dev>';
    from = String(from).replace(/\s+/g, ' ').trim();
    const to = env.LEAD_TO || 'gartexbuilders@gmail.com';

    const subject = `New project inquiry from ${name}`;
    const text = `Name: ${name}\nPhone: ${phone || '-'}\nEmail: ${email}\nLocation: ${location || '-'}\n\nProject:\n${project}\n\n-- gartex-construction.com`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject,
        text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return json({ error: `resend ${res.status}`, detail: detail.slice(0, 500), from_used: from }, 502);
    }
    const result = await res.json().catch(() => ({}));
    return json({ ok: true, id: result.id }, 200);
  } catch (e) {
    return json({ error: `caught: ${e.message}`, stack: e.stack?.slice(0, 500) }, 500);
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
