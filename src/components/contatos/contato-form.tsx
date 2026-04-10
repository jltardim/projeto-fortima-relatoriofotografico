"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface ContatoFormProps {
  contato?: {
    id: string;
    nome: string;
    telefone: string;
    chatwootContactId: number | null;
    obras: { obra: { id: string; nome: string } }[];
  };
  todasObras: { id: string; nome: string }[];
}

export function ContatoForm({ contato, todasObras }: ContatoFormProps) {
  const router = useRouter();
  const [nome, setNome] = useState(contato?.nome || "");
  const [telefone, setTelefone] = useState(contato?.telefone || "");
  const [chatwootContactId, setChatwootContactId] = useState(
    contato?.chatwootContactId?.toString() || ""
  );
  const [selectedObras, setSelectedObras] = useState<string[]>(
    contato?.obras.map((co) => co.obra.id) || []
  );
  const [loading, setLoading] = useState(false);

  function toggleObra(obraId: string) {
    setSelectedObras((prev) =>
      prev.includes(obraId)
        ? prev.filter((id) => id !== obraId)
        : [...prev, obraId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      nome,
      telefone,
      chatwootContactId: chatwootContactId ? parseInt(chatwootContactId) : null,
      obraIds: selectedObras,
    };

    try {
      if (contato) {
        await fetch(`/api/contatos/${contato.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Contato atualizado");
      } else {
        await fetch("/api/contatos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Contato criado");
      }

      router.push("/contatos");
      router.refresh();
    } catch {
      toast.error("Erro ao salvar contato");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{contato ? "Editar Contato" : "Novo Contato"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Jose da Silva"
              required
            />
          </div>
          <div>
            <Label htmlFor="telefone">Telefone (WhatsApp)</Label>
            <Input
              id="telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="Ex: 5511999999999"
              required
            />
          </div>
          <div>
            <Label htmlFor="chatwootId">ID Contato Chatwoot (opcional)</Label>
            <Input
              id="chatwootId"
              value={chatwootContactId}
              onChange={(e) => setChatwootContactId(e.target.value)}
              placeholder="Ex: 123"
              type="number"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Obras Vinculadas</CardTitle>
        </CardHeader>
        <CardContent>
          {todasObras.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma obra cadastrada. Cadastre obras primeiro.
            </p>
          ) : (
            <div className="space-y-2">
              {todasObras.map((obra) => (
                <label
                  key={obra.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedObras.includes(obra.id)}
                    onChange={() => toggleObra(obra.id)}
                    className="rounded border-input accent-primary"
                  />
                  <span className="text-sm">{obra.nome}</span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : contato ? "Salvar" : "Criar Contato"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/contatos")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
