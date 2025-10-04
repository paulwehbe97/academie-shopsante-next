"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetConfirmClient() {
  const search = useSearchParams();
  const router = useRouter();
  const token = search.get("token") || "";
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function isStrong(p: string) {
    return /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(p);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);

    if (!token) return setError("Lien invalide.");
    if (!isStrong(pwd))
      return setError("Exigences: min. 8 caractères, ≥1 majuscule, ≥1 chiffre.");
    if (pwd !== pwd2)
      return setError("Les mots de passe ne correspondent pas.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: pwd }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("Mot de passe mis à jour. Redirection vers la connexion...");
      setTimeout(() => router.replace("/invite"), 1200);
    } catch (err: any) {
      setError(err?.message || "Échec de la réinitialisation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-yellow via-brand-lime to-brand-teal/70">
      <main className="mx-auto max-w-md px-6 py-10">
        <h1 className="text-2xl font-bold text-center">Créer un nouveau mot de passe</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-3 bg-white/90 rounded-2xl p-4 shadow">
          {!token && (
            <div className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl p-2">
              Lien invalide ou incomplet.
            </div>
          )}

          <input
            type="password"
            placeholder="Nouveau mot de passe (≥8, 1 majuscule, 1 chiffre)"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-teal"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            autoComplete="new-password"
          />

          <input
            type="password"
            placeholder="Confirmez le mot de passe"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-teal"
            value={pwd2}
            onChange={(e) => setPwd2(e.target.value)}
            autoComplete="new-password"
          />

          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-2">
              {error}
            </div>
          )}
          {msg && (
            <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2">
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !token}
            className="w-full rounded-2xl px-4 py-2 text-sm font-semibold text-black shadow-md bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal disabled:opacity-60"
          >
            {submitting ? "Mise à jour..." : "Enregistrer"}
          </button>
        </form>
      </main>
    </div>
  );
}
