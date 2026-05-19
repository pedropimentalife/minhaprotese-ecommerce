# Briefing para Claude Design — minha prótese

> Cole este arquivo inteiro como prompt no Claude Design (claude.ai/new no modo design ou Artifacts). Em uma só passada ele deve produzir o site completo, bonito e funcional.

---

## O que construir

Um **e-commerce em página única (SPA)** ou app React polido para **minha prótese**, e-commerce brasileiro de componentes para prótese e órtese de membros (Össur, Ottobock, Blumentec, ALPS, Polior, ProKinetics, Ortho Pauher, Ethnos). Catálogo de **1.027 SKUs**, com **262 produtos com preço e foto reais**. Checkout via **WhatsApp** (modelo comum no varejo brasileiro). Chat IA flutuante com respostas inteligentes sobre o catálogo.

Stack sugerida: **React + Tailwind + Lucide icons**. Use componentes shadcn/ui onde fizer sentido (Card, Sheet para o carrinho, Dialog para o chat, etc.). Imagens já hospedadas em CDN — endereços reais nas amostras abaixo.

---

## A marca — minha prótese

**Posicionamento**: loja boutique com método clínico, não marketplace genérico. Por trás do catálogo existe gente que entende do assunto, atende, orienta e acompanha. Curadoria técnica acessível.

**Público**: protesistas, clínicas, pacientes amputados, famílias (filhos/cuidadores comprando para os pais).

**Voz**:
- Português do Brasil, sempre.
- Calma, específica, conversacional. *"Tire suas dúvidas com nossa equipe."* não *"Compre já!"*
- **Nunca exclamações.** Sem clichês de marketing médico ("transforme sua vida", "soluções inovadoras", "o melhor").
- Itálico em uma palavra carrega o calor: *seu ritmo*, *sua prótese*, *no tempo que faz sentido pra você*.
- Números concretos: *"+1.200 SKUs em catálogo"*, *"entrega em 3 dias úteis para SP"*. Nunca "o maior catálogo do Brasil".

---

## Logo (use este SVG inline em todas as ocorrências)

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 120" aria-label="minha prótese">
  <g transform="translate(0,8)">
    <path d="M14 84 A 50 50 0 0 1 96 30" fill="none" stroke="#14B4B4" stroke-width="6" stroke-linecap="round"/>
    <line x1="58" y1="22" x2="92" y2="60" stroke="#1F262B" stroke-width="10" stroke-linecap="round"/>
    <line x1="92" y1="60" x2="76" y2="100" stroke="#1F262B" stroke-width="10" stroke-linecap="round"/>
    <circle cx="92" cy="60" r="9" fill="#FAF6F0" stroke="#14B4B4" stroke-width="4"/>
    <circle cx="92" cy="60" r="2.5" fill="#F09020"/>
  </g>
  <g transform="translate(130,72)" font-family="Lexend, sans-serif" font-weight="600">
    <text x="0" y="0" font-size="44" letter-spacing="-1.2" fill="#1F262B">minha</text>
    <circle cx="148" cy="-12" r="4.5" fill="#F09020"/>
    <text x="164" y="0" font-size="44" letter-spacing="-1.2" fill="#1F262B">prótese</text>
  </g>
</svg>
```

Em fundo escuro: troque `#1F262B` por `#FAF6F0` no wordmark e nos segmentos, e o stroke do arco/pivô por `#46C4C4`. Mantenha o ponto laranja `#F09020` sempre — é DNA da marca.

---

## Tokens de design (não troque os valores — copiar exatamente)

```css
:root {
  /* Teal — primária */
  --teal-50:  #E6F7F7;
  --teal-100: #C7EBEB;
  --teal-300: #7FD6D6;
  --teal-400: #46C4C4;
  --teal-500: #14B4B4;   /* CTAs, links, ênfase em itálico */
  --teal-600: #0E9B9B;   /* hover */
  --teal-700: #087272;   /* pressed, deep accent */

  /* Laranja — apenas para acento direcionado: ponto da marca, WhatsApp CTA, 1 acento editorial por seção */
  --orange-100: #FFE0B2;
  --orange-300: #FFB759;  /* o ÚNICO momento de calor sobre fundo escuro: 1 número em hero */
  --orange-500: #F09020;
  --orange-600: #D67B10;

  /* Slate */
  --slate-200: #E5E7E9;
  --slate-300: #CBD0D4;
  --slate-500: #7C858D;  /* metadados */
  --slate-600: #525B62;  /* lead, parágrafos */
  --slate-700: #3B4248;  /* corpo denso */

  /* Neutros quentes — superfícies */
  --cream:      #FAF6F0;  /* fundo macio de seção */
  --sand:       #F3EAD8;  /* alternativa de fundo */
  --charcoal:   #2B333A;  /* hero, depoimento */
  --charcoal-d: #1F262B;
  --ink:        #14181C;  /* footer, headlines */
}
```

