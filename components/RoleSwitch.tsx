"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Role = "Employé" | "Gérant" | "Admin";

export default function RoleSwitch({ role }: { role: Role | undefined }) {
  const pathname = usePathname();

  // Détermine les vues accessibles selon le rôle
  const items =
    role === "Admin"
      ? [
          { href: "/employee", label: "Employé" },
          { href: "/manager", label: "Manager" },
          { href: "/admin", label: "Admin" },
        ]
      : role === "Gérant"
      ? [
          { href: "/employee", label: "Employé" },
          { href: "/manager", label: "Manager" },
        ]
      : [{ href: "/employee", label: "Employé" }];

  return (
    <div className="inline-flex rounded-full bg-gray-100 p-1">
      {items.map((it) => {
        const active =
          pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "px-4 py-1 rounded-full text-sm font-medium transition-colors",
              active
                ? "bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal text-white shadow"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
