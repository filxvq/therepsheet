// Traffic stats for all of the owner's sites in one Cloudflare D1 database (binding STATS).
// The same file is copied into therepsheet/worker/ and weidiansheet/worker/: each site's Worker
// records its own visits through /api/track, and vetereps.com/stats reads them all, one site at a
// time or together. It replaces lib/analytics-store.js (Upstash Redis via Vercel), with the same
// numbers: views, unique visitors, visits, newcomers, buy-button clicks, hours, top pages,
// referrers, countries, devices and who is on the site now.
//
// Rows written per pageview: about 9 (the D1 free tier allows 100k a day). A heartbeat writes only
// when the visitor's last mark is over 40 s old.

export const SITES = { 'vetereps.com': 'vetereps', 'therepsheet.com': 'therepsheet', 'theweidianspreadsheet.com': 'weidian', 'theqcfinder.com': 'qcfinder' };
const TZ = 'Europe/Warsaw';
const LIVE_MS = 60 * 1000;           // "on site now" = seen in the last minute (the page pings every 20 s)
const SESSION_MS = 30 * 60 * 1000;   // a visit ends after 30 minutes of silence

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS days (site TEXT NOT NULL, day TEXT NOT NULL, views INTEGER NOT NULL DEFAULT 0, uniques INTEGER NOT NULL DEFAULT 0,
  visits INTEGER NOT NULL DEFAULT 0, newv INTEGER NOT NULL DEFAULT 0, orders INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (site, day));
