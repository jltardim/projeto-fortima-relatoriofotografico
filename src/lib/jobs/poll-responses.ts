import { db } from "@/lib/db";
import { pollNewMessages } from "@/lib/chatwoot/polling";
import { extractObraFase } from "@/lib/agent/extractor";
import { uploadPhoto } from "@/lib/drive/upload";
import { sendMessage } from "@/lib/chatwoot/api";

export async function pollResponses(): Promise<{
  processed: number;
  uploaded: number;
  needsInfo: number;
  errors: number;
}> {
  let processed = 0;
  let uploaded = 0;
  let needsInfo = 0;
  let errors = 0;

  try {
    const messages = await pollNewMessages();
    console.log(`[poll-responses] ${messages.length} novas mensagens com foto`);

    for (const msg of messages) {
      processed++;

      try {
        // Find contato by phone
        const contato = await db.contato.findFirst({
          where: { telefone: msg.phoneNumber },
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
          console.log(
            `[poll-responses] Contato nao cadastrado: ${msg.phoneNumber}`
          );
          continue;
        }

        // Create foto record
        const foto = await db.foto.create({
          data: {
            nomeArquivo: "",
            mensagemOriginal: msg.content,
            chatwootMessageId: msg.messageId,
            contatoId: contato.id,
            status: "PENDING",
          },
        });

        // Extract obra+fase via LLM
        const obrasWithFases = contato.obras.map((co) => ({
          id: co.obra.id,
          nome: co.obra.nome,
          fases: co.obra.fases.map((f) => ({ id: f.id, nome: f.nome })),
        }));

        const extraction = await extractObraFase(msg.content, obrasWithFases);

        if (
          extraction.confianca === "baixa" ||
          !extraction.obraId ||
          !extraction.faseId
        ) {
          // Mark as needs info and ask foreman
          await db.foto.update({
            where: { id: foto.id },
            data: { status: "NEEDS_INFO" },
          });

          try {
            await sendMessage(
              msg.conversationId,
              `Nao consegui identificar a obra e fase da foto. Por favor, envie novamente indicando o nome da obra e a fase. Exemplo: "Residencial Sul - Fundacao"`
            );
          } catch (sendError) {
            console.error("[poll-responses] Erro ao enviar esclarecimento:", sendError);
          }

          needsInfo++;
          continue;
        }

        // Update foto with obra+fase
        await db.foto.update({
          where: { id: foto.id },
          data: {
            obraId: extraction.obraId,
            faseId: extraction.faseId,
            status: "PROCESSING",
          },
        });

        // Download image from Chatwoot
        const chatwootConfig = await db.chatwootConfig.findFirst();
        let imageUrl = msg.fileUrl;
        if (imageUrl && !imageUrl.startsWith("http")) {
          imageUrl = `${chatwootConfig?.baseUrl}${imageUrl}`;
        }

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
          msg.createdAt
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
        console.log(`[poll-responses] Foto ${fileName} uploaded`);
      } catch (error) {
        errors++;
        console.error(`[poll-responses] Erro ao processar msg ${msg.messageId}:`, error);

        // Try to mark as failed
        try {
          await db.foto.updateMany({
            where: { chatwootMessageId: msg.messageId },
            data: { status: "FAILED" },
          });
        } catch {
          // ignore
        }
      }
    }
  } catch (error) {
    console.error("[poll-responses] Erro no polling:", error);
  }

  console.log(
    `[poll-responses] Concluido: ${processed} processados, ${uploaded} uploaded, ${needsInfo} needs_info, ${errors} erros`
  );

  return { processed, uploaded, needsInfo, errors };
}
