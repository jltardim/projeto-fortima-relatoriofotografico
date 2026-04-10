import { db } from "@/lib/db";
import { ContatoForm } from "@/components/contatos/contato-form";

export default async function NovoContatoPage() {
  const obras = await db.obra.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Novo Contato</h1>
      <ContatoForm todasObras={obras} />
    </div>
  );
}
