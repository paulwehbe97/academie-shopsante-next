// data/chapters.ts
export type Chapter = {
  no: number;
  title: string;
  mandatory?: boolean;   // true pour les chapitres 1 et 2
  modules: string[];
};

export const CHAPTERS: Chapter[] = [
  {
    no: 1, title: "Santé Générale", mandatory: true,
    modules: ["Vitamines", "Minéraux", "Produits lipidiques", "Protéines", "Collagène"]
  },
  {
    no: 2, title: "Santé Digestive", mandatory: true,
    modules: ["Greens", "Glutamine", "Fibres", "Probiotiques", "Enzymes digestives"]
  },
  {
    no: 3, title: "Performances Sportives",
    modules: ["BCAA", "EAA", "Électrolytes", "Créatine", "Glucides", "Mass Gainers"]
  },
  {
    no: 4, title: "Fat Burner et Pré-Workout",
    modules: ["Fat Burner", "Pré-Workout"]
  },
  {
    no: 5, title: "Suppléments Cognitifs",
    modules: ["Les Neurotransmetteurs", "Dopamine", "Sérotonine", "Acétylcholine"]
  },
  {
    no: 6, title: "Stress et Sommeil",
    modules: ["Optimisation du Sommeil", "Gestion du Stress"]
  },
  {
    no: 7, title: "Gestion Hormonale",
    modules: ["Les Hormones", "Oestrogène", "Testostérone", "Glande Thyroïde"]
  },
  {
    no: 8, title: "Suppléments Spécifiques",
    modules: ["Régulateurs de Glycémie", "Détoxifiants pour le Foie"]
  },
];
