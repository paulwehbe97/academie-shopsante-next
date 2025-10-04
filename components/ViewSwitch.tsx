"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function ViewSwitch() {
  const { data } = useSession();
  const role = (data?.user as any)?.role ?? "Employé";

  // Employé : rien à proposer
  if (role === "Employé") return null;

  return (
    <div className="flex gap-2">
      {/* Tout le monde qui n'est pas "Employé" peut aller voir /employee */}
      <Link
        href="/employee"
        className="px-3 py-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-sm"
      >
        Vue Employé
      </Link>

      {(role === "Gérant" || role === "Admin") && (
        <Link
          href="/manager"
          className="px-3 py-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-sm"
        >
          Vue Manager
        </Link>
      )}

      {role === "Admin" && (
        <Link
          href="/admin"
          className="px-3 py-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-sm"
        >
          Vue Admin
        </Link>
      )}
    </div>
  );
}
