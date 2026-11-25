// HTML templates for the internal subcontractor-network pages.
//
// These live in _lib/ (not api/) on purpose: Cloudflare Pages only
// auto-routes files under functions/api/ to HTTP handlers, so anything in
// api/ becomes a public endpoint by accident. _lib/ is bundled into every
// function that imports it and is never routable.
//
// Keeping the markup in JS (instead of static files at /network/*.html)
// guarantees the dashboard shell is never served without going through the
// auth gate in functions/network/index.js. A static HTML file would be
// world-readable even if its API data were protected.
//
// The dashboard's client script is a separate static file
// (network/dashboard.js) — it holds no secrets and no data, only UI code.

const BRAND_NAVY = '#1f3a5f';
const BRAND_ACCENT = '#c87f3a';

export function dashboardHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>Subcontractor Network · Gartex Construction</title>
<style>
  :root{
    --navy:${BRAND_NAVY}; --navy-d:#152844; --accent:${BRAND_ACCENT};
    --bg:#0d1524; --surface:#16203200; --card:#182338; --line:#27364f;
    --text:#eef3fb; --muted:#93a4bf; --ok:#3ddc97; --warn:#ffc857; --bad:#ff6b6b;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{
    font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
    background:var(--bg); color:var(--text); min-height:100vh;
    background-image:
      radial-gradient(1100px 500px at 12% -8%, rgba(31,58,95,.55), transparent 60%),
      radial-gradient(900px 420px at 92% 0%, rgba(200,127,58,.16), transparent 60%);
  }
  .wrap{max-width:1560px;margin:0 auto;padding:22px 20px 60px}
  header.top{
    display:flex;align-items:center;justify-content:space-between;gap:16px;
    flex-wrap:wrap;padding:16px 20px;margin-bottom:18px;
    background:linear-gradient(120deg,var(--navy),var(--navy-d));
    border:1px solid var(--line);border-radius:12px;
  }
  .brand{display:flex;align-items:center;gap:12px}
  .brand .mark{width:42px;height:42px;border-radius:9px;background:#fff;display:grid;place-items:center;font-weight:800;color:var(--navy);font-size:17px}
  .brand h1{font-size:19px;font-weight:700;letter-spacing:.2px}
  .brand p{font-size:12.5px;color:var(--muted);margin-top:2px}
  .top-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .btn{
    border:1px solid var(--line);background:#1d2b44;color:var(--text);
    padding:9px 15px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;
  }
  .btn:hover{background:#243453}
  .btn.primary{background:var(--accent);border-color:var(--accent);color:#1a1206}
  .btn.primary:hover{filter:brightness(1.08)}
  .btn.ghost{background:transparent}
  .tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
  .tab{
    padding:9px 16px;border-radius:8px;font-size:13.5px;font-weight:600;cursor:pointer;
    background:#141e31;border:1px solid var(--line);color:var(--muted)
  }
  .tab.active{background:var(--navy);color:#fff;border-color:var(--navy)}
  .grid{display:grid;gap:14px}
  .kpis{grid-template-columns:repeat(auto-fit,minmax(165px,1fr));margin-bottom:18px}
  .kpi{background:var(--card);border:1px solid var(--line);border-radius:11px;padding:15px 17px}
  .kpi .label{font-size:11.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);font-weight:600}
  .kpi .value{font-size:30px;font-weight:800;margin-top:7px;letter-spacing:-.5px}
  .kpi .sub{font-size:12px;color:var(--muted);margin-top:4px}
  .panel{background:var(--card);border:1px solid var(--line);border-radius:11px;padding:16px 18px}
  .panel h2{font-size:15px;font-weight:700;margin-bottom:13px;display:flex;justify-content:space-between;align-items:center;gap:10px}
  .panel h2 .hint{font-size:12px;color:var(--muted);font-weight:500}
  .cols{display:grid;grid-template-columns:repeat(6,minmax(215px,1fr));gap:12px;align-items:start}
  .col{background:#111a2b;border:1px solid var(--line);border-radius:10px;padding:11px;min-height:110px}
  .col h3{font-size:11.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:9px;display:flex;justify-content:space-between}
  .card{background:#1b2740;border:1px solid #2c3d5c;border-radius:8px;padding:10px 11px;margin-bottom:8px;cursor:pointer}
  .card:hover{border-color:var(--accent)}
  .card .name{font-size:13.5px;font-weight:700}
  .card .meta{font-size:11.5px;color:var(--muted);margin-top:3px;line-height:1.45}
  .card .tag{display:inline-block;background:#27364f;color:#cfe0f5;font-size:10.5px;padding:2px 7px;border-radius:20px;margin:5px 4px 0 0}
  .card.drag{opacity:.45}
  .col.over{outline:2px dashed var(--accent);outline-offset:2px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line)}
  th{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);font-weight:600}
  tr.clickable{cursor:pointer}
  tr.clickable:hover td{background:#1b2740}
  .pill{display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px}
  .pill.ok{background:rgba(61,220,151,.16);color:var(--ok)}
  .pill.warn{background:rgba(255,200,87,.16);color:var(--warn)}
  .pill.bad{background:rgba(255,107,107,.16);color:var(--bad)}
  .pill.info{background:rgba(147,164,191,.16);color:var(--muted)}
  .feed{max-height:520px;overflow:auto;font-size:13px}
  .feed div{padding:8px 0;border-bottom:1px solid var(--line);line-height:1.5}
  .feed .ts{color:var(--muted);font-size:11.5px;margin-right:7px;font-variant-numeric:tabular-nums}
  .two{display:grid;grid-template-columns:1.35fr .65fr;gap:14px;align-items:start}
  .coverage-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:11px}
  .cov{background:#111a2b;border:1px solid var(--line);border-radius:9px;padding:12px}
  .covhead{font-size:12.5px;color:var(--muted);margin:2px 0 11px;padding-bottom:9px;border-bottom:1px solid var(--line)}
  .covhead strong{color:var(--text);font-size:14px}
  .coval.gaps{margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}
  .gaphead{font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin-bottom:9px}
  .gaplist{display:flex;flex-wrap:wrap;gap:6px}
  .gap{font-size:11.5px;color:var(--muted);background:#0d1626;border:1px solid var(--line);border-radius:999px;padding:3px 10px}
  .cov .t{font-size:13.5px;font-weight:700;display:flex;justify-content:space-between;gap:8px}
  .cov .b{font-size:11.5px;color:var(--muted);margin-top:6px;line-height:1.5}
  .bar{height:6px;border-radius:4px;background:#22304a;margin-top:9px;overflow:hidden}
  .bar i{display:block;height:100%;background:var(--ok)}
  .bar i.low{background:var(--bad)} .bar i.mid{background:var(--warn)}
  .empty{color:var(--muted);font-size:13px;padding:14px 0}
  .drawer{position:fixed;inset:0;background:rgba(3,7,14,.72);display:none;z-index:60}
  .drawer.open{display:block}
  .drawer .panel{position:absolute;right:0;top:0;height:100%;width:min(560px,100%);overflow:auto;border-radius:0;border-right:0;background:var(--card)}
  .drawer .head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px}
  .drawer h2{font-size:18px}
  .dl{display:grid;grid-template-columns:150px 1fr;gap:7px 12px;font-size:13px}
  .dl dt{color:var(--muted);font-weight:600}
  .dl dd{word-break:break-word}
  .dl dd a{color:#8ab6f5;text-decoration:underline;text-underline-offset:2px;word-break:break-all}
  .dl dd a:hover{color:#b9d2fb}
  .toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#22304a;border:1px solid var(--line);padding:11px 18px;border-radius:9px;font-size:13px;opacity:0;transition:.25s;pointer-events:none;z-index:80}
  .toast.show{opacity:1}
  select,input,textarea{background:#111a2b;border:1px solid var(--line);color:var(--text);border-radius:7px;padding:8px 10px;font-size:13px;font-family:inherit}
  @media (max-width:1100px){.cols{grid-template-columns:repeat(3,1fr)}.two{grid-template-columns:1fr}}
  @media (max-width:640px){.cols{grid-template-columns:1fr}.kpi .value{font-size:25px}.dl{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <div class="brand">
      <div class="mark">G</div>
      <div>
        <h1>Subcontractor Network</h1>
        <p>Gartex Construction · Houston trades database</p>
      </div>
    </div>
    <div class="top-actions">
      <button class="btn ghost" id="refreshBtn">Refresh</button>
      <button class="btn ghost" id="logoutBtn">Log out</button>
    </div>
  </header>

  <nav class="tabs">
    <div class="tab active" data-view="board">Pipeline</div>
    <div class="tab" data-view="coverage">Trade coverage</div>
    <div class="tab" data-view="funnel">Funnel</div>
    <div class="tab" data-view="activity">Activity</div>
  </nav>

  <div id="banner" style="display:none"></div>

  <div class="grid kpis" id="kpis"></div>

  <div id="view-board">
    <div class="cols" id="board"></div>
  </div>

  <div id="view-coverage" style="display:none">
    <div class="panel">
      <h2>Approved &amp; available subs by trade <span class="hint">red = fewer than 2 vetted</span></h2>
      <div class="coverage-grid" id="coverage"></div>
    </div>
  </div>

  <div id="view-funnel" style="display:none">
    <div class="two">
      <div class="panel"><h2>Funnel by stage</h2><div id="funnel"></div></div>
      <div class="panel"><h2>Funnel by trade</h2><div id="funnelTrades"></div></div>
    </div>
  </div>

  <div id="view-activity" style="display:none">
    <div class="panel"><h2>Activity log <span class="hint">every bot action, newest first</span></h2><div class="feed" id="feed"></div></div>
  </div>
</div>

<div class="drawer" id="drawer">
  <div class="panel">
    <div class="head">
      <h2 id="dTitle">Lead</h2>
      <button class="btn" id="dClose">Close</button>
    </div>
    <div id="dBody"></div>
  </div>
</div>
<div class="toast" id="toast"></div>
<script src="/network/dashboard.js?v=net3"></script>
</body>
</html>`;
}

export function loginHtml(next) {
  const nextHidden = next ? `<input type="hidden" name="next" value="${String(next).replace(/"/g, '&quot;')}">` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>Sign in · Gartex Subcontractor Network</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:#0d1524;color:#eef3fb;min-height:100vh;display:grid;place-items:center;padding:20px;
    background-image:radial-gradient(900px 420px at 20% -10%,rgba(31,58,95,.6),transparent 60%)}
  .card{background:#182338;border:1px solid #27364f;border-radius:13px;padding:30px;width:min(410px,100%)}
  .mark{width:46px;height:46px;border-radius:10px;background:#fff;display:grid;place-items:center;font-weight:800;color:${BRAND_NAVY};font-size:19px;margin-bottom:16px}
  h1{font-size:20px;margin-bottom:6px}
  p{font-size:13.5px;color:#93a4bf;line-height:1.55;margin-bottom:18px}
  label{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:#93a4bf;font-weight:600;margin-bottom:6px}
  input{width:100%;background:#111a2b;border:1px solid #27364f;color:#eef3fb;border-radius:8px;padding:11px 13px;font-size:14px;font-family:inherit;margin-bottom:16px}
  button{width:100%;background:${BRAND_ACCENT};border:0;color:#1a1206;font-weight:700;font-size:14.5px;padding:12px;border-radius:8px;cursor:pointer;font-family:inherit}
  button:hover{filter:brightness(1.08)}
  .err{background:rgba(255,107,107,.13);border:1px solid rgba(255,107,107,.4);color:#ffb3b3;font-size:13px;padding:10px 12px;border-radius:8px;margin-bottom:16px}
  .banner{margin:0 0 18px;padding:14px 16px;border-radius:10px;font-size:14px;line-height:1.5}
  .banner.err{background:rgba(255,107,107,.12);border:1px solid rgba(255,107,107,.42);margin-bottom:18px}
  .banner .banner-title{font-weight:700;color:#ffb3b3;font-size:14px;margin-bottom:5px}
  .banner .banner-detail{color:#d7dee9;opacity:.92;font-size:13px}
  .foot{margin-top:18px;font-size:11.5px;color:#93a4bf;text-align:center;line-height:1.5}
</style>
</head>
<body>
  <form class="card" method="POST" action="/network/login">
    <div class="mark">G</div>
    <h1>Subcontractor Network</h1>
    <p>Internal tool. Enter the administrator token to continue.</p>
    <div id="errBox"></div>
    <label for="token">Admin token</label>
    <input id="token" name="token" type="password" autocomplete="current-password" required autofocus>
    ${nextHidden}
    <button type="submit">Sign in</button>
    <div class="foot">Gartex Construction · internal use only</div>
  </form>
</body>
</html>`;
}
