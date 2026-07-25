**Langues :** Français | [English](README.en.md)

# Zlobodan Couverture SRL — Plateforme Web & Espace Client Belgique

> Site vitrine et portail client d'une entreprise de couverture-zinguerie belge
> (Bruxelles, Brabant wallon, Wallonie). Demande de devis en ligne, espace
> client (devis, factures, chantiers, documents) et back-office de gestion.

![Statut](https://img.shields.io/badge/statut-développement-orange)
![Accès](https://img.shields.io/badge/dépôt-privé-red)
![Next.js](https://img.shields.io/badge/Next.js-14.2.35-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4.5-blue)

---

## Stack technique

| Domaine | Choix |
| :--- | :--- |
| Framework | Next.js 14 (App Router), React 18 |
| Langage | TypeScript strict |
| Style | Tailwind CSS |
| Base de données | PostgreSQL via Drizzle ORM (pilote `postgres.js`) |
| Validation | Zod |
| Authentification | Sessions en base, bcrypt coût 12, TOTP |
| Anti-automate | Cloudflare Turnstile |
| Limitation de débit | Upstash Redis (API REST) |
| Cartographie | Leaflet, auto-hébergé |
| Tests | Vitest |

---

## Prérequis

- Node.js 20 ou supérieur
- PostgreSQL 14 ou supérieur
- npm 10 ou supérieur

---

## Installation

```bash
npm ci                  # installation reproductible depuis le lockfile
cp .env.example .env    # puis renseigner les variables (voir ci-dessous)
npm run db:generate     # génère les migrations depuis le schéma
npm run db:push         # applique le schéma à la base
npm run dev             # http://localhost:3000
```

> `npm ci` et jamais `npm install` en intégration : l'installation doit
> reproduire le lockfile à l'identique. Les scripts `postinstall` sont
> désactivés via `.npmrc` (`ignore-scripts=true`) — ils sont le principal
> vecteur de compromission de la chaîne npm.

---

## Variables d'environnement

Aucun secret n'a de valeur de repli : leur absence **interrompt le démarrage**
en production (`src/lib/security/env.ts`). Modèle complet dans `.env.example`.

| Variable | Rôle | Requise en production |
| :--- | :--- | :---: |
| `DATABASE_URL` | Connexion applicative, `sslmode=require` exigé | oui |
| `MIGRATION_DATABASE_URL` | Compte de migration, privilèges distincts | recommandé |
| `SESSION_SECRET` | Signature de session, 32 caractères minimum | oui |
| `IP_HASH_SALT` | Sel HMAC d'anonymisation des IP, 32 caractères minimum | oui |
| `TURNSTILE_SECRET_KEY` | Anti-automate. La clé de test Cloudflare est refusée | oui |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Clé publique du widget | oui |
| `APP_ORIGIN` | Origine canonique. Les liens transactionnels n'utilisent **jamais** l'en-tête `Host` | oui |
| `TRUSTED_PROXY` | `cloudflare` pour lire `CF-Connecting-IP` | oui |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Limitation de débit partagée entre instances | oui |
| `SMTP_*` | Envoi d'emails — **transport non branché à ce jour** | non |

---

## Commandes

| Commande | Effet |
| :--- | :--- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm start` | Sert le build |
| `npm run lint` | ESLint — zéro avertissement toléré en CI |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Suite Vitest |
| `npm run test:watch` | Vitest en continu |
| `npm run check:bundle` | Vérifie qu'aucun secret n'a fui dans le bundle client |
| `npm run check:size` | Contrôle la limite de 400 lignes par fichier |
| `npm run db:generate` | Génère une migration depuis le schéma |
| `npm run db:migrate` | Applique les migrations |
| `npm run db:push` | Synchronise le schéma (développement) |
| `npm run db:seed` | Jeu de données de démonstration |

---

## Architecture

```text
src/
├── app/               Routes, layouts et handlers d'API (App Router)
│   ├── api/           Points d'entrée serveur
│   ├── admin/         Back-office (rôles staff et admin)
│   ├── mon-compte/    Espace client authentifié
│   └── [slug]/        Pages communes générées depuis les données villes
│
├── components/        Composants React, groupés par fonctionnalité
│   ├── devis/         Assistant de demande de devis (wizard + étapes)
│   ├── home/          Sections de la page d'accueil
│   ├── layout/        En-tête, pied de page, bandeaux
│   ├── realisations/  Comparateur avant/après
│   ├── reviews/       Avis clients
│   └── seo/           Données structurées JSON-LD
│
├── config/            Configuration du site (raison sociale, coordonnées)
├── data/              Contenu statique (services, réalisations, villes, FAQ)
├── domain/            Règles métier : montants, machine à états, options de devis
│
├── db/                Schéma Drizzle, migrations, client
├── lib/               Modules techniques
│   ├── auth/          Mots de passe, sessions, TOTP, jetons
│   ├── db/            Dépôts, tri par liste blanche, numérotation
│   ├── media/         Compression d'images
│   ├── security/      Gardes, CSP, CSRF, cache, débit, journal de sécurité
│   ├── services/      Orchestration (authentification, PDF, notifications)
│   └── validations/   Schémas Zod et normalisation
│
└── __tests__/         Tests unitaires et de sécurité
```

### Responsabilité des dossiers

- **`app/`** — uniquement des routes et ce qui leur est strictement propre.
  Aucun composant réutilisable n'y vit.
- **`config/`** — valeurs de configuration non sensibles. Jamais de secret.
- **`data/`** — contenu éditorial structuré, sans logique.
- **`domain/`** — règles métier indépendantes de React et du réseau : calcul de
  TVA, transitions d'état, vocabulaire des formulaires. C'est la **source de
  vérité** partagée entre l'interface et la validation serveur ; c'est ce qui
  empêche l'écran et le serveur de diverger.
- **`lib/`** — modules techniques. Ne contient aucune règle métier.
- **`components/`** — regroupés par fonctionnalité plutôt que par type.

---

## Conventions

- **Composants React** : `PascalCase.tsx` — `QuoteWizard.tsx`
- **Hooks** : `useSomething.ts` — `useQuoteWizard.ts`
- **Modules TypeScript** : `kebab-case.ts` — `rate-limiter.ts`, `quote-options.ts`
- **Imports** : alias `@/` vers `src/`, jamais de `../../../`
- **400 lignes maximum par fichier**, imposé par la règle ESLint `max-lines`
- **Pas de SQL brut** : `db.execute` et `sql.raw` sont bloqués par ESLint.
  L'unique exception, documentée et justifiée, vit dans
  `src/lib/db/raw-queries.ts`.

---

## Sécurité

Les contrôles d'accès vivent dans les layouts et les handlers, **jamais dans le
middleware** : CVE-2025-29927 permet de neutraliser son exécution par un
en-tête forgé.

- [`SECURITY.md`](SECURITY.md) — mesures en place, risques résiduels assumés,
  plan de réponse à incident
- [`docs/runbook-infrastructure.md`](docs/runbook-infrastructure.md) —
  Cloudflare, pare-feu, TLS, rôles PostgreSQL, supervision
- [`docs/audits/`](docs/audits/) — rapports d'audit et corrections appliquées

---

## Tests

```bash
npm test
```

La suite couvre le contrôle d'accès horizontal et vertical, les charges
d'injection classiques, la pollution de prototype, la SSRF, les en-têtes CSP,
les règles métier (montants, transitions d'état) et le contrat entre le
formulaire de devis et sa validation serveur.
