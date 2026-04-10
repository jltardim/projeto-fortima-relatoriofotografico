# Spec: Relatorio de Fotos de Obras

## Objective

Sistema para construtora que automatiza a coleta diaria de fotos de progresso de obras via WhatsApp (Chatwoot). O sistema envia notificacoes periodicas para mestres de obra pedindo fotos, processa as respostas, e organiza as imagens no Google Drive com nomenclatura padronizada.

### User Stories

**Como administrador da construtora:**
- Quero cadastrar obras com suas fases para organizar a coleta de fotos
- Quero cadastrar contatos (mestres de obra) e vincular a uma ou mais obras
- Quero definir a mensagem que sera enviada e o horario/dias de envio
- Quero configurar o Google Drive (service account) para armazenamento
- Quero visualizar o historico de fotos recebidas e seu status

**Como mestre de obra:**
- Recebo uma mensagem no WhatsApp pedindo foto da obra
- Respondo com uma foto e um texto identificando a obra e a fase (ex: "Residencial Sul - Fundacao")
- Se eu nao identificar corretamente, recebo uma mensagem pedindo esclarecimento

### Success Criteria
- [ ] Notificacoes sao enviadas automaticamente nos horarios configurados via API Chatwoot
- [ ] Respostas com foto sao detectadas via polling no PostgreSQL do Chatwoot
- [ ] LLM extrai corretamente obra e fase de mensagens informais (>80% de acerto em textos claros)
- [ ] Fotos sao salvas no Drive com nomenclatura `{seq}_{fase}_{obra}_{data}.ext`
- [ ] Estrutura de pastas criada automaticamente: `/{Obra}/{Fase}/`
- [ ] Numeracao sequencial por fase (001, 002, 003...)
- [ ] Sistema responde ao mestre via Chatwoot quando nao consegue identificar obra/fase
- [ ] Login basico funcional (email + senha)
- [ ] Frontend permite CRUD completo de obras, fases, contatos e configuracoes

## Tech Stack

| Componente | Tecnologia | Versao |
|-----------|-----------|--------|
| Framework | Next.js (App Router) | 14.x |
| Linguagem | TypeScript | 5.x |
| Banco local | PostgreSQL | 15+ |
| ORM | Prisma | 5.x |
| Cron/Jobs | node-cron | 3.x |
| LLM | Claude API (Haiku) via @anthropic-ai/sdk | latest |
| Google Drive | googleapis (google-auth-library + drive v3) | latest |
| UI Components | shadcn/ui | latest |
| Styling | Tailwind CSS | 3.x |
| Auth | NextAuth.js (Credentials provider) | 4.x |
| HTTP Client | fetch (nativo) | - |

## Commands

```bash
# Desenvolvimento
npm run dev              # Inicia Next.js em modo dev (porta 3000)
npm run db:push          # Aplica schema Prisma no banco local
npm run db:migrate       # Cria migration Prisma
npm run db:seed          # Popula dados iniciais (admin user)
npm run db:studio        # Abre Prisma Studio

# Build e producao
npm run build            # Build de producao
npm start                # Inicia servidor de producao

# Testes
npm test                 # Roda testes unitarios (Vitest)
npm run test:watch       # Testes em modo watch
npm run test:coverage    # Testes com cobertura

# Lint
npm run lint             # ESLint + Prettier check
npm run lint:fix         # Auto-fix
```

## Project Structure

