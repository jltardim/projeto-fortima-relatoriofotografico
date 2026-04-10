import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// POST /api/configuracoes/config-password
// Body: { action: "verify" | "set", password: string }
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  if (body.action === "verify") {
    // Se não tem senha configurada, acesso livre (primeira vez)
    if (!user.configPasswordHash) {
      return NextResponse.json({ valid: true, firstTime: true });
    }

    const valid = await bcrypt.compare(body.password, user.configPasswordHash);
    return NextResponse.json({ valid });
  }

  if (body.action === "set") {
    if (!body.password || body.password.length < 4) {
      return NextResponse.json(
        { error: "Senha deve ter no mínimo 4 caracteres" },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(body.password, 10);
    await db.user.update({
      where: { id: user.id },
      data: { configPasswordHash: hash },
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}

// GET - verifica se já tem senha configurada
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });

  return NextResponse.json({
    hasPassword: !!user?.configPasswordHash,
  });
}
