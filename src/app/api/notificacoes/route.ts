import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const config = await db.notificacaoConfig.findFirst();
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const existing = await db.notificacaoConfig.findFirst();

  const data = {
    mensagemTemplate: body.mensagemTemplate,
    horario: body.horario,
    diasSemana: body.diasSemana,
    ativo: body.ativo ?? true,
  };

  const config = existing
    ? await db.notificacaoConfig.update({ where: { id: existing.id }, data })
    : await db.notificacaoConfig.create({ data });

  return NextResponse.json(config);
}