**Tipografia (Google Fonts):**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&family=Newsreader:ital,wght@1,400;1,500&family=JetBrains+Mono:wght@400;500&display=swap">
```

| Papel | Família | Tamanho | Peso | Tracking |
|---|---|---|---|---|
| H1 hero | Lexend | clamp(40px, 6vw, 64px) | 700 | -0.035em |
| H2 seção | Lexend | clamp(32px, 4.2vw, 48px) | 700 | -0.025em |
| H3 card | Lexend | clamp(20px, 2vw, 24px) | 700 | -0.015em |
| Lead | Lexend | clamp(17px, 1.6vw, 19px) | 400 | 0 |
| Body | Lexend | 15-16px | 400 | 0 |
| **Eyebrow** (acima do H2) | Lexend | 12px | 700 | 0.22em UPPERCASE — cor `--teal-600` |
| **Ênfase italic** | Newsreader italic | herda do título | 500 | — cor `--teal-500` |
| Mono (SKU, telefone) | JetBrains Mono | 13px | 400 | 0.01em |

**Espaçamento (base 8px)**: seções com 104px vertical desktop / 64px mobile · padding horizontal página 48px desktop / 24px mobile · max-width 1320px.

**Raios**: cards 8px, botões 10px, pills 999px, avatar 50%.

**Sombras**:
- Botão teal: `0 8px 20px rgba(20,180,180,0.22)`
- Botão laranja (WhatsApp): `0 8px 20px rgba(240,144,32,0.24)`
- Card flutuante: `0 24px 56px rgba(0,0,0,0.12)`
- Foto hero: `0 40px 80px rgba(0,0,0,0.35)`

**Movimento**: easing padrão `cubic-bezier(0.2, 0.7, 0.2, 1)` em 200ms. Hover lift CTA: `translateY(-1px)`. Pressed: `scale(0.98)`.

---

## A regra-mãe do design — hierarquia de cor

Esta é a regra que mais importa. Se quebrar, fica feio:

- **Teal `#14B4B4`** é primária. CTAs, links ativos, eyebrows, palavras em itálico. ~70% dos acentos.
- **Laranja `#F09020`** é acento direcionado, NUNCA superfície. Três usos válidos:
  1. O ponto entre "minha" e "prótese" no logo
  2. Botão flutuante de WhatsApp (laranja é o "fale conosco")
  3. UM acento editorial por seção (ex.: número em laranja `--orange-300` sobre hero charcoal)
- **Charcoal `#2B333A`** é peso emocional. Hero, depoimento, footer. **Nunca preto puro.**
- **Cream `#FAF6F0` / Sand `#F3EAD8`** são superfícies macias de seção. **Nunca cinza frio.**

**Anti-padrões que tornaram a versão anterior feia — não cometa:**
- ❌ Laranja em background de seção ou como CTA primário no meio do site
- ❌ Cards "flat" sem hierarquia visual — produto precisa ter card com borda sutil, imagem com fundo cream, hover com lift
- ❌ Densidade exagerada — produto card precisa de respiro (padding mínimo 20px)
- ❌ Texto centralizado em parágrafos longos
- ❌ Headlines sem eyebrow acima
- ❌ Headlines sem palavra em itálico em Newsreader
- ❌ Tudo cinza médio — use cream/sand para variar superfícies de seção
- ❌ Gradiente teal→laranja (as duas cores não se combinam em gradiente)
- ❌ Botões com border-radius redondo demais (mais que 12px) ou quadrado demais (menos que 6px) — use 10px

---

## Padrão de cabeçalho de seção (use em TODA seção)

```
[EYEBROW EM TEAL · uppercase 0.22em]
H2 com uma palavra em itálico em teal.
Lead em 19px slate-600, no máximo 60 caracteres por linha.
```