```
projeto_fortima_relatoriofotos/
  docs/
    ideas/                    -> Documentos de ideacao
    spec.md                   -> Esta spec
  src/
    app/                      -> Next.js App Router
      (auth)/
        login/page.tsx        -> Pagina de login
      (dashboard)/
        layout.tsx            -> Layout autenticado com sidebar
        page.tsx              -> Dashboard principal
        obras/
          page.tsx            -> Lista de obras
          [id]/page.tsx       -> Detalhe da obra (fases, contatos, fotos)
          nova/page.tsx       -> Formulario nova obra
        contatos/
          page.tsx            -> Lista de contatos
          [id]/page.tsx       -> Detalhe do contato
          novo/page.tsx       -> Formulario novo contato
        notificacoes/
          page.tsx            -> Configuracao de notificacoes
        configuracoes/
          page.tsx            -> Config Drive + Chatwoot
        fotos/
          page.tsx            -> Historico de fotos recebidas
      api/
        auth/[...nextauth]/
          route.ts            -> NextAuth handler
        obras/
          route.ts            -> CRUD obras
          [id]/route.ts
          [id]/fases/route.ts -> CRUD fases de uma obra
        contatos/
          route.ts            -> CRUD contatos
          [id]/route.ts
        notificacoes/
          route.ts            -> Config de notificacoes
        configuracoes/
          drive/route.ts      -> Config Google Drive
          chatwoot/route.ts   -> Config conexao Chatwoot
        cron/
          enviar/route.ts     -> Endpoint para trigger manual de envio
          polling/route.ts    -> Endpoint para trigger manual de polling
    components/
      ui/                     -> shadcn/ui components
      layout/
        sidebar.tsx
        header.tsx
      obras/
        obra-form.tsx
        obra-card.tsx
        fase-list.tsx
      contatos/
        contato-form.tsx
        contato-card.tsx
      fotos/
        foto-card.tsx
        foto-grid.tsx
    lib/
      db.ts                   -> Prisma client singleton
      auth.ts                 -> NextAuth config
      chatwoot/
        api.ts                -> Client API Chatwoot (enviar mensagens)
        polling.ts            -> Queries no PostgreSQL do Chatwoot
        types.ts              -> Tipos do schema Chatwoot
      drive/
        client.ts             -> Google Drive client (service account)
        upload.ts             -> Logica de upload + criacao de pastas
        naming.ts             -> Logica de nomenclatura de arquivos
      agent/
        extractor.ts          -> LLM para extrair obra+fase do texto
      jobs/
        scheduler.ts          -> Setup do node-cron
        send-notifications.ts -> Job de envio de notificacoes
        poll-responses.ts     -> Job de polling de respostas
    prisma/
      schema.prisma           -> Schema do banco local
      seed.ts                 -> Seed (usuario admin)
  tests/
    lib/
      chatwoot/               -> Testes do client Chatwoot
      drive/                  -> Testes do client Drive
      agent/                  -> Testes do extractor
      jobs/                   -> Testes dos jobs
    api/                      -> Testes das API routes
  .env.example                -> Variaveis de ambiente exemplo
  .env.local                  -> Variaveis de ambiente (gitignored)
```

## Code Style

### Convencoes
- Idioma do codigo: ingles (nomes de variaveis, funcoes, tipos)
- Idioma da UI: portugues brasileiro
- Nomes de arquivos: kebab-case
- Componentes React: PascalCase
- Funcoes e variaveis: camelCase
- Tipos/Interfaces: PascalCase com prefixo descritivo
- Sem comentarios obvios — codigo deve ser autoexplicativo
- Funcoes pequenas — max ~30 linhas
- Sem abstraccoes prematuras

### Exemplo de estilo (API Route)

```typescript
// src/app/api/obras/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const obras = await db.obra.findMany({
    include: { fases: true, _count: { select: { contatos: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(obras);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const obra = await db.obra.create({
    data: {
      nome: body.nome,
      endereco: body.endereco,
      fases: {
        create: body.fases.map((fase: string, index: number) => ({
          nome: fase,
          ordem: index + 1,
        })),
      },
    },
    include: { fases: true },
  });

  return NextResponse.json(obra, { status: 201 });
}
```

### Exemplo de estilo (Component)

```tsx
// src/components/obras/obra-card.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface ObraCardProps {
  id: string;
  nome: string;
  endereco: string;
  fasesCount: number;
  contatosCount: number;
}

export function ObraCard({ id, nome, endereco, fasesCount, contatosCount }: ObraCardProps) {
  return (
    <Link href={`/obras/${id}`}>
      <Card className="hover:border-primary transition-colors cursor-pointer">
        <CardHeader>
          <CardTitle className="text-lg">{nome}</CardTitle>
          <p className="text-sm text-muted-foreground">{endereco}</p>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Badge variant="secondary">{fasesCount} fases</Badge>
          <Badge variant="outline">{contatosCount} contatos</Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
```

## Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  nome      String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}

model Obra {
  id        String   @id @default(cuid())
  nome      String
  endereco  String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  fases    Fase[]
  contatos ContatoObra[]
  fotos    Foto[]

  @@map("obras")
}

model Fase {
  id    String @id @default(cuid())
  nome  String
  ordem Int

  obraId String @map("obra_id")
  obra   Obra   @relation(fields: [obraId], references: [id], onDelete: Cascade)

  fotos Foto[]

  @@map("fases")
}

model Contato {
  id                String  @id @default(cuid())
  nome              String
  telefone          String  @unique
  chatwootContactId Int?    @map("chatwoot_contact_id")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  obras ContatoObra[]
  fotos Foto[]

  @@map("contatos")
}

