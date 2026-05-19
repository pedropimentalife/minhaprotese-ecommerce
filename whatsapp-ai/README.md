# Assistente IA · minha prótese

Endpoint serverless (Vercel Functions / Node.js 18+) que serve o chat IA do widget
flutuante de WhatsApp da loja. Usa a API Claude (Anthropic) com o catálogo de produtos
como contexto.

## Estrutura

```
whatsapp-ai/
├── api/chat.js              POST /api/chat — endpoint principal
├── lib/system-prompt.js     A "personalidade treinada" — system prompt cuidado
├── lib/knowledge-base.js    Busca de produtos relevantes no catálogo
├── scripts/build-catalog.mjs Converte CSV Shopify → JSON de catálogo
├── data/catalog.json        Gerado por build-catalog (não comitar — fica no deploy)
├── vercel.json              CORS e config de função
├── package.json
└── .env.example             Variáveis necessárias
```

## Setup em 5 passos

1. **Instalar dependências:**
   ```bash
   cd whatsapp-ai
   npm install
   ```

2. **Configurar chave Anthropic:**
   - Crie chave em https://console.anthropic.com
   - Copie `.env.example` para `.env` e cole a chave

3. **Construir o catálogo:**
   ```bash
   node scripts/build-catalog.mjs ../catalog/shopify_products_import.csv data/catalog.json
   ```

4. **Testar local:**
   ```bash
   npm run dev
   # depois, em outra aba:
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"Preciso de um liner para meu pai, amputação transtibial. Ele tem 62 anos e anda em casa.","page":"/"}'
   ```

5. **Deploy:**
   ```bash
   vercel login
   vercel --prod
   # Anote a URL retornada — ex: https://minhaprotese-ai-chat.vercel.app/api/chat
   # No admin do Shopify, em "Endpoint do assistente IA", cole essa URL.
   ```

## Variáveis de ambiente (Vercel → Settings → Environment Variables)

| Var | Obrigatória | Default | Descrição |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | sim | — | Chave de API da Anthropic (`sk-ant-…`) |
| `CLAUDE_MODEL` | não | `claude-sonnet-4-6` | Modelo (use `claude-opus-4-7` para qualidade máxima) |
| `MAX_TOKENS` | não | `700` | Resposta máxima — 700 tokens ≈ 3 parágrafos |
| `CATALOG_CSV` | não | `./data/catalog.json` | Caminho do JSON de catálogo |

## Custo estimado (Sonnet 4.6, jan 2026)

- Input: US$ 3 / 1M tokens · Output: US$ 15 / 1M tokens
- Conversa típica: ~1.5k input + ~400 output = US$ 0.011 / mensagem
- Com prompt caching ativo (que este endpoint usa): input cacheado cai para US$ 0.30 / 1M = ~US$ 0.002 / mensagem após o cache esquentar.

Para 1000 conversas/mês: ~US$ 2-12.

## System prompt — o que está treinado

O arquivo `lib/system-prompt.js` é a peça mais importante. Ele define:
- **Voz da marca**: calma, sem exclamação, sem marketing-ês.
- **O que pode fazer**: explicar componentes, indicar produto, esclarecer prazo/preço.
- **O que NÃO pode fazer**: prescrição clínica, prometer prazo, inventar produto.
- **Quando encaminhar para humano**: dor, complicação clínica, reclamação, cirurgia.
- **Padrões de resposta**: 1-3 parágrafos, direta, com nome do paciente quando dado.

Quando quiser ajustar tom ou cobertura, edite esse arquivo e refaça deploy.

## Atualizando o catálogo

Quando rodar a pipeline Python de novo (preços/SKUs novos):
```bash
node scripts/build-catalog.mjs ../catalog/shopify_products_import.csv data/catalog.json
vercel --prod
```

Para evitar redeploy a cada atualização de catálogo, considere armazenar o catalog.json
no Vercel Blob ou no Supabase Storage e ler ao iniciar a função.

## Próximos passos sugeridos

- **Embeddings** para busca semântica (substituir o keyword matching de
  `lib/knowledge-base.js` por embeddings + cosine similarity).
- **Logging** das conversas em Supabase / Postgres — útil para fine-tuning futuro e
  para encontrar perguntas que a IA não soube responder.
- **Streaming**: hoje o endpoint retorna a resposta inteira de uma vez. Streaming via SSE
  melhora a percepção (texto aparece palavra a palavra). O widget no front aceita streaming
  com pequena mudança no JS.
- **Rate limiting** por IP — Vercel Edge Middleware ou Upstash Ratelimit.

## CORS

Está restrito a `https://minhaprotese.com.br` em `vercel.json`. Para testar localmente do
preview do tema, adicione `http://localhost:9292` (Shopify CLI dev server) ao header.
