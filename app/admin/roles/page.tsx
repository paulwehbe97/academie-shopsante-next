"use client";

import React from "react";

export default function AdminRolesPage() {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"Employé" | "Gérant" | "Admin">("Employé");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        setMsg(data?.error || "Erreur");
      } else {
        setMsg(`Rôle mis à jour: ${data.user.email} → ${data.user.role}`);
      }
    } catch {
      setMsg("Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <div className="border rounded-2xl p-6 bg-white">
        <h1 className="text-2xl font-bold mb-2">Gestion des rôles</h1>
        <p className="text-gray-600 mb-4">
          Assigne un rôle par email. Tu peux pré-provisionner un gérant/empleyé avant sa première connexion.
        </p>

        <div className="space-y-3">
          <input
            placeholder="email@exemple.com"
            className="w-full border rounded-xl px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select
            className="w-full border rounded-xl px-3 py-2"
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
          >
            <option>Employé</option>
            <option>Gérant</option>
            <option>Admin</option>
          </select>
          <button
            onClick={submit}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-brand-600 text-white disabled:opacity-50"
          >
            {busy ? "Enregistrement..." : "Enregistrer"}
          </button>

          {msg && <div className="text-sm mt-2">{msg}</div>}

          <div className="text-xs text-gray-500 mt-4">
            Note: cette page nécessite un compte Admin (protégée par middleware + vérification serveur).
          </div>
        </div>
      </div>
    </main>
  );
}
