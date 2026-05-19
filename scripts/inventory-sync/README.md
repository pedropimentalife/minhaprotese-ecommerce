# Sincronização de Estoque · minha prótese

Script que mantém o estoque sincronizado entre uma planilha Google Sheets (fonte da verdade)
e o catálogo Shopify (vitrine).

## Por que assim?

A operação de logística da minha prótese roda em planilha — entrada/saída de fornecedor,
quebra, ajustes manuais — porque a equipe já está acostumada com ela. O Shopify precisa
apenas saber "tem N na prateleira" para mostrar ou esconder do site. Esta integração faz
essa ponte sem mudar o fluxo da operação.

## Modo de uso

```bash
# Estoque que está na planilha vai para o Shopify (modo padrão)
python3 inventory_sync.py

# Estoque que está no Shopify volta para a planilha (espelha)
python3 inventory_sync.py --reverse

# Roda sem alterar nada, só mostra o que faria
python3 inventory_sync.py --dry-run
```

## Setup inicial

1. **Crie a planilha Google Sheets** com a aba `Estoque` e o cabeçalho:
   ```
   sku | quantidade | local | fornecedor | observacoes
   ```
   Veja `Estoque-template.csv` como modelo.

2. **Crie uma service account no Google Cloud**:
   - Habilite a Google Sheets API
   - Crie service-account, gere JSON key
   - Compartilhe a planilha com o e-mail da service-account (Editor)

3. **Crie token Admin API no Shopify**:
   - App privado: scope `read_products` + `write_inventory`
   - Anote o token (`shpat_…`) e o `Location ID` (encontra em Settings → Locations)

4. **Configure as variáveis de ambiente** (`.env`):
   ```
   SHOPIFY_STORE=minhaprotese.myshopify.com
   SHOPIFY_ADMIN_TOKEN=shpat_xxx
   SHOPIFY_LOCATION_ID=00000000000
   GOOGLE_CREDENTIALS=/path/to/svc-account.json
   SHEET_ID=1xXxXxXxXxXxXxXxX
   ```
   Use `source .env` antes de rodar, ou um `python-dotenv`.

## Automatização (cron)

Para sincronizar a cada 30 minutos (recomendado para alta rotação):

```cron
*/30 * * * * cd /caminho/inventory-sync && source .env && /usr/local/bin/python3.11 inventory_sync.py >> sync.log 2>&1
```

Para uma sincronização diária mais conservadora (recomendado no início):

```cron
0 8 * * * cd /caminho/inventory-sync && source .env && /usr/local/bin/python3.11 inventory_sync.py >> sync.log 2>&1
```

## Comportamento

- SKUs presentes só na planilha (não no Shopify) geram um warning, não param a execução.
- SKUs com `quantidade` em branco são ignorados.
- A política do Shopify para falta de estoque (`Inventory Policy`) é `deny` por padrão
  no CSV de importação — produtos zerados ficam visíveis mas não compráveis.

## Troubleshooting

- **401 Shopify**: token expirado ou sem scope `write_inventory`.
- **403 Google**: planilha não compartilhada com a service-account.
- **SKU não encontrado**: o SKU da planilha precisa bater **exatamente** com `Variant SKU`
  no Shopify. Espaços e maiúsculas importam.
