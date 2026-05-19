"""
clean_names.py
===============
Pós-processamento dos nomes extraídos do PDF: remove resíduos comuns que sobram
de colunas adjacentes não detectadas pelo extrator de texto.

Padrões removidos:
  - prefixo "-...-X " ou "...-X "
  - prefixo "e IL " / "e III " etc. (sufixo de coluna anterior)
  - "(un)" e "(par)" mantidos
  - números soltos no início (códigos de página)

Uso (in-place):
    python3 clean_names.py [--in CSV] [--out CSV]
"""

from __future__ import annotations

import argparse
import csv
import logging
import re
from pathlib import Path


logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('clean')

# Resíduos de coluna anterior
LEADING_NOISE = re.compile(r'^(-?\.{2,}-?[A-Z]?\s+|e\s+I+L?\s+|^\d+\s+\(un\)\s+|^[A-Z]\s+(?=[A-Z][a-z]))')
# Espaços múltiplos
MULTI_SP = re.compile(r'\s{2,}')
# Termina com R$ XXX,XX — corta o preço do final do nome (já está em coluna própria)
TRAILING_PRICE = re.compile(r'\s+R?\$?\s*[\d\.,]+\s*$')
# Linha exclusivamente de "(un)" ou variações
JUST_UNIT = re.compile(r'^\s*\((un|par|pç|peça)\)\s*$', re.IGNORECASE)


def clean_name(name: str) -> str:
    if not name:
        return ''
    s = name.strip()
    # remove preço residual no final
    s = TRAILING_PRICE.sub('', s)
    # remove ruído de início
    for _ in range(3):  # até 3 passadas (cumulativo)
        new = LEADING_NOISE.sub('', s)
        if new == s:
            break
        s = new.strip()
    s = MULTI_SP.sub(' ', s)
    s = s.strip(' -·.,;')
    # Capitaliza a primeira letra
    if s and s[0].islower():
        s = s[0].upper() + s[1:]
    return s


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument('--in', dest='inp', default='../catalog/raw_products.csv')
    p.add_argument('--out', default='../catalog/raw_products_clean.csv')
    args = p.parse_args()

    src = Path(args.inp).resolve()
    out = Path(args.out).resolve()
    rows = []
    cleaned = dropped = 0
    with src.open(encoding='utf-8') as f:
        for r in csv.DictReader(f):
            old = r['name']
            new = clean_name(old)
            if JUST_UNIT.match(new) or len(new) < 5:
                dropped += 1
                continue
            if new != old:
                cleaned += 1
            r['name'] = new
            rows.append(r)

    with out.open('w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=rows[0].keys())
        w.writeheader()
        w.writerows(rows)
    log.info('Total %d  | Limpos %d  | Descartados %d', len(rows), cleaned, dropped)
    log.info('Saída: %s', out)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
