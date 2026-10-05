// Joins the two inputs into data/products.json, the one file the site is built from.
//
//   data/source.json   name, category and photo per Weidian listing, from scripts/fetch-source.mjs
//   data/panda-map.csv our own relisted copy of each listing, exported from the Panda talent panel:
//                      source_url (the listing above) -> wd_product_id (ours) + price in yuan
//
// The key between them is the source listing's itemID. A listing missing from either side is
// left out and reported. Slugs are assigned once and then kept: an existing products.json is
// read first, so renaming an item later never changes its address.
import fs from 'node:fs';

const D = (f) => new URL('../data/' + f, import.meta.url);
const source = JSON.parse(fs.readFileSync(D('source.json'), 'utf8'));

function parseCsv(text) {
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.replace(/^﻿/, ''), r[i]])));
}
const panda = new Map();
for (const r of parseCsv(fs.readFileSync(D('panda-map.csv'), 'utf8'))) {
  const id = (r.source_url.match(/itemI[dD]=(\d+)/) || [])[1];
  if (id) panda.set(id, { wd: r.wd_product_id, cny: Math.round(Number(r.price_cny) * 100) / 100 });
}

export const CATEGORIES = [
  ['shoes', 'Shoes', 'shoes'],
  ['jackets', 'Jackets & Vests', 'jackets'],
  ['hoodies sweaters', 'Hoodies & Sweaters', 'hoodies'],
  ['t shirts', 'T-Shirts', 't-shirts'],
  ['tracksuits', 'Tracksuits', 'tracksuits'],
  ['pants', 'Pants', 'pants'],
  ['shorts', 'Shorts', 'shorts'],
  ['headwear', 'Hats & Beanies', 'hats'],
  ['bags', 'Bags', 'bags'],
  ['accessories', 'Accessories', 'accessories'],
  ['other stuff', 'Other Finds', 'other'],
];
const catBySource = new Map(CATEGORIES.map(([s, , slug]) => [s, slug]));

