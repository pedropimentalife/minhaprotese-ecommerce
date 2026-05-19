# minhaprotese.com.br — pacote de implementação

Este diretório contém todo o material para colocar a loja **minha prótese** no ar em Shopify:
o tema, os SKUs extraídos dos catálogos dos fornecedores, scripts Python que mantêm preço e
estoque sincronizados, identidade visual e o widget de WhatsApp com IA.

## O que está pronto neste pacote

```
minhaprotese-ecommerce/
├── brand/                       Identidade visual
│   ├── logo/                    Logo SVG (primary, on-dark, mark-only, favicon)
│   └── guidelines/              BRAND.md + TOKENS.md
│
├── shopify-theme/               Tema Shopify completo (Online Store 2.0)
│   ├── assets/                  base.css, theme.js
│   ├── config/                  settings_schema.json, settings_data.json
│   ├── layout/                  theme.liquid
│   ├── locales/                 pt-BR.default.json, en.json
│   ├── sections/                hero, featured-collections, featured-products,
│   │                            value-pillars, testimonial, header, footer,
│   │                            main-product, main-collection, main-cart, main-page
│   ├── snippets/                product-card, logo-inline, icon, whatsapp-floating,
│   │                            meta-tags
│   └── templates/               index.json, product.json, collection.json, cart.json,
│                                page.json, 404.liquid, list-collections.liquid,
│                                search.liquid
│
├── catalog/                     Dados extraídos / prontos para importar
│   ├── raw_products.csv              1.027 SKUs extraídos dos PDFs (pós-limpeza)
│   ├── raw_products_clean.csv        Versão com nomes pós-processados
│   ├── benchmark_prices.csv          397 produtos coletados das lojas concorrentes
│   ├── products_priced.csv           SKUs + preço médio + URL de imagem (após matching)
│   └── shopify_products_import.csv   CSV pronto para upload — 262 active, 765 draft
│
├── scripts/                     Pipeline Python
│   ├── extract_skus.py          Extrai produtos dos PDFs
│   ├── clean_names.py           Remove artefatos do PDF dos nomes
│   ├── scrape_benchmarks.py     Coleta preços + imagens das lojas concorrentes
│   ├── compute_prices.py        Calcula preço médio com matching fuzzy + vendor + SKU
│   ├── generate_shopify_csv.py  Converte para CSV de importação Shopify (com imagens)
│   ├── run_pipeline.sh          Roda tudo em sequência
│   ├── deploy-everything.sh     Deploy ponta a ponta (Shopify + IA Vercel)
│   ├── requirements.txt
│   └── inventory-sync/
│       ├── inventory_sync.py    Sync bidirecional Shopify ⇄ Google Sheets
│       ├── Estoque-template.csv Modelo da planilha de estoque
│       ├── .env.example
│       └── README.md
│
├── whatsapp-ai/                 Endpoint serverless da IA (Vercel + Claude API)
│   ├── api/chat.js              POST /api/chat — endpoint principal
│   ├── lib/system-prompt.js     Prompt da IA treinado (voz da marca)
│   ├── lib/knowledge-base.js    Busca de produtos no catálogo
│   ├── scripts/build-catalog.mjs Converte CSV Shopify → JSON p/ a IA
│   ├── data/catalog.json        Gerado, com 1027 produtos
│   ├── test/chat.test.js        Casos de teste (dúvida técnica, handoff, etc.)
│   ├── vercel.json              CORS + config de função
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── docs/                        Documentação adicional
│   ├── SHOPIFY-CHECKLIST.md     Checklist de pré-lançamento
│   ├── AI-ENDPOINT-SPEC.md      Spec do endpoint IA (e contrato com o widget)
│   ├── CATALOG-DATA-QUALITY.md  Qualidade dos dados + plano de revisão
│   └── preview/index.html       Preview HTML estático da home (abre no navegador)
│
└── README.md                    Este arquivo
```

## Números do catálogo final

