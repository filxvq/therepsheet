// Our own QC lookup, with no key and no third party's account behind it: every QC set known for a Weidian,
// Taobao or 1688 listing, from two public sources read by this Worker:
//   QCItems  (qcitems.com/api/product): the sets Kakobuy, USFans, ACBuy, Oopbuy and others photographed, no
//            sign-in; it keeps its own cache and says "refreshing" when more is on the way.
//   GoodsQC  (goodsqc.com/api/product/getQcList): sets with size and parcel weight, original photos.
// The answer has the shape the pages already read from /api/w2c (the route keeps its name), so site.js is
// unchanged: { sets: [{ key, at, source, size, weight, images: [{ full, thumb }] }], photos, weight, dims, days,
// latest, sources }. Each source has its own timeout and a failed one never hides the other. USFans' own
// "latest photos" are read by the visitor's browser (site.js), because USFans turns Cloudflare away.
//
// Cache: 6 h when QCItems is not refreshing, 10 min when it is (more sets will be there soon) or when a source failed.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const json = (o, status = 200, cache = 'no-store') => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': cache } });

// agents whose photo host takes Aliyun's resize parameters: a small copy for the row, a big one for the viewer
const OSS = /(kakob[uy]y|usfans|acbuy)\.com\//;
const sized = (u, edge) => (OSS.test(u) && u.indexOf('?') < 0 ? u + '?x-oss-process=image/resize,l_' + edge + '/format,webp' : u);
const photo = (u) => { u = String(u).replace(/^http:/, 'https:'); return { full: sized(u, 1400), thumb: sized(u, 400) }; };
const marketUrl = (plat, id) => (plat === 'taobao' ? 'https://item.taobao.com/item.htm?id=' + id : plat === '1688' ? 'https://detail.1688.com/offer/' + id + '.html' : 'https://weidian.com/item.html?itemID=' + id);

async function fromQcitems(plat, id) {
  const r = await fetch('https://qcitems.com/api/product?url=' + encodeURIComponent(marketUrl(plat, id)), { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error('qcitems ' + r.status);
  const d = await r.json();
  if (!d || d.success === false) throw new Error('qcitems answered no');
  const sets = [];
  for (const [agent, list] of Object.entries(d.qcGroups || {})) {
    (list || []).forEach((s, i) => {
      const urls = ((s && s.photos) || []).map((x) => x && x.url).filter((u) => typeof u === 'string' && /^https?:\/\//.test(u));
      if (!urls.length) return;
      const at = Date.parse(s.orderDate || (s.photos[0] && s.photos[0].timestamp)) || 0;
      sets.push({ key: 'q-' + agent + '-' + i + '-' + at, at, source: agent, size: '', weight: 0, images: urls.map(photo) });
    });
  }
  return { sets, info: d.info || {}, refreshing: !!d.refreshing };
}

async function fromGoodsqc(id) {
  const sets = [];
  for (let page = 1; page <= 2; page++) {
    const r = await fetch('https://www.goodsqc.com/api/product/getQcList?origin_product_id=' + id + '&page=' + page + '&limit=50&group_max_num=50', { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error('goodsqc ' + r.status);
    const j = await r.json();
    const d = (j && j.data) || {};
    const groups = d.qc_image_list || [];
    for (const g of groups) {
      const seen = new Set();
      let size = '', weight = 0, dims = null;
      const images = [];
      for (const x of g.list || []) {
        const u = x.image || x.origin_image;   // GoodsQC's own copy (CloudFront); the agent's original address (hahbuy) answers 403 to other sites
        if (!u || seen.has(x.origin_image_md5 || u)) continue;
        seen.add(x.origin_image_md5 || u);
        images.push(photo(u));
        const qi = x.qc_info;
        if (qi) {
          if (!size && qi.size_attr && Array.isArray(qi.size_attr.enumValue) && qi.size_attr.enumValue[0]) size = String(qi.size_attr.enumValue[0].valueEn || '').slice(0, 40);
          if (!weight && qi.weight > 0) weight = qi.weight;
          if (!dims && qi.length > 0) dims = [qi.length, qi.width, qi.height];
        }
      }
      if (!images.length) continue;
      const at = (Number(g.createtime) || 0) * 1000;
      // GoodsQC photographs six shots per order and groups orders by size: a group of 12 or 18 is two or three orders
      const per = images.length > 6 && images.length % 6 === 0 ? 6 : images.length;
      for (let k = 0; k < images.length; k += per) sets.push({ key: 'g-' + g.group_name + '-' + k, at, source: 'goodsqc', size, weight, dims, images: images.slice(k, k + per) });
    }
    if (groups.length < 50 || sets.length >= (d.qc_image_list_total || 0)) break;
  }
  return { sets };
}

// GET /api/w2c?plat=weidian|taobao|1688&id=<number>
export async function qcOwn(request, env, ctx) {
  const q = new URL(request.url).searchParams;
  const id = q.get('id') || '';
  const plat = ['weidian', 'taobao', '1688'].includes(q.get('plat')) ? q.get('plat') : 'weidian';
  if (!/^\d{6,20}$/.test(id)) return json({ sets: [], error: 'bad id' }, 400);
  const cache = caches.default;
  const key = new Request(new URL('/api/w2c?v=8&plat=' + plat + '&id=' + id, request.url).toString());
  const hit = await cache.match(key);
  if (hit) { const h = new Response(hit.body, hit); h.headers.set('cache-control', 'public, max-age=300'); return h; }

  const [qi, gq] = await Promise.allSettled([fromQcitems(plat, id), fromGoodsqc(id)]);
  const sources = [
    { source: 'qcitems', status: qi.status === 'fulfilled' ? 'ok' : 'error', count: qi.status === 'fulfilled' ? qi.value.sets.length : 0 },
    { source: 'goodsqc', status: gq.status === 'fulfilled' ? 'ok' : 'error', count: gq.status === 'fulfilled' ? gq.value.sets.length : 0 },
  ];
  const sets = [...(qi.status === 'fulfilled' ? qi.value.sets : []), ...(gq.status === 'fulfilled' ? gq.value.sets : [])].sort((a, b) => (b.at || 0) - (a.at || 0));
  if (!sets.length && qi.status === 'rejected' && gq.status === 'rejected') return json({ sets: [], error: 'unavailable', sources }, 502);

  const info = qi.status === 'fulfilled' ? qi.value.info : {};
  const gdims = sets.find((s) => s.dims);
  const out = {
    item: null,
    title: info.titleEn || info.title || '',
    image: info.image || '',
    priceCny: info.price > 0 ? info.price : null,
    photos: sets.reduce((n, s) => n + s.images.length, 0), sets,
    weight: info.weight > 0 ? info.weight : (sets.find((s) => s.weight) || {}).weight || 0,
    dims: info.length > 0 ? [info.length, info.width, info.height] : (gdims ? gdims.dims : null),
    days: info.avgArrivalDays > 0 ? info.avgArrivalDays : 0,
    latest: sets.length ? sets[0].at : 0,
    sources,
  };
  const settled = sets.length > 0 && qi.status === 'fulfilled' && !qi.value.refreshing && gq.status === 'fulfilled';
  const res = json(out, 200, 'public, max-age=300, s-maxage=' + (settled ? 21600 : 600));
  ctx.waitUntil(cache.put(key, res.clone()));
  const back = new Response(res.body, res); back.headers.set('cache-control', 'public, max-age=300');
  return back;
}
