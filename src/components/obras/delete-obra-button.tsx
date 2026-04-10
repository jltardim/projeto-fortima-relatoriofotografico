"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function DeleteObraButton({ obraId }: { obraId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    try {
      await fetch(`/api/obras/${obraId}`, { method: "DELETE" });
      toast.success("Obra removida");
      router.push("/obras");
      router.refresh();
    } catch {
      toast.error("Erro ao remover obra");
    }
  }

  if (confirming) {
    return (
      <div className="flex gap-2">
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          Confirmar
        </Button>
        <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
      Excluir
    </Button>
  );
}
