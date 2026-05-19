/**
 * POST /api/chat — endpoint do assistente IA da loja minha prótese.
 *
 * Request:  { message: string, page?: string, session_id?: string, user_context?: object }
 * Response: { reply: string, suggested_products?: [{handle, reason}], handoff_to_human: bool }
 */

import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildContextMessage } from '../lib/system-prompt.js';
import { searchCatalog, formatCatalogContext } from '../lib/knowledge-base.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS || '700', 10);

// Palavras-chave que sugerem encaminhamento para humano (heurística secundária — o modelo
// é o primário, isso só pega cases extremos).
const HANDOFF_KEYWORDS = [
  'humano', 'pessoa real', 'atendente', 'falar com alguem',
  'dor', 'sangrando', 'sangrar', 'inchado', 'inflamado', 'infeccionado',
  'reclamacao', 'reclamação', 'cancelar pedido', 'devolver', 'devolução',
  'cirurgia', 'amputar', 'depressao', 'depressão',
];

function hasHandoffSignal(text) {
  const t = (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return HANDOFF_KEYWORDS.some(k => t.includes(k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')));
}

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const body = req.body || {};
  const { message, page, user_context } = body;

  if (!message || typeof message !== 'string' || message.length > 2000) {
    return res.status(400).json({ error: 'invalid_message' });
  }

  try {
    // 1. Busca produtos relevantes no catálogo
    const relevant = await searchCatalog(message, 12);
    const catalogContext = formatCatalogContext(relevant);

    // 2. Chama Claude
    const userMessage = buildContextMessage({ message, page, catalogContext, userContext: user_context });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userMessage }],
    });

    const reply = (response.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    // 3. Sinais para handoff: o modelo decide pela linguagem, mas reforçamos heurística
    const handoff = hasHandoffSignal(message) || /falar.{0,10}whatsapp.{0,15}agora/i.test(reply);

    // 4. Sugestões: lista os top-3 produtos relevantes (front-end pode renderizar como cards)
    const suggested_products = relevant.slice(0, 3).map(p => ({
      handle: p.handle,
      title: p.title,
      price: p.price,
      reason: '',
    }));

    return res.status(200).json({
      reply,
      handoff_to_human: handoff,
      suggested_products,
      model: MODEL,
      usage: response.usage,
    });
  } catch (err) {
    console.error('[chat] erro:', err);
    return res.status(500).json({
      error: 'internal_error',
      reply: 'Estamos com um problema técnico aqui no assistente. Toque em "Falar no WhatsApp agora" abaixo que a equipe te responde.',
      handoff_to_human: true,
    });
  }
}
