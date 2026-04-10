"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Phone } from "lucide-react";
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
      <Card className="group hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 shrink-0">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{nome}</CardTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <Phone className="h-3 w-3" />
                {telefone}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pt-0">
          {obras.map((co) => (
            <Badge key={co.obra.id} variant="secondary" className="font-normal">
              {co.obra.nome}
            </Badge>
          ))}
          {obras.length === 0 && (
            <span className="text-xs text-muted-foreground">Sem obras vinculadas</span>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
