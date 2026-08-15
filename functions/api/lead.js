// Cloudflare Pages Function: receives contact-form submissions from
// gartex-construction.com and emails them to gartexbuilders@gmail.com
// via Resend.
//
// Required env (set in CF Pages dashboard → Settings → Functions):
//   RESEND_API_KEY  — your Resend API key (sending access)
//   LEAD_TO         — destination email (default: gartexbuilders@gmail.com)
//   LEAD_FROM       — sender. Must be on a domain verified in Resend
//                     (i.e. "Gartex Construction <noreply@gartex-construction.com>").
//                     For testing without verified DNS, you can use Resend's
//                     sandbox: "Gartex Website <onboarding@resend.dev>".
//
// Endpoint contract:
//   POST /api/lead    { name, phone?, email, location?, project }
//   → 200 { ok: true, lead_id }
//   → 4xx { error }   on validation/rate-limit
//   → 502 { error }   on upstream / Resend failure
//
// Spam guards:
//   - honeypot field "website" must be empty
//   - reject obviously bad input (too-short fields, HTML, scripts)
//   - basic rate-limit per IP (in-memory per isolate)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FROM_DEFAULT = 'Gartex Website <onboarding@resend.dev>';

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': 'https://gartex-construction.com',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '86400',
      ...extraHeaders,
    },
  });
}

function isBotSafe(input) {
  if (/<\/?(script|style|iframe)[^>]*>/i.test(input)) return false;
  if (/(?:on\w+|javascript:)\s*=/i.test(input)) return false;
  return true;
}

// Trivial in-memory rate limit (per-isolate, sufficient for a single
// instance's lifetime — resets on redeploy). 5 leads/min per IP.
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

export async function onRequestPost({ request, env }) {
  try {
    return await onRequestPostImpl({ request, env });
  } catch (e) {
    return json({ error: `Unhandled error: ${e?.message || String(e)}` }, 500);
  }
}

async function onRequestPostImpl({ request, env }) {
  const ip = request.headers.get('cf-connecting-ip') ||
             request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             'unknown';
  if (isRateLimited(ip)) {
    return json({ error: 'Slow down a minute and try again.' }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  // Honeypot — bots typically fill any input on the page, so this
  // hidden field (CSS sets display:none) catches them.
  if (body.website && body.website.trim() !== '') {
    return json({ ok: true }, 200);
  }

  const { name, phone, email, location, project } = body || {};
  if (!name || name.trim().length < 2) {
    return json({ error: 'Please enter your name.' }, 400);
  }
  if (!email || !EMAIL_RE.test(email)) {
    return json({ error: 'Please enter a valid email.' }, 400);
  }
  if (!project || project.trim().length < 4) {
    return json({ error: 'Tell us a bit about your project.' }, 400);
  }
  if (!isBotSafe(name) || !isBotSafe(project) || (phone && !isBotSafe(phone))) {
    return json({ error: 'Submission contains disallowed content.' }, 400);
  }

  const apiKey = env && env.RESEND_API_KEY;
  if (!apiKey) {
    return json({ error: 'Server is not configured (missing RESEND_API_KEY).' }, 503);
  }
  const to = (env && env.LEAD_TO) || 'gartexbuilders@gmail.com';
  let from = (env && env.LEAD_FROM) || FROM_DEFAULT;
  // Strip newlines — some env-var inputs accidentally include a
  // literal line break between the display name and the angle
  // bracketed address, which causes Resend to reject the email.
  from = String(from).replace(/\s+/g, ' ').trim();

  const subject = `New project inquiry from ${name}`;
  const text = [
    `Name: ${name}`,
    `Phone: ${phone || '—'}`,
    `Email: ${email}`,
    `Project location: ${location || '—'}`,
    '',
    'Project details:',
    project,
    '',
    '— submitted via gartex-construction.com —',
  ].join('\n');

  const html = `<!doctype html>
<div style="font-family:Inter,-apple-system,BlinkMacSystemFont,system-ui,sans-serif;line-height:1.55;color:#0b1729;">
  <h2 style="margin:0 0 12px;color:#1f3a5f;">New project inquiry</h2>
  <table style="border-collapse:collapse;margin:0 0 16px;">
    <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Name</td><td>${esc(name)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Phone</td><td>${esc(phone || '—')}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Email</td><td><a href="mailto:${escAttr(email)}">${esc(email)}</a></td></tr>
    <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Location</td><td>${esc(location || '—')}</td></tr>
  </table>
  <div style="padding:14px 16px;background:#f7f8fa;border-left:4px solid #1f3a5f;white-space:pre-wrap;">${esc(project)}</div>
  <p style="color:#5a5a5a;font-size:13px;margin-top:18px;">Submitted via gartex-construction.com</p>
</div>`;

  const replyTo = email;

  let res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], reply_to: replyTo, subject, text, html }),
    });
  } catch (e) {
    return json({ error: `Network error talking to Resend: ${e.message}` }, 502);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return json({
      error: `Resend rejected the email (${res.status}).`,
      detail: detail.slice(0, 500),
      from_used: from,
      to: to,
    }, 502);
  }
  const result = await res.json().catch(() => ({}));
  return json({ ok: true, lead_id: result.id || null }, 200);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': 'https://gartex-construction.com',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '86400',
    },
  });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function escAttr(s) { return esc(s); }
