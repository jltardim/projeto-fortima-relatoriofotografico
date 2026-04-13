import { db } from "@/lib/db";
import { extractObraFase } from "@/lib/agent/extractor";

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
