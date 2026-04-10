import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ObraCard } from "@/components/obras/obra-card";

export default async function ObrasPage() {
  const obras = await db.obra.findMany({
    include: {
      fases: { orderBy: { ordem: "asc" } },
      _count: { select: { contatos: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Obras</h1>
        <Link href="/obras/nova">
          <Button>+ Nova Obra</Button>
        </Link>
      </div>

      {obras.length === 0 ? (
        <p className="text-muted-foreground">
          Nenhuma obra cadastrada. Crie a primeira obra para comecar.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {obras.map((obra) => (
            <ObraCard
              key={obra.id}
              id={obra.id}
              nome={obra.nome}
              endereco={obra.endereco}
              fasesCount={obra.fases.length}
              contatosCount={obra._count.contatos}
            />
          ))}
        </div>
      )}
    </div>
  );
}