CREATE TABLE IF NOT EXISTS hours (site TEXT NOT NULL, day TEXT NOT NULL, hour INTEGER NOT NULL, views INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (site, day, hour));
CREATE TABLE IF NOT EXISTS dims (site TEXT NOT NULL, day TEXT NOT NULL, k TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (site, day, k));
CREATE TABLE IF NOT EXISTS uv (site TEXT NOT NULL, day TEXT NOT NULL, vid TEXT NOT NULL, PRIMARY KEY (site, day, vid));
CREATE TABLE IF NOT EXISTS sess (site TEXT NOT NULL, sid TEXT NOT NULL, t INTEGER NOT NULL, PRIMARY KEY (site, sid));
CREATE TABLE IF NOT EXISTS known (site TEXT NOT NULL, vid TEXT NOT NULL, PRIMARY KEY (site, vid));
CREATE TABLE IF NOT EXISTS live (site TEXT NOT NULL, vid TEXT NOT NULL, t INTEGER NOT NULL, meta TEXT, PRIMARY KEY (site, vid));
`;

// ── time ────────────────────────────────────────────────────────────────────
const dayFmt = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const hourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hourCycle: 'h23', hour: '2-digit' });
const dayKey = (ts) => dayFmt.format(new Date(ts));
const hourKey = (ts) => Number(hourFmt.format(new Date(ts)));
const shiftDay = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const dayRange = (end, n) => Array.from({ length: n }, (_, i) => shiftDay(end, i - n + 1));

// ── what a hit looks like ─────────────────────────────────────────────────────
const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link|pinterest|whatsapp|telegram|discordbot|headless|lighthouse|pagespeed|gtmetrix|python|curl|wget|httpclient|java\/|go-http|axios|node-fetch|postman|preview/i;
const cleanId = (v) => (typeof v === 'string' && /^[a-z0-9]{6,40}$/i.test(v) ? v : '');
function device(ua) {
  if (/ipad|tablet|playbook|silk|android(?!.*mobile)/i.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(ua)) return 'mobil';
  return 'komputer';
}
// Pages are grouped so a crawl of random addresses cannot blow up the lists: every product page is
// "/produkt", every category or brand list "/kategoria"; the few fixed pages keep their address.
function cleanPath(v) {
  let p = String(v || '/').split('?')[0].split('#')[0].toLowerCase();
  if (p.length > 1) p = p.replace(/\/+$/, '');
  if (!p.startsWith('/')) p = '/' + p;
  if (/^\/(pl\/)?[a-z0-9-]+\/[a-z0-9-]+-(rep|w2c|weidian)(-[0-9]+)?$/.test(p) || /^\/[a-z0-9-]+\/[a-z0-9-]+$/.test(p) && !/^\/(brands|guides|tools|spreadsheet|pl)\//.test(p)) return '/produkt';
  if (/^(\/pl)?\/[a-z0-9-]+-reps$/.test(p) || /^\/brands\/[a-z0-9-]+(\/[a-z0-9-]+)?$/.test(p) || /^\/(shoes|jackets|hoodies|t-shirts|tracksuits|pants|shorts|hats|bags|accessories|other)$/.test(p) || /\/page\/\d+$/.test(p)) return '/kategoria';
  if (/^\/guides\//.test(p)) return '/poradniki';
  if (/^\/spreadsheet\//.test(p)) return '/agenci';
  return p.length > 40 ? '/inne' : p;
}
function cleanRef(v, host) {
  if (!v) return '';
  let h;
  try { h = new URL(String(v)).hostname.replace(/^www\./, '').toLowerCase(); } catch (e) { return ''; }
  if (!h || h === String(host || '').replace(/^www\./, '').toLowerCase()) return '';
  return h.replace(/[^a-z0-9.\-]/g, '').slice(0, 60);
}

// ── POST /api/track ────────────────────────────────────────────────────────────
export async function track(request, db) {
  const done = new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  if (request.method !== 'POST' || !db) return done;
  const url = new URL(request.url);
  const site = SITES[url.hostname.replace(/^www\./, '')] || (url.hostname.endsWith('.workers.dev') ? null : null);
  if (!site) return done;
  const ua = request.headers.get('user-agent') || '';
  if (!ua || BOT_RE.test(ua)) return done;
  if (/(?:^|;\s*)vr_notrack=1(?:;|$)/.test(request.headers.get('cookie') || '')) return done;
  let b = {};
  try { b = JSON.parse((await request.text()).slice(0, 4000) || '{}'); } catch (e) { return done; }
  const vid = cleanId(b.vid), sid = cleanId(b.sid);
  if (!vid || !sid) return done;
  const now = Date.now(), day = dayKey(now), path = cleanPath(b.path);
  if (path === '/itemypodtiksy' || path === '/stats') return done;
  const cc = String((request.cf && request.cf.country) || '??').toUpperCase().replace(/[^A-Z?]/g, '').slice(0, 2) || '??';
  const dev = device(ua);
  const start = Number(b.st) > 0 && Number(b.st) <= now ? Number(b.st) : now;
  const meta = JSON.stringify({ p: path, c: cc, d: dev, t: now, s: start });
  try {
    if (b.t === 'ping') {
      // refresh the "now on site" mark only when it is getting old, so a heartbeat costs nothing
      await db.prepare('UPDATE live SET t = ?1' + (b.path ? ', meta = ?4' : '') + ' WHERE site = ?2 AND vid = ?3 AND t < ?1 - 40000')
        .bind(...(b.path ? [now, site, vid, meta] : [now, site, vid])).run();
      return done;
    }
    if (b.t === 'order') {
      await db.prepare('INSERT INTO days (site, day, orders) VALUES (?1, ?2, 1) ON CONFLICT (site, day) DO UPDATE SET orders = orders + 1').bind(site, day).run();
      return done;
    }
    const [s, k, u] = await db.batch([
      db.prepare('SELECT t FROM sess WHERE site = ?1 AND sid = ?2').bind(site, sid),
      db.prepare('SELECT 1 AS x FROM known WHERE site = ?1 AND vid = ?2').bind(site, vid),
      db.prepare('INSERT OR IGNORE INTO uv (site, day, vid) VALUES (?1, ?2, ?3)').bind(site, day, vid),
    ]);
    const last = s.results[0] && s.results[0].t;
    const newVisit = !last || now - last > SESSION_MS ? 1 : 0;
    const newVisitor = k.results.length ? 0 : 1;
    const newUnique = u.meta && u.meta.changes ? 1 : 0;
    const ref = cleanRef(b.ref, url.hostname);
    const dim = (key) => db.prepare('INSERT INTO dims (site, day, k, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT (site, day, k) DO UPDATE SET n = n + 1').bind(site, day, key);
    const w = [
      db.prepare('INSERT INTO sess (site, sid, t) VALUES (?1, ?2, ?3) ON CONFLICT (site, sid) DO UPDATE SET t = ?3').bind(site, sid, now),
      db.prepare('INSERT INTO live (site, vid, t, meta) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (site, vid) DO UPDATE SET t = ?3, meta = ?4').bind(site, vid, now, meta),
      db.prepare('INSERT INTO days (site, day, views, uniques, visits, newv) VALUES (?1, ?2, 1, ?3, ?4, ?5) ON CONFLICT (site, day) DO UPDATE SET views = views + 1, uniques = uniques + ?3, visits = visits + ?4, newv = newv + ?5')
        .bind(site, day, newUnique, newVisit, newVisit && newVisitor ? 1 : 0),
      db.prepare('INSERT INTO hours (site, day, hour, views) VALUES (?1, ?2, ?3, 1) ON CONFLICT (site, day, hour) DO UPDATE SET views = views + 1').bind(site, day, hourKey(now)),
      dim('p|' + path), dim('c|' + cc), dim('d|' + dev),
    ];
    if (newVisitor) w.push(db.prepare('INSERT OR IGNORE INTO known (site, vid) VALUES (?1, ?2)').bind(site, vid));
    if (ref) w.push(dim('r|' + ref));
    else if (newVisit) w.push(dim('r|(bezposrednie)'));
    await db.batch(w);
  } catch (e) { console.error('track:', e.message); }
  return done;
}

// ── GET /api/stats?range=1|7|30|90[&live=1][&site=all|vetereps|therepsheet|weidian] ──────────────
// The same answer as api/stats.js gave, for one site or all of them, plus `sites` per live visitor.
export async function stats(url, db) {
  const q = url.searchParams;
  const pick = q.get('site') && q.get('site') !== 'all' && Object.values(SITES).includes(q.get('site')) ? [q.get('site')] : Object.values(SITES);
  const IN = pick.map(() => '?').join(',');
  const liveOnly = q.get('live') === '1';
  const range = Math.min(Math.max(parseInt(q.get('range'), 10) || 30, 1), 90);
  const nDays = liveOnly ? 1 : Math.max(range, 61);
  const now = Date.now(), today = dayKey(now), dates = dayRange(today, nDays);
  const topDays = liveOnly ? 0 : Math.min(range, 30);
  const uni = (end, n) => db.prepare(`SELECT COUNT(DISTINCT site || ':' || vid) AS n FROM uv WHERE site IN (${IN}) AND day BETWEEN ? AND ?`).bind(...pick, shiftDay(end, -n + 1), end);
  const prevDays = [shiftDay(today, -1), shiftDay(today, -7), shiftDay(today, -30)];
  const r = await db.batch([
    db.prepare(`SELECT day, SUM(views) v, SUM(uniques) u, SUM(visits) s, SUM(newv) nw, SUM(orders) o FROM days WHERE site IN (${IN}) AND day >= ? GROUP BY day`).bind(...pick, dates[0]),
    db.prepare(`SELECT day, hour, SUM(views) v FROM hours WHERE site IN (${IN}) AND day IN (?, ?, ?, ?) GROUP BY day, hour`).bind(...pick, today, ...prevDays),
    db.prepare(`SELECT site, meta FROM live WHERE site IN (${IN}) AND t > ?`).bind(...pick, now - LIVE_MS),
    uni(today, 7), uni(shiftDay(today, -7), 7), uni(today, 30), uni(shiftDay(today, -30), 30),
    db.prepare(`SELECT k, SUM(n) n FROM dims WHERE site IN (${IN}) AND day >= ? GROUP BY k ORDER BY 2 DESC LIMIT 400`).bind(...pick, topDays ? shiftDay(today, -topDays + 1) : '9999'),
  ]);
  // housekeeping, at most once in a while: visits and live marks older than a day are no use
  if (Math.random() < 0.05) db.batch([db.prepare('DELETE FROM sess WHERE t < ?').bind(now - 86400000), db.prepare('DELETE FROM live WHERE t < ?').bind(now - 86400000)]).catch(() => {});

  const byDay = new Map(r[0].results.map((x) => [x.day, x]));
  const col = (k) => dates.map((d) => Number((byDay.get(d) || {})[k] || 0));
  const views = col('v'), uniques = col('u'), visits = col('s'), newcomers = col('nw'), orders = col('o');
  const hrs = {}; for (const d of [today, ...prevDays]) hrs[d] = {};
  for (const x of r[1].results) hrs[x.day][String(x.hour)] = Number(x.v);
  const n = dates.length, sum = (a) => a.reduce((x, y) => x + y, 0);
  const tail = (a, k, skip = 0) => sum(a.slice(n - k - skip, n - skip));
  const delta = (cur, prev) => (!prev ? (cur ? null : 0) : Math.round(((cur - prev) / prev) * 1000) / 10);
  const live = r[2].results.map((x) => { try { return { ...JSON.parse(x.meta || '{}'), site: x.site }; } catch (e) { return { site: x.site }; } });
  const hours = Array.from({ length: 24 }, (_, h) => Number(hrs[today][String(h)] || 0));
  const out = {
    ok: true, kind: 'd1', tz: TZ, now, liveWindow: LIVE_MS, site: pick.length > 1 ? 'all' : pick[0], sites: Object.values(SITES),
    live: {
      count: live.length,
      sessions: live.map((m) => ({ site: m.site, path: m.p || '/', cc: m.c || '??', dev: m.d || '?', ago: Math.max(0, Math.round((now - (m.t || now)) / 1000)), dur: Math.max(0, Math.round((now - (m.s || m.t || now)) / 1000)) }))
        .sort((a, b) => b.dur - a.dur).slice(0, 60),
    },
    today: { views: views[n - 1], uniques: uniques[n - 1], visits: visits[n - 1], newcomers: newcomers[n - 1], orders: orders[n - 1], hours },
  };
  if (!liveOnly) {
    const upto = hourKey(now);
    const partial = (h) => { let s = 0; for (let i = 0; i <= upto; i++) s += Number(h[String(i)] || 0); return s; };
    const prevViews = (k, d) => tail(views, k, k) - (views[n - 1 - k] || 0) + partial(hrs[d]);
    const num = (x) => Number((x.results[0] || {}).n || 0);
    const cards = {
      today: { views: views[n - 1], prevViews: partial(hrs[prevDays[0]]), uniques: uniques[n - 1], visits: visits[n - 1] },
      d7: { views: tail(views, 7), prevViews: prevViews(7, prevDays[1]), uniques: num(r[3]), visits: tail(visits, 7) },
      d30: { views: tail(views, 30), prevViews: prevViews(30, prevDays[2]), uniques: num(r[5]), visits: tail(visits, 30) },
    };
    for (const c in cards) cards[c].dViews = delta(cards[c].views, cards[c].prevViews);
    const dims = r[7].results;
    const top = (kind, lim) => dims.filter((x) => x.k[0] === kind && x.k[1] === '|').slice(0, lim).map((x) => [x.k.slice(2), Number(x.n)]);
    Object.assign(out, {
      cards, upto, range, topDays,
      series: dates.slice(n - range).map((d, i) => { const j = n - range + i; return { d, views: views[j], uniques: uniques[j], visits: visits[j], nw: newcomers[j], orders: orders[j] }; }),
      top: { paths: top('p', 10), refs: top('r', 10), countries: top('c', 10), devices: top('d', 5) },
    });
  }
  return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
