"""
extract_skus.py
================
Lê todos os PDFs de fornecedores em /Tabelas 2026 e extrai produtos para um CSV unificado.

Cada fornecedor tem um layout diferente. Este script roda dois passos:
  1. Extração de texto bruto, página a página (pdfplumber para layout, pypdf como fallback).
  2. Parsers específicos por fornecedor (heurísticas regex), com fallback genérico que aplica
     padrões comuns: linhas que começam com código alfanumérico + descrição + preço opcional.

Saída: catalog/raw_products.csv com colunas:
  vendor, sku, name, description, price_brl, source_pdf, source_page

Uso:
    python3 extract_skus.py [--dir CAMINHO] [--out CSV]
"""

from __future__ import annotations

import argparse
import csv
import io
import logging
import re
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Callable, Iterable

try:
    import pdfplumber  # type: ignore
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False

try:
    from pypdf import PdfReader  # type: ignore
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False


logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('extract')


# Mapeamento arquivo -> fornecedor canônico
VENDOR_MAP = {
    'OSSUR': 'Össur',
    'OTTOBOCK': 'Ottobock',
    'ORTHO PAUHER': 'Ortho Pauher',
    'BLUMENTEC': 'Blumentec',
    'BLUMENTHEC': 'Blumentec',
    'POLIOR': 'Polior',
    'ETHNOS': 'Ethnos',
    'PROKINETICS': 'ProKinetics',
    'ALPS': 'ALPS',
    'DILEPE': 'Dilepé',
    'VARIPLUS': 'Ottobock VariPlus',
    'BEBIONIC': 'Ottobock Bebionic',
}

PRICE_RE = re.compile(r'R\$\s*([0-9]{1,3}(?:[\.\,][0-9]{3})*(?:[\.\,][0-9]{2})?)')
# SKU comum: prefixo letras + dígitos + hífen + dígitos, com no mínimo 4 caracteres.
SKU_RE = re.compile(r'\b([A-Z0-9]{2,}[\-\.][A-Z0-9]{2,}(?:[\-\.][A-Z0-9]+)?|[0-9]{4,7}\.[0-9A-Z]{1,4}|[0-9]{6,10})\b')


@dataclass
class Product:
    vendor: str
    sku: str
    name: str
    description: str
    price_brl: str
    source_pdf: str
    source_page: int


def detect_vendor(pdf_path: Path) -> str:
    name = pdf_path.stem.upper()
    for key, canon in VENDOR_MAP.items():
        if key in name:
            return canon
    return 'Desconhecido'


def extract_text_pages(pdf_path: Path) -> list[str]:
    """Tenta pdfplumber primeiro (melhor layout), faz fallback pypdf."""
    if HAS_PDFPLUMBER:
        try:
            with pdfplumber.open(str(pdf_path)) as pdf:
                pages = []
                for p in pdf.pages:
                    txt = p.extract_text() or ''
                    pages.append(txt)
                return pages
        except Exception as exc:
            log.warning('pdfplumber falhou em %s: %s — tentando pypdf', pdf_path.name, exc)
    if HAS_PYPDF:
        reader = PdfReader(str(pdf_path))
        return [p.extract_text() or '' for p in reader.pages]
    raise RuntimeError('Nem pdfplumber nem pypdf disponíveis. `pip install pdfplumber pypdf`.')


def parse_money_brl(s: str) -> str:
    """Normaliza '1.234,56' -> '1234.56' (formato CSV Shopify)."""
    s = s.replace('.', '').replace(',', '.')
    try:
        v = float(s)
        return f'{v:.2f}'
    except ValueError:
        return ''


# ---------- Parsers por fornecedor ---------- #

def parse_generic(text: str, page_no: int, vendor: str, pdf_name: str) -> list[Product]:
    """Heurística genérica: localiza SKU seguido por descrição + opcional preço na linha."""
    out: list[Product] = []
    for line in text.split('\n'):
        line = line.strip()
        if not line or len(line) < 8:
            continue
        sku_match = SKU_RE.search(line)
        if not sku_match:
            continue
        sku = sku_match.group(1)
        # descrição: removendo o SKU e o preço da linha
        desc = line.replace(sku, '').strip()
        price_match = PRICE_RE.search(desc)
        price = ''
        if price_match:
            price = parse_money_brl(price_match.group(1))
            desc = desc.replace(price_match.group(0), '').strip(' -·.,')
        if not desc or len(desc) < 5:
            continue
        name = desc[:120]
        out.append(Product(
            vendor=vendor,
            sku=sku,
            name=name,
            description=desc,
            price_brl=price,
            source_pdf=pdf_name,
            source_page=page_no,
        ))
    return out