Exemplos prontos:

| Eyebrow | H2 | Lead |
|---|---|---|
| Catálogo | Encontre o que *você precisa.* | Organizamos por tipo de componente, marca e nível de mobilidade. |
| Mais procurados | Os componentes que *saem mais.* | Curadoria semanal dos produtos com maior demanda. |
| Por que comprar aqui | Mais que um catálogo — *uma escolha bem feita.* | Atendimento técnico, curadoria das melhores marcas e logística confiável. |
| Quem compra aqui | Os clientes *agradecem.* | Pacientes, protesistas e familiares contam por que voltaram. |
| Como funciona | Da escolha ao *envio.* | Três passos simples — sem burocracia médica desnecessária. |

---

## Telas a entregar

### 1. Home

Componha nesta ordem:

1. **Header sticky** com backdrop blur — logo à esquerda, menu central (Catálogo · Pés · Joelhos · Liners · Membros superiores · Marcas), à direita ícones (busca, conta, carrinho com badge laranja se >0).

2. **Hero (fundo charcoal `#2B333A`)** com grid 1.1fr / 0.9fr:
   - Esquerda: eyebrow teal-300 → H1 "Pra você caminhar *no seu ritmo.*" → lead → dois CTAs (primário teal "Ver catálogo", secundário com border branca semi-transparente "Falar no WhatsApp") → linha de 3 stats (1.027 SKUs / 8 marcas / 3 dias).
   - Direita: foto warm — paciente real usando prótese, mão de protesista, bancada de oficina. NUNCA stock médico estéril. Borda 4px arredondada, sombra forte.
   - Use 1 número da stats em laranja `--orange-300` para warmth — apenas 1.

3. **Categorias destaque (fundo cream)**: grid de 6 cards. Cada card é uma categoria com título e contagem. Hover: lift sutil. Sem ícones — texto é suficiente.

4. **Produtos em destaque (fundo branco)**: grid de 8 cards. Use os 18 produtos reais listados em "AMOSTRA DE PRODUTOS" abaixo. Card = imagem 1:1 com fundo cream → marca em uppercase teal-600 com tracking → título 2 linhas → SKU em mono → preço em destaque. Hover: borda passa a teal-300, lift -2px.

5. **Pilares de valor (fundo sand)**: 3 colunas com ícone outline teal sobre círculo teal-50, título, parágrafo. Pilares: "Garantia de origem" (distribuidor autorizado), "Atendimento que entende" (equipe técnica), "Entrega rápida" (24h após confirmação).

6. **Depoimento (fundo charcoal)**: aspas grandes em Newsreader italic teal-300, frase centralizada com max 22 caracteres por linha, atribuição embaixo. Frase: *"Cheguei perdido, sem saber por onde começar. A equipe me explicou cada componente, escolheu o ideal para o meu pai e ainda acompanhou a entrega."* — Renato S. · Filho de paciente · São Paulo.

7. **Footer (fundo ink `#14181C`)**: grid 1.4 / 1 / 1 / 1. Logo on-dark + descrição curta + 3 colunas (Categorias / Atendimento / Contato). Bottom bar com © · CNPJ · políticas.

### 2. Catálogo / Coleção (lista filtrada)

Grid de 2 colunas: sidebar 260px com filtros + grid de produtos.

- Header da página com eyebrow "Catálogo" + H1 com nome da coleção + lead "1.027 produtos".
- Sidebar com facets: Marca (checkboxes com contagem), Faixa de preço (radio), Categoria (checkboxes), Disponibilidade.
- Acima da grid: contador "1.027 produtos" e dropdown de ordenação.
- Grid 4 colunas desktop, 2 mobile, com gap 24px.
- Paginação: 24 por página, paginação numerada simples no rodapé.

### 3. Página de produto

Grid 1.1fr / 1fr:

**Esquerda — galeria**:
- Imagem principal 1:1 com fundo cream, padding 8%.
- Thumbnails embaixo (72px) se houver mais de uma imagem.

