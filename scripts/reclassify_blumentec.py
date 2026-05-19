"""
reclassify_blumentec.py
========================
Blumentec é distribuidora, não fabricante. Reclassifica os SKUs Blumentec
para as marcas reais que ela representa, identificadas no catálogo V8S:

  - WillowWood  (USA) — liners Alpha, pés META, coberturas
  - Circleg     (Suíça) — joelho e pé dinâmico modulares
  - Pro Sun     — joelhos e componentes modulares acessíveis
  - TuboMed     — órteses AFO externas (pé caído)
  - Paralid     — próteses funcionais de dedo

Aplica os mapas em raw_products_clean.csv (substitui o vendor) — preserva o
arquivo original em raw_products_clean.bak.csv para auditoria.

Uso:
    python3.11 reclassify_blumentec.py
"""

from __future__ import annotations

import argparse
import csv
import logging
import re
import shutil
import sys
from collections import Counter
from pathlib import Path


logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('reclassify')


# SKUs claramente lixo (telefone, dimensões, tabelas mal-extraídas)
GARBAGE_SKU_PATTERNS = [
    re.compile(r'^\d{4,5}-\d{4}$'),       # 99969-1406 telefone
    re.compile(r'^\d{2}-\d{2}$'),         # 22-29 dimensões
    re.compile(r'^\d{2,3}\s*kg', re.IGNORECASE),
]


def is_garbage_sku(sku: str, name: str) -> bool:
    if any(p.match(sku) for p in GARBAGE_SKU_PATTERNS):
        return True
    # Nome contém indicação clara de não ser produto
    bad = ['@', 'tel:', 'http', 'www.', '.com', 'kg 1 1', 'kg 2 2', 'kg 3 3', 'kg 5 5']
    return any(b in (name or '').lower() for b in bad)


# Mapa: padrão de SKU (regex anchored no início) → marca real
# Ordem importa — vai do mais específico para o mais genérico.
SKU_TO_BRAND = [
    # Circleg — kits com sufixo -KIT
    (re.compile(r'^F1-[A-Z]-KIT$'), 'Circleg'),
    (re.compile(r'^CC1-[A-Z]{2}(-[A-Z]{2})?(-KIT)?$'), 'Circleg'),
    (re.compile(r'^PK1\b'), 'Circleg'),

    # TuboMed — formato NNNNNN-SA-X
    (re.compile(r'^(100100|101155|102100)-SA-[A-Z]$'), 'TuboMed'),

    # Paralid — códigos curtos de dedo
    (re.compile(r'^(TMP|TPP|PTP|SPTP|MD|TMC)$'), 'Paralid'),

    # WillowWood — liners Alpha (prefixos de 4 chars)
    (re.compile(r'^(A3E0|A3E2|H350|H352|P350|P352|S350|S352|T350|T352|S494|S495)-'), 'WillowWood'),
    (re.compile(r'^ALS-'), 'WillowWood'),
    # WillowWood — pés META
    (re.compile(r'^(M001|M002|M007|M011)-'), 'WillowWood'),
    # WillowWood — coberturas cosméticas (FS01/FS02)
    (re.compile(r'^(FS01|FS02)-'), 'WillowWood'),

    # Pro Sun — joelhos e componentes
    (re.compile(r'^(X[0-9]+|XQ[0-9]?|X11)-[A-Z]?$'), 'Pro Sun'),  # X9-A, XQ-4, X2-S, X11-A
    (re.compile(r'^L[0-9]{1,2}-[A-Z]'), 'Pro Sun'),                # L1-S, L10-S, L11-S, L20-S
    (re.compile(r'^LK[0-9]-[A-Z]'), 'Pro Sun'),                    # LK2-A, LK4-A/S/T
    (re.compile(r'^F00[4-5]\b'), 'Pro Sun'),                       # F004, F005
    (re.compile(r'^H1-[A-Z]'), 'Pro Sun'),                         # H1-S
    (re.compile(r'^J1-[A-Z]'), 'Pro Sun'),                         # J1-M
    (re.compile(r'^P11-[A-Z]'), 'Pro Sun'),                        # P11-A
]


def reclassify(sku: str, original_vendor: str, name: str) -> str:
    """Retorna a nova marca, ou o vendor original se nada bater."""
    if original_vendor != 'Blumentec':
        return original_vendor
    sku_up = sku.strip().upper()
    for pattern, brand in SKU_TO_BRAND:
        if pattern.match(sku_up):
            return brand
    # Fallback: olha pelo nome (linhas que mencionam Willowwood, Circleg etc.)
    name_lower = (name or '').lower()
    if 'willowwood' in name_lower or 'willoowwood' in name_lower or 'alpha' in name_lower or 'meta' in name_lower:
        return 'WillowWood'
    if 'circleg' in name_lower:
        return 'Circleg'
    if 'xtern' in name_lower or 'tubomed' in name_lower or 'turbomed' in name_lower or 'pé caído' in name_lower:
        return 'TuboMed'
    if 'paralid' in name_lower or 'prótese de dedo' in name_lower or 'finger prosthetic' in name_lower:
        return 'Paralid'
    if 'prosun' in name_lower or 'pro sun' in name_lower:
        return 'Pro Sun'
    # Não bateu — mantém Blumentec, mas vai pra revisão
    return original_vendor


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument('--in', dest='inp', default='../catalog/raw_products_clean.csv')
    p.add_argument('--out', default='../catalog/raw_products_clean.csv')
    args = p.parse_args()

    src = Path(args.inp).resolve()
    out = Path(args.out).resolve()
    backup = src.with_suffix('.bak.csv')

    if not backup.exists():
        shutil.copy2(src, backup)
        log.info('Backup salvo em %s', backup.name)

    with src.open(encoding='utf-8') as f:
        rows = list(csv.DictReader(f))

    before = Counter(r['vendor'] for r in rows)
    unclassified_blumentec_skus = []
    changed = 0

    # Primeiro filtra lixo
    rows = [r for r in rows if not is_garbage_sku(r['sku'], r['name'])]

    for r in rows:
        new_vendor = reclassify(r['sku'], r['vendor'], r['name'])
        if new_vendor != r['vendor']:
            changed += 1
            r['vendor'] = new_vendor
        elif r['vendor'] == 'Blumentec':
            unclassified_blumentec_skus.append((r['sku'], r['name'][:50]))

    after = Counter(r['vendor'] for r in rows)

    log.info('Vendors antes:')
    for v, n in before.most_common():
        log.info('  %-20s %d', v, n)
    log.info('Vendors depois:')
    for v, n in after.most_common():
        log.info('  %-20s %d', v, n)
    log.info('SKUs reclassificados: %d', changed)
    log.info('Blumentec não classificados: %d', len(unclassified_blumentec_skus))
    if unclassified_blumentec_skus:
        log.info('Primeiros 20 não classificados:')
        for sku, name in unclassified_blumentec_skus[:20]:
            log.info('  %s  | %s', sku, name)

    with out.open('w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=rows[0].keys())
        w.writeheader()
        w.writerows(rows)
    log.info('Saída: %s', out)
    return 0


if __name__ == '__main__':
    sys.exit(main())
