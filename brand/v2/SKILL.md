---
name: minhaprotese-design-skill
description: "Skill de design para criar telas, banners, componentes e peças visuais da minhaprotese.com.br, e-commerce brasileiro de próteses, órteses e produtos de mobilidade."
---

# Skill de Design — minhaprotese.com.br

## Missão da marca

A **minhaprotese.com.br** é uma loja online especializada em **próteses, órteses e produtos de mobilidade**, com uma experiência digital simples, segura e humana.

A marca deve transmitir:

- **mobilidade**
- **autonomia**
- **possibilidades**
- **tecnologia confiável**
- **compra online segura**
- **atendimento humano e especializado**

> Tagline principal: **MOBILIDADE. AUTONOMIA. POSSIBILIDADES.**

## Regra estratégica importante

A minhaprotese.com.br deve ser visual e conceitualmente **totalmente separada da Da Vinci Clinic**.

Não usar:
- linguagem de clínica premium boutique;
- aparência institucional da Da Vinci Clinic;
- dependência visual de verde-água;
- assinatura “Da Vinci”;
- ícones renascentistas, vitruvianos ou referências diretas à marca Da Vinci.

A inspiração pode vir de marcas como Hanger Clinic apenas no sentido de:
- clareza visual;
- confiança em saúde;
- calor humano;
- digital-first;
- mobilidade e potencial humano.

Não copiar símbolo, paleta, tagline ou estrutura visual de nenhuma marca existente.

---

## Identidade visual

### Nome

Usar sempre:

**minhaprotese.com.br**

Preferência de escrita:
- tudo em minúsculas;
- “minhaprotese” em azul-marinho;
- “.com.br” em laranja.

### Símbolo

O símbolo deve sugerir:
- pessoa em movimento;
- caminho;
- apoio;
- autonomia;
- jornada;
- impulso para frente.

Usar formas curvas, fluidas e amigáveis. Evitar símbolos muito médicos, hospitalares ou frios.

### Cores

| Token | Hex | Uso |
|---|---:|---|
| Navy 900 | `#0D1B2A` | Logo, títulos, texto principal, barras institucionais |
| Blue 700 | `#1E5BB8` | Botões primários, links, busca, CTAs |
| Orange 500 | `#F28C28` | `.com.br`, ofertas, detalhes de energia |
| Amber 300 | `#FFC66D` | Apoios suaves, highlights, detalhes humanos |
| Gray 200 | `#E6E9EF` | Bordas, cards, fundos de ícones |
| White 50 | `#F7F8FA` | Fundos claros, seções suaves |

### Tipografia

- **Títulos:** Manrope ExtraBold
- **Subtítulos:** Manrope Medium
- **Texto corrido:** Inter Regular

Exemplo de hierarquia:

```css
h1 {
  font-family: "Manrope", "Inter", sans-serif;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: #0D1B2A;
}

p {
  font-family: "Inter", sans-serif;
  color: #46556D;
  line-height: 1.6;
}
```

---

## Tom de comunicação

A marca deve falar de forma:

- clara;
- acolhedora;
- simples;
- confiável;
- segura;
- sem excesso de jargão médico;
- orientada à autonomia do cliente.

Evitar:
- tom frio hospitalar;
- promessas exageradas;
- linguagem que pareça milagre;
- “coach” ou motivacional demais.

Frases úteis:

- **Tecnologia e cuidado para cada passo da sua jornada.**
- **Encontre as melhores soluções em mobilidade.**
- **Próteses, órteses e produtos selecionados para sua liberdade de movimento.**
- **Compra segura, atendimento especializado e entrega para todo o Brasil.**
- **Sua jornada começa aqui.**
- **Conteúdo que transforma vidas.**

---

## Componentes de interface

### Header desktop

Estrutura:

1. barra superior de confiança;
2. logo à esquerda;
3. campo de busca central;
4. login e carrinho à direita;
5. menu de categorias.

Texto da barra superior:

- **Compra segura**
- **Atendimento especializado**
- **Entrega para todo o Brasil**

Menu principal:

- Próteses
- Órteses
- Mobilidade
- Acessórios
- Marcas
- Ofertas

### Campo de busca

Placeholder:

**Buscar produtos...**

Estilo:
- fundo branco;
- borda `#E6E9EF`;
- botão circular ou arredondado azul `#1E5BB8`;
- ícone de lupa branco.

### Botão primário

Rótulos principais:

- **Ver produtos**
- **Comprar agora**
- **Adicionar ao carrinho**

Estilo:

```css
background: #1E5BB8;
color: #FFFFFF;
border-radius: 999px;
height: 44px;
padding: 0 22px;
font-weight: 700;
```

