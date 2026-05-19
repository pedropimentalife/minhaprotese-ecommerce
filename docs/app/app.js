/* minha prótese — catálogo SPA estático
 * Roda no GitHub Pages. Carrega catalog.json e renderiza:
 *  - lista filtrada por categoria/marca/busca
 *  - página de produto
 *  - cart com checkout via WhatsApp (modelo comum no varejo BR)
 */
(function () {
  'use strict';

  const WHATSAPP_NUMBER = '5511000000000'; // editar quando tiver número
  const CART_KEY = 'mp_cart_v1';

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const money = v => v ? `R$ ${parseFloat(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}` : 'sob consulta';
  const slug = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\w-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');

  let CATALOG = [];
  let CART = JSON.parse(localStorage.getItem(CART_KEY) || '[]');

  // -------- Bootstrap -------- //
  async function init() {
    const res = await fetch('../data/catalog.json');
    CATALOG = await res.json();
    renderHeader();
    window.addEventListener('hashchange', route);
    route();
  }

  // -------- Routing por hash -------- //
  function route() {
    const h = (location.hash || '#').slice(1);
    const [section, param] = h.split('/').filter(Boolean);
    if (section === 'p') return renderProduct(param);
    if (section === 'c') return renderCollection(param);
    if (section === 'cart') return renderCart();
    if (section === 'search') return renderSearch(new URLSearchParams(location.hash.split('?')[1] || '').get('q'));
    renderHome();
  }

  // -------- Header -------- //
  function renderHeader() {
    updateCartBadge();
  }
  function updateCartBadge() {
    const el = $('[data-cart-count]');
    if (!el) return;
    const total = CART.reduce((a, b) => a + (b.qty || 1), 0);
    el.textContent = total;
    el.style.display = total > 0 ? 'inline-flex' : 'none';
  }

  // -------- Home: categorias destaque + grid -------- //
  function renderHome() {
    const types = uniqBy(CATALOG, p => p.type).map(p => p.type).filter(Boolean);
    const featured = CATALOG.filter(p => p.status === 'active' && p.image).slice(0, 12);
    const html = `
      <section class="hero">
        <div class="container">
          <div class="hero__grid">
            <div>
              <span class="eyebrow eyebrow--on-dark">Componentes para prótese e órtese</span>
              <h1>Pra você caminhar <span class="em-italic">no seu ritmo.</span></h1>
              <p class="lead">${CATALOG.length} SKUs das principais marcas — Össur, Ottobock, Blumentec, ALPS e mais. Atendimento técnico que entende.</p>
              <div class="hero__cta">
                <a href="#c/all" class="btn btn--primary btn--lg">Ver catálogo completo</a>
                <a href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" class="btn btn--secondary btn--lg" style="border-color: rgba(255,255,255,0.2); color: #fff;">Falar no WhatsApp</a>
              </div>
              <div class="hero__stats">
                <div class="hero__stat"><span class="hero__stat-number">${CATALOG.length}</span><span class="hero__stat-label">SKUs</span></div>
                <div class="hero__stat"><span class="hero__stat-number">8 marcas</span><span class="hero__stat-label">curadas</span></div>
                <div class="hero__stat"><span class="hero__stat-number">${featured.length}</span><span class="hero__stat-label">em estoque</span></div>
              </div>
            </div>
            <div class="hero__image" style="background: linear-gradient(135deg, #087272, #2B333A); display:flex; align-items:center; justify-content:center;">
              <svg viewBox="0 0 200 200" style="width: 60%; opacity: 0.85;">
                <g transform="translate(20,20)">
                  <path d="M20 130 A 70 70 0 0 1 140 50" fill="none" stroke="#46C4C4" stroke-width="8" stroke-linecap="round"/>
                  <line x1="80" y1="35" x2="130" y2="90" stroke="#FAF6F0" stroke-width="14" stroke-linecap="round"/>
                  <line x1="130" y1="90" x2="105" y2="150" stroke="#FAF6F0" stroke-width="14" stroke-linecap="round"/>
                  <circle cx="130" cy="90" r="13" fill="#1F262B" stroke="#46C4C4" stroke-width="5"/>
                  <circle cx="130" cy="90" r="4" fill="#F09020"/>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section class="section section--cream">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Catálogo</span>
            <h2>Encontre o que <span class="em-italic">você precisa.</span></h2>
          </div>
          <div class="categories">
            ${types.slice(0, 6).map(t => `
              <a href="#c/type-${encodeURIComponent(slug(t))}" class="category-card">
                <h3 class="category-card__title">${t}</h3>
                <span class="category-card__count">${CATALOG.filter(p => p.type === t).length} produtos</span>
              </a>
            `).join('')}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Em estoque agora</span>
            <h2>Produtos <span class="em-italic">disponíveis.</span></h2>
            <p class="lead">${featured.length} itens com preço e imagem prontos para envio.</p>
          </div>
          <div class="products">
            ${featured.map(productCard).join('')}
          </div>
          <div class="text-center" style="margin-top: 48px;">
            <a href="#c/all" class="btn btn--secondary btn--lg">Ver todos os ${CATALOG.length}</a>
          </div>
        </div>
      </section>
    `;
    $('#app').innerHTML = html;
    window.scrollTo(0, 0);
  }

  // -------- Coleção / grid filtrável -------- //
  function renderCollection(param) {
    let products = CATALOG;
    let title = 'Catálogo';
    if (param && param !== 'all') {
      if (param.startsWith('vendor-')) {
        const v = decodeURIComponent(param.slice(7));
        products = CATALOG.filter(p => slug(p.vendor) === v);
        title = uniqBy(CATALOG, p => p.vendor).find(p => slug(p.vendor) === v)?.vendor || v;
      } else if (param.startsWith('type-')) {
        const t = decodeURIComponent(param.slice(5));
        products = CATALOG.filter(p => slug(p.type) === t);
        title = uniqBy(CATALOG, p => p.type).find(p => slug(p.type) === t)?.type || t;
      }
    }

    const vendors = uniqBy(products, p => p.vendor).map(p => p.vendor).filter(Boolean);
    const html = `
      <section class="section">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Catálogo</span>
            <h1 style="font-size: clamp(36px, 5vw, 56px);">${title}</h1>
            <p class="lead">${products.length} produtos</p>
          </div>
          <div class="collection-layout">
            <aside class="facets">
              <h4>Marca</h4>
              <ul>
                ${vendors.map(v => `<li><a href="#c/vendor-${slug(v)}" style="font-size:14px; color:var(--brand-slate-700);">${v} <span style="color:var(--brand-slate-500); font-size:12px;">(${products.filter(p => p.vendor===v).length})</span></a></li>`).join('')}
              </ul>
              <h4 style="margin-top:24px;">Disponibilidade</h4>
              <ul>
                <li><a href="#c/all" style="font-size:14px;">Ver todos</a></li>
              </ul>
            </aside>
            <div>
              <div class="products" id="grid">
                ${products.map(productCard).join('')}
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
    $('#app').innerHTML = html;
    window.scrollTo(0, 0);
  }

  // -------- Produto -------- //
  function renderProduct(handle) {
    const p = CATALOG.find(x => x.handle === handle);
    if (!p) {
      $('#app').innerHTML = `<section class="section"><div class="container"><h1>Produto não encontrado</h1><a href="#" class="btn btn--primary">Voltar</a></div></section>`;
      return;
    }
    const related = CATALOG.filter(x => x.vendor === p.vendor && x.handle !== p.handle && x.image).slice(0, 4);
    const wppMsg = `Olá, tenho dúvida sobre: ${p.title} (SKU ${p.sku})`;
    const html = `
      <div class="container">
        <nav style="padding: 24px 0; font-size: 13px; color: var(--brand-slate-500);">
          <a href="#" style="color: var(--brand-slate-500);">Catálogo</a> ›
          <a href="#c/vendor-${slug(p.vendor)}" style="color: var(--brand-slate-500);">${p.vendor}</a> ›
          <span>${p.title}</span>
        </nav>
        <div class="product-page">
          <div class="product-gallery">
            <div class="product-gallery__main" style="background: var(--warm-cream);">
              ${p.image ? `<img src="${p.image}" alt="${escapeHtml(p.title)}" style="object-fit:contain; padding:8%;">` : '<span class="meta">Foto sob consulta</span>'}
            </div>
          </div>
          <div class="product-info">
            <span class="product-info__vendor">${p.vendor}</span>
            <h1 class="product-info__title">${escapeHtml(p.title)}</h1>
            <span class="product-info__sku">SKU ${p.sku} · Distribuidor autorizado</span>
            <div class="product-info__price-wrap">
              <span class="product-info__price">${money(p.price)}</span>
            </div>
            ${p.status === 'active' ? `
              <div style="display:flex; gap:8px; margin-bottom:24px;">
                <span style="display:inline-flex; align-items:center; gap:6px; padding:4px 10px; background:var(--brand-teal-50); color:var(--brand-teal-700); border-radius:999px; font-size:12px; font-weight:600;">✓ Em estoque</span>
                <span style="display:inline-flex; align-items:center; gap:6px; padding:4px 10px; background:var(--warm-cream); color:var(--brand-slate-700); border-radius:999px; font-size:12px;">Entrega 3 dias úteis SP</span>
              </div>
            ` : `
              <div style="margin-bottom:24px; padding:14px; background:var(--warm-cream); border-radius:8px; font-size:14px; color:var(--brand-slate-600);">
                Sob consulta — preço e prazo via WhatsApp.
              </div>
            `}
            <div class="product-info__actions">
              <div class="product-info__qty">
                <button type="button" data-qty-minus>−</button>
                <input type="number" id="qty" value="1" min="1">
                <button type="button" data-qty-plus>+</button>
              </div>
              ${p.price ? `<button class="btn btn--primary btn--lg" data-add-cart>Adicionar ao carrinho</button>` : ''}
            </div>
            <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(wppMsg)}" target="_blank" class="btn btn--whatsapp btn--block">
              Tirar dúvida sobre este produto pelo WhatsApp
            </a>
            ${p.desc ? `<div class="product-info__description"><p>${escapeHtml(p.desc)}</p></div>` : ''}
            <div class="product-specs">
              <dl>
                <dt>Marca</dt><dd>${p.vendor}</dd>
                <dt>SKU</dt><dd>${p.sku}</dd>
                <dt>Categoria</dt><dd>${p.type || '—'}</dd>
                <dt>Origem</dt><dd>Distribuidor autorizado</dd>
                <dt>Garantia</dt><dd>6 meses contra defeito de fabricação</dd>
              </dl>
            </div>
          </div>
        </div>
        ${related.length ? `
          <section class="section section--cream" style="margin-top:48px;">
            <div class="container">
              <div class="section-head">
                <span class="eyebrow">Da mesma marca</span>
                <h2 style="font-size:28px;">Mais de <span class="em-italic">${p.vendor}.</span></h2>
              </div>
              <div class="products">${related.map(productCard).join('')}</div>
            </div>
          </section>
        ` : ''}
      </div>
    `;
    $('#app').innerHTML = html;
    bindProductActions(p);
    window.scrollTo(0, 0);
  }

  function bindProductActions(p) {
    const qty = $('#qty');
    $('[data-qty-minus]')?.addEventListener('click', () => { qty.value = Math.max(1, parseInt(qty.value)-1); });
    $('[data-qty-plus]')?.addEventListener('click', () => { qty.value = parseInt(qty.value)+1; });
    $('[data-add-cart]')?.addEventListener('click', () => {
      const q = parseInt(qty.value) || 1;
      const existing = CART.find(c => c.handle === p.handle);
      if (existing) existing.qty += q;
      else CART.push({ handle: p.handle, title: p.title, sku: p.sku, price: p.price, image: p.image, qty: q });
      localStorage.setItem(CART_KEY, JSON.stringify(CART));
      updateCartBadge();
      const btn = $('[data-add-cart]');
      const orig = btn.textContent;
      btn.textContent = 'Adicionado ✓';
      btn.disabled = true;
      setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1600);
    });
  }

  // -------- Cart -------- //
  function renderCart() {
    const total = CART.reduce((a, c) => a + (parseFloat(c.price)||0) * (c.qty||1), 0);
    const html = `
      <section class="section">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Pedido</span>
            <h1>Seu <span class="em-italic">carrinho.</span></h1>
          </div>
          ${CART.length === 0 ? `
            <p class="lead">Carrinho vazio. <a href="#c/all">Ver catálogo</a></p>
          ` : `
            <div style="display:grid; grid-template-columns: 1.4fr 1fr; gap:48px;">
              <div>
                ${CART.map((c, i) => `
                  <div class="cart-line">
                    <div class="cart-line__image">${c.image?`<img src="${c.image}" alt="">`:''}</div>
                    <div>
                      <p style="margin:0; font-weight:600;"><a href="#p/${c.handle}" style="color:var(--warm-ink);">${escapeHtml(c.title)}</a></p>
                      <span class="meta">SKU ${c.sku}</span>
                    </div>
                    <div>
                      <input type="number" value="${c.qty}" min="1" class="input" data-cart-qty="${i}" style="width:70px; height:38px;">
                    </div>
                    <div style="text-align:right; font-weight:700;">
                      ${money((parseFloat(c.price)||0)*c.qty)}
                      <br><button data-cart-remove="${i}" style="background:none; border:0; color:var(--brand-slate-500); font-size:12px; cursor:pointer;">remover</button>
                    </div>
                  </div>
                `).join('')}
              </div>
              <aside class="cart-summary">
                <div class="cart-summary__row"><span>Subtotal</span><span>${money(total)}</span></div>
                <div class="cart-summary__row" style="border-top:1px solid var(--brand-slate-200); padding-top:14px;">
                  <strong class="cart-summary__total">Total</strong>
                  <strong class="cart-summary__total">${money(total)}</strong>
                </div>
                <p class="meta" style="margin:12px 0 24px;">Frete e impostos confirmados no atendimento.</p>
                <button class="btn btn--whatsapp btn--block btn--lg" data-checkout-wpp>
                  Fechar pedido pelo WhatsApp
                </button>
              </aside>
            </div>
          `}
        </div>
      </section>
    `;
    $('#app').innerHTML = html;
    $$('[data-cart-qty]').forEach(input => input.addEventListener('change', e => {
      CART[+e.target.dataset.cartQty].qty = Math.max(1, parseInt(e.target.value));
      localStorage.setItem(CART_KEY, JSON.stringify(CART));
      renderCart();
    }));
    $$('[data-cart-remove]').forEach(btn => btn.addEventListener('click', e => {
      CART.splice(+e.target.dataset.cartRemove, 1);
      localStorage.setItem(CART_KEY, JSON.stringify(CART));
      updateCartBadge();
      renderCart();
    }));
    $('[data-checkout-wpp]')?.addEventListener('click', () => {
      const msg = 'Olá, gostaria de fechar este pedido:\n\n' + CART.map(c => `• ${c.qty}x ${c.title} (SKU ${c.sku}) — ${money((parseFloat(c.price)||0)*c.qty)}`).join('\n') + `\n\n*Total: ${money(total)}*`;
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    });
    window.scrollTo(0, 0);
    updateCartBadge();
  }

  // -------- Busca -------- //
  function renderSearch(q) {
    q = (q || '').trim();
    let results = [];
    if (q.length >= 2) {
      const qn = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
      results = CATALOG.filter(p => {
        const hay = `${p.title} ${p.vendor} ${p.sku} ${p.type}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
        return hay.includes(qn);
      });
    }
    const html = `
      <section class="section">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Busca</span>
            <h1>${q ? `${results.length} resultados para "<span class="em-italic">${escapeHtml(q)}</span>"` : 'O que você procura?'}</h1>
          </div>
          <form onsubmit="event.preventDefault(); location.hash='#search?q='+encodeURIComponent(this.q.value);" style="max-width:600px; margin-bottom:48px;">
            <div style="display:flex; gap:8px;">
              <input class="input" type="search" name="q" value="${escapeHtml(q)}" placeholder="Buscar componente, marca ou SKU…">
              <button class="btn btn--primary" type="submit">Buscar</button>
            </div>
          </form>
          <div class="products">${results.map(productCard).join('') || '<p class="lead">Sem resultados.</p>'}</div>
        </div>
      </section>
    `;
    $('#app').innerHTML = html;
    window.scrollTo(0, 0);
  }

  // -------- Util -------- //
  function productCard(p) {
    return `
      <a href="#p/${p.handle}" class="product-card">
        <div class="product-card__image">${p.image ? `<img src="${p.image}" alt="${escapeHtml(p.title)}" loading="lazy">` : `<span class="meta">sob consulta</span>`}</div>
        <div class="product-card__body">
          <span class="product-card__vendor">${p.vendor}</span>
          <p class="product-card__title">${escapeHtml(p.title)}</p>
          <span class="product-card__sku">SKU ${p.sku}</span>
          <div class="product-card__price">${money(p.price)}</div>
        </div>
      </a>
    `;
  }
  function uniqBy(arr, fn) { const s = new Set(); return arr.filter(x => { const k = fn(x); if (s.has(k)) return false; s.add(k); return true; }); }
  function escapeHtml(s) { return (s||'').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }

  init();
})();

