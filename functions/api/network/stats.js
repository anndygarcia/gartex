// /api/network/stats  →  funnel + trade-coverage aggregates for the dashboard.
//
// Auth required. All aggregation happens here (server-side) so the client
// just renders numbers — and so the Airtable token never reaches the browser.

import { json, requireAuth } from '../../_lib/network-auth.js';
import { listAll, isConfigured, tableIds } from '../../_lib/airtable.js';

const STAGES = [
  'Listed', 'Messaged', 'Replied', 'Form submitted',
  'Screened', 'Vetting', 'Approved', 'Active', 'Preferred',
];

const PIPELINE = new Set(['Listed', 'Messaged', 'Replied', 'Form submitted', 'Screened', 'Vetting']);
const ALL_TRADES = [
  'Framing', 'Electrical', 'Cornice & Trim', 'Carpentry', 'Drywall & Paint',
  'HVAC', 'Landscaping', 'Concrete', 'Plumbing', 'Roofing', 'Flooring & Tile',
  'Cabinets & Countertops', 'Siding', 'Windows & Doors', 'Insulation',
  'Masonry', 'Fencing', 'Demolition', 'Hauling', 'Final Clean', 'Gutters',
  'Garage Doors', 'Low Voltage', 'Solar',
];

// Airtable records are { id, createdTime, fields }. Trades live under
// .fields — reading lead.Trades directly silently yields nothing.
function tradesOf(rec) {
  const t = rec?.fields?.Trades;
  if (!t) return [];
  return Array.isArray(t) ? t : [t];
}

// "Available" can be recorded either as the structured select (Capacity
// Status) or as free text in the Capacity textarea the form collects.
function isAvailable(rec) {
  const status = rec?.fields?.['Capacity Status'] || '';
  const free = rec?.fields?.Capacity || '';
  return /available/i.test(status) || /available/i.test(free);
}

export async function onRequestGet({ request, env }) {
  const denial = await requireAuth(request, env);
  if (denial) return denial;

  if (!isConfigured(env)) {
    return json({ error: 'Airtable not configured (missing AIRTABLE_PAT / AIRTABLE_BASE_ID).' }, 503);
  }

  try {
    const { leads } = tableIds(env);
    const records = await listAll(env, leads, { maxRecords: 800 });

    const funnel = STAGES.map((stage) => ({
      stage,
      count: records.filter((r) => (r.fields?.Status || 'Listed') === stage).length,
    }));

    const tradeMap = new Map();
    for (const trade of ALL_TRADES) tradeMap.set(trade, { trade, total: 0, approved: 0, available: 0 });
    for (const rec of records) {
      const status = rec.fields?.Status || 'Listed';
      for (const t of tradesOf(rec)) {
        if (!tradeMap.has(t)) tradeMap.set(t, { trade: t, total: 0, approved: 0, available: 0 });
        const row = tradeMap.get(t);
        row.total += 1;
        if (status === 'Approved' || status === 'Active' || status === 'Preferred') row.approved += 1;
        if (status === 'Approved' && isAvailable(rec)) row.available += 1;
      }
    }

    const tradeRows = [...tradeMap.values()].sort((a, b) => b.total - a.total || a.trade.localeCompare(b.trade));

    const messaged = funnel.find((f) => f.stage === 'Messaged')?.count || 0;
    const replied = funnel.find((f) => f.stage === 'Replied')?.count || 0;

    const weekAgo = Date.now() - 7 * 86400 * 1000;
    const thisWeek = records.filter((r) => new Date(r.createdTime || 0).getTime() > weekAgo).length;

    // COI expiry warnings: any record with a COI expiry date within 30 days.
    let coiExpiring = 0;
    const soon = Date.now() + 30 * 86400 * 1000;
    for (const rec of records) {
      const exp = rec.fields?.['COI Expiry'];
      if (!exp) continue;
      const t = new Date(exp).getTime();
      if (Number.isFinite(t) && t < soon) coiExpiring += 1;
    }

    return json({
      stats: {
        total: records.length,
        thisWeek,
        approved: funnel.find((f) => f.stage === 'Approved')?.count || 0,
        active: funnel.find((f) => f.stage === 'Active')?.count || 0,
        preferred: funnel.find((f) => f.stage === 'Preferred')?.count || 0,
        available: records.filter((r) =>
          ['Approved', 'Active', 'Preferred'].includes(r.fields?.Status) &&
          isAvailable(r)).length,
        awaiting: records.filter((r) => r.fields?.Status === 'Messaged').length,
        inPipeline: records.filter((r) => PIPELINE.has(r.fields?.Status || 'Listed')).length,
        replyRate: messaged ? Math.round((replied / messaged) * 100) : 0,
        tradesCovered: tradeRows.filter((t) => t.approved > 0).length,
        tradesTotal: ALL_TRADES.length,
        coiExpiring,
        funnel,
        tradeRows,
      },
    });
  } catch (e) {
    return json({ error: e.message }, 502);
  }
}
