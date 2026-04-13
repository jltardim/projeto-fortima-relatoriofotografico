# Refatoracao: Chatwoot Webhook Integration

**Data:** 2026-04-13
**Status:** Aprovado
**Autor:** Joao + Claude

## Objetivo

Substituir o polling direto no banco PostgreSQL do Chatwoot por recebimento via webhooks. Isso elimina a dependencia de acesso ao banco externo, reduz latencia de ~2 minutos para real-time, e simplifica a arquitetura.

## Decisoes Tomadas

| Decisao | Escolha | Motivo |
|---------|---------|--------|
| Processamento ao receber webhook | Hibrido (processa imediato, retry se falhar) | Resiliencia + real-time |
| Campos de DB do Chatwoot no config | Remover completamente | Simplificacao, nao sao mais necessarios |
| Seguranca do endpoint | Sem validacao extra | App e Chatwoot na mesma rede Docker Swarm |
| Scheduler | Manter com retry + notificacoes | Retry cobre falhas transitórias |
| Eventos de webhook | Apenas message_created | So precisamos de fotos de contatos cadastrados |
| Filtragem por inbox | No proprio Chatwoot ao criar webhook | Simplifica codigo da app |

## Arquitetura

### Fluxo Completo

```
WhatsApp -> Chatwoot -> Webhook -> Nossa App -> LLM -> Google Drive
```

### Fluxo Detalhado

```
1. Contato envia foto no WhatsApp
2. Chatwoot recebe e dispara webhook message_created
3. POST /api/webhooks/chatwoot recebe payload
4. Filtros (em ordem):
   a. event === "message_created"
   b. message_type === "incoming"
   c. attachments contem image ou video
   d. sender.phone_number existe em Contato.telefone (normalizado)
5. Deduplicacao: verifica se chatwootMessageId ja existe
6. Para cada attachment de imagem/video:
   a. Cria registro Foto (PENDING) no banco da app
7. Tenta processar imediatamente:
   a. LLM extrai obra/fase do content da mensagem (uma vez por mensagem)
   b. Download da imagem via data_url do attachment
   c. Upload para Google Drive (pasta Obra -> Fase)
   d. Atualiza Foto -> UPLOADED
8. Se falhar -> Foto fica PENDING ou FAILED
9. Retorna 200 OK ao Chatwoot (sempre, independente do resultado)
```

### Scheduler Simplificado

| Job | Frequencia | Funcao |
|-----|-----------|--------|
| Retry | Cada 5 min | Reprocessa Fotos PENDING/FAILED |
| Notificacoes | Cada 1 min | Verifica horario e envia mensagens |

## Payload do Webhook (Confirmado via Teste)

### message_created com foto

Campos relevantes extraidos do payload real:

```json
{
  "event": "message_created",
  "id": 1918,
  "message_type": "incoming",
  "content": "texto da mensagem",
  "content_type": "text",
  "sender": {
    "id": 94,
    "name": "Joao",
    "phone_number": "+5522998712937"
  },
  "inbox": {
    "id": 1,
    "name": "whatsappfortima"
  },
  "conversation": {
    "id": 94,
    "inbox_id": 1,
    "status": "open"
  },
  "attachments": [
    {
      "id": 576,
      "message_id": 1918,
      "file_type": "image",
      "extension": "jpeg",
      "content_type": "image/jpeg",
      "data_url": "https://appchat01.fortimaservidor.org/rails/active_storage/blobs/redirect/.../no-filename.jpeg",
      "thumb_url": "https://appchat01.fortimaservidor.org/rails/active_storage/representations/redirect/.../no-filename.jpeg",
      "file_size": 290791
    }
  ]
}
```

## Modelo de Dados

### ChatwootConfig — Remover campos de DB

```diff
model ChatwootConfig {
  id            Int    @id @default(1)
  baseUrl       String
  apiToken      String
  accountId     Int
  inboxId       Int
- dbHost        String @default("")
- dbPort        Int    @default(5432)
- dbName        String @default("")
- dbUser        String @default("")
- dbPassword    String @default("")
}
```

Mantém `baseUrl`, `apiToken`, `accountId`, `inboxId` — usados para enviar mensagens via API REST.

### Foto — Sem mudancas

Modelo existente ja tem todos os campos necessarios:
- `chatwootMessageId` — deduplicacao
- `mensagemOriginal` — texto da mensagem
- `status` — PENDING, PROCESSING, UPLOADED, FAILED, NEEDS_INFO
- Relacoes com `contato`, `obra`, `fase`

### Nenhuma tabela nova necessaria

## Normalizacao de Telefone

- Webhook traz: `"+5522998712937"`
- Banco pode ter formatos variados
- Normalizar ambos removendo tudo exceto digitos antes de comparar
- Exemplo: `"+5522998712937"` -> `"5522998712937"`

## Deduplicacao

- Chatwoot pode disparar webhook mais de uma vez (retry)
- Antes de criar Foto, verificar se ja existe registro com mesmo `chatwootMessageId`
- Se existir, ignora

## Multiplos Attachments

- Uma mensagem pode ter varias fotos
- Para cada attachment de `file_type: "image"` ou `"video"`, cria um registro Foto separado
- LLM extrai obra/fase uma vez por mensagem e aplica a todas as fotos

## Endpoint de Webhook

### Rota: `POST /api/webhooks/chatwoot`

- Sem autenticacao (mesma rede interna)
- Sempre retorna 200 OK rapido ao Chatwoot
- Processamento pesado (LLM + Drive) nao bloqueia o response

## Arquivos Afetados

### Novo:
- `src/app/api/webhooks/chatwoot/route.ts` — endpoint de webhook (substituir o temporario)

### Deletar:
- `src/lib/chatwoot/polling.ts` — queries diretas ao banco do Chatwoot

### Editar:
- `prisma/schema.prisma` — remover campos de DB do ChatwootConfig
- `src/lib/chatwoot/types.ts` — adicionar tipos do payload do webhook
- `src/lib/jobs/poll-responses.ts` — refatorar para funcao de processamento (sem polling)
- `src/lib/jobs/scheduler.ts` — remover cron de polling, adicionar cron de retry
- `src/app/api/configuracoes/chatwoot/route.ts` — remover campos de DB
- `src/app/(dashboard)/configuracoes/page.tsx` — remover campos de DB da UI

### Sem mudanca:
- `src/lib/chatwoot/api.ts` — continua enviando mensagens via REST
- `src/lib/agent/extractor.ts` — mesma logica de LLM
- `src/lib/drive/` — mesma logica de upload
- Frontend (exceto config UI)
- Autenticacao

## O que NAO muda

- LLM extraction (OpenRouter)
- Google Drive upload
- Envio de mensagens/notificacoes via API REST Chatwoot
- CRUD de Contatos, Obras, Fases
- Frontend (exceto config UI)
- Autenticacao

## Comparativo

| Item | Antes | Depois |
|------|-------|--------|
| Recebimento de fotos | Polling direto no DB Chatwoot (2 min) | Webhook real-time |
| Conexao ao DB Chatwoot | Sim (credenciais no config) | Nao |
| Endpoint webhook | Nao existe | POST /api/webhooks/chatwoot |
| polling.ts | Queries SQL no PostgreSQL do Chatwoot | Deletado |
| poll-responses.ts | Polling + processamento | So processamento |
| Scheduler | Polling + Notificacoes | Retry de falhas + Notificacoes |
| ChatwootConfig | 10 campos (incl. DB) | 5 campos (sem DB) |
| Config UI | Campos de DB visiveis | Campos de DB removidos |
| Latencia | ~2 minutos | Real-time |
