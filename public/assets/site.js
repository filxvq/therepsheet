// The only script on the site. Pages are complete without it; it:
//   1. points every buy and sign-up link at the agent the visitor picked (kept in localStorage),
//   2. shows prices in that agent's dollars, or EUR/GBP, using live rates from /api/rates/,
//   3. keeps favorites (ids in localStorage) and draws the /favorites/ page,
//   4. runs the search box over /search.json, loaded the first time the box is used.
(function () {
  var T = window.TRS || {};
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
                set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var agents = T.agents || [];
  var byId = {}; agents.forEach(function (a) { byId[a.id] = a; });
  var agent = byId[store.get('trs_agent')] || byId[T.def] || agents[0];
  var cur = store.get('trs_cur') || 'USD';
  var rates = { CNY: T.cny || 6.71, EUR: 0.86, GBP: 0.75 };
  try { var saved = JSON.parse(store.get('trs_rates') || 'null'); if (saved) rates = Object.assign(rates, saved); } catch (e) {}
  var SYM = { USD: '$', EUR: '€', GBP: '£' };
  var promoAgent = function () { return agent.perk ? agent : byId[T.def]; };

  function weidian(id) { return 'https://weidian.com/item.html?itemID=' + id; }
  function link(id, a) {
    var c = a.code;
    switch (a.id) {
      case 'kakobuy': return 'https://www.kakobuy.com/item/details?url=' + encodeURIComponent(weidian(id)) + (c ? '&affcode=' + c : '');
      case 'usfans': return 'https://www.usfans.com/product/3/' + id + (c ? '?ref=' + c : '');
      case 'sinabuy': return 'https://www.sinabuy.com/product/2/' + id + (c ? '?inviteCode=' + c : '');
      case 'litbuy': return 'https://litbuy.com/products/details?id=' + id + '&channel=WEIDIAN' + (c ? '&ref=' + c : '');
      case 'oopbuy': return 'https://www.oopbuy.com/product/weidian/' + id + (c ? '?inviteCode=' + c : '');
      case 'acbuy': return 'https://www.acbuy.com/product/?id=' + id + '&source=WD' + (c ? '&u=' + c : '');
    }
    return weidian(id);
  }
  function fmt(cny) {
    var usd = cny / rates.CNY * (agent.rate || 1);
    var v = cur === 'USD' ? usd : usd * (rates[cur] || 1);
    return SYM[cur] + v.toFixed(2);
  }
  function apply() {
    var pa = promoAgent();
    $$('[data-cny]').forEach(function (el) { el.textContent = fmt(+el.getAttribute('data-cny')); });
    $$('a[data-wd]').forEach(function (el) { el.href = link(el.getAttribute('data-wd'), agent); });
    $$('.agent-name').forEach(function (el) { el.textContent = el.closest('[data-signup]') ? pa.name : agent.name; });
    $$('.agent-logo').forEach(function (el) { el.src = agent.logo; });
    $$('.cur-name').forEach(function (el) { el.textContent = cur; });
    $$('[data-signup]').forEach(function (el) { el.href = pa.signup; });
    $$('[data-perk-title]').forEach(function (el) { el.textContent = pa.perk; });
    $$('[data-perk]').forEach(function (el) {
      el.innerHTML = agent.perk ? 'New to ' + agent.name + '? <a href="' + agent.signup + '" rel="nofollow sponsored noopener" target="_blank">Sign up</a> for ' + agent.perk + '.' : '';
    });
    $$('.agent-opt').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-agent') === agent.id); });
    $$('.seg button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-cur') === cur); });
  }

  // ── agent & currency popover ──
  var btn = $('#prefsBtn'), pop = $('#prefsPop');
  function openPop(on) { if (!pop) return; pop.classList.toggle('open', on); btn.setAttribute('aria-expanded', on ? 'true' : 'false'); }
  if (btn) btn.addEventListener('click', function (e) { e.stopPropagation(); openPop(!pop.classList.contains('open')); });
  $$('.agent-opt').forEach(function (b) { b.addEventListener('click', function () {
    agent = byId[b.getAttribute('data-agent')] || agent; store.set('trs_agent', agent.id); apply(); setTimeout(function () { openPop(false); }, 160);
  }); });
  $$('.seg button').forEach(function (b) { b.addEventListener('click', function () { cur = b.getAttribute('data-cur'); store.set('trs_cur', cur); apply(); }); });
  document.addEventListener('click', function (e) { if (pop && !e.target.closest('.prefs')) openPop(false); });

  fetch('/api/rates/').then(function (r) { return r.ok ? r.json() : null; }).then(function (k) {
    if (!k || !k.CNY) return;
    rates = { CNY: k.CNY, EUR: k.EUR || rates.EUR, GBP: k.GBP || rates.GBP };
    store.set('trs_rates', JSON.stringify(rates)); apply();
  }).catch(function () {});

  // ── favorites ──
  var favs = [];
  try { favs = JSON.parse(store.get('trs_favs') || '[]'); } catch (e) {}
  function syncFavs() {
    $$('[data-fav]').forEach(function (b) {
      var on = favs.indexOf(b.getAttribute('data-fav')) >= 0;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      var l = $('.fav-label', b); if (l) l.textContent = on ? '♥ Saved' : '♡ Save to favorites';
    });
    $$('.fav-count').forEach(function (c) { c.textContent = favs.length; c.hidden = !favs.length; });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-fav]'); if (!b) return;
    e.preventDefault();
    var id = b.getAttribute('data-fav'), i = favs.indexOf(id);
    if (i >= 0) favs.splice(i, 1); else favs.unshift(id);
    store.set('trs_favs', JSON.stringify(favs));
    syncFavs();
    $$('[data-fav="' + id + '"]').forEach(function (x) { x.classList.remove('pulse'); void x.offsetWidth; x.classList.add('pulse'); });
    if ($('#favGrid') && i >= 0) { var card = b.closest('.card'); if (card) { card.style.opacity = '0'; card.style.transform = 'scale(.96)'; setTimeout(drawFavs, 180); } }
  });

  // ── search data, shared by the search box and the favorites page ──
  var data = null, loading = null;
  function load() {
    return loading || (loading = fetch('/search.json').then(function (r) { return r.json(); }).then(function (d) {
      data = d.map(function (x) { return { n: x[0], u: x[1], i: x[2], c: x[3], b: x[4], id: String(x[5]), cat: x[6], k: (x[0] + ' ' + x[4]).toLowerCase() }; });
    }));
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var HEART = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/></svg>';
  function cardHtml(x) {
    return '<article class="card"><a class="card-img" href="' + x.u + '" tabindex="-1"><img src="' + x.i + '" alt="' + esc(x.n) + ' rep" width="360" height="360" loading="lazy"></a>'
      + '<button type="button" class="fav" data-fav="' + x.id + '" aria-pressed="true" aria-label="Remove from favorites">' + HEART + '</button>'
      + '<div class="card-body"><p class="card-cat">' + esc((T.cats || {})[x.cat] || '') + '</p><a class="card-name" href="' + x.u + '">' + esc(x.n) + '</a><p class="price" data-cny="' + x.c + '"></p></div>'
      + '<div class="card-actions"><a class="btn-ghost" href="' + x.u + '">View details</a><a class="btn-buy" data-wd="' + x.id + '" href="#" rel="nofollow sponsored noopener" target="_blank">Buy on <span class="agent-name"></span> →</a></div></article>';
  }
  function drawFavs() {
    var g = $('#favGrid'); if (!g) return;
    load().then(function () {
      var map = {}; data.forEach(function (x) { map[x.id] = x; });
      var list = favs.map(function (id) { return map[id]; }).filter(Boolean);
      g.innerHTML = list.map(cardHtml).join('');
      $('#favEmpty').hidden = list.length > 0;
      $('#favNote').textContent = list.length ? list.length + (list.length === 1 ? ' rep' : ' reps') + ' saved on this device.' : 'Saved on this device.';
      apply(); syncFavs();
    });
  }

  apply(); syncFavs(); drawFavs();

  // ── search box ──
  var q = $('#q'), box = $('#results');
  if (!q || !box) return;
  var pick = -1;
  function render() {
    var s = q.value.trim().toLowerCase();
    if (!s) { box.hidden = true; return; }
    var words = s.split(/\s+/);
    var hits = data.filter(function (x) { return words.every(function (w) { return x.k.indexOf(w) >= 0; }); }).slice(0, 12);
    pick = -1;
    box.innerHTML = hits.length ? hits.map(function (x) {
      return '<a href="' + x.u + '"><img src="' + x.i + '" alt="" loading="lazy"><span class="r-name"><span class="r-cat">' + esc((T.cats || {})[x.cat] || '') + '</span>' + esc(x.n) + '</span><span class="r-price">' + fmt(x.c) + '</span></a>';
    }).join('') : '<div class="none">No reps match “' + esc(q.value) + '”.</div>';
    box.hidden = false;
  }
  q.addEventListener('focus', function () { load().then(function () { if (q.value) render(); }); });
  q.addEventListener('input', function () { load().then(render); });
  q.addEventListener('keydown', function (e) {
    var items = $$('a', box);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); if (!items.length) return;
      pick = (pick + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach(function (a, i) { a.classList.toggle('sel', i === pick); });
      items[pick].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      var a = items[pick >= 0 ? pick : 0]; if (a) location.href = a.href;
    } else if (e.key === 'Escape') { box.hidden = true; q.blur(); }
  });
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); q.focus(); q.select(); }
    if (e.key === 'Escape') openPop(false);
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.search')) box.hidden = true; });
  // ?q= in the address (the home page's SearchAction) opens the box with that query
  var start = new URLSearchParams(location.search).get('q');
  if (start) { q.value = start; load().then(function () { render(); q.focus(); }); }
})();
