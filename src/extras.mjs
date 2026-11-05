// The sellers pages, the Trending Sellers row on the home page and the shipping calculator.
// The same file sits in therepsheet, weidiansheet and theqcfinder; only COPY differs per site, so keep
// the copies identical. Data comes from the sibling ../katalog folder: data/sellers.json (scripts/sellers)
// and the agent rates measured at 2 kg and 5 kg (scripts/agenci/strona.js).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const KATALOG = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'katalog');
const { DANE, POMIAR } = createRequire(import.meta.url)(path.join(KATALOG, 'scripts', 'agenci', 'strona.js'));
const { at: DATA_SELLERS, sellers: WSZYSCY } = JSON.parse(fs.readFileSync(path.join(KATALOG, 'data', 'sellers.json'), 'utf8'));

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const liczba = (n) => Number(n).toLocaleString('en-US');
const KURS = 6.67;

// A contact number or an offensive listing name does not belong on these pages; the rest of a shop stays.
const ZLA_NAZWA = /whatsapp|epstein|jihad/i;
const SLABA_NAZWA = /[㐀-鿿]/;
const itemy = (s) => s.items.filter((i) => i.t && i.img && !ZLA_NAZWA.test(i.t));
const SKLEPY = WSZYSCY.filter((s) => itemy(s).length >= 6).sort((a, b) => (b.followers || 0) - (a.followers || 0));

// what fronts a shop: the items with the most QC sets, listings with a clean name and a real price first
function wybor(s, ile) {
  const bezDubli = [...new Map(itemy(s).map((i) => [i.img, i])).values()];
  const dobry = (i) => !SLABA_NAZWA.test(i.t) && i.cny / KURS >= 2;
  const po = (a) => [...a].sort((x, y) => (y.qc || 0) - (x.qc || 0));
  return [...po(bezDubli.filter(dobry)), ...po(bezDubli.filter((i) => !dobry(i)))].slice(0, ile);
}
const odCeny = (s) => Math.max(1, Math.round(Math.min(...itemy(s).map((i) => i.cny)) / KURS));

