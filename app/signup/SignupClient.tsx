'use client';
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function SignupPage() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const qp = useSearchParams();
  const token = useMemo(() => qp.get('token') || '', [qp]);

  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Fetch invited email (GET with ?token=… to avoid body parsing edge cases)
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`/api/invites/verify?token=${encodeURIComponent(token)}`, { method: 'GET' });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.ok) setInvitedEmail(data.email ?? null);
        else setInvitedEmail(null);
      } catch { /* no-op */ }
    })();
  }, [token]);

  if (!hydrated) return <div className="min-h-[200px]" />;

  const strong = (p: string) => p.length >= 8 && /[A-Z]/.test(p) && /\d/.test(p);
  const disabled = !token || !strong(pwd) || pwd !== pwd2 || pending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setOk(null);

    if (!token) { setError("Lien invalide. Reprends l’invitation."); return; }
    if (pwd !== pwd2) { setError("Les mots de passe ne correspondent pas."); return; }
    if (!strong(pwd)) { setError("Mot de passe trop faible (≥8, 1 maj, 1 chiffre)."); return; }

    setPending(true);
    try {
      const resp = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: pwd }),
      });
      const data = await resp.json();

      if (!resp.ok || !data?.ok) {
        const map: Record<string, string> = {
          invalid_or_expired_token: "Lien invalide ou expiré. Demande une nouvelle invitation.",
          invite_revoked: "Cette invitation a été révoquée ou déjà utilisée.",
          corrupt_invite_no_jti: "Invitation corrompue. Demande une nouvelle invitation.",
          weak_password: "Mot de passe trop faible (≥8, 1 maj, 1 chiffre).",
          already_registered: "Ce lien a déjà été utilisé. Connecte-toi depuis la page d’accueil.",
          missing_params: "Requête incomplète.",
          server_error: "Erreur serveur. Réessaie.",
        };
        setError(map[data?.error] || "Impossible de compléter l’inscription.");
        return;
      }

      const email: string | undefined = data?.user?.email;
      if (!email) { setError("Inscription réussie mais email manquant. Ouvre la page de connexion."); return; }
      setOk("Compte créé avec succès. Connexion en cours…");
      await signIn('credentials', { email, password: pwd, callbackUrl: '/' });
    } catch {
      setError("Erreur réseau. Réessaie.");
    } finally {
      setPending(false);
    }
  }

  // SSO: pre-provision via GET ?token=… then launch provider
 // ...
  // SSO: pre-provision via GET ?token=… then launch provider
  async function handleSso(provider: 'google' | 'azure-ad') {
    setError(null); setOk(null);
    if (!token) { setError("Lien invalide. Reprends l’invitation."); return; }

    setPending(true);
    try {
      const resp = await fetch(`/api/register/sso-provision?token=${encodeURIComponent(token)}`, { method: 'GET' });
      const data = await resp.json();
      if (!resp.ok || !data?.ok) {
        const map: Record<string, string> = {
          invalid_or_expired_token: "Lien invalide ou expiré. Demande une nouvelle invitation.",
          invite_revoked: "Cette invitation a été révoquée ou déjà utilisée.",
          corrupt_invite_no_jti: "Invitation corrompue. Demande une nouvelle invitation.",
          server_error: "Erreur serveur. Réessaie.",
        };
        setError(map[data?.error] || "Impossible de démarrer la connexion SSO.");
        setPending(false);
        return;
      }

      setOk("Invitation validée. Redirection vers le fournisseur SSO…");
      // ✅ transmet le token pour que NextAuth puisse garder le contexte
      await signIn(provider, { callbackUrl: `/`, token });
    } catch {
      setError("Erreur réseau. Réessaie.");
      setPending(false);
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-yellow via-brand-lime to-brand-teal/70">
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mx-auto w-full max-w-lg rounded-2xl border border-black/10 bg-white/90 p-6 shadow-lg backdrop-blur text-center">
          <h1 className="text-2xl font-semibold">Créer mon accès</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Cette page est accessible uniquement via le lien reçu par courriel (invitation).
          </p>
          {invitedEmail && (
            <p className="mt-1 text-xs text-neutral-700">
              Invitation pour : <b>{invitedEmail}</b>
            </p>
          )}

          <div className="mt-6 space-y-2">
            <button
              type="button"
              onClick={() => handleSso('google')}
              disabled={pending}
              className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-neutral-50"
            >
              Continuer avec Google
            </button>
            <button
              type="button"
              onClick={() => handleSso('azure-ad')}
              disabled={pending}
              className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-neutral-50"
            >
              Continuer avec Microsoft
            </button>
          </div>

          <div className="my-4 flex items-center gap-3 text-xs text-neutral-500">
            <div className="h-px flex-1 bg-neutral-200" />
            <span>ou</span>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          <h2 className="text-lg font-semibold">Créer un mot de passe</h2>
          <form onSubmit={handleSubmit} className="mt-3 space-y-4">
            <label className="block text-left">
              <span className="text-sm font-medium text-neutral-800">Mot de passe</span>
              <input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-teal"
                placeholder="Au moins 8 caractères, 1 majuscule et 1 chiffre"
                autoComplete="new-password"
                required
              />
            </label>

            <label className="block text-left">
              <span className="text-sm font-medium text-neutral-800">Confirmer le mot de passe</span>
              <input
                type="password"
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-teal"
                autoComplete="new-password"
                required
              />
            </label>

            <button
              type="submit"
              disabled={disabled}
              className="w-full rounded-2xl px-4 py-2 text-sm font-semibold text-black shadow-md bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal disabled:opacity-60"
            >
              {pending ? "Création en cours…" : "Créer mon compte"}
            </button>

            {ok && (
              <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
                {ok}
              </div>
            )}
            {error && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                {error}
              </div>
            )}
          </form>

          <p className="mt-6 text-xs text-neutral-500">
            Besoin d’aide? Contacte un administrateur pour une nouvelle invitation.
          </p>
        </div>
      </main>
    </div>
  );
}
