"""
inventory_sync.py
=================
Sincroniza estoque entre uma planilha Google Sheets e a loja Shopify, em ambas as direções:

  sheet -> shopify   (modo padrão; planilha é fonte da verdade)
  shopify -> sheet   (--reverse; espelha estoque atual da Shopify de volta para a planilha)

Layout esperado da planilha:
  Aba "Estoque" com colunas: sku | quantidade | local (opcional)

Configuração (variáveis de ambiente):
  SHOPIFY_STORE        ex.: minhaprotese.myshopify.com
  SHOPIFY_ADMIN_TOKEN  Token de Admin API (scope: read_products, write_inventory)
  SHOPIFY_LOCATION_ID  Numérico, o ID do location de inventário onde aplicar
  GOOGLE_CREDENTIALS   Caminho do JSON de service-account com acesso à planilha
  SHEET_ID             ID da Google Sheet (parte da URL)

Uso:
    python3 inventory_sync.py [--reverse] [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from typing import Iterable

import requests

try:
    import gspread  # type: ignore
    from google.oauth2.service_account import Credentials  # type: ignore
    HAS_GSPREAD = True
except ImportError:
    HAS_GSPREAD = False


logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('inventory')

SHOPIFY_API_VERSION = '2024-10'
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']


# ---------- Google Sheets ---------- #

def open_sheet():
    creds_path = os.environ['GOOGLE_CREDENTIALS']
    sheet_id = os.environ['SHEET_ID']
    creds = Credentials.from_service_account_file(creds_path, scopes=SCOPES)
    gc = gspread.authorize(creds)
    return gc.open_by_key(sheet_id).worksheet('Estoque')


def read_sheet_inventory() -> dict[str, int]:
    if not HAS_GSPREAD:
        log.error('gspread/google-auth não instalado. `pip install gspread google-auth`.')
        sys.exit(1)
    ws = open_sheet()
    records = ws.get_all_records()  # cabeçalho na primeira linha
    out: dict[str, int] = {}
    for r in records:
        sku = str(r.get('sku') or '').strip()
        qty = r.get('quantidade')
        if not sku or qty is None or qty == '':
            continue
        try:
            out[sku] = int(qty)
        except (ValueError, TypeError):
            log.warning('Quantidade inválida para SKU %s: %r', sku, qty)
    return out


def write_sheet_inventory(qty_by_sku: dict[str, int]) -> None:
    ws = open_sheet()
    records = ws.get_all_records()
    header = ws.row_values(1)
    try:
        sku_col = header.index('sku') + 1
        qty_col = header.index('quantidade') + 1
    except ValueError:
        log.error('Cabeçalho deve ter "sku" e "quantidade". Recebido: %s', header)
        sys.exit(1)
    updates = []
    for idx, r in enumerate(records, start=2):
        sku = str(r.get('sku') or '').strip()
        if sku in qty_by_sku:
            updates.append({
                'range': gspread.utils.rowcol_to_a1(idx, qty_col),
                'values': [[qty_by_sku[sku]]],
            })
    if updates:
        ws.batch_update(updates)
        log.info('Planilha atualizada: %d linhas', len(updates))


# ---------- Shopify Admin API ---------- #

def shopify_get(path: str, params: dict | None = None) -> dict:
    store = os.environ['SHOPIFY_STORE']
    token = os.environ['SHOPIFY_ADMIN_TOKEN']
    url = f'https://{store}/admin/api/{SHOPIFY_API_VERSION}/{path}'
    r = requests.get(url, headers={'X-Shopify-Access-Token': token}, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def shopify_post(path: str, body: dict) -> dict:
    store = os.environ['SHOPIFY_STORE']
    token = os.environ['SHOPIFY_ADMIN_TOKEN']
    url = f'https://{store}/admin/api/{SHOPIFY_API_VERSION}/{path}'
    r = requests.post(url, headers={'X-Shopify-Access-Token': token, 'Content-Type': 'application/json'}, json=body, timeout=30)
    if r.status_code >= 400:
        log.error('Shopify POST %s -> %s %s', path, r.status_code, r.text[:400])
    r.raise_for_status()
    return r.json()


def list_variants_with_inventory() -> Iterable[dict]:
    """Itera todos os variants paginando o endpoint de produtos."""
    page_info = None
    while True:
        params = {'limit': 250, 'fields': 'id,variants'}
        if page_info:
            params['page_info'] = page_info
        data = shopify_get('products.json', params=params)
        for product in data.get('products', []):
            for v in product.get('variants', []):
                yield v
        # Shopify usa Link header — para simplicidade aqui paramos se vier menos que 250
        if len(data.get('products', [])) < 250:
            break
        time.sleep(0.5)


def map_sku_to_inventory_item() -> dict[str, int]:
    """Devolve {sku: inventory_item_id}."""
    out: dict[str, int] = {}
    for v in list_variants_with_inventory():
        sku = (v.get('sku') or '').strip()
        if not sku:
            continue
        out[sku] = v['inventory_item_id']
    log.info('Mapeados %d SKUs no Shopify', len(out))
    return out


def get_shopify_inventory(inventory_item_ids: list[int]) -> dict[int, int]:
    """Devolve {inventory_item_id: available}. Em lote de 50."""
    location_id = int(os.environ['SHOPIFY_LOCATION_ID'])
    out: dict[int, int] = {}
    for i in range(0, len(inventory_item_ids), 50):
        chunk = inventory_item_ids[i:i + 50]
        data = shopify_get('inventory_levels.json', params={
            'location_ids': location_id,
            'inventory_item_ids': ','.join(map(str, chunk)),
            'limit': 250,
        })
        for lvl in data.get('inventory_levels', []):
            out[lvl['inventory_item_id']] = lvl.get('available') or 0
        time.sleep(0.4)
    return out


def set_shopify_inventory(inventory_item_id: int, qty: int) -> None:
    location_id = int(os.environ['SHOPIFY_LOCATION_ID'])
    shopify_post('inventory_levels/set.json', {
        'location_id': location_id,
        'inventory_item_id': inventory_item_id,
        'available': qty,
    })


# ---------- Modos ---------- #

def sync_sheet_to_shopify(dry_run: bool) -> None:
    desired = read_sheet_inventory()
    sku_to_item = map_sku_to_inventory_item()
    log.info('Planilha tem %d SKUs com quantidade definida.', len(desired))

    missing = [sku for sku in desired if sku not in sku_to_item]
    if missing:
        log.warning('SKUs na planilha sem variant na Shopify: %s', ', '.join(missing[:20]))

    updated = 0
    for sku, qty in desired.items():
        item_id = sku_to_item.get(sku)
        if not item_id:
            continue
        log.info('  set %s (item %s) -> %d%s', sku, item_id, qty, ' [DRY]' if dry_run else '')
        if not dry_run:
            set_shopify_inventory(item_id, qty)
            time.sleep(0.3)
        updated += 1
    log.info('Total enviado para Shopify: %d', updated)


def sync_shopify_to_sheet(dry_run: bool) -> None:
    sku_to_item = map_sku_to_inventory_item()
    levels = get_shopify_inventory(list(sku_to_item.values()))
    qty_by_sku: dict[str, int] = {}
    for sku, item_id in sku_to_item.items():
        qty_by_sku[sku] = int(levels.get(item_id, 0) or 0)
    log.info('Lendo estoque de %d SKUs do Shopify', len(qty_by_sku))
    if dry_run:
        for sku, q in list(qty_by_sku.items())[:20]:
            log.info('  %s -> %d', sku, q)
    else:
        write_sheet_inventory(qty_by_sku)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument('--reverse', action='store_true', help='Shopify -> Sheet')
    p.add_argument('--dry-run', action='store_true')
    args = p.parse_args()

    required = ['SHOPIFY_STORE', 'SHOPIFY_ADMIN_TOKEN', 'SHOPIFY_LOCATION_ID', 'GOOGLE_CREDENTIALS', 'SHEET_ID']
    missing = [v for v in required if not os.environ.get(v)]
    if missing:
        log.error('Variáveis de ambiente faltando: %s', ', '.join(missing))
        return 1

    if args.reverse:
        sync_shopify_to_sheet(args.dry_run)
    else:
        sync_sheet_to_shopify(args.dry_run)
    return 0


if __name__ == '__main__':
    sys.exit(main())
