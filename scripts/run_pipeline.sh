#!/usr/bin/env bash
# Roda toda a pipeline de dados:
#  1) extrai SKUs dos PDFs dos fornecedores
#  2) faz scraping dos preços de benchmark
#  3) calcula preço médio
#  4) gera CSV de importação Shopify

set -euo pipefail
cd "$(dirname "$0")"

echo "==> Instalando dependências"
pip3 install -q -r requirements.txt

echo "==> 1/4 Extraindo SKUs dos PDFs"
python3 extract_skus.py --dir .. --out ../catalog/raw_products.csv

echo "==> 2/4 Scraping benchmarks (pode levar 20-40 min)"
python3 scrape_benchmarks.py --out ../catalog/benchmark_prices.csv

echo "==> 3/4 Calculando preços médios"
python3 compute_prices.py --raw ../catalog/raw_products.csv --bench ../catalog/benchmark_prices.csv --out ../catalog/products_priced.csv

echo "==> 4/4 Gerando CSV de importação Shopify"
python3 generate_shopify_csv.py --in ../catalog/products_priced.csv --out ../catalog/shopify_products_import.csv

echo "==> OK. Veja catalog/shopify_products_import.csv"
