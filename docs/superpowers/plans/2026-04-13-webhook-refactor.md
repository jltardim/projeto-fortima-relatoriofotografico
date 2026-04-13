# Webhook Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Chatwoot DB polling with webhook-based photo ingestion, simplifying the architecture and reducing latency to real-time.

**Architecture:** Chatwoot sends `message_created` webhooks to `POST /api/webhooks/chatwoot`. The endpoint filters by message type, attachments, and registered phone numbers, then processes photos inline (LLM extraction + Drive upload). A retry job handles failures. All Chatwoot DB access code and config fields are removed.

**Tech Stack:** Next.js 14, Prisma, PostgreSQL, node-cron, OpenRouter (OpenAI SDK)

**Spec:** `docs/superpowers/specs/2026-04-13-webhook-refactor-design.md`

---

### Task 1: Update Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma:88-109` (Foto model)
- Modify: `prisma/schema.prisma:142-158` (ChatwootConfig model)

- [ ] **Step 1: Add fields to Foto model**

In `prisma/schema.prisma`, add two fields to the `Foto` model after `chatwootMessageId` (line 94):

```prisma
chatwootAttachmentId Int?       @unique @map("chatwoot_attachment_id")
retryCount           Int        @default(0) @map("retry_count")
```

- [ ] **Step 2: Remove DB fields from ChatwootConfig**

In `prisma/schema.prisma`, remove lines 148-152 (the 5 DB fields):

```diff
model ChatwootConfig {
  id         String @id @default(cuid())
  baseUrl    String @map("base_url")
  apiToken   String @map("api_token")
  accountId  Int    @map("account_id")
  inboxId    Int    @map("inbox_id")
- dbHost     String @map("db_host")
- dbPort     Int    @default(5432) @map("db_port")
- dbName     String @map("db_name")
- dbUser     String @map("db_user")
- dbPassword String @map("db_password")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("chatwoot_config")
}
```

- [ ] **Step 3: Generate and run migration**

Run:
```bash
npx prisma migrate dev --name webhook-refactor
```

Expected: Migration creates `chatwoot_attachment_id` (unique) and `retry_count` columns on `fotos` table, drops 5 DB columns from `chatwoot_config` table.

- [ ] **Step 4: Generate Prisma client**

Run:
```bash
npx prisma generate
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/
git commit -m "feat: update schema for webhook refactor — add attachment dedup, remove Chatwoot DB fields"
```

---

### Task 2: Add Webhook Types

**Files:**
- Modify: `src/lib/chatwoot/types.ts`

- [ ] **Step 1: Add webhook payload types**

