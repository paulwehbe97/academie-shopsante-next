// app/admin/policies/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import PoliciesAdminClient from "./PoliciesAdminClient";

export default async function AdminPoliciesPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user?.email || (role !== "Admin" && role !== "Gérant")) {
    redirect("/invite");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-yellow via-brand-lime to-brand-teal">
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* Bloc Politiques & Contrats */}
        <section className="bg-white rounded-2xl shadow p-6">
          <header className="mb-4">
            <h1 className="text-lg font-semibold text-gray-900">
              Politiques et Contrats — Mise à jour
            </h1>
            <p className="text-sm text-gray-600">
              Téléverse de nouveaux documents PDF, gère la liste existante et consulte les signatures des employés.
            </p>
          </header>

          {/* Contenu interactif */}
          <PoliciesAdminClient />
        </section>
      </main>
    </div>
  );
}