const COPY = {
  TheRepSheet: {
    root: 'Rep Spreadsheet', rowTitle: 'Trending Rep Sellers', crumb: 'Rep sellers', calcCrumb: 'Shipping calculator',
    listTitle: (n) => `${n} Rep Sellers on Weidian: Shops & Prices | TheRepSheet`,
    listDesc: (n) => `${n} independent rep sellers on Weidian with their items, prices, followers and repeat-buyer rates. Open any item through your shopping agent.`,
    h1: 'Rep Sellers', intro: 'Weidian shops that are worth a look beyond the rep spreadsheet, the most followed first. Numbers come from each shop\'s own listing data.',
    shopTitle: (s, n) => `${s} Reps: ${n} Items From This Weidian Seller | TheRepSheet`,
    shopDesc: (s, n, a) => `${n} reps from ${s} on Weidian, from $${a}. See each item's price and QC sets, and open it on your shopping agent.`,
    shopH1: (s) => `${s} Reps`, itemAlt: (t) => `${t} rep`,
    calcTitle: 'Rep Shipping Calculator: Cost by Agent | TheRepSheet',
    calcDesc: 'Estimate what your rep haul costs to ship to Poland or the US on six agents. Pick the items in the parcel or type its weight.',
    calcH1: 'Rep Haul Shipping Calculator', calcIntro: 'Add what is in your haul and compare the rough shipping price on six agents.',
  },
  TheWeidianSpreadsheet: {
    root: 'Weidian Spreadsheet', rowTitle: 'Trending Weidian Sellers', crumb: 'Weidian sellers', calcCrumb: 'Shipping calculator',
    listTitle: (n) => `Best Weidian Sellers: ${n} Shops With Items & Prices`,
    listDesc: (n) => `${n} Weidian sellers to browse, with every item's price, the shop's followers and how many buyers come back. Open any item through an agent.`,
    h1: 'Weidian Sellers', intro: 'Independent Weidian shops, sorted by followers. Open a shop to see its items, or pick an item below to view it on your agent.',
    shopTitle: (s, n) => `Weidian ${s}: ${n} Links From This Seller`,
    shopDesc: (s, n, a) => `${n} Weidian links from the seller ${s}, from $${a}, with prices, QC counts and links for six shopping agents.`,
    shopH1: (s) => `Weidian Seller: ${s}`, itemAlt: (t) => `Weidian ${t}`,
    calcTitle: 'Weidian Shipping Calculator: Agents Compared',
    calcDesc: 'How much does a Weidian order cost to ship? Pick the items or enter the weight and compare six agents, to Poland or the US.',
    calcH1: 'Weidian Shipping Calculator', calcIntro: 'Weidian sellers ship to your agent in China, and the agent ships to you. Add your items to estimate that second price.',
  },
  TheLitbuySpreadsheets: {
    root: 'Litbuy Spreadsheet', rowTitle: 'Trending Weidian Sellers on Litbuy', crumb: 'Sellers', calcCrumb: 'Shipping calculator',
    listTitle: (n) => `${n} Weidian Sellers to Shop on Litbuy | TheLitbuySpreadsheets`,
    listDesc: (n) => `${n} Weidian sellers with every item's price in the Litbuy spreadsheet, their followers and repeat buyers. Open any item on Litbuy.`,
    h1: 'Weidian Sellers on Litbuy', intro: 'Independent Weidian shops, most followed first. Every item opens on Litbuy, or on another agent if you switch at the top.',
    shopTitle: (s, n) => `${s} on Litbuy: ${n} Items From This Weidian Seller`,
    shopDesc: (s, n, a) => `${n} items from the Weidian seller ${s}, from $${a}, each with its price and a direct Litbuy link.`,
    shopH1: (s) => `${s} on Litbuy`, itemAlt: (t) => t,
    calcTitle: 'Litbuy Shipping Calculator: Cost to Poland & the US',
    calcDesc: 'Estimate what your Litbuy haul costs to ship to Poland or the US, and compare it with five other agents. Pick the items or type the weight.',
    calcH1: 'Litbuy Shipping Calculator', calcIntro: 'Add what is in your parcel to see roughly what Litbuy charges to ship it, next to five other agents.',
  },
  TheQCFinder: {
    root: 'TheQCFinder', rowTitle: 'Trending Sellers With QC', crumb: 'Sellers', calcCrumb: 'Shipping calculator',
    listTitle: (n) => `${n} Weidian Sellers: Items & QC Counts | TheQCFinder`,
    listDesc: (n) => `Browse ${n} Weidian sellers and see which of their items have QC photos, how many sets, what they cost and how often buyers come back.`,
    h1: 'Sellers and Their QC', intro: 'Weidian shops with the number of QC sets on each item, so you can see which listings people actually order. Paste any item into the QC Finder to see its photos.',
    shopTitle: (s, n) => `${s} QC: ${n} Items From This Seller | TheQCFinder`,
    shopDesc: (s, n, a) => `${n} items from ${s}, from $${a}, with the number of QC sets on each. Check the photos in the QC Finder before you buy.`,
    shopH1: (s) => `${s} QC`, itemAlt: (t) => `${t} QC`,
    calcTitle: 'Shipping Calculator for Your Passed QC Haul | TheQCFinder',
    calcDesc: 'QC passed? Estimate the shipping on six agents to Poland or the US from the items in your parcel or its weight.',
    calcH1: 'Shipping Calculator', calcIntro: 'Once your QC photos look right, the next cost is shipping. Add the items and compare six agents.',
  },
};

const PRZEDMIOTY = [
  ['tee', 0.25, 'T-shirt', 2], ['long', 0.3, 'Longsleeve'], ['hoodie', 0.8, 'Hoodie', 1], ['sweater', 0.6, 'Sweater'], ['jacket', 1.2, 'Jacket'],
  ['jeans', 0.7, 'Jeans'], ['sweatpants', 0.6, 'Sweatpants'], ['shorts', 0.35, 'Shorts'], ['shoes', 1.3, 'Shoes', 1], ['bag', 0.8, 'Bag'],
  ['belt', 0.25, 'Belt'], ['hat', 0.15, 'Hat'], ['socks', 0.1, 'Socks / underwear'], ['jewelry', 0.1, 'Jewelry / watch'],
].map(([id, kg, nazwa, ile]) => ({ id, kg, nazwa, ile }));

