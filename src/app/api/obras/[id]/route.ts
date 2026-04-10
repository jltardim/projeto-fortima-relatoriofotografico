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

  const obra = await db.obra.findUnique({
    where: { id: params.id },
    include: {
      fases: { orderBy: { ordem: "asc" } },
      contatos: {
        include: { contato: true },
      },
      _count: { select: { fotos: true } },
    },
  });

  if (!obra) {
    return NextResponse.json({ error: "Obra nao encontrada" }, { status: 404 });
  }

  return NextResponse.json(obra);
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

  const obra = await db.obra.update({
    where: { id: params.id },
    data: {
      nome: body.nome,
      endereco: body.endereco || null,
    },
    include: { fases: { orderBy: { ordem: "asc" } } },
  });

  return NextResponse.json(obra);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  await db.obra.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
