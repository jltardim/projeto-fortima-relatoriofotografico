import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Camera, ImageUp } from "lucide-react";

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

  const stats = [
    { label: "Obras", value: obrasCount, icon: Building2 },
    { label: "Contatos", value: contatosCount, icon: Users },
    { label: "Fotos Hoje", value: fotosToday, icon: Camera },
    {
      label: "Total Fotos",
      value: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      icon: ImageUp,
    },
  ];

  const statusItems = [
    { status: "UPLOADED", label: "Uploaded", variant: "text-emerald-700 bg-emerald-50" },
    { status: "PENDING", label: "Pendente", variant: "text-amber-700 bg-amber-50" },
    { status: "PROCESSING", label: "Processando", variant: "text-sky-700 bg-sky-50" },
    { status: "NEEDS_INFO", label: "Precisa Info", variant: "text-orange-700 bg-orange-50" },
    { status: "FAILED", label: "Falha", variant: "text-rose-700 bg-rose-50" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Status das Fotos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {statusItems.map(({ status, label, variant }) => (
            <Card key={status} className="overflow-hidden">
              <CardContent className="pt-4">
                <p className={`text-2xl font-bold ${variant.split(" ")[0]}`}>
                  {statusCounts[status] || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
