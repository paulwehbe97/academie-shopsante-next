import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import ManagerView from "./view";


export default async function ManagerPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/");
  }
  // Accès autorisé aux rôles Gérant et Admin (lecture/gestion)
  const role = (session.user as any).role ?? "Employé";
  if (role !== "Gérant" && role !== "Admin") {
    // Si pas gérant/admin, on renvoie vers l’espace employé (sécurisé, pas d’erreur)
    redirect("/employee");
  }
  return <ManagerView />;
}