Replace the entire contents of `src/lib/chatwoot/types.ts` with (note: `PolledMessage` is kept temporarily so `polling.ts` still compiles until it's deleted in Task 7):

```typescript
// ──── Chatwoot API types (used by api.ts for sending messages) ────

export interface ChatwootConversation {
  id: number;
  inbox_id: number;
  contact_id: number;
  status: string;
}

export interface ChatwootMessage {
  id: number;
  content: string;
  message_type: number; // 0=incoming, 1=outgoing
  conversation_id: number;
  created_at: string;
  attachments?: ChatwootAttachment[];
}

export interface ChatwootAttachment {
  id: number;
  file_type: string;
  data_url: string;
}

export interface ChatwootContact {
  id: number;
  phone_number: string;
  name: string;
}

// ──── Webhook payload types ────

export interface WebhookPayload {
  event: string;
  id: number;
  content: string | null;
  content_type: string;
  message_type: "incoming" | "outgoing" | "template";
  sender: WebhookSender;
  inbox: { id: number; name: string };
  conversation: WebhookConversation;
  attachments?: WebhookAttachment[];
}

export interface WebhookSender {
  id: number;
  name: string;
  phone_number: string | null;
  email: string | null;
}

export interface WebhookConversation {
  id: number;
  inbox_id: number;
  status: string;
  additional_attributes?: Record<string, unknown>;
}

export interface WebhookAttachment {
  id: number;
  message_id: number;
  file_type: "image" | "video" | "audio" | "file";
  extension: string;
  content_type: string;
  data_url: string;
  thumb_url: string;
  file_size: number;
}

// ──── Legacy type (kept until polling.ts is deleted in Task 7) ────

export interface PolledMessage {
  messageId: number;
  content: string;
  createdAt: Date;
  conversationId: number;
  fileUrl: string;
  fileType: string;
  phoneNumber: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors related to types.ts (there may be pre-existing errors in other files).

- [ ] **Step 3: Commit**

```bash
git add src/lib/chatwoot/types.ts
git commit -m "feat: add webhook payload types for Chatwoot integration"
```

---

### Task 3: Create Phone Normalization Utility

**Files:**
- Create: `src/lib/utils/normalize-phone.ts`

- [ ] **Step 1: Create the utility**

Create `src/lib/utils/normalize-phone.ts`:

```typescript
/**
 * Normalizes a phone number by stripping everything except digits.
 * "+5522998712937" → "5522998712937"
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils/normalize-phone.ts
git commit -m "feat: add phone normalization utility"
```

---

### Task 4: Create Webhook Photo Processor

This refactors `poll-responses.ts` from a polling function into a reusable photo processing function that receives data already extracted from the webhook.

**Files:**
- Modify: `src/lib/jobs/poll-responses.ts` (rename and refactor)
- Create: `src/lib/jobs/process-photos.ts`

- [ ] **Step 1: Create process-photos.ts**

Create `src/lib/jobs/process-photos.ts` with the processing logic extracted from `poll-responses.ts`, adapted to receive webhook data instead of polling:

```typescript
import { db } from "@/lib/db";
import { extractObraFase } from "@/lib/agent/extractor";
import { uploadPhoto } from "@/lib/drive/upload";
import { sendMessage } from "@/lib/chatwoot/api";
import type { WebhookAttachment } from "@/lib/chatwoot/types";

interface ProcessInput {
  messageId: number;
  content: string;
  conversationId: number;
  attachments: WebhookAttachment[];
  contatoId: string;
}

export async function processWebhookPhotos(input: ProcessInput): Promise<{
  uploaded: number;
  needsInfo: number;
  errors: number;
}> {
  let uploaded = 0;
  let needsInfo = 0;
  let errors = 0;

  // Get contato with obras and fases for LLM extraction
  const contato = await db.contato.findUnique({
    where: { id: input.contatoId },
    include: {
      obras: {
        include: {
          obra: {
            include: { fases: { orderBy: { ordem: "asc" } } },
          },
        },
      },
    },
  });

  if (!contato) {
    console.error(`[process-photos] Contato ${input.contatoId} nao encontrado`);
    return { uploaded: 0, needsInfo: 0, errors: 1 };
  }

  // Extract obra+fase via LLM (once per message)
  const obrasWithFases = contato.obras.map((co) => ({
    id: co.obra.id,
    nome: co.obra.nome,
    fases: co.obra.fases.map((f) => ({ id: f.id, nome: f.nome })),
  }));

  const extraction = await extractObraFase(input.content || "", obrasWithFases);

  const isLowConfidence =
    extraction.confianca === "baixa" || !extraction.obraId || !extraction.faseId;

  // Send NEEDS_INFO message once per message (not per attachment)
  if (isLowConfidence) {
    try {
      await sendMessage(
        input.conversationId,
        `Nao consegui identificar a obra e fase da foto. Por favor, envie novamente indicando o nome da obra e a fase. Exemplo: "Residencial Sul - Fundacao"`
      );
    } catch (sendError) {
      console.error("[process-photos] Erro ao enviar esclarecimento:", sendError);
    }
  }

  // Fetch chatwoot config once (for image download auth)
  const chatwootConfig = await db.chatwootConfig.findFirst();

  // Process each attachment
  for (const attachment of input.attachments) {
    try {
      // Create foto record
      const foto = await db.foto.create({
        data: {
          nomeArquivo: "",
          mensagemOriginal: input.content || "",
          chatwootMessageId: input.messageId,
          chatwootAttachmentId: attachment.id,
          contatoId: input.contatoId,
          status: isLowConfidence ? "NEEDS_INFO" : "PENDING",
        },
      });

      if (isLowConfidence) {
        needsInfo++;
        continue;
      }

      // Update with obra+fase
      await db.foto.update({
        where: { id: foto.id },
        data: {
          obraId: extraction.obraId,
          faseId: extraction.faseId,
          status: "PROCESSING",
        },
      });

      // Download image from Chatwoot (config fetched outside loop)
      const imageUrl = attachment.data_url;

      const imageRes = await fetch(imageUrl, {
        headers: chatwootConfig?.apiToken
          ? { api_access_token: chatwootConfig.apiToken }
          : {},
      });

      if (!imageRes.ok) {
        throw new Error(`Falha ao baixar imagem: ${imageRes.status}`);
      }

      const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
      const mimeType = imageRes.headers.get("content-type") || "image/jpeg";

      // Upload to Drive
      const { fileId, folderId, fileName } = await uploadPhoto(
        extraction.obraNome || "sem-nome",
        extraction.faseNome || "sem-fase",
        imageBuffer,
        mimeType,
        new Date()
      );

      // Update foto record
      await db.foto.update({
        where: { id: foto.id },
        data: {
          nomeArquivo: fileName,
          driveFileId: fileId,
          driveFolderId: folderId,
          status: "UPLOADED",
        },
      });

      uploaded++;
      console.log(`[process-photos] Foto ${fileName} uploaded`);
    } catch (error) {
      errors++;
      console.error(
        `[process-photos] Erro ao processar attachment ${attachment.id}:`,
        error
      );

      // Try to mark as failed
      try {
        await db.foto.updateMany({
          where: { chatwootAttachmentId: attachment.id },
          data: { status: "FAILED" },
        });
      } catch {
        // ignore
      }
    }
  }

  console.log(
    `[process-photos] Concluido: ${uploaded} uploaded, ${needsInfo} needs_info, ${errors} erros`
  );

  return { uploaded, needsInfo, errors };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors related to process-photos.ts.

- [ ] **Step 3: Commit**

```bash
git add src/lib/jobs/process-photos.ts
git commit -m "feat: add webhook photo processor extracted from poll-responses"
```

---

### Task 5: Build Webhook Endpoint

**Files:**
- Modify: `src/app/api/webhooks/chatwoot/route.ts` (replace temporary endpoint)

- [ ] **Step 1: Replace temporary endpoint with full implementation**

Replace the entire contents of `src/app/api/webhooks/chatwoot/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/utils/normalize-phone";
import { processWebhookPhotos } from "@/lib/jobs/process-photos";
import type { WebhookPayload } from "@/lib/chatwoot/types";

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as WebhookPayload;

    // Filter 1: only message_created events
    if (payload.event !== "message_created") {
      return NextResponse.json({ status: "ignored", reason: "not message_created" });
    }

    // Filter 2: only incoming messages
    if (payload.message_type !== "incoming") {
      return NextResponse.json({ status: "ignored", reason: "not incoming" });
    }

    // Filter 3: must have image/video attachments
    const mediaAttachments = (payload.attachments || []).filter(
      (a) => a.file_type === "image" || a.file_type === "video"
    );

    if (mediaAttachments.length === 0) {
      return NextResponse.json({ status: "ignored", reason: "no media attachments" });
    }

    // Filter 4: sender phone must match a registered contact
    const senderPhone = payload.sender?.phone_number;
    if (!senderPhone) {
      return NextResponse.json({ status: "ignored", reason: "no phone number" });
    }

    const normalizedSenderPhone = normalizePhone(senderPhone);
    const contatos = await db.contato.findMany({
      select: { id: true, telefone: true },
    });

    const matchedContato = contatos.find(
      (c) => normalizePhone(c.telefone) === normalizedSenderPhone
    );

    if (!matchedContato) {
      console.log(
        `[webhook] Contato nao cadastrado: ${senderPhone}`
      );
      return NextResponse.json({ status: "ignored", reason: "contact not registered" });
    }

    // Deduplication: filter out already-processed attachments
    const newAttachments = [];
    for (const att of mediaAttachments) {
      const existing = await db.foto.findUnique({
        where: { chatwootAttachmentId: att.id },
      });
      if (!existing) {
        newAttachments.push(att);
      }
    }

    if (newAttachments.length === 0) {
      return NextResponse.json({ status: "ignored", reason: "all attachments already processed" });
    }

    // Process photos inline (await)
    const result = await processWebhookPhotos({
      messageId: payload.id,
      content: payload.content || "",
      conversationId: payload.conversation.id,
      attachments: newAttachments,
      contatoId: matchedContato.id,
    });

    console.log(
      `[webhook] Processado msg ${payload.id}: ${result.uploaded} uploaded, ${result.needsInfo} needs_info, ${result.errors} erros`
    );

    return NextResponse.json({ status: "processed", ...result });
  } catch (error) {
    console.error("[webhook] Erro ao processar webhook:", error);
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}
```

Note: the catch block returns 200 even on error to prevent Chatwoot from retrying endlessly. The retry job will handle failed photos.

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/webhooks/chatwoot/route.ts
git commit -m "feat: implement webhook endpoint with filtering and inline processing"
```

---

### Task 6: Refactor Scheduler (Remove Polling, Add Retry)

**Files:**
- Modify: `src/lib/jobs/scheduler.ts`

- [ ] **Step 1: Replace scheduler with retry + notifications only**

Replace the entire contents of `src/lib/jobs/scheduler.ts`:

```typescript
import cron, { type ScheduledTask } from "node-cron";
import { sendNotifications } from "./send-notifications";
import { retryFailedPhotos } from "./retry-photos";

let notificationTask: ScheduledTask | null = null;
let retryTask: ScheduledTask | null = null;
let initialized = false;

export async function initScheduler() {
  if (initialized) return;
  initialized = true;

  console.log("[scheduler] Inicializando...");

  // Retry failed photos every 5 minutes
  retryTask = cron.schedule("*/5 * * * *", async () => {
    console.log("[scheduler] Executando retry de fotos...");
    try {
      await retryFailedPhotos();
    } catch (error) {
      console.error("[scheduler] Erro no retry:", error);
    }
  });

  console.log("[scheduler] Retry de fotos agendado a cada 5 minutos");

  // Notification schedule is dynamic — checked every minute
  notificationTask = cron.schedule("* * * * *", async () => {
    try {
      const { db } = await import("@/lib/db");
      const config = await db.notificacaoConfig.findFirst({
        where: { ativo: true },
      });

      if (!config) return;

      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

      if (currentTime === config.horario) {
        console.log("[scheduler] Horario de envio! Enviando notificacoes...");
        await sendNotifications();
      }
    } catch (error) {
      console.error("[scheduler] Erro ao verificar notificacoes:", error);
    }
  });

  console.log("[scheduler] Verificacao de notificacoes agendada (cada minuto)");
}

