"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface ObraFormProps {
  obra?: {
    id: string;
    nome: string;
    endereco: string | null;
    fases: { id: string; nome: string; ordem: number }[];
  };
}

export function ObraForm({ obra }: ObraFormProps) {
  const router = useRouter();
  const [nome, setNome] = useState(obra?.nome || "");
  const [endereco, setEndereco] = useState(obra?.endereco || "");
  const [fases, setFases] = useState<string[]>(
    obra?.fases.map((f) => f.nome) || [""]
  );
  const [loading, setLoading] = useState(false);

  function addFase() {
    setFases([...fases, ""]);
  }

  function removeFase(index: number) {
    setFases(fases.filter((_, i) => i !== index));
  }

  function updateFase(index: number, value: string) {
    const updated = [...fases];
    updated[index] = value;
    setFases(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const fasesLimpas = fases.filter((f) => f.trim() !== "");

    try {
      if (obra) {
        await fetch(`/api/obras/${obra.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, endereco }),
        });

        await fetch(`/api/obras/${obra.id}/fases`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fases: fasesLimpas.map((f, i) => ({
              id: obra.fases[i]?.id || undefined,
              nome: f,
              ordem: i + 1,
            })),
          }),
        });

        toast.success("Obra atualizada");
      } else {
        await fetch("/api/obras", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, endereco, fases: fasesLimpas }),
        });
        toast.success("Obra criada");
      }

      router.push("/obras");
      router.refresh();
    } catch {
      toast.error("Erro ao salvar obra");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{obra ? "Editar Obra" : "Nova Obra"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome da Obra</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Residencial Sul"
              required
            />
          </div>
          <div>
            <Label htmlFor="endereco">Endereco</Label>
            <Input
              id="endereco"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Ex: Rua das Flores, 123"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fases da Obra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {fases.map((fase, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={fase}
                onChange={(e) => updateFase(index, e.target.value)}
                placeholder={`Fase ${index + 1} (ex: Fundacao)`}
              />
              {fases.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeFase(index)}
                  className="shrink-0"
                >
                  Remover
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addFase}>
            + Adicionar Fase
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : obra ? "Salvar" : "Criar Obra"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/obras")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
