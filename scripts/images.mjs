// Downloads each product's photo (srcImg in data/products.json) once into data/img-src/ and
// writes the site's own copy to public/img/<slug>-<id>.webp. Re-running only fetches what is
// missing, so it is safe to run after every prepare.mjs.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('..', import.meta.url);
const products = JSON.parse(fs.readFileSync(new URL('data/products.json', root), 'utf8'));
const srcDir = new URL('data/img-src/', root), outDir = new URL('public/img/', root);
fs.mkdirSync(srcDir, { recursive: true }); fs.mkdirSync(outDir, { recursive: true });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36';

export const imgFile = (p) => `${p.slug}-${p.id}.webp`;

let done = 0, failed = [];
async function one(p) {
  const out = new URL(imgFile(p), outDir);
  if (fs.existsSync(out)) return;
  if (!p.srcImg) { failed.push(p.name + ' (no photo)'); return; }
  const raw = new URL(p.sourceId + '.' + (p.srcImg.split('.').pop() || 'jpg'), srcDir);
  if (!fs.existsSync(raw)) {
    const r = await fetch(p.srcImg, { headers: { 'User-Agent': UA } });
    if (!r.ok) { failed.push(p.name + ' HTTP ' + r.status); return; }
    fs.writeFileSync(raw, Buffer.from(await r.arrayBuffer()));
  }
  await sharp(fileURLToPath(raw)).resize(720, 720, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(fileURLToPath(out));
  if (++done % 100 === 0) console.log(done);
}

const queue = [...products];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const p = queue.shift();
    try { await one(p); } catch (e) { failed.push(p.name + ' ' + e.message); }
  }
}));
console.log('converted', done, '| failed', failed.length);
failed.forEach((f) => console.log('  ' + f));
