// POST /api/network/intake  →  public intake-form submission.
//
// Creates a lead row in Airtable (status "Form submitted"), attaches the
// uploaded COI/W-9/photos, and emails Anndy a notification.
//
// This endpoint is public by design (subs fill the form), so it is
// hardened: honeypot, per-IP rate limit, size caps, and a strict field
// whitelist. The Airtable token stays server-side.

import { json } from '../../_lib/network-auth.js';
import { createRecord, isConfigured, tableIds } from '../../_lib/airtable.js';

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB per file
const MAX_FILES = 6;

// Per-IP rate limit. In-memory is fine here: this is abuse damping, not
// accounting. Cloudflare Functions instances are ephemeral, so the window
// resets on a cold start — acceptable for this purpose.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const window = 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < window);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 5;
}

const TEXT_FIELDS = [
  'Name', 'Company', 'Phone', 'Email', 'Specialty', 'Years In Business',
  'Crew Size', 'Insured', 'Insurance Carrier', 'Policy Number', 'Coverage',
  'COI Expiry', 'Workers Comp', 'Entity Registered', 'Legal Entity', 'EIN',
  'Capacity', 'When Could You Start', 'Pricing Model', 'Payment Terms',
  'License Numbers', 'Travel', 'References', 'Notes', 'Lang',
];