| Métrica | Valor |
|---|---:|
| SKUs únicos extraídos | 1.027 |
| Produtos `active` (preço + qualidade verificada) | **262** |
| Produtos `draft` com preço (revisar antes de publicar) | **319** |
| Produtos `draft` sem preço (sob consulta / orçamento) | **446** |
| Produtos com imagem do benchmark | **301** |
| Match com preço médio das 2 lojas (avg2) | **45** |
| Match com preço de 1 loja (single) | **217** |

---

## Passo a passo de deploy

### 1. Conta Shopify

1. Crie uma conta em [shopify.com](https://shopify.com), plano **Basic** ou **Shopify**.
2. Em **Settings → Domains**, conecte `minhaprotese.com.br` (compre antes em registro.br se
   ainda não tem). Aponte registros A/CNAME conforme o painel Shopify orienta.
3. Em **Settings → Locations**, anote o **Location ID** do depósito principal — vai ser
   usado pelo script de estoque.
4. Em **Settings → Apps and sales channels → Develop apps**, crie um app privado com os
   escopos `read_products` e `write_inventory`. Gere o **Admin API access token**
   (`shpat_…`).

### 2. Subir o tema

Há duas formas:

**A) Shopify CLI (recomendado)**

```bash
brew install shopify-cli
cd shopify-theme
shopify theme push --store=minhaprotese.myshopify.com --unpublished
```

**B) Pelo admin (ZIP)**

1. Zipe a pasta `shopify-theme/`.
2. Em **Online Store → Themes → Upload theme**, faça upload do .zip.
3. Em **Customize → Theme settings**, ajuste cores, fontes (Lexend e Newsreader já carregadas
   automaticamente), e preencha o número de WhatsApp.
4. Em **Customize → Header/Footer**, conecte o menu principal e os menus do rodapé.

### 3. Importar produtos

1. Em **Products → Import → CSV**, faça upload de `catalog/shopify_products_import.csv`.
2. Os SKUs com preço serão importados como **Active**. SKUs sem preço (a maioria nesta
   primeira passada — pois o catálogo dos fornecedores é tabela de custo, e a precificação
   vem do benchmark) ficam **Draft** até o pipeline de preço completar.
3. As **imagens estão em branco** no CSV — veja "Imagens dos produtos" abaixo.

### 4. Coleções

Crie estas coleções automáticas (regra: Tag igual a…):

| Coleção | Regra |
|---|---|
| Pés e tornozelos | Type contém "Pés" |
| Joelhos | Type contém "Joelhos" |
| Liners e meias | Tags contém "ALPS" OU Type contém "Liner" |
| Encaixes e soquetes | Tags contém "Blumentec" OU "Encaixe" |
| Componentes Ottobock | Vendor é "Ottobock" |
| Componentes Össur | Vendor é "Össur" |
| Componentes Ortho Pauher | Vendor é "Ortho Pauher" |
| Membros superiores | Type contém "Mãos" OU "Bebionic" |

### 5. Calcular preços de revenda

```bash
cd scripts
pip install -r requirements.txt

# (já executado neste pacote)
python extract_skus.py --dir .. --out ../catalog/raw_products.csv

# Coleta preços das duas lojas-benchmark (leva ~8 min)
python scrape_benchmarks.py --out ../catalog/benchmark_prices.csv

# Calcula preço médio com matching fuzzy
python compute_prices.py

# Regera CSV pronto para reimportação no Shopify
python generate_shopify_csv.py
```

Resultado: `catalog/shopify_products_import.csv` atualizado com preços médios. **Reimporte
no Shopify** marcando "Overwrite existing products" — os SKUs casarão pelo handle/SKU.

### 6. Imagens dos produtos

301 produtos já têm `Image Src` preenchido com URL pública dos benchmarks
(lojadoamputado.com.br / lojaortopedica.com.br). Ao importar o CSV, o Shopify baixa essas
imagens automaticamente.

