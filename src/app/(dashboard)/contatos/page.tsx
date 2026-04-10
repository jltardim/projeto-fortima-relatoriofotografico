import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ContatoCard } from "@/components/contatos/contato-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";

export default async function ContatosPage() {
  const contatos = await db.contato.findMany({
    include: {
      obras: { include: { obra: { select: { id: true, nome: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Contatos</h1>
        <Link href="/contatos/novo">
          <Button>+ Novo Contato</Button>
        </Link>
      </div>

      {contatos.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum contato cadastrado"
          description="Adicione mestres de obra e responsáveis para começar a receber fotos via WhatsApp."
          actionLabel="+ Novo Contato"
          actionHref="/contatos/novo"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contatos.map((contato) => (
            <ContatoCard
              key={contato.id}
              id={contato.id}
              nome={contato.nome}
              telefone={contato.telefone}
              obras={contato.obras}
            />
          ))}
        </div>
      )}
    </div>
  );
}
