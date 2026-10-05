// Builds the whole site into dist/ as plain HTML files: no server renders anything at request
// time. Every page is complete for a crawler on its own; site.js only swaps the agent in the buy
// links and the currency in the prices, and runs the search box.
//
//   /                          home
//   /<category>/               a category, 60 per page, /<category>/page/2/ ...
//   /<category>/<slug>/        a product
//   /finds/                    every product, newest first, paginated the same way
//   /brands/  /brands/<slug>/  brands with at least BRAND_PAGE_MIN items
//   /how-to-buy/  /faq/  /about/
//   sitemap.xml  robots.txt  search.json  404.html
//
// Run: node src/build.mjs   (Vercel runs it as the build command)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, NAME, CATEGORIES, AGENTS, DEFAULT_AGENT, CNY_FALLBACK, BRAND_PAGE_MIN, PER_PAGE } from './config.mjs';
import { FAQ, GUIDE, ABOUT } from './content.mjs';
import { describe } from './describe.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const products = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/products.json'), 'utf8'));
const BUILT = new Date().toISOString().slice(0, 10);
fs.rmSync(DIST, { recursive: true, force: true });

// ── helpers ──────────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const defAgent = AGENTS.find((a) => a.id === DEFAULT_AGENT);
const usd = (cny, agent = defAgent) => (cny / CNY_FALLBACK) * agent.rate;
const price = (cny) => '$' + usd(cny).toFixed(2);
const weidian = (id) => 'https://weidian.com/item.html?itemID=' + id;
const buyUrl = (id, a = defAgent) => ({
  kakobuy: () => 'https://www.kakobuy.com/item/details?url=' + encodeURIComponent(weidian(id)) + (a.code ? '&affcode=' + a.code : ''),
  usfans: () => 'https://www.usfans.com/product/3/' + id + (a.code ? '?ref=' + a.code : ''),
  sinabuy: () => 'https://www.sinabuy.com/product/2/' + id + (a.code ? '?inviteCode=' + a.code : ''),
  litbuy: () => 'https://litbuy.com/products/details?id=' + id + '&channel=WEIDIAN' + (a.code ? '&ref=' + a.code : ''),
  oopbuy: () => 'https://www.oopbuy.com/product/weidian/' + id + (a.code ? '?inviteCode=' + a.code : ''),
  acbuy: () => 'https://www.acbuy.com/product/?id=' + id + '&source=WD' + (a.code ? '&u=' + a.code : ''),
}[a.id])();
const imgOf = (p) => fs.existsSync(path.join(ROOT, 'public/img', `${p.slug}-${p.id}.webp`)) ? `/img/${p.slug}-${p.id}.webp` : '/assets/no-photo.svg';
const catById = new Map(CATEGORIES.map((c) => [c.id, c]));
const urlOf = (p) => `/${p.category}/${p.slug}/`;

// ── groupings ────────────────────────────────────────────────────────────────
// Newest first: the panel export lists our relists newest first and products.json keeps the
// source order, so "newest" is simply the order the sheet itself shows.
const byCat = new Map(CATEGORIES.map((c) => [c.id, []]));
products.forEach((p) => byCat.get(p.category).push(p));
const brandCount = new Map();
products.forEach((p) => p.brand && brandCount.set(p.brand, (brandCount.get(p.brand) || 0) + 1));
const BRANDS = [...brandCount].filter(([, n]) => n >= BRAND_PAGE_MIN).sort((a, b) => b[1] - a[1])
  .map(([name, n]) => ({ name, n, slug: slugify(name), items: products.filter((p) => p.brand === name) }));
const brandPage = new Map(BRANDS.map((b) => [b.name, b]));