// ----- Chat IA demo (canned responses; replace endpoint when live) ----- //
(function () {
  const replies = {
    'olá': 'Olá! Aqui é a equipe da *minha prótese*. Conta pra gente o que você está procurando — pode falar do componente, do paciente ou da prescrição.',
    'liner': 'Temos liners de várias marcas: Össur (Iceross), Blumentec (Alpha), ALPS (Smart Seal) e ProKinetics (SUPREME). A escolha depende de: nível de mobilidade (K1-K4), tipo de amputação (TT/TF) e se vai usar pino ou seal-in. Me conta um pouco da situação?',
    'joelho': 'Joelhos disponíveis: mecânicos simples (3R39 Ottobock), policêntricos, hidráulicos rotativos (3R80 Ottobock — R$ 21.150) e microprocessados (C-Leg, Rheo). A escolha depende do peso, idade e nível de atividade. Você já tem prescrição do protesista?',
    'preço': 'Os preços estão visíveis em cada produto do catálogo. Para itens "sob consulta", a equipe responde com orçamento em até 1 dia útil pelo WhatsApp.',
    'entrega': 'Pronta-entrega para os itens em estoque (mostrados como "Em estoque" na página): 3 dias úteis para SP capital, 5-7 para o restante do Brasil. Itens sob consulta dependem de importação — orçamento separado.',
  };
  const fallback = 'Recebi sua mensagem. Para uma resposta personalizada, toque em "Falar no WhatsApp agora" abaixo — nossa equipe te responde por lá em poucos minutos. (Este chat está em modo demonstração; a IA treinada entra no ar quando o endpoint for plugado.)';

  window.mpChatHandler = function (text, addMsg) {
    const k = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    let reply = fallback;
    for (const key in replies) {
      const kk = key.normalize('NFD').replace(/[̀-ͯ]/g,'');
      if (k.includes(kk)) { reply = replies[key]; break; }
    }
    setTimeout(() => addMsg(reply, 'in'), 700);
  };
})();
