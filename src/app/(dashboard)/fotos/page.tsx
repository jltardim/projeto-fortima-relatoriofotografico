"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Camera } from "lucide-react";

interface Foto {
  id: string;
  nomeArquivo: string;
  status: string;
  mensagemOriginal: string | null;
  createdAt: string;
  obra: { nome: string } | null;
  fase: { nome: string } | null;
  contato: { nome: string; telefone: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  PROCESSING: "bg-sky-50 text-sky-700 border border-sky-200",
  UPLOADED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  FAILED: "bg-rose-50 text-rose-700 border border-rose-200",
  NEEDS_INFO: "bg-orange-50 text-orange-700 border border-orange-200",
};

export default function FotosPage() {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [polling, setPolling] = useState(false);

  const loadFotos = useCallback(async () => {
    const params = new URLSearchParams({ page: page.toString() });
    if (statusFilter !== "all") params.set("status", statusFilter);

    const res = await fetch(`/api/fotos?${params}`);
    const data = await res.json();
    setFotos(data.fotos || []);
    setTotal(data.total || 0);
  }, [page, statusFilter]);

  useEffect(() => {
    loadFotos();
  }, [loadFotos]);

  async function triggerPolling() {
    setPolling(true);
    try {
      const res = await fetch("/api/cron/polling", { method: "POST" });
      const data = await res.json();
      toast.success(
        `Polling: ${data.processed} processados, ${data.uploaded} uploaded, ${data.needsInfo} pendentes`
      );
      loadFotos();
    } catch {
      toast.error("Erro no polling");
    } finally {
      setPolling(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fotos ({total})</h1>
        <Button variant="outline" onClick={triggerPolling} disabled={polling}>
          {polling ? "Verificando..." : "Verificar Novas Fotos"}
        </Button>
      </div>

      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="PENDING">Pendente</SelectItem>
            <SelectItem value="PROCESSING">Processando</SelectItem>
            <SelectItem value="UPLOADED">Uploaded</SelectItem>
            <SelectItem value="FAILED">Falha</SelectItem>
            <SelectItem value="NEEDS_INFO">Precisa Info</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {fotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center" role="status">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Camera className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium mb-1">Nenhuma foto encontrada</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            As fotos aparecerão aqui quando forem recebidas via WhatsApp ou processadas pelo sistema.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {fotos.map((foto) => (
            <Card key={foto.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[foto.status] || ""}`}
                    >
                      {foto.status}
                    </span>
                    {foto.nomeArquivo && (
                      <span className="text-sm font-mono">
                        {foto.nomeArquivo}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    {foto.obra && <Badge variant="secondary">{foto.obra.nome}</Badge>}
                    {foto.fase && <Badge variant="outline">{foto.fase.nome}</Badge>}
                    {foto.contato && (
                      <span>{foto.contato.nome}</span>
                    )}
                  </div>
                  {foto.mensagemOriginal && (
                    <p className="text-xs text-muted-foreground truncate max-w-md">
                      {foto.mensagemOriginal}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(foto.createdAt).toLocaleString("pt-BR")}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground py-2">
            Pagina {page}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={fotos.length < 20}
            onClick={() => setPage(page + 1)}
          >
            Proxima
          </Button>
        </div>
      )}
    </div>
  );
}
