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

  const fases = await db.fase.findMany({
    where: { obraId: params.id },
    orderBy: { ordem: "asc" },
  });

  return NextResponse.json(fases);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.nome || typeof body.nome !== "string") {
    return NextResponse.json({ error: "Nome da fase e obrigatorio" }, { status: 400 });
  }

  const maxOrdem = await db.fase.findFirst({
    where: { obraId: params.id },
    orderBy: { ordem: "desc" },
    select: { ordem: true },
  });

  const fase = await db.fase.create({
    data: {
      nome: body.nome,
      ordem: (maxOrdem?.ordem ?? 0) + 1,
      obraId: params.id,
    },
  });

  return NextResponse.json(fase, { status: 201 });
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

  if (!Array.isArray(body.fases)) {
    return NextResponse.json({ error: "Lista de fases e obrigatoria" }, { status: 400 });
  }

  await db.$transaction(
    body.fases.map((fase: { id: string; nome: string; ordem: number }) =>
      db.fase.update({
        where: { id: fase.id },
        data: { nome: fase.nome, ordem: fase.ordem },
      })
    )
  );

  const fases = await db.fase.findMany({
    where: { obraId: params.id },
    orderBy: { ordem: "asc" },
  });

  return NextResponse.json(fases);
}