model ContatoObra {
  contatoId String @map("contato_id")
  contato   Contato @relation(fields: [contatoId], references: [id], onDelete: Cascade)

  obraId String @map("obra_id")
  obra   Obra   @relation(fields: [obraId], references: [id], onDelete: Cascade)

  @@id([contatoId, obraId])
  @@map("contato_obras")
}

model NotificacaoConfig {
  id               String   @id @default(cuid())
  mensagemTemplate String   @map("mensagem_template")
  horario          String   // formato "HH:mm"
  diasSemana       Int[]    @map("dias_semana") // 0=dom, 1=seg, ..., 6=sab
  ativo            Boolean  @default(true)

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("notificacoes_config")
}

model Foto {
  id                 String   @id @default(cuid())
  nomeArquivo        String   @map("nome_arquivo")
  driveFileId        String?  @map("drive_file_id")
  driveFolderId      String?  @map("drive_folder_id")
  mensagemOriginal   String?  @map("mensagem_original")
  chatwootMessageId  Int?     @map("chatwoot_message_id")
  status             FotoStatus @default(PENDING)

  obraId    String?  @map("obra_id")
  obra      Obra?    @relation(fields: [obraId], references: [id])

  faseId    String?  @map("fase_id")
  fase      Fase?    @relation(fields: [faseId], references: [id])

  contatoId String?  @map("contato_id")
  contato   Contato? @relation(fields: [contatoId], references: [id])

  createdAt DateTime @default(now()) @map("created_at")

  @@map("fotos")
}

enum FotoStatus {
  PENDING     // Recebida, aguardando processamento
  PROCESSING  // Sendo analisada pelo LLM
  UPLOADED    // Upload no Drive concluido
  FAILED      // Falha no processamento
  NEEDS_INFO  // Precisa de mais info do mestre
}

model DriveConfig {
  id                  String @id @default(cuid())
  folderIdRaiz        String @map("folder_id_raiz")
  serviceAccountEmail String @map("service_account_email")
  credentialsJson     String @map("credentials_json") // JSON da service account, encriptado

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("drive_config")
}

model ChatwootConfig {
  id          String @id @default(cuid())
  baseUrl     String @map("base_url")     // URL da instancia Chatwoot
  apiToken    String @map("api_token")     // Token de acesso API
  accountId   Int    @map("account_id")
  inboxId     Int    @map("inbox_id")      // Inbox do WhatsApp
  dbHost      String @map("db_host")
  dbPort      Int    @default(5432) @map("db_port")
  dbName      String @map("db_name")
  dbUser      String @map("db_user")
  dbPassword  String @map("db_password")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("chatwoot_config")
}
```

## Chatwoot Integration

### API (envio de mensagens)
- Endpoint: `POST /api/v1/accounts/{account_id}/conversations/{conversation_id}/messages`
- Autenticacao: Header `api_access_token`
- Criar conversa se nao existir: `POST /api/v1/accounts/{account_id}/conversations`

### PostgreSQL (polling de respostas)
- Conexao separada ao banco do Chatwoot (read-only recomendado)
- Query principal: mensagens recentes com attachments em conversas do inbox WhatsApp
- Tabelas relevantes: `messages`, `attachments`, `conversations`, `contacts`
- Polling interval: a cada 2 minutos (configuravel)
- Controle: campo `chatwoot_message_id` na tabela `fotos` evita reprocessamento

### Query de polling (referencia)
```sql
SELECT m.id, m.content, m.created_at, m.conversation_id,
       a.file_url, a.file_type,
       c.phone_number
FROM messages m
JOIN attachments a ON a.message_id = m.id
JOIN conversations conv ON conv.id = m.conversation_id
JOIN contacts c ON c.id = conv.contact_id
WHERE conv.inbox_id = :inbox_id
  AND m.message_type = 0  -- incoming
  AND m.created_at > :last_poll_time
  AND a.file_type IN (0, 1)  -- image types
ORDER BY m.created_at ASC;
```

## Google Drive Integration

### Autenticacao
- Google Service Account com chave JSON
- Pasta raiz compartilhada com o email da service account (permissao de Editor)
- Sem necessidade de OAuth flow ou CLI

### Estrutura de pastas
```
{pasta_raiz}/
  {nome_obra}/
    {nome_fase}/
      001_{fase}_{obra}_{data}.jpg
      002_{fase}_{obra}_{data}.jpg
