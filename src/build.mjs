// Builds the whole site into dist/ as plain HTML files: no server renders anything at request
// time. Every page is complete for a crawler on its own; site.js swaps the agent in the buy links
// and the currency in the prices, keeps favorites, and runs the search box.
//
//   /                          home
//   /finds/                    every category and the most popular reps
//   /<category>/               a category, 60 per page, /<category>/page/2/ ...
//   /<category>/<slug>/        a product
//   /brands/  /brands/<slug>/  brands with at least BRAND_PAGE_MIN items
//   /favorites/                the visitor's saved reps (drawn by site.js, not indexed)
//   /how-to-buy/  /faq/  /about/
//   sitemap.xml  robots.txt  search.json  404.html
//
// Run: node src/build.mjs   (Vercel runs it as the build command)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, NAME, CATEGORIES, AGENTS, DEFAULT_AGENT, CNY_FALLBACK, BRAND_PAGE_MIN, PER_PAGE } from './config.mjs';
import { HOME, FAQ, GUIDE, ABOUT } from './content.mjs';
import { describe } from './describe.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const products = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/products.json'), 'utf8'));
// Unique per-product text from scripts/describe-ai.mjs; products without one fall back to describe().
// QC photos per product from scripts/qc.mjs
const QC = fs.existsSync(path.join(ROOT, 'data/qc.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'data/qc.json'), 'utf8')) : {};
const qcOf = (p) => (QC[p.id] || []).filter((f) => fs.existsSync(path.join(ROOT, 'public', f)));
const AI = fs.existsSync(path.join(ROOT, 'data/descriptions.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'data/descriptions.json'), 'utf8')) : {};
const BUILT = new Date().toISOString().slice(0, 10);
const YEAR = BUILT.slice(0, 4);
const UPDATED = new Date(BUILT).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
fs.rmSync(DIST, { recursive: true, force: true });
// Asset URLs carry a hash of the file, so a changed stylesheet is a new URL and no browser or CDN
// keeps serving the old one under its week-long cache (a date stamp failed at two deploys a day).
const hashOf = (f) => crypto.createHash('sha1').update(fs.readFileSync(path.join(ROOT, 'public/assets', f))).digest('hex').slice(0, 10);
const V = { css: hashOf('site.css'), js: hashOf('site.js'), icon: hashOf('icon.svg') };
// search.json and its version are built once, on first use (the helpers they need are declared
// below). The version goes into the page so a changed catalog is a new URL, never a stale cache.
let SEARCH = null, SV = null;
const searchJson = () => SEARCH || (SEARCH = JSON.stringify(products.map((p) => [p.name, urlOf(p), thumbOf(p), p.cny, p.brand || '', p.id, p.category])));
const searchVersion = () => SV || (SV = crypto.createHash('sha1').update(searchJson()).digest('hex').slice(0, 10));

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
const thumbOf = (p) => fs.existsSync(path.join(ROOT, 'public/img/sm', `${p.slug}-${p.id}.webp`)) ? `/img/sm/${p.slug}-${p.id}.webp` : imgOf(p);
const catById = new Map(CATEGORIES.map((c) => [c.id, c]));
const short = (c) => c.short || c.name;
const urlOf = (p) => `/${p.category}/${p.slug}/`;
const n = (x) => x.toLocaleString('en-US');
const COUNT = n(products.length);
const ROUND = Math.floor(products.length / 100) * 100;   // "1800+" in titles

const ICON = {
  heart: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  clock: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>',
  cat: (c, size = 28) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${c.icon}</svg>`,
};

// ── groupings ────────────────────────────────────────────────────────────────
// products.json keeps the source sheet's default order, which is its popularity order.
const byCat = new Map(CATEGORIES.map((c) => [c.id, []]));
products.forEach((p) => byCat.get(p.category).push(p));
const brandCount = new Map();
products.forEach((p) => p.brand && brandCount.set(p.brand, (brandCount.get(p.brand) || 0) + 1));
const BRANDS = [...brandCount].filter(([, k]) => k >= BRAND_PAGE_MIN).sort((a, b) => b[1] - a[1])
  .map(([name, k]) => ({ name, n: k, slug: slugify(name), items: products.filter((p) => p.brand === name) }));
const brandPage = new Map(BRANDS.map((b) => [b.name, b]));
const POPULAR = products.slice(0, 60);

// ── page shell ───────────────────────────────────────────────────────────────
function page({ title, desc, url, body, image, jsonld = [], noindex = false, active = '' }) {
  const canonical = SITE + url;
  const nav = CATEGORIES.map((c) => `<a href="/${c.id}/"${active === c.id ? ' aria-current="page"' : ''}>${esc(short(c))}</a>`).join('');
  const agentList = AGENTS.map((a) => `<button type="button" class="agent-opt" data-agent="${a.id}"><img src="${a.logo}" alt="" width="28" height="28"><span><b>${esc(a.name)}</b>${a.perk ? `<small>${esc(a.perk)}</small>` : ''}</span><i class="tick"></i></button>`).join('');
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
${image ? `<meta property="og:image" content="${SITE + image}">\n` : ''}<meta name="theme-color" content="#0c0c10">
<link rel="icon" href="/assets/icon.svg?v=${V.icon}" type="image/svg+xml">
<script>document.documentElement.classList.add('js')</script>
<link rel="stylesheet" href="/assets/site.css?v=${V.css}">
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body>
<header class="top">
  <div class="wrap top-row">
    <a class="logo" href="/" aria-label="${NAME} home"><b>TheRep</b>Sheet<span>.com</span></a>
    <div class="search" role="search">
      ${ICON.search}<input id="q" type="search" placeholder="Search products…" autocomplete="off" aria-label="Search products">
      <div id="results" class="results" hidden></div>
    </div>
    <a class="icon-btn" href="/favorites/" aria-label="Favorites">${ICON.heart}<span class="fav-count" hidden></span></a>
    <div class="prefs">
      <button type="button" class="prefs-btn" id="prefsBtn" aria-expanded="false" aria-haspopup="dialog" aria-label="Shopping agent and currency"><img class="agent-logo" src="${defAgent.logo}" alt="" width="20" height="20"><span class="agent-name">${esc(defAgent.name)}</span><span class="cur-name">USD</span>${ICON.chevron}</button>
      <div class="prefs-pop" id="prefsPop" role="dialog" aria-label="Shopping agent and currency">
        <p class="pop-label">Shopping agent</p><div class="agent-list">${agentList}</div>
        <p class="pop-label">Currency</p><div class="seg">${['USD', 'EUR', 'GBP'].map((c) => `<button type="button" data-cur="${c}">${c}</button>`).join('')}</div>
      </div>
    </div>
    <a class="signup" data-signup href="${defAgent.signup}" rel="nofollow sponsored noopener" target="_blank">Sign up to <span class="agent-name">${esc(defAgent.name)}</span> →</a>
  </div>
  <nav class="wrap cats" aria-label="Categories"><a href="/finds/"${active === 'finds' ? ' aria-current="page"' : ''}>All</a>${nav}<a href="/brands/"${active === 'brands' ? ' aria-current="page"' : ''}>Brands</a></nav>
</header>
<main class="wrap">
${body}
</main>
<footer class="foot">
  <div class="wrap foot-grid">
    <div><a class="logo" href="/"><b>TheRep</b>Sheet<span>.com</span></a>
      <p>The rep spreadsheet for Weidian finds: ${COUNT} reps with live prices and direct links for every major shopping agent. Updated ${UPDATED}.</p></div>
    <div><h3>Reps</h3>${CATEGORIES.slice(0, 6).map((c) => `<a href="/${c.id}/">${esc(c.reps)}</a>`).join('')}</div>
    <div><h3>More reps</h3>${CATEGORIES.slice(6).map((c) => `<a href="/${c.id}/">${esc(c.reps)}</a>`).join('')}<a href="/brands/">Reps by brand</a></div>
    <div><h3>Help</h3><a href="/how-to-buy/">How to buy reps</a><a href="/faq/">Rep FAQ</a><a href="/about/">About &amp; disclaimer</a></div>
  </div>
  <p class="wrap fine">${NAME} sells nothing and holds no stock: every order is placed by you with a shopping agent. Brand names only identify what an item is. Some agent links carry a referral code. © ${YEAR} therepsheet.com</p>
</footer>
<script>window.TRS=${JSON.stringify({ agents: AGENTS.map(({ id, name, code, rate, signup, perk, logo, promo }) => ({ id, name, code, rate, signup, perk, logo, promo })), plane: ICO.plane, cny: CNY_FALLBACK, def: DEFAULT_AGENT, sv: searchVersion(), cats: Object.fromEntries(CATEGORIES.map((c) => [c.id, short(c)])) })}</script>
<script src="/assets/site.js?v=${V.js}" defer></script>
</body>
</html>`;
}

function card(p, eager = false) {
  const cat = catById.get(p.category);
  return `<article class="card">
  <a class="card-img" href="${urlOf(p)}" tabindex="-1">${qcOf(p).length ? '<span class="qc-badge">QC</span>' : ''}<img src="${thumbOf(p)}" alt="${esc(p.name)} rep" width="300" height="300" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></a>
  <button type="button" class="fav" data-fav="${p.id}" aria-pressed="false" aria-label="Add ${esc(p.name)} to favorites">${ICON.heart}</button>
  <div class="card-body"><p class="card-cat">${esc(short(cat))}</p><a class="card-name" href="${urlOf(p)}">${esc(p.name)}</a><p class="price" data-cny="${p.cny}">${price(p.cny)}</p>
  <div class="card-actions"><a class="btn-ghost" href="${urlOf(p)}">View details</a><a class="btn-buy" data-wd="${p.id}" href="${buyUrl(p.id)}" rel="nofollow sponsored noopener" target="_blank">View on <span class="agent-name">${esc(defAgent.name)}</span> →</a></div></div>
</article>`;
}
const grid = (list) => `<div class="grid">${list.map((p) => card(p)).join('\n')}</div>`;
const row = (list) => `<div class="row-scroll">${list.map((p, i) => card(p, i < 4)).join('\n')}</div>`;
const rail = (active = '') => `<div class="rail">${CATEGORIES.map((c) => `<a class="rail-item${active === c.id ? ' on' : ''}" href="/${c.id}/"><span class="rail-disc">${ICON.cat(c)}</span><span class="rail-name">${esc(short(c))}</span></a>`).join('')}</div>`;

function crumbs(items) {
  const html = `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([nm, u], i) => i === items.length - 1 ? `<span>${esc(nm)}</span>` : `<a href="${u}">${esc(nm)}</a>`).join('<i>/</i>')}</nav>`;
  const ld = { '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map(([nm, u], i) => ({ '@type': 'ListItem', position: i + 1, name: nm, item: SITE + u })) };
  return [html, ld];
}

function pager(base, k, total) {
  if (total <= 1) return '';
  const href = (x) => x === 1 ? base : `${base}page/${x}/`;
  const nums = [];
  for (let x = 1; x <= total; x++) if (x === 1 || x === total || Math.abs(x - k) <= 2) nums.push(x);
  let out = '', last = 0;
  for (const x of nums) { if (x - last > 1) out += '<span class="gap">…</span>'; out += x === k ? `<span class="on">${x}</span>` : `<a href="${href(x)}">${x}</a>`; last = x; }
  return `<nav class="pager" aria-label="Pages">${k > 1 ? `<a rel="prev" href="${href(k - 1)}">← Prev</a>` : ''}${out}${k < total ? `<a rel="next" href="${href(k + 1)}">Next →</a>` : ''}</nav>`;
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
  for (let k = 1; k <= total; k++) {
    const url = k === 1 ? base : `${base}page/${k}/`;
    const [bc, bcld] = crumbs(k === 1 ? crumb : [...crumb, [`Page ${k}`, url]]);
    const body = `${bc}
<header class="head"><h1>${esc(h1)}${k > 1 ? ` <small>page ${k}</small>` : ''}</h1>
<p class="count">${n(list.length)} reps in the spreadsheet</p>
${k === 1 && intro ? `<p class="intro">${esc(intro)}</p>` : ''}</header>
${k === 1 ? extra : ''}
${grid(list.slice((k - 1) * PER_PAGE, k * PER_PAGE))}
${pager(base, k, total)}`;
    write(url, page({ title: k === 1 ? title : `${h1} – Page ${k} | ${NAME}`, desc, url, body, active, jsonld: [bcld],
      image: list[0] && imgOf(list[0]) }), { sitemap: k === 1 });
  }
}

// The new-account offer for the selected agent: the vetereps.com banner, red tickets for Kakobuy and
// the space-themed cards for USFans. Agents without an offer show Kakobuy's (site.js swaps it live).
const ICO = {
  check: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>',
  plane: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 10h4a2 2 0 0 1 0 4h-4l-4 7h-3l2-7H7l-2 2H2l2-4-2-4h3l2 2h4L9 3h3z"/></svg>',
};
export const couponsHtml = (pr) => pr.coupons.map((c, i) => {
  const pos = i === 0 ? 'kupon-tyl' : 'kupon-przod';
  return pr.style === 'usf'
    ? `<div class="kupon ${pos}"><div class="kupon-gora"><b>${esc(c.big)}</b><small>${esc(c.min)}</small></div><div class="kupon-dol"><div class="kupon-opis"><span class="kupon-typ">${ICO.plane}<span>${esc(c.typ)}</span></span><span class="kupon-waznosc">Valid 1 year</span></div><span class="kupon-uzyj">Use</span></div></div>`
    : `<div class="kupon ${pos}"><div class="kupon-top"><b>${esc(c.big)}</b></div><div class="kupon-mid"><span class="kupon-body">${esc(c.body)}</span></div><div class="kupon-dol"><span class="kupon-waznosc">Valid 1 year</span><span class="kupon-uzyj">Use Now</span></div></div>`;
}).join('');
function promoCard() {
  const k = AGENTS[0], pr = k.promo;
  return `<a class="kupon-baner ${pr.style}" data-signup href="${k.signup}" rel="nofollow sponsored noopener" target="_blank">
    <div class="kb-tekst"><span class="kb-znaczek">${ICO.check}<span>For new <span class="agent-name">${esc(k.name)}</span> users</span></span>
      <div class="kb-tytul" data-promo-title>${esc(pr.title)}</div>
      <div class="kb-pod" data-promo-sub>${pr.sub.map((x) => `<span>${esc(x)}</span>`).join('')}</div>
      <span class="kb-przycisk"><span>Claim now</span>${ICO.arrow}</span></div>
    <div class="kb-kupony" aria-hidden="true">${couponsHtml(pr)}</div>
  </a>`;
}

// Colour, size and other option groups read from the source sheet (scripts/fetch-variants.mjs).
// Swatches with a photo switch the main image; the first few show, the rest open with "+N".
const VARIANTS = fs.existsSync(path.join(ROOT, 'data/variants.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'data/variants.json'), 'utf8')) : {};
// Variant photos stay on the source sheet's CDN: ~19,500 of them would not fit Vercel's file
// limits as part of this repo. A swatch whose photo fails to load hides itself (site.js).
const vImg = (url) => (/^https:\/\//.test(url || '') ? url : null);
// Option-group names come straight from Weidian sellers ("color classification", "yardage number");
// show the common ones under one name.
const groupName = (l) => { const x = l.toLowerCase();
  if (/size|yard|eur|length|dimension|sise/.test(x)) return 'Size';
  if (/colou?r|style|classification|model|collection|scheme|template/.test(x)) return 'Colour';
  return l.charAt(0).toUpperCase() + l.slice(1); };
function variantsHtml(p) {
  const groups = VARIANTS[p.id] || [];
  return groups.map((g) => {
    const withImg = g.options.some((o) => o.img && vImg(o.img));
    const cap = withImg ? 9 : 14;   // photo swatches fold after 9, text options (sizes) after 14
    const opts = g.options.map((o, i) => {
      const im = o.img && vImg(o.img);
      const hide = i >= cap ? ' hidden-opt' : '';
      return im ? `<button type="button" class="swatch${hide}" data-shot="${im}" title="${esc(o.t)}"><img src="${im}" alt="${esc(p.name)} option ${esc(o.t)}" width="56" height="56" loading="lazy"></button>`
        : `<button type="button" class="chip-opt${hide}">${esc(o.t)}</button>`;
    }).join('');
    const more = g.options.length > cap ? `<button type="button" class="${withImg ? 'swatch more-opt' : 'chip-opt more-opt'}">+${g.options.length - cap}</button>` : '';
    return `<div class="variant"><p class="variant-label">${esc(groupName(g.label))} <b>${g.options.length}</b></p><div class="${withImg ? 'swatches' : 'chips-opt'}">${opts}${more}</div></div>`;
  }).join('');
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
  const [bc, bcld] = crumbs([['Rep Spreadsheet', '/'], [cat.reps, `/${cat.id}/`], [p.name, url]]);
  const facts = describe(p, { cat, catList: byCat.get(p.category), brandList: p.brand ? products.filter((x) => x.brand === p.brand) : [], usd: usd(p.cny) });
  const text = AI[p.id] ? [AI[p.id], facts[0]] : facts;
  const bp = p.brand && brandPage.get(p.brand);
  const body = `${bc}
<div class="product">
  <div class="gallery">
    <div class="shot"><img id="mainShot" src="${imgOf(p)}" alt="${esc(p.name)} rep" width="480" height="480" fetchpriority="high"><button type="button" class="fav fav-lg" data-fav="${p.id}" aria-pressed="false" aria-label="Add to favorites">${ICON.heart}</button></div>
    <div class="thumbs"><button type="button" class="thumb on" data-shot="${imgOf(p)}" aria-label="Main photo"><img src="${thumbOf(p)}" alt="" width="56" height="56"></button>${qcOf(p).slice(0, 5).map((f, i) => `<button type="button" class="thumb" data-shot="${f}" aria-label="QC photo ${i + 1}"><img src="${f}" alt="" width="56" height="56" loading="lazy"></button>`).join('')}</div>
  </div>
  <div class="info">
    <p class="kicker">${p.brand ? (bp ? `<a href="/brands/${bp.slug}/">${esc(p.brand)} reps</a>` : `${esc(p.brand)} reps`) + ' · ' : ''}<a href="/${cat.id}/">${esc(cat.reps)}</a></p>
    <h1>${esc(p.name)} Rep</h1>
    <p class="big-price"><span class="price" data-cny="${p.cny}">${price(p.cny)}</span></p>
    <div class="buy-row">
      <a class="btn-buy btn-xl" data-wd="${p.id}" href="${buyUrl(p.id)}" rel="nofollow sponsored noopener" target="_blank">View on <span class="agent-name">${esc(defAgent.name)}</span> →</a>
      <div class="others"><button type="button" class="others-btn" aria-expanded="false">Other agents ${ICON.chevron}</button>
        <div class="others-pop">${AGENTS.map((a) => `<a class="others-opt" data-agent-link="${a.id}" data-wd="${p.id}" href="${buyUrl(p.id, a)}" rel="nofollow sponsored noopener" target="_blank"><img src="${a.logo}" alt="" width="22" height="22">${esc(a.name)}</a>`).join('')}</div></div>
    </div>
    ${promoCard()}
    ${variantsHtml(p)}
  </div>
</div>
${qcOf(p).length ? `<section class="qc-sec"><div class="sec-head"><h2>QC photos of this rep <small>${qcOf(p).length}</small></h2></div><p class="intro">Warehouse photos from real orders of this listing, taken by shopping agents before shipping.</p><div class="qc-grid">${qcOf(p).map((f, i) => `<button type="button" class="qc-shot" data-full="${f}" aria-label="Open QC photo ${i + 1}"><img src="${f}" alt="${esc(p.name)} rep QC photo ${i + 1}" width="240" height="240" loading="lazy"></button>`).join('')}</div></section>` : ''}
<details class="about-item"><summary><h2>About this ${esc(p.name)} rep</h2></summary><div class="about-body">${text.map((t) => `<p>${esc(t)}</p>`).join('')}</div></details>
${sameBrand.length ? `<section><div class="sec-head"><h2>More ${esc(p.brand)} reps</h2>${bp ? `<a class="sec-link" href="/brands/${bp.slug}/">All ${bp.n} →</a>` : ''}</div>${row(sameBrand)}</section>` : ''}
${similar.length ? `<section><div class="sec-head"><h2>More ${esc(cat.reps.toLowerCase())}</h2><a class="sec-link" href="/${cat.id}/">All ${byCat.get(cat.id).length} →</a></div>${row(similar)}</section>` : ''}`;
  const ld = { '@context': 'https://schema.org', '@type': 'Product', name: p.name + ' Rep', image: SITE + imgOf(p), url: SITE + url,
    description: text[0], category: cat.name, ...(p.brand ? { brand: { '@type': 'Brand', name: p.brand } } : {}), sku: String(p.id),
    offers: { '@type': 'Offer', price: usd(p.cny).toFixed(2), priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: SITE + url } };
  write(url, page({
    title: `${p.name} Rep – ${price(p.cny)} | Rep Spreadsheet`,
    desc: `${p.name} rep for ${price(p.cny)} from a Weidian seller. Buy this rep through Kakobuy, USFans or four other agents, straight from the rep spreadsheet.`,
    url, body, image: imgOf(p), jsonld: [bcld, ld], active: p.category }));
}

// ── listings ─────────────────────────────────────────────────────────────────
for (const c of CATEGORIES) {
  const list = byCat.get(c.id);
  const brandsHere = BRANDS.filter((b) => b.items.some((p) => p.category === c.id)).slice(0, 14);
  listing({ base: `/${c.id}/`, h1: c.reps, title: `${c.reps} ${YEAR} – ${list.length} ${short(c)} Reps | Rep Spreadsheet`,
    desc: `${list.length} ${c.reps.toLowerCase()} in the rep spreadsheet, with live prices and buy links for Kakobuy and other agents. ${c.intro.split('. ')[0]}.`,
    intro: c.intro, list, crumb: [['Rep Spreadsheet', '/'], [c.reps, `/${c.id}/`]], active: c.id,
    extra: `${rail(c.id)}${brandsHere.length ? `<div class="chips">${brandsHere.map((b) => `<a href="/brands/${b.slug}/">${esc(b.name)} reps</a>`).join('')}</div>` : ''}` });
}
for (const b of BRANDS) {
  listing({ base: `/brands/${b.slug}/`, h1: `${b.name} Reps`, title: `${b.name} Reps ${YEAR} – ${b.n} Finds | Rep Spreadsheet`,
    desc: `${b.n} ${b.name} reps from Weidian sellers in the rep spreadsheet, with prices and buy links for Kakobuy, USFans and other agents.`,
    list: b.items, crumb: [['Rep Spreadsheet', '/'], ['Reps by brand', '/brands/'], [`${b.name} reps`, `/brands/${b.slug}/`]], active: 'brands' });
}
{
  const [bc, bcld] = crumbs([['Rep Spreadsheet', '/'], ['Reps by brand', '/brands/']]);
  const body = `${bc}<header class="head"><h1>Reps by Brand</h1><p class="intro">Every brand with at least ${BRAND_PAGE_MIN} reps in the spreadsheet, most listed first.</p></header>
<ul class="brand-list">${BRANDS.map((b) => `<li><a href="/brands/${b.slug}/"><span>${esc(b.name)} reps</span><b>${b.n}</b></a></li>`).join('')}</ul>`;
  write('/brands/', page({ title: `Reps by Brand A–Z | Rep Spreadsheet ${YEAR}`, desc: `${BRANDS.length} brands in the rep spreadsheet, from ${BRANDS.slice(0, 4).map((b) => b.name + ' reps').join(', ')} down.`, url: '/brands/', body, jsonld: [bcld], active: 'brands' }));
}

// ── all finds: categories + most popular ─────────────────────────────────────
{
  const [bc, bcld] = crumbs([['Rep Spreadsheet', '/'], ['All reps', '/finds/']]);
  const body = `${bc}
<header class="head"><h1>All Reps by Category</h1><p class="count">${COUNT} reps in ${CATEGORIES.length} categories</p>
<p class="intro">Pick a category to browse every rep in it, or start with the reps people open most this week.</p></header>
${rail()}
<section><div class="sec-head"><h2>Most Popular Reps This Week</h2></div>${grid(POPULAR)}</section>`;
  write('/finds/', page({ title: `All Reps by Category – Rep Spreadsheet ${YEAR} (${ROUND}+ Finds)`,
    desc: `Browse the rep spreadsheet by category: ${CATEGORIES.map((c) => short(c).toLowerCase()).slice(0, 6).join(', ')} and more, plus the most popular reps this week.`,
    url: '/finds/', body, jsonld: [bcld], active: 'finds' }));
}
// ── favorites (client-side, not indexed) ─────────────────────────────────────
write('/favorites/', page({ title: `Your Favorite Reps | ${NAME}`, desc: 'The reps you saved on this device.', url: '/favorites/', noindex: true, active: 'favorites',
  body: `<header class="head"><h1>Your Favorite Reps</h1><p class="count" id="favNote">Saved on this device.</p></header>
<div class="grid" id="favGrid"></div>
<div class="empty" id="favEmpty" hidden><p>No favorites yet. Tap the ♡ on any rep to save it here.</p><a class="btn-buy" href="/finds/">Browse the rep spreadsheet →</a></div>` }), { sitemap: false });

// ── home ─────────────────────────────────────────────────────────────────────
{
  const kako = AGENTS[0];
  const body = `<section class="hero">
  <div class="hero-text">
    <h1>Rep Spreadsheet ${YEAR}<br><span>${ROUND}+ Rep Finds</span></h1>
    <p>${esc(HOME.lead).replace('rep spreadsheet', '<strong>rep spreadsheet</strong>')}</p>
    <div class="hero-cta"><a class="btn-buy btn-xl" href="#popular">Browse the Rep Spreadsheet ↓</a><span class="updated">${ICON.clock} Updated ${UPDATED}</span></div>
  </div>
  ${promoCard()}
</section>
<section><div class="sec-head"><h2>Browse Reps by Category</h2></div>${rail()}</section>
<section id="popular"><div class="sec-head"><h2>Most Popular Reps This Week</h2><a class="sec-link" href="/finds/">See all reps →</a></div>${row(products.slice(0, 24))}</section>
<section><div class="sec-head"><h2>Top Rep Brands</h2><a class="sec-link" href="/brands/">All brands →</a></div><div class="chips">${BRANDS.slice(0, 24).map((b) => `<a href="/brands/${b.slug}/">${esc(b.name)} reps <b>${b.n}</b></a>`).join('')}</div></section>
<section><h2>How to Use the Rep Spreadsheet</h2><ol class="cards3">${HOME.use.map((s, i) => `<li><span class="num">${i + 1}</span><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></li>`).join('')}</ol></section>
<section class="prose"><h2>What Are Reps?</h2>${HOME.what.map((t) => `<p>${esc(t)}</p>`).join('')}</section>
<section><h2>How to Buy Reps: Step by Step</h2><ol class="steps">${GUIDE.steps.map((s) => `<li><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></li>`).join('')}</ol><p class="more"><a href="/how-to-buy/">Full guide to buying reps →</a></p></section>
<section><h2>Why Use This Rep Spreadsheet</h2><div class="cards3">${HOME.why.map((s) => `<div><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></div>`).join('')}</div></section>
<section class="faq"><h2>Rep Spreadsheet — FAQ</h2>${FAQ.map((f) => `<details><summary>${esc(f.q)}</summary><div><p>${esc(f.a)}</p></div></details>`).join('')}</section>`;
  const ld = [{ '@context': 'https://schema.org', '@type': 'WebSite', name: NAME, url: SITE + '/',
      potentialAction: { '@type': 'SearchAction', target: SITE + '/finds/?q={search_term_string}', 'query-input': 'required name=search_term_string' } },
    { '@context': 'https://schema.org', '@type': 'Organization', name: NAME, url: SITE + '/', logo: SITE + '/assets/icon.svg' },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }];
  write('/', page({ title: `Rep Spreadsheet ${YEAR}: ${ROUND}+ Rep Finds | TheRepSheet`,
    desc: `The rep spreadsheet with ${COUNT} Weidian rep finds: shoes, hoodies, jackets, bags and more, with live prices and links for Kakobuy, USFans and other agents.`,
    url: '/', body, jsonld: ld, image: imgOf(products[0]) }));
}

// ── guide, faq, about ────────────────────────────────────────────────────────
{
  const [bc, bcld] = crumbs([['Rep Spreadsheet', '/'], ['How to buy reps', '/how-to-buy/']]);
  const body = `${bc}<article class="prose"><h1>${esc(GUIDE.title)}</h1><p class="intro">${esc(GUIDE.intro)}</p>
${GUIDE.steps.map((s, i) => `<h2>${i + 1}. ${esc(s.t)}</h2><p>${esc(s.d)}</p>${s.more ? `<p>${esc(s.more)}</p>` : ''}`).join('\n')}
<h2>Which agent should you use for reps?</h2><p>Every rep link on ${NAME} works with these agents. New-account offers:</p><ul>${AGENTS.filter((a) => a.perk).map((a) => `<li><a href="${a.signup}" rel="nofollow sponsored noopener" target="_blank">${esc(a.name)}</a>: ${esc(a.perk)}</li>`).join('')}</ul></article>`;
  const ld = { '@context': 'https://schema.org', '@type': 'HowTo', name: GUIDE.title, step: GUIDE.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.t, text: s.d })) };
  write('/how-to-buy/', page({ title: `How to Buy Reps from Weidian (${YEAR} Guide) | Rep Spreadsheet`, desc: GUIDE.intro.slice(0, 155), url: '/how-to-buy/', body, jsonld: [bcld, ld] }));
}
{
  const [bc, bcld] = crumbs([['Rep Spreadsheet', '/'], ['Rep FAQ', '/faq/']]);
  const body = `${bc}<article class="prose faq"><h1>Rep Spreadsheet FAQ</h1>${FAQ.map((f) => `<details open><summary>${esc(f.q)}</summary><div><p>${esc(f.a)}</p></div></details>`).join('\n')}</article>`;
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
  write('/faq/', page({ title: `Rep FAQ – Agents, QC Photos, Shipping | Rep Spreadsheet`, desc: FAQ[0].a.slice(0, 155), url: '/faq/', body, jsonld: [bcld, ld] }));
}
{
  const [bc, bcld] = crumbs([['Rep Spreadsheet', '/'], ['About', '/about/']]);
  write('/about/', page({ title: `About & Disclaimer | ${NAME}`, desc: ABOUT[0].slice(0, 155), url: '/about/',
    body: `${bc}<article class="prose"><h1>About ${NAME}</h1>${ABOUT.map((t) => `<p>${esc(t)}</p>`).join('')}</article>`, jsonld: [bcld] }));
}
write('/404.html', page({ title: `Page not found | ${NAME}`, desc: 'This page does not exist.', url: '/404.html', noindex: true,
  body: `<header class="head"><h1>This rep is gone</h1><p class="intro">The seller may have taken the listing down. Search above or <a href="/finds/">browse the rep spreadsheet</a>.</p></header>${rail()}${grid(products.slice(0, 12))}` }), { sitemap: false });

// ── machine files ────────────────────────────────────────────────────────────
fs.writeFileSync(path.join(DIST, 'search.json'), searchJson());
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${written.map((u) => `<url><loc>${SITE}${u}</loc><lastmod>${BUILT}</lastmod></url>`).join('\n')}
</urlset>`);
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

// static files last, so a stale copy never shadows a built page
fs.cpSync(path.join(ROOT, 'public'), DIST, { recursive: true });
console.log(`built ${written.length} indexable pages, ${products.length} products, ${BRANDS.length} brand pages`);
