// QC photos from QCItems.com: the warehouse photos agents take of real orders of a Weidian listing.
// Our own relisted links have no orders yet, so each product is looked up by its source listing
// (sourceId), the one buyers have been ordering through.
//
// Saves up to MAX photos per product as public/img/qc/<id>_<n>.webp (720px, the same shot only once)
// and lists them in data/qc.json { "<our id>": ["/img/qc/<id>_1.webp", …] }. Agents whose photos
// carry no logo come first, USFans last. QCItems' answers are cached in data/qc-cache/ (not in git),
// so a rerun only asks about listings it has not seen; --fresh asks again.
//
//   node scripts/qc.mjs [--limit 50] [--fresh]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('..', import.meta.url);
const P = (f) => fileURLToPath(new URL(f, root));
const argv = process.argv.slice(2);
const LIMIT = Number(argv[argv.indexOf('--limit') + 1]) || Infinity;
const FRESH = argv.includes('--fresh');
const MAX = 20, EDGE = 720;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const ORDER = ['kakobuy', 'acbuy', 'oopbuy', 'cnfans', 'uufinds'];
const rank = (a) => (a === 'usfans' ? 99 : ORDER.includes(a) ? ORDER.indexOf(a) : 50);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const products = JSON.parse(fs.readFileSync(P('data/products.json'), 'utf8'));
const outFile = P('data/qc.json');
const out = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
fs.mkdirSync(P('data/qc-cache'), { recursive: true });
fs.mkdirSync(P('public/img/qc'), { recursive: true });

async function lookup(p) {
  const file = P(`data/qc-cache/${p.sourceId}.json`);
  if (!FRESH && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const url = 'https://weidian.com/item.html?itemID=' + p.sourceId;
  for (let k = 1; k <= 3; k++) {
    try {
      const r = await fetch('https://qcitems.com/api/product?url=' + encodeURIComponent(url), { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
      const j = await r.json();
      fs.writeFileSync(file, JSON.stringify(j));
      await sleep(350);
      return j;
    } catch (e) { await sleep(1500 * k); }
  }
  return null;
}
function photoUrls(j) {
  const g = (j && j.qcGroups) || {}, list = [];
  for (const a of Object.keys(g).sort((x, y) => rank(x) - rank(y)))
    for (const set of g[a] || []) for (const f of set.photos || []) {
      const u = typeof f === 'string' ? f : f && f.url;
      if (u && !list.includes(u)) list.push(u);
    }
  return list;
}
// 16×16 grey thumbnail: two photos that differ by only a few levels on average are the same shot
const print = (buf) => sharp(buf).rotate().resize(16, 16, { fit: 'fill' }).greyscale().raw().toBuffer();
const same = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length < 6; };

let checked = 0, withQc = 0, files = 0, failed = 0;
for (const p of products) {
  if (checked >= LIMIT) break;
  if (out[p.id] && !FRESH) continue;
  checked++;
  const j = await lookup(p);
  if (!j) { failed++; continue; }
  const urls = photoUrls(j);
  if (!urls.length) { out[p.id] = []; continue; }
  const prints = [], saved = [];
  for (const u of urls) {
    if (saved.length >= MAX) break;
    try {
      const r = await fetch(u, { headers: { 'User-Agent': UA, Referer: new URL(u).origin + '/' }, signal: AbortSignal.timeout(45000) });
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      const fp = await print(buf);
      if (prints.some((x) => same(x, fp))) continue;
      prints.push(fp);
      const rel = `/img/qc/${p.id}_${saved.length + 1}.webp`;
      await sharp(buf).rotate().resize(EDGE, EDGE, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 72 }).toFile(P('public' + rel));
      saved.push(rel);
    } catch (e) { failed++; }
  }
  out[p.id] = saved;
  if (saved.length) { withQc++; files += saved.length; console.log(`+ ${p.name.slice(0, 40).padEnd(42)} ${saved.length} photos`); }
  if (checked % 25 === 0) { fs.writeFileSync(outFile, JSON.stringify(out)); console.log(`… ${checked} checked`); }
}
fs.writeFileSync(outFile, JSON.stringify(out));
console.log(`checked ${checked} | with QC ${withQc} | photos saved ${files} | errors ${failed} | total with QC in file ${Object.values(out).filter((x) => x.length).length}`);
