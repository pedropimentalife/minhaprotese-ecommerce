# Especificação do endpoint da IA do WhatsApp

Quando a IA estiver treinada, ela precisa expor um endpoint HTTP que o widget flutuante
do site (`snippets/whatsapp-floating.liquid`) consome. Esta é a especificação.

## Contrato

```
POST <ai_endpoint>
Content-Type: application/json
Origin: https://minhaprotese.com.br
```

### Request body

```json
{
  "message": "Texto que o usuário digitou no chat.",
  "page": "/products/joelho-3r80-ottobock",
  "session_id": "anonimo-uuid-opcional",
  "user_context": {
    "cart_count": 0,
    "recent_product_handles": ["liner-iceross-comfort", "pe-pro-flex"]
  }
}
```

`message` é obrigatório; os demais são opcionais.

### Response body (200 OK)

```json
{
  "reply": "Texto puro de resposta. Sem HTML, sem markdown — o widget renderiza com quebras de linha simples.",
  "suggested_products": [
    { "handle": "liner-iceross-comfort-locking", "reason": "match com seu nível K2" }
  ],
  "handoff_to_human": false
}
```

- `reply` (obrigatório): texto que aparece no chat.
- `suggested_products` (opcional): array de produtos para o front exibir como sugestão.
- `handoff_to_human` (opcional): se `true`, o widget destaca o botão "Falar no WhatsApp agora".

### Erros

- `400` — Request mal formado. O widget mostra mensagem genérica e empurra para WhatsApp humano.
- `429` — Rate limit. O widget aguarda 5s e tenta de novo, depois empurra para WhatsApp.
- `5xx` — Falha do servidor. O widget mostra "estamos sem conexão com o assistente" e
  empurra para WhatsApp humano.

## Diretrizes para a IA

### Persona
- Equipe técnica acolhedora. **Calma**, **específica**, **conversacional**.
- Português do Brasil, sem exclamações.
- Trata paciente E familiar com igual cuidado.

### O que a IA deve fazer
- Esclarecer dúvida técnica geral (o que é um liner, diferença entre TT e TF, etc.).
- Sugerir produtos a partir do nível de mobilidade descrito (K1–K4).
- Explicar prazos de entrega e formas de pagamento.
- Orientar como solicitar nota fiscal, troca, devolução.

### O que a IA NÃO deve fazer
- Dar prescrição clínica ("você deveria usar X"). Encaminhar para protesista.
- Comprometer prazos sem checar estoque real.
- Comprometer preço sem confirmar (preço varia por variante).
- Inventar componente que não existe no catálogo.

### Quando encaminhar para humano (`handoff_to_human: true`)

- Usuário pediu para falar com humano.
- Pergunta sobre prescrição clínica.
- Pedido de orçamento personalizado de prótese completa.
- Reclamação ou problema com pedido específico.
- Dúvida sobre cirurgia, recuperação pós-amputação, dor.

## Sugestão de stack

- **LLM**: Claude Opus 4.7 ou Sonnet 4.6 (Sonnet por custo, Opus para qualidade máxima de
  conversa consultiva).
- **Base de conhecimento**: índice vetorial dos PDFs dos fornecedores (ver pasta
  `Tabelas 2026`) + FAQs internos da equipe.
- **Hosting**: Vercel Functions, Cloudflare Workers, ou Render. Latência < 3s ideal.
- **Logging**: salvar todas as conversas (sem dados pessoais) para fine-tuning futuro.

## Exemplo de implementação (Node.js + Anthropic SDK)

```js
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req) {
  const { message, page, user_context } = await req.json();

  const systemPrompt = `Você é o atendimento da loja minha prótese.
Calma, específica, em português brasileiro. Não use exclamações.
Não dê prescrição clínica — encaminhe para um protesista quando o usuário pedir conselho.
Catálogo atual: [resumo do CSV de produtos]`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: systemPrompt,
    messages: [{ role: 'user', content: `Página: ${page}\n\n${message}` }],
  });

  return Response.json({
    reply: response.content[0].text,
    handoff_to_human: false,
  });
}
```
