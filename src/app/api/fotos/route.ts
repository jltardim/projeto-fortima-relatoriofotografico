import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const obraId = searchParams.get("obraId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  const where: Prisma.FotoWhereInput = {};
  if (status) where.status = status as Prisma.EnumFotoStatusFilter;
  if (obraId) where.obraId = obraId;

  const [fotos, total] = await Promise.all([
    db.foto.findMany({
      where,
      include: {
        obra: { select: { nome: true } },
        fase: { select: { nome: true } },
        contato: { select: { nome: true, telefone: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.foto.count({ where }),
  ]);

  return NextResponse.json({ fotos, total, page, totalPages: Math.ceil(total / limit) });
}