**Direita — info**:
- Marca em uppercase teal-600 + tracking 0.22em
- H1 título com letter-spacing -0.015em
- SKU em mono pequeno cinza
- Preço grande 36px peso 700 (se "compare at price" mais alto, mostra riscado)
- Badges: "✓ Em estoque" (pill teal-50) · "Entrega 3 dias úteis SP" (pill cream)
- Quantidade (stepper) + botão "Adicionar ao carrinho" (primário teal)
- Botão de bloco "Tirar dúvida sobre este produto pelo WhatsApp" (laranja, ícone WhatsApp)
- Descrição com primeiro parágrafo + "ver mais"
- Tabela de especificações em 2 colunas (dt cinza, dd dark): Marca, Nível de mobilidade, Tipo, Material, Embalagem, Origem, Garantia.
- Seção "Da mesma marca" abaixo — 4 produtos relacionados.

### 4. Carrinho (drawer/sheet à direita ou página)

- Linhas com thumb 96px + título + SKU + stepper de qty + subtotal + remover.
- Sidebar de resumo: subtotal, desconto se houver, total grande.
- CTA primário: "Fechar pedido pelo WhatsApp" — botão laranja largo. Ao clicar, monta mensagem com itens, SKUs, quantidades, total, e abre `wa.me/55XXXXXXXXXXX?text=...`.

### 5. Busca

- Campo grande no topo, foco automático.
- Abaixo: contador "N resultados para '...'" e grid normal de produtos.
- Estado vazio: ilustração suave + "Sem resultados. Tente outra palavra — ou nos chame no WhatsApp."

---

## Componente: botão flutuante WhatsApp + chat IA

Sempre presente, canto inferior direito (24px da borda):

- **Botão fechado**: pill laranja `--orange-500`, ícone WhatsApp branco + "Tirar dúvida" em peso 600. Box-shadow `0 12px 28px rgba(240,144,32,0.32)`. Hover: lift -2px.
- **Painel aberto** (360px largura, max 70vh):
  - Header charcoal com avatar circular teal + "Atendimento minha prótese" + "Em média respondemos em 2 min" + X de fechar.
  - Área de mensagens (fundo cream), bubbles arredondados 12px. Entrada (do bot) é branca com border slate-200. Saída (do usuário) é teal-500 com texto branco. Em mensagens do bot, palavras em *itálico* renderizam em Newsreader italic teal-600.
  - Input + botão laranja "Enviar".
  - Embaixo, link de bloco "Falar no WhatsApp agora" que monta a mensagem do usuário e abre wa.me direto.

Use respostas canned na demonstração — quando o usuário escreve "liner", o bot responde sobre liners do catálogo; "joelho", sobre joelhos; "preço", explica como funciona o orçamento; default, encaminha pro WhatsApp humano.

---

## AMOSTRA DE PRODUTOS (use estes 18 nos cards reais — preços médios das duas lojas-benchmark e imagens reais hospedadas em CDN)

