// app/admin/page.tsx
"use client";

import { useSession } from "next-auth/react";
import RoleSwitch from "@/components/RoleSwitch";
import AdminNetworkView from "./_components/AdminNetworkView";
import AdminInvitesBlock from "./_components/AdminInvitesBlock";
import AdminEmployeesBlock from "./_components/AdminEmployeesBlock";
import AdminStoresBlock from "./_components/AdminStoresBlock";
import Link from "next/link";

export default function AdminPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-yellow via-brand-lime to-brand-teal">
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* Switch entre Employé / Manager / Admin */}
        <div className="flex justify-end mb-6">
          <RoleSwitch role={(session?.user as any)?.role} />
        </div>

        {/* 1. Vue Réseau */}
        <section>
          <AdminNetworkView />
        </section>

        {/* 2. Invitations */}
        <section>
          <AdminInvitesBlock />
        </section>

        {/* 3. Employés */}
        <section>
          <AdminEmployeesBlock />
        </section>

        {/* 4. Politiques & Contrats */}
        <section>
          <div className="bg-white rounded-2xl shadow p-6 flex flex-col sm:flex-row items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Politiques et Contrats — Mise à jour
              </h2>
              <p className="text-sm text-gray-600">
                Gérer les PDF, suivre les signatures et mettre à jour les documents officiels.
              </p>
            </div>
            <Link
              href="/admin/policies"
              className="mt-4 sm:mt-0 px-4 py-2 rounded-lg text-white text-sm
             bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal
             hover:opacity-90 transition"
            >
              Accéder à la gestion
            </Link>
          </div>
        </section>

        {/* 5. Boutiques */}
        <section>
          <AdminStoresBlock />
        </section>
      </main>
    </div>
  );
}
