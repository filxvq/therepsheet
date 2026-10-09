// Copies the colour/version photos from data/variants.json to our own files, so swatches no longer load
// from another site's CDN. Each photo is resized to at most 480 px and saved as WebP under
// img-worker/public/v/<name>.webp; build.mjs points a swatch at /v/<name>.webp once its file exists.
// They are served by a second Worker (img-worker/) on therepsheet.com/v/*, because 19.5k extra files
// do not fit in the main site's 20,000-file limit.
//
// Run: node scripts/variant-images.mjs   (safe to rerun: files already saved are skipped)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'img-worker/public/v');
fs.mkdirSync(OUT, { recursive: true });
const variants = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/variants.json'), 'utf8'));

const urls = new Set();
for (const groups of Object.values(variants)) for (const g of groups) for (const o of g.options) if (/^https:\/\//.test(o.img || '')) urls.add(o.img);
export const localName = (u) => path.basename(new URL(u).pathname).replace(/\.[a-z0-9]+$/i, '') + '.webp';
const todo = [...urls].filter((u) => !fs.existsSync(path.join(OUT, localName(u))));
console.log(`${urls.size} photos, ${urls.size - todo.length} already saved, ${todo.length} to fetch`);

let done = 0, failed = 0, at = 0;
async function one(u) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (r.status === 404) { failed++; return; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      const out = await sharp(buf).rotate().resize(480, 480, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
      fs.writeFileSync(path.join(OUT, localName(u)), out);
      done++; return;
    } catch (e) { if (attempt === 3) { failed++; return; } await new Promise((r) => setTimeout(r, 1500 * attempt)); }
  }
}
// six at a time, so the source CDN is not hammered
await Promise.all(Array.from({ length: 6 }, async () => { while (at < todo.length) { const u = todo[at++]; await one(u); if ((done + failed) % 500 === 0) console.log(`${done + failed}/${todo.length} (${failed} failed)`); } }));
console.log(`saved ${done}, failed ${failed}`);
