"use client";

import React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { saveUIState, loadUIState } from "../lib/local";
import { usePathname } from "next/navigation";
import Image from "next/image";

function Pill({ children, href }: { children: React.ReactNode; href?: string }) {
  const base =
    "px-3 py-1 rounded-full text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50";
  if (href) {
    return (
      <Link href={href} className={base}>
        {children}
      </Link>
    );
  }
  return <span className={base}>{children}</span>;
}

function Button({
  children,
  onClick,
  variant = "subtle",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "subtle" | "primary";
}) {
  const cls =
    variant === "primary"
      ? "px-4 py-2 rounded-xl font-semibold bg-brand-600 text-white hover:opacity-95"
      : "px-4 py-2 rounded-xl font-semibold bg-gray-100 text-gray-800 hover:bg-gray-200";
  return (
    <button className={cls} onClick={onClick}>
      {children}
    </button>
  );
}

export default function TopBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Clé de persistance liée à l'utilisateur
  const storageKey = React.useMemo(
    () => session?.user?.email ?? "demo",
    [session?.user?.email]
  );

  // Route UI + rôle (persistés par app/page.tsx via saveUIState)
  const [uiRoute, setUiRoute] = React.useState<string | null>(null);
  const [uiRole, setUiRole] = React.useState<string>("Employé");

  React.useEffect(() => {
    const read = () => {
      try {
        const ui = loadUIState(storageKey) || {};
        setUiRoute(ui?.route ?? null);
        if (ui?.role) setUiRole(ui.role);
      } catch {}
    };
    // lecture initiale
    read();
    // écoute les mises à jour envoyées par app/page.tsx (event "ui:route")
    const handler = () => read();
    window.addEventListener("ui:route", handler);
    return () => window.removeEventListener("ui:route", handler);
  }, [storageKey]);

  // Conditions d'affichage
  const isDocs = typeof pathname === "string" && pathname.startsWith("/documents");
  const isEmployeePortal = uiRoute === "employee";

  // ✅ Pastilles visibles dès qu’on est sur le portail employé OU sur /documents,
  //    peu importe l’auth NextAuth (utile pour le mode démo).
  const showPills = isEmployeePortal || isDocs;

  // Bouton de sortie "secours" (cas rare) : si authentifié mais pastilles masquées
  const showSignOutOnly = status === "authenticated" && !showPills;

  // Reset local avant de sortir
  const localReset = React.useCallback(() => {
    try {
      saveUIState(
        {
          route: "login",
          role: "Employé",
          currentModule: { chapter: 1, title: "Vitamines" },
          progress: {},
        },
        storageKey
      );
    } catch {}
  }, [storageKey]);

  // Action de sortie selon le cas (authentifié vs démo)
  const exitAction = React.useCallback(() => {
    localReset();
    if (status === "authenticated") {
      signOut({ callbackUrl: "/" });
    } else {
      // mode démo : retour simple à l’accueil
      if (typeof window !== "undefined") window.location.href = "/";
    }
  }, [localReset, status]);

  const identityLabel = session?.user?.email || uiRole || "Employé";

  return (
    <div className="sticky top-0 z-20 backdrop-blur bg-white/70 border-b border-brand-100">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
       {/* Logo + titre */}
<Link href="/" className="flex items-center gap-3">
  <Image
    src="/shopsante-logo.png"  // ton fichier dans /public
    alt="Logo Shop Santé"
    width={36}
    height={36}
    priority
    className="shrink-0"
  />
  <span className="font-extrabold text-lg md:text-xl text-neutral-900">
    Académie Shop Santé
  </span>
</Link>


        {/* Actions à droite */}
        <div className="flex items-center gap-2">
          {showPills ? (
            <>
              <Pill>{identityLabel}</Pill>
              <Pill href="/documents/politiques">Politiques &amp; Contrats</Pill>
              <Pill href="/documents/certificats">Mes certificats</Pill>
              <Button onClick={exitAction}>
                {status === "authenticated" ? "Déconnexion" : "Retour"}
              </Button>
            </>
          ) : (
            showSignOutOnly && (
              <Button onClick={exitAction}>Déconnexion</Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
