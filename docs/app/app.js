/* minhaprotese.com.br — SPA v3 com brand pack oficial
 * Navy/Blue/Orange · Manrope/Inter · Categorias por tipo de produto
 * Mantém: catálogo consolidado (parent + variants), carrinho via WhatsApp, chat IA
 */
(function () {
  'use strict';

  const WHATSAPP = '5511000000000';
  const CART_KEY = 'mp_cart_v3';

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const money = v => v ? `R$ ${parseFloat(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}` : '';
  const installment = v => v && parseFloat(v) > 100 ? `ou 12x de R$ ${(parseFloat(v) / 12).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}` : '';
  const slug = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\w-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
  const esc = s => (s||'').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const titlecaseSmart = s => {
    if (!s) return s;
    if (s === s.toUpperCase() && s.length > 4) {
      return s.toLowerCase().split(' ').map(w => {
        if (w.match(/^\d/) || w.length <= 2 || w.match(/^[a-z]\d/i)) return w;
        return w[0].toUpperCase() + w.slice(1);
      }).join(' ');
    }
    return s;
  };

  // Mapeamento de categorias por keywords no título
  const CATEGORIES = {
    'proteses': {
      title: 'Próteses',
      subtitle: 'Desempenho e liberdade',
      keywords: ['liner', 'pé ', 'pe ', 'joelho', 'encaixe', 'soquete', 'adaptador', 'pino', 'shuttle', 'taleo', 'triton', 'sach', 'pro-flex', 'proflex', 'iceross', 'alpha', 'aspire', 'meta core', 'meta arc', 'meta flow', 'tubo', 'pirâmide', 'piramide'],
      icon: 'M12 2v6m0 8v6M2 12h6m8 0h6'
    },
    'orteses': {
      title: 'Órteses',
      subtitle: 'Suporte e estabilidade',
      keywords: ['joelheira', 'tornozeleira', 'órtese', 'ortese', 'afo', 'xtern', 'palmilha', 'cinta', 'imobilizador', 'munhequeira', 'tornozelo madeira'],
      icon: 'M9 3h6l-1 4h-4z M7 7h10l-2 14H9z'
    },
    'mobilidade': {
      title: 'Mobilidade',
      subtitle: 'Mais autonomia no dia a dia',
      keywords: ['cadeira', 'scooter', 'andador', 'muleta', 'bengala', 'cadeirante'],
      icon: 'M6 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0M14 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0M7 7h10l2 10h-14z'
    },
    'acessorios': {
      title: 'Acessórios',
      subtitle: 'Conforto e praticidade',
      keywords: ['capa', 'meia', 'cobertura', 'cosmetic', 'cosmétic', 'creme', 'spray', 'fita', 'bandagem', 'gel para', 'óleo', 'oleo', 'limpa', 'higiene', 'reposição', 'reposicao'],
      icon: 'M4 7h16v13H4z M9 4h6v3H9z'
    },
  };

  function categorize(product) {
    const hay = (product.title + ' ' + (product.variants?.[0]?.original_name || '')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    for (const [key, cat] of Object.entries(CATEGORIES)) {
      if (cat.keywords.some(kw => hay.includes(kw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')))) {
        return key;
      }
    }
    return 'proteses'; // default
  }

  const VENDOR_META = {
    'Össur':        { origin: 'Islândia',  desc: 'Pés Pro-Flex, joelhos Aspire, liners Iceross.' },
    'Ottobock':     { origin: 'Alemanha',  desc: 'Joelhos 3R80, C-Leg, pés SACH e Taleo.' },
    'WillowWood':   { origin: 'EUA',       desc: 'Liners Alpha e pés META em fibra de carbono.' },
    'ALPS':         { origin: 'EUA',       desc: 'Liners em gel e silicone para nível K2-K4.' },
    'Polior':       { origin: 'Brasil',    desc: 'Componentes modulares e adaptadores.' },
    'ProKinetics':  { origin: 'Brasil',    desc: 'Articulações, liners SUPREME e VACUUM.' },
    'Ortho Pauher': { origin: 'Brasil',    desc: 'Meias para coto, órteses e acessórios.' },
    'Ethnos':       { origin: 'Brasil',    desc: 'Sistema VIP de válvulas e kits RevoFit.' },
    'Circleg':      { origin: 'Suíça',     desc: 'Joelho e pé dinâmico modulares.' },
    'TuboMed':      { origin: 'Canadá',    desc: 'Órteses AFO externas XTERN.' },
  };

  let CATALOG = [];
  let CART = JSON.parse(localStorage.getItem(CART_KEY) || '[]');

  async function init() {
    const res = await fetch('../data/catalog.json');
    CATALOG = (await res.json()).map(p => ({
      ...p,
      title: titlecaseSmart(p.title),
      category: categorize(p),
    }));
    updateCartBadge();
    window.addEventListener('hashchange', route);
    route();
  }

  function route() {
    const h = (location.hash || '#').slice(1);
    const [section, param] = h.split('/').filter(Boolean);
    if (section === 'p') return renderProduct(param);
    if (section === 'cat') return renderCategory(param);
    if (section === 'c') return renderCollection(param);
    if (section === 'cart') return renderCart();
    if (section === 'brands') return renderBrandsHub();
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
    const withImg = CATALOG.filter(p => p.image && p.price_min);
    const featured = withImg.slice(0, 8);
    const totalSku = CATALOG.reduce((a, p) => a + p.cluster_size, 0);

    $('#main').innerHTML = `
      <!-- HERO -->
      <section class="hero">
        <div class="container">
          <div class="hero__grid">
            <div>
              <h1>Tecnologia e cuidado para cada passo da <em>sua jornada.</em></h1>
              <p class="lead">Próteses, órteses e produtos de mobilidade com qualidade, conforto e confiança. ${CATALOG.length} produtos curados das principais marcas — Össur, Ottobock, WillowWood, ALPS e mais.</p>
              <div class="hero__cta">
                <a href="#cat/proteses" class="btn btn--primary btn--lg">Ver produtos</a>
                <a href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener" class="btn btn--secondary btn--lg">Falar com especialista</a>
              </div>
              <div class="hero__trust">
                <div class="hero__trust-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/></svg>
                  Compra 100% segura
                </div>
                <div class="hero__trust-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 10h20"/></svg>
                  Parcele em até 12x
                </div>
                <div class="hero__trust-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h12v9H3z"/><path d="M15 10h4l2 3v3h-6"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
                  Entrega para todo o Brasil
                </div>
              </div>
            </div>

            <div class="hero__visual">
              <img src="assets/hero-photo.jpg" alt="Pessoa caminhando com prótese de fibra de carbono em ambiente externo, luz natural" width="860" height="591" loading="eager">
            </div>
          </div>
        </div>
      </section>

      <!-- CATEGORIAS -->
      <section class="section">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Categorias</span>
            <h2>Encontre as soluções <em style="font-style:normal; color: var(--blue-700);">de mobilidade.</em></h2>
            <p class="lead">Catálogo curado por tipo de produto, com variantes de tamanho, lado e modelo agrupadas em cada item.</p>
          </div>

          <div class="categories">
            ${Object.entries(CATEGORIES).map(([key, cat]) => {
              const count = CATALOG.filter(p => p.category === key).length;
              if (count === 0) return '';
              return `
                <a href="#cat/${key}" class="category-card">
                  <img src="assets/cat-${key}.png" alt="" class="category-card__illustration" width="84" height="110" loading="lazy">
                  <div class="category-card__body">
                    <h3 class="category-card__title">${cat.title}</h3>
                    <span class="category-card__subtitle">${cat.subtitle}</span>
                    <span class="category-card__count">${count} produtos</span>
                  </div>
                  <span class="category-card__arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </span>
                </a>
              `;
            }).join('')}
          </div>
        </div>
      </section>

      <!-- PRODUTOS EM DESTAQUE -->
      <section class="section section--soft">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Mais vendidos</span>
            <h2>Em estoque, <em style="font-style:normal; color: var(--blue-700);">prontos para envio.</em></h2>
            <p class="lead">Curadoria dos produtos com maior procura — preço médio das principais lojas do segmento.</p>
          </div>
          <div class="products">
            ${featured.map(productCard).join('')}
          </div>
          <div class="text-center" style="margin-top: 48px;">
            <a href="#cat/proteses" class="btn btn--primary">Ver todos os ${CATALOG.length} produtos</a>
          </div>
        </div>
      </section>

      <!-- PILARES DE CONFIANÇA -->
      <section class="section">
        <div class="container">
          <div class="section-head" style="text-align: center; margin-inline: auto;">
            <span class="eyebrow">Por que comprar aqui</span>
            <h2 style="margin-inline: auto;">Compra simples, <em style="font-style:normal; color: var(--blue-700);">com a segurança que você merece.</em></h2>
          </div>
          <div class="pillars">
            <div class="pillar">
              <div class="pillar__icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="m9 12 2 2 4-4"/></svg></div>
              <h3>Pagamento seguro</h3>
              <p>Ambiente 100% protegido. Cartão, Pix ou boleto.</p>
            </div>
            <div class="pillar">
              <div class="pillar__icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 10h20"/></svg></div>
              <h3>Parcele em 12x</h3>
              <p>Condições facilitadas para o seu orçamento.</p>
            </div>
            <div class="pillar">
              <div class="pillar__icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h12v9H3z"/><path d="M15 10h4l2 3v3h-6"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></div>
              <h3>Entrega rápida</h3>
              <p>Para todo o Brasil, em até 3 dias úteis em SP.</p>
            </div>
            <div class="pillar">
              <div class="pillar__icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-7a9 9 0 0 1 18 0v7"/><path d="M3 15h3v6H4a1 1 0 0 1-1-1v-5z"/><path d="M21 15h-3v6h2a1 1 0 0 0 1-1v-5z"/></svg></div>
              <h3>Atendimento humano</h3>
              <p>Equipe especializada pronta para ajudar você.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- EMBALAGEM (sua jornada começa aqui) -->
      <section class="package-section">
        <div class="container">
          <div class="package-section__grid">
            <div class="package-section__image">
              <img src="assets/embalagem.png" alt="Caixa de papelão kraft da minhaprotese.com.br com curva navy e ponto laranja" width="590" height="470" loading="lazy">
            </div>
            <div>
              <span class="eyebrow eyebrow--on-dark">Cuidado em cada detalhe</span>
              <h2 class="package-section__quote">Sua jornada <em>começa aqui.</em></h2>
              <p class="lead" style="color: #CBD0DA; max-width: 44ch;">Conteúdo que transforma vidas. Embalamos cada pedido com proteção extra e identidade própria — porque acreditamos que cada entrega é o começo de uma nova fase.</p>
              <div style="display: flex; gap: 32px; margin-top: 32px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 10px; color: #CBD0DA; font-size: 14px;">
                  <span style="width: 36px; height: 36px; border-radius: 50%; background: rgba(255,198,109,0.16); color: var(--amber-300); display: grid; place-items: center;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                  </span>
                  Embalagem reforçada
                </div>
                <div style="display: flex; align-items: center; gap: 10px; color: #CBD0DA; font-size: 14px;">
                  <span style="width: 36px; height: 36px; border-radius: 50%; background: rgba(255,198,109,0.16); color: var(--amber-300); display: grid; place-items: center;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  </span>
                  Nota fiscal incluída
                </div>
                <div style="display: flex; align-items: center; gap: 10px; color: #CBD0DA; font-size: 14px;">
                  <span style="width: 36px; height: 36px; border-radius: 50%; background: rgba(255,198,109,0.16); color: var(--amber-300); display: grid; place-items: center;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h12v9H3z"/><path d="M15 10h4l2 3v3h-6"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
                  </span>
                  Rastreio em tempo real
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- MARCAS -->
      <section class="section section--soft">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Marcas curadas</span>
            <h2>Os fabricantes <em style="font-style:normal; color: var(--blue-700);">de confiança.</em></h2>
            <p class="lead">Compra direta de distribuidores oficiais. Nota fiscal e garantia em todos os produtos.</p>
          </div>
          <div class="categories">
            ${['Össur', 'Ottobock', 'WillowWood', 'ALPS', 'Polior', 'ProKinetics'].map(v => {
              const count = CATALOG.filter(p => p.vendor === v).length;
              if (count === 0) return '';
              const meta = VENDOR_META[v] || {};
              return `
                <a href="#c/vendor-${slug(v)}" class="category-card category-card--vendor">
                  <div class="category-card__body">
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted);">${esc(meta.origin || '')}</span>
                    <h3 class="category-card__title" style="margin-top: 6px;">${esc(v)}</h3>
                    <span class="category-card__subtitle">${esc(meta.desc || '')}</span>
                    <span class="category-card__count">${count} produtos</span>
                  </div>
                  <span class="category-card__arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </span>
                </a>
              `;
            }).join('')}
          </div>
          <div class="text-center" style="margin-top: 32px;">
            <a href="#brands" class="btn btn--secondary">Ver todas as marcas</a>
          </div>
        </div>
      </section>

      <!-- DEPOIMENTO -->
      <section class="section section--dark">
        <div class="container" style="max-width: 880px; text-align: center;">
          <span class="eyebrow eyebrow--on-dark">Quem compra aqui</span>
          <h2 style="margin-top: 0; font-size: clamp(24px, 3.4vw, 34px); line-height: 1.3;">
            "Cheguei perdido, sem saber por onde começar. A equipe me explicou cada componente, escolheu o ideal para o meu pai e ainda acompanhou a entrega."
          </h2>
          <p style="margin-top: 32px; color: #CBD0DA; font-size: 14px;">
            <strong style="color:#fff; font-weight:700;">Renato S.</strong> · Filho de paciente · São Paulo
          </p>
        </div>
      </section>
    `;
    window.scrollTo(0, 0);
  }

  // ============================================================
  //  HUB DE MARCAS
  // ============================================================
  function renderBrandsHub() {
    const vendors = Object.keys(VENDOR_META);
    $('#main').innerHTML = `
      <div class="container">
        <nav class="breadcrumb">
          <a href="#">Início</a>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><polyline points="9 6 15 12 9 18"/></svg>
          <span>Marcas</span>
        </nav>

        <header style="padding-bottom: 32px; margin-bottom: 40px;">
          <span class="eyebrow">Catálogo por fabricante</span>
          <h1 style="font-size: clamp(36px, 5vw, 52px); margin-top: 8px;">Todas as marcas</h1>
          <p class="lead" style="margin-top: 12px;">Distribuímos só de fabricantes autorizados, com nota fiscal e garantia de origem.</p>
        </header>

        <div class="categories">
          ${vendors.map(v => {
            const count = CATALOG.filter(p => p.vendor === v).length;
            if (count === 0) return '';
            const meta = VENDOR_META[v];
            return `
              <a href="#c/vendor-${slug(v)}" class="category-card">
                <div>
                  <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted);">${esc(meta.origin)}</span>
                  <h3 class="category-card__title" style="margin-top: 6px;">${esc(v)}</h3>
                  <span class="category-card__subtitle">${esc(meta.desc)}</span>
                </div>
                <span class="category-card__count">${count} produtos</span>
                <span class="category-card__arrow">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </span>
              </a>
            `;
          }).join('')}
        </div>
      </div>
    `;
    window.scrollTo(0, 0);
  }

  // ============================================================
  //  CATEGORIA (Próteses/Órteses/Mobilidade/Acessórios/Ofertas)
  // ============================================================
  function renderCategory(key) {
    let products, title, subtitle;

    if (key === 'ofertas') {
      products = CATALOG.filter(p => p.image && p.price_min);
      title = 'Ofertas';
      subtitle = 'Produtos com pronta-entrega e preço de mercado.';
    } else if (CATEGORIES[key]) {
      products = CATALOG.filter(p => p.category === key);
      title = CATEGORIES[key].title;
      subtitle = CATEGORIES[key].subtitle;
    } else {
      return renderHome();
    }

    return renderProductGrid({
      title, subtitle,
      eyebrow: 'Categoria',
      products,
      breadcrumb: title,
    });
  }

  function renderCollection(param) {
    let products = CATALOG;
    let title = 'Todo o catálogo';
    let eyebrow = 'Catálogo';

    if (param && param.startsWith('vendor-')) {
      const v = decodeURIComponent(param.slice(7));
      products = CATALOG.filter(p => slug(p.vendor) === v);
      title = products[0]?.vendor || v;
      eyebrow = 'Marca';
    }

    return renderProductGrid({ title, subtitle: '', eyebrow, products, breadcrumb: title });
  }

  function renderProductGrid({ title, subtitle, eyebrow, products, breadcrumb }) {
    products = [...products].sort((a, b) => {
      const sa = (a.image ? 4 : 0) + (a.status === 'active' ? 2 : 0) + (a.price_min ? 1 : 0);
      const sb = (b.image ? 4 : 0) + (b.status === 'active' ? 2 : 0) + (b.price_min ? 1 : 0);
      if (sa !== sb) return sb - sa;
      return a.title.localeCompare(b.title, 'pt-BR');
    });

    const vendors = uniqBy(products, p => p.vendor).map(p => p.vendor).filter(Boolean);

    $('#main').innerHTML = `
      <div class="container">
        <nav class="breadcrumb">
          <a href="#">Início</a>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><polyline points="9 6 15 12 9 18"/></svg>
          <span>${esc(breadcrumb)}</span>
        </nav>

        <header style="padding-bottom: 32px; border-bottom: 1px solid var(--border); margin-bottom: 40px;">
          <span class="eyebrow">${esc(eyebrow)}</span>
          <h1 style="font-size: clamp(36px, 5vw, 52px); margin-top: 8px;">${esc(title)}</h1>
          ${subtitle ? `<p class="lead" style="margin-top: 8px;">${esc(subtitle)}</p>` : ''}
          <p class="meta" style="margin-top: 12px;">${products.length} produtos</p>
        </header>

        <div class="collection-layout">
          <aside class="facets" aria-label="Filtros">
            ${vendors.length > 1 ? `
              <h4>Marca</h4>
              <ul>
                ${vendors.slice(0, 12).map(v => `<li><a href="#c/vendor-${slug(v)}">${esc(v)} <span>${products.filter(p => p.vendor===v).length}</span></a></li>`).join('')}
              </ul>
            ` : ''}
            <h4>Categorias</h4>
            <ul>
              ${Object.entries(CATEGORIES).map(([k, c]) => `<li><a href="#cat/${k}">${c.title}</a></li>`).join('')}
              <li><a href="#cat/ofertas" style="color: var(--orange-500); font-weight: 700;">Ofertas</a></li>
            </ul>
          </aside>

          <div>
            <div class="products">
              ${products.slice(0, 60).map(productCard).join('')}
            </div>
            ${products.length > 60 ? `
              <div class="text-center" style="margin-top: 40px;">
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
    const hasVariants = p.variants && p.variants.length > 1;
    const related = CATALOG.filter(x => x.vendor === p.vendor && x.handle !== p.handle && x.image && x.price_min).slice(0, 4);
    const wppMsg = `Olá, tenho dúvida sobre: ${p.title}`;

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
            ${hasVariants
              ? `<span class="product-info__sku"><strong style="color: var(--navy-900); margin-right: 4px;">${p.cluster_size}</strong> opções de ${p.variant_axis || 'modelo'} · Distribuidor autorizado</span>`
              : `<span class="product-info__sku">SKU ${esc(p.variants[0].sku)} · Distribuidor autorizado</span>`
            }

            ${p.price_min ? `
              <div class="product-info__price-wrap">
                <div class="product-info__price" data-price>${money(p.price_min)}${hasVariants && p.price_min !== p.price_max && p.price_max ? ` – ${money(p.price_max)}` : ''}</div>
                ${parseFloat(p.price_min) > 100 ? `<div class="product-info__installment" data-installment>${installment(p.price_min)} sem juros</div>` : ''}
              </div>
            ` : `
              <div style="margin: 28px 0 24px; padding: 20px; background: var(--bg-soft); border-radius: var(--radius-md); border-left: 3px solid var(--blue-700);">
                <strong style="color: var(--navy-900); display: block; margin-bottom: 4px;">Preço sob consulta</strong>
                <span style="font-size: 14px; color: var(--text-secondary);">Orçamento via WhatsApp em até 1 dia útil.</span>
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

            ${hasVariants ? variantSelector(p) : ''}

            <div class="product-info__actions" style="margin-top: 24px;">
              <div class="qty">
                <button type="button" data-qty-minus aria-label="Diminuir">−</button>
                <input type="number" id="qty" value="1" min="1" inputmode="numeric" aria-label="Quantidade">
                <button type="button" data-qty-plus aria-label="Aumentar">+</button>
              </div>
              <button class="btn btn--primary btn--lg" data-add-cart style="flex: 1; min-width: 200px;" ${!p.price_min ? 'disabled' : ''}>${p.price_min ? 'Adicionar ao carrinho' : 'Pedir orçamento'}</button>
            </div>

            <a href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent(wppMsg)}" target="_blank" rel="noopener" class="btn btn--whatsapp btn--block" style="margin-top: 4px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.65-4.94A8 8 0 1 1 8 19.55L3 21z"/></svg>
              Tirar dúvida sobre este produto
            </a>

            <div class="product-info__description">
              <p>${esc(p.title)} — distribuído pela minhaprotese.com.br com nota fiscal e garantia de origem da ${esc(p.vendor)}.${hasVariants ? ` Disponível em ${p.cluster_size} ${p.variant_axis ? p.variant_axis.toLowerCase() + 's' : 'variantes'}.` : ''}</p>
            </div>

            <div class="product-specs">
              <h3>Especificações</h3>
              <dl>
                <dt>Marca</dt><dd>${esc(p.vendor)}</dd>
                ${hasVariants ? `<dt>Variantes</dt><dd>${p.cluster_size} opções de ${p.variant_axis || 'modelo'}</dd>` : `<dt>SKU</dt><dd>${esc(p.variants[0].sku)}</dd>`}
                <dt>Origem</dt><dd>Distribuidor autorizado</dd>
                <dt>Embalagem</dt><dd>Unidade</dd>
                <dt>Garantia</dt><dd>6 meses contra defeito de fabricação</dd>
              </dl>
            </div>
          </div>
        </div>

        ${related.length ? `
          <section class="section section--soft" style="margin: 56px calc(-1 * var(--page-x)) 0; padding-inline: var(--page-x); border-radius: 0;">
            <div style="max-width: var(--max-w); margin: 0 auto;">
              <div class="section-head">
                <span class="eyebrow">Da mesma marca</span>
                <h2 style="font-size: clamp(24px, 3vw, 32px);">Mais de ${esc(p.vendor)}</h2>
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

  function variantSelector(p) {
    const axis = p.variant_axis || 'Modelo';
    return `
      <div class="variant-selector" data-variant-selector>
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
          <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); font-weight: 800;">${esc(axis)}</span>
          <span class="meta" id="variant-info" style="font-size: 12px;">Escolha uma opção</span>
        </div>
        <div class="variant-pills" id="variant-pills">
          ${p.variants.map((v, i) => `
            <button type="button" class="variant-pill ${i === 0 ? 'is-active' : ''}" data-variant-idx="${i}">
              <span class="variant-pill__value">${esc(v.value)}</span>
              ${v.sku !== v.value ? `<span class="variant-pill__sku">${esc(v.sku)}</span>` : ''}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  function bindProductActions(p) {
    let selectedVariantIdx = 0;
    const qty = $('#qty');

    function updateSelectedVariant(idx) {
      selectedVariantIdx = idx;
      const v = p.variants[idx];
      $$('.variant-pill').forEach((el, i) => el.classList.toggle('is-active', i === idx));
      if (v.price) {
        const priceEl = $('[data-price]');
        const instEl = $('[data-installment]');
        if (priceEl) priceEl.textContent = money(v.price);
        if (instEl && parseFloat(v.price) > 100) instEl.textContent = installment(v.price) + ' sem juros';
      }
      const info = $('#variant-info');
      if (info) info.innerHTML = `SKU <strong style="color: var(--navy-900);">${esc(v.sku)}</strong>`;
    }

    $$('.variant-pill').forEach(btn => {
      btn.addEventListener('click', () => updateSelectedVariant(parseInt(btn.dataset.variantIdx)));
    });
    if ($('#variant-info')) updateSelectedVariant(0);

    if (qty) {
      $('[data-qty-minus]')?.addEventListener('click', () => { qty.value = Math.max(1, parseInt(qty.value)-1); });
      $('[data-qty-plus]')?.addEventListener('click', () => { qty.value = parseInt(qty.value)+1; });
    }

    $('[data-add-cart]')?.addEventListener('click', () => {
      if (!p.price_min) return;
      const v = p.variants[selectedVariantIdx];
      const q = parseInt(qty.value) || 1;
      const lineKey = `${p.handle}::${v.sku}`;
      const existing = CART.find(c => c.key === lineKey);
      if (existing) existing.qty += q;
      else CART.push({
        key: lineKey,
        handle: p.handle,
        title: p.title,
        variantLabel: v.value,
        variantAxis: p.variant_axis,
        sku: v.sku,
        price: v.price || p.price_min,
        image: p.image,
        qty: q,
      });
      localStorage.setItem(CART_KEY, JSON.stringify(CART));
      updateCartBadge();
      const btn = $('[data-add-cart]');
      const orig = btn.textContent;
      btn.textContent = 'Adicionado ✓';
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
          <div class="section-head">
            <span class="eyebrow">Pedido</span>
            <h1>Seu carrinho</h1>
          </div>

          ${CART.length === 0 ? `
            <div style="text-align: center; padding: 56px 24px; background: var(--bg-soft); border-radius: var(--radius-md);">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 20px;"><path d="M6 7h12l-1 14H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>
              <h3 style="margin-bottom: 8px;">Carrinho vazio</h3>
              <p class="lead" style="margin: 0 auto 24px;">Adicione produtos e feche pelo WhatsApp.</p>
              <a href="#cat/proteses" class="btn btn--primary">Ver produtos</a>
            </div>
          ` : `
            <div style="display:grid; grid-template-columns: 1.6fr 1fr; gap: 48px;">
              <div>
                ${CART.map((c, i) => `
                  <div class="cart-line">
                    <div class="cart-line__image">${c.image?`<img src="${c.image}" alt="">`:''}</div>
                    <div>
                      <p style="margin:0 0 4px; font-weight:700; line-height: 1.3; font-family: var(--font-title);"><a href="#p/${c.handle}" style="color:var(--navy-900);">${esc(c.title)}</a></p>
                      ${c.variantLabel && c.variantLabel !== 'Único' ? `<span class="meta" style="display: block; margin-bottom: 2px;">${esc(c.variantAxis || 'Variante')}: <strong style="color: var(--navy-900);">${esc(c.variantLabel)}</strong></span>` : ''}
                      <span class="meta">SKU ${esc(c.sku)}</span>
                    </div>
                    <div>
                      <input type="number" value="${c.qty}" min="1" data-cart-qty="${i}" style="width:64px; height:38px; padding:0 8px; border:1px solid var(--border); border-radius:var(--radius-pill); text-align:center; font: inherit; font-weight: 600;">
                    </div>
                    <div style="text-align:right;">
                      <div style="font-weight:800; color:var(--navy-900); font-family: var(--font-title);">${money((parseFloat(c.price)||0)*c.qty)}</div>
                      <button data-cart-remove="${i}" style="background:none; border:0; color:var(--text-muted); font-size:12px; cursor:pointer; margin-top:4px; text-decoration:underline; font-family: inherit;">remover</button>
                    </div>
                  </div>
                `).join('')}
              </div>
              <aside class="cart-summary">
                <h3 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); margin: 0 0 20px; font-weight: 800;">Resumo</h3>
                <div class="cart-summary__row"><span>Subtotal</span><span style="font-weight: 700;">${money(total)}</span></div>
                <div class="cart-summary__row"><span>Frete</span><span style="color: var(--text-muted);">Cálculo via WhatsApp</span></div>
                <div class="cart-summary__row" style="border-top:1px solid var(--gray-300); padding-top:14px; margin-top: 14px;">
                  <strong class="cart-summary__total">Total</strong>
                  <strong class="cart-summary__total">${money(total)}</strong>
                </div>
                ${total > 100 ? `<p style="font-size: 13px; color: var(--text-secondary); margin: 8px 0 16px;">${installment(total)} sem juros</p>` : ''}
                <button class="btn btn--primary btn--block btn--lg" data-checkout-wpp>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.65-4.94A8 8 0 1 1 8 19.55L3 21z"/></svg>
                  Fechar pelo WhatsApp
                </button>
                <p style="font-size: 12px; color: var(--text-muted); margin-top: 14px; text-align: center;">A equipe valida estoque, frete e gera o link de pagamento.</p>
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
      const msg = 'Olá, gostaria de fechar este pedido:\n\n' + CART.map(c => {
        let line = `• ${c.qty}x ${c.title}`;
        if (c.variantLabel && c.variantLabel !== 'Único') line += ` (${c.variantAxis || ''} ${c.variantLabel})`;
        line += `\n  SKU ${c.sku} — ${money((parseFloat(c.price)||0)*c.qty)}`;
        return line;
      }).join('\n\n') + `\n\n*Total estimado: ${money(total)}*\n\nVocês podem confirmar disponibilidade e frete?`;
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
        const skus = (p.variants || []).map(v => v.sku).join(' ');
        const hay = `${p.title} ${p.vendor} ${skus}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
        return hay.includes(qn);
      }).sort((a, b) => {
        const sa = (a.image ? 2 : 0) + (a.status === 'active' ? 1 : 0);
        const sb = (b.image ? 2 : 0) + (b.status === 'active' ? 1 : 0);
        return sb - sa;
      });
    }
    $('#main').innerHTML = `
      <section class="section">
        <div class="container">
          <div class="section-head">
            <span class="eyebrow">Busca</span>
            <h1>${q ? `${results.length} resultados para "<em style="font-style:normal; color: var(--blue-700);">${esc(q)}</em>"` : 'O que você procura?'}</h1>
          </div>
          <form class="search-input-wrap" onsubmit="event.preventDefault(); location.hash='#search?q='+encodeURIComponent(this.q.value);">
            <input class="input" type="search" name="q" value="${esc(q)}" placeholder="Buscar produto, marca ou SKU…" autofocus>
            <button class="btn btn--primary" type="submit">Buscar</button>
          </form>
          ${q && results.length === 0 ? `
            <div style="text-align: center; padding: 56px 24px; background: var(--bg-soft); border-radius: var(--radius-md);">
              <h3>Sem resultados</h3>
              <p class="lead" style="margin: 12px auto 24px;">Tente outra palavra — ou fale com a equipe.</p>
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
  //  Product card
  // ============================================================
  function productCard(p) {
    const hasPrice = !!p.price_min;
    const isRange = hasPrice && p.price_min !== p.price_max && p.price_max;
    const priceBlock = hasPrice
      ? `${isRange ? '<span class="product-card__price-from">a partir de</span>' : ''}${money(p.price_min)}${parseFloat(p.price_min) > 100 ? `<div class="product-card__price-installment">${installment(p.price_min)}</div>` : ''}`
      : '<span class="product-card__price--no">sob consulta</span>';

    return `
      <a href="#p/${p.handle}" class="product-card">
        <div class="product-card__image">
          ${p.image ? `<img src="${p.image}" alt="${esc(p.title)}" loading="lazy">` : `<span class="meta" style="opacity:0.5; font-size: 11px;">sem foto</span>`}
        </div>
        <div class="product-card__body">
          <span class="product-card__vendor">${esc(p.vendor)}</span>
          <p class="product-card__title">${esc(p.title)}</p>
          ${p.cluster_size > 1 ? `<span class="product-card__variants">${p.cluster_size} ${p.variant_axis ? p.variant_axis.toLowerCase() + 's' : 'opções'}</span>` : ''}
          <div class="product-card__price">${priceBlock}</div>
        </div>
      </a>
    `;
  }

  function uniqBy(arr, fn) { const s = new Set(); return arr.filter(x => { const k = fn(x); if (s.has(k)) return false; s.add(k); return true; }); }

  init();
})();

// ============================================================
//  Chat IA — respostas canned
// ============================================================
(function () {
  const RESPOSTAS = [
    { match: ['liner', 'liners'], reply: 'Temos liners das principais marcas: <em>Össur</em> (Iceross Comfort Locking), <em>WillowWood</em> (Alpha Element), <em>ALPS</em> (Smart Seal) e <em>ProKinetics</em> (SUPREME). Cada liner tem versões em diferentes espessuras (3mm, 6mm, 9mm) — escolhidas na própria página do produto.' },
    { match: ['joelho', 'joelhos'], reply: 'Joelhos disponíveis: hidráulicos rotativos (3R80 Ottobock), policêntricos, microprocessados. Você já tem prescrição do protesista?' },
    { match: ['pé', 'pe ', 'pes ', 'fibra de carbono'], reply: 'Temos pés desde os SACH tradicionais até linha de fibra de carbono (Pro-Flex Össur, Taleo Ottobock, META WillowWood). Pra qual nível de atividade — caminhada doméstica, trabalho, ou esportes?' },
    { match: ['preço', 'preco', 'valor', 'custo', 'orçamento', 'orcamento', 'parcela'], reply: 'Cada produto tem o preço visível no catálogo, com opção de parcelamento em até 12x sem juros. Para itens "sob consulta", orçamento sai em 1 dia útil pelo WhatsApp.' },
    { match: ['entrega', 'frete', 'envio', 'prazo'], reply: 'Pronta-entrega pros itens marcados "Em estoque": <em>3 dias úteis</em> pra SP capital, 5-7 dias pro restante do Brasil. Entregamos pra todo o país.' },
    { match: ['variante', 'variantes', 'tamanho', 'tamanhos', 'opções', 'opcoes'], reply: 'Cada produto agrupa todas as variantes disponíveis. Na página, você seleciona <em>tamanho</em>, <em>lado</em>, <em>espessura</em> ou <em>conexão</em> nos botões abaixo do preço.' },
    { match: ['oi', 'olá', 'ola', 'bom dia', 'boa tarde'], reply: 'Oi! Aqui é o atendimento da <em>minhaprotese.com.br</em>. Pode contar o que precisa — componente, paciente, prescrição.' },
    { match: ['dor', 'inflamado', 'machucou', 'cirurgia'], reply: 'Isso é melhor ver direto com a equipe. Toque em <em>Falar no WhatsApp agora</em> aqui embaixo que continuamos por lá.', handoff: true },
    { match: ['humano', 'pessoa', 'atendente'], reply: 'Claro, te passo pra equipe. <em>Falar no WhatsApp agora</em> aqui embaixo te conecta direto com um atendente.', handoff: true },
  ];
  const fallback = 'Recebi sua mensagem. Pra uma resposta personalizada, toque em <em>Falar no WhatsApp agora</em>. (Este chat está em modo demonstração; a IA treinada entra no ar quando o endpoint for plugado.)';

  window.mpChatHandler = function (text, addMsg) {
    const k = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    let reply = fallback;
    for (const r of RESPOSTAS) {
      if (r.match.some(m => k.includes(m.normalize('NFD').replace(/[̀-ͯ]/g,'')))) {
        reply = r.reply;
        break;
      }
    }
    setTimeout(() => addMsg(reply, 'in'), 600 + Math.random() * 400);
  };
})();
