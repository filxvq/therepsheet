// W2C QC API (w2c.basztal.dev, a friend's service): every QC set it knows for a Weidian, Taobao or
// 1688 listing. The token is the Worker secret W2C_API_KEY and never reaches the browser. Its limits
// are per token (60/min, 1000/h, 5000/day), so answers are kept in the edge cache.
//
// /product answers after ~2.5 s with what W2C already has and fetches slow sources in the background,
// so a listing nobody looked at lately comes back with one set or none. When that happens this asks
// /product/stream instead, which sends every source as it answers (2–15 s) and ends with "done";
// that full answer is cached for 6 h. Only when even the stream is cut short is the thin one kept, for
// 10 min. The same file is copied into therepsheet/worker/, weidiansheet/worker/ and
// theqcfinder/worker/; keep the copies the same.

const BASE = 'https://w2c.basztal.dev/api/v1';
const STREAM_MS = 13000;   // the most a visitor waits for the stream
const json = (o, status = 200, cache = 'no-store') => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': cache } });

const toSet = (g) => ({
  key: g.key, at: g.takenAt || 0, sku: g.sku || null, source: g.source || '',
  size: g.sku && g.sku.label ? String(g.sku.label).slice(0, 40) : '',
  weight: g.parcel && g.parcel.weightG > 0 ? g.parcel.weightG : 0,
  images: (g.images || []).filter((x) => x && /^https:\/\//.test(x.url)).map((x) => ({ full: x.url, thumb: x.thumb || x.url })),
});
function shape(item, listing, s, titleEn, gallery, sources) {
  // goodsqc photographs six shots per order and W2C groups its orders by size, so a goodsqc "set" of
  // 12 or 18 photos is two or three orders: split it back into sets of six
  const sets = gallery.map(toSet).filter((g) => g.images.length).flatMap((g) => g.source === 'goodsqc' && g.images.length > 6 && g.images.length % 6 === 0
    ? Array.from({ length: g.images.length / 6 }, (_, i) => ({ ...g, key: g.key + '-' + i, images: g.images.slice(i * 6, i * 6 + 6) }))
    : [g]);
  s = s || {};
  return {
    item: item || null,
    title: titleEn || (listing && listing.title) || '',
    image: (listing && listing.images && listing.images[0]) || '',
    priceCny: Array.isArray(s.priceCny) ? s.priceCny[0] : (listing && listing.priceCnyMin) || null,
    photos: s.photos || sets.reduce((a, g) => a + g.images.length, 0), sets,
    weight: s.weightG || 0, dims: Array.isArray(s.dimensionsCm) && s.dimensionsCm.length === 3 ? s.dimensionsCm : null,
    days: s.avgArrivalDays || 0, latest: s.latestQcAt || 0,
    // which of W2C's sources answered and how many photos each had (for checking a thin result)
    sources: (sources || []).map((x) => ({ source: x.source, status: x.status, count: x.count || 0 })),
  };
}

// read /product/stream (one JSON object per line) until "done" or the time runs out
async function viaStream(what, token) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), STREAM_MS);
  const bySet = new Map();
  let item = null, listing = null, summary = null, titleEn = '', order = null, done = false, sources = [];
  try {
    const r = await fetch(BASE + '/product/stream?' + what + '&skus=0', { headers: { Authorization: 'Bearer ' + token, Accept: 'application/x-ndjson' }, signal: ctl.signal });
    if (!r.ok || !r.body) return null;
    const reader = r.body.getReader(), dec = new TextDecoder();
    let buf = '';
    const take = (ev) => {
      if (!ev || !ev.type) return;
      if (ev.type === 'item' && ev.item) item = ev.item;
      if ((ev.type === 'snapshot' || ev.type === 'listing') && ev.listing) listing = ev.listing;
      if (ev.titleEn) titleEn = ev.titleEn;
      if (ev.summary) summary = ev.summary;
      if (Array.isArray(ev.sets)) ev.sets.forEach((g) => g && g.key && bySet.set(g.key, g));
      if (ev.type === 'source' && ev.source) sources.push(typeof ev.source === 'object' ? ev.source : { source: ev.source, status: 'ok' });
      if (ev.type === 'done') { done = true; if (Array.isArray(ev.galleryKeys)) order = ev.galleryKeys; if (Array.isArray(ev.sources)) sources = ev.sources; }
    };
    while (!done) {
      const { value, done: end } = await reader.read();
      if (end) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if (line) { try { take(JSON.parse(line)); } catch (e) { /* a broken line is skipped */ } }
      }
    }
    if (buf.trim()) { try { take(JSON.parse(buf)); } catch (e) {} }
    try { reader.cancel(); } catch (e) {}
  } catch (e) { /* aborted: use what came in */ } finally { clearTimeout(timer); }
  // final order from "done"; without it, newest first
  const gallery = order ? order.map((k) => bySet.get(k)).filter(Boolean) : [...bySet.values()].sort((a, b) => (b.takenAt || 0) - (a.takenAt || 0));
  return { out: shape(item, listing, summary, titleEn, gallery, sources), done };
}

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
  const key = new Request(new URL('/api/w2c?v=5&' + what, request.url).toString());
  const hit = await cache.match(key);
  // whatever the cached copy says, a browser keeps the answer 5 min
  if (hit) { const h = new Response(hit.body, hit); h.headers.set('cache-control', 'public, max-age=300'); return h; }
  try {
    const r = await fetch(BASE + '/product?' + what + '&skus=0', { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } });
    if (r.status === 429) return json({ sets: [], error: 'busy', retryAfter: Number(r.headers.get('retry-after')) || 60 }, 503);
    if (!r.ok) return json({ sets: [], error: 'w2c ' + r.status }, r.status === 422 || r.status === 409 ? 200 : 502);
    const d = await r.json();
    let out = shape(d.item, d.listing, d.summary, d.titleEn, d.gallery || [], d.sources);
    let full = out.sets.length >= 3;
    // a thin first answer: wait for every source on the stream
    if (!full) {
      const st = await viaStream(what, token);
      if (st && st.out.sets.length >= out.sets.length) out = st.out;
      // a listing with fewer than 3 sets may still get more (or a source of W2C may be failing): keep it 10 min
      full = out.sets.length >= 3;
    }
    // the browser keeps it 5 min (s-maxage is what Cloudflare's cache goes by), so a fix on our side or
    // new photos at W2C reach visitors soon
    const res = json(out, 200, 'public, max-age=300, s-maxage=' + (full ? 21600 : 600));
    ctx.waitUntil(cache.put(key, res.clone()));
    const back = new Response(res.body, res); back.headers.set('cache-control', 'public, max-age=300');
    return back;
  } catch (e) {
    return json({ sets: [], error: 'unavailable' }, 502);
  }
}