export function stopScheduler() {
  notificationTask?.stop();
  retryTask?.stop();
  initialized = false;
  console.log("[scheduler] Parado");
}
```

- [ ] **Step 2: Create retry-photos.ts**

Create `src/lib/jobs/retry-photos.ts`:

```typescript
import { db } from "@/lib/db";
import { extractObraFase } from "@/lib/agent/extractor";
import { uploadPhoto } from "@/lib/drive/upload";

const MAX_RETRIES = 5;

export async function retryFailedPhotos(): Promise<{
  retried: number;
  succeeded: number;
  permanentlyFailed: number;
}> {
  let retried = 0;
  let succeeded = 0;
  let permanentlyFailed = 0;

  // Only retry photos that need LLM extraction (no obraId/faseId yet).
  // Photos that already have obra/fase but failed at upload cannot be retried
  // because we don't persist the data_url. Those stay FAILED for admin resolution via UI.
  const photos = await db.foto.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      retryCount: { lt: MAX_RETRIES },
      chatwootAttachmentId: { not: null },
      obraId: null, // only photos missing LLM extraction
    },
    include: {
      contato: {
        include: {
          obras: {
            include: {
              obra: {
                include: { fases: { orderBy: { ordem: "asc" } } },
              },
            },
          },
        },
      },
    },
    take: 10, // process in batches
  });

  if (photos.length === 0) return { retried: 0, succeeded: 0, permanentlyFailed: 0 };

  console.log(`[retry] ${photos.length} fotos para reprocessar`);

  for (const foto of photos) {
    retried++;

    // Increment retry count first
    await db.foto.update({
      where: { id: foto.id },
      data: { retryCount: { increment: 1 } },
    });

    // Check if max retries reached after increment
    if (foto.retryCount + 1 >= MAX_RETRIES) {
      await db.foto.update({
        where: { id: foto.id },
        data: { status: "FAILED" },
      });
      permanentlyFailed++;
      console.log(`[retry] Foto ${foto.id} marcada como FAILED permanente (${MAX_RETRIES} tentativas)`);
      continue;
    }

    try {
      if (!foto.contato) {
        console.error(`[retry] Foto ${foto.id} sem contato associado`);
        continue;
      }

      const obrasWithFases = foto.contato.obras.map((co) => ({
        id: co.obra.id,
        nome: co.obra.nome,
        fases: co.obra.fases.map((f) => ({ id: f.id, nome: f.nome })),
      }));

      const extraction = await extractObraFase(
        foto.mensagemOriginal || "",
        obrasWithFases
      );

      if (
        extraction.confianca === "baixa" ||
        !extraction.obraId ||
        !extraction.faseId
      ) {
        // Still can't extract, will retry again later
        continue;
      }

      await db.foto.update({
        where: { id: foto.id },
        data: {
          obraId: extraction.obraId,
          faseId: extraction.faseId,
          status: "PROCESSING",
        },
      });

      succeeded++;
      console.log(`[retry] Foto ${foto.id} extracao LLM bem sucedida (tentativa ${foto.retryCount + 1})`);
    } catch (error) {
      console.error(`[retry] Erro ao reprocessar foto ${foto.id}:`, error);
      await db.foto.update({
        where: { id: foto.id },
        data: { status: "FAILED" },
      });
    }
  }

  console.log(
    `[retry] Concluido: ${retried} retentativas, ${succeeded} sucesso, ${permanentlyFailed} falhas permanentes`
  );

  return { retried, succeeded, permanentlyFailed };
}
```

**Important note:** The retry job can re-run LLM extraction but cannot re-download images since we don't persist the `data_url`. For upload failures, the admin resolves via UI. This is a known limitation — to fully support retry of uploads, we would need to add a `sourceUrl` field to the Foto model. This can be added in a future iteration if needed.

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/jobs/scheduler.ts src/lib/jobs/retry-photos.ts
git commit -m "feat: replace polling scheduler with retry job for failed photos"
```

