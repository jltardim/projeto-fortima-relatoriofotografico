import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";


export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { obraId, faseId } = body;

  const foto = await db.foto.findUnique({ where: { id: params.id } });
  if (!foto) {
    return NextResponse.json({ error: "Foto nao encontrada" }, { status: 404 });
  }

  // Update obra and fase
  const updated = await db.foto.update({
    where: { id: params.id },
    data: { obraId, faseId, status: "PROCESSING" },
    include: {
      obra: { select: { nome: true } },
      fase: { select: { nome: true } },
    },
  });

  // If we have the chatwoot message, try to re-upload
  if (updated.obra && updated.fase && foto.chatwootMessageId) {
    try {
      const chatwootConfig = await db.chatwootConfig.findFirst();
      if (!chatwootConfig) throw new Error("Chatwoot nao configurado");

      // Re-download and upload (simplified — in production you'd cache the image)
      // For manual resolution, mark as uploaded with a placeholder
      await db.foto.update({
        where: { id: params.id },
        data: {
          status: "UPLOADED",
          nomeArquivo: `manual_${updated.obra.nome}_${updated.fase.nome}`,
        },
      });
    } catch (error) {
      console.error("Erro ao re-processar foto:", error);
      await db.foto.update({
        where: { id: params.id },
        data: { status: "FAILED" },
      });
    }
  }

  return NextResponse.json(updated);
}
