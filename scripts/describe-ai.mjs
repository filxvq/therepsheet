// Writes a unique "About this rep" description for every product into data/descriptions.json
// ({ "<listing id>": "text" }), using Groq. Run once, then again after new products are added:
// it only asks for the ids that have no description yet. Saves after every batch, so it can be
// stopped and restarted at any point.
//
//   node scripts/describe-ai.mjs            (needs GROQ_API_KEY in .env.local)
//   GROQ_MODEL=... to try another model
import fs from 'node:fs';

const root = new URL('..', import.meta.url);
const env = fs.existsSync(new URL('.env.local', root)) ? fs.readFileSync(new URL('.env.local', root), 'utf8') : '';
const KEY = process.env.GROQ_API_KEY || (env.match(/^GROQ_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!KEY) { console.error('No GROQ_API_KEY in .env.local'); process.exit(1); }
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const BATCH = 10;

const products = JSON.parse(fs.readFileSync(new URL('data/products.json', root), 'utf8'));
const { CATEGORIES } = await import('../src/config.mjs');
const catName = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.name]));
const outFile = new URL('data/descriptions.json', root);
const out = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
// A description naming a material or detail the item's name does not give was made up by the model
// (it never sees the photo). These are rejected on write and, with --clean, dropped from the file
// so the run writes them again.
const DETAIL = /\b(plain|box logo|chest logo|embossed|embossing|reflective|silicone|crew[- ‑]?neck|v[- ‑]?neck|heavyweight|lightweight|cotton|leather|suede|nylon|polyester|wool|cashmere|denim|canvas|mesh|fleece|velvet|satin|silk|linen|gold|silver|stainless|long[- ‑]?sleeves?|short[- ‑]?sleeves?|sleeveless|cropped)\b/gi;
const madeUp = (p, t) => (t.match(DETAIL) || []).some((w) => !p.name.toLowerCase().includes(w.toLowerCase().replace(/[‑ ]/g, '-')) && !p.name.toLowerCase().includes(w.toLowerCase()));
if (process.argv.includes('--clean')) {
  let dropped = 0;
  for (const p of products) if (out[p.id] && madeUp(p, out[p.id])) { delete out[p.id]; dropped++; }
  console.log('dropped', dropped, 'descriptions with made-up details');
}
const todo = products.filter((p) => !out[p.id]);
console.log(`${todo.length} to write, ${Object.keys(out).length} already done, model ${MODEL}`);

const SYSTEM = `You write short product descriptions for a streetwear and fashion catalog. For each item you get its name, brand, category and price in Chinese yuan.

Write 55-90 words per item, in plain natural English, as one paragraph.
- Say what the item is and how people wear or use it, its typical style, cut or shape, and what it pairs with.
- Add one concrete, item-specific thing to check in the agent's quality-check photos (e.g. stitching on a collar, sole shape on a sneaker, hardware on a bag, print edges on a tee, dial details on a watch). Make it fit THIS item, not a generic list.
- Vary the structure between items. At most 2 of every 10 descriptions may begin with the item's name; open others with the use, the style, the brand's look, an outfit, or a question. Put the quality-check tip in a different place and phrase it differently each time (not always the last sentence, not always "when checking the photos").
- Only state facts implied by the name, brand and category, or true of every item of that type (a hoodie has a hood, sneakers have a sole). Do not invent colours, materials, fabric weight, pocket or zip placement, cuffs, collar type, sizes, editions or release years unless they are in the name. When unsure, describe the style and how it is worn instead of construction. You cannot see the item: never mention a specific logo type or placement (box logo, chest logo, embossing), reflective or grip details, a crew neck on a hoodie, or any feature the name does not give. A quality-check tip can name a part every such item has (seams, hem, sole, zipper, strap, print) without claiming what it looks like.
- Never name a material, fabric, metal or finish (cotton, leather, nylon, fleece, gold…) or a neckline, and never call an item plain, unless that word is in its name. Never use the words: rep, reps, replica, fake, counterfeit, knockoff, dupe, copy, authentic, original, retail, legit.
- No prices, no sizing advice for items that are not worn, no first-person claims ("I", "we tested"), no exclamation marks, no emojis, no marketing clichés like "elevate", "must-have", "game-changer".
- Trust the item name over the category if they disagree.

Return JSON only: {"items":[{"id":"<id>","text":"<description>"}]} with one entry per input id.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function ask(batch, attempt = 0) {
  const user = batch.map((p) => `id ${p.id}: ${p.name}${p.brand ? ` | brand ${p.brand}` : ''} | ${catName[p.category]} | ¥${p.cny}`).join('\n');
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, temperature: 0.9, reasoning_effort: 'low',
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }] }),
  });
  if (r.status === 429 || r.status >= 500) {
    const wait = Number(r.headers.get('retry-after')) * 1000 || 15000 * (attempt + 1);
    if (attempt > 6) throw new Error('gave up after rate limits');
    console.log(`  ${r.status}, waiting ${Math.round(wait / 1000)}s`);
    await sleep(wait);
    return ask(batch, attempt + 1);
  }
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || r.status);
  // the model is asked for JSON; take the outermost {...} in case it adds anything around it
  const txt = j.choices[0].message.content || '';
  const a = txt.indexOf('{'), b = txt.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('no JSON in the reply');
  return JSON.parse(txt.slice(a, b + 1)).items || [];
}

const BANNED = /\b(reps?|replicas?|fakes?|counterfeits?|knock-?offs?|dupes?|authentic|legit)\b/i;
let n = 0, bad = 0;
for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  let items;
  try { items = await ask(batch); } catch (e) { console.log('  batch failed:', e.message); continue; }
  for (const it of items) {
    const p = batch.find((x) => String(x.id) === String(it.id));
    const t = String(it.text || '').replace(/\s+/g, ' ').trim();
    const words = t.split(' ').length;
    if (!p || words < 35 || words > 130 || BANNED.test(t) || madeUp(p, t)) { bad++; continue; }   // left for the next run
    out[p.id] = t; n++;
  }
  fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
  console.log(`${Math.min(i + BATCH, todo.length)}/${todo.length}  written ${n}, rejected ${bad}`);
}
console.log(`done: ${n} new, ${bad} rejected (run again to retry those), ${Object.keys(out).length}/${products.length} total`);
