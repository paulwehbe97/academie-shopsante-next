// lib/progress.ts
// === Contrat unique des statuts (source de vérité) ===
export type ProgressState = "not_started" | "in_progress" | "passed";
export type Progress = Record<string, ProgressState>;

// --- Synonymes tolérés en lecture (compat localStorage historique) ---
const STATE_ALIASES: Record<string, ProgressState> = {
  // anciens codes
  todo: "not_started",
  "not started": "not_started",
  "not_started": "not_started",

  "in progress": "in_progress",
  "in_progress": "in_progress",

  done: "passed",
  pass: "passed",
  passed: "passed",
  complete: "passed",
  completed: "passed",
};

// Normalise une valeur quelconque en ProgressState canonique
export function normalizeState(v: unknown): ProgressState {
  if (typeof v === "string") {
    const k = v.trim().toLowerCase();
    if (k in STATE_ALIASES) return STATE_ALIASES[k];
  }
  // Fallback : on considère non démarré
  return "not_started";
}

// Normalise un objet de progression lu du storage
export function normalizeProgress(input: Record<string, any> | null | undefined): Progress {
  const out: Progress = {};
  if (!input) return out;
  for (const [code, raw] of Object.entries(input)) {
    out[code] = normalizeState(raw);
  }
  return out;
}

// === Helpers de chapitrage ===
import { CHAPTERS } from "@/data/chapters";
import { slugify } from "@/lib/utils";

// Construit un code stable identique à la DB, ex: "1_vitamines"
export function moduleCode(
  chapter: number | string,
  subject: { id: string } | string
) {
  const ch = String(chapter);
  // Si on reçoit l'objet sujet → on prend son id; si c’est un titre string → on slugify
  const sid = typeof subject === "string" ? slugify(subject) : subject.id;
  return `${ch}_${sid}`;
}


export function codesForChapter(chNo: number) {
  const ch = CHAPTERS.find(c => c.no === chNo);
  if (!ch) return [] as string[];
  return ch.modules.map(m => moduleCode(chNo, m));
}

export function isChapterCompleted(chNo: number, progress: Progress) {
  const p = normalizeProgress(progress);
  const codes = codesForChapter(chNo);
  if (codes.length === 0) return false;
  return codes.every(code => p[code] === "passed");
}

// Progression globale du niveau (N1 actuel)
export function computeLevelPct(progress: Progress) {
  const totalModules = CHAPTERS.reduce((n, c) => n + c.modules.length, 0);
  if (totalModules === 0) return { pct: 0, completed: 0, totalModules: 0 };

  const p = normalizeProgress(progress);
  let completed = 0;
  for (const ch of CHAPTERS) {
    for (const m of ch.modules) {
      const code = moduleCode(ch.no, m);
      if (p[code] === "passed") completed++;
    }
  }
  const pct = Math.round((completed / totalModules) * 100);
  return { pct, completed, totalModules };
}

// Progression d’un chapitre
export function computeChapterPct(chNo: number, progress: Progress) {
  const codes = codesForChapter(chNo);
  if (codes.length === 0) return { pct: 0, completed: 0, total: 0 };

  const p = normalizeProgress(progress);
  const completed = codes.filter(c => p[c] === "passed").length;
  const total = codes.length;
  const pct = Math.round((completed / total) * 100);
  return { pct, completed, total };
}

// === Règle d’unlock (pré-requis) — conservée et fiabilisée ===
export function isUnlocked(
  code: string,
  prereqs: Record<string, string[]>,
  progress: Progress
) {
  const needs = prereqs[code] ?? [];
  const p = normalizeProgress(progress);
  return needs.every(c => p[c] === "passed");
}

export function computeSubjectPct(levelKey: string, chapterId: string, subjectId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const store = JSON.parse(localStorage.getItem("academy-progress") || "{}");
    const v = store?.[levelKey]?.[chapterId]?.[subjectId]?.pct;
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
  } catch {
    return 0;
  }
}
