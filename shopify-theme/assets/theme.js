/* minha prótese — theme.js
   Comportamentos globais leves (sem framework).
*/
(function () {
  'use strict';

  // -------- Menu mobile -------- //
  var toggle = document.querySelector('[data-mobile-menu-toggle]');
  var mobile = document.querySelector('[data-mobile-menu]');
  if (toggle && mobile) {
    toggle.addEventListener('click', function () {
      var hidden = mobile.hasAttribute('hidden');
      if (hidden) mobile.removeAttribute('hidden'); else mobile.setAttribute('hidden', '');
    });
  }

  // -------- Ajax cart count -------- //
  function refreshCartCount () {
    fetch('/cart.js', { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        var el = document.querySelector('[data-cart-count]');
        if (!el) return;
        el.textContent = cart.item_count;
        el.style.display = cart.item_count > 0 ? 'inline-flex' : 'none';
      })
      .catch(function () {});
  }

  // Adicionar ao carrinho via fetch para evitar reload
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form.matches('[data-product-form]')) return;
    e.preventDefault();
    var btn = form.querySelector('[data-add-to-cart]');
    var originalLabel = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Adicionando…'; }

    var fd = new FormData(form);
    fetch('/cart/add.js', { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (res) {
        if (!res.ok) throw res.data;
        if (btn) btn.textContent = 'Adicionado ✓';
        refreshCartCount();
        setTimeout(function () {
          if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
        }, 1600);
      })
      .catch(function (err) {
        if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
        alert((err && err.description) || 'Não foi possível adicionar agora. Tente novamente em instantes.');
      });
  });

  // -------- Filtros de coleção -------- //
  var sortSelect = document.querySelector('[data-sort]');
  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      var url = new URL(window.location.href);
      url.searchParams.set('sort_by', sortSelect.value);
      window.location.href = url.toString();
    });
  }

  document.querySelectorAll('[data-filter]').forEach(function (input) {
    input.addEventListener('change', function () {
      var url = new URL(window.location.href);
      var key = 'filter.v.' + input.getAttribute('data-filter') + '.' + input.value;
      if (input.checked) url.searchParams.append(key, '1');
      else url.searchParams.delete(key);
      window.location.href = url.toString();
    });
  });

  refreshCartCount();
})();
