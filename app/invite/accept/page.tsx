"use client";
import React from "react";

export default function AcceptInvitePage() {
  const [state, setState] = React.useState<"loading"|"ok"|"err">("loading");
  const [msg, setMsg] = React.useState<string>("Vérification du lien…");

  React.useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    if (!token) {
      setState("err"); setMsg("Lien invalide."); return;
    }

    (async () => {
      try {
        const res = await fetch("/api/invites/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.ok === false) {
          setState("err"); setMsg(data?.error || "Échec de l’acceptation."); return;
        }
        setState("ok");
        setMsg(
          `Invitation acceptée pour ${data.user?.email}. Vous pouvez maintenant vous connecter.`
        );
      } catch {
        setState("err");
        setMsg("Erreur réseau.");
      }
    })();
  }, []);

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <div className="border rounded-2xl p-6 bg-white">
        <h1 className="text-2xl font-bold mb-2">Invitation</h1>
        <p className={state==="err" ? "text-red-600" : "text-gray-700"}>{msg}</p>

        <div className="mt-4 flex gap-2">
          <a href="/api/auth/signin" className="px-4 py-2 rounded-xl bg-brand-600 text-white">
            Se connecter
          </a>
          <a href="/" className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200">
            ← Accueil
          </a>
        </div>

        <div className="text-xs text-gray-500 mt-4">
          Astuce : si votre compte est <b>Gérant</b>, vous aurez accès à <code>/manager</code> après connexion.  
          Si votre compte est <b>Employé</b>, vos documents sont accessibles via <code>/documents/…</code>.
        </div>
      </div>
    </main>
  );
}
