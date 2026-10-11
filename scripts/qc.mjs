// QC photos from QCItems.com: the warehouse photos agents take of real orders of a Weidian listing.
// Our own relisted links have no orders yet, so each product is looked up by the original listing
// buyers order through: data/qc-source.json maps our id to it (matched by name and checked by Weidian
// title or first photo against the vectoreps spreadsheet, 2026-10-11); otherwise its sourceId.
//
// Saves up to MAX photos per product as qc-worker/public/img/qc/<id>_<n>.webp (720px, the same shot
// only once) and lists them in data/qc.json { "<our id>": ["/img/qc/<id>_1.webp", …] }. The photos are
// served by the separate rep-qc-img Worker (qc-worker/), shared with theweidianspreadsheet.com, because
// they would push a site Worker past Cloudflare's 20,000-file limit; FILE_CAP keeps it under that.
// Agents whose photos carry no logo come first, USFans last. QCItems' answers are cached in
// data/qc-cache/ (not in git), so a rerun only asks about listings it has not seen; --fresh asks again,
// --redo-mapped redoes every product that has an entry in qc-source.json.
//
//   node scripts/qc.mjs [--limit 50] [--fresh] [--redo-mapped]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('..', import.meta.url);
const P = (f) => fileURLToPath(new URL(f, root));
const argv = process.argv.slice(2);
const LIMIT = Number(argv[argv.indexOf('--limit') + 1]) || Infinity;
const FRESH = argv.includes('--fresh');
const REDO = argv.includes('--redo-mapped');
const MAX = 20, EDGE = 720, FILE_CAP = 19500;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const ORDER = ['kakobuy', 'acbuy', 'oopbuy', 'cnfans', 'uufinds'];
const rank = (a) => (a === 'usfans' ? 99 : ORDER.includes(a) ? ORDER.indexOf(a) : 50);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const products = JSON.parse(fs.readFileSync(P('data/products.json'), 'utf8'));
const outFile = P('data/qc.json');
const out = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
const SRC = fs.existsSync(P('data/qc-source.json')) ? JSON.parse(fs.readFileSync(P('data/qc-source.json'), 'utf8')) : {};
const DIR = P('qc-worker/public');
fs.mkdirSync(P('data/qc-cache'), { recursive: true });
fs.mkdirSync(DIR + '/img/qc', { recursive: true });
let onDisk = fs.readdirSync(DIR + '/img/qc').length;

async function lookup(p, id) {
  const file = P(`data/qc-cache/${id}.json`);
  if (!FRESH && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const url = 'https://weidian.com/item.html?itemID=' + id;
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
const queue = products.filter((p) => !out[p.id] || FRESH || (REDO && SRC[p.id])).slice(0, LIMIT);
async function one(p) {
  checked++;
  let j = await lookup(p, SRC[p.id] || p.sourceId);
  // the matched original has no QC yet: the source listing may still have some
  if (SRC[p.id] && !photoUrls(j).length) j = await lookup(p, p.sourceId);
  if (!j) { failed++; return; }
  const urls = photoUrls(j);
  // drop this product's old photos first, so a shorter new set leaves no strays behind
  for (const f of fs.readdirSync(DIR + '/img/qc')) if (f.startsWith(p.id + '_')) { fs.unlinkSync(DIR + '/img/qc/' + f); onDisk--; }
  if (!urls.length) { out[p.id] = []; return; }
  const prints = [], saved = [];
  // Kakobuy's warehouse shots are 2-4 MB originals on Aliyun OSS, which can resize them on its side
  const sized = (u) => (/kakob[uy]y\.com\//.test(u) && !u.includes('?') ? u + '?x-oss-process=image/resize,l_' + EDGE : u);
  const get = (u) => fetch(sized(u), { headers: { 'User-Agent': UA, Referer: new URL(u).origin + '/' }, signal: AbortSignal.timeout(45000) })
    .then((r) => (r.ok ? r.arrayBuffer() : null)).then((b) => b && Buffer.from(b)).catch(() => null);
  // download 8 at a time, in order, only until MAX distinct shots are saved
  for (let i = 0; i < urls.length && saved.length < MAX && onDisk < FILE_CAP; i += 8) for (const buf of await Promise.all(urls.slice(i, i + 8).map(get))) {
    if (saved.length >= MAX || onDisk >= FILE_CAP) break;
    if (!buf) continue;
    try {
      const fp = await print(buf);
      if (prints.some((x) => same(x, fp))) continue;
      prints.push(fp);
      const rel = `/img/qc/${p.id}_${saved.length + 1}.webp`;
      await sharp(buf).rotate().resize(EDGE, EDGE, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 72 }).toFile(DIR + rel);
      saved.push(rel); onDisk++;
    } catch (e) { failed++; }
  }
  out[p.id] = saved;
  if (saved.length) { withQc++; files += saved.length; console.log(`+ ${p.name.slice(0, 40).padEnd(42)} ${saved.length} photos`); }
  if (checked % 25 === 0) { fs.writeFileSync(outFile, JSON.stringify(out)); console.log(`… ${checked} checked`); }
}
// 6 products at a time (each downloads 8 photos at a time)
await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) await one(queue.shift()); }));
fs.writeFileSync(outFile, JSON.stringify(out));
if (onDisk >= FILE_CAP) console.log(`stopped at the ${FILE_CAP}-file cap of the rep-qc-img Worker`);
console.log(`checked ${checked} | with QC ${withQc} | photos saved ${files} | errors ${failed} | total with QC in file ${Object.values(out).filter((x) => x.length).length}`);
