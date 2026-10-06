// Cloudflare Worker for therepsheet.com. Static files come straight from dist/ (wrangler.jsonc);
// this only runs for /api/*. GET /api/rates gives market rates against USD for CNY, EUR and GBP,
// the same answer as api/rates.js on Vercel, cached at the edge for 6 hours.
const WANT = ['CNY', 'EUR', 'GBP'];

async function rates(request, ctx) {
  const cache = caches.default;
  const key = new Request(new URL('/api/rates', request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;
  const sources = [
    async () => (await (await fetch('https://api.frankfurter.app/latest?from=USD&to=' + WANT.join(','))).json()).rates,
    async () => (await (await fetch('https://open.er-api.com/v6/latest/USD')).json()).rates,
  ];
  for (const s of sources) {
    try {
      const r = await s();
      if (r && WANT.every((k) => Number(r[k]) > 0)) {
        const res = new Response(JSON.stringify(Object.fromEntries(WANT.map((k) => [k, Number(r[k])]))), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=21600' },
        });
        ctx.waitUntil(cache.put(key, res.clone()));
        return res;
      }
    } catch (e) { /* next source */ }
  }
  return new Response(JSON.stringify({ error: 'rates unavailable' }), { status: 502, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname.replace(/\/$/, '') === '/api/rates') return rates(request, ctx);
    return env.ASSETS.fetch(request);
  },
};
