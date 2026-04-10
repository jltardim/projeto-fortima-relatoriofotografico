import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const contato = await db.contato.findUnique({
    where: { id: params.id },
    include: {
      obras: { include: { obra: { select: { id: true, nome: true } } } },
      fotos: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          obra: { select: { nome: true } },
          fase: { select: { nome: true } },
        },
      },
    },
  });

  if (!contato) {
    return NextResponse.json({ error: "Contato nao encontrado" }, { status: 404 });
  }

  return NextResponse.json(contato);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();

  // Disconnect all existing obras and reconnect with new list
  await db.contatoObra.deleteMany({ where: { contatoId: params.id } });

  const contato = await db.contato.update({
    where: { id: params.id },
    data: {
      nome: body.nome,
      telefone: body.telefone,
      chatwootContactId: body.chatwootContactId || null,
      obras: {
        create: (body.obraIds || []).map((obraId: string) => ({
          obraId,
        })),
      },
    },
    include: {
      obras: { include: { obra: { select: { id: true, nome: true } } } },
    },
  });

  return NextResponse.json(contato);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  await db.contato.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
