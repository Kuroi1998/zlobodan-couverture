# Zlobodan Couverture

Plateforme web professionnelle dédiée à la présentation des services de couverture, à la demande de devis et au suivi des clients et des chantiers.

Français | [English version](docs/en/README.md)

<!-- ![Bannière Zlobodan Couverture](docs/assets/github-banner.webp) -->

![Statut](https://img.shields.io/badge/statut-production_ready-green)
![Accès](https://img.shields.io/badge/dépôt-privé-red)
![Next.js](https://img.shields.io/badge/Next.js-14.2.35-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4.5-blue)

---

## 📖 Présentation du Projet
Zlobodan Couverture est une application Next.js monolithique offrant à la fois une vitrine commerciale, un espace client sécurisé pour le suivi des chantiers et des devis, ainsi qu'un back-office complet pour l'administration de l'entreprise.

## 🚀 Fonctionnalités
- **Vitrine** : Présentation des services (réfection, démoussage, etc.) et réalisations.
- **Génération de devis** : Assistant interactif (wizard) pour la demande de devis.
- **Espace Client** : Acceptation/refus de devis, suivi des factures et progression de chantier.
- **Back-Office** : Gestion des clients, génération de devis PDF, et journal d'audit de sécurité.

## 📸 Captures d'écran récentes

*(Le dossier `docs/screenshots/` est prêt à accueillir les captures optimisées au format WebP)*

## 🛠 Technologies réellement utilisées
| Domaine | Technologie |
| :--- | :--- |
| Framework | Next.js 14 (App Router), React 18 |
| Langage | TypeScript (Strict Mode) |
| Style | Tailwind CSS |
| Base de données | PostgreSQL via Drizzle ORM |
| Validation | Zod |
| Authentification | Sessions persistantes, bcrypt, TOTP 2FA |
| Anti-automate | Cloudflare Turnstile |
| Rate Limiting | Upstash Redis |

## 🏗 Architecture actuelle
Le dépôt suit une architecture modulaire :
- `src/app/` : Routes App Router, layouts, et points d'API.
- `src/components/` : Composants UI isolés par domaine métier.
- `src/domain/` : Cœur de la logique métier (calculs, états).
- `src/db/` : Schémas Drizzle et migrations.
- `src/lib/` : Modules techniques (sécurité, authentification).
- `docs/` : Documentation (architecture, audits, versions localisées).

## 📋 Prérequis
- Node.js 20+
- PostgreSQL 14+
- npm 10+

## ⚙️ Installation
```bash
npm ci                  # installation reproductible depuis le lockfile
cp .env.example .env    # puis renseigner les variables
npm run db:generate     # génère les migrations
npm run db:push         # synchronise la base
npm run dev             # lance l'application sur localhost:3000
```

## 🔐 Variables d'environnement
Un fichier `.env.example` est fourni à la racine. Aucun secret ne possède de valeur de repli dans le code.
Principales variables :
- `DATABASE_URL` (requise)
- `SESSION_SECRET` (requise, 32+ caractères)
- `TURNSTILE_SECRET_KEY` (requise)
- `UPSTASH_REDIS_REST_URL` (requise)

## 📜 Scripts disponibles
- `npm run dev` : Lancement en développement.
- `npm run build` : Compilation Next.js.
- `npm run validate` : Suite complète (Lint, Typecheck, Tests, Build).
- `npm run check:size` : Validation < 400 lignes.
- `npm run db:seed` : Remplissage avec jeu d'essai.

## 💾 Base de données
Utilisation de **PostgreSQL** gérée par **Drizzle ORM**. Le schéma est strictement typé. L'historique d'audit est en append-only pour des raisons de traçabilité.

## 🧪 Tests
La suite **Vitest** compte 105 tests fonctionnels couvrant la logique métier, la sécurité, et les contrôles d'accès.
```bash
npm run test
```

## 🛡 Sécurité
Le projet implémente les recommandations OWASP Top 10 : protection CSRF, CSP stricte, mots de passe hashés avec bcrypt (coût 12), et journalisation d'audit inaltérable. Voir `SECURITY.md`.

## 🚢 Déploiement
L'application est conçue pour un déploiement Vercel ou conteneurisé. Un proxy de confiance Cloudflare est requis en amont.

## 🤝 Contribution
Veuillez vous référer au fichier `CONTRIBUTING.md` pour les normes de commit (Conventional Commits) et le flux de pull requests.

## ⚖️ Confidentialité et Droits
Dépôt **privé**. Code source et ressources propriété exclusive de Zlobodan Couverture. Toute diffusion non autorisée est strictement interdite.
