"""
consolidate_variants.py
========================
Agrupa SKUs duplicados em produtos-pai com variantes.

Estratégia:
  1. Carrega products_priced.csv (com title/image inherited do benchmark)
  2. Carrega raw_products_clean.csv (nomes originais dos PDFs)
  3. Cluster por (vendor, image_url) quando imagem existe
  4. Para cada cluster, examina nomes ORIGINAIS do PDF dos seus membros
  5. Extrai eixo de variação:
       - Espessura (3mm / 6mm / 9mm)
       - Tamanho (P / M / G / GG / 1 / 2 / 3 ...)
       - Modelo (TT / TF, com conexão / sem conexão)
       - Se nada óbvio: usa o SKU como rótulo de variante
  6. Produto-pai herda título, imagem e preço médio do cluster
  7. Cada SKU vira uma variante com nome derivado dos eixos detectados

Saídas:
  - catalog/catalog_consolidated.json  — para a SPA (parent + variants)
  - catalog/shopify_consolidated.csv   — para importação Shopify (multi-linha)
  - catalog/audit_duplicates.md        — relatório do que foi consolidado

Uso:
    python3.11 consolidate_variants.py
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import re
import sys
from collections import defaultdict, Counter
from pathlib import Path

from slugify import slugify


logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('consolidate')


# Padrões para detectar eixos de variação nos nomes originais

THICKNESS_RE = re.compile(r'\b(\d+)\s*mm\b', re.IGNORECASE)
SIZE_LETTER_RE = re.compile(r'\b(PP|GG|XG|XS|XL|M|G|P)\b')   # tamanhos por letra
SIZE_NUM_RE = re.compile(r'\b(?:tam\.?\s*|TAM\s*)?(\d{1,2})\b')
CONNECTION_RE = re.compile(r'(com\s+conex|sem\s+conex|c/?\s*conex|s/?\s*conex)', re.IGNORECASE)
LATERAL_RE = re.compile(r'\b(esquerd|direit|bilateral)\w*', re.IGNORECASE)
TYPE_TT_TF_RE = re.compile(r'\b(TT|TF|transtibial|transfemoral)\b', re.IGNORECASE)
COLOR_RE = re.compile(r'\b(bege|preto|preta|cinza|verde|azul|branco|branca|vermelh\w+)\b', re.IGNORECASE)


def normalize_axis_value(s: str) -> str:
    return re.sub(r'\s+', ' ', s).strip().lower()


def detect_variant_axis(names: list[str], skus: list[str]) -> tuple[str, list[str]]:
    """
    Dado N nomes originais (do PDF) e seus SKUs, tenta identificar o eixo
    em que variam. Retorna (rótulo do eixo, lista de valores na ordem dos nomes).

    Se não conseguir detectar um eixo claro, devolve ('Código', skus).
    """
    if not names:
        return ('Código', skus)

    # Tenta espessura
    thicknesses = [THICKNESS_RE.search(n) for n in names]
    if all(thicknesses) and len(set(t.group(1) for t in thicknesses)) > 1:
        return ('Espessura', [f'{t.group(1)} mm' for t in thicknesses])

    # Tenta conexão (com/sem)
    conns = [CONNECTION_RE.search(n) for n in names]
    if all(conns):
        vals = []
        for c in conns:
            raw = c.group(0).lower()
            if 'sem' in raw or 's/' in raw:
                vals.append('Sem conexão')
            else:
                vals.append('Com conexão')
        if len(set(vals)) > 1:
            return ('Conexão', vals)

    # Tenta tipo TT/TF (transtibial/transfemoral)
    types = [TYPE_TT_TF_RE.search(n) for n in names]
    if all(types):
        vals = []
        for t in types:
            raw = t.group(0).upper()
            if 'TT' in raw or 'TRANSTIBIAL' in raw.upper():
                vals.append('Transtibial')
            elif 'TF' in raw or 'TRANSFEMORAL' in raw.upper():
                vals.append('Transfemoral')
            else:
                vals.append(raw)
        if len(set(vals)) > 1:
            return ('Tipo', vals)

    # Tenta lateralidade
    laterals = [LATERAL_RE.search(n) for n in names]
    if all(laterals) and len(set(l.group(0).lower()[:5] for l in laterals)) > 1:
        vals = ['Direito' if 'direit' in l.group(0).lower() else 'Esquerdo' if 'esquerd' in l.group(0).lower() else 'Bilateral' for l in laterals]
        return ('Lado', vals)

    # Tenta cor
    colors = [COLOR_RE.search(n) for n in names]
    if all(colors) and len(set(c.group(1).lower() for c in colors)) > 1:
        return ('Cor', [c.group(1).capitalize() for c in colors])

    # Tenta tamanho por letra
    sizes_l = [SIZE_LETTER_RE.search(n) for n in names]
    if sum(1 for s in sizes_l if s) >= len(names) * 0.7:
        vals = [(s.group(1) if s else '—') for s in sizes_l]
        if len(set(vals)) > 1:
            return ('Tamanho', vals)

    # Tenta tamanho numérico no SKU
    sku_nums = []
    for sku in skus:
        m = re.search(r'(?<![A-Z])(\d{2,3})(?![A-Z]\d)', sku)
        sku_nums.append(m.group(1) if m else None)
    if all(sku_nums) and len(set(sku_nums)) > 1 and len(set(sku_nums)) == len(skus):
        return ('Tamanho', sku_nums)

    # Fallback: usar o próprio SKU como rótulo da variante (é o que o catálogo
    # original do fornecedor faz quando os códigos variam por algo só ele entende)
    return ('Código', skus)


def base_name_for_cluster(name: str) -> str:
    """
    Normaliza um nome para agrupar variantes do mesmo produto.
    Remove medidas (3mm, 6mm, 9mm), tamanhos (P/M/G/GG, 22/24/26), parênteses
    com unidade, lateralidade, conexão. Mantém o "núcleo semântico".
    """
    s = name.lower()
    # Remove medidas
    s = re.sub(r'\d+(\.\d+)?\s*(mm|cm|kg|g|"|”)\b', '', s)
    # Remove unidade entre parênteses
    s = re.sub(r'\(\s*(un|par|pç|peça)\s*\)', '', s)
    # Remove tamanhos por letra
    s = re.sub(r'\b(PP|GG|XG|XS|XL|P|M|G)\b', '', s, flags=re.IGNORECASE)
    # Remove tamanhos numéricos (até 3 dígitos isolados)
    s = re.sub(r'\b\d{1,3}\b', '', s)
    # Remove "com conex" / "sem conex"
    s = re.sub(r'(com|sem|c/|s/)\s*conex\w*', '', s, flags=re.IGNORECASE)
    # Remove cores
    s = re.sub(r'\b(bege|preto|preta|cinza|verde|azul|branco|branca|vermelh\w+)\b', '', s, flags=re.IGNORECASE)
    # Remove lateral
    s = re.sub(r'\b(esquerd|direit)\w+', '', s, flags=re.IGNORECASE)
    # Remove TT/TF (mantém em outro eixo)
    s = re.sub(r'\b(TT|TF|transtibial|transfemoral)\b', '', s, flags=re.IGNORECASE)
    # Remove pontuação solta e espaços
    s = re.sub(r'[,\.\-\/\(\)]+', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def consolidate(priced_path: Path, raw_path: Path) -> tuple[list[dict], dict]:
    """
    Retorna (lista de produtos consolidados, stats do processo)
    """
    with priced_path.open(encoding='utf-8') as f:
        priced = list(csv.DictReader(f))

    with raw_path.open(encoding='utf-8') as f:
        raw_rows = list(csv.DictReader(f))

    # Index dos nomes originais por SKU
    raw_by_sku = {(r['vendor'], r['sku']): r for r in raw_rows}

    # Passo 1: agrupa por imagem (match forte com benchmark)
    by_image: dict[tuple, list[dict]] = defaultdict(list)
    no_image: list[dict] = []

    for r in priced:
        if r.get('image_url'):
            by_image[(r['vendor'], r['image_url'])].append(r)
        else:
            no_image.append(r)

    # Passo 2: dentro dos sem-imagem, agrupa por nome-base do PDF original
    by_base_name: dict[tuple, list[dict]] = defaultdict(list)
    singletons: list[dict] = []

    for r in no_image:
        raw = raw_by_sku.get((r['vendor'], r['sku']))
        pdf_name = raw['name'] if raw else r['name']
        base = base_name_for_cluster(pdf_name)
        if len(base) < 8:  # nome-base muito curto — provavelmente único
            singletons.append(r)
            continue
        by_base_name[(r['vendor'], base)].append(r)

    # Move clusters de 1 para singletons
    for key, members in list(by_base_name.items()):
        if len(members) == 1:
            singletons.append(members[0])
            del by_base_name[key]

    consolidated: list[dict] = []
    stats = {
        'image_clusters': 0,
        'name_clusters': 0,
        'cluster_members': 0,
        'singletons': 0,
        'total_products_before': len(priced),
        'total_parents_after': 0,
    }

    def make_parent(members: list[dict], image: str, source: str):
        """Constrói produto-pai a partir de membros de um cluster."""
        # Pega nomes originais do PDF (não o herdado do benchmark)
        original_names = []
        sku_list = []
        for m in members:
            sku_list.append(m['sku'])
            raw = raw_by_sku.get((m['vendor'], m['sku']))
            original_names.append(raw['name'] if raw else m['name'])

        axis_label, axis_values = detect_variant_axis(original_names, sku_list)

        # Título do parent: prefere o herdado do benchmark se for cluster de imagem
        # (significa que houve match strong, título é confiável). Senão, usa o nome
        # original do PDF do membro mais "limpo" (mais curto e descritivo).
        if source == 'image' and members[0].get('image_url'):
            parent_title = members[0]['name']
        else:
            # Pega o nome original mais curto (geralmente mais limpo)
            shortest = min(original_names, key=lambda n: len(n))
            parent_title = shortest
            # Limpa medidas se eixo é espessura
            if axis_label == 'Espessura':
                parent_title = THICKNESS_RE.sub('', parent_title).strip(' ,-')
            parent_title = re.sub(r'\s+', ' ', parent_title)

        prices = [float(m['price_final_brl']) for m in members if m.get('price_final_brl')]
        avg_price = sum(prices) / len(prices) if prices else 0
        min_price = min(prices) if prices else 0
        max_price = max(prices) if prices else 0
        any_active = any(m.get('price_final_brl') for m in members)

        variants = []
        for i, m in enumerate(members):
            variants.append({
                'sku': m['sku'],
                'value': axis_values[i] if i < len(axis_values) else m['sku'],
                'price': m.get('price_final_brl', ''),
                'original_name': original_names[i],
            })
        seen_values = set()
        deduped = []
        for v in variants:
            if v['value'] in seen_values:
                v['value'] = f"{v['value']} ({v['sku']})"
            seen_values.add(v['value'])
            deduped.append(v)
        variants = deduped

        handle = slugify(f"{members[0]['vendor']}-{parent_title}")[:90]

        return {
            'handle': handle,
            'title': parent_title,
            'vendor': members[0]['vendor'],
            'type': '',
            'image': image,
            'price_min': f'{min_price:.2f}' if min_price else '',
            'price_max': f'{max_price:.2f}' if max_price else '',
            'price_avg': f'{avg_price:.2f}' if avg_price else '',
            'status': 'active' if any_active else 'draft',
            'variant_axis': axis_label,
            'variants': variants,
            'cluster_size': len(members),
            'cluster_source': source,
        }

    # Processa clusters de imagem
    for (vendor, img), members in by_image.items():
        if len(members) == 1:
            singletons.append(members[0])
            continue
        stats['image_clusters'] += 1
        stats['cluster_members'] += len(members)
        consolidated.append(make_parent(members, img, 'image'))

    # Processa clusters de nome-base
    for (vendor, base), members in by_base_name.items():
        stats['name_clusters'] += 1
        stats['cluster_members'] += len(members)
        consolidated.append(make_parent(members, '', 'name'))

    # Agora processa singletons
    for r in singletons:
        stats['singletons'] += 1
        raw = raw_by_sku.get((r['vendor'], r['sku']))
        original = raw['name'] if raw else r['name']
        consolidated.append({
            'handle': slugify(f"{r['vendor']}-{r['name']}")[:90],
            'title': r['name'],
            'vendor': r['vendor'],
            'type': '',
            'image': r.get('image_url', ''),
            'price_min': r.get('price_final_brl', ''),
            'price_max': r.get('price_final_brl', ''),
            'price_avg': r.get('price_final_brl', ''),
            'status': 'active' if r.get('price_final_brl') else 'draft',
            'variant_axis': '',
            'variants': [{
                'sku': r['sku'],
                'value': 'Único',
                'price': r.get('price_final_brl', ''),
                'original_name': original,
            }],
            'cluster_size': 1,
        })

    stats['total_parents_after'] = len(consolidated)
    return consolidated, stats


def write_audit(consolidated: list[dict], path: Path, stats: dict) -> None:
    big_clusters = [p for p in consolidated if p['cluster_size'] > 1]
    big_clusters.sort(key=lambda p: -p['cluster_size'])

    lines = [
        '# Audit de duplicações — minha prótese',
        '',
        f"**Antes**: {stats['total_products_before']} SKUs",
        f"**Depois**: {stats['total_parents_after']} produtos-pai (redução de {stats['total_products_before'] - stats['total_parents_after']} linhas duplicadas)",
        f"**Clusters por imagem (match SKU benchmark)**: {stats['image_clusters']}",
        f"**Clusters por nome do PDF**: {stats['name_clusters']}",
        f"**SKUs agrupados em variantes**: {stats['cluster_members']}",
        f"**Singletons (produtos únicos)**: {stats['singletons']}",
        '',
        '## Clusters consolidados',
        '',
    ]

    for p in big_clusters[:50]:
        lines.append(f"### {p['vendor']} · {p['title']}")
        lines.append(f"- Eixo de variação detectado: **{p['variant_axis']}**")
        lines.append(f"- Variantes: {p['cluster_size']}")
        lines.append(f"- Preço: R$ {p['price_min']} – R$ {p['price_max']} (média R$ {p['price_avg']})")
        lines.append('')
        lines.append('| Variante | SKU | Preço | Nome original do PDF |')
        lines.append('|---|---|---|---|')
        for v in p['variants'][:10]:
            lines.append(f"| {v['value']} | `{v['sku']}` | R$ {v['price'] or '—'} | {v['original_name'][:60]} |")
        if len(p['variants']) > 10:
            lines.append(f"| ... | _+{len(p['variants']) - 10} variantes_ | | |")
        lines.append('')

    path.write_text('\n'.join(lines), encoding='utf-8')


def write_shopify_csv(consolidated: list[dict], path: Path) -> None:
    """Formato Shopify multi-linha: 1 linha por variante, primeira tem o produto completo."""
    fields = [
        'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Type', 'Tags',
        'Published', 'Option1 Name', 'Option1 Value', 'Variant SKU',
        'Variant Inventory Tracker', 'Variant Inventory Qty', 'Variant Inventory Policy',
        'Variant Fulfillment Service', 'Variant Price', 'Variant Requires Shipping',
        'Variant Taxable', 'Image Src', 'Image Alt Text', 'Status'
    ]

    with path.open('w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for p in consolidated:
            for i, v in enumerate(p['variants']):
                is_first = (i == 0)
                row = {f: '' for f in fields}
                row['Handle'] = p['handle']
                if is_first:
                    row['Title'] = p['title']
                    row['Body (HTML)'] = f"<p>{p['title']} — distribuído pela minha prótese com nota fiscal e garantia de origem da {p['vendor']}.</p>"
                    row['Vendor'] = p['vendor']
                    row['Product Category'] = 'Health & Beauty > Health Care > Mobility & Accessibility'
                    row['Type'] = ''
                    row['Tags'] = p['vendor']
                    row['Published'] = 'TRUE'
                    row['Image Src'] = p['image']
                    row['Image Alt Text'] = p['title']
                    row['Status'] = p['status']
                row['Option1 Name'] = p['variant_axis'] or 'Título'
                row['Option1 Value'] = v['value']
                row['Variant SKU'] = v['sku']
                row['Variant Inventory Tracker'] = 'shopify'
                row['Variant Inventory Qty'] = '0'
                row['Variant Inventory Policy'] = 'deny'
                row['Variant Fulfillment Service'] = 'manual'
                row['Variant Price'] = v['price']
                row['Variant Requires Shipping'] = 'TRUE'
                row['Variant Taxable'] = 'TRUE'
                w.writerow(row)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument('--priced', default='../catalog/products_priced.csv')
    p.add_argument('--raw', default='../catalog/raw_products_clean.csv')
    p.add_argument('--out-json', default='../catalog/catalog_consolidated.json')
    p.add_argument('--out-csv', default='../catalog/shopify_consolidated.csv')
    p.add_argument('--out-audit', default='../catalog/audit_duplicates.md')
    args = p.parse_args()

    consolidated, stats = consolidate(Path(args.priced).resolve(), Path(args.raw).resolve())

    Path(args.out_json).resolve().write_text(json.dumps(consolidated, ensure_ascii=False, indent=2), encoding='utf-8')
    write_shopify_csv(consolidated, Path(args.out_csv).resolve())
    write_audit(consolidated, Path(args.out_audit).resolve(), stats)

    log.info('Antes: %d SKUs · Depois: %d produtos-pai (redução: %d)',
             stats['total_products_before'], stats['total_parents_after'],
             stats['total_products_before'] - stats['total_parents_after'])
    log.info('Clusters de imagem (match forte): %d', stats['image_clusters'])
    log.info('Clusters de nome (PDF original): %d', stats['name_clusters'])
    log.info('Total de SKUs em clusters: %d', stats['cluster_members'])
    log.info('Singletons (produtos únicos): %d', stats['singletons'])

    # Distribuição de variantes
    sizes = Counter(p['cluster_size'] for p in consolidated)
    log.info('Distribuição de variantes por produto:')
    for sz in sorted(sizes.keys())[:10]:
        log.info('  %d variante(s): %d produtos', sz, sizes[sz])

    return 0


if __name__ == '__main__':
    sys.exit(main())
