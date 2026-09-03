// Cloudflare Pages Function: receives contact-form submissions from
// gartex-construction.com, emails the lead to Gartex, and emails a
// branded confirmation back to the visitor.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

export async function onRequestPost({ request, env }) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return json({ error: 'Server not configured (missing RESEND_API_KEY).' }, 503);
  const from = env.LEAD_FROM;
  const to = env.LEAD_TO || 'gartexbuilders@gmail.com';
  if (!from) {
    return json({
      error: 'Server not configured (missing LEAD_FROM). Set LEAD_FROM in CF Pages env vars.',
    }, 503);
  }

  // Tiny in-memory rate limit so the form isn't used as a mail-bomb.
  const ip = request.headers.get('cf-connecting-ip') ||
             request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             'unknown';
  if (isRateLimited(ip)) return json({ error: 'Slow down a minute and try again.' }, 429);

  try {
    const body = await request.json();

    // Honeypot — bots typically fill any input on the page, so this
    // hidden field (CSS sets display:none) catches them.
    if (body.website && String(body.website).trim() !== '') {
      return json({ ok: true }, 200);
    }

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const project = String(body.project || '').trim();
    const phone = String(body.phone || '').trim();
    const location = String(body.location || '').trim();

    if (name.length < 2) return json({ error: 'Please enter your name.' }, 400);
    if (!EMAIL_RE.test(email)) return json({ error: 'Please enter a valid email.' }, 400);
    if (project.length < 4) return json({ error: 'Tell us a bit about your project.' }, 400);

    // Pre-compute pieces both emails share so they're consistent.
    const firstName = name.split(/\s+/)[0] || name;

    // ─── 1. Send the lead notification to Gartex ─────────────────────
    const leadText = [
      `New project inquiry from ${name}`,
      '',
      `Name: ${name}`,
      `Phone: ${phone || '-'}`,
      `Email: ${email}`,
      `Project location: ${location || '-'}`,
      '',
      'Project details:',
      project,
      '',
      '-- submitted via gartex-construction.com --',
      `Reply directly to this email to respond to ${name}.`,
    ].join('\n');

    const leadHtml = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f8ff;font-family:Inter,-apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:#0b1729;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f4f8ff;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background:#ffffff;border:1px solid #dce7f5;border-radius:10px;overflow:hidden;">
        <!-- Header banner -->
        <tr><td style="background:linear-gradient(90deg,#1e90ff 0%,#1f6bd6 50%,#124ea5 100%);padding:24px 32px;">
          <div style="color:#ffffff;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;opacity:0.85;">Gartex Construction Company · Lead Notification</div>
          <div style="color:#ffffff;font-size:22px;font-weight:700;margin-top:4px;">New project inquiry</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
            A new project inquiry just came in from
            <strong style="color:#1f3a5f;">${escHtml(name)}</strong>.
            Reach out within one business day to keep the lead warm.
          </p>

          <!-- Quick-action buttons (Reply goes to the visitor's email; Call opens dialer) -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
            <tr>
              <td style="padding:0 8px 0 0;">
                <a href="mailto:${escHtml(email)}?subject=${encodeURIComponent(`Re: Your project inquiry — Gartex Construction`)}"
                   style="display:inline-block;padding:10px 18px;background:#1f3a5f;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
                  Reply to ${escHtml(firstName)}
                </a>
              </td>
              ${phone ? `<td style="padding:0;">
                <a href="tel:${escHtml(phone.replace(/[^0-9+]/g, ''))}"
                   style="display:inline-block;padding:10px 18px;background:#ffffff;color:#1f3a5f;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;border:1px solid #1f3a5f;">
                  Call ${escHtml(phone)}
                </a>
              </td>` : ''}
            </tr>
          </table>

          <!-- Lead details card -->
          <div style="margin:0 0 24px;padding:18px 20px;background:#f4f8ff;border-left:4px solid #1f3a5f;border-radius:6px;">
            <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#5a5a5a;margin-bottom:10px;font-weight:600;">Lead details</div>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size:14px;line-height:1.55;">
              <tr><td style="padding:4px 0;color:#5a5a5a;width:130px;vertical-align:top;">Name</td><td style="padding:4px 0;color:#0b1729;font-weight:600;">${escHtml(name)}</td></tr>
              <tr><td style="padding:4px 0;color:#5a5a5a;vertical-align:top;">Phone</td><td style="padding:4px 0;color:#0b1729;font-weight:500;">${escHtml(phone || '—')}</td></tr>
              <tr><td style="padding:4px 0;color:#5a5a5a;vertical-align:top;">Email</td><td style="padding:4px 0;color:#0b1729;font-weight:500;"><a href="mailto:${escHtml(email)}" style="color:#1f6bd6;text-decoration:none;">${escHtml(email)}</a></td></tr>
              <tr><td style="padding:4px 0;color:#5a5a5a;vertical-align:top;">Location</td><td style="padding:4px 0;color:#0b1729;font-weight:500;">${escHtml(location || '—')}</td></tr>
            </table>
          </div>

          <!-- Project description -->
          <div style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#5a5a5a;font-weight:600;">Project description</div>
          <div style="margin:0 0 24px;padding:18px 20px;background:#ffffff;border:1px solid #dce7f5;border-radius:6px;font-size:14.5px;line-height:1.6;color:#0b1729;white-space:pre-wrap;">${escHtml(project)}</div>

          <p style="margin:0;font-size:13px;line-height:1.6;color:#5a5a5a;">
            Submitted via <a href="https://gartex-construction.com" style="color:#1f6bd6;text-decoration:none;">gartex-construction.com</a>.
            Hit Reply to respond to ${escHtml(firstName)} directly — your reply will land in their inbox.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#0e1623;padding:20px 32px;color:#94a3b8;font-size:12.5px;line-height:1.6;">
          Gartex Construction Company · Houston, Texas<br>
          <a href="https://gartex-construction.com" style="color:#cbd5e1;text-decoration:none;">gartex-construction.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const leadRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `New project inquiry from ${name}`,
        text: leadText,
        html: leadHtml,
      }),
    });

    if (!leadRes.ok) {
      const detail = await leadRes.text().catch(() => '');
      return json({
        error: `Email service rejected the submission (${leadRes.status}).`,
        detail: detail.slice(0, 300),
      }, 502);
    }
    const leadResult = await leadRes.json().catch(() => ({}));

    // ─── 2. Send the confirmation email to the visitor ──────────────
    // If THIS fails, we still return success — the lead landed and
    // it's better to acknowledge the submission than to confuse the
    // visitor with a confusing "your email failed" message when in
    // fact we've already received their inquiry.
    const confirmSubject = `Thanks ${firstName} — we got your project inquiry`;
    const confirmText =
      `Hi ${firstName},\n\n` +
      `Thanks for reaching out to Gartex Construction Company. ` +
      `We've received your project inquiry and a member of our team ` +
      `will be in touch within one business day to discuss next steps.\n\n` +
      `If your project is more time-sensitive, give us a call at ` +
      `(713) 703-6355 — Mon–Fri, 7 AM – 5 PM.\n\n` +
      `For your records, here's a copy of what you sent us:\n\n` +
      `----\n` +
      `Name: ${name}\n` +
      `Phone: ${phone || '-'}\n` +
      `Email: ${email}\n` +
      `Project location: ${location || '-'}\n\n` +
      `Project details:\n${project}\n` +
      `----\n\n` +
      `Talk soon,\nGartex Construction Company\n` +
      `Houston, Texas · https://gartex-construction.com\n`;

    const confirmHtml = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f8ff;font-family:Inter,-apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:#0b1729;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f4f8ff;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background:#ffffff;border:1px solid #dce7f5;border-radius:10px;overflow:hidden;">
        <!-- Header banner -->
        <tr><td style="background:linear-gradient(90deg,#1e90ff 0%,#1f6bd6 50%,#124ea5 100%);padding:24px 32px;">
          <div style="color:#ffffff;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;opacity:0.85;">Gartex Construction Company</div>
          <div style="color:#ffffff;font-size:22px;font-weight:700;margin-top:4px;">Thanks for reaching out</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${escHtml(firstName)},</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
            Thanks for choosing Gartex for your Houston-area project.
            We've received your inquiry and a member of our team will
            be in touch within one business day to discuss your build.
          </p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
            Need us sooner? Give us a call at
            <a href="tel:+17137036355" style="color:#1f6bd6;text-decoration:none;font-weight:600;">(713) 703-6355</a>
            — Mon–Fri, 7 AM – 5 PM.
          </p>
          <!-- Recap card -->
          <div style="margin:24px 0;padding:18px 20px;background:#f4f8ff;border-left:4px solid #1f3a5f;border-radius:6px;">
            <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#5a5a5a;margin-bottom:8px;font-weight:600;">Your submission</div>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size:14px;line-height:1.5;">
              <tr><td style="padding:3px 0;color:#5a5a5a;width:120px;">Name</td><td style="padding:3px 0;color:#0b1729;font-weight:500;">${escHtml(name)}</td></tr>
              <tr><td style="padding:3px 0;color:#5a5a5a;">Phone</td><td style="padding:3px 0;color:#0b1729;font-weight:500;">${escHtml(phone || '—')}</td></tr>
              <tr><td style="padding:3px 0;color:#5a5a5a;">Email</td><td style="padding:3px 0;color:#0b1729;font-weight:500;">${escHtml(email)}</td></tr>
              <tr><td style="padding:3px 0;color:#5a5a5a;">Location</td><td style="padding:3px 0;color:#0b1729;font-weight:500;">${escHtml(location || '—')}</td></tr>
            </table>
            <div style="margin-top:12px;padding-top:12px;border-top:1px solid #dce7f5;font-size:14px;line-height:1.55;color:#0b1729;white-space:pre-wrap;">${escHtml(project)}</div>
          </div>
          <p style="margin:0 0 8px;font-size:16px;line-height:1.6;">
            Talk soon,<br>
            <strong style="color:#1f3a5f;">Gartex Construction Company</strong>
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#0e1623;padding:20px 32px;color:#94a3b8;font-size:12.5px;line-height:1.6;">
          Houston, Texas · <a href="https://gartex-construction.com" style="color:#cbd5e1;text-decoration:none;">gartex-construction.com</a><br>
          Custom framing and cornice work for Houston's finest custom homes.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    let confirmId = null;
    try {
      const confirmRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [email],            // send to the visitor
          reply_to: to,           // so they can reply directly to Gartex
          subject: confirmSubject,
          text: confirmText,
          html: confirmHtml,
        }),
      });
      const confirmResult = await confirmRes.json().catch(() => ({}));
      confirmId = confirmResult.id || null;
      if (!confirmRes.ok) {
        // Don't fail the form — lead already landed. Just log.
        console.warn(`Confirmation email failed: ${confirmRes.status} ${JSON.stringify(confirmResult).slice(0, 300)}`);
      }
    } catch (e) {
      console.warn(`Confirmation email network error: ${e.message}`);
    }

    return json({
      ok: true,
      lead_id: leadResult.id,
      confirm_id: confirmId,
    }, 200);
  } catch (e) {
    return json({ error: `Server error: ${e.message}` }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}

// HTML escapers for the confirmation email body.
function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Tiny in-memory rate limit: 5 leads/min/IP per isolate.
const recent = new Map();
const RL_WINDOW_MS = 60_000;
const RL_MAX = 5;
function isRateLimited(ip) {
  const now = Date.now();
  const arr = recent.get(ip) || [];
  const fresh = arr.filter(t => now - t < RL_WINDOW_MS);
  if (fresh.length >= RL_MAX) return true;
  fresh.push(now);
  recent.set(ip, fresh);
  return false;
}
