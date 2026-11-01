// Tells Bing (and Yandex, Seznam, Naver, which share IndexNow) which pages are new or changed, so
// they fetch them now rather than whenever they next read the sitemap. Google does not take part.
//
// It reads dist/sitemap.xml (run after a build and deploy) and sends only the addresses it has not
// sent before or whose lastmod moved since, remembering what went in data/indexnow-sent.json. The
// first run sends everything once; after that a weekly run sends the new items and nothing else.
// Resending the whole sitemap every day is how a host gets its submissions ignored.
//
//   node scripts/indexnow.mjs           send what is new or changed
//   node scripts/indexnow.mjs --dry     list it, send nothing
//
// The key file public/<KEY>.txt is copied to the site root by the build and proves we control the
// site: it has to stay deployed for as long as this is used.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://therepsheet.com';
const KEY = '52b70652718736239854aff8ccd13ad8';
const SENT = path.join(ROOT, 'data/indexnow-sent.json');
const API = 'https://api.indexnow.org/indexnow';
const DRY = process.argv.includes('--dry');

const xml = fs.readFileSync(path.join(ROOT, 'dist/sitemap.xml'), 'utf8');
const all = [...xml.matchAll(/<loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)].map((m) => ({ url: m[1], lastmod: m[2] || '' }));
const sent = fs.existsSync(SENT) ? JSON.parse(fs.readFileSync(SENT, 'utf8')) : {};
const todo = all.filter((e) => sent[e.url] !== e.lastmod);

console.log(`sitemap: ${all.length} | new or changed: ${todo.length}`);
if (!todo.length) process.exit(0);
if (DRY) { todo.slice(0, 20).forEach((e) => console.log('  ' + e.url + '  ' + e.lastmod)); if (todo.length > 20) console.log(`  … and ${todo.length - 20} more`); process.exit(0); }

// the key file has to be live before IndexNow will accept anything
const k = await fetch(`${SITE}/${KEY}.txt`).then((r) => (r.ok ? r.text() : '')).catch(() => '');
if (k.trim() !== KEY) { console.error(`${SITE}/${KEY}.txt is not live yet: build and deploy first`); process.exit(1); }

const r = await fetch(API, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: todo.map((e) => e.url) }),
});
// 200/202 accepted; 403 key file wrong; 422 address not on this host; 429 too many pushes
const body = await r.text().catch(() => '');
console.log(`${todo.length} addresses → ${r.status}${r.ok ? ' ok' : ' ' + body.slice(0, 200)}`);
if (!r.ok) process.exit(1);
for (const e of todo) sent[e.url] = e.lastmod;
fs.writeFileSync(SENT, JSON.stringify(sent));