---

### Task 7: Delete Polling Code

**Files:**
- Delete: `src/lib/chatwoot/polling.ts`
- Delete: `src/lib/jobs/poll-responses.ts`
- Modify: `src/app/api/cron/polling/route.ts`

- [ ] **Step 1: Delete polling.ts**

```bash
rm src/lib/chatwoot/polling.ts
```

- [ ] **Step 2: Delete poll-responses.ts**

```bash
rm src/lib/jobs/poll-responses.ts
```

- [ ] **Step 3: Update cron polling route**

Replace `src/app/api/cron/polling/route.ts` to trigger retry instead of polling:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { retryFailedPhotos } from "@/lib/jobs/retry-photos";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const result = await retryFailedPhotos();
  return NextResponse.json(result);
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors related to deleted files (no remaining imports of polling.ts or poll-responses.ts).

- [ ] **Step 5: Commit**

```bash
git add src/lib/chatwoot/polling.ts src/lib/jobs/poll-responses.ts src/app/api/cron/polling/route.ts
git commit -m "refactor: remove Chatwoot DB polling code, update cron route to use retry"
```

---

### Task 8: Update Chatwoot Config API and UI

**Files:**
- Modify: `src/app/api/configuracoes/chatwoot/route.ts`
- Modify: `src/app/(dashboard)/configuracoes/page.tsx:124-133` (state declarations)
- Modify: `src/app/(dashboard)/configuracoes/page.tsx:163-172` (data loading)
- Modify: `src/app/(dashboard)/configuracoes/page.tsx:206-230` (save function)
- Modify: `src/app/(dashboard)/configuracoes/page.tsx:363-394` (DB fields card in JSX)

