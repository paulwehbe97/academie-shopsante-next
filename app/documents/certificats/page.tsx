"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { CHAPTERS } from "data/chapters";
import { loadUIState } from "lib/local";
import { slugify } from "lib/utils";

type ProgressState = "todo" | "in_progress" | "done";
type Progress = Record<string, { status: ProgressState; score?: number }>;

function Button({
  children,
  onClick,
  href,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "subtle" | "ghost";
  className?: string;
}) {
  const base = "px-4 py-2 rounded-xl font-semibold transition";
  const styles =
    variant === "primary"
      ? "bg-brand-600 text-white hover:opacity-95"
      : variant === "subtle"
      ? "bg-gray-100 text-gray-800 hover:bg-gray-200"
      : "bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50";
  if (href) {
    return (
      <a className={`${base} ${styles} ${className}`} href={href}>
        {children}
      </a>
    );
  }
  return (
    <button className={`${base} ${styles} ${className}`} onClick={onClick}>
      {children}
    </button>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
      {children}
    </span>
  );
}

const moduleCode = (chapter: number, title: string) =>
  `n1-c${chapter}-${slugify(title)}`;

export default function CertificatsPage() {
  const { data: session, status } = useSession();

  // Garde d’hydratation (évite mismatch SSR/CSR)
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => setHydrated(true), []);

  // Clé de persistance liée à l’utilisateur
  const storageKey = React.useMemo(
    () => session?.user?.email ?? "demo",
    [session?.user?.email]
  );

  // Récupérer la progression pour fallback (MVP)
  const progress = React.useMemo<Progress>(() => {
    if (typeof window === "undefined") return {};
    const ui = loadUIState(storageKey);
    return (ui?.progress as Progress) ?? {};
  }, [storageKey]);

  const fullName =
    session?.user?.name ||
    (session?.user?.email ? session.user.email.split("@")[0] : "Employé Shop Santé");

  const LEVELS = [1, 2, 3, 4] as const;
  const [activeLevel, setActiveLevel] = React.useState<(typeof LEVELS)[number]>(1);

  // 1) Lecture de l’historique MVP (prioritaire si présent)
  const storedItems = React.useMemo(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(`certificates:${storageKey}`);
      const arr = raw ? JSON.parse(raw) : [];
      // Tri desc par date ISO
      return Array.isArray(arr)
        ? arr
            .filter((x) => x && x.level === 1) // on affiche N1 aujourd’hui
            .sort(
              (a: any, b: any) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            )
        : [];
    } catch {
      return [];
    }
  }, [storageKey]);

  // 2) Fallback si aucun historique : dérive depuis progress (modules “done”)
  const fallbackItems = React.useMemo(() => {
    const items: { chapter: number; module: string; id: string }[] = [];
    for (const ch of CHAPTERS) {
      for (const m of ch.modules) {
        const code = moduleCode(ch.no, m);
        if (progress[code]?.status === "done") {
          items.push({ chapter: ch.no, module: m, id: code });
        }
      }
    }
    return items;
  }, [progress]);

  const items = storedItems.length > 0 ? storedItems : fallbackItems;

  // Action: renvoi par email (utilise l’API POST /api/certificates/issue)
  async function sendByEmail(moduleTitle: string, chapter: number) {
    try {
      const res = await fetch("/api/certificates/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          module: moduleTitle,
          chapter: String(chapter),
          to: session?.user?.email,
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        alert("Échec d’envoi par email.\n" + t);
      } else {
        alert("Certificat envoyé à votre adresse.");
      }
    } catch (e) {
      alert("Erreur réseau.");
    }
  }

  // URL GET pour télécharger (re-génère à la volée côté serveur)
  function downloadHref(moduleTitle: string, chapter: number, dateIso?: string) {
    const params = new URLSearchParams({
      name: fullName,
      module: moduleTitle,
      chapter: String(chapter),
    });
    if (dateIso) params.set("date", dateIso);
    return `/api/certificates/issue?${params.toString()}`;
  }

  if (!hydrated) {
    return <div className="min-h-[120px]" />;
  }

  if (status === "loading") {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="text-sm text-gray-500">Chargement…</div>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4">
          Connectez-vous pour voir vos certificats.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Mes certificats</h1>
      <p className="text-gray-600 mb-6">
        Retrouvez ici vos certificats par niveau. Vous pouvez les <b>télécharger</b> ou vous les{" "}
        <b>envoyer par courriel</b>.
      </p>

      {/* Sélecteur de niveaux (N1 actif, les autres à venir) */}
      <div className="mb-4 flex items-center gap-2">
        {LEVELS.map((lv) => (
          <button
            key={lv}
            onClick={() => setActiveLevel(lv)}
            className={`px-3 py-1 rounded-full border text-sm ${
              activeLevel === lv
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white hover:bg-gray-50"
            }`}
            disabled={lv !== 1}
            title={lv === 1 ? "Niveau 1" : "À venir"}
          >
            N{lv}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="bg-white border rounded-2xl p-6 text-center text-gray-600">
          Aucun certificat pour l’instant. Validez vos modules du <b>Niveau 1</b> pour les voir ici.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it: any) => (
            <div key={it.id} className="border rounded-2xl p-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="font-semibold">
                  Chapitre {it.chapter} — {it.module || it.title}
                </div>
                <Pill>N1</Pill>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {it.date ? new Date(it.date).toLocaleString() : "Date : aujourd’hui"}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  href={downloadHref(it.module || it.title, it.chapter, it.date)}
                >
                  Télécharger le PDF
                </Button>
                <Button
                  variant="subtle"
                  onClick={() => sendByEmail(it.module || it.title, it.chapter)}
                >
                  M’envoyer par email
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
