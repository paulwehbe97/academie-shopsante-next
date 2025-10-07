"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type Store = {
  id: string;
  code: string;
  name: string;
};

export default function AdminStoresBlock() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ code: "", name: "" });
  const [editing, setEditing] = useState<Store | null>(null);
  const [open, setOpen] = useState(false); // ✅ plié/déplié

  /* Charger les boutiques */
  async function loadStores() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stores/list");
      const data = await res.json();
      if (res.ok && data.ok) setStores(data.stores);
      else toast.error("Erreur de chargement des boutiques");
    } catch {
      toast.error("Erreur serveur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStores();
  }, []);

  /* Ajouter ou modifier */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        const res = await fetch("/api/admin/stores/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, code: form.code, name: form.name }),
        });
        if (!res.ok) throw new Error("Échec de la modification");
        toast.success("Boutique mise à jour !");
        setEditing(null);
      } else {
        const res = await fetch("/api/admin/stores/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Échec de la création");
        toast.success("Nouvelle boutique ajoutée !");
      }
      setForm({ code: "", name: "" });
      loadStores();
    } catch (err: any) {
      toast.error(err.message || "Erreur serveur");
    }
  }

  /* Supprimer */
  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette boutique ?")) return;
    try {
      const res = await fetch("/api/admin/stores/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Échec de la suppression");
      toast.success("Boutique supprimée !");
      loadStores();
    } catch (err: any) {
      toast.error(err.message || "Erreur serveur");
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-4">
      {/* En-tête cliquable */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center text-left"
      >
        <div>
          <h2 className="text-lg font-bold">Gestion des Succursales</h2>
          <p className="text-sm text-gray-600">
            Ajouter, modifier ou supprimer une succursale Shop Santé.
          </p>
        </div>
        <span
          className={`transition-transform duration-300 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        >
          ▼
        </span>
      </button>

      {/* Contenu dépliable */}
      <div
        className={`transition-all duration-500 overflow-hidden ${
          open ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 mt-4">
          <input
            type="text"
            placeholder="Code (ex: QCLB9)"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="border rounded-lg px-3 py-2 flex-1"
            required
          />
          <input
            type="text"
            placeholder="Nom complet (ex: Shop Santé Lebourgneuf)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded-lg px-3 py-2 flex-1"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal text-white font-semibold"
          >
            {editing ? "Modifier" : "Ajouter"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm({ code: "", name: "" });
              }}
              className="px-4 py-2 rounded-xl bg-gray-200 font-semibold"
            >
              Annuler
            </button>
          )}
        </form>

        {/* Tableau */}
        <div className="mt-6 overflow-x-auto">
          {loading ? (
            <p className="text-sm text-gray-500">Chargement…</p>
          ) : stores.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune boutique enregistrée.</p>
          ) : (
            <table className="w-full text-sm border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 border">Code</th>
                  <th className="px-3 py-2 border">Nom</th>
                  <th className="px-3 py-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((s) => (
                  <tr key={s.id} className="text-center">
                    <td className="px-3 py-2 border">{s.code}</td>
                    <td className="px-3 py-2 border">{s.name}</td>
                    <td className="px-3 py-2 border">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => {
                            setEditing(s);
                            setForm({ code: s.code, name: s.name });
                          }}
                          className="px-3 py-1 rounded text-white text-xs 
                                     bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal 
                                     hover:opacity-90 transition"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
