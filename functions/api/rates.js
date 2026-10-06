// Cloudflare Pages Function: GET /api/rates, the same answer as api/rates.js gives on Vercel.
// Market rates against USD for CNY, EUR and GBP; kept in Cloudflare's edge cache for 6 hours so
// visitors share one upstream call.
export async function onRequest(context) {
  const cache = caches.default;
  const key = new Request(new URL('/api/rates', context.request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;
  const want = ['CNY', 'EUR', 'GBP'];
  const sources = [
    async () => (await (await fetch('https://api.frankfurter.app/latest?from=USD&to=' + want.join(','))).json()).rates,
    async () => (await (await fetch('https://open.er-api.com/v6/latest/USD')).json()).rates,
  ];
  for (const s of sources) {
    try {
      const r = await s();
      if (r && want.every((k) => Number(r[k]) > 0)) {
        const res = new Response(JSON.stringify(Object.fromEntries(want.map((k) => [k, Number(r[k])]))), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=21600' },
        });
        context.waitUntil(cache.put(key, res.clone()));
        return res;
      }
    } catch (e) { /* next source */ }
  }
  return new Response(JSON.stringify({ error: 'rates unavailable' }), { status: 502, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