```

### Logica de nomenclatura (naming.ts)
1. Normalizar nome da obra e fase (lowercase, sem acentos, espacos -> hifen)
2. Listar arquivos existentes na pasta da fase no Drive
3. Pegar o maior numero sequencial existente
4. Incrementar: proximo = maior + 1, formatado com 3 digitos (001, 002...)
5. Montar: `{seq}_{fase_normalizada}_{obra_normalizada}_{YYYY-MM-DD}.{ext}`

## LLM Integration (Agent/Extractor)

### Objetivo
Extrair nome da obra e fase a partir de texto informal enviado pelo mestre de obra.

### Modelo
Claude Haiku via `@anthropic-ai/sdk` — rapido e barato para tarefas de extracao.

### Prompt (referencia)
```
Voce recebeu uma mensagem de um mestre de obra que enviou uma foto.
Extraia o nome da obra e a fase da obra mencionados na mensagem.

Mensagem: "{mensagem}"

Obras cadastradas: {lista_obras_com_fases}

Responda em JSON:
{
  "obra": "nome exato da obra cadastrada ou null",
  "fase": "nome exato da fase cadastrada ou null",
  "confianca": "alta" | "media" | "baixa"
}

Se nao conseguir identificar, retorne null nos campos.
```

### Fluxo
1. Recebe mensagem do mestre
2. Busca obras vinculadas ao contato (filtro por contato_obras)
3. Envia pro LLM com a lista de obras/fases possiveis
4. Se confianca alta: processa automaticamente
5. Se confianca media/baixa ou null: marca como NEEDS_INFO e responde ao mestre

## Testing Strategy

### Framework
- Vitest (compativel com o ecossistema Next.js)
- @testing-library/react para componentes (se necessario)

### Niveis de teste
| Nivel | O que | Onde |
|-------|-------|------|
| Unitario | naming.ts, extractor.ts, polling.ts | tests/lib/ |
| Integracao | API routes com banco real (test db) | tests/api/ |
| Manual | Fluxo completo WhatsApp -> Drive | Checklist manual |

### Cobertura
- Minimo 80% nas libs criticas (lib/chatwoot, lib/drive, lib/agent)
- API routes: teste de happy path + auth check
- Componentes UI: nao exigido no MVP

### O que testar com prioridade
1. `naming.ts` — nomenclatura de arquivos (muitas edge cases: acentos, caracteres especiais)
2. `extractor.ts` — mock do LLM, testar parsing da resposta JSON
3. `polling.ts` — query retorna dados corretos, nao reprocessa mensagens
4. `upload.ts` — criacao de pasta quando nao existe, upload correto

## Environment Variables

```bash
# Banco local da aplicacao
DATABASE_URL="postgresql://user:pass@localhost:5432/relatorio_fotos"

# NextAuth
NEXTAUTH_SECRET="gerar-com-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Chatwoot API
CHATWOOT_BASE_URL="https://chatwoot.example.com"
CHATWOOT_API_TOKEN="seu-token"
CHATWOOT_ACCOUNT_ID="1"
CHATWOOT_INBOX_ID="1"

# Chatwoot PostgreSQL (read-only)
CHATWOOT_DB_HOST="localhost"
CHATWOOT_DB_PORT="5432"
CHATWOOT_DB_NAME="chatwoot_production"
CHATWOOT_DB_USER="chatwoot_reader"
CHATWOOT_DB_PASSWORD="senha"

# Claude API (para extrator)
ANTHROPIC_API_KEY="sk-ant-..."

# Google Drive (alternativa: salvar no banco via frontend)
GOOGLE_SERVICE_ACCOUNT_EMAIL="sa@project.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
GOOGLE_DRIVE_ROOT_FOLDER_ID="folder-id"

# Jobs
POLL_INTERVAL_MINUTES="2"
```

## Boundaries

### Always
- Rodar `npm run lint` antes de commitar
- Validar inputs nas API routes (tipagem + sanitizacao)
- Usar transacoes Prisma quando envolver multiplas escritas
- Testar naming.ts e extractor.ts antes de cada release
- Logar erros de polling e upload para debug

### Ask First
- Mudancas no schema Prisma (migration)
- Adicionar nova dependencia ao package.json
- Alterar intervalo do polling
- Mudar estrutura de pastas do Drive

### Never
- Commitar .env.local ou credentials JSON
- Escrever diretamente no banco do Chatwoot (apenas leitura)
- Fazer upload sem verificar que o arquivo e uma imagem valida
- Deletar fotos do Drive programaticamente no MVP

## Open Questions
- Qual versao exata do Chatwoot esta rodando? (afeta schema do banco)
- O Chatwoot esta em Docker? Qual o host/porta do PostgreSQL?
- Existe um usuario read-only no PostgreSQL do Chatwoot ou precisa criar?
