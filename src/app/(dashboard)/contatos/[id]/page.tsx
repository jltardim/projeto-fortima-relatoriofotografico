import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ContatoForm } from "@/components/contatos/contato-form";

export default async function ContatoDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const contato = await db.contato.findUnique({
    where: { id: params.id },
    include: {
      obras: { include: { obra: { select: { id: true, nome: true } } } },
    },
  });

  if (!contato) {
    notFound();
  }

  const todasObras = await db.obra.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Editar Contato</h1>
      <ContatoForm contato={contato} todasObras={todasObras} />
    </div>
  );
}
