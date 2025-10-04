"use client";

// Désactive le rendu statique pour cette route API

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";




type CertRow = {
  id: string;
  levelKey: string;
  chapterId: string;
  chapterTitle: string;
  filePath: string;
  issuedAt: string;     // ISO
  sentAt?: string | null;
};

const GRADIENT = "bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal";

function formatDateFR(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("fr-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  } catch {
    return iso;
  }
}

export default function ManagerCertificatesPage() {
  const qp = useSearchParams();
  const router = useRouter();
  const initialEmail = (qp.get("email") || "").trim().toLowerCase();

  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CertRow[]>([]);
  const [who, setWho] = useState<{ email?: string; name?: string | null; storeCode?: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function searchByEmail(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setRows([]);
    setWho(null);

    const q = email.trim().toLowerCase();
    if (!q) {
      setError("Entre un courriel d’employé.");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`/api/certificates/by-user?email=${encodeURIComponent(q)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await resp.json();
      if (!resp.ok || !data?.ok) {
        const map: Record<string, string> = {
          unauthorized: "Non autorisé.",
          forbidden: "Accès refusé.",
          forbidden_store: "Tu ne peux consulter que les employés de ta boutique.",
          not_found: "Aucun employé trouvé avec ce courriel.",
        };
        throw new Error(map[data?.error] || "Impossible de charger les certificats.");
      }
      setWho({ email: data.target?.email, name: data.target?.name, storeCode: data.target?.storeCode });
      setRows((data.items || []) as CertRow[]);
      // sync URL
      const url = `/manager/certificates?email=${encodeURIComponent(q)}`;
      router.replace(url);
    } catch (e: any) {
      setError(e?.message || "Erreur réseau ou serveur.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialEmail) {
      // auto-fetch si l’URL a déjà ?email=
      searchByEmail().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const content = useMemo(() => {
    if (error) {
      return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">{error}</div>;
    }
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-neutral-200 bg-white/70 p-4">
              <div className="h-4 w-1/3 rounded bg-neutral-200" />
              <div className="mt-3 h-3 w-1/2 rounded bg-neutral-200" />
            </div>
          ))}
        </div>
      );
    }
    if (!who) {
      return (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 text-neutral-700">
          Recherche un employé par son courriel pour afficher ses certificats.
        </div>
      );
    }
    if (rows.length === 0) {
      return (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 text-neutral-700">
          Aucun certificat trouvé pour {who.email}.
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm text-neutral-600">
                  {r.levelKey} — Chapitre {r.chapterId}
                </div>
                <div className="truncate text-base font-semibold text-neutral-900">{r.chapterTitle}</div>
                <div className="mt-1 text-xs text-neutral-500">
                  Émis le {formatDateFR(r.issuedAt)}
                  {r.sentAt ? ` · Courriel le ${formatDateFR(r.sentAt)}` : null}
                </div>
              </div>
              <a
                href={r.filePath}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center justify-center rounded-2xl px-3 py-1.5 text-sm font-semibold text-black shadow-md ${GRADIENT}`}
              >
                Télécharger le PDF
              </a>
            </div>
          </div>
        ))}
      </div>
    );
  }, [error, loading, rows, who]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Certificats — Recherche employé</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Saisis le <b>courriel</b> d’un employé pour voir ses certificats. (Accès réservé aux rôles Gérant / Admin.)
      </p>

      <form onSubmit={searchByEmail} className="mt-6 flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="employe@shopsante.ca"
          className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-teal"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className={`rounded-2xl px-3 py-2 text-sm font-semibold text-black shadow-md ${GRADIENT} disabled:opacity-60`}
        >
          Rechercher
        </button>
      </form>

      <div className="mt-6">
        {who ? (
          <div className="mb-3 text-sm text-neutral-700">
            Employé : <span className="font-medium text-neutral-900">{who.name || who.email}</span>
            {who.storeCode ? <span className="text-neutral-500"> — ({who.storeCode})</span> : null}
          </div>
        ) : null}
        {content}
      </div>
    </main>
  );
}
