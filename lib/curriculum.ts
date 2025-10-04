// lib/curriculum.ts

export type LevelKey =
  | "Niveau 1"
  | "Niveau 2"
  | "Niveau 3"
  | "Niveau 4"
  | "Nos Fournisseurs";

export interface Subject {
  /** Identifiant court et stable (kebab/snake) */
  id: string;
  /** Libellé affiché (avec accents) */
  title: string;
  /** Durée (min). Recommandé ≤ 10 min. Optionnel. */
  minutes?: number;
  /** URL/ID vidéo (optionnel) – tu pourras remplir plus tard */
  videoUrl?: string | null;
  /** ID/slug du quiz – temporairement, on pointe tous vers le quiz “Vitamines” */
  quizId?: string | null;
}

export interface Chapter {
  id: string; // "1".."8"
  title: string;
  /** Chapitres obligatoires (débloquer la suite) */
  mandatory?: boolean;
  subjects: Subject[];
}

export interface Level {
  key: LevelKey;
  chapters: Chapter[];
}

/** Slug de quiz par défaut pour simuler la progression tant que les quiz ne sont pas prêts */
export const DEFAULT_QUIZ_ID = "vitamines";

/** Données de référence — Niveau 1 tel que fourni par Paul */
export const LEVELS: Record<LevelKey, Level> = {
  "Niveau 1": {
    key: "Niveau 1",
    chapters: [
      {
        id: "1",
        title: "Santé générale",
        mandatory: true,
        subjects: [
          { id: "vitamine", title: "Vitamine", quizId: DEFAULT_QUIZ_ID },
          { id: "mineraux", title: "Minéraux", quizId: DEFAULT_QUIZ_ID },
          { id: "produits-lipidiques", title: "Produits Lipidiques", quizId: DEFAULT_QUIZ_ID },
          { id: "proteines", title: "Protéines", quizId: DEFAULT_QUIZ_ID },
          { id: "collagene", title: "Collagène", quizId: DEFAULT_QUIZ_ID },
        ],
      },
      {
        id: "2",
        title: "Santé Digestive",
        mandatory: true,
        subjects: [
          { id: "greens", title: "Greens", quizId: DEFAULT_QUIZ_ID },
          { id: "glutamine", title: "Glutamine", quizId: DEFAULT_QUIZ_ID },
          { id: "fibres", title: "Fibres", quizId: DEFAULT_QUIZ_ID },
          { id: "probiotiques", title: "Probiotiques", quizId: DEFAULT_QUIZ_ID },
          { id: "enzymes-digestives", title: "Enzymes Digestives", quizId: DEFAULT_QUIZ_ID },
        ],
      },
      {
        id: "3",
        title: "Performances Sportives",
        subjects: [
          { id: "bcaa", title: "BCAA", quizId: DEFAULT_QUIZ_ID },
          { id: "eaa", title: "EAA", quizId: DEFAULT_QUIZ_ID },
          { id: "electrolytes", title: "Électrolytes", quizId: DEFAULT_QUIZ_ID },
          { id: "creatine", title: "Créatine", quizId: DEFAULT_QUIZ_ID },
          { id: "glucides", title: "Glucides", quizId: DEFAULT_QUIZ_ID },
          { id: "mass-gainers", title: "Mass Gainers", quizId: DEFAULT_QUIZ_ID },
        ],
      },
      {
        id: "4",
        title: "Fat Burner et Pré-Workout",
        subjects: [
          { id: "fat-burner", title: "Fat Burner", quizId: DEFAULT_QUIZ_ID },
          { id: "pre-workout", title: "Pré-Workout", quizId: DEFAULT_QUIZ_ID },
        ],
      },
      {
        id: "5",
        title: "Suppléments Cognitifs",
        subjects: [
          { id: "neurotransmetteurs", title: "Les Neurotransmetteurs", quizId: DEFAULT_QUIZ_ID },
          { id: "dopamine", title: "Dopamine", quizId: DEFAULT_QUIZ_ID },
          { id: "serotonine", title: "Sérotonine", quizId: DEFAULT_QUIZ_ID },
          { id: "acetylcholine", title: "Acétylcholine", quizId: DEFAULT_QUIZ_ID },
        ],
      },
      {
        id: "6",
        title: "Stress et Sommeil",
        subjects: [
          { id: "sommeil", title: "Optimisation du Sommeil", quizId: DEFAULT_QUIZ_ID },
          { id: "stress", title: "Gestion du Stress", quizId: DEFAULT_QUIZ_ID },
        ],
      },
      {
        id: "7",
        title: "Gestion Hormonale",
        subjects: [
          { id: "hormones", title: "Les Hormones", quizId: DEFAULT_QUIZ_ID },
          { id: "oestrogene", title: "Oestrogène", quizId: DEFAULT_QUIZ_ID },
          { id: "testosterone", title: "Testostérone", quizId: DEFAULT_QUIZ_ID },
          { id: "thyroide", title: "Glande Thyroïde", quizId: DEFAULT_QUIZ_ID },
        ],
      },
      {
        id: "8",
        title: "Suppléments Spécifiques",
        subjects: [
          { id: "glycemie", title: "Régulateur de Glycémie", quizId: DEFAULT_QUIZ_ID },
          { id: "foie", title: "Détoxifiants pour le Foie", quizId: DEFAULT_QUIZ_ID },
        ],
      },
    ],
  },

  // Les autres niveaux restent placeholders pour le moment
  "Niveau 2": { key: "Niveau 2", chapters: [] },
  "Niveau 3": { key: "Niveau 3", chapters: [] },
  "Niveau 4": { key: "Niveau 4", chapters: [] },
  "Nos Fournisseurs": { key: "Nos Fournisseurs", chapters: [] },
};
