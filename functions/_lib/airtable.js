// Airtable REST helpers for the subcontractor-network dashboard.
//
// Storage model
// -------------
// Airtable is the source of truth for the lead database. Cloudflare KV and
// D1 are NOT used: the Hermes API token lacks account-level scope to create
// namespaces or databases (KV/D1/R2 all return 401 "Authentication error"),
// and the GitHub repo is public so no secret can live in it. Airtable is
// created and owned in Anndy's account and reached server-side only.
//
// Required CF Pages env vars (Production):
//   AIRTABLE_PAT      – personal access token (data.records:read/write)
//   AIRTABLE_BASE_ID  – appXXXXXXXXXXXXXX
//   NETWORK_ADMIN_TOKEN – dashboard login secret
//
// Airtable's REST API caps reads at 100 records per page, so list() loops
// on the offset. Writes are batched 10 at a time.

const API = 'https://api.airtable.com/v0';

export function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

export function tableIds(env) {
  return {
    leads: env.AIRTABLE_LEADS_TABLE || 'Leads',
    log: env.AIRTABLE_LOG_TABLE || 'Activity',
  };
}

function headers(env) {
  const pat = env.AIRTABLE_PAT;
  if (!pat) throw new Error('AIRTABLE_PAT not configured');
  return {
    authorization: `Bearer ${pat}`,
    'content-type': 'application/json',
  };
}

export function isConfigured(env) {
  return !!(env.AIRTABLE_PAT && env.AIRTABLE_BASE_ID);
}

/** GET one page of records. */
async function getPage(env, table, params) {
  const url = new URL(`${API}/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`);
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === '') continue;
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { headers: headers(env) });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable GET ${table} ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

/** List all records for a table, following pagination offsets. */
export async function listAll(env, table, { filterByFormula, maxRecords = 500 } = {}) {
  const out = [];
  let offset;
  while (out.length < maxRecords) {
    const page = await getPage(env, table, {
      maxRecords: 100,
      offset,
      filterByFormula,
    });
    const records = page.records || [];
    out.push(...records);
    offset = page.offset;
    if (!offset || records.length === 0) break;
  }
  return out.slice(0, maxRecords);
}

export async function createRecord(env, table, fields) {
  const res = await fetch(`${API}/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`, {
    method: 'POST',
    headers: headers(env),
    body: JSON.stringify({ fields, typecast: true }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable CREATE ${table} ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

export async function updateRecord(env, table, recordId, fields) {
  const res = await fetch(
    `${API}/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(table)}/${recordId}`,
    {
      method: 'PATCH',
      headers: headers(env),
      body: JSON.stringify({ fields, typecast: true }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable UPDATE ${table} ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

export async function findByToken(env, table, token) {
  if (!token) return null;
  const formula = `{Intake Token}='${String(token).replace(/'/g, "\\'")}'`;
  const records = await listAll(env, table, { filterByFormula: formula, maxRecords: 1 });
  return records[0] || null;
}

/** Flatten an Airtable record into a plain object for the dashboard. */
export function flatten(record) {
  const f = record.fields || {};
  const out = {};
  for (const [k, v] of Object.entries(f)) {
    if (v === null || v === undefined) {
      out[k] = '';
    } else if (Array.isArray(v)) {
      out[k] = v.map((x) => (typeof x === 'object' ? (x.name || x.url || JSON.stringify(x)) : x));
    } else if (typeof v === 'object') {
      out[k] = v.name || v.url || JSON.stringify(v);
    } else {
      out[k] = v;
    }
  }
  out.__id = record.id;
  out.__createdTime = record.createdTime;
  return out;
}
