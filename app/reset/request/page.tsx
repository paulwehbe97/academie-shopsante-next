"use client";

import { useState } from "react";

export default function ResetRequestPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Échec de la demande.");
      }
      setDone(true);
    } catch (err: any) {
      setError(err?.message || "Échec de la demande.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-yellow via-brand-lime to-brand-teal/70">
      <main className="mx-auto max-w-md px-6 py-10">
        <h1 className="text-2xl font-bold text-center">Réinitialiser le mot de passe</h1>
        <p className="mt-2 text-sm text-center text-neutral-700">
          Entrez l’adresse e-mail de votre compte. Si elle existe, vous recevrez un lien pour créer un nouveau mot de passe.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3 bg-white/90 rounded-2xl p-4 shadow">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-teal"
            autoComplete="email"
          />
          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-2">{error}</div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl px-4 py-2 text-sm font-semibold text-black shadow-md bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal disabled:opacity-60"
          >
            {submitting ? "Envoi..." : "Envoyer le lien"}
          </button>

          {done && (
            <div className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl p-2">
              Si un compte existe, un courriel a été envoyé avec les instructions.
            </div>
          )}
        </form>

        <p className="mt-4 text-center text-sm">
          <a href="/invite" className="underline">Retour à la page de connexion</a>
        </p>
      </main>
    </div>
  );
}
