// W2C QC API (w2c.basztal.dev, a friend's service): every QC set it knows for a Weidian, Taobao or
// 1688 listing. The token is the Worker secret W2C_API_KEY and never reaches the browser. Its limits
// are per token (60/min, 1000/h, 5000/day), so answers are kept in the edge cache: 6 h for a full one,
// 10 min for a thin first answer (W2C replies after ~2.5 s with what it has and fills the rest in later).
// The same file is copied into therepsheet/worker/ and weidiansheet/worker/; keep the copies the same.

const BASE = 'https://w2c.basztal.dev/api/v1';
const json = (o, status = 200, cache = 'no-store') => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': cache } });

// GET /api/w2c?plat=weidian|taobao|1688&id=<number>   or   /api/w2c?url=<any product or agent link>
export async function w2c(request, env, ctx) {
  const q = new URL(request.url).searchParams;
  const id = q.get('id') || '';
  const plat = ['weidian', 'taobao', '1688'].includes(q.get('plat')) ? q.get('plat') : 'weidian';
  const link = q.get('url') || '';
  if (!/^\d{6,20}$/.test(id) && !/^https?:\/\//i.test(link)) return json({ sets: [], error: 'bad id' }, 400);
  if (!env.W2C_API_KEY) return json({ sets: [], error: 'not configured' });
  const token = String(env.W2C_API_KEY).trim().replace(/^Bearer\s+/i, '');
  const what = /^\d{6,20}$/.test(id) ? 'platform=' + plat + '&id=' + id : 'url=' + encodeURIComponent(link);
  const cache = caches.default;
  const key = new Request(new URL('/api/w2c?' + what, request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;
  try {
    const r = await fetch(BASE + '/product?' + what + '&skus=0', { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } });
    if (r.status === 429) return json({ sets: [], error: 'busy', retryAfter: Number(r.headers.get('retry-after')) || 60 }, 503);
    if (!r.ok) return json({ sets: [], error: 'w2c ' + r.status }, r.status === 422 || r.status === 409 ? 200 : 502);
    const d = await r.json();
    const s = d.summary || {};
    const sets = (d.gallery || []).map((g) => ({
      key: g.key, at: g.takenAt || 0, sku: g.sku || null,
      weight: g.parcel && g.parcel.weightG > 0 ? g.parcel.weightG : 0,
      images: (g.images || []).filter((x) => x && /^https:\/\//.test(x.url)).map((x) => ({ full: x.url, thumb: x.thumb || x.url })),
    })).filter((g) => g.images.length);
    const out = {
      item: d.item || null,
      title: d.titleEn || (d.listing && d.listing.title) || '',
      image: (d.listing && d.listing.images && d.listing.images[0]) || '',
      priceCny: Array.isArray(s.priceCny) ? s.priceCny[0] : (d.listing && d.listing.priceCnyMin) || null,
      photos: s.photos || sets.reduce((a, g) => a + g.images.length, 0), sets,
      weight: s.weightG || 0, dims: Array.isArray(s.dimensionsCm) && s.dimensionsCm.length === 3 ? s.dimensionsCm : null,
      days: s.avgArrivalDays || 0, latest: s.latestQcAt || 0,
    };
    const res = json(out, 200, 'public, max-age=' + (sets.length >= 3 ? 21600 : 600));
    ctx.waitUntil(cache.put(key, res.clone()));
    return res;
  } catch (e) {
    return json({ sets: [], error: 'unavailable' }, 502);
  }
}
