import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ObraCard } from "@/components/obras/obra-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2 } from "lucide-react";

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
        <EmptyState
          icon={Building2}
          title="Nenhuma obra cadastrada"
          description="Cadastre sua primeira obra para começar a organizar fotos e acompanhar o progresso."
          actionLabel="+ Nova Obra"
          actionHref="/obras/nova"
        />
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
