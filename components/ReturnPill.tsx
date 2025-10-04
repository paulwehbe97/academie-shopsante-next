"use client";

import Link from "next/link";

export default function ReturnPill({ href = "/employee", label = "Retour" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white/90 px-3 py-1 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50"
      aria-label={label}
    >
      {/* chevron gauche minimal (emoji pour éviter d’ajouter une lib d’icônes) */}
      <span aria-hidden>◀</span>
      <span>{label}</span>
    </Link>
  );
}
