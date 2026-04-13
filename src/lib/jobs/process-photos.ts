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
