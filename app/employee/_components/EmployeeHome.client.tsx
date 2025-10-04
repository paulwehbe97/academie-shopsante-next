"use client";

import { useEffect, useMemo, useState } from "react";
import { ToastProvider, useToast } from "./toast";
import { LEVELS, type LevelKey, type Chapter, type Subject } from "@/lib/curriculum";
import * as P from "@/lib/progress";
import * as PL from "@/lib/progressLocal";
import { fetchProgressServer, upsertProgressServer } from "@/lib/progressServer";

const GRADIENT = "bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal";

/* ---------------------------- Helpers progression ---------------------------- */

function mkModuleCode(levelKey: LevelKey, chapterId: string, subjectId: string) {
  return `${levelKey}::${chapterId}::${subjectId}`;
}

function clampPct(n: number) {
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
}

function pctSubject(levelKey: LevelKey, chapterId: string, subjectId: string): number {
  try {
    if (typeof (P as any).computeSubjectPct === "function") {
      const v = (P as any).computeSubjectPct(levelKey, chapterId, subjectId);
      const n = Number.isFinite(v) ? v : 0;
      return clampPct(n);
    }
  } catch {}
  const s = PL.getSubjectState(levelKey, chapterId, subjectId);
  return clampPct(s.pct);
}

function pctChapter(levelKey: LevelKey, chapter: Chapter): number {
  const subs = chapter.subjects;
  if (!subs.length) return 0;
  const sum = subs.reduce((acc, s) => acc + pctSubject(levelKey, chapter.id, s.id), 0);
  return Math.round(sum / subs.length);
}

function pctLevel(levelKey: LevelKey): number {
  const chs = LEVELS[levelKey].chapters;
  if (!chs.length) return 0;
  const sum = chs.reduce((acc, ch) => acc + pctChapter(levelKey, ch), 0);
  return Math.round(sum / chs.length);
}

function allSubjectsOK90(levelKey: LevelKey, chapter: Chapter): boolean {
  return chapter.subjects.every((s) => pctSubject(levelKey, chapter.id, s.id) >= 90);
}

function GradientBar({ pct, height = 12 }: { pct: number; height?: number }) {
  return (
    <div className="w-full rounded-full bg-white/40" style={{ height }}>
      <div className={`rounded-full bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal`} style={{ width: `${pct}%`, height }} />
    </div>
  );
}

/* ------------------------------------- UI ------------------------------------- */

type UserMini = { email: string; name?: string; role: string; storeCode?: string | null; storeName?: string | null };