// Runs at build time for the first paint and in the page on every change, so the two cannot disagree.
function wyniki(D, s) {
  // no reading below 2 kg, and the line runs out of truth there: under 1 kg the 1 kg figure stands
  var szac = function (a, b, w) {
    var kg = Math.max(w, 1), nachylenie = (b - a) / 3, prosta = a + nachylenie * (kg - 2);
    return kg < 2 ? Math.max(prosta, a * kg / 2) : prosta;
  };
  var z = D.map(function (a) {
    var m = a[s.kraj], bliski = s.waga <= 3.5 ? m[2] : m[5];
    return { a: a, reg: szac(m[2].reg, m[5].reg, s.waga), kup: szac(m[2].kup, m[5].kup, s.waga), dni: bliski.dni, cla: bliski.cla };
  });
  var cena = function (x) { return s.kupon ? x.kup : x.reg; };
  z.sort(function (x, y) { return cena(x) - cena(y); });
  return z.map(function (x, i) {
    var a = x.a;
    return '<article class="sx-wynik' + (i === 0 ? ' on' : '') + '"><img src="' + a.logo + '" alt="" width="36" height="36" loading="lazy">'
      + '<div class="sx-kto"><b>' + a.name + '</b>' + (i === 0 ? '<span>Cheapest</span>' : '')
      + '<small>' + x.dni + ' days' + (x.cla ? ' · Duties paid by the recipient' : '') + (a.kod ? ' · Code: ' + a.kod : '') + '</small></div>'
      + '<div class="sx-ile">≈ $' + cena(x).toFixed(2) + (s.kupon ? '<s>$' + x.reg.toFixed(2) + '</s>' : '') + '</div>'
      + '<div class="sx-akcje"><a class="on" href="' + a.signup + '" rel="sponsored nofollow noopener" target="_blank">Sign up</a><a href="' + a.kalk + '" rel="nofollow noopener" target="_blank">Check on their site</a></div></article>';
  }).join('');
}

const STRZALKI = `<script>document.querySelectorAll('.sx-okno').forEach(function(o){var s=o.querySelector('.sx-tor'),l=o.querySelector('.sx-l'),r=o.querySelector('.sx-r');function u(){if(!s.clientWidth)return;l.hidden=s.scrollLeft<8;r.hidden=s.scrollLeft+s.clientWidth>=s.scrollWidth-8;}function j(k){s.scrollBy({left:k*(s.clientWidth-60),behavior:'smooth'});}l.onclick=function(){j(-1);};r.onclick=function(){j(1);};s.addEventListener('scroll',u,{passive:true});addEventListener('resize',u);u();});</script>`;
const ikona = (d) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const NAV = `<button type="button" class="sx-nav sx-l" aria-label="Previous" hidden>${ikona('M15 6l-6 6 6 6')}</button>`;
const NAV2 = `<button type="button" class="sx-nav sx-r" aria-label="Next" hidden>${ikona('M9 6l6 6-6 6')}</button>`;

// The row on the home page: one card per shop.
export function homeRow(NAME) {
  const c = COPY[NAME];
  const karty = SKLEPY.map((s) => {
    const z = wybor(s, 3);
    const info = [`from $${odCeny(s)}`];
    if (s.repurchase) info.unshift(`${s.repurchase}% repeat`);
    return `<a class="sx-karta" href="/sellers/${s.slug}/">${s.logo ? `<img class="sx-logo" src="${esc(s.logo)}" alt="" width="52" height="52" loading="lazy" referrerpolicy="no-referrer">` : ''}<b>${esc(s.name)}</b><small>${esc(info.join(' · '))}</small><span class="sx-mini">${z.map((i) => `<img src="${esc(i.img)}" alt="" width="90" height="90" loading="lazy" referrerpolicy="no-referrer">`).join('')}</span></a>`;
  }).join('');
  return `<section><div class="sec-head"><h2>${esc(c.rowTitle)}</h2><a class="sec-link" href="/sellers/">All ${SKLEPY.length} sellers →</a></div><div class="sx-okno">${NAV}<div class="sx-tor">${karty}</div>${NAV2}</div></section>${STRZALKI}`;
}

