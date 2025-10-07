"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReturnPill from "@/components/ReturnPill";


type Partner = {
  id: number;
  name: string;
  description: string;
  logoUrl: string;
  link: string;
};

export default function EmployeePartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPartners() {
      try {
        const res = await fetch("/api/partners");
        const data = await res.json();
        setPartners(data);
      } catch (error) {
        console.error("Erreur lors du chargement des partenaires :", error);
      } finally {
        setLoading(false);
      }
    }
    loadPartners();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-yellow via-brand-lime to-brand-teal/70 py-10 px-4">
      <div className="mx-auto max-w-4xl">
        {/* Bouton retour */}
<header className="mb-6 flex items-center justify-between">
  <h1 className="text-2xl font-bold text-neutral-900">Nos partenaires</h1>
  <ReturnPill href="/employee" label="Retour" />
</header>

        {/* Contenu principal */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold mb-2">Nos partenaires</h1>
          <p className="text-sm text-neutral-600 mb-6">
            Découvrez les entreprises partenaires de Shop Santé et les avantages exclusifs pour nos employés.
          </p>

          {loading ? (
            <p className="text-sm text-neutral-500">Chargement en cours...</p>
          ) : partners.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Aucun partenaire n’est présentement enregistré.
            </p>
          ) : (
            <div className="space-y-3">
              {partners.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-3 text-left">
                    {p.logoUrl && (
                      <img
                        src={p.logoUrl}
                        alt={p.name}
                        className="h-10 w-10 rounded-full object-contain border border-neutral-200"
                      />
                    )}
                    <div>
                      <div className="font-semibold text-neutral-900">{p.name}</div>
                      <div className="text-sm text-neutral-600">{p.description}</div>
                    </div>
                  </div>
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 sm:mt-0 inline-flex items-center text-sm font-medium text-brand-teal hover:underline"
                  >
                    Visiter le site
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