// Brand is read off the start of the name. Longest alias first, so "Air Jordan" wins over "Air".
const BRANDS = {
  'Balenciaga': ['balenciaga'], 'Nike': ['nike', 'nikex', 'air force', 'airforce', 'air max', 'dunk', 'nocta', 'acg', 'kobe', 'air'],
  'Jordan': ['jordan', 'air jordan', 'jumpman', 'jumpan'], 'Chrome Hearts': ['chrome hearts', 'chrome heart'],
  'Moncler': ['moncler'], 'Louis Vuitton': ['louis vuitton', 'lv'], 'Corteiz': ['corteiz', 'cortiez', 'crtz'],
  'Ralph Lauren': ['ralph lauren', 'polo ralph lauren', 'polo'], 'Dior': ['dior', 'christian dior'], 'Gucci': ['gucci'],
  'Stone Island': ['stone island'], 'Stussy': ['stussy', 'stüssy'], 'Burberry': ['burberry'], 'Supreme': ['supreme'],
  'Prada': ['prada'], 'Amiri': ['amiri'], 'Syna World': ['syna world', 'syna'], 'BAPE': ['bape', 'bapesta', 'a bathing ape'],
  'Adidas': ['adidas', 'yeezy'], 'Canada Goose': ['canada goose'], 'Gallery Dept': ['gallery dept', 'gallery department'],
  'Essentials': ['essentials', 'fear of god essentials', 'fear of god'], 'Maison Margiela': ['maison margiela', 'masion margiela', 'margiela', 'mm6'],
  'ERD': ['erd', 'enfants riches deprimes', 'enfants riches déprimés', 'enfans riches deprimes'], 'Rick Owens': ['rick owens', 'rick'],
  'Palm Angels': ['palm angels'], 'Trapstar': ['trapstar'], 'Goyard': ['goyard'], 'Hellstar': ['hellstar'],
  'Carhartt': ['carhartt'], 'Acne Studios': ['acne studios', 'acne'], 'Vetements': ['vetements'], 'Crocs': ['crocs'],
  'Lacoste': ['lacoste'], 'AMI Paris': ['ami paris', 'ami'], 'Lululemon': ['lululemon', 'lulu'], 'LEGO': ['lego'],
  'Kenzo': ['kenzo'], 'Ken Carson': ['ken carson'], 'C.P. Company': ['cp company', 'c.p. company', 'cp'], 'Travis Scott': ['travis scott', 'cactus jack'],
  'Off-White': ['off-white', 'offwhite', 'off white'], 'Cartier': ['cartier'], 'Rolex': ['rolex'],
  'Comme des Garçons': ['cdg', 'comme des garcons', 'comme des garçons'], 'The North Face': ['tnf', 'the north face', 'north face'],
  'Vivienne Westwood': ['vivienne westwood', 'vivienne'], "Arc'teryx": ["arc'teryx", 'arcteryx', 'arc teryx'],
  'Number (N)ine': ['number nine', 'number (n)ine'], 'Miu Miu': ['miu miu'], 'MCM': ['mcm'], 'Moose Knuckles': ['moose knuckles'],
  'Oakley': ['oakley'], 'Apple': ['apple', 'airpods'], 'Casablanca': ['casablanca'], 'Celine': ['celine'], 'Sp5der': ['sp5der', 'spider'],
  'Richard Mille': ['richard mille'], 'Alexander McQueen': ['alexander mcqueen', 'mcqueen'], 'UGG': ['ugg'], 'Asics': ['asics'],
  'Vlone': ['vlone'], 'Audemars Piguet': ['audemars piguet', 'ap'], 'Timberland': ['timberland'], 'Saint Laurent': ['ysl', 'saint laurent'],
  'Patagonia': ['patagonia'], 'Valentino': ['valentino'], 'Palace': ['palace'], 'Represent': ['represent'], 'Hermès': ['hermes', 'hermès', 'herms'],
  'Revenge': ['revenge'], 'Diesel': ['diesel'], 'New Balance': ['new balance', 'nb'], 'Chanel': ['chanel'], 'Golden Goose': ['golden goose'],
  'Lanvin': ['lanvin'], 'Puma': ['puma'], 'Maison Mihara Yasuhiro': ['mihara', 'maison mihara'], 'Jacquemus': ['jacquemus'],
  'Coach': ['coach'], 'Fendi': ['fendi'], 'Patek Philippe': ['patek philippe', 'patek'], 'Calvin Klein': ['calvin klein'],
  'Hugo Boss': ['hugo boss', 'hugo'], 'Evisu': ['evisu'], 'Omega': ['omega'], 'Van Cleef & Arpels': ['van cleef', 'vancleef'],
  'Swarovski': ['swarovski'], 'Rimowa': ['rimowa'], 'Under Armour': ['under armour'], 'Takashi Murakami': ['takashi murakami', 'takashi'],
  'Denim Tears': ['denim tears'], 'Broken Planet': ['broken planet'], 'Purple Brand': ['purple brand'], 'Thug Club': ['thug club'],
  'Grailz': ['grailz', 'graliz'], 'Mertra': ['mertra'], 'Homixide': ['homixide'], 'Six Sense': ['six sense'], 'Ancellm': ['ancellm'],
  'Bearbrick': ['bearbrick'], 'MLB': ['mlb'], 'Jaded London': ['jaded london'], 'JBL': ['jbl'], 'Dyson': ['dyson'], 'Samsung': ['samsung'],
  'Givenchy': ['givenchy'], 'Christian Louboutin': ['christian louboutin', 'louboutin'], 'MSCHF': ['mschf'],
  'G-Shock': ['gshock', 'g-shock'], 'Corvidae': ['corvidae'], 'Derschutze': ['derschutze'], 'JNCO': ['jnco'], 'Playboi Carti': ['playboi carti', 'playboicarti'],
};
const ALIASES = Object.entries(BRANDS).flatMap(([b, as]) => as.map((a) => [a, b])).sort((x, y) => y[0].length - x[0].length);
function brandOf(name) {
  // "Best Budget LV Belt" is an LV belt: the sheet's quality labels come before the brand
  const n = name.toLowerCase().replace(/[’`]/g, "'").replace(/^((best|budget|cheap|batch|top)\s+)+/, '');
  for (const [a, b] of ALIASES) {
    if (n.startsWith(a) && !/[a-z0-9]/.test(n[a.length] || ' ')) return b;
  }
  return null;
}

const SMALL = new Set(['x', 'and', 'of', 'with', 'the', 'in', 'on', 'for', 'a']);
function tidyName(s) {
  return s.replace(/\s+/g, ' ').trim().split(' ').map((w, i) => {
    if (w !== w.toLowerCase() || !/^[a-z]/.test(w)) return w;            // keep LV, CDG, 2024, Jordan
    if (i > 0 && SMALL.has(w)) return w;
    return w[0].toUpperCase() + w.slice(1);
  }).join(' ');
}
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';

// earlier slugs stay put
const previous = fs.existsSync(D('products.json')) ? JSON.parse(fs.readFileSync(D('products.json'), 'utf8')) : [];
const keptSlug = new Map(previous.map((p) => [p.sourceId, p.slug]));
const taken = new Set(previous.map((p) => p.category + '/' + p.slug));

const products = [];
const missing = [];
for (const s of source) {
  const m = panda.get(s.sourceId);
  if (!m) { missing.push(s.sourceId + ' ' + s.name); continue; }
  const category = catBySource.get(s.category);
  if (!category) throw new Error('unknown category ' + s.category);
  const name = tidyName(s.name);
  let slug = keptSlug.get(s.sourceId);
  if (!slug) {
    const base = slugify(name);
    slug = base;
    for (let n = 2; taken.has(category + '/' + slug); n++) slug = base + '-' + n;
    taken.add(category + '/' + slug);
  }
  products.push({ id: m.wd, sourceId: s.sourceId, name, brand: brandOf(name), category, slug, cny: m.cny, srcImg: s.img });
}
fs.writeFileSync(D('products.json'), JSON.stringify(products, null, 1));
const unbranded = products.filter((p) => !p.brand);
console.log('products', products.length, '| not on panel', missing.length, '| no brand', unbranded.length);
if (missing.length) console.log('not on panel:\n ' + missing.join('\n '));
const bc = {}; products.forEach((p) => p.brand && (bc[p.brand] = (bc[p.brand] || 0) + 1));
console.log(Object.entries(bc).sort((a, b) => b[1] - a[1]).map((e) => e.join(':')).join(' '));
console.log('unbranded sample:', unbranded.slice(0, 60).map((p) => p.name).join(' | '));
