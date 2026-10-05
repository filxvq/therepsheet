// GET /api/rates: market rates against USD for the currencies the site shows (CNY, EUR, GBP).
// Cached at the edge for 6 hours, so visitors share one upstream call. Frankfurter (ECB reference
// rates, no key) first, open.er-api as the fallback; if both fail the page keeps its saved rates.
export default async function handler(req, res) {
  const want = ['CNY', 'EUR', 'GBP'];
  const sources = [
    async () => { const j = await (await fetch('https://api.frankfurter.app/latest?from=USD&to=' + want.join(','), { signal: AbortSignal.timeout(5000) })).json(); return j.rates; },
    async () => { const j = await (await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(5000) })).json(); return j.rates; },
  ];
  for (const s of sources) {
    try {
      const r = await s();
      if (r && want.every((k) => Number(r[k]) > 0)) {
        res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
        return res.status(200).json(Object.fromEntries(want.map((k) => [k, Number(r[k])])));
      }
    } catch (e) { /* next source */ }
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(502).json({ error: 'rates unavailable' });
}