### Botão / badge de oferta

Exemplo:

**20% OFF**

Estilo:

```css
background: #F28C28;
color: #FFFFFF;
border-radius: 8px;
font-size: 12px;
font-weight: 800;
```

### Cards de categoria

Categorias:

1. **Próteses**  
   Subtexto: Desempenho e liberdade

2. **Órteses**  
   Subtexto: Suporte e estabilidade

3. **Mobilidade**  
   Subtexto: Mais autonomia no dia a dia

4. **Acessórios**  
   Subtexto: Conforto e praticidade

Estilo:
- card branco;
- borda clara;
- canto arredondado;
- sombra suave;
- imagem pequena do produto;
- seta discreta em azul.

### Cards de confiança

Usar com ícones lineares simples:

- **Pagamento seguro**  
  Ambiente 100% protegido

- **Parcele em até 12x**  
  Condições facilitadas

- **Entrega rápida**  
  Para todo o Brasil

- **Troca fácil**  
  Mais tranquilidade para você

- **Atendimento especializado**  
  Equipe pronta para ajudar

---

## Hero da homepage

### Headline

**Tecnologia e cuidado para cada passo da sua jornada.**

### Subheadline

**Próteses, órteses e produtos de mobilidade com qualidade, conforto e confiança.**

### CTA

**Ver produtos**

### Imagem sugerida

Pessoa caminhando ou correndo com prótese, preferencialmente em ambiente externo, luz natural, sensação de autonomia e movimento. Evitar estética hospitalar.

Layout:
- texto à esquerda;
- imagem à direita;
- fundo claro;
- CTA azul;
- bastante respiro visual.

---

## Home mobile

Hero mobile:

**Encontre as melhores soluções em mobilidade**

Texto de apoio:

**Próteses, órteses e produtos selecionados para sua liberdade de movimento.**

Botão:

**Ver produtos**

Cards de confiança no mobile:

- Compra segura
- Atendimento especializado
- Entrega para todo o Brasil

Menu inferior mobile:

- Início
- Categorias
- Conta
- Ajuda
- Carrinho

---

## Produto / card de e-commerce

Exemplo de card:

**Pé Protético Dinâmico Carbono**

Descrição:

**Leveza, retorno de energia e desempenho superior.**

Preço:

**R$ 4.290,00**

Parcelamento:

**ou 12x de R$ 357,50**

Badge:

**20% OFF**

Avaliação:

**★★★★★ (28 avaliações)**

Benefícios no rodapé do card:

- Envio rápido para todo o Brasil
- Parcelamento em até 12x
- Compra 100% segura

---

## Embalagem

A embalagem deve ter:
- papelão kraft;
- curva grande em azul-marinho;
- símbolo e logo da marca;
- detalhe laranja;
- frase curta de acolhimento.

Frases:

- **Sua jornada começa aqui.**
- **Conteúdo que transforma vidas.**

---

## Diretrizes para novas telas e banners

Ao criar qualquer nova tela ou banner:

1. usar fundo branco ou off-white;
2. manter bastante espaço em branco;
3. usar navy para títulos;
4. usar azul para CTAs;
5. usar laranja apenas como acento;
6. usar imagens humanas em movimento;
7. evitar tom hospitalar;
8. priorizar clareza de compra;
9. sempre mostrar confiança, segurança e atendimento especializado;
10. manter a marca independente da Da Vinci Clinic.

---

## Arquivos de referência neste pacote

Use os arquivos da pasta `assets/` como referência visual:

- `minhaprotese_brand_board_full.png`
- `logo_principal_crop.png`
- `icone_app_crop.png`
- `site_home_desktop_mockup.png`
- `site_hero_banner_crop.png`
- `app_mobile_home_mockup.png`
- `embalagem_entrega_mockup.png`
- `produto_card_mockup.png`
- `minhaprotese_logo.svg`
- `minhaprotese_icon.svg`

---

## Prompt base para Claude Design

Crie uma tela ou peça visual para a marca **minhaprotese.com.br**, seguindo fielmente esta identidade visual: e-commerce brasileiro de próteses, órteses e mobilidade; visual limpo, confiável, humano, digital-first, com paleta navy `#0D1B2A`, azul `#1E5BB8`, laranja `#F28C28`, cinzas claros e fundo branco. Use Manrope para títulos e Inter para texto. A marca deve ser totalmente independente da Da Vinci Clinic. Priorize compra segura, atendimento especializado, entrega para todo o Brasil, autonomia e mobilidade. Use botões arredondados, cards claros, ícones lineares e imagens de pessoas em movimento com próteses.
