export async function onRequestPost({ request, env }) {
  return new Response(JSON.stringify({ msg: 'MARKER_ABC123_MINIMAL' }), {
    status: 200, headers: { 'content-type': 'application/json' }
  });
}