⚠️ **Aviso legal:** essas imagens são, por padrão, de propriedade das lojas-benchmark.
Use-as como placeholder durante o lançamento, mas substitua o quanto antes pela origem
correta para evitar problemas de copyright. Em ordem de preferência:

1. **Media kit do fornecedor** — Össur, Ottobock e outros mantêm pacote oficial de imagens
   para distribuidores autorizados. **Esta é a opção correta para uma loja oficial.**
2. **Fotografia in-house** dos itens em estoque (fundo neutro, luz natural).
3. **Render 3D** — para itens raros ou sem foto disponível.

Para substituir em massa depois: monte uma planilha `sku, image_url` e use a Shopify Admin
API ou app de bulk image upload.

**Especificação do tema**: imagens em 1:1 (1200×1200 ideal), com fundo neutro
(cream `#FAF6F0` casa bem com os cards).

### 7. WhatsApp + IA

**Tudo já está implementado.** Tanto o widget no tema quanto o endpoint serverless da IA.

#### A) Widget no tema
Já integrado em `snippets/whatsapp-floating.liquid` — botão flutuante laranja com chat box.
Em **Online Store → Customize → Theme settings → Contato e atendimento**:
- **Número WhatsApp**: `+5511...` (com DDI).
- **Endpoint do assistente IA**: cole a URL do passo B.

#### B) Endpoint IA — deploy em ~5 minutos

```bash
cd whatsapp-ai
npm install
node scripts/build-catalog.mjs ../catalog/shopify_products_import.csv data/catalog.json
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
vercel --prod
# → copia a URL retornada para o Theme settings
```

A IA já vem **treinada** via system prompt (`lib/system-prompt.js`): voz da marca, regras
de prescrição clínica (não dá), encaminhamento para humano, formato de resposta. Usa
Claude Sonnet 4.6 com prompt caching ativo (custo ~US$ 0,002 por mensagem após cache).

Veja `whatsapp-ai/README.md` para detalhes.

### 8. Estoque integrado

1. Crie uma Google Sheet com aba **Estoque** — use `scripts/inventory-sync/Estoque-template.csv`
   como modelo.
2. Crie service-account no Google Cloud com Sheets API habilitada, compartilhe a planilha.
3. Configure `.env` em `scripts/inventory-sync/` (veja `.env.example`).
4. Agende com cron — `scripts/inventory-sync/README.md` tem o setup exato.

---

## Suporte ao tema

Algumas coisas que o tema espera/aceita:

- **Fontes**: Lexend e Newsreader são carregadas via Google Fonts no `theme.liquid`. Não
  precisa configurar no admin.
- **Eyebrow + H2 italic**: padrão de cabeçalho de seção. Edite no Customize.
- **Metafields opcional**: `product.metafields.specs.table` (tipo Tabela) — se preenchido,
  aparece como tabela de especificações na página do produto.
- **Política de inventário**: produto com estoque zero é exibido mas botão fica
  "Indisponível". Para esconder, configure `Inventory Policy` como `deny` (já é o padrão
  no CSV gerado).

## Custos mensais estimados (referência)

| Item | Valor |
|---|---|
| Shopify Basic | US$ 39 / mês |
| Domínio `.com.br` | ~R$ 40 / ano |
| App de pagamentos (Mercado Pago etc.) | Taxa por transação |
| API IA (quando ligar) | depende do provedor — ~US$ 5–30 / mês para volumes baixos |
| Hosting do endpoint IA | Vercel/Render free tier ou ~US$ 7 / mês |

## Próximos passos sugeridos (em ordem)

1. Subir o tema sem produtos primeiro, garantir que header/footer/hero parecem certos.
2. Importar 20 produtos top como teste, fotografar, finalizar copy.
3. Soltar para um beta fechado (você + protesistas amigos) testarem checkout real.
4. Treinar a IA com perguntas comuns que sua equipe recebe hoje no WhatsApp.
5. Abrir para o público.
