import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ObraForm } from "@/components/obras/obra-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteObraButton } from "@/components/obras/delete-obra-button";

export default async function ObraDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const obra = await db.obra.findUnique({
    where: { id: params.id },
    include: {
      fases: { orderBy: { ordem: "asc" } },
      contatos: { include: { contato: true } },
      _count: { select: { fotos: true } },
    },
  });

  if (!obra) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{obra.nome}</h1>
        <DeleteObraButton obraId={obra.id} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Fases</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{obra.fases.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Contatos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{obra.contatos.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Fotos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{obra._count.fotos}</p>
          </CardContent>
        </Card>
      </div>

      {obra.contatos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contatos Vinculados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {obra.contatos.map((co) => (
                <Badge key={co.contato.id} variant="secondary">
                  {co.contato.nome} ({co.contato.telefone})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ObraForm obra={obra} />
    </div>
  );
}
