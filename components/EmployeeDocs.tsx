"use client";

import { useEffect, useState } from "react";

type PolicyItem = {
  id: string;
  title: string;
  category: string;
  fileUrl: string;
  acceptedAt?: string | null;
  acceptedBy?: string | null;
};

export default function EmployeeDocs() {
  const [items, setItems] = useState<PolicyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [pending, setPending] = useState(false);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/policies", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) setItems(data.items || []);
      else setErr("Impossible de charger la liste.");
    } catch {
      setErr("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openModal(id: string) {
    setTargetId(id);
    setFullName("");
    setModalOpen(true);
  }

  async function confirmAccept() {
    if (!targetId) return;
    if (!fullName || fullName.trim().length < 3) {
      setErr("Entre ton nom complet pour confirmer.");
      return;
    }
    setPending(true);
    setErr(null);
    try {
      const res = await fetch(`/api/policies/${targetId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setErr("Impossible d’enregistrer la reconnaissance.");
      } else {
        setModalOpen(false);
        setTargetId(null);
        setFullName("");
        await load(); // rafraîchir l’état acceptedAt/By
      }
    } catch {
      setErr("Erreur réseau.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white/90 p-6 shadow-lg backdrop-blur">
      <h2 className="text-lg font-semibold text-center">Politiques & Contrats</h2>
      <p className="mt-1 text-sm text-neutral-600 text-center">Clique pour lire; option pour télécharger.</p>

      {loading ? (
        <p className="mt-5 text-sm text-neutral-600 text-center">Chargement…</p>
      ) : items.length === 0 ? (
        <div className="mt-5 rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600 text-center">
          Documents à venir (téléversement PDF, signatures, etc.).
        </div>
      ) : (
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((doc) => (
            <li key={doc.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-neutral-900">{doc.title}</div>
                  <div className="mt-0.5 text-xs text-neutral-500">{doc.category}</div>
                  {doc.acceptedAt ? (
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      ✅ Lu le {new Date(doc.acceptedAt).toLocaleDateString()} {doc.acceptedBy ? `par ${doc.acceptedBy}` : ""}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm font-medium shadow-sm hover:bg-neutral-50"
                  >
                    Ouvrir
                  </a>
                  <a
                    href={`${doc.fileUrl}?download=1`}
                    className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm font-medium shadow-sm hover:bg-neutral-50"
                  >
                    Télécharger
                  </a>
                  {!doc.acceptedAt && (
                    <button
                      onClick={() => openModal(doc.id)}
                      className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800 hover:bg-amber-100"
                    >
                      Reconnaître
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {err && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{err}</div>
      )}

      {/* Modal simple */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-5 shadow-lg">
            <h3 className="text-lg font-semibold">Reconnaître la lecture</h3>
            <p className="mt-1 text-sm text-neutral-600">
              Entre ton <b>nom complet</b> pour confirmer que tu as lu ce document.
            </p>
            <input
              autoFocus
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nom complet"
              className="mt-3 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-teal"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm font-medium shadow-sm hover:bg-neutral-50"
                disabled={pending}
              >
                Annuler
              </button>
              <button
                onClick={confirmAccept}
                disabled={pending || fullName.trim().length < 3}
                className="rounded-full px-3 py-1 text-sm font-semibold text-black shadow-md bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal disabled:opacity-60"
              >
                {pending ? "Enregistrement…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
