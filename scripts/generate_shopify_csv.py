"""
generate_shopify_csv.py
=======================
Converte catalog/products_priced.csv no formato CSV oficial do Shopify para importação
em /admin/products via "Import products by CSV file".

Colunas obrigatórias seguem o template oficial Shopify (2024+):
  Handle, Title, Body (HTML), Vendor, Product Category, Type, Tags, Published,
  Option1 Name, Option1 Value, Variant SKU, Variant Inventory Tracker, Variant Inventory Qty,
  Variant Inventory Policy, Variant Fulfillment Service, Variant Price, Variant Compare At Price,
  Variant Requires Shipping, Variant Taxable, Image Src, Image Alt Text, Status

Uso:
    python3 generate_shopify_csv.py
"""

from __future__ import annotations

import argparse
import csv
import logging
from pathlib import Path


logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('shopify-csv')


SHOPIFY_FIELDS = [
    'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Type', 'Tags',
    'Published', 'Option1 Name', 'Option1 Value', 'Variant SKU',
    'Variant Inventory Tracker', 'Variant Inventory Qty', 'Variant Inventory Policy',
    'Variant Fulfillment Service', 'Variant Price', 'Variant Compare At Price',
    'Variant Requires Shipping', 'Variant Taxable', 'Image Src', 'Image Alt Text', 'Status'
]


VENDOR_TO_TYPE_HINT = {
    'Össur': 'Componentes de prótese',
    'Ottobock': 'Componentes de prótese',
    'Ottobock VariPlus': 'Joelhos',
    'Ottobock Bebionic': 'Mãos eletrônicas',
    'Blumentec': 'Componentes de prótese',
    'Ortho Pauher': 'Órteses e acessórios',
    'Polior': 'Componentes de prótese',
    'Ethnos': 'Componentes de prótese',
    'ProKinetics': 'Pés protéticos',
    'ALPS': 'Liners e meias',
    'Dilepé': 'Componentes de prótese',
}


def build_handle(vendor: str, sku: str, name: str) -> str:
    base = f"{vendor}-{sku}-{name}".lower()
    out = []
    for ch in base:
        if ch.isalnum():
            out.append(ch)
        elif out and out[-1] != '-':
            out.append('-')
    return ''.join(out).strip('-')[:100]


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument('--in',  dest='inp', default='../catalog/products_priced.csv')
    p.add_argument('--out', default='../catalog/shopify_products_import.csv')
    p.add_argument('--default-qty', type=int, default=0, help='Quantidade inicial em estoque para todos')
    args = p.parse_args()

    src = Path(args.inp).resolve()
    out = Path(args.out).resolve()
    if not src.exists():
        log.error('Faltando: %s. Rode extract_skus.py e compute_prices.py antes.', src)
        return 1

    with src.open(encoding='utf-8') as f:
        rows = list(csv.DictReader(f))

    log.info('Convertendo %d produtos para CSV Shopify', len(rows))

    with out.open('w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=SHOPIFY_FIELDS)
        w.writeheader()
        for r in rows:
            vendor = r['vendor']
            sku = r['sku']
            name = r['name']
            handle = r.get('handle') or build_handle(vendor, sku, name)
            price = r.get('price_final_brl') or ''
            ptype = VENDOR_TO_TYPE_HINT.get(vendor, 'Componentes')
            description_html = (
                f"<p>{r.get('description', '').strip()}</p>"
                f"<p class='meta'>Fornecedor: <strong>{vendor}</strong> · Código original: {sku}</p>"
            )
            tags = ', '.join(filter(None, [vendor, ptype]))

            # Status: produtos com preço suspeito ficam em draft para revisão manual
            confidence = r.get('price_confidence', '')
            needs_review = confidence in ('avg2-suspect', 'pdf-only')
            status = 'draft' if (not price or needs_review) else 'active'
            # Tag de revisão para filtrar fácil no admin
            review_tag = ', revisar-preco' if needs_review and price else ''

            w.writerow({
                'Handle': handle,
                'Title': name,
                'Body (HTML)': description_html,
                'Vendor': vendor,
                'Product Category': 'Health & Beauty > Health Care > Mobility & Accessibility',
                'Type': ptype,
                'Tags': tags + review_tag,
                'Published': 'TRUE',
                'Option1 Name': 'Title',
                'Option1 Value': 'Default Title',
                'Variant SKU': sku,
                'Variant Inventory Tracker': 'shopify',
                'Variant Inventory Qty': args.default_qty,
                'Variant Inventory Policy': 'deny',
                'Variant Fulfillment Service': 'manual',
                'Variant Price': price,
                'Variant Compare At Price': '',
                'Variant Requires Shipping': 'TRUE',
                'Variant Taxable': 'TRUE',
                'Image Src': r.get('image_url', ''),
                'Image Alt Text': name,
                'Status': status,
            })

    log.info('Saída: %s', out)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
