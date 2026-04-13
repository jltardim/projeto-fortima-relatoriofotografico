import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const config = await db.chatwootConfig.findFirst();
  if (config) {
    return NextResponse.json({
      ...config,
      apiToken: "***",
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
  const existing = await db.chatwootConfig.findFirst();

  const data = {
    baseUrl: body.baseUrl,
    apiToken: body.apiToken,
    accountId: parseInt(body.accountId),
    inboxId: parseInt(body.inboxId),
  };

  const config = existing
    ? await db.chatwootConfig.update({ where: { id: existing.id }, data })
    : await db.chatwootConfig.create({ data });

  return NextResponse.json({ ...config, apiToken: "***" });
}