- [ ] **Step 1: Simplify Chatwoot config API route**

Replace the entire contents of `src/app/api/configuracoes/chatwoot/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const config = await db.chatwootConfig.findFirst();
  if (config) {
    return NextResponse.json({
      ...config,
      apiToken: "***",
    });
  }
  return NextResponse.json(null);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const existing = await db.chatwootConfig.findFirst();

  const data = {
    baseUrl: body.baseUrl,
    apiToken: body.apiToken,
    accountId: parseInt(body.accountId),
    inboxId: parseInt(body.inboxId),
  };

  const config = existing
    ? await db.chatwootConfig.update({ where: { id: existing.id }, data })
    : await db.chatwootConfig.create({ data });

  return NextResponse.json({ ...config, apiToken: "***" });
}
```

- [ ] **Step 2: Remove DB state variables from config page**

In `src/app/(dashboard)/configuracoes/page.tsx`, remove lines 129-133 (the DB state declarations):

```diff
  // Chatwoot
  const [cwBaseUrl, setCwBaseUrl] = useState("");
  const [cwApiToken, setCwApiToken] = useState("");
  const [cwAccountId, setCwAccountId] = useState("");
  const [cwInboxId, setCwInboxId] = useState("");
- const [cwDbHost, setCwDbHost] = useState("");
- const [cwDbPort, setCwDbPort] = useState("5432");
- const [cwDbName, setCwDbName] = useState("");
- const [cwDbUser, setCwDbUser] = useState("");
- const [cwDbPassword, setCwDbPassword] = useState("");
```

