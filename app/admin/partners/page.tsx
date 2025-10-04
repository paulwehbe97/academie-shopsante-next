"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";

type Partner = {
  id: number;
  name: string;
  description: string;
  logoUrl: string;
  link: string;
};

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);

  // Champs du formulaire
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // État de modification
  const [editingId, setEditingId] = useState<number | null>(null);

  // Chargement initial
  async function loadPartners() {
    const res = await fetch("/api/partners");
    const data = await res.json();
    setPartners(data);
  }

  useEffect(() => {
    loadPartners();
  }, []);

  // Ajouter ou modifier un partenaire
  async function handleAdd() {
    if (!name || !description) {
      toast.error("Le nom et la description sont requis.");
      return;
    }

    const payload = {
      name,
      description,
      link: link || "",
      logoUrl: logoUrl || "",
    };

    try {
      const url = editingId ? `/api/partners/${editingId}` : "/api/partners";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erreur réseau");

      if (editingId) {
        toast.success("Partenaire mis à jour !");
      } else {
        toast.success("Partenaire ajouté !");
      }

      // Réinitialisation du formulaire
      setName("");
      setDescription("");
      setLink("");
      setLogoUrl("");
      setEditingId(null);
      loadPartners();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l’enregistrement du partenaire.");
    }
  }

  // Supprimer un partenaire (avec confirmation)
  async function handleDelete(id: number, name: string) {
    if (!confirm(`Supprimer le partenaire « ${name} » ?`)) return;

    try {
      const res = await fetch(`/api/partners/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur suppression");

      toast.success(`Partenaire « ${name} » supprimé.`);
      loadPartners();
    } catch (error) {
      console.error(error);
      toast.error("Suppression échouée.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-yellow via-brand-lime to-brand-teal/70 py-10 px-4">
      <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-sm">
        {/* Titre principal */}
        <h1 className="text-2xl font-bold mb-2">Partenaires — Mise à jour</h1>
        <p className="text-sm text-neutral-600 mb-6">
          Ajoutez, modifiez ou supprimez les partenaires de Shop Santé. Les informations seront affichées
          dans la section employé « Nos partenaires ».
        </p>

        {/* Formulaire d’ajout/modification */}
        <div className="flex flex-col sm:flex-row gap-2 mb-8">
          <input
            type="text"
            placeholder="Nom du partenaire"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Description / avantage"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Lien (site web)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="URL du logo ou fichier"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleAdd}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
              editingId ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {editingId ? "Enregistrer les modifications" : "Ajouter un partenaire"}
          </button>
        </div>

        {/* Liste des partenaires */}
        <h2 className="text-lg font-semibold mb-3">Liste des partenaires</h2>
        {partners.length === 0 ? (
          <p className="text-sm text-neutral-500">Aucun partenaire enregistré.</p>
        ) : (
          <div className="space-y-2">
            {partners.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {p.logoUrl && (p.logoUrl.startsWith("/") || p.logoUrl.startsWith("http")) ? (
                    <Image
                      src={p.logoUrl}
                      alt={p.name}
                      width={40}
                      height={40}
                      className="rounded-full border border-neutral-200 object-contain"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-neutral-100 text-xs text-neutral-500">
                      N/A
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-neutral-900">{p.name}</div>
                    <div className="text-sm text-neutral-600">{p.description}</div>
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-teal hover:underline"
                    >
                      {p.link}
                    </a>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(p.id);
                      setName(p.name);
                      setDescription(p.description);
                      setLink(p.link || "");
                      setLogoUrl(p.logoUrl || "");
                    }}
                    className="rounded-md bg-blue-500 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-600"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="rounded-md bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
