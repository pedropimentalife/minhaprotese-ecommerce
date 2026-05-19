# Minha Prótese — Design Tokens

Fonte canônica para implementação no tema Shopify (`shopify-theme/assets/base.css`).

## Cores

### Teal (primária)
| Token | Hex |
|---|---|
| `--brand-teal-50`  | `#E6F7F7` |
| `--brand-teal-100` | `#C7EBEB` |
| `--brand-teal-300` | `#7FD6D6` |
| `--brand-teal-400` | `#46C4C4` |
| `--brand-teal-500` | `#14B4B4` |
| `--brand-teal-600` | `#0E9B9B` |
| `--brand-teal-700` | `#087272` |

### Laranja (acento direcionado)
| Token | Hex |
|---|---|
| `--brand-orange-100` | `#FFE0B2` |
| `--brand-orange-300` | `#FFB759` |
| `--brand-orange-500` | `#F09020` |
| `--brand-orange-600` | `#D67B10` |
| `--brand-orange-700` | `#A85E08` |

### Neutros / superfícies
| Token | Hex |
|---|---|
| `--brand-slate-200` | `#E5E7E9` |
| `--brand-slate-300` | `#CBD0D4` |
| `--brand-slate-500` | `#7C858D` |
| `--brand-slate-600` | `#525B62` |
| `--brand-slate-700` | `#3B4248` |
| `--warm-cream` | `#FAF6F0` |
| `--warm-sand` | `#F3EAD8` |
| `--warm-charcoal` | `#2B333A` |
| `--warm-charcoal-d` | `#1F262B` |
| `--warm-ink` | `#14181C` |

### Semânticas
- Sucesso: `#1F9D55` / soft `#E6F6EC`
- Atenção: `var(--brand-orange-500)` / soft `#FFF4E6`
- Erro: `#D64545` / soft `#FBE9E9`

## Tipografia
- Display + corpo: **Lexend** 400/500/600/700
- Itálico editorial: **Newsreader** italic 400/500
- Mono: **JetBrains Mono** (metadados)

| Papel | Tamanho | Peso | Tracking | Line-height |
|---|---|---|---|---|
| H1 hero | 64-84px | 700 | -0.035em | 0.98 |
| H2 seção | 40-48px | 700 | -0.025em | 1.08 |
| H3 card | 22-24px | 700 | -0.015em | 1.15 |
| Lead | 18-19px | 400 | 0 | 1.6 |
| Body | 15-16px | 400 | 0 | 1.65 |
| Eyebrow | 12px | 700 | 0.22em uppercase | 1.2 |
| UI button | 14px | 600 | 0.005em | 1 |

## Espaçamento (base 8px)
- xs 4 / sm 8 / md 16 / lg 24-32 / xl 48-72
- Seção: 104px vertical desktop / 64px mobile
- Página: 48px horizontal desktop / 24px mobile
- Max-w: 1280-1320px

## Radii
- sm 4 / md 8 / btn 10 / pill 999 / full 50%

## Sombras
- Botão teal: `0 8px 20px rgba(20,180,180,0.22)`
- Botão laranja (WhatsApp): `0 8px 20px rgba(240,144,32,0.24)`
- Card flutuante: `0 24px 56px rgba(0,0,0,0.32)`

## Movimento
- Easing padrão: `cubic-bezier(0.2, 0.7, 0.2, 1)` 200ms
- Hover lift CTA: `translateY(-1px)`
- Press: `scale(0.98)`
