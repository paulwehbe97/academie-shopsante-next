// app/employee/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import EmployeeHome from "./_components/EmployeeHome.client";

export default async function EmployeeHomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/invite");

  const user = session.user as any;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-yellow via-brand-lime to-brand-teal/70">
      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* ⬇️ en-tête & nav restent gérés par EmployeeHome */}
        <EmployeeHome
          user={{
            email: user?.email ?? "",
            name: user?.name ?? "",
            role: user?.role ?? "Employé",
            storeCode: user?.storeCode ?? null,
            storeName: user?.storeName ?? null,
          }}
        />
      </main>
    </div>
  );
}
