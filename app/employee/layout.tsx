import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function EmployeeLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any | undefined;

  const email = user?.email ?? "";
  const storeCode = user?.storeCode ?? null;
  const storeName = user?.storeName ?? null;

  return (
    // 🌈 Background global en dégradé (conservé)
    <div className="min-h-screen bg-gradient-to-br from-brand-yellow via-brand-lime to-brand-teal/70">
      {/* Bande blanche supérieure (conservée) */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          {/* Boutique + email */}
          <div className="flex min-w-0 flex-col">
            <div className="text-sm text-neutral-600">
              Boutique :
              {storeName ? (
                <span className="ml-1 font-medium text-neutral-900">
                  {storeName} {storeCode ? <span className="text-neutral-500">— ({storeCode})</span> : null}
                </span>
              ) : (
                <span className="ml-1 font-medium text-neutral-900">Non assignée</span>
              )}
            </div>
            <div className="truncate text-xs text-neutral-500">{email}</div>
          </div>

{/* Pastilles de navigation */}
<nav className="flex flex-wrap items-center gap-2">
  <Link
    href="/employee"
    className="rounded-2xl bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal px-3 py-1.5 text-sm font-semibold text-black shadow-sm hover:brightness-95"
  >
    Employé
  </Link>
  <Link
    href="/employee/partners"
    className="rounded-2xl bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal px-3 py-1.5 text-sm font-semibold text-black shadow-sm hover:brightness-95"
  >
    Nos partenaires
  </Link>
  <Link
    href="/employee/policies"
    className="rounded-2xl bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal px-3 py-1.5 text-sm font-semibold text-black shadow-sm hover:brightness-95"
  >
    Politiques & Contrats
  </Link>
  <Link
    href="/employee/certificates"
    className="rounded-2xl bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal px-3 py-1.5 text-sm font-semibold text-black shadow-sm hover:brightness-95"
  >
    Mes certificats
  </Link>
  {/* Déconnexion: pastille grise (exigé) */}
  <a
    href="/api/auth/signout"
    className="rounded-2xl bg-neutral-200 px-3 py-1.5 text-sm font-semibold text-neutral-900 shadow-sm hover:bg-neutral-300"
  >
    Déconnexion
  </a>
</nav>

        </div>
      </header>

      {/* Contenu */}
      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}
