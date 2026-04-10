"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface ContatoCardProps {
  id: string;
  nome: string;
  telefone: string;
  obras: { obra: { id: string; nome: string } }[];
}

export function ContatoCard({ id, nome, telefone, obras }: ContatoCardProps) {
  return (
    <Link href={`/contatos/${id}`}>
      <Card className="hover:border-primary transition-colors cursor-pointer">
        <CardHeader>
          <CardTitle className="text-lg">{nome}</CardTitle>
          <p className="text-sm text-muted-foreground">{telefone}</p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {obras.map((co) => (
            <Badge key={co.obra.id} variant="secondary">
              {co.obra.nome}
            </Badge>
          ))}
          {obras.length === 0 && (
            <span className="text-sm text-muted-foreground">Sem obras vinculadas</span>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