const NUMERIC = new Set(['Years In Business', 'Crew Size']);

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function sendNotification(env, lead, files) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return { skipped: true };
  const to = env.LEAD_TO || 'gartexbuilders@gmail.com';
  const from = env.LEAD_FROM || 'Gartex Construction <onboarding@resend.dev>';

  const attachments = [];
  for (const key of ['coi', 'w9']) {
    const f = files[key];
    if (f && f.data) {
      attachments.push({ filename: f.name, content: f.data });
    }
  }

  const rows = [
    ['Name', lead['Name']],
    ['Company', lead['Company']],
    ['Phone', lead['Phone']],
    ['Email', lead['Email']],
    ['Trades', (lead['Trades'] || []).join(', ')],
    ['Specialty', lead['Specialty']],
    ['Insured', lead['Insured']],
    ['Carrier / policy', [lead['Insurance Carrier'], lead['Policy Number']].filter(Boolean).join(' / ')],
    ['Coverage', lead['Coverage']],
    ['COI expiry', lead['COI Expiry']],
    ["Workers' comp", lead['Workers Comp']],
    ['Entity registered', lead['Entity Registered']],
    ['Legal entity', lead['Legal Entity']],
    ['EIN', lead['EIN']],
    ['Capacity', lead['Capacity']],
    ['Could start', lead['When Could You Start']],
    ['Pricing / terms', [lead['Pricing Model'], lead['Payment Terms']].filter(Boolean).join(' / ')],
    ['Licenses', lead['License Numbers']],
    ['Counties', (lead['Counties'] || []).join(', ')],
    ['Travel', lead['Travel']],
    ['References', lead['References']],
    ['Notes', lead['Notes']],
    ['Language', lead['Lang']],
  ];

  const htmlRows = rows
    .map(([k, v]) =>
      `<tr><td style="padding:4px 12px 4px 0;color:#5a6b7d;width:170px;vertical-align:top">${esc(k)}</td>` +
      `<td style="padding:4px 0;color:#0b1729;font-weight:600">${esc(v || '—')}</td></tr>`)
    .join('');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `New sub lead — ${lead['Name']}${lead['Company'] ? ' (' + lead['Company'] + ')' : ''}`,
      html: `<div style="font-family:Inter,-apple-system,sans-serif;color:#0b1729">
        <h2 style="margin:0 0 4px;font-size:20px">New subcontractor lead</h2>
        <p style="margin:0 0 16px;color:#5a6b7d;font-size:14px">Submitted through the Gartex subcontractor intake form. Call them within 48 hours.</p>
        <table style="font-size:14px;border-collapse:collapse;width:100%">${htmlRows}</table>
        ${attachments.length ? '<p style="margin:18px 0 0;font-size:13px;color:#5a6b7d">Documents are attached to this email.</p>' : ''}
      </div>`,
      attachments,
    }),
  });
  if (!res.ok) {
    return { skipped: true, error: `Resend ${res.status}: ${(await res.text()).slice(0, 200)}` };
  }
  return { skipped: false };
}

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (rateLimited(ip)) return json({ error: 'Too many submissions. Try again in a minute.' }, 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const raw = body.fields || {};
  const files = body.files || {};

  // Honeypot: a hidden field only bots fill. Pretend success.
  if (raw.website && String(raw.website).trim() !== '') {
    return json({ ok: true, message: 'Thanks — we\'ve got it. We\'ll call you within 48 hours.' });
  }

  const name = String(raw['Name'] || '').trim();
  const phone = String(raw['Phone'] || '').trim();
  const email = String(raw['Email'] || '').trim();
  if (name.length < 2) return json({ error: 'Please enter your name.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: 'Please enter a valid email.' }, 400);
  if (phone.replace(/\D/g, '').length < 10) return json({ error: 'Please enter a valid phone number.' }, 400);
  if (String(raw['Specialty'] || '').trim().length < 5) {
    return json({ error: 'Please describe your specialty.' }, 400);
  }

  // Validate uploads: count + size caps.
  const fileKeys = Object.keys(files);
  if (fileKeys.length > MAX_FILES) return json({ error: 'Too many files attached.' }, 400);
  for (const k of fileKeys) {
    const f = files[k] || {};
    if (!f.data) continue;
    if (typeof f.data !== 'string') return json({ error: 'Invalid file upload.' }, 400);
    const approxBytes = (f.data.length * 3) / 4;
    if (approxBytes > MAX_FILE_BYTES) {
      return json({ error: `File ${f.name || k} is too large (max 4 MB).` }, 400);
    }
  }

  if (!isConfigured(env)) {
    return json({ error: 'Server not configured (missing AIRTABLE_PAT / AIRTABLE_BASE_ID).' }, 503);
  }

  // Build the Airtable record from a strict whitelist.
  const lead = {
    Name: name,
    Phone: phone,
    Email: email,
    Status: 'Form submitted',
    Source: 'Marketplace',
    'Lead Score': 0,
  };
  for (const key of TEXT_FIELDS) {
    if (key === 'Name' || key === 'Phone' || key === 'Email') continue;
    const v = raw[key];
    if (v === undefined || v === null || v === '') continue;
    lead[key] = NUMERIC.has(key) ? Number(v) : String(v).slice(0, 500);
  }
  if (Array.isArray(raw.trades) && raw.trades.length) lead.Trades = raw.trades.slice(0, 24);
  if (Array.isArray(raw.counties) && raw.counties.length) lead['Service Area'] = raw.counties.slice(0, 8);
  lead.Lang = raw.lang === 'es' ? 'ES' : 'EN';

  try {
    const { leads, log } = tableIds(env);
    const created = await createRecord(env, leads, lead);
    const recId = created.id;

    // Attach documents. Airtable needs a public URL for attachments, so we
    // upload to the attachment endpoint after creating the record.
    const attachField = { coi: 'COI Attachment', w9: 'W9 Attachment', photos: 'Photos' };
    for (const [k, f] of Object.entries(files)) {
      if (!f || !f.data || !attachField[k]) continue;
      try {
        await uploadAttachment(env, leads, recId, attachField[k], f);
      } catch (e) {
        await createRecord(env, log, {
          Type: 'Error',
          Detail: `Attachment upload failed for ${recId} (${k}): ${e.message}`,
        });
      }
    }

    await createRecord(env, log, {
      Type: 'Lead',
      Lead: `${name}${lead.Company ? ' — ' + lead.Company : ''}`,
      Detail: `Intake form submitted (${lead.Lang}). Trades: ${(lead.Trades || []).join(', ') || '—'}. Phone screen pending.`,
    });

    const notify = await sendNotification(env, lead, files);

    return json({
      ok: true,
      id: recId,
      message: 'Thanks — we\'ve got it. We\'ll call you within 48 hours.',
      notified: !notify.skipped,
    });
  } catch (e) {
    return json({ error: e.message }, 502);
  }
}

async function uploadAttachment(env, table, recordId, fieldName, file) {
  const form = new FormData();
  form.append('file', new File([Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0))], file.name), file.name);
  const res = await fetch(
    `https://content.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${table}/${recordId}/${encodeURIComponent(fieldName)}/uploadAttachment`,
    { method: 'POST', headers: { authorization: `Bearer ${env.AIRTABLE_PAT}` }, body: form },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable upload ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}