- [ ] **Step 3: Remove DB data loading**

In the `useEffect` that loads data (around line 163), remove the DB field assignments:

```diff
    fetch("/api/configuracoes/chatwoot").then((r) => r.json()).then((data) => {
      if (data) {
        setCwBaseUrl(data.baseUrl || "");
        setCwAccountId(data.accountId?.toString() || "");
        setCwInboxId(data.inboxId?.toString() || "");
-       setCwDbHost(data.dbHost || "");
-       setCwDbPort(data.dbPort?.toString() || "5432");
-       setCwDbName(data.dbName || "");
-       setCwDbUser(data.dbUser || "");
      }
    });
```

- [ ] **Step 4: Simplify saveChatwoot function**

Remove DB fields from the save body (around line 206):

```diff
  async function saveChatwoot() {
    setLoading(true);
    try {
      await fetch("/api/configuracoes/chatwoot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: cwBaseUrl,
          apiToken: cwApiToken,
          accountId: cwAccountId,
          inboxId: cwInboxId,
-         dbHost: cwDbHost,
-         dbPort: cwDbPort,
-         dbName: cwDbName,
-         dbUser: cwDbUser,
-         dbPassword: cwDbPassword,
        }),
      });
```

- [ ] **Step 5: Remove the DB fields Card from JSX**

Remove the entire "Banco de Dados (PostgreSQL)" Card block (lines 364-394):

