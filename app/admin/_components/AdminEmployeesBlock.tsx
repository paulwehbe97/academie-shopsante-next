// app/admin/_components/AdminEmployeesBlock.tsx
"use client";

import { useEffect, useState } from "react";
import EmployeeDetailModal from "@/components/EmployeeDetailModal";
import { toast } from "sonner";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  storeCode: string;
  storeName?: string;
  lastActive?: string | null;
  progressPct: number;
  completed?: number;
  total?: number;
};

export default function AdminEmployeesBlock() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filtered, setFiltered] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  // --- Filtres & tri ---
  type FilterKey = "all" | "lagging" | "almost";
  type SortKey = "progress" | "inactivity" | "name";
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortBy, setSortBy] = useState<SortKey>("progress");

  // Charger employés via API
  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await fetch("/api/admin/employees/list", { cache: "no-store" });
        const data = await res.json();
        setEmployees(data);
        setFiltered(data);
      } catch (err) {
        console.error("Erreur chargement employés:", err);
      }
    }
    loadEmployees();
  }, []);

  function daysSince(date?: string | null) {
    if (!date) return 999;
    return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  }

  // Filtrage + recherche + tri
  useEffect(() => {
    let result = [...employees];

    // Filtres progression
    if (filter === "lagging") {
      result = result.filter((e) => daysSince(e.lastActive) >= 10 && e.progressPct < 100);
    } else if (filter === "almost") {
      result = result.filter((e) => e.progressPct >= 80 && e.progressPct < 100);
    }

    // Filtrage boutique
    if (selectedStores.length > 0) {
      result = result.filter((e) => selectedStores.includes(e.storeCode));
    }

    // Recherche
    const term = search.toLowerCase();
    if (term) {
      result = result.filter(
        (e) =>
          (e.firstName || "").toLowerCase().includes(term) ||
          (e.lastName || "").toLowerCase().includes(term) ||
          (e.email || "").toLowerCase().includes(term) ||
          (e.storeCode || "").toLowerCase().includes(term)
      );
    }

    // Tri
    if (sortBy === "progress") {
      result.sort((a, b) => b.progressPct - a.progressPct);
    } else if (sortBy === "inactivity") {
      result.sort((a, b) => daysSince(b.lastActive) - daysSince(a.lastActive));
    } else if (sortBy === "name") {
      result.sort((a, b) => (a.lastName || "").localeCompare(b.lastName || ""));
    }

    setFiltered(result);
  }, [search, selectedStores, employees, filter, sortBy]);

  function toggleStore(code: string) {
    setSelectedStores((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  async function handleRelance(emp: Employee) {
    try {
      const res = await fetch("/api/reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: emp.id, email: emp.email }),
      });
      if (res.ok) {
        toast.success("Email de rappel envoyé");
      } else {
        const msg = await res.text();
        console.error("Erreur API:", msg);
        toast.error("Erreur lors de l'envoi du rappel");
      }
    } catch (err) {
      toast.error("Impossible de contacter le serveur");
    }
  }

  function handleCertificats(userId: string) {
    window.location.href = `/admin/certificates?user=${userId}`;
  }

  async function handleSupprimer(userId: string) {
    if (!confirm("Voulez-vous vraiment supprimer cet employé ?")) return;

    try {
      const res = await fetch("/api/admin/employees/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        toast.success("Employé supprimé");
        setEmployees((prev) => prev.filter((e) => e.id !== userId));
      } else {
        const msg = await res.text();
        console.error("Erreur API:", msg);
        toast.error("Échec de la suppression");
      }
    } catch (err) {
      toast.error("Impossible de contacter le serveur");
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-lg font-bold mb-4">Employés du réseau</h2>

      {/* Barre de filtres */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Recherche */}
        <input
          type="text"
          placeholder="Rechercher par nom, email ou boutique..."
          className="border rounded-xl px-3 py-2 text-sm w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Boutiques */}
        <div className="relative">
          <details className="border rounded-xl px-3 py-2 text-sm cursor-pointer">
            <summary className="list-none select-none">
              Boutiques ({selectedStores.length || "toutes"})
            </summary>
            <div className="absolute z-10 mt-2 bg-white border rounded-xl shadow-lg p-3 space-y-1 max-h-64 overflow-y-auto w-60">
              {Array.from(new Set(employees.map((e) => e.storeCode))).map(
                (code) => (
                  <label key={code} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedStores.includes(code)}
                      onChange={() => toggleStore(code)}
                    />
                    <span className="text-sm">
                      {
                        employees.find((e) => e.storeCode === code)?.storeName ||
                        code
                      }{" "}
                      ({code})
                    </span>
                  </label>
                )
              )}
            </div>
          </details>
        </div>

        {/* Filtres progression */}
        <div className="flex items-center gap-1 bg-gray-50 border rounded-xl px-1 py-1">
          <button
            className={`px-3 py-1.5 rounded-lg text-sm ${
              filter === "all"
                ? "bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal text-white"
                : "hover:bg-gray-100"
            }`}
            onClick={() => setFilter("all")}
          >
            Tous
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg text-sm ${
              filter === "lagging"
                ? "bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal text-white"
                : "hover:bg-gray-100"
            }`}
            onClick={() => setFilter("lagging")}
          >
            À la traîne
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg text-sm ${
              filter === "almost"
                ? "bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal text-white"
                : "hover:bg-gray-100"
            }`}
            onClick={() => setFilter("almost")}
          >
            Presque fini
          </button>
        </div>

        {/* Tri */}
        <select
          className="border rounded-xl px-3 py-1.5 text-sm"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
        >
          <option value="progress">Tri : Progression</option>
          <option value="inactivity">Tri : Inactivité</option>
          <option value="name">Tri : Nom</option>
        </select>
      </div>

      {/* Liste employés */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500">Aucun employé trouvé.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp) => (
            <div
              key={emp.id}
              className="bg-white border rounded-2xl p-4 shadow-sm flex flex-col"
            >
              <div className="font-medium text-gray-900">
                {emp.firstName} {emp.lastName}
              </div>
              <div className="text-sm text-gray-600">
                {emp.storeName || emp.storeCode} — Dernière activité :{" "}
                {emp.lastActive ? daysSince(emp.lastActive) + " j" : "—"}
              </div>

              {/* Progression */}
              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-1">Progression</div>
                <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-2 bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal"
                    style={{ width: `${emp.progressPct}%` }}
                  />
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {emp.progressPct}% ({emp.completed || 0}/{emp.total || 30})
                </div>
              </div>

              {/* Boutons */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setDetailUserId(emp.id)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal text-white"
                >
                  Détail
                </button>
                <button
                  onClick={() => handleRelance(emp)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal text-white"
                >
                  Relancer
                </button>
                <button
                  onClick={() => handleCertificats(emp.id)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal text-white"
                >
                  Certificats
                </button>
                <button
                  onClick={() => handleSupprimer(emp.id)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-red-500 text-black font-semibold"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {detailUserId && (
        <EmployeeDetailModal
          userId={detailUserId}
          onClose={() => setDetailUserId(null)}
        />
      )}
    </div>
  );
}
