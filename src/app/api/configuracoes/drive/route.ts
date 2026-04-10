import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const config = await db.driveConfig.findFirst();
  // Don't return credentials in GET
  if (config) {
    return NextResponse.json({
      ...config,
      credentialsJson: config.credentialsJson ? "***configurado***" : "",
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
  const existing = await db.driveConfig.findFirst();

  const data = {
    folderIdRaiz: body.folderIdRaiz,
    serviceAccountEmail: body.serviceAccountEmail,
    credentialsJson: body.credentialsJson,
  };

  const config = existing
    ? await db.driveConfig.update({ where: { id: existing.id }, data })
    : await db.driveConfig.create({ data });

  return NextResponse.json({ ...config, credentialsJson: "***configurado***" });
}