```diff
          </Card>

-         <Card>
-           <CardHeader>
-             <CardTitle className="text-base">Banco de Dados (PostgreSQL)</CardTitle>
-           </CardHeader>
-           <CardContent className="space-y-3">
-             <div className="grid grid-cols-2 gap-3">
-               <div>
-                 <Label>Host</Label>
-                 <Input value={cwDbHost} onChange={(e) => setCwDbHost(e.target.value)} placeholder="localhost" />
-               </div>
-               <div>
-                 <Label>Porta</Label>
-                 <Input value={cwDbPort} onChange={(e) => setCwDbPort(e.target.value)} placeholder="5432" />
-               </div>
-             </div>
-             <div>
-               <Label>Nome do Banco</Label>
-               <Input value={cwDbName} onChange={(e) => setCwDbName(e.target.value)} placeholder="chatwoot_production" />
-             </div>
-             <div className="grid grid-cols-2 gap-3">
-               <div>
-                 <Label>Usuário</Label>
-                 <Input value={cwDbUser} onChange={(e) => setCwDbUser(e.target.value)} placeholder="chatwoot_reader" />
-               </div>
-               <div>
-                 <Label>Senha</Label>
-                 <Input type="password" value={cwDbPassword} onChange={(e) => setCwDbPassword(e.target.value)} />
-               </div>
-             </div>
-           </CardContent>
-         </Card>

          <Button onClick={saveChatwoot} disabled={loading}>
```

- [ ] **Step 6: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 7: Commit**

```bash
git add src/app/api/configuracoes/chatwoot/route.ts src/app/\(dashboard\)/configuracoes/page.tsx
git commit -m "refactor: remove Chatwoot DB config from API and UI"
```

---

### Task 9: Remove pg Dependency (if unused)

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Check if pg is used elsewhere**

Run:
```bash
grep -r "from \"pg\"" src/ --include="*.ts" --include="*.tsx"
grep -r "require.*pg" src/ --include="*.ts" --include="*.tsx"
```

Expected: Only `src/lib/chatwoot/polling.ts` should reference it (already deleted). If no results, proceed to remove.

- [ ] **Step 2: Remove pg package**

Run:
```bash
npm uninstall pg @types/pg
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove pg dependency (no longer polling Chatwoot DB)"
```

---

### Task 10: Verify Build and Manual Test

- [ ] **Step 1: Run full build**

Run:
```bash
npm run build
```

Expected: Build completes successfully with no errors.

- [ ] **Step 2: Test locally (dev mode)**

Run:
```bash
npm run dev
```

Then test the webhook endpoint with a curl simulating a Chatwoot payload:

```bash
curl -X POST http://localhost:3000/api/webhooks/chatwoot \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message_created",
    "id": 9999,
    "content": "teste",
    "content_type": "text",
    "message_type": "incoming",
    "sender": { "id": 1, "name": "Test", "phone_number": "+5500000000000" },
    "inbox": { "id": 1, "name": "test" },
    "conversation": { "id": 1, "inbox_id": 1, "status": "open" },
    "attachments": []
  }'
```

Expected: `{"status":"ignored","reason":"no media attachments"}` — proves filtering works.

- [ ] **Step 3: Verify config page loads without DB fields**

Visit `http://localhost:3000/configuracoes` (after login), go to Chatwoot tab. Verify only API fields are shown (URL, Token, Account ID, Inbox ID). No DB fields.

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address issues found during manual testing"
```

---

### Task 11: Deploy and Production Test

- [ ] **Step 1: Push to remote**

```bash
git push origin main
```

- [ ] **Step 2: Deploy on server**

On the server via SSH:
```bash
cd /opt/relatorio-fotos
git pull origin main
npx prisma migrate deploy
docker build -t relatorio-fotos .
docker service update --force relatorio-fotos_relatorio-fotos
```

- [ ] **Step 3: Test webhook in production**

Send a photo via WhatsApp to the Chatwoot number. Check container logs:
```bash
docker service logs relatorio-fotos_relatorio-fotos --tail 50
```

Expected: Logs show webhook received, filtering passed, photo processed and uploaded to Drive.

- [ ] **Step 4: Verify in app UI**

Visit `https://relatorio01.fortimaservidor.org/fotos` and confirm the photo appears with status UPLOADED.
