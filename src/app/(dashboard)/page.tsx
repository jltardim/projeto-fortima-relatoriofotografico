import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const [obrasCount, contatosCount, fotosToday, fotosByStatus] =
    await Promise.all([
      db.obra.count(),
      db.contato.count(),
      db.foto.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      db.foto.groupBy({
        by: ["status"],
        _count: true,
      }),
    ]);

  const statusCounts = Object.fromEntries(
    fotosByStatus.map((s) => [s.status, s._count])
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Obras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{obrasCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contatos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{contatosCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fotos Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fotosToday}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Fotos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {Object.values(statusCounts).reduce((a, b) => a + b, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-4">Status das Fotos</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { status: "UPLOADED", label: "Uploaded", color: "text-green-600" },
          { status: "PENDING", label: "Pendente", color: "text-yellow-600" },
          { status: "PROCESSING", label: "Processando", color: "text-blue-600" },
          { status: "NEEDS_INFO", label: "Precisa Info", color: "text-orange-600" },
          { status: "FAILED", label: "Falha", color: "text-red-600" },
        ].map(({ status, label, color }) => (
          <Card key={status}>
            <CardContent className="pt-4">
              <p className={`text-2xl font-bold ${color}`}>
                {statusCounts[status] || 0}
              </p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
