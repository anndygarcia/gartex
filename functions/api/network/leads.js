// /api/network/leads
//   GET   → all lead records (flattened for the dashboard)
//   PATCH → update fields on one record (e.g. drag a card to a new status)
//
// Auth required. Data source is the local lead store (SQLite on Andy's
// Mac, reached through the Cloudflare Tunnel).

import { json, requireAuth } from '../../_lib/network-auth.js';
import { listAll, updateRecord, isConfigured, tableIds } from '../../_lib/leadstore.js';

export async function onRequestGet({ request, env }) {
  const denial = await requireAuth(request, env);
  if (denial) return denial;

  if (!isConfigured(env)) {
    return json({ error: 'Lead store not configured (missing LEADS_API_URL / LEADS_API_SECRET).' }, 503);
  }

  try {
    const { leads } = tableIds(env);
    const records = await listAll(env, leads, { maxRecords: 800 });
    const { flatten } = await import('../../_lib/leadstore.js');
    return json({ leads: records.map(flatten), count: records.length });
  } catch (e) {
    return json({ error: e.message }, 502);
  }
}

export async function onRequestPatch({ request, env }) {
  const denial = await requireAuth(request, env);
  if (denial) return denial;

  if (!isConfigured(env)) {
    return json({ error: 'Lead store not configured (missing LEADS_API_URL / LEADS_API_SECRET).' }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const id = String(body.id || '').trim();
  const fields = body.fields || {};
  if (!id) return json({ error: 'Missing record id.' }, 400);
  if (typeof fields !== 'object' || !Object.keys(fields).length) {
    return json({ error: 'No fields to update.' }, 400);
  }

  // Whitelist the fields the dashboard is allowed to write.
  const ALLOWED = new Set([
    'Status', 'Capacity', 'Notes', 'Rating', 'Lead Score', 'Verified',
    'COI Verified Date', 'Insured', 'Entity Registered', 'Next Action',
  ]);
  const clean = {};
  for (const [k, v] of Object.entries(fields)) {
    if (ALLOWED.has(k)) clean[k] = v;
  }
  if (!Object.keys(clean).length) return json({ error: 'No permitted fields supplied.' }, 400);

  try {
    const { leads } = tableIds(env);
    const updated = await updateRecord(env, leads, id, clean);
    const { flatten } = await import('../../_lib/leadstore.js');
    return json({ ok: true, lead: flatten(updated) });
  } catch (e) {
    return json({ error: e.message }, 502);
  }
}
