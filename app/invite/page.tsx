// app/invite/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { RULES } from "../../config/rules";
import Image from "next/image";

export default function InvitePage() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [emailCred, setEmailCred] = useState('');
  const [pwdCred, setPwdCred] = useState('');
  const [pendingCred, setPendingCred] = useState(false);
  const [errorCred, setErrorCred] = useState<string | null>(null);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setErrorCred(null);
    setPendingCred(true);

    const res = await signIn('credentials', {
      email: emailCred.trim().toLowerCase(),
      password: pwdCred,
      redirect: false,
      callbackUrl: '/',
    });

    setPendingCred(false);
    if (!res || res.error) {
      setErrorCred("Identifiants invalides ou compte sans mot de passe.");
      return;
    }
    window.location.assign(res.url || '/');
  }

  function handleOAuth(provider: 'google' | 'azure-ad') {
    signIn(provider, { callbackUrl: '/' });
  }

  if (!hydrated) return <div className="min-h-[200px]" />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-yellow via-brand-lime to-brand-teal/70">
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 pb-14 pt-6 lg:grid-cols-2">
        
        {/* Colonne gauche : texte et badges */}
        <section className="text-black space-y-6">
  <p className="mt-6 text-[17px] leading-8 text-center lg:text-center">
    <strong className="block text-3xl md:text-4xl font-extrabold leading-tight mb-6">
      Bienvenue à l’Académie Shop Santé&nbsp;!
    </strong>
    Ta plateforme de formation en ligne pour devenir <strong>réellement à l’aise en supplémentation</strong>.<br />
    Ici, on va droit au but&nbsp;: <strong>vidéos courtes</strong>, <strong>quiz clairs</strong>, et <strong>progression visible</strong> après chaque module.<br />
    Tu trouveras <strong>l’essentiel pour progresser chaque semaine</strong>, valider tes acquis et <strong>transformer tes conseils en expertise</strong> auprès des clients.
  </p>

  <p className="text-[15px] leading-7 text-neutral-700 text-center lg:text-center">
    <strong>Niveau&nbsp;1 — Règles :</strong> réussite <b>≥ {RULES.passMark}%</b>, <b>{RULES.maxAttempts} tentatives</b>.<br />
    Si ça ne passe pas&nbsp;: on revoit la vidéo et on repart 💪&nbsp; Les chapitres <b>1 &amp; 2</b> posent les bases,
    puis <b>tu avances à ton rythme</b>.
  </p>

  <div className="mt-8 flex flex-wrap justify-center gap-4">
    <span className="rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-900">
      Espace personnel sécurisé
    </span>
    <span className="rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-900">
      Progression à ton rythme
    </span>
    <span className="rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-medium text-indigo-900">
      Certificats PDF officiels
    </span>
  </div>
</section>

        {/* Colonne droite : carte de connexion */}
        <section className="rounded-2xl border border-black/10 bg-white/90 p-6 shadow-lg backdrop-blur">
          <h2 className="text-lg font-semibold">Connexion</h2>

          <form onSubmit={handleCredentials} className="mt-4 space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={emailCred}
              onChange={(e) => setEmailCred(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-teal"
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={pwdCred}
              onChange={(e) => setPwdCred(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-teal"
              autoComplete="current-password"
            />

            <button
              type="submit"
              disabled={pendingCred}
              className="w-full rounded-2xl px-4 py-2 text-sm font-semibold text-black shadow-md bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal disabled:opacity-60"
            >
              {pendingCred ? "Connexion…" : "Se connecter"}
            </button>

            <div className="my-4 flex items-center gap-3 text-xs text-neutral-500">
              <div className="h-px flex-1 bg-neutral-200" />
              <span>ou</span>
              <div className="h-px flex-1 bg-neutral-200" />
            </div>

            <button
              type="button"
              onClick={() => handleOAuth('google')}
              className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-neutral-50"
            >
              Continuer avec Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('azure-ad')}
              className="mt-3 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-neutral-50"
            >
              Continuer avec Microsoft
            </button>

            <div className="my-4 h-px w-full bg-neutral-200" />

            <div>
              <div className="text-sm font-medium text-neutral-800">Mot de passe oublié&nbsp;?</div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-neutral-500">
                  Recevez un courriel pour créer un nouveau mot de passe.
                </p>
                <a
                  href="/reset/request"
                  className="rounded-2xl px-4 py-2 text-sm font-semibold text-black shadow-md bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal"
                >
                  Réinitialiser
                </a>
              </div>
            </div>

            {errorCred && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                {errorCred}
              </div>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}
