
# Académie Shop Santé — Prototype Next.js (VS Code)

Ce projet contient l'aperçu de la plateforme (Niveau 1) prêt à ouvrir dans VS Code.

## Démarrage rapide
1. Installer **Node.js LTS** (18+ recommandé).
2. Ouvrir ce dossier dans **VS Code**.
3. Dans le terminal :

```bash
npm install
npm run dev
```

4. Ouvrir http://localhost:3000

## Où modifier ?
- **data/chapters.ts** : titres de chapitres et modules
- **data/quizzes/vitamines.ts** : contenu du quiz Vitamines (N1)
- **config/rules.ts** : règles globales des quiz (≥90%, tentatives, etc.)
- **app/page.tsx** : composants d'interface (Login, Parcours, Module, Quiz, etc.)

## Étapes suivantes (architecture)
- Séparer en composants (`components/`), puis introduire une API (Next.js routes) + base de données.
- Intégrer l'auth (email + mot de passe), rôles, invitations, stockage vidéos.

