# Checklist de pré-lançamento Shopify

Use isso como guia antes de tirar do modo de desenvolvimento.

## Configuração geral

- [ ] Conta Shopify Basic ou superior ativa
- [ ] Domínio minhaprotese.com.br conectado e propagado (espere 24h para CDN)
- [ ] SSL emitido (automático após DNS apontar)
- [ ] Localização do depósito cadastrada em Settings → Locations
- [ ] CNPJ, razão social e endereço preenchidos em Settings → General
- [ ] Configuração de impostos (ICMS) revisada em Settings → Taxes
- [ ] Política de privacidade, termos e troca publicadas em Settings → Policies

## Tema

- [ ] Tema instalado e publicado
- [ ] Logo em PNG/SVG carregado no Theme settings → Marca
- [ ] Favicon carregado (use `brand/logo/favicon.svg` convertido para PNG 32x32)
- [ ] Imagem Open Graph (1200x630) carregada
- [ ] Cor primária, acento e fundos validados no preview
- [ ] Menu principal criado em Online Store → Navigation
- [ ] Menus de rodapé criados (Categorias, Atendimento)
- [ ] Hero personalizado com sua copy e imagem

## Produtos

- [ ] Catálogo CSV importado com sucesso (1033 SKUs esperados)
- [ ] Produtos com preço estão em "Active" e os sem preço em "Draft"
- [ ] Coleções automáticas criadas e populadas (ver README.md)
- [ ] Pelo menos 20 produtos top com foto, descrição revisada e specs
- [ ] Variantes (tamanho/cor) criadas onde fizer sentido

## Pagamento e envio

- [ ] Gateway configurado (Mercado Pago / Pagar.me / Shopify Payments BR)
- [ ] Métodos de envio cadastrados (Correios, transportadora, retirada)
- [ ] Tabela de frete revisada por região
- [ ] Test order completada com sucesso

## Comunicação

- [ ] Número WhatsApp em Theme settings → Contato e atendimento
- [ ] E-mail de notificação configurado em Settings → Notifications
- [ ] Templates de e-mail (confirmação, envio, entrega) revisados em Settings → Notifications
- [ ] Conta no Instagram/Facebook conectada para Shop tags (opcional)

## Analytics & SEO

- [ ] GA4 ou similar instalado (cole no Theme settings → SEO & analytics → HTML extra)
- [ ] Meta Pixel instalado (idem)
- [ ] sitemap.xml acessível em /sitemap.xml
- [ ] robots.txt verificado
- [ ] Google Search Console adicionado e propriedade verificada
- [ ] Páginas institucionais com SEO básico (title + description)

## Estoque

- [ ] Planilha Google Sheets criada com aba "Estoque"
- [ ] Service-account criada e compartilhada com a planilha
- [ ] Sync rodando em cron (recomendo a cada 30 min no início)
- [ ] Primeira sincronização validada manualmente (compare 5 SKUs)

## Compliance

- [ ] LGPD: banner de cookies + política
- [ ] CDC: política de troca/devolução em 7 dias (compras online)
- [ ] Anvisa: se algum item exigir registro, informe na descrição do produto
- [ ] Selos de segurança (SSL, Reclame Aqui se aplicável) visíveis

## Pós-lançamento

- [ ] Monitoramento de erros (Sentry ou Shopify Web Pixel)
- [ ] Treinar IA (quando endpoint estiver pronto, plugar no Theme settings)
- [ ] A/B test do hero (CTA "Ver catálogo" vs "Falar com especialista")
- [ ] Revisão de fotografia em 30 dias (substituir placeholders por fotos próprias)
