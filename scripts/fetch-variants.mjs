// Reads the variant groups (colour, size, …) off each product's page on the source sheet and writes
// data/variants.json: { "<our listing id>": [{ label: "colour", options: [{ t: "1", img: "<url>" }] }] }.
// Pages already in the file are skipped, so it can be stopped and rerun.
import fs from 'node:fs';

const root = new URL('..', import.meta.url);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36';
const products = JSON.parse(fs.readFileSync(new URL('data/products.json', root), 'utf8'));
const source = new Map(JSON.parse(fs.readFileSync(new URL('data/source.json', root), 'utf8')).map((s) => [s.sourceId, s]));
const outFile = new URL('data/variants.json', root);
const out = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parse(html) {
  const groups = [];
  for (const g of html.split('<div class="variant-group"').slice(1)) {
    const label = unesc((g.match(/class="variant-label"[^>]*>([^<]*)/) || [])[1] || '').trim();
    const options = [];
    for (const b of g.split('<button').slice(1)) {
      if (!/variant-option/.test(b.slice(0, 200))) continue;
      const t = unesc((b.match(/title="([^"]*)"/) || [])[1] || '').trim();
      const img = (b.match(/data-image="([^"]+)"/) || [])[1] || null;
      if (t || img) options.push(img ? { t, img } : { t });
    }
    if (label && options.length) groups.push({ label, options });
    if (/<\/section>/.test(g)) break;
  }
  return groups;
}

const todo = products.filter((p) => !(p.id in out));
console.log(todo.length, 'pages to read');
let done = 0;
async function one(p) {
  const s = source.get(p.sourceId);
  if (!s) { out[p.id] = []; return; }
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(s.page, { headers: { 'User-Agent': UA } }).catch(() => null);
    if (r && r.ok) { out[p.id] = parse(await r.text()); return; }
    if (r && r.status === 404) { out[p.id] = []; return; }
    await sleep(2000 * (attempt + 1));
  }
}
const queue = [...todo];
await Promise.all(Array.from({ length: 3 }, async () => {
  while (queue.length) {
    await one(queue.shift());
    if (++done % 50 === 0) { fs.writeFileSync(outFile, JSON.stringify(out)); console.log(done); }
    await sleep(150);
  }
}));
fs.writeFileSync(outFile, JSON.stringify(out));
const all = Object.values(out);
const imgs = all.flatMap((gs) => gs.flatMap((g) => g.options.filter((o) => o.img)));
console.log('done', all.length, '| with variants', all.filter((g) => g.length).length, '| option images', imgs.length,
  '| labels', [...new Set(all.flatMap((gs) => gs.map((g) => g.label.toLowerCase())))].slice(0, 30).join(', '));
