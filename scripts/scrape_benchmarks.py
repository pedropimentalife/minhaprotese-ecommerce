"""
scrape_benchmarks.py
====================
Coleta preços públicos de produtos em:
  - lojadoamputado.com.br
  - lojaortopedica.com.br

Estratégia:
  - Faz crawl do sitemap.xml de cada loja.
  - Para cada URL de produto, extrai title, SKU (se houver), preço e marca usando seletores
    típicos do tema e fallback para schema.org/Product JSON-LD.
  - Salva em catalog/benchmark_prices.csv com colunas:
      shop, url, title, vendor, sku_or_name_hash, price_brl, scraped_at

Respeito a robots.txt e taxa: 1 req/segundo. Não tente acelerar — preferir gentileza.

Uso:
    python3 scrape_benchmarks.py [--out CSV]
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import logging
import re
import sys
import time
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from xml.etree import ElementTree as ET

import requests
from bs4 import BeautifulSoup


logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('scrape')

USER_AGENT = 'minhaprotese-research/1.0 (+contato@minhaprotese.com.br)'
HEADERS = {'User-Agent': USER_AGENT, 'Accept-Language': 'pt-BR,pt;q=0.9'}
REQUEST_DELAY_S = 1.0
SHOPS = [
    # lojadoamputado roda em Loja Integrada — sitemap-index aponta para product-N.xml.
    # URL de produto: /<categoria>/<slug>  (sem prefixo /produto/)
    {
        'name': 'lojadoamputado',
        'sitemap': 'https://www.lojadoamputado.com.br/sitemap.xml',
        'sub_sitemap_filter': 'product',
        'url_exclude': ['/sitemap', '/brand', '/category', '/sitemap-custom'],
        'url_must_contain': None,
    },
    # lojaortopedica também é Loja Integrada — mas sub-sitemaps se chamam sitemap_N.xml
    # e URLs de produto têm o prefixo /produto/.
    {
        'name': 'lojaortopedica',
        'sitemap': 'https://www.lojaortopedica.com.br/sitemap.xml',
        'sub_sitemap_filter': None,
        'url_exclude': [],
        'url_must_contain': '/produto/',
    },
]


@dataclass
class Row:
    shop: str
    url: str
    title: str
    vendor: str
    sku_or_name_hash: str
    price_brl: str
    image_url: str
    scraped_at: str


def fetch(url: str) -> str | None:
    try:
        r = requests.get(url, headers=HEADERS, timeout=30)
        if r.status_code != 200:
            log.warning('HTTP %d em %s', r.status_code, url)
            return None
        # Server às vezes manda UTF-8 BOM mas sem Content-Type — força UTF-8
        body = r.content
        if body.startswith(b'\xef\xbb\xbf'):
            body = body[3:]
        try:
            return body.decode('utf-8')
        except UnicodeDecodeError:
            return body.decode('latin-1', errors='replace')
    except Exception as exc:
        log.warning('Falha em %s: %s', url, exc)
        return None
    finally:
        time.sleep(REQUEST_DELAY_S)


def iter_sitemap(url: str, sub_filter: str | None = None, url_exclude: list[str] | None = None, url_must_contain: str | None = None):
    """
    Itera um sitemap, expandindo sitemap-index quando houver.
    sub_filter: se definido, só desce em sub-sitemaps cuja URL contenha essa string.
    url_exclude: pula URLs que contenham qualquer um desses fragmentos.
    url_must_contain: se definido, só retorna URLs que contenham essa string.
    """
    raw = fetch(url)
    if not raw:
        return
    # remove BOM e espaços iniciais que podem quebrar o parser
    raw = raw.lstrip('﻿').lstrip()
    try:
        root = ET.fromstring(raw)
    except ET.ParseError as exc:
        log.warning('Sitemap inválido %s: %s', url, exc)
        return
    ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

    # sitemap-index
    for sm in root.findall('sm:sitemap/sm:loc', ns):
        sub = (sm.text or '').strip()
        if not sub:
            continue
        if sub_filter and sub_filter not in sub:
            continue
        yield from iter_sitemap(sub, sub_filter, url_exclude, url_must_contain)

    # urlset
    for u in root.findall('sm:url/sm:loc', ns):
        loc = (u.text or '').strip()
        if not loc:
            continue
        if url_exclude and any(frag in loc for frag in url_exclude):
            continue
        if url_must_contain and url_must_contain not in loc:
            continue
        # Página raiz "/" não é produto
        path = urlparse(loc).path
        if path in ('', '/'):
            continue
        yield loc


def parse_money_brl(s: str) -> str:
    """Aceita '1.234,56', '2920.09', 'R$ 1234,56'. Devolve '1234.56' ou ''."""
    s = re.sub(r'[^\d\.,]', '', s)
    if not s:
        return ''
    # Se tem vírgula = formato BR (1.234,56). Se só ponto e parece decimal (2920.09), trata como tal.
    if ',' in s:
        s = s.replace('.', '').replace(',', '.')
    # else: já está em formato com ponto decimal
    try:
        return f'{float(s):.2f}'
    except ValueError:
        return ''


def extract_product(html: str, url: str, shop: str) -> Row | None:
    soup = BeautifulSoup(html, 'lxml')

    # Tenta JSON-LD primeiro (mais confiável)
    ld_title = ld_price = ld_vendor = ld_sku = ld_image = ''
    for tag in soup.find_all('script', type='application/ld+json'):
        try:
            data = json.loads(tag.string or '{}')
        except Exception:
            continue
        items = data if isinstance(data, list) else [data]
        for it in items:
            if not isinstance(it, dict):
                continue
            t = it.get('@type')
            if t == 'Product' or (isinstance(t, list) and 'Product' in t):
                ld_title = it.get('name') or ld_title
                ld_sku = (it.get('sku') or it.get('mpn') or ld_sku) or ''
                img = it.get('image')
                if isinstance(img, list) and img:
                    ld_image = img[0] if isinstance(img[0], str) else (img[0].get('url') if isinstance(img[0], dict) else '')
                elif isinstance(img, str):
                    ld_image = img
                elif isinstance(img, dict):
                    ld_image = img.get('url', '') or ld_image
                brand = it.get('brand')
                if isinstance(brand, dict):
                    ld_vendor = brand.get('name') or ld_vendor
                elif isinstance(brand, str):
                    ld_vendor = brand or ld_vendor
                offers = it.get('offers') or {}
                if isinstance(offers, list):
                    offers = offers[0] if offers else {}
                if isinstance(offers, dict):
                    p = offers.get('price') or offers.get('lowPrice')
                    if p:
                        ld_price = parse_money_brl(str(p).replace('.', ','))

    # Fallback: meta tags / itemprop (Loja Integrada usa muito itemprop)
    if not ld_title:
        og = soup.find('meta', property='og:title')
        ld_title = (og.get('content') if og else '') or ''
        if not ld_title:
            h1 = soup.find('h1')
            ld_title = h1.get_text(strip=True) if h1 else ''
    if not ld_price:
        # 1. itemprop="price" (Loja Integrada)
        ip = soup.select_one('meta[itemprop="price"], [itemprop="price"]')
        if ip:
            raw = ip.get('content') or ip.get_text(strip=True)
            if raw:
                ld_price = parse_money_brl(raw)
        # 2. product:price:amount (Facebook OG product)
        if not ld_price:
            meta = soup.find('meta', property='product:price:amount') or soup.find('meta', attrs={'name': 'product:price:amount'})
            if meta and meta.get('content'):
                ld_price = parse_money_brl(meta['content'])
    if not ld_vendor:
        br = soup.select_one('[itemprop="brand"], meta[itemprop="brand"]')
        if br:
            ld_vendor = (br.get('content') or br.get_text(strip=True))[:60]
    if not ld_sku:
        sk = soup.select_one('[itemprop="sku"], meta[itemprop="sku"]')
        if sk:
            ld_sku = (sk.get('content') or sk.get_text(strip=True))[:60]
    if not ld_image:
        # og:image, ou primeira imagem com itemprop="image"
        ogi = soup.find('meta', property='og:image')
        if ogi and ogi.get('content'):
            ld_image = ogi['content']
        else:
            ipi = soup.select_one('img[itemprop="image"], [itemprop="image"] img, .produto-foto img, .product-image img')
            if ipi:
                ld_image = ipi.get('src') or ipi.get('data-src') or ''

    if not ld_title or not ld_price:
        return None

    sku_key = ld_sku.strip() if ld_sku else hashlib.md5(ld_title.encode('utf-8')).hexdigest()[:10]
    # Normaliza URL relativa de imagem
    img = ld_image
    if img and img.startswith('//'):
        img = 'https:' + img
    elif img and img.startswith('/'):
        from urllib.parse import urlparse
        p = urlparse(url)
        img = f'{p.scheme}://{p.netloc}{img}'

    return Row(
        shop=shop,
        url=url,
        title=ld_title.strip(),
        vendor=ld_vendor.strip(),
        sku_or_name_hash=sku_key,
        price_brl=ld_price,
        image_url=img or '',
        scraped_at=datetime.now(timezone.utc).isoformat(timespec='seconds'),
    )


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument('--out', default='../catalog/benchmark_prices.csv')
    p.add_argument('--limit', type=int, default=0, help='Máximo de URLs por loja (0 = sem limite)')
    args = p.parse_args()

    out = Path(args.out).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)

    rows: list[Row] = []
    for shop in SHOPS:
        log.info('=== %s ===', shop['name'])
        count = 0
        urls = iter_sitemap(
            shop['sitemap'],
            sub_filter=shop.get('sub_sitemap_filter'),
            url_exclude=shop.get('url_exclude'),
            url_must_contain=shop.get('url_must_contain'),
        )
        for product_url in urls:
            if args.limit and count >= args.limit:
                break
            html = fetch(product_url)
            if not html:
                continue
            r = extract_product(html, product_url, shop['name'])
            if r:
                rows.append(r)
                count += 1
                if count % 20 == 0:
                    log.info('  %s: %d produtos', shop['name'], count)
        log.info('%s: total %d', shop['name'], count)

    with out.open('w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['shop', 'url', 'title', 'vendor', 'sku_or_name_hash', 'price_brl', 'image_url', 'scraped_at'])
        w.writeheader()
        for r in rows:
            w.writerow(asdict(r))
    log.info('Saída: %s (%d linhas)', out, len(rows))
    return 0


if __name__ == '__main__':
    sys.exit(main())
