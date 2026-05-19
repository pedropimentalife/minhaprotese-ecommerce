# Qualidade dos dados extraídos

## Estado atual

Total: **1.027 SKUs** únicos extraídos de 13 PDFs de fornecedores (após limpeza de nomes).

| Fornecedor | SKUs extraídos |
|---|---:|
| Ottobock | 301 |
| Blumentec | 246 |
| Polior | 132 |
| ALPS | 121 |
| ProKinetics | 120 |
| Ortho Pauher | 59 |
| Ethnos | 27 |
| Össur | 21 |

**Pipeline de precificação executado.** Resultado:

| Confiança | Qtd. | O que é |
|---|---:|---|
| `avg2` | 18 | Match em ambas as lojas, preços próximos (diferença <3x) — preço = média |
| `avg2-suspect` | 40 | Match em ambas, mas preços muito divergentes — provável mismatch, marcado para revisão |
| `single` | 198 | Match em apenas uma loja — usado preço da loja única |
| `pdf-only` | 326 | Sem match em benchmark — usado preço do PDF do fornecedor (provável tabela de custo) |
| `none` | 445 | Sem preço — fica em Draft |

**Resultado final no CSV Shopify:**
- **216 produtos como `active`** (preço de mercado validado).
- **811 em `draft`** dos quais 366 têm preço mas tag `revisar-preco`.

## Qualidade conhecida

### O que está bom
- SKUs (códigos) — extraídos com alta precisão; padrão regex cobre os formatos de cada
  fabricante (`6Y82=L` Ottobock, `4W9000-06` ProKinetics, `H350-6397` Blumentec, etc.)
- Fornecedor identificado corretamente em 100% dos casos.
- Deduplicação por (vendor, sku) elimina linhas repetidas entre páginas.

### O que precisa de revisão manual
1. **Nomes truncados** — o PDF tem linhas multi-coluna; o extrator pega só a linha onde
   bate o SKU. Exemplo:
   `-...-H Liner SUPREME TT 6 mm com conex, revest. bege (un) 1.602,00`
   O início "-...-H" é resíduo da coluna anterior. Solução: revisar nomes top-50 manualmente
   ou aplicar pós-processamento (corte os primeiros N caracteres antes do primeiro maiúsculo).

2. **Descrições mínimas** — Hoje `description` = `name`. Recomendo enriquecer manualmente
   para os top 100 produtos: parágrafo de 2-3 frases descrevendo uso, indicação clínica
   (sem fazer prescrição) e características técnicas.

3. **Categorização** — O CSV gerado define `Product Category` e `Type` por fornecedor via
   heurística. Revisar manualmente em `generate_shopify_csv.py:VENDOR_TO_TYPE_HINT`.

### Filtro de revisão manual no admin Shopify

Depois de importar o CSV, no admin Shopify você pode filtrar produtos para revisão
com o filtro de tag:

- `revisar-preco` → 366 SKUs com preço gerado mas confiança baixa. Revise um por um
  antes de mudar para `Active`. Compare contra o preço médio das duas lojas-benchmark
  manualmente quando o match automático errou.

## Como melhorar a extração

Se quiser reextrair com mais qualidade, ajustes possíveis:

1. **Parsers específicos por fornecedor** — `extract_skus.py:PARSERS` tem hooks. Cada
   fornecedor tem layout próprio (Ortho Pauher é tabela com cabeçalho, Ossur tem grid
   de catálogo). Adicione um `parse_<fornecedor>` para extração mais limpa.

2. **OCR para PDFs de imagem** — alguns catálogos (Catálogo Componentes Alps/Dilepé, 40MB)
   são PDFs escaneados. pdfplumber só extrai texto digital. Para esses, rode primeiro
   com `ocrmypdf`:
   ```bash
   brew install ocrmypdf
   ocrmypdf --skip-text input.pdf output.pdf
   ```

3. **Mapa de aliases** — alguns produtos aparecem nas duas lojas-benchmark com nomes
   ligeiramente diferentes. Editar `compute_prices.py:FUZZY_THRESHOLD` (atual 82). Subir
   para 90 = menos falsos positivos, mais SKUs sem match. Baixar para 75 = mais match,
   alguns ruidosos.

## Como reextrair

```bash
cd scripts
python3.11 extract_skus.py --dir .. --out ../catalog/raw_products.csv
```

Roda em ~1 minuto na sua máquina.
