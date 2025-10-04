// app/employee/policies/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import EmployeeDocs from "@/components/EmployeeDocs";
import ReturnPill from "@/components/ReturnPill";

export default async function EmployeePoliciesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/invite");

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-yellow via-brand-lime to-brand-teal/70">
      <main className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-neutral-900">Politiques & Contrats</h1>
          <ReturnPill href="/employee" label="Retour" />
        </header>

        <EmployeeDocs />
      </main>
    </div>
  );
}
