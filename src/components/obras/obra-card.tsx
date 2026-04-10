"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Layers, Users } from "lucide-react";
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
      <Card className="group hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 shrink-0">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{nome}</CardTitle>
              {endereco && (
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {endereco}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex gap-3 pt-0">
          <Badge variant="secondary" className="gap-1 font-normal">
            <Layers className="h-3 w-3" />
            {fasesCount} {fasesCount === 1 ? "fase" : "fases"}
          </Badge>
          <Badge variant="outline" className="gap-1 font-normal">
            <Users className="h-3 w-3" />
            {contatosCount} {contatosCount === 1 ? "contato" : "contatos"}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
