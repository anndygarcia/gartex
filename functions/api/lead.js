// CF Pages Function: contact form → Resend → gartexbuilders@gmail.com
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { name, phone, email, location, project } = body || {};
    if (!name || name.length < 2) return json({ error: 'Please enter your name.' }, 400);
    if (!email || !EMAIL_RE.test(email)) return json({ error: 'Please enter a valid email.' }, 400);
    if (!project || project.length < 4) return json({ error: 'Tell us a bit about your project.' }, 400);

    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) return json({ error: 'Server not configured (missing RESEND_API_KEY).' }, 503);

    let from = env.LEAD_FROM || 'Gartex Website <onboarding@resend.dev>';
    from = String(from).replace(/\s+/g, ' ').trim();
    const to = env.LEAD_TO || 'gartexbuilders@gmail.com';

    const subject = `New project inquiry from ${name}`;
    const text =
      `Name: ${name}\n` +
      `Phone: ${phone || '-'}\n` +
      `Email: ${email}\n` +
      `Project location: ${location || '-'}\n` +
      `\nProject details:\n${project}\n` +
      `\n-- submitted via gartex-construction.com --`;

    let res;
    try {
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from, to: [to], reply_to: email, subject, text }),
      });
    } catch (e) {
      return json({ error: `Network error: ${e.message}` }, 502);
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return json({ error: `Resend ${res.status}`, detail: detail.slice(0, 500), from_used: from }, 502);
    }
    const result = await res.json().catch(() => ({}));
    return json({ ok: true, id: result.id }, 200);
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
