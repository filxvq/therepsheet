// Reads every card off the source spreadsheet's listing (kakobuyspreadsheet.gg/finds/?page=N)
// and writes data/source.json: one entry per Weidian listing with the name, category, photo
// and page it had there. Run once; build.mjs never touches the network.
import fs from 'node:fs';

const BASE = 'https://kakobuyspreadsheet.gg';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36';
const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const items = [];
const seen = new Set();
for (let page = 1; page < 200; page++) {
  const r = await fetch(`${BASE}/finds/?page=${page}`, { headers: { 'User-Agent': UA } });
  if (r.status === 404) break;
  if (!r.ok) throw new Error(`page ${page}: HTTP ${r.status}`);
  const html = await r.text();
  // each card starts at its photo; split on the card wrapper's image
  const cards = html.split('<p class="card-category"').slice(1);
  if (!cards.length) break;
  // the photo sits just before the category line, so look back into the previous chunk
  const parts = html.split('<p class="card-category"');
  for (let i = 1; i < parts.length; i++) {
    const before = parts[i - 1], c = parts[i];
    const img = [...before.matchAll(/this\.src=&quot;(https:\/\/cdn\.kakobuyspreadsheet\.gg\/[^&]+)&quot;/g)].pop();
    const cat = c.match(/>([^<]*)<\/p>/);
    const title = c.match(/class="card-title-link" href="([^"]+)"[^>]*>([^<]*)<\/a>/);
    const usd = c.match(/data-usd="([^"]*)"/);
    const order = c.match(/href="(https:\/\/www\.kakobuy\.com\/item\/details\?[^"]+)"/);
    if (!title || !order) continue;
    const src = new URL(unesc(order[1])).searchParams.get('url') || '';
    const id = (src.match(/itemID=(\d+)/) || [])[1];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    items.push({
      sourceId: id,
      name: unesc(title[2]).trim(),
      category: unesc(cat ? cat[1] : '').trim(),
      usd: usd ? Number(usd[1]) : null,
      img: img ? img[1] : null,
      page: BASE + title[1],
    });
  }
  console.log('page', page, items.length);
  await sleep(400);
}
fs.writeFileSync(new URL('../data/source.json', import.meta.url), JSON.stringify(items, null, 1));
console.log('saved', items.length, 'without photo:', items.filter((x) => !x.img).length);