export function extraPages({ NAME, page, crumbs, write, price, buyUrl, AGENTS }) {
  const c = COPY[NAME];
  const karta = (i, nazwa) => `<a class="sx-item" data-wd="${i.id}" href="${esc(buyUrl(i.id))}" target="_blank" rel="nofollow sponsored noopener"${nazwa ? ` data-q="${esc(i.t.toLowerCase())}"` : ''}><img src="${esc(i.img)}" alt="${esc(c.itemAlt(i.t))}" width="300" height="300" loading="lazy" referrerpolicy="no-referrer"><h3>${esc(i.t)}</h3><p><b data-cny="${i.cny}">${price(i.cny)}</b>${i.qc ? ` · QC ${i.qc}` : ''}</p></a>`;
  const staty = (s) => {
    const x = [];
    if (s.followers) x.push(`${liczba(s.followers)} followers`);
    x.push(`from $${odCeny(s)}`);
    if (s.repurchase) x.push(`${s.repurchase}% repeat buyers`);
    x.push(`${liczba(itemy(s).length)} items`);
    return x;
  };
  const dzien = new Date(DATA_SELLERS + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const ujawnij = `<p class="sx-uwaga">Item links carry our agent referral code, which can earn us a commission and does not change the item price. These shops are not run by or connected to ${NAME}, and we do not check their items. Data from ${dzien}.</p>`;

  // the list
  {
    const [bc, ld] = crumbs([[c.root, '/'], [c.crumb, '/sellers/']]);
    const rzedy = SKLEPY.map((s) => {
      const z = wybor(s, 12), ile = itemy(s).length;
      return `<section class="sx-wiersz" data-q="${esc(s.name.toLowerCase())}"><div class="sx-glowa"><a href="/sellers/${s.slug}/">${s.logo ? `<img class="sx-logo" src="${esc(s.logo)}" alt="" width="44" height="44" loading="lazy" referrerpolicy="no-referrer">` : ''}<span><b>${esc(s.name)}</b><small>${esc(staty(s).join(' · '))}</small></span></a><a class="sx-pill" href="/sellers/${s.slug}/">View shop</a></div>
<div class="sx-okno">${NAV}<div class="sx-tor">${z.map((i) => karta(i)).join('')}${ile > z.length ? `<a class="sx-item" href="/sellers/${s.slug}/"><span class="sx-reszta">View all<small>${liczba(ile)} items</small></span></a>` : ''}</div>${NAV2}</div></section>`;
    }).join('\n');
    write('/sellers/', page({ title: c.listTitle(SKLEPY.length), desc: c.listDesc(SKLEPY.length), url: '/sellers/', jsonld: [ld], active: 'sellers',
      body: `${bc}<header class="head"><h1>${esc(c.h1)}</h1><p class="intro">${esc(c.intro)}</p></header>
<label class="sx-szukaj"><input id="sxQ" type="search" placeholder="Search sellers…" aria-label="Search sellers" autocomplete="off"></label>
<div class="sx-lista">${rzedy}</div><p class="sx-brak" id="sxBrak" hidden>No seller with that name.</p>${ujawnij}${STRZALKI}${FILTR('.sx-wiersz')}` }));
  }

  // one page per shop
  for (const s of SKLEPY) {
    const url = `/sellers/${s.slug}/`, lista = itemy(s);
    const [bc, ld] = crumbs([[c.root, '/'], [c.crumb, '/sellers/'], [s.name, url]]);
    write(url, page({ title: c.shopTitle(s.name, lista.length), desc: c.shopDesc(s.name, lista.length, odCeny(s)), url, jsonld: [ld], active: 'sellers',
      body: `${bc}<header class="head sx-sklep">${s.logo ? `<img class="sx-logo" src="${esc(s.logo)}" alt="" width="64" height="64" referrerpolicy="no-referrer">` : ''}<div><h1>${esc(c.shopH1(s.name))}</h1><p class="count">${esc(staty(s).join(' · '))}${s.city ? ` · ${esc(s.city)}` : ''}</p></div></header>
<p class="intro">Check the photos and QC before you buy. <a href="${esc(s.url)}" target="_blank" rel="nofollow noopener">Open the full shop on Weidian ↗</a></p>
<label class="sx-szukaj"><input id="sxQ" type="search" placeholder="Search this shop…" aria-label="Search this shop" autocomplete="off"></label>
<div class="sx-siatka">${lista.map((i) => karta(i, true)).join('')}</div><p class="sx-brak" id="sxBrak" hidden>Nothing matches.</p>
<p class="more"><a href="/sellers/">← All sellers</a></p>${ujawnij}${FILTR('.sx-item')}` }));
  }

  // the calculator
  {
    const url = '/tools/shipping-calculator/';
    const dane = DANE.map((d) => { const a = AGENTS.find((x) => x.id === d.id) || {}; return { name: d.name, logo: a.logo || d.logo, kod: a.code || '', signup: a.signup || d.signup, kalk: d.kalk, PL: d.PL, US: d.US }; });
    const start = {};
    PRZEDMIOTY.forEach((p) => { if (p.ile) start[p.id] = p.ile; });
    const wagaStart = PRZEDMIOTY.reduce((w, p) => w + (start[p.id] || 0) * p.kg, 0);
    const [bc, ld] = crumbs([[c.root, '/'], [c.calcCrumb, url]]);
    write(url, page({ title: c.calcTitle, desc: c.calcDesc, url, jsonld: [ld, { '@context': 'https://schema.org', '@type': 'WebApplication', name: c.calcH1, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }],
      body: `${bc}<header class="head"><h1>${esc(c.calcH1)}</h1><p class="intro">${esc(c.calcIntro)}</p></header>
<div class="sx-uklad"><section class="sx-panel">
<span class="sx-et">Ship to</span><div class="sx-wybor" id="sxKraj"><button type="button" data-v="PL" aria-pressed="true">Poland</button><button type="button" data-v="US" aria-pressed="false">United States</button></div>
<div class="sx-nag"><span class="sx-et">What is in the parcel</span><button type="button" id="sxCzysc">Clear</button></div>
${PRZEDMIOTY.map((p) => `<div class="sx-rzecz"><span>${esc(p.nazwa)}<small>~${p.kg} kg</small></span><span class="sx-licz"><button type="button" data-id="${p.id}" data-k="-1" aria-label="Remove one: ${esc(p.nazwa)}">−</button><output id="sxN-${p.id}">${p.ile || 0}</output><button type="button" data-id="${p.id}" data-k="1" aria-label="Add one: ${esc(p.nazwa)}">+</button></span></div>`).join('\n')}
<div class="sx-waga"><span>Estimated weight</span><b id="sxWaga">${wagaStart.toFixed(2)} kg</b></div>
<label class="sx-wlasna"><span class="sx-et">Or type the weight (kg)</span><input type="number" id="sxWlasna" min="0.1" max="30" step="0.1" inputmode="decimal"></label>
<label class="sx-kupon"><input type="checkbox" id="sxKupon">Sign-up coupon on shipping</label>
</section><section id="sxWyniki" aria-live="polite">${wyniki(dane, { kraj: 'PL', waga: wagaStart, kupon: false })}</section></div>
<article class="prose"><h2>How accurate is this?</h2><p>It is an estimate. On ${new Date(POMIAR + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} we read each agent's cheapest line under 30 days at 2 kg and 5 kg, and other weights follow a straight line between those readings. It is closest between 2 and 5 kg and less reliable for heavier parcels. Under 1 kg we show the 1 kg figure, so a very light parcel may cost less.</p>
<p>Item weights are rough averages, and agents charge by volumetric weight when a parcel is bulky, so shoes in their boxes and puffer jackets can cost more. Coupons usually work only on a first parcel or for a limited time. Kakobuy shows no coupon in its estimator, so we take off the 20% of our sign-up code.</p>
<p>Before you pay, check the final price in your agent's own estimator with your real parcel. Some links here carry our referral code, and the order comes only from the estimated shipping cost.</p></article>
<script>(function(){var D=${JSON.stringify(dane).replace(/</g, '\\u003c')},P=${JSON.stringify(PRZEDMIOTY.map((p) => ({ id: p.id, kg: p.kg })))},ile=${JSON.stringify(start)},s={kraj:'PL',kupon:false};var wyniki=${wyniki.toString()};var $=function(i){return document.getElementById(i);};function waga(){var w=parseFloat($('sxWlasna').value);if(w>0)return Math.min(w,30);return P.reduce(function(a,p){return a+(ile[p.id]||0)*p.kg;},0);}function pokaz(){P.forEach(function(p){$('sxN-'+p.id).textContent=ile[p.id]||0;});var w=waga();$('sxWaga').textContent=w.toFixed(2)+' kg';$('sxWyniki').innerHTML=w>0?wyniki(D,{kraj:s.kraj,waga:w,kupon:s.kupon}):'<p class="sx-brak">Add something to the parcel.</p>';document.querySelectorAll('#sxKraj button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.v===s.kraj));});}document.querySelectorAll('.sx-licz button').forEach(function(b){b.addEventListener('click',function(){ile[b.dataset.id]=Math.max(0,(ile[b.dataset.id]||0)+Number(b.dataset.k));$('sxWlasna').value='';pokaz();});});document.querySelectorAll('#sxKraj button').forEach(function(b){b.addEventListener('click',function(){s.kraj=b.dataset.v;pokaz();});});$('sxCzysc').addEventListener('click',function(){ile={};$('sxWlasna').value='';pokaz();});$('sxWlasna').addEventListener('input',pokaz);$('sxKupon').addEventListener('change',function(e){s.kupon=e.target.checked;pokaz();});})();</script>` }));
  }
  return { sklepy: SKLEPY.length };
}

const FILTR = (sel) => `<script>(function(){var i=document.getElementById('sxQ'),w=[].slice.call(document.querySelectorAll('${sel}[data-q]')),b=document.getElementById('sxBrak');i.addEventListener('input',function(){var q=i.value.trim().toLowerCase(),n=0;w.forEach(function(e){var ok=!q||e.getAttribute('data-q').indexOf(q)>-1;e.hidden=!ok;if(ok)n++;});b.hidden=n>0;});})();</script>`;
