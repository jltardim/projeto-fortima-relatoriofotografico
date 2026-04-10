"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="h-14 border-b px-6 flex items-center justify-between bg-white">
      <h1 className="text-sm font-medium text-muted-foreground">
        Relatorio de Fotos de Obras
      </h1>
      <div className="flex items-center gap-4">
        {session?.user && (
          <>
            <span className="text-sm text-muted-foreground">
              {session.user.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Sair
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
