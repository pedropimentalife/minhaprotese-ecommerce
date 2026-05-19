#!/usr/bin/env bash
# Pipeline completo de deploy.
# Assume que você já tem: conta Shopify, domínio, Shopify CLI, Vercel CLI, chave Anthropic.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==================================================================="
echo "  minha prótese — deploy-everything.sh"
echo "==================================================================="

# --- Variáveis necessárias --- #
: "${SHOPIFY_STORE:?Defina SHOPIFY_STORE=minhaprotese.myshopify.com}"
: "${ANTHROPIC_API_KEY:?Defina ANTHROPIC_API_KEY (sk-ant-…)}"

PYTHON="${PYTHON:-/usr/local/bin/python3.11}"

echo ""
echo "==> 1/6  Dependências Python"
$PYTHON -m pip install -q --user -r scripts/requirements.txt

echo ""
echo "==> 2/6  Pipeline de dados (extração + preço + CSV)"
cd scripts
$PYTHON extract_skus.py --dir .. --out ../catalog/raw_products.csv
$PYTHON clean_names.py --in ../catalog/raw_products.csv --out ../catalog/raw_products_clean.csv
# Só roda scrape se ainda não existir (8 min)
if [ ! -f ../catalog/benchmark_prices.csv ]; then
  echo "    rodando scrape (8 min) — pule com Ctrl+C e use os preços do PDF"
  $PYTHON scrape_benchmarks.py --out ../catalog/benchmark_prices.csv
fi
$PYTHON compute_prices.py --raw ../catalog/raw_products_clean.csv --bench ../catalog/benchmark_prices.csv --out ../catalog/products_priced.csv
$PYTHON generate_shopify_csv.py --in ../catalog/products_priced.csv --out ../catalog/shopify_products_import.csv
cd ..

echo ""
echo "==> 3/6  Catálogo JSON para o endpoint IA"
cd whatsapp-ai
if ! command -v node >/dev/null; then
  echo "Node.js 18+ necessário. Instale via 'brew install node'."
  exit 1
fi
node scripts/build-catalog.mjs ../catalog/shopify_products_import.csv data/catalog.json
cd ..

echo ""
echo "==> 4/6  Deploy do endpoint IA na Vercel"
cd whatsapp-ai
if [ ! -d node_modules ]; then npm install; fi
# Garante variável no ambiente Vercel
echo "$ANTHROPIC_API_KEY" | vercel env add ANTHROPIC_API_KEY production --force 2>/dev/null || true
AI_URL="$(vercel --prod --yes 2>&1 | grep -Eo 'https://[^[:space:]]+' | head -1 || true)"
if [ -n "$AI_URL" ]; then
  echo "    endpoint IA → ${AI_URL}/api/chat"
fi
cd ..

echo ""
echo "==> 5/6  Upload do tema Shopify"
if ! command -v shopify >/dev/null; then
  echo "Shopify CLI necessário. Instale com 'brew install shopify-cli'."
  exit 1
fi
cd shopify-theme
shopify theme push --store="$SHOPIFY_STORE" --unpublished --json
cd ..

echo ""
echo "==> 6/6  Próximos passos manuais"
echo "   - Acesse admin do Shopify"
echo "   - Products > Import > catalog/shopify_products_import.csv"
echo "   - Online Store > Themes > publique o tema novo"
echo "   - Online Store > Customize > Theme settings > Contato e atendimento"
echo "       Endpoint do assistente IA: ${AI_URL:-<rode whatsapp-ai/deploy>}/api/chat"
echo "   - Configure gateway de pagamento e frete"
echo ""
echo "==> OK"