function EmployeeHomeInner({ user }: { user: UserMini }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const { show } = useToast();

  const [open, setOpen] = useState<Record<LevelKey, boolean>>({
    "Niveau 1": true,
    "Niveau 2": false,
    "Niveau 3": false,
    "Niveau 4": false,
    "Nos Fournisseurs": false,
  });

  // ---- PULL serveur + BACKFILL local -> serveur ----
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    let cancelled = false;

    (async () => {
      try {
        const server = await fetchProgressServer(); // { [moduleCode]: { pct, watched, attempts } }
        if (cancelled) return;

        const raw = localStorage.getItem("academy-progress");
        const local = raw ? JSON.parse(raw) : {};

        // 1) Fusion serveur -> local (priorité serveur)
        for (const levelKey of Object.keys(LEVELS) as LevelKey[]) {
          const lvl = LEVELS[levelKey];
          for (const ch of lvl.chapters) {
            for (const s of ch.subjects) {
              const code = mkModuleCode(levelKey, ch.id, s.id);
              const row = (server as any)[code];
              if (!row) continue;
              const pct = clampPct((row as any).pct ?? 0);
              const watched = !!(row as any).watched;
              const attempts = Math.max(0, Math.floor((row as any).attempts ?? 0));

              local[levelKey] = local[levelKey] || {};
              local[levelKey][ch.id] = local[levelKey][ch.id] || {};
              local[levelKey][ch.id][s.id] = {
                ...(local[levelKey][ch.id][s.id] || {}),
                pct,
                watched,
                attemptsSinceWatch: attempts,
              };
            }
          }
        }
        localStorage.setItem("academy-progress", JSON.stringify(local));

        // 2) BACKFILL local -> serveur : pour chaque sujet qui n'est PAS sur le serveur
        //    mais présent côté local (watched=true ou pct>0), on upsert côté serveur.
        const toSend: Array<{
          moduleCode: string;
          levelKey: LevelKey;
          chapterId: string;
          watched: boolean;
          attempts: number;
          pct: number;
          lastAttemptAt?: string;
        }> = [];

        for (const levelKey of Object.keys(LEVELS) as LevelKey[]) {
          const lvl = LEVELS[levelKey];
          for (const ch of lvl.chapters) {
            for (const s of ch.subjects) {
              const code = mkModuleCode(levelKey, ch.id, s.id);
              const onServer = !!(server as any)[code];

              const loc = local?.[levelKey]?.[ch.id]?.[s.id];
              const lPct = clampPct(Number(loc?.pct ?? 0));
              const lWatched = !!loc?.watched;
              const lAttempts = Math.max(0, Number(loc?.attemptsSinceWatch ?? 0));

              if (!onServer && (lWatched || lPct > 0)) {
                toSend.push({
                  moduleCode: code,
                  levelKey,
                  chapterId: ch.id,
                  watched: lWatched,
                  attempts: lAttempts,
                  pct: lPct,
                });
              }
            }
          }
        }

        if (toSend.length) {
          // on limite pour éviter des payloads énormes — ici 200 c’est large
          const batch = toSend.slice(0, 200);
          try {
            await upsertProgressServer(batch);
            // Optionnel: on pourrait re-fetch, mais ce n'est pas obligatoire pour l'UX immédiate
          } catch {/* silencieux */}
        }
      } catch {
        /* pas de données serveur: ce sera sync à la première action */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  const n1 = LEVELS["Niveau 1"];
  const ch1 = n1.chapters.find((c) => c.id === "1");
  const ch2 = n1.chapters.find((c) => c.id === "2");
  const canAccessBeyondN1 = useMemo(() => {
    if (!hydrated) return false;
    return !!(ch1 && ch2 && allSubjectsOK90("Niveau 1", ch1) && allSubjectsOK90("Niveau 1", ch2));
  }, [hydrated, ch1, ch2]);

  // --- Émission certificat (inchangé) ---
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;

    const issuedKey = "cert-issued";
    const issuedMap: Record<string, boolean> = JSON.parse(localStorage.getItem(issuedKey) || "{}");

    n1.chapters.forEach(async (ch) => {
      let allOk = true;
      try {
        const store = JSON.parse(localStorage.getItem("academy-progress") || "{}");
        allOk = ch.subjects.every((s) => Number(store?.["Niveau 1"]?.[ch.id]?.[s.id]?.pct ?? 0) >= 90);
      } catch {
        allOk = false;
      }

      const key = `Niveau 1::${ch.id}`;
      if (allOk && !issuedMap[key]) {
        try {
          const resp = await fetch("/api/certificates/issue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              levelKey: "Niveau 1",
              chapterId: ch.id,
              chapterTitle: ch.title,
            }),
            credentials: "include",
            cache: "no-store",
          });

          const data = await resp.json();
          if (resp.ok && data?.ok) {
            issuedMap[key] = true;
            localStorage.setItem(issuedKey, JSON.stringify(issuedMap));
            show(`Certificat émis — Chapitre ${ch.id} : ${ch.title} ✅`, "/employee/certificates");
          }
        } catch (e) {
          console.error("Issue certificate failed", e);
        }
      }
    });
  }, [hydrated, open["Niveau 1"], n1.chapters, show]);

  if (!hydrated) return <div className="min-h-[200px]" />;

  const LEVEL_ORDER: LevelKey[] = ["Niveau 1", "Niveau 2", "Niveau 3", "Niveau 4", "Nos Fournisseurs"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Parcours de formation</h1>
        <div className="text-sm text-neutral-700">
          Boutique:{" "}
          {user.storeName ? (
            <span className="font-medium text-neutral-900">
              {user.storeName} {user.storeCode ? <span className="text-neutral-500">— ({user.storeCode})</span> : null}
            </span>
          ) : (
            <span className="font-medium text-neutral-900">Non assignée</span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {LEVEL_ORDER.map((lv) => {
          const pct = pctLevel(lv);
          const isOpen = open[lv];
          const isN1 = lv === "Niveau 1";
          return (
            <div key={lv} className="overflow-hidden rounded-2xl border border-black/10 bg-white/90 shadow-sm backdrop-blur">
              <button
                onClick={() => setOpen((o) => ({ ...o, [lv]: !o[lv] }))}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
              >
                <div className="text-[15px] font-semibold text-neutral-900">
                  {lv} — <span className="font-normal">Progression : {pct}%</span>
                </div>
                <div className="w-64 max-w-[50%]">
                  <GradientBar pct={pct} height={12} />
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-neutral-200/70 p-4">
                  {isN1 ? (
                    <Niveau1Grid canAccessBeyond={canAccessBeyondN1} />
                  ) : (
                    <div className="rounded-xl border border-dashed border-neutral-300 bg-white/70 p-6 text-center text-neutral-700">
                      Formation à venir
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EmployeeHome({ user }: { user: UserMini }) {
  return (
    <ToastProvider>
      <EmployeeHomeInner user={user} />
    </ToastProvider>
  );
}

/* ------------------------------- NIVEAU 1 GRID ----------------------------------- */

function Niveau1Grid({ canAccessBeyond }: { canAccessBeyond: boolean }) {
  const n1 = LEVELS["Niveau 1"];

  return (
    <div className="grid grid-cols-1 gap-4">
      {n1.chapters.map((ch) => {
        const pctCh = pctChapter("Niveau 1", ch);
        const lockedByRule = Number(ch.id) > 2 && !canAccessBeyond;

        return (
          <div key={ch.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-neutral-700">
                  Chapitre {ch.id}
                  {ch.mandatory ? " — obligatoire en premier" : ""}
                </div>
                <div className="text-base font-semibold text-neutral-900">{ch.title}</div>
              </div>
              <div className="text-xs text-neutral-500">{pctCh}%</div>
            </div>

            <div className="mt-3">
              <GradientBar pct={pctCh} height={8} />
            </div>

            {lockedByRule ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Débloque d’abord <b>Chapitre 1</b> et <b>Chapitre 2</b> en atteignant <b>≥ 90 %</b> sur
                <b> chaque sujet</b>, pour accéder aux chapitres suivants.
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {ch.subjects.map((s) => (
                <SubjectCard key={s.id} levelKey="Niveau 1" chapter={ch} subject={s} disabled={lockedByRule} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SubjectCard({
  levelKey,
  chapter,
  subject,
  disabled,
}: {
  levelKey: LevelKey;
  chapter: Chapter;
  subject: Subject;
  disabled: boolean;
}) {
  const [tick, setTick] = useState(0);
  const state = PL.getSubjectState(levelKey, chapter.id, subject.id);
  const pct = state.pct;

  const gate = PL.canTakeQuiz(levelKey, chapter.id, subject.id);
  const quizDisabled = disabled || !gate.ok;

  const hint =
    !state.watched
      ? "Regarde la vidéo avant de passer le quiz."
      : state.pct >= 90
      ? "Sujet réussi (≥90%). Tu peux repasser si tu veux."
      : state.attemptsSinceWatch >= 2
      ? "Tu as atteint 2 essais. Revois la vidéo pour continuer."
      : "Tu peux tenter le quiz (jusqu’à 2 essais avant de revoir la vidéo).";

  async function markVideoWatched() {
    PL.markWatched(levelKey, chapter.id, subject.id);
    setTick((t) => t + 1);

    const code = mkModuleCode(levelKey, chapter.id, subject.id);
    try {
      await upsertProgressServer({
        moduleCode: code,
        levelKey,
        chapterId: chapter.id,
        watched: true,
        attempts: 0,
        pct: state.pct ?? 0,
      });
    } catch {}
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-neutral-900">{subject.title}</div>
        </div>
        <div className="text-xs text-neutral-500">{pct}%</div>
      </div>

      <div className="mt-2">
        <GradientBar pct={pct} height={6} />
      </div>

      <div className="mt-2 text-xs text-neutral-500">{hint}</div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
          disabled={disabled}
          onClick={(e) => {
            e.preventDefault();
            markVideoWatched();
          }}
          title="Simuler la fin de la vidéo"
        >
          Voir la vidéo
        </button>

        <a
          href={
            quizDisabled || !subject.quizId
              ? "#"
              : `/quiz/${encodeURIComponent(subject.quizId)}?level=${encodeURIComponent(
                  levelKey
                )}&chapter=${encodeURIComponent(chapter.id)}&subject=${encodeURIComponent(subject.id)}`
          }
          onClick={(e) => {
            if (quizDisabled || !subject.quizId) e.preventDefault();
          }}
          className="rounded-2xl px-3 py-1.5 text-sm font-semibold text-black shadow-md bg-gradient-to-r from-brand-yellow via-brand-lime to-brand-teal disabled:opacity-50"
          aria-disabled={quizDisabled || !subject.quizId}
        >
          Passer le quiz
        </a>
      </div>
    </div>
  );
}