def parse_ottobock(text: str, page_no: int, vendor: str, pdf_name: str) -> list[Product]:
    """Ottobock: SKUs no formato '6Y82=L' ou '3R80', linhas com tabulação clara."""
    out: list[Product] = []
    pat = re.compile(r'^([0-9][A-Z][0-9]{1,3}(?:=[A-Z0-9\-]+)?)\s+(.{8,120}?)\s+(R\$\s*[\d\.\,]+)?\s*$')
    for line in text.split('\n'):
        m = pat.match(line.strip())
        if m:
            price = parse_money_brl(m.group(3).replace('R$', '').strip()) if m.group(3) else ''
            out.append(Product(vendor, m.group(1), m.group(2).strip(), m.group(2).strip(), price, pdf_name, page_no))
    return out or parse_generic(text, page_no, vendor, pdf_name)


def parse_ossur(text: str, page_no: int, vendor: str, pdf_name: str) -> list[Product]:
    """Össur: SKUs '180100' (6 dígitos) ou 'PRO-FLEX-XC'."""
    out: list[Product] = []
    pat = re.compile(r'^([A-Z0-9\-]{5,18})\s+(.{8,150}?)(?:\s+R\$\s*([\d\.\,]+))?\s*$')
    for line in text.split('\n'):
        s = line.strip()
        if not s or s.startswith(('TABELA', 'Página', 'Page', '©')):
            continue
        m = pat.match(s)
        if m:
            sku = m.group(1)
            if not re.search(r'[A-Z0-9]', sku):
                continue
            price = parse_money_brl(m.group(3)) if m.group(3) else ''
            out.append(Product(vendor, sku, m.group(2).strip()[:120], m.group(2).strip(), price, pdf_name, page_no))
    return out or parse_generic(text, page_no, vendor, pdf_name)


PARSERS: dict[str, Callable[[str, int, str, str], list[Product]]] = {
    'Ottobock': parse_ottobock,
    'Ottobock VariPlus': parse_ottobock,
    'Ottobock Bebionic': parse_ottobock,
    'Össur': parse_ossur,
}


def dedupe(products: Iterable[Product]) -> list[Product]:
    seen = set()
    out = []
    for p in products:
        key = (p.vendor, p.sku.upper())
        if key in seen:
            continue
        seen.add(key)
        out.append(p)
    return out


def extract_pdf(pdf_path: Path) -> list[Product]:
    vendor = detect_vendor(pdf_path)
    log.info('Lendo %s (fornecedor=%s)', pdf_path.name, vendor)
    pages = extract_text_pages(pdf_path)
    parser = PARSERS.get(vendor, parse_generic)
    products: list[Product] = []
    for i, txt in enumerate(pages, start=1):
        if not txt.strip():
            continue
        products.extend(parser(txt, i, vendor, pdf_path.name))
    log.info('  -> %d produtos brutos extraídos', len(products))
    return products


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--dir', default='..', help='Diretório com os PDFs de fornecedores')
    parser.add_argument('--out', default='../catalog/raw_products.csv')
    args = parser.parse_args()

    pdf_dir = Path(args.dir).resolve()
    out_path = Path(args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    pdfs = sorted(pdf_dir.glob('*.pdf'))
    if not pdfs:
        log.error('Nenhum PDF em %s', pdf_dir)
        return 1

    all_products: list[Product] = []
    for pdf in pdfs:
        try:
            all_products.extend(extract_pdf(pdf))
        except Exception as exc:
            log.exception('Falha em %s: %s', pdf.name, exc)

    deduped = dedupe(all_products)
    log.info('Total: %d produtos (%d após dedup)', len(all_products), len(deduped))

    with out_path.open('w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['vendor', 'sku', 'name', 'description', 'price_brl', 'source_pdf', 'source_page'])
        writer.writeheader()
        for p in deduped:
            writer.writerow(asdict(p))

    log.info('Saída: %s', out_path)
    return 0


if __name__ == '__main__':
    sys.exit(main())
