/**
 * Carrega o catálogo de produtos (CSV gerado pelo pipeline Python) e oferece
 * uma busca simples por keywords para passar como contexto à IA.
 *
 * Em produção, recomenda-se substituir a busca por:
 *  - Embeddings + busca semântica (Pinecone, Supabase pgvector, etc.), ou
 *  - Algolia (já familiar para times Shopify)
 *
 * Esta implementação simples já é suficiente para um catálogo de ~1000 SKUs.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = process.env.CATALOG_CSV || path.join(__dirname, '../data/catalog.json');

let cachedCatalog = null;

async function loadCatalog() {
  if (cachedCatalog) return cachedCatalog;
  try {
    const raw = await fs.readFile(CATALOG_PATH, 'utf-8');
    cachedCatalog = JSON.parse(raw);
    console.log(`[knowledge-base] carregados ${cachedCatalog.length} produtos`);
  } catch (err) {
    console.warn(`[knowledge-base] catálogo não encontrado em ${CATALOG_PATH}; usando vazio`);
    cachedCatalog = [];
  }
  return cachedCatalog;
}

/**
 * Normaliza para busca: minúsculas, sem acentos, sem pontuação.
 */
function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Score simples: para cada palavra de N+ caracteres na query que aparece no produto,
 * soma +1. Marca/SKU dão +2. Empate desempata pelo preço (preferir o mais barato).
 */
function scoreProduct(query, product) {
  const q = normalize(query);
  const tokens = q.split(' ').filter(t => t.length >= 3);
  if (tokens.length === 0) return 0;

  const haystack = normalize(`${product.title} ${product.vendor} ${product.sku} ${product.description || ''}`);
  let score = 0;
  for (const tok of tokens) {
    if (haystack.includes(tok)) {
      // SKU literal ou marca = peso 2
      if (normalize(product.sku).includes(tok) || normalize(product.vendor).includes(tok)) {
        score += 2;
      } else {
        score += 1;
      }
    }
  }
  return score;
}

/**
 * Busca top-K produtos para uma query.
 */
export async function searchCatalog(query, limit = 12) {
  const all = await loadCatalog();
  if (all.length === 0) return [];

  const scored = all
    .map(p => ({ p, s: scoreProduct(query, p) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || (parseFloat(a.p.price || 0) - parseFloat(b.p.price || 0)));

  return scored.slice(0, limit).map(x => x.p);
}

/**
 * Formata produtos para incluir como contexto no prompt.
 */
export function formatCatalogContext(products) {
  if (!products || products.length === 0) return '';
  return products
    .map(p => {
      const price = p.price ? `R$ ${parseFloat(p.price).toFixed(2).replace('.', ',')}` : 'sob consulta';
      const status = p.status === 'active' ? 'disponível' : 'sob consulta';
      return `- [${p.vendor}] ${p.title} · SKU ${p.sku} · ${price} · ${status}\n  /products/${p.handle}`;
    })
    .join('\n');
}
