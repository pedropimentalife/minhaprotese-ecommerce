#!/usr/bin/env node
/**
 * Converte o CSV de produtos do pipeline Python (catalog/shopify_products_import.csv)
 * para JSON enxuto que o endpoint da IA usa como knowledge-base.
 *
 * Uso:
 *   node scripts/build-catalog.mjs ../catalog/shopify_products_import.csv data/catalog.json
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const src = args[0] || '../catalog/shopify_products_import.csv';
const dst = args[1] || 'data/catalog.json';

function parseCSV(text) {
  // Parser CSV simples — suficiente pro nosso caso (Shopify CSV é bem comportado)
  const lines = text.split(/\r?\n/).filter(l => l.length);
  const header = parseLine(lines[0]);
  return lines.slice(1).map(l => {
    const cols = parseLine(l);
    const row = {};
    header.forEach((h, i) => { row[h] = cols[i] || ''; });
    return row;
  });
}

function parseLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQ = false; }
      else { cur += c; }
    } else {
      if (c === ',') { out.push(cur); cur = ''; }
      else if (c === '"') { inQ = true; }
      else { cur += c; }
    }
  }
  out.push(cur);
  return out;
}

const text = await fs.readFile(src, 'utf-8');
const rows = parseCSV(text);

const products = rows.map(r => ({
  handle: r['Handle'],
  title: r['Title'],
  sku: r['Variant SKU'],
  vendor: r['Vendor'],
  type: r['Type'],
  price: r['Variant Price'],
  status: r['Status'],
  description: (r['Body (HTML)'] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 280),
}));

await fs.mkdir(path.dirname(dst), { recursive: true });
await fs.writeFile(dst, JSON.stringify(products, null, 2));
console.log(`OK: ${products.length} produtos → ${dst}`);
