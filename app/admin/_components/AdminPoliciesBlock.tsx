// app/admin/_components/AdminPoliciesBlock.tsx
"use client";

import Link from "next/link";

export default function AdminPoliciesBlock() {
  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-4">
      <h2 className="text-lg font-bold">Politiques et Contrats — Mise à jour</h2>
      <p className="text-sm text-gray-600">
        Gérer les PDF, suivre les signatures et mettre à jour les documents officiels.
      </p>
      <div>
        <Link href="/admin/policies">
          <button
            className="px-4 py-2 rounded-lg text-white 
                       bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal 
                       hover:opacity-90 transition"
          >
            Accéder à la gestion
          </button>
        </Link>
      </div>
    </div>
  );
}
