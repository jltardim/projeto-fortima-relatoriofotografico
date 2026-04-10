import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const obras = await db.obra.findMany({
    include: {
      fases: { orderBy: { ordem: "asc" } },
      _count: { select: { contatos: true, fotos: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(obras);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.nome || typeof body.nome !== "string") {
    return NextResponse.json({ error: "Nome e obrigatorio" }, { status: 400 });
  }

  const obra = await db.obra.create({
    data: {
      nome: body.nome,
      endereco: body.endereco || null,
      fases: {
        create: (body.fases || []).map((fase: string, index: number) => ({
          nome: fase,
          ordem: index + 1,
        })),
      },
    },
    include: { fases: { orderBy: { ordem: "asc" } } },
  });

  return NextResponse.json(obra, { status: 201 });
}
