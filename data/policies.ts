// data/policies.ts
export type PolicyDoc = {
  id: string;
  title: string;
  filename: string; // dans /public/policies/*
  category?: string;
  updatedAt?: string; // yyyy-mm-dd (affichage facultatif)
};

export const POLICY_DOCS: PolicyDoc[] = [
  { id: "code-conduite", title: "Code de conduite", filename: "code-de-conduite.pdf", category: "Politique", updatedAt: "2025-01-01" },
  { id: "confidentialite", title: "Politique de confidentialité", filename: "politique-confidentialite.pdf", category: "Politique", updatedAt: "2025-01-01" },
  { id: "contrat-employe", title: "Contrat employé", filename: "contrat-employe.pdf", category: "Contrat" },
];
// ➜ Place ces PDFs dans: /public/policies/{filename}