// ── page shell ───────────────────────────────────────────────────────────────
function page({ title, desc, url, body, image, jsonld = [], noindex = false, active = '' }) {
  const canonical = SITE + url;
  const nav = CATEGORIES.map((c) => `<a href="/${c.id}/"${active === c.id ? ' aria-current="page"' : ''}>${esc(c.name)}</a>`).join('');
  const agentOpts = AGENTS.map((a) => `<option value="${a.id}"${a.id === DEFAULT_AGENT ? ' selected' : ''}>${esc(a.name)}</option>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
${noindex ? '<meta name="robots" content="noindex, follow">\n' : ''}<meta property="og:type" content="website">
<meta property="og:site_name" content="${NAME}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
${image ? `<meta property="og:image" content="${SITE + image}">\n` : ''}<meta name="theme-color" content="#f6f5f1">
<link rel="icon" href="/assets/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site.css?v=${BUILT}">
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body>
<header class="top">
  <div class="wrap top-row">
    <a class="logo" href="/" aria-label="${NAME} home"><span class="logo-mark">R</span><span>The<b>Rep</b>Sheet</span></a>
    <form class="search" action="/finds/" role="search" onsubmit="return false">
      <input id="q" type="search" placeholder="Search ${products.length.toLocaleString('en-US')} finds…" autocomplete="off" aria-label="Search finds">
      <div id="results" class="results" hidden></div>
    </form>
    <label class="agent-pick"><span>Agent</span><select id="agent" aria-label="Shopping agent">${agentOpts}</select></label>
    <select id="cur" aria-label="Currency"><option>USD</option><option>EUR</option><option>GBP</option></select>
  </div>
  <nav class="wrap cats" aria-label="Categories"><a href="/finds/"${active === 'finds' ? ' aria-current="page"' : ''}>All finds</a>${nav}<a href="/brands/"${active === 'brands' ? ' aria-current="page"' : ''}>Brands</a></nav>
</header>
<main class="wrap">
${body}
</main>
<footer class="foot">
  <div class="wrap foot-grid">
    <div><a class="logo" href="/"><span class="logo-mark">R</span><span>The<b>Rep</b>Sheet</span></a>
      <p>A rep spreadsheet of Weidian finds with prices and direct links for every major shopping agent. Updated ${new Date(BUILT).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}.</p></div>
    <div><h3>Catalog</h3>${CATEGORIES.slice(0, 6).map((c) => `<a href="/${c.id}/">${esc(c.reps)}</a>`).join('')}</div>
    <div><h3>More</h3>${CATEGORIES.slice(6).map((c) => `<a href="/${c.id}/">${esc(c.reps)}</a>`).join('')}<a href="/brands/">All brands</a></div>
    <div><h3>Help</h3><a href="/how-to-buy/">How to buy</a><a href="/faq/">FAQ</a><a href="/about/">About &amp; disclaimer</a></div>
  </div>
  <p class="wrap fine">${NAME} sells nothing and holds no stock: every order is placed by you with a shopping agent. Brand names only identify what an item is. Some agent links carry a referral code.</p>
</footer>
<script>window.TRS=${JSON.stringify({ agents: AGENTS.map(({ id, name, code, rate, signup, perk }) => ({ id, name, code, rate, signup, perk })), cny: CNY_FALLBACK, def: DEFAULT_AGENT })}</script>
<script src="/assets/site.js?v=${BUILT}" defer></script>
</body>
</html>`;
}

function card(p) {
  return `<article class="card">
  <a class="card-link" href="${urlOf(p)}"><img src="${imgOf(p)}" alt="${esc(p.name)}" width="360" height="360" loading="lazy" decoding="async"><span class="card-name">${esc(p.name)}</span></a>
  <div class="card-foot"><span class="price" data-cny="${p.cny}">${price(p.cny)}</span><a class="buy-mini" data-wd="${p.id}" href="${buyUrl(p.id)}" rel="nofollow sponsored noopener" target="_blank">Buy</a></div>
</article>`;
}
const grid = (list) => `<div class="grid">${list.map(card).join('\n')}</div>`;

function crumbs(items) {
  const html = `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([n, u], i) => i === items.length - 1 ? `<span>${esc(n)}</span>` : `<a href="${u}">${esc(n)}</a>`).join('<i>/</i>')}</nav>`;
  const ld = { '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + u })) };
  return [html, ld];
}

function pager(base, n, total) {
  if (total <= 1) return '';
  const href = (k) => k === 1 ? base : `${base}page/${k}/`;
  const nums = [];
  for (let k = 1; k <= total; k++) if (k === 1 || k === total || Math.abs(k - n) <= 2) nums.push(k);
  let out = '', last = 0;
  for (const k of nums) { if (k - last > 1) out += '<span class="gap">…</span>'; out += k === n ? `<span class="on">${k}</span>` : `<a href="${href(k)}">${k}</a>`; last = k; }
  return `<nav class="pager" aria-label="Pages">${n > 1 ? `<a rel="prev" href="${href(n - 1)}">← Prev</a>` : ''}${out}${n < total ? `<a rel="next" href="${href(n + 1)}">Next →</a>` : ''}</nav>`;
}

// ── writers ──────────────────────────────────────────────────────────────────
const written = [];
function write(url, html, { sitemap = true } = {}) {
  const file = url.endsWith('/') ? path.join(DIST, url, 'index.html') : path.join(DIST, url);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  if (sitemap) written.push(url);
}

function listing({ base, h1, title, desc, intro, list, crumb, active, extra = '' }) {
  const total = Math.max(1, Math.ceil(list.length / PER_PAGE));
  for (let n = 1; n <= total; n++) {
    const url = n === 1 ? base : `${base}page/${n}/`;
    const [bc, bcld] = crumbs(n === 1 ? crumb : [...crumb, [`Page ${n}`, url]]);
    const body = `${bc}
<header class="head"><h1>${esc(h1)}${n > 1 ? ` <small>page ${n}</small>` : ''}</h1>
<p class="count">${list.length.toLocaleString('en-US')} items</p>
${n === 1 && intro ? `<p class="intro">${esc(intro)}</p>` : ''}</header>
${n === 1 ? extra : ''}
${grid(list.slice((n - 1) * PER_PAGE, n * PER_PAGE))}
${pager(base, n, total)}`;
    write(url, page({ title: n === 1 ? title : `${h1} – page ${n} | ${NAME}`, desc, url, body, active, jsonld: [bcld],
      image: list[0] && imgOf(list[0]) }), { sitemap: n === 1 });
  }
}

// ── product pages ────────────────────────────────────────────────────────────
for (const p of products) {
  const cat = catById.get(p.category);
  const url = urlOf(p);
  const sameBrand = p.brand ? products.filter((x) => x.brand === p.brand && x !== p).slice(0, 8) : [];
  const ids = new Set(sameBrand);
  const near = byCat.get(p.category).filter((x) => x !== p && !ids.has(x));
  const at = byCat.get(p.category).indexOf(p);
  const similar = [...near.slice(Math.max(0, at - 4), at), ...near.slice(at, at + 8)].slice(0, 8);
  const [bc, bcld] = crumbs([['Home', '/'], [cat.name, `/${cat.id}/`], [p.name, url]]);
  const text = describe(p, { cat, catList: byCat.get(p.category), brandList: p.brand ? products.filter((x) => x.brand === p.brand) : [], usd: usd(p.cny) });
  const bp = p.brand && brandPage.get(p.brand);
  const body = `${bc}
<div class="product">
  <div class="shot"><img src="${imgOf(p)}" alt="${esc(p.name)} rep" width="720" height="720" fetchpriority="high"></div>
  <div class="info">
    ${p.brand ? `<p class="brand">${bp ? `<a href="/brands/${bp.slug}/">${esc(p.brand)}</a>` : esc(p.brand)}</p>` : ''}
    <h1>${esc(p.name)} Rep</h1>
    <p class="big-price"><span class="price" data-cny="${p.cny}">${price(p.cny)}</span> <span class="via">via <span class="agent-name">${esc(defAgent.name)}</span> · ¥${p.cny}</span></p>
    <a class="buy" data-wd="${p.id}" href="${buyUrl(p.id)}" rel="nofollow sponsored noopener" target="_blank">Buy on <span class="agent-name">${esc(defAgent.name)}</span></a>
    <a class="raw" href="${weidian(p.id)}" rel="nofollow noopener" target="_blank">Open the Weidian listing</a>
    <div class="perk" data-perk></div>
    <dl class="facts"><dt>Category</dt><dd><a href="/${cat.id}/">${esc(cat.name)}</a></dd>${p.brand ? `<dt>Brand</dt><dd>${esc(p.brand)}</dd>` : ''}<dt>Marketplace</dt><dd>Weidian</dd><dt>Listing</dt><dd>${p.id}</dd></dl>
  </div>
</div>
<section class="about-item"><h2>About this find</h2>${text.map((t) => `<p>${esc(t)}</p>`).join('')}</section>
${sameBrand.length ? `<section><h2>More ${esc(p.brand)}</h2>${grid(sameBrand)}${bp ? `<p class="more"><a href="/brands/${bp.slug}/">All ${bp.n} ${esc(p.brand)} reps →</a></p>` : ''}</section>` : ''}
${similar.length ? `<section><h2>More ${esc(cat.reps.toLowerCase())}</h2>${grid(similar)}<p class="more"><a href="/${cat.id}/">All ${byCat.get(cat.id).length} ${esc(cat.reps.toLowerCase())} →</a></p></section>` : ''}`;
  const ld = { '@context': 'https://schema.org', '@type': 'Product', name: p.name, image: SITE + imgOf(p), url: SITE + url,
    description: text[0], category: cat.name, ...(p.brand ? { brand: { '@type': 'Brand', name: p.brand } } : {}), sku: String(p.id),
    offers: { '@type': 'Offer', price: usd(p.cny).toFixed(2), priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: SITE + url } };
  write(url, page({
    title: `${p.name} Rep – ${price(p.cny)} | ${NAME}`,
    desc: `${p.name} rep for ${price(p.cny)} from a Weidian seller, with buy links for Kakobuy, USFans and other agents.`,
    url, body, image: imgOf(p), jsonld: [bcld, ld], active: p.category }));
}

// ── listings ─────────────────────────────────────────────────────────────────
for (const c of CATEGORIES) {
  const list = byCat.get(c.id);
  const brandsHere = BRANDS.filter((b) => b.items.some((p) => p.category === c.id)).slice(0, 14);
  listing({ base: `/${c.id}/`, h1: c.reps, title: `${c.reps} – ${list.length} Weidian Finds | ${NAME}`,
    desc: `${list.length} ${c.reps.toLowerCase()} with prices and buy links for Kakobuy and other agents. ${c.intro.split('. ')[0]}.`,
    intro: c.intro, list, crumb: [['Home', '/'], [c.name, `/${c.id}/`]], active: c.id,
    extra: brandsHere.length ? `<div class="chips">${brandsHere.map((b) => `<a href="/brands/${b.slug}/">${esc(b.name)}</a>`).join('')}</div>` : '' });
}
listing({ base: '/finds/', h1: 'All Rep Finds', title: `All ${products.length} Rep Finds | ${NAME}`,
  desc: `Every find on ${NAME}: ${products.length} Weidian reps across ${CATEGORIES.length} categories, with prices and agent links.`,
  list: products, crumb: [['Home', '/'], ['All finds', '/finds/']], active: 'finds' });
for (const b of BRANDS) {
  listing({ base: `/brands/${b.slug}/`, h1: `${b.name} Reps`, title: `${b.name} Reps – ${b.n} Finds | ${NAME}`,
    desc: `${b.n} ${b.name} reps from Weidian sellers, with prices and buy links for Kakobuy, USFans and other agents.`,
    list: b.items, crumb: [['Home', '/'], ['Brands', '/brands/'], [b.name, `/brands/${b.slug}/`]], active: 'brands' });
}
{
  const [bc, bcld] = crumbs([['Home', '/'], ['Brands', '/brands/']]);
  const body = `${bc}<header class="head"><h1>Rep Brands</h1><p class="intro">Every brand with at least ${BRAND_PAGE_MIN} finds in the catalog, most listed first.</p></header>
<ul class="brand-list">${BRANDS.map((b) => `<li><a href="/brands/${b.slug}/"><span>${esc(b.name)}</span><b>${b.n}</b></a></li>`).join('')}</ul>`;
  write('/brands/', page({ title: `Rep Brands A–Z | ${NAME}`, desc: `${BRANDS.length} brands with their own page on ${NAME}, from ${BRANDS.slice(0, 4).map((b) => b.name).join(', ')} down.`, url: '/brands/', body, jsonld: [bcld], active: 'brands' }));
}

// ── home ─────────────────────────────────────────────────────────────────────
{
  const tiles = CATEGORIES.map((c) => { const first = byCat.get(c.id)[0];
    return `<a class="tile" href="/${c.id}/"><img src="${imgOf(first)}" alt="" width="160" height="160" loading="lazy"><span>${esc(c.name)}</span><b>${byCat.get(c.id).length}</b></a>`; }).join('');
  const kako = AGENTS[0];
  const body = `<section class="hero">
  <h1>The rep spreadsheet, <em>sorted.</em></h1>
  <p>${products.length.toLocaleString('en-US')} Weidian finds in ${CATEGORIES.length} categories, each with its price and a direct link for Kakobuy, USFans, Sinabuy and three more agents. Pick your agent at the top and every link on the site follows it.</p>
  <div class="hero-cta"><a class="buy" href="/finds/">Browse all finds</a><a class="ghost" href="${kako.signup}" rel="nofollow sponsored noopener" target="_blank">New to Kakobuy? ${esc(kako.perk)}</a></div>
</section>
<section><h2>Categories</h2><div class="tiles">${tiles}</div></section>
<section><h2>Latest finds</h2>${grid(products.slice(0, 24))}<p class="more"><a href="/finds/">See all ${products.length} finds →</a></p></section>
<section><h2>Popular brands</h2><div class="chips">${BRANDS.slice(0, 24).map((b) => `<a href="/brands/${b.slug}/">${esc(b.name)} <b>${b.n}</b></a>`).join('')}</div></section>
<section class="split"><div><h2>How it works</h2><ol class="steps">${GUIDE.steps.slice(0, 4).map((s) => `<li><b>${esc(s.t)}</b> ${esc(s.d)}</li>`).join('')}</ol><p class="more"><a href="/how-to-buy/">Full buying guide →</a></p></div>
<div><h2>Questions</h2>${FAQ.slice(0, 4).map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}<p class="more"><a href="/faq/">All questions →</a></p></div></section>`;
  const ld = [{ '@context': 'https://schema.org', '@type': 'WebSite', name: NAME, url: SITE + '/' },
    { '@context': 'https://schema.org', '@type': 'Organization', name: NAME, url: SITE + '/', logo: SITE + '/assets/icon.svg' }];
  write('/', page({ title: `${NAME} – Rep Spreadsheet with ${products.length.toLocaleString('en-US')} Weidian Finds`,
    desc: `A rep spreadsheet of ${products.length} Weidian finds: shoes, hoodies, jackets, bags and more, with prices and links for Kakobuy, USFans and other agents.`,
    url: '/', body, jsonld: ld, image: imgOf(products[0]) }));
}

// ── guide, faq, about ────────────────────────────────────────────────────────
{
  const [bc, bcld] = crumbs([['Home', '/'], ['How to buy', '/how-to-buy/']]);
  const body = `${bc}<article class="prose"><h1>${esc(GUIDE.title)}</h1><p class="intro">${esc(GUIDE.intro)}</p>
${GUIDE.steps.map((s, i) => `<h2>${i + 1}. ${esc(s.t)}</h2><p>${esc(s.d)}</p>${s.more ? `<p>${esc(s.more)}</p>` : ''}`).join('\n')}
<h2>Which agent?</h2><p>All links on ${NAME} work with these agents. New-account offers:</p><ul>${AGENTS.filter((a) => a.perk).map((a) => `<li><a href="${a.signup}" rel="nofollow sponsored noopener" target="_blank">${esc(a.name)}</a>: ${esc(a.perk)}</li>`).join('')}</ul></article>`;
  const ld = { '@context': 'https://schema.org', '@type': 'HowTo', name: GUIDE.title, step: GUIDE.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.t, text: s.d })) };
  write('/how-to-buy/', page({ title: `How to Buy Reps from Weidian (Step by Step) | ${NAME}`, desc: GUIDE.intro.slice(0, 155), url: '/how-to-buy/', body, jsonld: [bcld, ld] }));
}
{
  const [bc, bcld] = crumbs([['Home', '/'], ['FAQ', '/faq/']]);
  const body = `${bc}<article class="prose"><h1>Rep FAQ</h1>${FAQ.map((f) => `<h2>${esc(f.q)}</h2><p>${esc(f.a)}</p>`).join('\n')}</article>`;
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
  write('/faq/', page({ title: `Rep FAQ – Agents, QC, Shipping | ${NAME}`, desc: FAQ[0].a.slice(0, 155), url: '/faq/', body, jsonld: [bcld, ld] }));
}
{
  const [bc, bcld] = crumbs([['Home', '/'], ['About', '/about/']]);
  write('/about/', page({ title: `About & Disclaimer | ${NAME}`, desc: ABOUT[0].slice(0, 155), url: '/about/',
    body: `${bc}<article class="prose"><h1>About ${NAME}</h1>${ABOUT.map((t) => `<p>${esc(t)}</p>`).join('')}</article>`, jsonld: [bcld] }));
}
write('/404.html', page({ title: `Page not found | ${NAME}`, desc: 'This page does not exist.', url: '/404.html', noindex: true,
  body: `<header class="head"><h1>Nothing here</h1><p class="intro">The find may have been taken down by its seller. Try the search above or <a href="/finds/">browse all finds</a>.</p></header>${grid(products.slice(0, 12))}` }), { sitemap: false });

// ── machine files ────────────────────────────────────────────────────────────
fs.writeFileSync(path.join(DIST, 'search.json'), JSON.stringify(products.map((p) => [p.name, urlOf(p), imgOf(p), p.cny, p.brand || ''])));
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${written.map((u) => `<url><loc>${SITE}${u}</loc><lastmod>${BUILT}</lastmod></url>`).join('\n')}
</urlset>`);
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

// static files last, so a stale copy never shadows a built page
fs.cpSync(path.join(ROOT, 'public'), DIST, { recursive: true });
console.log(`built ${written.length} indexable pages, ${products.length} products, ${BRANDS.length} brand pages`);