```json
[
  { "vendor": "Össur", "sku": "ICEROSS", "title": "Liner Transtibial Iceross Comfort Locking", "price": 3766.63, "image": "https://cdn.awsli.com.br/800x800/1895/1895256/produto/96074893/b25f0b5263.jpg", "type": "Liners" },
  { "vendor": "Össur", "sku": "SISTEMAS", "title": "Meia Preta para Pé em Fibra de Carbono", "price": 226.52, "image": "https://cdn.awsli.com.br/800x800/1895/1895256/produto/364063438/meia-preta-para-pe-em-fibra-de-carbono-ossur-5eifhcrmpw.png", "type": "Acessórios" },
  { "vendor": "Ottobock", "sku": "6Y13", "title": "Trava Shuttle Lock para Prótese 6A20", "price": 2745.57, "image": "https://cdn.awsli.com.br/800x800/1895/1895256/produto/238899577/shutte-lock-6a-20-f9msdxt3bo.jpg", "type": "Componentes" },
  { "vendor": "Ottobock", "sku": "3R67", "title": "Capa Joelho 3R15", "price": 446.63, "image": "https://cdn.awsli.com.br/800x800/1895/1895256/produto/361473129/fotos-mercado-livre--14--6ugwoi7if6.png", "type": "Capas e cosméticos" },
  { "vendor": "Blumentec", "sku": "P352-6598", "title": "Liner Alpha Element Willowwood", "price": 1914.48, "image": "https://cdn.awsli.com.br/800x800/1895/1895256/produto/400705679/b3ddf90626644191b63d204debb47496-h6elgg826h.png", "type": "Liners" },
  { "vendor": "Blumentec", "sku": "S494-1143", "title": "Liner Alpha Classic 9 mm Transtibial sem conexão", "price": 2920.09, "image": "https://cdn.awsli.com.br/800x800/1895/1895256/produto/170069827/0cb84b9f8c.jpg", "type": "Liners" },
  { "vendor": "ALPS", "sku": "32-36", "title": "Liner em Gel com Pino Extreme AKDT", "price": 1990.00, "image": "https://images.tcdn.com.br/img/img_prod/1416110/liner_em_gel_com_pino_extreme_akdt_alps_1_20250923162307_c21ab832cb1d.jpg", "type": "Liners" },
  { "vendor": "ALPS", "sku": "120-135", "title": "Liner Transtibial com Anéis Smart Seal", "price": 2605.49, "image": "https://cdn.awsli.com.br/800x800/1895/1895256/produto/108267891/d72b5f0b90.jpg", "type": "Liners" },
  { "vendor": "ProKinetics", "sku": "1002-A4L", "title": "Joelheira de Vedação 4W80 Supreme", "price": 850.00, "image": "https://images.tcdn.com.br/img/img_prod/1416110/joelheira_de_vedacao_4w80_supreme_457_1_38407dd5154209e92f322bd8056a16ef.jpg", "type": "Joelheiras" },
  { "vendor": "Polior", "sku": "MO-05AI", "title": "Joelheira de Copolímero", "price": 390.00, "image": "https://images.tcdn.com.br/img/img_prod/1416110/joelheira_de_copolimero_polior_165_1_21c2ba052f5f5e7cc452de2f4098f904.jpg", "type": "Joelheiras" },
  { "vendor": "Polior", "sku": "MO-06AI", "title": "Adaptador Modular Tubular Reto com Abraçadeira", "price": 481.79, "image": "https://cdn.awsli.com.br/800x800/1895/1895256/produto/302338770/adaptador-modular-tubular-reto-com-abra-adeira-mo-06ai-polior-v58o36g0ml.jpg", "type": "Adaptadores" },
  { "vendor": "Polior", "sku": "MO-08AI", "title": "Adaptador Modular Tubular Reto Linha Infantil", "price": 629.81, "image": "https://cdn.awsli.com.br/800x800/1895/1895256/produto/302337681/adaptador-modular-tubular-reto---linha-infantil---mo-08ai-polior-kbkferkz4o.png", "type": "Adaptadores" }
]
```

Para os números totais da home, use:
- 1.027 SKUs no catálogo
- 262 com pronta-entrega
- 8 marcas curadas: Össur, Ottobock, Blumentec, ALPS, Dilepé, Polior, Ethnos, ProKinetics
- 397 produtos com preço médio das duas lojas-benchmark (lojadoamputado + lojaortopedica)

---

## Categorias para a home (6 cards)

| Título | Contagem aproximada |
|---|---|
| Pés e tornozelos | 120+ produtos |
| Joelhos | 85+ produtos |
| Encaixes e soquetes | 246 produtos |
| Liners e meias | 121 produtos |
| Adaptadores e tubos | 132 produtos |
| Membros superiores | 40+ produtos |

---

## Padrões de interação

- **Cart**: persiste em localStorage. Atualiza badge no header em tempo real. Checkout monta string com os itens e abre `https://wa.me/5511XXXXXXXXX?text=<encoded>` em nova aba.
- **Adicionar ao carrinho**: o botão muda para "Adicionado ✓" por 1.6s, depois volta. Não navega.
- **Hover em product card**: borda passa de slate-200 para teal-300, transform `translateY(-2px)`, sombra cresce.
- **Skip link a11y**: primeiro elemento do body, escondido até receber foco.
- **Foco visível**: outline teal-500 com offset 2px em todos os elementos focáveis.

---

## Conteúdo de copy pronto

**Hero**:
> EYEBROW: Componentes para prótese e órtese
> H1: Pra você caminhar *no seu ritmo.*
> Lead: Encaixes, joelhos, pés, soquetes, liners e acessórios das principais marcas — com curadoria técnica e atendimento que entende do que você precisa.
> CTA1: Ver catálogo
> CTA2: Falar no WhatsApp

