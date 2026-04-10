import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const contatos = await db.contato.findMany({
    include: {
      obras: { include: { obra: { select: { id: true, nome: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(contatos);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.nome || !body.telefone) {
    return NextResponse.json(
      { error: "Nome e telefone sao obrigatorios" },
      { status: 400 }
    );
  }

  const contato = await db.contato.create({
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

  return NextResponse.json(contato, { status: 201 });
}
