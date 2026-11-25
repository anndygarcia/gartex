// Lead store client for the subcontractor-network dashboard.
//
// Storage model
// -------------
// The lead database is NOT a hosted service any more. It is a SQLite file
// on Anndy's Mac (~/Gartex-Subcontractor-DB/leads.db), served over HTTP
// by a small local service that is published to the internet through a
// Cloudflare Tunnel at https://leads.gartex-construction.com.
//
// This module is the transport only. The record shape is byte-for-byte
// what Airtable used to return —
//     { id, fields: {...}, createdTime }
// — so the dashboard code and flatten() are unchanged.
//
// Required CF Pages env vars (Production):
//   LEADS_API_URL      – base URL of the local store (the tunnel URL)
//   LEADS_API_SECRET   – shared secret, sent as the X-Leads-Secret header
//   NETWORK_ADMIN_TOKEN – dashboard login secret
//
// The Airtable path is retired: AIRTABLE_PAT and AIRTABLE_BASE_ID are no
// longer used and must not be set. The repo is public, so no secret, and
// no database file, may ever live in it.
//
// Every request carries the shared secret in the X-Leads-Secret header —
// the tunnel hostname itself is not a secret, that header is.

const TABLES = {
  leads: 'Leads',
  log: 'Activity',
};

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
    leads: TABLES.leads,
    log: TABLES.log,
  };
}

/** True when the local store is reachable from this deployment. */
export function isConfigured(env) {
  return !!(env.LEADS_API_URL && env.LEADS_API_SECRET);
}

/** Base URL of the local store, without a trailing slash. */
export function storeBase(env) {
  return String(env.LEADS_API_URL || '').replace(/\/+$/, '');
}

/** Auth headers for the local store. */
export function storeHeaders(env) {
  const secret = env.LEADS_API_SECRET;
  if (!secret) throw new Error('LEADS_API_SECRET not configured');
  return {
    'X-Leads-Secret': secret,
  };
}

/**
 * Error in the shape of the old Airtable helper: table, method, status
 * and a truncated body. The secret is never part of the message.
 */
function apiError(table, method, label, status, body, secret) {
  let text = String(body == null ? '' : body).slice(0, 300);
  if (secret) text = text.split(secret).join('[redacted]');
  return new Error(`${table} API ${method} ${label} ${status}: ${text}`);
}

/** Canonical table name for a wire request. */
function wireTable(table) {
  const key = String(table || '').trim().toLowerCase();
  if (key === 'leads') return TABLES.leads;
  if (key === 'activity') return TABLES.log;
  throw new Error(`unknown table "${table}" (expected Leads or Activity)`);
}

/** List all records of a table. */
export async function listAll(env, table, { filterByFormula, maxRecords = 500 } = {}) {
  if (filterByFormula) {
    // The local store has no formula engine. The one lookup that used a
    // formula — the intake-token lookup — has its own endpoint, so
    // findByToken() never comes through here.
    throw new Error(
      'filterByFormula is not supported by the local store — use findByToken() for the intake-token lookup',
    );
  }
  const name = wireTable(table);
  const path = name === TABLES.log ? '/api/network/activity' : '/api/network/leads';
  const url = new URL(`${storeBase(env)}${path}`);
  url.searchParams.set('maxRecords', String(maxRecords));
  const res = await fetch(url.toString(), { headers: storeHeaders(env) });
  if (!res.ok) {
    throw apiError(name, 'GET', path.split('/').pop(), res.status, await res.text(), env.LEADS_API_SECRET);
  }
  const body = await res.json();
  if (Array.isArray(body)) return body;
  return (body && body.records) || [];
}

/** Create one record and return it. */
export async function createRecord(env, table, fields) {
  const name = wireTable(table);
  const res = await fetch(`${storeBase(env)}/api/network/records`, {
    method: 'POST',
    headers: { ...storeHeaders(env), 'content-type': 'application/json' },
    body: JSON.stringify({ table: name, fields }),
  });
  if (!res.ok) {
    throw apiError(name, 'POST', 'records', res.status, await res.text(), env.LEADS_API_SECRET);
  }
  return res.json();
}

/** Merge fields into one record and return the updated record. */
export async function updateRecord(env, table, recordId, fields) {
  const name = wireTable(table);
  const res = await fetch(`${storeBase(env)}/api/network/records/${encodeURIComponent(recordId)}`, {
    method: 'PATCH',
    headers: { ...storeHeaders(env), 'content-type': 'application/json' },
    body: JSON.stringify({ table: name, fields }),
  });
  if (!res.ok) {
    throw apiError(name, 'PATCH', 'records', res.status, await res.text(), env.LEADS_API_SECRET);
  }
  return res.json();
}

/** The lead whose Intake Token matches, or null. */
export async function findByToken(env, table, token) {
  if (!token) return null;
  const name = wireTable(table);
  const url = new URL(`${storeBase(env)}/api/network/lead-by-token`);
  url.searchParams.set('token', String(token));
  const res = await fetch(url.toString(), { headers: storeHeaders(env) });
  if (!res.ok) {
    throw apiError(name, 'GET', 'lead-by-token', res.status, await res.text(), env.LEADS_API_SECRET);
  }
  const text = await res.text();
  if (!text.trim()) return null;
  const body = JSON.parse(text);
  return body || null;
}

/** Flatten a lead-store record into a plain object for the dashboard. */
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
