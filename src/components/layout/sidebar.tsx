"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/obras", label: "Obras", icon: "🏗️" },
  { href: "/contatos", label: "Contatos", icon: "👷" },
  { href: "/notificacoes", label: "Notificacoes", icon: "📩" },
  { href: "/fotos", label: "Fotos", icon: "📷" },
  { href: "/configuracoes", label: "Configuracoes", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-gray-50 min-h-screen p-4">
      <div className="mb-8">
        <h2 className="text-lg font-bold">Relatorio de Fotos</h2>
        <p className="text-xs text-muted-foreground">Fortima Construtora</p>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-gray-100 hover:text-foreground"
              )}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
