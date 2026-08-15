// Probe-only — no Resend call. If this returns 200, the function path
// is healthy. If it returns 502, something is wrong with the runtime.
export async function onRequestPost({ request, env }) {
  return new Response(JSON.stringify({
    ok: true,
    msg: 'function reachable',
    env_keys: env ? Object.keys(env) : null,
    has_api_key: !!(env && env.RESEND_API_KEY),
    lead_to: env && env.LEAD_TO,
    lead_from: env && env.LEAD_FROM,
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

export async function onRequestGet() {
  return new Response(JSON.stringify({ ok: true, msg: 'GET works' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}