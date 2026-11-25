// Client script for the /network/ dashboard.
//
// Holds NO secrets and NO data — every read goes through an authenticated
// API call. Served as a static file so it can be cached; the dashboard
// shell itself is protected by functions/network/index.js.

const STATUSES = [
  'Listed', 'Messaged', 'Replied', 'Form submitted',
  'Screened', 'Vetting', 'Approved', 'Active', 'Preferred',
];

const COLUMNS = [
  { key: 'Listed', label: 'Listed' },
  { key: 'Messaged', label: 'Messaged' },
  { key: 'Replied', label: 'Replied' },
  { key: 'Form submitted', label: 'Form' },
  { key: 'Screened', label: 'Screened' },
  { key: 'Vetting', label: 'Vetting' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Active', label: 'Active' },
];

let LEADS = [];
let VIEW = 'board';

const $ = (s) => document.querySelector(s);
const el = (t, cls, html) => {
  const n = document.createElement(t);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
};
// ── pure helpers (kept in one block so the node suite can eval it) ──
const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Render a field's VALUE as a usable control instead of dead text.
//
// The whole job of this drawer is "look at the lead, then go vet them",
// and vetting means opening the Facebook listing. A bare URL forces
// Anndy to select it and copy it by hand, on every lead, forever.
//
// Safety: the lead store holds text scraped from listings, so a value
// can contain anything. Only http/https becomes an anchor — a
// "javascript:" URL must never reach an href — and the href is escaped
// like any other text.
const URL_FIELDS = new Set(['Source Listing URL', 'Seller Profile URL']);
const isHttpUrl = (v) => /^https?:\/\//i.test(String(v || '').trim());

function fieldValue(key, value) {
  const raw = Array.isArray(value) ? value.join(', ') : value;
  const text = esc(raw);
  if (!text) return '';

  if (URL_FIELDS.has(key) && isHttpUrl(raw)) {
    return `<a href="${text}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  }
  if (key === 'Phone' && /^[\d+()\s.-]{7,}$/.test(String(raw).trim())) {
    const tel = String(raw).replace(/[^\d+]/g, '');
    return `<a href="tel:${esc(tel)}">${text}</a>`;
  }
  if (key === 'Email' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(raw).trim())) {
    return `<a href="mailto:${text}">${text}</a>`;
  }
  return text;
}
// ── end pure helpers ──

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

async function api(path, options) {
  const res = await fetch(path, Object.assign({ headers: { 'content-type': 'application/json' } }, options || {}));
  if (res.status === 401) {
    window.location.href = '/network/login';
    return null;
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text }; }
  if (!res.ok) throw new Error((data && data.error) || res.status);
  return data;
}

// ── rendering ──────────────────────────────────────────────────────────
function showBanner(msg, detail) {
  const b = $('#banner');
  if (!b) return;
  b.style.display = '';
  b.className = 'banner err';
  b.innerHTML =
    `<div class="banner-title">${esc(msg)}</div>` +
    (detail ? `<div class="banner-detail">${esc(detail)}</div>` : '');
}

function clearBanner() {
  const b = $('#banner');
  if (!b) return;
  b.style.display = 'none';
  b.innerHTML = '';
}

function renderKpis(stats) {
  const box = $('#kpis');
  box.innerHTML = '';
  const kpis = [
    { label: 'Total leads', value: stats.total, sub: stats.thisWeek + ' new this week' },
    { label: 'Approved', value: stats.approved, sub: 'vetted and usable' },
    { label: 'Available now', value: stats.available, sub: 'can start work' },
    { label: 'Awaiting reply', value: stats.awaiting, sub: 'messaged, no response' },
    { label: 'Trades covered', value: stats.tradesCovered + '/' + stats.tradesTotal, sub: 'trades with ≥1 approved' },
    { label: 'Reply rate', value: stats.replyRate + '%', sub: 'of messages sent' },
    { label: 'COI expiring', value: stats.coiExpiring, sub: 'within 30 days' },
  ];
  for (const k of kpis) {
    box.appendChild(el('div', 'kpi',
      `<div class="label">${esc(k.label)}</div><div class="value">${esc(k.value)}</div><div class="sub">${esc(k.sub)}</div>`));
  }
}

function leadCard(lead) {
  const trades = Array.isArray(lead.Trades) ? lead.Trades : (lead.Trades ? [lead.Trades] : []);
  const c = el('div', 'card');
  c.draggable = true;
  c.dataset.id = lead.__id;
  c.innerHTML =
    `<div class="name">${esc(lead.Name || 'Unnamed')}</div>` +
    `<div class="meta">${esc(lead.Company || '')}${lead.Company ? ' · ' : ''}${esc(lead.Capacity || '')}</div>` +
    trades.map((t) => `<span class="tag">${esc(t)}</span>`).join('') +
    (lead.Language ? `<span class="tag">${esc(lead.Language)}</span>` : '');
  c.addEventListener('click', () => openDrawer(lead.__id));
  c.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', lead.__id);
    c.classList.add('drag');
  });
  c.addEventListener('dragend', () => c.classList.remove('drag'));
  return c;
}

function renderBoard() {
  const board = $('#board');
  board.innerHTML = '';
  for (const col of COLUMNS) {
    const box = el('div', 'col');
    const items = LEADS.filter((l) => (l.Status || 'Listed') === col.key);
    box.appendChild(el('h3', '', `<span>${esc(col.label)}</span><span>${items.length}</span>`));
    items.forEach((l) => box.appendChild(leadCard(l)));
    if (!items.length) box.appendChild(el('div', 'empty', '—'));
    box.addEventListener('dragover', (e) => { e.preventDefault(); box.classList.add('over'); });
    box.addEventListener('dragleave', () => box.classList.remove('over'));
    box.addEventListener('drop', async (e) => {
      e.preventDefault();
      box.classList.remove('over');
      const id = e.dataTransfer.getData('text/plain');
      await setStatus(id, col.key);
    });
    board.appendChild(box);
  }
}

function renderCoverage(stats) {
  const box = $('#coverage');
  box.innerHTML = '';
  const trades = stats.tradeRows || [];
  if (!trades.length) {
    box.appendChild(el('div', 'empty', 'No trades yet.'));
    return;
  }
  for (const t of trades) {
    const lvl = t.approved >= 2 ? '' : (t.approved === 1 ? 'mid' : 'low');
    const pct = Math.min(100, (t.approved / 4) * 100);
    box.appendChild(el('div', 'cov',
      `<div class="t"><span>${esc(t.trade)}</span><span class="pill ${t.approved >= 2 ? 'ok' : (t.approved ? 'warn' : 'bad')}">${t.approved}</span></div>` +
      `<div class="b">${t.approved} approved · ${t.available} available now · ${t.total} leads</div>` +
      `<div class="bar"><i class="${lvl}" style="width:${pct}%"></i></div>`));
  }
}

function renderFunnel(stats) {
  const box = $('#funnel');
  box.innerHTML = '';
  const stages = stats.funnel || [];
  const max = Math.max(1, ...stages.map((s) => s.count));
  for (const s of stages) {
    const pct = Math.round((s.count / max) * 100);
    box.appendChild(el('div', '', `
      <div style="display:flex;justify-content:space-between;font-size:13px;margin:11px 0 5px">
        <span>${esc(s.stage)}</span><strong>${s.count}</strong>
      </div>
      <div class="bar" style="height:9px"><i style="width:${pct}%"></i></div>`));
  }
  const tb = $('#funnelTrades');
  tb.innerHTML = '';
  const rows = stats.tradeRows || [];
  tb.appendChild(el('table', '',
    '<tr><th>Trade</th><th>Leads</th><th>Approved</th><th>Avail</th></tr>' +
    rows.map((r) => `<tr><td>${esc(r.trade)}</td><td>${r.total}</td><td>${r.approved}</td><td>${r.available}</td></tr>`).join('')));
}

function renderFeed(log) {
  const box = $('#feed');
  box.innerHTML = '';
  if (!log || !log.length) { box.appendChild(el('div', 'empty', 'No activity logged yet.')); return; }
  for (const a of log) {
    box.appendChild(el('div', '',
      `<span class="ts">${esc(a.timestamp || '')}</span><strong>${esc(a.Type || '')}</strong> — ${esc(a.Detail || '')}`));
  }
}

// ── drawer ─────────────────────────────────────────────────────────────
async function openDrawer(id) {
  const lead = LEADS.find((l) => l.__id === id);
  if (!lead) return;
  $('#dTitle').textContent = lead.Name || 'Lead';
  const rows = Object.entries(lead)
    .filter(([k]) => !k.startsWith('__') && k !== 'Notes')
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${fieldValue(k, v)}</dd>`)
    .join('');
  const opts = STATUSES.map((s) => `<option ${s === lead.Status ? 'selected' : ''}>${esc(s)}</option>`).join('');
  $('#dBody').innerHTML =
    `<div style="margin-bottom:14px"><label style="font-size:11.5px;color:#93a4bf;text-transform:uppercase;letter-spacing:.07em;font-weight:600">Status</label>
     <select id="dStatus" style="width:100%;margin-top:6px">${opts}</select></div>` +
    `<dl class="dl">${rows}</dl>` +
    (lead.Notes ? `<div style="margin-top:14px"><dt style="color:#93a4bf;font-size:12px;font-weight:600">Notes</dt><div style="font-size:13px;margin-top:5px;white-space:pre-wrap">${esc(lead.Notes)}</div></div>` : '');
  $('#drawer').classList.add('open');
  $('#dStatus').addEventListener('change', async (e) => {
    await setStatus(id, e.target.value);
    $('#drawer').classList.remove('open');
  });
}

async function setStatus(id, status) {
  try {
    await api('/api/network/leads', {
      method: 'PATCH',
      body: JSON.stringify({ id, fields: { Status: status } }),
    });
    toast('Status → ' + status);
    await load();
  } catch (e) {
    toast('Error: ' + e.message);
  }
}

// ── boot ───────────────────────────────────────────────────────────────
async function load() {
  try {
    const [leads, stats, log] = await Promise.all([
      api('/api/network/leads'),
      api('/api/network/stats'),
      api('/api/network/log'),
    ]);
    if (leads === null || stats === null || log === null) return;  // redirected
    clearBanner();
    LEADS = leads && leads.leads ? leads.leads : [];
    const s = (stats && stats.stats) || {};
    renderKpis(s);
    renderBoard();
    renderCoverage(s);
    renderFunnel(s);
    renderFeed(log && log.log);
  } catch (e) {
    // A failed load must SAY SO. A toast disappears in 2.4s and leaves a
    // blank page behind, which reads as "no leads yet" — the opposite of
    // the truth. The API's own message explains what is missing.
    const msg = String(e && e.message ? e.message : e);
    const isConfig = /not configured|LEADS_API/i.test(msg);
    showBanner(
      isConfig ? 'Database not connected' : 'Could not load the dashboard',
      isConfig
        ? msg + '  — the lead database is offline until LEADS_API_URL and LEADS_API_SECRET are connected in Cloudflare Pages environment variables.'
        : msg
    );
    // Also keep the KPI row honest: show a dash rather than zeros, so a
    // missing backend never reads as "0 leads".
    const box = $('#kpis');
    if (box && !box.children.length) {
      box.innerHTML = '<div class="kpi"><div class="label">Total leads</div>' +
        '<div class="value">—</div><div class="sub">not loaded</div></div>';
    }
    toast('Load failed: ' + msg);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab').forEach((t) => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      VIEW = t.dataset.view;
      ['board', 'coverage', 'funnel', 'activity'].forEach((v) => {
        const node = document.getElementById('view-' + v);
        if (node) node.style.display = v === VIEW ? '' : 'none';
      });
    });
  });
  $('#refreshBtn').addEventListener('click', load);
  $('#dClose').addEventListener('click', () => $('#drawer').classList.remove('open'));
  $('#logoutBtn').addEventListener('click', async () => {
    await fetch('/network/logout', { method: 'POST' });
    window.location.href = '/network/login';
  });
  load();
  setInterval(load, 60000);
});
