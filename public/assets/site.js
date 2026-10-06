// The only script on the site. Pages are complete without it; it does three things:
//   1. points every buy link at the agent the visitor picked (kept in localStorage),
//   2. shows prices in that agent's dollars, or EUR/GBP, using live rates from /api/rates,
//   3. runs the search box over /search.json, loaded the first time the box is used.
(function () {
  var T = window.TRS || {};
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
                set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var agents = T.agents || [];
  var byId = {}; agents.forEach(function (a) { byId[a.id] = a; });
  var agent = byId[store.get('trs_agent')] || byId[T.def] || agents[0];
  var cur = store.get('trs_cur') || 'USD';
  var rates = { CNY: T.cny || 6.71, EUR: 0.86, GBP: 0.75 };
  try { var saved = JSON.parse(store.get('trs_rates') || 'null'); if (saved) rates = Object.assign(rates, saved); } catch (e) {}
  var SYM = { USD: '$', EUR: '€', GBP: '£' };

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
    document.querySelectorAll('[data-cny]').forEach(function (el) { el.textContent = fmt(+el.getAttribute('data-cny')); });
    document.querySelectorAll('a[data-wd]').forEach(function (el) { el.href = link(el.getAttribute('data-wd'), agent); });
    document.querySelectorAll('.agent-name').forEach(function (el) { el.textContent = agent.name; });
    document.querySelectorAll('[data-perk]').forEach(function (el) {
      el.innerHTML = agent.perk ? 'New to ' + agent.name + '? <a href="' + agent.signup + '" rel="nofollow sponsored noopener" target="_blank">Sign up</a> for ' + agent.perk + '.' : '';
    });
  }

  var sel = document.getElementById('agent'), cs = document.getElementById('cur');
  if (sel) { sel.value = agent.id; sel.addEventListener('change', function () { agent = byId[sel.value] || agent; store.set('trs_agent', agent.id); apply(); }); }
  if (cs) { cs.value = cur; cs.addEventListener('change', function () { cur = cs.value; store.set('trs_cur', cur); apply(); }); }
  apply();
  fetch('/api/rates/').then(function (r) { return r.ok ? r.json() : null; }).then(function (k) {
    if (!k || !k.CNY) return;
    rates = { CNY: k.CNY, EUR: k.EUR || rates.EUR, GBP: k.GBP || rates.GBP };
    store.set('trs_rates', JSON.stringify(rates)); apply();
  }).catch(function () {});

  // ── search ──
  var q = document.getElementById('q'), box = document.getElementById('results');
  if (!q || !box) return;
  var data = null, loading = null, pick = -1;
  function load() { return loading || (loading = fetch('/search.json').then(function (r) { return r.json(); }).then(function (d) { data = d.map(function (x) { return { n: x[0], u: x[1], i: x[2], c: x[3], b: x[4], k: (x[0] + ' ' + x[4]).toLowerCase() }; }); })); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function render() {
    var s = q.value.trim().toLowerCase();
    if (!s) { box.hidden = true; return; }
    var words = s.split(/\s+/);
    var hits = data.filter(function (x) { return words.every(function (w) { return x.k.indexOf(w) >= 0; }); }).slice(0, 12);
    pick = -1;
    box.innerHTML = hits.length ? hits.map(function (x) {
      return '<a href="' + x.u + '"><img src="' + x.i + '" alt="" loading="lazy"><span class="r-name">' + esc(x.n) + '</span><span class="r-price">' + fmt(x.c) + '</span></a>';
    }).join('') : '<div class="none">No finds match “' + esc(q.value) + '”.</div>';
    box.hidden = false;
  }
  q.addEventListener('focus', load);
  q.addEventListener('input', function () { load().then(render); });
  q.addEventListener('keydown', function (e) {
    var items = box.querySelectorAll('a');
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); if (!items.length) return;
      pick = (pick + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach(function (a, i) { a.classList.toggle('sel', i === pick); });
    } else if (e.key === 'Enter') {
      var a = items[pick >= 0 ? pick : 0]; if (a) location.href = a.href;
    } else if (e.key === 'Escape') { box.hidden = true; q.blur(); }
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.search')) box.hidden = true; });
})();