**Categorias section**:
> EYEBROW: Catálogo
> H2: Encontre o que *você precisa.*
> Lead: Organizamos o catálogo por tipo de componente, marca e nível de mobilidade — pra você chegar rápido no que importa.

**Produtos em destaque**:
> EYEBROW: Em estoque agora
> H2: Componentes que *saem mais.*
> Lead: Curadoria semanal dos produtos com maior demanda dos nossos clientes.

**Pilares**:
> EYEBROW: Por que comprar aqui
> H2: Mais que um catálogo — *uma escolha bem feita.*
> Lead: Atendimento técnico, curadoria das melhores marcas e logística confiável para todo o Brasil.
> Pilar 1 (ícone shield-check): "Garantia de origem" — "Trabalhamos só com distribuidores autorizados — Össur, Ottobock, Blumentec, Ortho Pauher, ALPS, Dilepé, Polior, Ethnos e ProKinetics."
> Pilar 2 (ícone headphones): "Atendimento que entende" — "Equipe técnica que conversa com você ou seu protesista para escolher o componente certo."
> Pilar 3 (ícone truck): "Entrega rápida" — "Pronta-entrega para os SKUs em estoque. Envio em até 24h após confirmação do pagamento."

**Footer**:
> Tagline: Componentes de prótese e órtese com curadoria técnica. Atendimento consultivo de quem entende do assunto.
> Colunas:
> – Categorias: Pés e tornozelos · Joelhos · Liners · Encaixes · Adaptadores · Ver tudo
> – Atendimento: Como comprar · Frete e prazos · Trocas e devoluções · Notas fiscais
> – Contato: +55 11 0000-0000 · contato@minhaprotese.com.br · São Paulo · SP
> Bottom: © 2026 minha prótese · CNPJ — preencher · Privacidade · Termos · Trocas

---

## Iconografia

Estilo outline 1.75px, line caps e joins arredondados, sem fill. Use Lucide React (`lucide-react`) — ícones específicos: `Search`, `User`, `ShoppingBag`, `MessageCircle` (WhatsApp), `ShieldCheck`, `Headphones`, `Truck`, `ChevronDown`, `ChevronRight`, `Plus`, `Minus`, `Check`, `X`. Sobre fundo: círculo `--teal-50` 56px com ícone teal-600 dentro.

---

## Photography direction (quando substituir as placeholders das fotos hero)

- Luz natural quente, golden hour.
- Pacientes reais e profissionais reais. Mãos de protesista no trabalho. Bancada de oficina com componentes. Detalhes técnicos.
- **Nunca** stock médico genérico (jaleco branco com clipboard, gradiente azul estéril, prótese-robô futurista).
- Inclua idosos na rotação — não é só atleta.
- Cor de skin tone diversificada — público brasileiro real.

Para o hero usar placeholder atual: gradiente charcoal → teal-700 com o símbolo grande do logo em silhueta sobre, opacity 0.85.

---

## Saída esperada

- **Um único arquivo React** (com componentes em arquivos separados se ficar grande) usando Tailwind para estilo.
- Tokens de cor no `tailwind.config.js` em `theme.extend.colors` (mapeando `teal.500` para `#14B4B4`, `orange.500` para `#F09020`, etc.) — **não use os defaults do Tailwind**.
- Lexend e Newsreader carregadas via CSS no `<head>` ou Tailwind plugin.
- Responsivo de 360px até 1440px+.
- Acessível: foco visível em tudo, contraste mínimo AA, alt em todas as imagens, ARIA labels nos botões de ícone.
- Estado vazio: carrinho vazio, busca sem resultado, coleção sem produtos.

---

## Importante — o que NÃO fazer

- Não use Tailwind defaults (azul-500, etc.). Use os tokens definidos acima.
- Não inclua placeholders "Lorem ipsum". Use o copy real que está neste briefing.
- Não invente categorias além das 6 listadas.
- Não use ícones com fill. Apenas outline 1.75px.
- Não use sombra colorida em card de produto (apenas teal nos botões primários e laranja no WhatsApp).
- Não centralize parágrafos longos. Headlines podem ser centralizadas; corpo, à esquerda.
- Não use animações pesadas — só transição 200ms em hover/click.
- Não use modo escuro como default — esta é uma loja com persona acolhedora, fundo claro com seções alternadas (cream, sand, charcoal apenas em hero/depoimento/footer).
