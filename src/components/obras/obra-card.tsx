"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface ObraCardProps {
  id: string;
  nome: string;
  endereco: string | null;
  fasesCount: number;
  contatosCount: number;
}

export function ObraCard({ id, nome, endereco, fasesCount, contatosCount }: ObraCardProps) {
  return (
    <Link href={`/obras/${id}`}>
      <Card className="hover:border-primary transition-colors cursor-pointer">
        <CardHeader>
          <CardTitle className="text-lg">{nome}</CardTitle>
          {endereco && (
            <p className="text-sm text-muted-foreground">{endereco}</p>
          )}
        </CardHeader>
        <CardContent className="flex gap-2">
          <Badge variant="secondary">{fasesCount} fases</Badge>
          <Badge variant="outline">{contatosCount} contatos</Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
