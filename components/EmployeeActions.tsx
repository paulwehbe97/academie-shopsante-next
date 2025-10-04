"use client";

import { toast } from "sonner";

type Employee = {
  id: string;
  email: string;
  storeCode: string;
  firstName: string;
  lastName: string;
};

export default function EmployeeActions({
  employee,
  variant,
  onViewDetails,
}: {
  employee: Employee;
  variant: "manager" | "admin";
  onViewDetails?: () => void;
}) {
  async function handleReminder() {
    try {
      const res = await fetch("/api/reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: employee.email,
          name: `${employee.firstName} ${employee.lastName}`,
          storeCode: employee.storeCode,
        }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success(`Rappel envoyé à ${employee.email}`);
    } catch {
      toast.error("Échec de l’envoi du rappel");
    }
  }

  async function handleRevoke() {
    try {
      const res = await fetch("/api/invites/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jti: employee.id }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success(`Accès révoqué pour ${employee.email}`);
    } catch {
      toast.error("Échec de la révocation");
    }
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2 justify-start">
      {/* Voir détails */}
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal text-white shadow-sm"
        >
          Détail
        </button>
      )}

      {/* Relancer */}
      <button
        onClick={handleReminder}
        className="px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal text-white shadow-sm"
      >
        Relancer
      </button>

      {/* Certificats */}
      <a
        href={`/manager/certificates?email=${employee.email}`}
        className="px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal text-white shadow-sm"
      >
        Certificats
      </a>

      {/* Révoquer (admin uniquement) */}
      {variant === "admin" && (
        <button
          onClick={handleRevoke}
          className="px-3 py-1.5 text-sm rounded-lg bg-red-500 text-black font-semibold"
        >
          Révoquer
        </button>
      )}
    </div>
  );
}
