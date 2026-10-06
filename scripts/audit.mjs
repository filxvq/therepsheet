// SEO audit of the built site in dist/: every page's title, description, canonical, H1, robots,
// structured data and internal links. Prints problems grouped by kind.
//   node src/build.mjs && node scripts/audit.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://therepsheet.com';
const pages = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) {
  const p = path.join(d, f.name);
  if (f.isDirectory()) walk(p); else if (f.name.endsWith('.html')) pages.push(p);
} })(DIST);
const urlOf = (file) => '/' + path.relative(DIST, file).replace(/\\/g, '/').replace(/index\.html$/, '').replace(/^404\.html$/, '404.html');
const exists = (u) => {
  const clean = u.split('#')[0].split('?')[0];
  if (!clean.startsWith('/')) return true;
  const f = path.join(DIST, decodeURIComponent(clean));
  return fs.existsSync(f) && (fs.statSync(f).isFile() || fs.existsSync(path.join(f, 'index.html')));
};
const sitemap = new Set([...fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(SITE, '')));

const issues = {};
const add = (k, v) => (issues[k] = issues[k] || []).push(v);
const titles = new Map(), descs = new Map();
let links = 0, imgs = 0;
for (const f of pages) {
  const u = urlOf(f), h = fs.readFileSync(f, 'utf8');
  const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const desc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const canon = (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '';
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(h);
  const h1 = (h.match(/<h1[\s>]/g) || []).length;
  if (!noindex) {
    if (!title) add('no title', u);
    if (title.length > 65) add('title > 65 chars', `${u}  (${title.length}) ${title}`);
    if (title.length < 20) add('title < 20 chars', `${u} ${title}`);
    if (!desc) add('no description', u);
    if (desc.length > 160) add('description > 160 chars', `${u} (${desc.length})`);
    if (desc.length < 70) add('description < 70 chars', `${u} (${desc.length})`);
    if (canon !== SITE + u) add('canonical not self', `${u} -> ${canon}`);
    if (h1 !== 1) add('h1 count != 1', `${u} (${h1})`);
    if (!sitemap.has(u) && !/\/page\/\d+\/$/.test(u)) add('indexable but not in sitemap', u);
    titles.set(title, [...(titles.get(title) || []), u]);
    descs.set(desc, [...(descs.get(desc) || []), u]);
  } else if (sitemap.has(u)) add('noindex page in sitemap', u);
  for (const m of h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
    try { JSON.parse(m[1]); } catch (e) { add('bad JSON-LD', u); }
  }
  for (const m of h.matchAll(/<a [^>]*href="([^"]+)"/g)) {
    links++;
    const href = m[1];
    if (href.startsWith('/') && !exists(href)) add('broken internal link', `${u} -> ${href}`);
    if (href.startsWith(SITE)) add('absolute self link', `${u} -> ${href}`);
  }
  for (const m of h.matchAll(/<img [^>]*>/g)) {
    imgs++;
    const tag = m[0], src = (tag.match(/src="([^"]+)"/) || [])[1] || '';
    if (!/alt="/.test(tag)) add('img without alt', `${u} ${src}`);
    if (src.startsWith('/') && !exists(src)) add('missing image', `${u} ${src}`);
    if (src.includes('no-photo')) add('placeholder photo', u);
  }
}
for (const u of sitemap) if (!exists(u)) add('sitemap URL has no page', u);
for (const [t, us] of titles) if (us.length > 1) add('duplicate title', `${us.length}× ${t}  e.g. ${us.slice(0, 3).join(' ')}`);
for (const [d, us] of descs) if (us.length > 1) add('duplicate description', `${us.length}× ${d.slice(0, 70)}…  e.g. ${us.slice(0, 2).join(' ')}`);

console.log(`${pages.length} pages, ${sitemap.size} in sitemap, ${links} links, ${imgs} images checked\n`);
for (const [k, v] of Object.entries(issues)) {
  console.log(`${k}: ${v.length}`);
  for (const x of [...new Set(v)].slice(0, 6)) console.log('   ' + x);
}
if (!Object.keys(issues).length) console.log('no issues');
