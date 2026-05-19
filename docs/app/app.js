/* minha prótese — SPA v2 polida
 * Single-page com routing por hash. Carrega catalog.json e renderiza
 * com tipografia e espaçamento refinados.
 */
(function () {
  'use strict';

  const WHATSAPP = '5511000000000';
  const CART_KEY = 'mp_cart_v2';

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const money = v => v ? `R$ ${parseFloat(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}` : '';
  const slug = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\w-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
  const esc = s => (s||'').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const titlecase = s => s.toLowerCase().replace(/(^|\s|\-)([a-zà-ú])/g, (_, p, c) => p + c.toUpperCase());

  let CATALOG = [];
  let CART = JSON.parse(localStorage.getItem(CART_KEY) || '[]');

  async function init() {
    const res = await fetch('../data/catalog.json');
    CATALOG = (await res.json()).map(p => ({
      ...p,
      title: titlecaseSmart(p.title),
    }));
    updateCartBadge();
    window.addEventListener('hashchange', route);
    route();
  }

  // Smart titlecase: mantém marcas em forma original, mas converte ALL CAPS
  function titlecaseSmart(s) {
    if (!s) return s;
    if (s === s.toUpperCase() && s.length > 4) {
      // Tudo maiúsculo — converte para Title Case
      return s.toLowerCase().split(' ').map(w => {
        if (w.match(/^\d/) || w.length <= 2 || w.match(/^[a-z]\d/i)) return w;
        return w[0].toUpperCase() + w.slice(1);
      }).join(' ');
    }
    return s;
  }

  function route() {
    const h = (location.hash || '#').slice(1);
    const [section, param] = h.split('/').filter(Boolean);
    if (section === 'p') return renderProduct(param);
    if (section === 'c') return renderCollection(param);
    if (section === 'cart') return renderCart();
    if (section === 'search') return renderSearch(new URLSearchParams(location.hash.split('?')[1] || '').get('q'));
    renderHome();
  }

  function updateCartBadge() {
    const el = $('[data-cart-count]');
    if (!el) return;
    const total = CART.reduce((a, b) => a + (b.qty || 1), 0);
    el.textContent = total;
    el.style.display = total > 0 ? 'inline-flex' : 'none';
  }

  // ============================================================
  //  HOME
  // ============================================================
  function renderHome() {
    const active = CATALOG.filter(p => p.status === 'active' && p.image);
    const featured = active.slice(0, 8);
    const stats = {
      sku: CATALOG.length,
      brands: 8,
      stocked: active.length,
    };

    $('#main').innerHTML = `
      <!-- HERO -->
      <section class="hero">
        <div class="container">
          <div class="hero__grid">
            <div>
              <span class="eyebrow eyebrow--on-dark">Componentes para prótese e órtese</span>
              <h1>Pra você caminhar <span class="em-italic em-italic--on-dark">no seu ritmo.</span></h1>
              <p class="lead">Encaixes, joelhos, pés, soquetes, liners e acessórios das principais marcas — com curadoria técnica e atendimento que entende do que você precisa.</p>
              <div class="hero__cta">
                <a href="#c/all" class="btn btn--primary btn--lg">Ver catálogo</a>
                <a href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener" class="btn btn--on-dark btn--lg">Falar no WhatsApp</a>
              </div>
              <div class="hero__stats">
                <div>
                  <div class="hero__stat-number">${stats.sku.toLocaleString('pt-BR')}</div>
                  <span class="hero__stat-label">SKUs em catálogo</span>
                </div>
                <div>
                  <div class="hero__stat-number hero__stat-number--accent">${stats.brands}</div>
                  <span class="hero__stat-label">Marcas curadas</span>
                </div>
                <div>
                  <div class="hero__stat-number">3 dias</div>
                  <span class="hero__stat-label">Entrega média SP</span>
                </div>
              </div>
            </div>

            <div class="hero__visual" aria-hidden="true">
              <svg class="hero__visual-mark" viewBox="0 0 200 200">
                <g transform="translate(20,20)">
                  <path d="M20 130 A 70 70 0 0 1 140 50" fill="none" stroke="#7FD6D6" stroke-width="8" stroke-linecap="round"/>
                  <line x1="80" y1="35" x2="130" y2="90" stroke="#FAF6F0" stroke-width="14" stroke-linecap="round"/>
                  <line x1="130" y1="90" x2="105" y2="150" stroke="#FAF6F0" stroke-width="14" stroke-linecap="round"/>
                  <circle cx="130" cy="90" r="13" fill="#1F262B" stroke="#7FD6D6" stroke-width="5"/>
                  <circle cx="130" cy="90" r="4.5" fill="#F09020"/>
                </g>
              </svg>
              <div class="hero__visual-tag">Distribuidores autorizados · 2026</div>
            </div>
          </div>
        </div>
      </section>

      <!-- CATEGORIAS -->
      <section class="section section--cream">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Catálogo</span>
            <h2>Encontre o que <span class="em-italic">você precisa.</span></h2>
            <p class="lead">Organizamos por tipo de componente, marca e nível de mobilidade — pra você chegar rápido no que importa.</p>
          </div>

          <div class="categories">
            ${[
              { t: 'Pés e tornozelos', q: '#c/type-pes-proteticos', n: 120 },
              { t: 'Joelhos', q: '#c/type-joelhos', n: 85 },
              { t: 'Liners e meias', q: '#c/type-liners', n: 121 },
              { t: 'Encaixes e soquetes', q: '#c/type-componentes-de-protese', n: 246 },
              { t: 'Adaptadores e tubos', q: '#c/type-adaptadores', n: 132 },
              { t: 'Membros superiores', q: '#c/type-maos-eletronicas', n: 40 },
            ].map(c => `
              <a href="${c.q}" class="category-card">
                <h3 class="category-card__title">${c.t}</h3>
                <span class="category-card__count">${c.n}+ produtos</span>
              </a>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- PRODUTOS EM DESTAQUE -->
      <section class="section">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Em estoque agora</span>
            <h2>Componentes que <span class="em-italic">saem mais.</span></h2>
            <p class="lead">${stats.stocked} produtos com pronta-entrega — preço médio das principais lojas do segmento, sem markup escondido.</p>
          </div>

          <div class="products">
            ${featured.map(productCard).join('')}
          </div>

          <div class="text-center" style="margin-top: 56px;">
            <a href="#c/all" class="btn btn--secondary btn--lg">Ver os ${stats.sku.toLocaleString('pt-BR')} produtos</a>
          </div>
        </div>
      </section>

      <!-- PILARES -->
      <section class="section section--sand">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Por que comprar aqui</span>
            <h2>Mais que um catálogo — <span class="em-italic">uma escolha bem feita.</span></h2>
            <p class="lead">Atendimento técnico, curadoria das melhores marcas e logística confiável para todo o Brasil.</p>
          </div>

          <div class="pillars">
            <div class="pillar">
              <div class="pillar__icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="m9 12 2 2 4-4"/></svg>
              </div>
              <h3>Garantia de origem</h3>
              <p>Trabalhamos só com distribuidores autorizados — Össur, Ottobock, Blumentec, Ortho Pauher, ALPS, Dilepé, Polior, Ethnos e ProKinetics.</p>
            </div>
            <div class="pillar">
              <div class="pillar__icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-7a9 9 0 0 1 18 0v7"/><path d="M3 15h3v6H4a1 1 0 0 1-1-1v-5z"/><path d="M21 15h-3v6h2a1 1 0 0 0 1-1v-5z"/></svg>
              </div>
              <h3>Atendimento que entende</h3>
              <p>Equipe técnica que conversa com você ou seu protesista para escolher o componente certo para o seu caso.</p>
            </div>
            <div class="pillar">
              <div class="pillar__icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h12v9H3z"/><path d="M15 10h4l2 3v3h-6"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
              </div>
              <h3>Entrega rápida</h3>
              <p>Pronta-entrega para os SKUs em estoque. Envio em até 24h após confirmação do pagamento, 3 dias para SP capital.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- DEPOIMENTO -->
      <section class="section section--charcoal">
        <div class="container" style="max-width: 880px; text-align: center;">
          <span class="eyebrow eyebrow--on-dark">Quem compra aqui</span>
          <h2 style="margin-top: 0;">
            <span class="em-italic em-italic--on-dark" style="font-size: clamp(28px, 3.8vw, 38px); line-height: 1.3;">"Cheguei perdido, sem saber por onde começar. A equipe me explicou cada componente, escolheu o ideal para o meu pai e ainda acompanhou a entrega."</span>
          </h2>
          <p style="margin-top: 40px; color: #CBD0D4; font-size: 14px;">
            <strong style="color:#fff; font-weight:600;">Renato S.</strong> · Filho de paciente · São Paulo
          </p>
        </div>
      </section>

      <!-- MARCAS -->
      <section class="section">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Marcas curadas</span>
            <h2>Os fabricantes <span class="em-italic">de confiança.</span></h2>
            <p class="lead">Compra direta de distribuidores oficiais. Nota fiscal e garantia em todos os produtos.</p>
          </div>

          <div class="featured-strip">
            <a href="#c/vendor-ossur" class="featured-strip__card">
              <span class="meta">Premium</span>
              <h4>Össur</h4>
              <p>Pés Pro-Flex, joelhos Aspire, liners Iceross. Inovação islandesa.</p>
            </a>
            <a href="#c/vendor-ottobock" class="featured-strip__card">
              <span class="meta">Tradicional</span>
              <h4>Ottobock</h4>
              <p>Joelhos 3R80, C-Leg, pés SACH. Referência mundial.</p>
            </a>
            <a href="#c/vendor-blumentec" class="featured-strip__card">
              <span class="meta">Nacional</span>
              <h4>Blumentec</h4>
              <p>Liners Alpha, componentes acessíveis com qualidade premium.</p>
            </a>
          </div>
        </div>
      </section>
    `;
    window.scrollTo(0, 0);
  }

  // ============================================================
  //  COLEÇÃO
  // ============================================================
  function renderCollection(param) {
    let products = CATALOG;
    let title = 'Todo o catálogo';
    let eyebrow = 'Catálogo completo';

    if (param && param !== 'all') {
      if (param.startsWith('vendor-')) {
        const v = decodeURIComponent(param.slice(7));
        products = CATALOG.filter(p => slug(p.vendor) === v);
        const real = products[0]?.vendor || v;
        title = real;
        eyebrow = 'Marca';
      } else if (param.startsWith('type-')) {
        const t = decodeURIComponent(param.slice(5));
        products = CATALOG.filter(p => slug(p.type) === t);
        const real = products[0]?.type || t;
        title = real;
        eyebrow = 'Categoria';
      }
    }

    // Ordena: active primeiro, depois com preço, depois resto
    products = [...products].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      if (a.price && !b.price) return -1;
      if (b.price && !a.price) return 1;
      return 0;
    });

    const vendors = uniqBy(products, p => p.vendor).map(p => p.vendor).filter(Boolean);
    const types = uniqBy(products, p => p.type).map(p => p.type).filter(Boolean);

    $('#main').innerHTML = `
      <div class="container">
        <nav class="breadcrumb">
          <a href="#">Início</a>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><polyline points="9 6 15 12 9 18"/></svg>
          <a href="#c/all">Catálogo</a>
          ${param && param !== 'all' ? `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><polyline points="9 6 15 12 9 18"/></svg>
            <span>${esc(title)}</span>
          ` : ''}
        </nav>

        <header style="padding-bottom: 32px; border-bottom: 1px solid var(--slate-200); margin-bottom: 56px;">
          <span class="eyebrow">${eyebrow}</span>
          <h1 style="font-size: clamp(36px, 5vw, 56px); margin-top: 8px;">${esc(title)}</h1>
          <p class="meta" style="margin-top: 12px;">${products.length} produtos</p>
        </header>

        <div class="collection-layout" style="padding-block: 0;">
          <aside class="facets" aria-label="Filtros">
            ${vendors.length > 1 ? `
              <h4>Marca</h4>
              <ul>
                ${vendors.slice(0, 10).map(v => `<li><a href="#c/vendor-${slug(v)}">${esc(v)} <span>${products.filter(p => p.vendor===v).length}</span></a></li>`).join('')}
              </ul>
            ` : ''}
            ${types.length > 1 ? `
              <h4>Categoria</h4>
              <ul>
                ${types.slice(0, 10).map(t => `<li><a href="#c/type-${slug(t)}">${esc(t)} <span>${products.filter(p => p.type===t).length}</span></a></li>`).join('')}
              </ul>
            ` : ''}
            <h4>Disponibilidade</h4>
            <ul>
              <li><a href="#c/all">Em estoque</a></li>
              <li><a href="#c/all">Todos</a></li>
            </ul>
          </aside>

          <div>
            <div class="products">
              ${products.slice(0, 60).map(productCard).join('')}
            </div>
            ${products.length > 60 ? `
              <div class="text-center" style="margin-top: 48px;">
                <a href="#search?q=${encodeURIComponent(title)}" class="btn btn--secondary">Ver mais (${products.length - 60} restantes)</a>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    window.scrollTo(0, 0);
  }

  // ============================================================
  //  PRODUTO
  // ============================================================
  function renderProduct(handle) {
    const p = CATALOG.find(x => x.handle === handle);
    if (!p) {
      $('#main').innerHTML = `<section class="section"><div class="container"><h1>Produto não encontrado</h1><a href="#" class="btn btn--primary">Voltar à home</a></div></section>`;
      return;
    }
    const related = CATALOG.filter(x => x.vendor === p.vendor && x.handle !== p.handle && x.image && x.price).slice(0, 4);
    const wppMsg = `Olá, tenho dúvida sobre: ${p.title} (SKU ${p.sku})`;

    $('#main').innerHTML = `
      <div class="container">
        <nav class="breadcrumb">
          <a href="#">Início</a>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><polyline points="9 6 15 12 9 18"/></svg>
          <a href="#c/vendor-${slug(p.vendor)}">${esc(p.vendor)}</a>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><polyline points="9 6 15 12 9 18"/></svg>
          <span>${esc(p.title.slice(0, 50))}${p.title.length > 50 ? '…' : ''}</span>
        </nav>

        <div class="product-page">
          <div class="product-gallery">
            <div class="product-gallery__main">
              ${p.image ? `<img src="${p.image}" alt="${esc(p.title)}">` : '<span class="meta">Foto sob consulta</span>'}
            </div>
          </div>

          <div class="product-info">
            <span class="product-info__vendor">${esc(p.vendor)}</span>
            <h1 class="product-info__title">${esc(p.title)}</h1>
            <span class="product-info__sku">SKU ${esc(p.sku)} · Distribuidor autorizado</span>

            ${p.price ? `
              <div class="product-info__price-wrap">
                <span class="product-info__price">${money(p.price)}</span>
              </div>
            ` : `
              <div style="margin: 32px 0 28px; padding: 20px; background: var(--cream); border-radius: 10px; border-left: 3px solid var(--teal-500);">
                <strong style="color: var(--ink); display: block; margin-bottom: 4px;">Preço sob consulta</strong>
                <span style="font-size: 14px; color: var(--slate-600);">Orçamento via WhatsApp em até 1 dia útil.</span>
              </div>
            `}

            ${p.status === 'active' ? `
              <div class="product-info__badges">
                <span class="badge badge--success">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"/></svg>
                  Em estoque
                </span>
                <span class="badge badge--neutral">Entrega 3 dias úteis SP</span>
                <span class="badge badge--neutral">Nota fiscal incluída</span>
              </div>
            ` : `
              <div class="product-info__badges">
                <span class="badge badge--neutral">Sob consulta</span>
              </div>
            `}

            <div class="product-info__actions">
              <div class="qty">
                <button type="button" data-qty-minus aria-label="Diminuir">−</button>
                <input type="number" id="qty" value="1" min="1" inputmode="numeric" aria-label="Quantidade">
                <button type="button" data-qty-plus aria-label="Aumentar">+</button>
              </div>
              ${p.price ? `<button class="btn btn--primary btn--lg" data-add-cart style="flex: 1; min-width: 200px;">Adicionar ao carrinho</button>` : ''}
            </div>

            <a href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent(wppMsg)}" target="_blank" rel="noopener" class="btn btn--whatsapp btn--block" style="margin-top: 4px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.65-4.94A8 8 0 1 1 8 19.55L3 21z"/></svg>
              Tirar dúvida sobre este produto
            </a>

            <div class="product-info__description">
              <p>${esc((p.desc || `${p.title} — distribuído pela minha prótese com nota fiscal e garantia de origem direto da ${p.vendor}. Embalagem original do fabricante.`).slice(0, 280))}</p>
            </div>

            <div class="product-specs">
              <h3>Especificações</h3>
              <dl>
                <dt>Marca</dt><dd>${esc(p.vendor)}</dd>
                <dt>SKU</dt><dd>${esc(p.sku)}</dd>
                <dt>Categoria</dt><dd>${esc(p.type || '—')}</dd>
                <dt>Origem</dt><dd>Distribuidor autorizado</dd>
                <dt>Embalagem</dt><dd>Unidade</dd>
                <dt>Garantia</dt><dd>6 meses contra defeito</dd>
              </dl>
            </div>
          </div>
        </div>

        ${related.length ? `
          <section class="section section--cream" style="margin: 56px calc(-1 * var(--page-x)) 0; padding-inline: var(--page-x); border-radius: 0;">
            <div style="max-width: var(--max-w); margin: 0 auto;">
              <div class="section-head">
                <span class="eyebrow">Da mesma marca</span>
                <h2 style="font-size: clamp(28px, 3vw, 36px);">Mais de <span class="em-italic">${esc(p.vendor)}.</span></h2>
              </div>
              <div class="products">${related.map(productCard).join('')}</div>
            </div>
          </section>
        ` : ''}
      </div>
    `;
    bindProductActions(p);
    window.scrollTo(0, 0);
  }

  function bindProductActions(p) {
    const qty = $('#qty');
    if (!qty) return;
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
      btn.textContent = 'Adicionado ao carrinho ✓';
      btn.disabled = true;
      setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1800);
    });
  }

  // ============================================================
  //  CART
  // ============================================================
  function renderCart() {
    const total = CART.reduce((a, c) => a + (parseFloat(c.price)||0) * (c.qty||1), 0);
    $('#main').innerHTML = `
      <section class="section">
        <div class="container">
          <nav class="breadcrumb"><a href="#">Início</a>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><polyline points="9 6 15 12 9 18"/></svg>
            <span>Carrinho</span>
          </nav>
          <div class="section-head" style="margin-top: 16px;">
            <span class="eyebrow">Pedido</span>
            <h1>Seu <span class="em-italic">carrinho.</span></h1>
          </div>

          ${CART.length === 0 ? `
            <div style="text-align: center; padding: 64px 24px; background: var(--cream); border-radius: 12px;">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--slate-500)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 20px;"><path d="M6 7h12l-1 14H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>
              <h3 style="margin-bottom: 12px;">Carrinho vazio</h3>
              <p class="lead" style="margin: 0 auto 24px;">Adicione produtos pra fechar pelo WhatsApp.</p>
              <a href="#c/all" class="btn btn--primary">Ver catálogo</a>
            </div>
          ` : `
            <div style="display:grid; grid-template-columns: 1.6fr 1fr; gap: 56px;">
              <div>
                ${CART.map((c, i) => `
                  <div class="cart-line">
                    <div class="cart-line__image">${c.image?`<img src="${c.image}" alt="">`:''}</div>
                    <div>
                      <p style="margin:0 0 4px; font-weight:600; line-height: 1.3;"><a href="#p/${c.handle}" style="color:var(--ink);">${esc(c.title)}</a></p>
                      <span class="meta">SKU ${esc(c.sku)}</span>
                    </div>
                    <div>
                      <input type="number" value="${c.qty}" min="1" data-cart-qty="${i}" style="width:64px; height:38px; padding:0 8px; border:1px solid var(--slate-200); border-radius:8px; text-align:center; font: inherit;">
                    </div>
                    <div style="text-align:right;">
                      <div style="font-weight:700; color:var(--ink);">${money((parseFloat(c.price)||0)*c.qty)}</div>
                      <button data-cart-remove="${i}" style="background:none; border:0; color:var(--slate-500); font-size:12px; cursor:pointer; margin-top:4px; text-decoration:underline; font-family: inherit;">remover</button>
                    </div>
                  </div>
                `).join('')}
              </div>
              <aside class="cart-summary">
                <h3 style="font-size: 16px; text-transform: uppercase; letter-spacing: 0.22em; color: var(--slate-500); margin: 0 0 20px; font-weight: 700;">Resumo</h3>
                <div class="cart-summary__row"><span>Subtotal</span><span style="font-weight: 600;">${money(total)}</span></div>
                <div class="cart-summary__row"><span>Frete</span><span style="color: var(--slate-500);">Cálculo via WhatsApp</span></div>
                <div class="cart-summary__row" style="border-top:1px solid var(--slate-300); padding-top:14px; margin-top: 14px;">
                  <strong class="cart-summary__total">Total</strong>
                  <strong class="cart-summary__total">${money(total)}</strong>
                </div>
                <p class="meta" style="margin:16px 0 24px; font-size: 12px;">Frete e impostos confirmados no atendimento.</p>
                <button class="btn btn--whatsapp btn--block btn--lg" data-checkout-wpp>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.65-4.94A8 8 0 1 1 8 19.55L3 21z"/></svg>
                  Fechar pelo WhatsApp
                </button>
                <p style="font-size: 12px; color: var(--slate-500); margin-top: 16px; text-align: center;">A equipe valida estoque, frete e gera o link de pagamento.</p>
              </aside>
            </div>
          `}
        </div>
      </section>
    `;
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
      const msg = 'Olá, gostaria de fechar este pedido:\n\n' + CART.map(c => `• ${c.qty}x ${c.title}\n  SKU ${c.sku} — ${money((parseFloat(c.price)||0)*c.qty)}`).join('\n\n') + `\n\n*Total estimado: ${money(total)}*\n\nVocês podem confirmar disponibilidade e frete?`;
      window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
    });
    window.scrollTo(0, 0);
    updateCartBadge();
  }

  // ============================================================
  //  BUSCA
  // ============================================================
  function renderSearch(q) {
    q = (q || '').trim();
    let results = [];
    if (q.length >= 2) {
      const qn = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
      results = CATALOG.filter(p => {
        const hay = `${p.title} ${p.vendor} ${p.sku} ${p.type}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
        return hay.includes(qn);
      }).sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (b.status === 'active' && a.status !== 'active') return 1;
        return 0;
      });
    }
    $('#main').innerHTML = `
      <section class="section">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Busca</span>
            <h1 style="font-size: clamp(32px, 4.4vw, 48px);">${q ? `${results.length} resultados para <span class="em-italic">"${esc(q)}"</span>` : 'O que você procura?'}</h1>
          </div>

          <form class="search-input-wrap" onsubmit="event.preventDefault(); location.hash='#search?q='+encodeURIComponent(this.q.value);">
            <input class="input" type="search" name="q" value="${esc(q)}" placeholder="Buscar componente, marca ou SKU…" autofocus>
            <button class="btn btn--primary" type="submit">Buscar</button>
          </form>

          ${q && results.length === 0 ? `
            <div style="text-align: center; padding: 64px 24px; background: var(--cream); border-radius: 12px;">
              <h3>Sem resultados.</h3>
              <p class="lead" style="margin: 12px auto 24px;">Tente outra palavra — ou nos chame no WhatsApp que ajudamos.</p>
              <a href="https://wa.me/${WHATSAPP}" target="_blank" class="btn btn--whatsapp">Falar no WhatsApp</a>
            </div>
          ` : `
            <div class="products">
              ${results.slice(0, 60).map(productCard).join('')}
            </div>
          `}
        </div>
      </section>
    `;
    window.scrollTo(0, 0);
  }

  // ============================================================
  //  Product card render
  // ============================================================
  function productCard(p) {
    return `
      <a href="#p/${p.handle}" class="product-card">
        <div class="product-card__image">
          ${p.image ? `<img src="${p.image}" alt="${esc(p.title)}" loading="lazy">` : `<span class="meta" style="opacity:0.6;">sem foto</span>`}
        </div>
        <div class="product-card__body">
          <span class="product-card__vendor">${esc(p.vendor)}</span>
          <p class="product-card__title">${esc(p.title)}</p>
          <span class="product-card__sku">SKU ${esc(p.sku)}</span>
          <div class="product-card__price">
            ${p.price ? money(p.price) : '<span class="product-card__price--no">sob consulta</span>'}
          </div>
        </div>
      </a>
    `;
  }

  function uniqBy(arr, fn) { const s = new Set(); return arr.filter(x => { const k = fn(x); if (s.has(k)) return false; s.add(k); return true; }); }

  init();
})();

