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
    // Return 200 even on error to prevent Chatwoot retry storms
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}
