// lib/progressLocal.ts
// Mini-état local pour simuler la progression :
// - watched: bool (vidéo visionnée)
// - attemptsSinceWatch: nb d'essais depuis le dernier "watch"
// - pct: % de réussite du sujet (0..100)

export type LevelKey = "Niveau 1" | "Niveau 2" | "Niveau 3" | "Niveau 4" | "Nos Fournisseurs";

type SubjectState = {
  watched: boolean;
  attemptsSinceWatch: number;
  pct: number;
};

type StoreShape = {
  [level in LevelKey]?: {
    [chapterId: string]: {
      [subjectId: string]: SubjectState;
    };
  };
};

const KEY = "academy-progress";

function readStore(): StoreShape {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoreShape;
  } catch {
    return {};
  }
}

function writeStore(store: StoreShape) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {}
}

function getOrInit(state?: SubjectState): SubjectState {
  return state ?? { watched: false, attemptsSinceWatch: 0, pct: 0 };
}

export function getSubjectState(level: LevelKey, chapterId: string, subjectId: string): SubjectState {
  const store = readStore();
  const s = store?.[level]?.[chapterId]?.[subjectId];
  return getOrInit(s);
}

export function markWatched(level: LevelKey, chapterId: string, subjectId: string) {
  const store = readStore();
  store[level] = store[level] || {};
  store[level]![chapterId] = store[level]![chapterId] || {};
  const prev = getOrInit(store[level]![chapterId]![subjectId]);
  // On marque comme vu et on remet à 0 les essais depuis visionnage
  store[level]![chapterId]![subjectId] = { ...prev, watched: true, attemptsSinceWatch: 0 };
  writeStore(store);
}

export function recordQuizResult(level: LevelKey, chapterId: string, subjectId: string, scorePct: number) {
  const store = readStore();
  store[level] = store[level] || {};
  store[level]![chapterId] = store[level]![chapterId] || {};
  const prev = getOrInit(store[level]![chapterId]![subjectId]);

  const pass = scorePct >= 90;
  const pct = Math.max(0, Math.min(100, Math.round(scorePct)));

  // Si réussite: on met le pct (souvent 100) et on reset les essais since watch
  // Si échec: on incrémente attemptsSinceWatch
  store[level]![chapterId]![subjectId] = pass
    ? { ...prev, pct, attemptsSinceWatch: 0 } // réussite remet à 0 (prochain cycle)
    : { ...prev, pct, attemptsSinceWatch: (prev.attemptsSinceWatch || 0) + 1 };

  writeStore(store);
}

/** Règle: pour pouvoir passer le quiz, il faut:
 *  - avoir "watched" (vidéo visionnée)
 *  - ET (soit réussite déjà obtenue, soit attemptsSinceWatch < 2)
 *  - si 2 échecs consécutifs depuis le dernier "watch", il faut rewatch
 */
export function canTakeQuiz(level: LevelKey, chapterId: string, subjectId: string) {
  const s = getSubjectState(level, chapterId, subjectId);
  if (!s.watched) return { ok: false, reason: "need_watch" };
  if (s.pct >= 90) return { ok: true, reason: "already_passed" }; // on autorise repasser si tu veux, mais c’est déjà validé
  if (s.attemptsSinceWatch >= 2) return { ok: false, reason: "need_rewatch" };
  return { ok: true, reason: "can_try" };
}
// --- AJOUT : helper générique pour écrire l'état d'un sujet dans le localStorage ---
export function setSubjectState(
  levelKey: string,
  chapterId: string,
  subjectId: string,
  patch: { watched?: boolean; attemptsSinceWatch?: number; pct?: number }
) {
  if (typeof window === "undefined") return;

  try {
    const key = "academy-progress";
    const raw = localStorage.getItem(key);
    const data: any = raw ? JSON.parse(raw) : {};

    // structure: data[levelKey][chapterId][subjectId] = { watched, attemptsSinceWatch, pct }
    if (!data[levelKey]) data[levelKey] = {};
    if (!data[levelKey][chapterId]) data[levelKey][chapterId] = {};
    if (!data[levelKey][chapterId][subjectId]) {
      data[levelKey][chapterId][subjectId] = { watched: false, attemptsSinceWatch: 0, pct: 0 };
    }

    const cur = data[levelKey][chapterId][subjectId];
    const next = {
      watched: typeof patch.watched === "boolean" ? patch.watched : !!cur.watched,
      attemptsSinceWatch:
        typeof patch.attemptsSinceWatch === "number" ? Math.max(0, Math.floor(patch.attemptsSinceWatch)) : (cur.attemptsSinceWatch ?? 0),
      pct: typeof patch.pct === "number" ? Math.max(0, Math.min(100, Math.floor(patch.pct))) : (cur.pct ?? 0),
    };

    data[levelKey][chapterId][subjectId] = next;
    localStorage.setItem(key, JSON.stringify(data));
    return next;
  } catch {
    // silencieux
    return;
  }
}
