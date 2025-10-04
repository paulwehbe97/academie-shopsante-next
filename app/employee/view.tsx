"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import { CHAPTERS } from "@/data/chapters";
import { RULES } from "@/config/rules";
import { cn } from "@/lib/utils";
import { loadUIState, saveUIState } from "@/lib/local";
import { computeLevelPct, isChapterCompleted, moduleCode, type Progress } from "@/lib/progress";

/** Petit composant qui notifie le TopBar (compatibilité avec l'existant) */
function RouteBeacon() {
  useEffect(() => {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("ui:route"));
  }, []);
  return null;
}

/** Primitives UI locales (identiques à ton style actuel) */
function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("bg-white/90 rounded-2xl shadow-xl border border-gray-100 p-6", className)}>
      {children}
    </div>
  );
}
function Pill({ children, color = "bg-gray-100 text-gray-700" }: { children: React.ReactNode; color?: string }) {
  return <span className={cn("px-2 py-1 rounded-full text-xs font-medium", color)}>{children}</span>;
}
function Button(
  { children, onClick, variant = "primary", className = "", disabled = false }:
  { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "subtle"; className?: string; disabled?: boolean }
) {
  const base = "px-4 py-2 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal text-white hover:opacity-95",
    ghost: "bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50",
    subtle: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  }[variant];
  return <button className={cn(base, styles, className)} onClick={onClick} disabled={disabled}>{children}</button>;
}

/** === Types UI locaux (ce que tu stockes dans localStorage) === */
type UIProgressState = "todo" | "in_progress" | "done";
type UIProgress = Record<string, { status: UIProgressState; score?: number }>;

/** Adaptateur UI → lib/progress */
function toLibProgress(ui: UIProgress): Progress {
  const out: Progress = {};
  for (const [code, val] of Object.entries(ui || {})) {
    out[code] =
      val?.status === "done" ? "passed" :
      val?.status === "in_progress" ? "in_progress" :
      "not_started";
  }
  return out;
}

export default function EmployeeHomePage({ session }: { session: any }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const storageKey = useMemo(() => session?.user?.email ?? "demo", [session?.user?.email]);
  const initial = typeof window === "undefined" ? {} : loadUIState(storageKey);

  // ⬇️ on garde la forme UI (avec {status}), puis on la convertit pour les helpers lib/*
  const [uiProgress, setUiProgress] = useState<UIProgress>((initial as any)?.progress ?? {});
  const progress: Progress = useMemo(() => toLibProgress(uiProgress), [uiProgress]);

  // Dans ce patch, on reste sur Niveau 1 (décision validée)
  const foundationsDone = isChapterCompleted(1, progress) && isChapterCompleted(2, progress);
  const { pct, completed, totalModules } = computeLevelPct(progress);

  // 💡 Compat : quand on navigue vers le “gros” app/page.tsx, on garde l’ancien mécanisme
  function openModule(chapter: number, title: string) {
    // Met à jour l’UI state attendu par l’ancien écran
    const next = { ...(loadUIState(storageKey) || {}) };
    next.currentModule = { chapter, title };
    next.route = "module";
    saveUIState(next, storageKey);
    // Retour temporaire vers la page racine (l’ancien routeur client prendra le relais)
    window.location.href = "/";
  }

  if (!hydrated) return <div className="min-h-[120px]" />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-yellow via-brand-lime to-brand-teal">
      <RouteBeacon />
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* En-tête progression Niveau 1 */}
        <Card className="bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-sm text-gray-700">Parcours employé</div>
              <div className="text-2xl font-bold text-white drop-shadow">Niveau 1 — Progression : {pct}%</div>
            </div>
            <div className="w-full md:w-1/2">
              <div className="h-3 bg-white/40 rounded-full overflow-hidden">
                <div className="h-full bg-white" style={{ width: pct + "%" }} />
              </div>
              <div className="text-xs text-white/90 mt-1">{completed}/{totalModules} modules complétés</div>
            </div>
          </div>
        </Card>

        {/* Liste des chapitres du Niveau 1 (visuel identique) */}
        {CHAPTERS.map(ch => (
          <Card key={ch.no}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 grid place-items-center rounded-xl bg-brand-100 text-brand-700 font-bold">{ch.no}</div>
                <div>
                  <div className="font-bold">Chapitre {ch.no} — {ch.title}</div>
                  {ch.mandatory ? (
                    <Pill color="bg-indigo-100 text-indigo-700">Obligatoire en premier</Pill>
                  ) : (
                    !foundationsDone
                      ? <Pill color="bg-gray-100 text-gray-500">Verrouillé (finir Ch.1 & Ch.2)</Pill>
                      : <Pill color="bg-emerald-100 text-emerald-700">Disponible</Pill>
                  )}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ch.modules.map((m: string, idx: number) => {
                const code = moduleCode(ch.no, m);
                const state = (uiProgress[code]?.status || "todo") as UIProgressState;

                const mustLockByFoundation = !ch.mandatory && !foundationsDone;
                const prevCode = idx > 0 ? moduleCode(ch.no, ch.modules[idx - 1]) : null;
                const mustLockByOrder = idx > 0 && uiProgress[prevCode!]?.status !== "done";
                const locked = mustLockByFoundation || mustLockByOrder;

                return (
                  <div key={m} className={cn("border rounded-2xl p-4", locked ? "opacity-60" : "bg-white")}>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{m}</div>
                      {state === "done"
                        ? <Pill color="bg-emerald-100 text-emerald-700">Réussi</Pill>
                        : state === "in_progress"
                          ? <Pill color="bg-amber-100 text-amber-700">En cours</Pill>
                          : <Pill>À faire</Pill>}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Vidéo + Quiz (≥ {RULES.passMark}%)</div>
                    <div className="mt-3 flex gap-2">
                      <Button variant="ghost" disabled={locked} onClick={() => openModule(ch.no, m)}>
                        {state === "done" ? "Réviser" : "Continuer"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </main>
    </div>
  );
}