// ============================================================
//  Chat IA — respostas canned para o demo
// ============================================================
(function () {
  const RESPOSTAS = [
    { match: ['liner', 'liners'], reply: 'Temos liners das principais marcas: <em>Össur</em> (Iceross Comfort Locking · R$ 3.766,63), <em>Blumentec</em> (Alpha Element · R$ 1.914,48), <em>ALPS</em> (Smart Seal · R$ 2.605,49) e <em>ProKinetics</em> (SUPREME). A escolha depende de: tipo de amputação (TT/TF), nível de mobilidade (K1-K4) e se vai usar pino ou seal-in. Me conta um pouco da situação?' },
    { match: ['joelho', 'joelhos'], reply: 'Joelhos disponíveis: hidráulicos rotativos (3R80 Ottobock — R$ 21.150 médio), policêntricos, e a linha premium com microprocessador. A escolha depende do peso, idade e nível de atividade. Você já tem prescrição do protesista?' },
    { match: ['pé', 'pe ', 'pes ', 'fibra de carbono', 'sach'], reply: 'Temos pés desde os tradicionais SACH (mais econômicos, R$ 645) até linha de fibra de carbono (Pro-Flex Össur). Pra qual nível de atividade — caminhada doméstica, trabalho, ou esportes?' },
    { match: ['preço', 'preco', 'valor', 'custo', 'orçamento', 'orcamento'], reply: 'Cada produto tem o preço visível no catálogo (média das duas principais lojas do segmento). Para itens marcados como "sob consulta", nosso orçamento sai em até 1 dia útil pelo WhatsApp.' },
    { match: ['entrega', 'frete', 'envio', 'prazo'], reply: 'Pronta-entrega pros 262 itens em estoque (marcados como "Em estoque" no produto): <em>3 dias úteis</em> para SP capital, 5-7 dias para o restante do Brasil. Itens sob encomenda dependem da importação — geralmente 15-30 dias.' },
    { match: ['ossur', 'össur', 'iceross'], reply: 'Temos linha Össur completa: liners Iceross Comfort Locking e Seal-In, pés Pro-Flex e capa Pro-Flex, joelho Aspire P1. Todos com nota fiscal e direto do distribuidor autorizado.' },
    { match: ['ottobock', 'otto bock'], reply: 'Linha Ottobock disponível: joelhos 3R39, 3R80 e linha C-Leg sob consulta. Pés SACH 1H02, Taleo 1C50. Adaptadores, capas, conexões e o sistema modular completo.' },
    { match: ['dor', 'inflamado', 'inflamacao', 'inflamação', 'machucou'], reply: 'Isso é melhor ver direto com a equipe — eles podem orientar com base no seu caso específico. Toque em <em>Falar no WhatsApp agora</em> aqui embaixo que continuamos por lá.', handoff: true },
    { match: ['humano', 'pessoa', 'atendente', 'falar com alguem'], reply: 'Claro, vou te passar pra equipe. <em>Falar no WhatsApp agora</em> aqui embaixo te conecta direto com um atendente.', handoff: true },
    { match: ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite'], reply: 'Oi! Aqui é a equipe da <em>minha prótese</em>. Pode contar o que precisa — componente, paciente, prescrição. Te ajudo a achar no catálogo.' },
  ];
  const fallback = 'Recebi sua mensagem. Pra uma resposta personalizada, toque em <em>Falar no WhatsApp agora</em> aqui embaixo — nossa equipe responde em poucos minutos. (Este chat está em modo demonstração; a IA treinada entra no ar quando o endpoint Vercel for plugado.)';

  window.mpChatHandler = function (text, addMsg) {
    const k = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    let reply = fallback;
    for (const r of RESPOSTAS) {
      if (r.match.some(m => k.includes(m.normalize('NFD').replace(/[̀-ͯ]/g,'')))) {
        reply = r.reply;
        break;
      }
    }
    // Simula delay "digitando"
    setTimeout(() => addMsg(reply, 'in'), 600 + Math.random() * 400);
  };
})();
