import { Pool } from "pg";
import { db } from "@/lib/db";
import type { PolledMessage } from "./types";

let pool: Pool | null = null;

async function getPool(): Promise<Pool> {
  if (pool) return pool;

  const config = await db.chatwootConfig.findFirst();
  if (!config) throw new Error("Chatwoot nao configurado");

  pool = new Pool({
    host: config.dbHost,
    port: config.dbPort,
    database: config.dbName,
    user: config.dbUser,
    password: config.dbPassword,
    max: 5,
    idleTimeoutMillis: 30000,
  });

  return pool;
}

export async function pollNewMessages(): Promise<PolledMessage[]> {
  const config = await db.chatwootConfig.findFirst();
  if (!config) throw new Error("Chatwoot nao configurado");

  // Get the last processed message ID to avoid reprocessing
  const lastProcessed = await db.foto.findFirst({
    where: { chatwootMessageId: { not: null } },
    orderBy: { chatwootMessageId: "desc" },
    select: { chatwootMessageId: true },
  });

  const lastId = lastProcessed?.chatwootMessageId ?? 0;
  const pgPool = await getPool();

  const result = await pgPool.query<{
    message_id: number;
    content: string;
    created_at: Date;
    conversation_id: number;
    file_url: string;
    file_type: string;
    phone_number: string;
  }>(
    `SELECT
      m.id as message_id,
      m.content,
      m.created_at,
      m.conversation_id,
      a.data_url as file_url,
      a.file_type::text as file_type,
      c.phone_number
    FROM messages m
    JOIN attachments a ON a.message_id = m.id
    JOIN conversations conv ON conv.id = m.conversation_id
    JOIN contacts c ON c.id = conv.contact_id
    WHERE conv.inbox_id = $1
      AND m.message_type = 0
      AND m.id > $2
      AND a.file_type IN (0, 1)
    ORDER BY m.id ASC
    LIMIT 50`,
    [config.inboxId, lastId]
  );

  return result.rows.map((row) => ({
    messageId: row.message_id,
    content: row.content || "",
    createdAt: row.created_at,
    conversationId: row.conversation_id,
    fileUrl: row.file_url,
    fileType: row.file_type,
    phoneNumber: row.phone_number,
  }));
}
