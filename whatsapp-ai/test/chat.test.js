/**
 * Teste manual do endpoint — roda como:
 *   ANTHROPIC_API_KEY=sk-... node test/chat.test.js
 *
 * Verifica três cenários: (a) dúvida técnica, (b) pedido de orçamento, (c) sinal de handoff.
 */

import handler from '../api/chat.js';

function mockReq(body) {
  return { method: 'POST', body };
}
function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(s) { this.statusCode = s; return this; },
    json(d) { this.body = d; return this; },
    end() { return this; },
  };
}

const cases = [
  { message: 'O que é um liner transtibial?' },
  { message: 'Preciso de um joelho hidráulico para meu pai, ele anda em casa e na padaria. K2.' },
  { message: 'Estou com dor no coto e meu encaixe está apertando.' },  // deve ativar handoff
];

for (const c of cases) {
  const res = mockRes();
  console.log('\n--- Q:', c.message);
  await handler(mockReq(c), res);
  console.log('  status:', res.statusCode);
  console.log('  handoff:', res.body?.handoff_to_human);
  console.log('  reply:', (res.body?.reply || '').slice(0, 300));
}
