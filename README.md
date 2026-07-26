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
- Node.js 24
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
Source de vérité unique : [`src/config/env.ts`](src/config/env.ts), validée par Zod,
gelée, marquée `server-only` (aucune fuite possible vers le navigateur). Aucun secret
n'a de valeur de repli en production : son absence **interrompt le démarrage**.

Modèle complet et commenté dans [`.env.example`](.env.example). Variables serveur
principales (jamais préfixées `NEXT_PUBLIC_`) :
- `DATABASE_URL` — requise. `sslmode=require` exigé en production.
- `MIGRATION_DATABASE_URL` — compte de migration (droits DDL distincts).
- `TEST_DATABASE_URL` — base isolée pour les tests d'intégration (hôte local).
- `SESSION_SECRET`, `IP_HASH_SALT` — 32 caractères minimum.
- `APP_ORIGIN` — origine canonique des liens transactionnels.
- `TURNSTILE_SECRET_KEY`, `UPSTASH_REDIS_REST_URL` / `_TOKEN` — anti-automate et débit.

`npm run env:check` valide présence et format **sans jamais afficher une valeur**.

## 📜 Scripts disponibles
- `npm run dev` / `build` / `start` : cycle de vie de l'application.
- `npm run validate` : suite complète (typecheck, lint strict, taille, tests, build).
- `npm run env:check` : diagnostic de configuration (aucun secret affiché).
- `npm run db:check` : connexion PostgreSQL par un vrai `SELECT 1`, message normalisé.
- `npm run db:generate` / `db:migrate` / `db:push` : migrations Drizzle.
- `npm run db:seed` : jeu de démonstration (refusé en production).

## 💾 Base de données
**PostgreSQL** via **Drizzle ORM** (pilote `postgres.js`). Client canonique unique
dans [`src/db/client.ts`](src/db/client.ts) : `server-only`, pool borné, singleton
résistant au Hot Reload en développement, aucune connexion à l'import.

### Prérequis et mise en place locale
- PostgreSQL 14 ou supérieur (image `postgres:16` en CI).
- Créer une base locale, renseigner `DATABASE_URL` dans `.env`.
- `npm run db:migrate` applique les migrations ; `npm run db:check` vérifie l'accès.

### SSL
Piloté par `sslmode` dans l'URL, seule source de vérité. `sslmode=require` (ou
`verify-full`) est **obligatoire en production** — la validation d'environnement
refuse une URL de production sans lui. En local, SSL est optionnel.

### Dépannage — codes d'erreur PostgreSQL
| Code | Signification |
| :--- | :--- |
| `ECONNREFUSED` | PostgreSQL n'est pas lancé, ou le port est incorrect. |
| `28P01` | Nom d'utilisateur ou mot de passe incorrect. |
| `3D000` | La base configurée n'existe pas. |
| `42P01` | Table absente : migrations non appliquées (`npm run db:migrate`). |
| `ENOTFOUND` | Nom d'hôte incorrect ou non résolu. |
| `ETIMEDOUT` | Serveur injoignable, ou un pare-feu bloque la connexion. |

Ces codes sont normalisés en messages clairs par `db:check` et `/api/health`, sans
jamais divulguer d'URL, d'hôte, d'utilisateur ni de trace.

### Tests et production
Les tests unitaires (Vitest) ne touchent **aucune** base réelle. En mode `test`, une
`DATABASE_URL` non locale est refusée : fournir `TEST_DATABASE_URL` vers une base
isolée. La CI lance un service `postgres:16` éphémère et exerce le `SELECT 1` réel.

## 🧪 Tests
La suite **Vitest** compte 152 tests couvrant la logique métier, la sécurité, et les contrôles d'accès.
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
