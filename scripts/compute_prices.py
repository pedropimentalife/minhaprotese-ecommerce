"""
compute_prices.py
==================
Faz o matching fuzzy entre raw_products.csv (extraído dos PDFs) e benchmark_prices.csv
(scraping das lojas concorrentes). Calcula o preço médio entre as duas lojas para cada
produto que tiver match em ambos. Quando o match for parcial (só uma loja), usa esse
preço com markup configurável.

Saída: catalog/products_priced.csv

Uso:
    python3 compute_prices.py
"""

from __future__ import annotations

import argparse
import csv
import logging
from collections import defaultdict
from pathlib import Path

from rapidfuzz import process, fuzz
from slugify import slugify


logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('price')

# Limite mínimo de similaridade para aceitar um match fuzzy
FUZZY_THRESHOLD = 80
# Markup aplicado quando só uma das lojas tem o produto
SOLO_MARKUP = 1.0  # 1.0 = usa o preço bruto; 1.05 = +5%

# Aliases para reconhecer marca nos títulos do benchmark
VENDOR_ALIASES = {
    'Ottobock': ['ottobock', 'ottobok', 'otto bock'],
    'Össur': ['ossur', 'össur', 'iceross', 'pro-flex', 'proflex', 'rheo', 'icefoam'],
    'Blumentec': ['blumentec', 'blumenthec', 'alpha'],
    'Ortho Pauher': ['ortho pauher', 'orthopauher', 'pauher'],
    'Polior': ['polior'],
    'Ethnos': ['ethnos'],
    'ProKinetics': ['prokinetics', 'pro kinetics', 'supreme', 'vacuum'],
    'ALPS': ['alps', 'easyliner'],
    'Dilepé': ['dilepé', 'dilepe'],
    'Ottobock VariPlus': ['variplus', 'vari-plus'],
    'Ottobock Bebionic': ['bebionic'],
}


def load_rows(path: Path) -> list[dict]:
    if not path.exists():
        log.error('Não existe: %s', path)
        return []
    with path.open(encoding='utf-8') as f:
        return list(csv.DictReader(f))


def vendor_matches(vendor: str, candidate: dict) -> bool:
    """Confere marca por (1) campo vendor do candidato e (2) presença de alias no título."""
    aliases = VENDOR_ALIASES.get(vendor, [vendor.lower()])
    cv = (candidate.get('vendor') or '').replace('Marca:', '').strip().lower()
    if cv and any(a == cv or a in cv for a in aliases):
        return True
    t = (candidate.get('title') or '').lower()
    return any(a in t for a in aliases)


def match_to_shop(target_name: str, target_vendor: str, target_sku: str, candidates_by_shop: dict[str, list[dict]], shop: str) -> tuple[dict | None, str]:
    """
    Retorna (candidate, strength) onde strength é 'strong' ou 'weak'.
    Match forte = SKU literal aparece no título → copia título+imagem+preço.
    Match fraco = só fuzzy nome → copia APENAS preço (mantém título/imagem do PDF).
    """
    pool = candidates_by_shop.get(shop, [])
    if not pool:
        return (None, '')
    # 1. Match forte: SKU literal aparece no título
    sku_core = (target_sku or '').strip().upper()
    if sku_core and len(sku_core) >= 3:
        for c in pool:
            if sku_core in (c['title'] or '').upper():
                return (c, 'strong')
    # 2. Match fraco: filtra por marca + fuzzy de nome
    pool = [c for c in pool if vendor_matches(target_vendor, c)]
    if not pool:
        return (None, '')
    titles = [c['title'] for c in pool]
    best = process.extractOne(target_name, titles, scorer=fuzz.WRatio)
    if not best or best[1] < FUZZY_THRESHOLD:
        return (None, '')
    return (pool[best[2]], 'weak')


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument('--raw',    default='../catalog/raw_products.csv')
    p.add_argument('--bench',  default='../catalog/benchmark_prices.csv')
    p.add_argument('--out',    default='../catalog/products_priced.csv')
    args = p.parse_args()

    raw = load_rows(Path(args.raw).resolve())
    bench = load_rows(Path(args.bench).resolve())
    out = Path(args.out).resolve()

    bench_by_shop: dict[str, list[dict]] = defaultdict(list)
    for r in bench:
        bench_by_shop[r['shop']].append(r)

    log.info('Produtos brutos: %d', len(raw))
    log.info('Benchmarks: lojadoamputado=%d  lojaortopedica=%d',
             len(bench_by_shop.get('lojadoamputado', [])),
             len(bench_by_shop.get('lojaortopedica', [])))

    enriched = []
    matched_both = matched_one = matched_none = 0

    for r in raw:
        name = r['name']
        m_amp, s_amp = match_to_shop(name, r['vendor'], r['sku'], bench_by_shop, 'lojadoamputado')
        m_ort, s_ort = match_to_shop(name, r['vendor'], r['sku'], bench_by_shop, 'lojaortopedica')

        prices = []
        if m_amp and m_amp.get('price_brl'):
            prices.append(float(m_amp['price_brl']))
        if m_ort and m_ort.get('price_brl'):
            prices.append(float(m_ort['price_brl']))

        if len(prices) == 2:
            lo, hi = min(prices), max(prices)
            ratio = hi / lo if lo > 0 else 999
            if ratio > 3.0:
                # Divergência grande sugere match incorreto numa das lojas.
                # Toma o que está mais perto do preço do PDF; se não houver PDF, pega o menor.
                pdf_price = float(r['price_brl']) if r.get('price_brl') else 0.0
                if pdf_price:
                    final = min(prices, key=lambda p: abs(p - pdf_price))
                else:
                    final = lo
                confidence = 'avg2-suspect'
                matched_both += 1
            else:
                final = sum(prices) / 2.0
                confidence = 'avg2'
                matched_both += 1
        elif len(prices) == 1:
            final = prices[0] * SOLO_MARKUP
            confidence = 'single'
            matched_one += 1
        else:
            # Mantém o preço do PDF se houver (tabela fornecedor é custo, não revenda — apenas marcador)
            final = float(r['price_brl']) if r.get('price_brl') else 0.0
            confidence = 'pdf-only' if final else 'none'
            matched_none += 1

        # Só herda título/imagem em match FORTE (SKU literal no título do benchmark).
        # Match fraco só ganha o preço — mantém nome original do PDF.
        clean_name = r['name']
        image_url = ''
        strong_match = None
        if s_amp == 'strong':
            strong_match = m_amp
        elif s_ort == 'strong':
            strong_match = m_ort
        if strong_match:
            if strong_match.get('title'):
                clean_name = strong_match['title']
            if strong_match.get('image_url'):
                image_url = strong_match['image_url']

        clean_vendor = r['vendor']

        enriched.append({
            **r,
            'name': clean_name,
            'vendor': clean_vendor,
            'handle': slugify(f"{clean_vendor}-{clean_name}")[:100],
            'price_amp': m_amp['price_brl'] if m_amp else '',
            'price_ort': m_ort['price_brl'] if m_ort else '',
            'price_final_brl': f'{final:.2f}' if final else '',
            'price_confidence': confidence,
            'image_url': image_url,
            'match_url_amp': m_amp['url'] if m_amp else '',
            'match_url_ort': m_ort['url'] if m_ort else '',
        })

    log.info('Match em ambas: %d · em uma: %d · em nenhuma: %d', matched_both, matched_one, matched_none)

    with out.open('w', encoding='utf-8', newline='') as f:
        fields = list(enriched[0].keys()) if enriched else []
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(enriched)
    log.info('Saída: %s', out)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
