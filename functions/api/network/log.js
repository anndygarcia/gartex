// /api/network/log  →  the activity feed (every bot action, newest first).
//
// Auth required. Sourced from the Airtable "Activity" table, which is the
// audit trail for the campaign — it also serves as our evidence if Facebook
// ever questions account activity.

import { json, requireAuth } from '../../_lib/network-auth.js';
import { listAll, isConfigured, tableIds } from '../../_lib/airtable.js';

export async function onRequestGet({ request, env }) {
  const denial = await requireAuth(request, env);
  if (denial) return denial;

  if (!isConfigured(env)) {
    return json({ error: 'Airtable not configured (missing AIRTABLE_PAT / AIRTABLE_BASE_ID).' }, 503);
  }

  try {
    const { log } = tableIds(env);
    const records = await listAll(env, log, { maxRecords: 300 });
    const rows = records
      .map((r) => ({
        timestamp: r.createdTime || r.fields?.Timestamp || '',
        Type: r.fields?.Type || '',
        Detail: r.fields?.Detail || '',
        Lead: r.fields?.Lead || '',
      }))
      .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
    return json({ log: rows, count: rows.length });
  } catch (e) {
    return json({ error: e.message }, 502);
  }
}
