import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const config = await db.llmConfig.findFirst();
  if (config) {
    return NextResponse.json({
      ...config,
      openrouterApiKey: config.openrouterApiKey ? "***" : "",
    });
  }
  return NextResponse.json(null);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const existing = await db.llmConfig.findFirst();

  const data: { openrouterModel: string; openrouterApiKey?: string } = {
    openrouterModel: body.openrouterModel,
  };

  // Só atualiza a key se não for o placeholder
  if (body.openrouterApiKey && body.openrouterApiKey !== "***") {
    data.openrouterApiKey = body.openrouterApiKey;
  }

  if (existing) {
    if (!data.openrouterApiKey) delete data.openrouterApiKey;
    const config = await db.llmConfig.update({
      where: { id: existing.id },
      data,
    });
    return NextResponse.json({ ...config, openrouterApiKey: "***" });
  }

  if (!data.openrouterApiKey) {
    return NextResponse.json(
      { error: "API Key é obrigatória" },
      { status: 400 }
    );
  }

  const config = await db.llmConfig.create({ data: data as { openrouterApiKey: string; openrouterModel: string } });
  return NextResponse.json({ ...config, openrouterApiKey: "***" });
}
