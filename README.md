# Zlobodan Couverture

Application web de captation et de qualification de demandes de devis pour une
entreprise de couverture : vitrine publique, portail client sécurisé et
back-office de traitement.

**Objectif principal** — permettre à un visiteur de décrire son besoin de
toiture, de créer un compte, de déposer une demande documentée (photos
comprises), puis à l'entreprise de la qualifier et d'en figer un récapitulatif
PDF.

**Public visé** — les clients particuliers de l'entreprise d'une part, ses
gestionnaires internes (rôles `admin` et `staff`) d'autre part.

**État du développement** — la V1 est fonctionnelle et testée. Le périmètre
exact, y compris ce qui en est volontairement exclu, est arrêté dans
[docs/product/perimetre-v1.md](docs/product/perimetre-v1.md). Le déploiement
n'est pas encore configuré (voir [Déploiement](#14-déploiement)).

---

## 1. Fonctionnalités

Les fonctions ci-dessous sont présentes dans le code et couvertes par des
tests. Rien n'est annoncé par anticipation.

- **Vitrine publique** — pages de services, FAQ, carte des zones desservies,
  mentions légales et politique de confidentialité.
- **Formulaire de contact persistant** — référence `CNT-AAAA-NNNNNN`,
  idempotence, recueil du consentement, historique et notifications
  asynchrones.
- **Assistant de devis en cinq étapes** — référence `DEV-AAAA-NNNNNN`,
  brouillon serveur pour les comptes connectés, rattachement au compte et
  pièces jointes privées.
- **Cycle de vie complet des comptes** — inscription et vérification
  d'adresse, mot de passe oublié, changement de mot de passe, changement
  d'adresse confirmé par jeton, sessions et appareils révocables.
- **Double authentification** — TOTP (RFC 6238) et codes de récupération à
  usage unique.
- **Portail client** — suivi des demandes, détail par référence, annulation
  contrôlée par une machine à états, modification du profil, fermeture des
  autres sessions. Alimenté exclusivement par PostgreSQL et strictement limité
  au propriétaire de chaque ressource.
- **Back-office** — protégé par rôle et TOTP : recherche, filtres, pagination,
  transitions de statut auditées, affectation, notes internes historisées avec
  leur auteur.
- **Administration des comptes** — statut, sessions, événements de sécurité et
  déclenchement du flux normal de réinitialisation, sans jamais accéder aux
  secrets.
- **Génération documentaire** — récapitulatif PDF non modifiable produit par
  `pdf-lib`, versionné et servi derrière une garde d'autorisation.
- **Export RGPD** — export JSON des données personnelles, sans secrets, notes
  internes, adresses IP ni chemins de stockage.
- **Outbox SMTP durable** — reprise des traitements interrompus et cinq
  tentatives à délai exponentiel.

### Hors périmètre V1

Devis commerciaux chiffrés, factures, avoirs et suivi de chantiers possèdent un
schéma en base mais **aucun chemin de création**. Ils sont reportés, pas
annulés. Détail dans [docs/functional-scope.md](docs/functional-scope.md) et
[docs/delivery-roadmap.md](docs/delivery-roadmap.md).

---

## 2. Captures et démonstration

Aucune capture d'écran, aucun GIF de démonstration et aucun environnement de
préversion ne sont publiés à ce jour. Cette section sera complétée lorsqu'un
environnement de démonstration existera.

---

## 3. Technologies

Chaque ligne correspond à une dépendance réellement déclarée dans
[`package.json`](package.json).

| Domaine | Technologie |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Bibliothèque UI | React 18 |
| Langage | TypeScript en mode `strict` |
| Styles | Tailwind CSS 3, PostCSS, Autoprefixer |
| Base de données | PostgreSQL, Drizzle ORM et Drizzle Kit |
| Validation | Zod, côté navigateur et serveur |
| Authentification | Sessions opaques, bcrypt, TOTP RFC 6238, QR Code |
| Sécurité publique | CSRF, CSP à nonce, honeypot, limitation de débit, Cloudflare Turnstile |
| Fichiers | Sharp (traitement d'image), stockage local privé ou S3 (`@aws-sdk/client-s3`) |
| Documents | `pdf-lib` |
| Courriel | Nodemailer avec outbox en base |
| Tests | Vitest (unitaires et intégration), Playwright Chromium (E2E) |
| Qualité | ESLint 9, `tsc --noEmit`, limite de 400 lignes par fichier source |
| Sécurité CI | CodeQL, Gitleaks, Semgrep, `npm audit` |
| Déploiement | Non configuré |

---

## 4. Prérequis

| Élément | Version requise | Vérification |
| --- | --- | --- |
| Node.js | `>=24 <25` | `node --version` |
| npm | `>=11.10 <12` | `npm --version` |
| PostgreSQL | 14 ou supérieur (18 en intégration continue) | `psql --version` |

Un serveur SMTP est nécessaire pour l'expédition des courriels. En
développement, [Mailpit](https://mailpit.axllent.org/) suffit et c'est ce
qu'utilise l'intégration continue.

Les versions de Node et npm sont contraintes par le champ `engines` de
`package.json` : une version hors plage fait échouer `npm ci`.

---

## 5. Installation

```bash
git clone https://github.com/Kuroi1998/zlobodan-couverture.git
```

```bash
cd zlobodan-couverture
```

```bash
npm ci
```

`npm ci` et non `npm install` : l'installation doit reproduire
`package-lock.json` à l'identique.

---

## 6. Configuration

### 6.1 Fichier d'environnement

Copier le modèle, puis renseigner les valeurs réelles :

```bash
cp .env.example .env.local
```

Sous Windows (PowerShell) :

```bash
Copy-Item .env.example .env.local
```

`.env.local` est ignoré par Git et ne doit **jamais** être versionné. Chaque
variable est documentée dans [`.env.example`](.env.example).

Variables obligatoires : `DATABASE_URL`, `SESSION_SECRET`, `IP_HASH_SALT`,
`TWO_FACTOR_ENCRYPTION_KEY`, `SESSION_COOKIE_NAME`, `APP_ORIGIN` et les
paramètres `SMTP_*`. `NOTIFICATION_ADMIN_EMAIL` devient obligatoire en
production.

Variables facultatives : `MIGRATION_DATABASE_URL` (compte DDL distinct,
recommandé), les deux clés Turnstile, les deux valeurs Upstash (requises en
multi-instance), et les paramètres `S3_*` (requis lorsque
`UPLOAD_STORAGE_DRIVER=s3`).

Générer un secret de 32 caractères minimum :

```bash
openssl rand -base64 48
```

### 6.2 Vérification de la configuration

```bash
npm run env:check
```

Cette commande valide la présence et la forme des variables sans jamais
afficher de valeur secrète.

### 6.3 Base de données

Appliquer les migrations versionnées :

```bash
npm run db:migrate
```

Vérifier la connexion et l'état du schéma :

```bash
npm run db:check
```

`db:migrate` est la commande normale. `db:push` reste un outil de
développement et ne remplace pas les migrations versionnées.

### 6.4 Jeu de données de recette (facultatif)

```bash
npm run db:seed
```

Le script refuse de s'exécuter en production et exige `SEED_PASSWORD`
(12 caractères minimum). Aucun mot de passe par défaut n'est fourni.

---

## 7. Lancement

```bash
npm run dev
```

L'application est alors disponible sur `http://localhost:3000`.

Build et démarrage en mode production :

```bash
npm run build
```

```bash
npm run start
```

---

## 8. Tests et qualité

```bash
npm run typecheck
```

```bash
npm run lint:strict
```

```bash
npm run test
```

```bash
npm run build
```

Chaîne complète en une commande :

```bash
npm run validate
```

Les suites d'intégration et E2E exigent PostgreSQL. Leurs lanceurs refusent
tout hôte de base distant et tout nom de base ne se terminant pas par `_test` :
elles ne recréent que des bases jetables.

```bash
npm run validate:full
```

> Il n'existe pas de script `format` : le formatage est assuré par les règles
> ESLint et par [`.editorconfig`](.editorconfig).

---

## 9. Structure du projet

```text
Zlobodan/
├── src/
│   ├── app/            Routes App Router : pages publiques, portail client,
│   │                   back-office et route handlers /api
│   ├── components/     Composants React, groupés par domaine
│   ├── config/         Environnement typé, identité d'entreprise, config site
│   ├── data/           Contenus éditoriaux statiques (services, FAQ, villes)
│   ├── db/             Schéma Drizzle, migrations versionnées, client, seed
│   ├── domain/         Règles métier pures (machine à états, montants, RGPD)
│   ├── lib/            Services applicatifs, sécurité, PDF, stockage, validation
│   └── proxy.ts        Middleware : en-têtes de sécurité et nonce CSP
├── test/
│   ├── unit/           Suites unitaires Vitest
│   ├── integration/    Suites Vitest sur PostgreSQL jetable
│   ├── e2e/            Parcours Playwright Chromium
│   ├── restart/        Preuve de persistance après redémarrage serveur
│   └── stubs/          Doublures de test (`server-only`)
├── scripts/            Migrations, vérifications, tâches planifiées
├── docs/               Documentation technique, audits et périmètre produit
├── storage/uploads/    Fichiers privés téléversés (vide sous Git)
└── .github/            Workflows, modèles d'issue et de pull request
```

---

## 10. Scripts disponibles

| Script | Commande | Rôle | Contexte |
| --- | --- | --- | --- |
| `dev` | `next dev` | Serveur de développement | Local |
| `build` | `next build` | Build serveur de production | Local, CI, déploiement |
| `start` | `next start` | Sert le build de production | Production |
| `lint` | `eslint .` | Analyse statique | Local |
| `lint:strict` | `eslint . --max-warnings 0` | Analyse statique bloquante | CI |
| `typecheck` | `tsc --noEmit` | Vérification des types | Local, CI |
| `check:size` | `node scripts/check-size.js` | Limite de 400 lignes par fichier | Local, CI |
| `check:bundle` | `node scripts/check-client-bundle.js` | Recherche de secrets dans le bundle client | CI, après `build` |
| `test` | `vitest run` | Tests unitaires | Local, CI |
| `test:watch` | `vitest` | Tests unitaires en continu | Local |
| `test:integration` | `node scripts/run-integration-tests.cjs` | Tests sur PostgreSQL jetable | Local, CI |
| `test:e2e` | `node scripts/run-e2e-tests.cjs` | Parcours Playwright Chromium | Local, CI |
| `test:restart` | `node scripts/run-restart-persistence-test.cjs` | Persistance après redémarrage | Local, CI |
| `validate` | chaîne typecheck → lint → size → test → build | Contrôle avant commit | Local |
| `validate:full` | `validate` + intégration + E2E | Contrôle avant pull request | Local |
| `env:check` | `scripts/check-environment.ts` | Validation de l'environnement | Local, CI, déploiement |
| `db:check` | `scripts/check-database.ts` | Vérification de la connexion PostgreSQL | Local, CI, déploiement |
| `db:migrate` | `scripts/migrate-database.ts` | Application des migrations | Local, CI, déploiement |
| `db:generate` | `drizzle-kit generate` | Génération d'une migration | Local |
| `db:push` | `drizzle-kit push` | Poussée directe du schéma | Développement seulement |
| `db:seed` | `src/db/seed.ts` | Jeu de recette | Développement et test |
| `notifications:dispatch` | `scripts/dispatch-notifications.ts` | Expédition de l'outbox SMTP | Planifié, chaque minute |
| `uploads:cleanup` | `scripts/cleanup-orphaned-uploads.ts` | Purge des fichiers orphelins | Planifié, quotidien |
| `drafts:cleanup` | `scripts/cleanup-expired-drafts.ts` | Purge des brouillons > 30 jours | Planifié, quotidien |
| `auth:rotate-encryption-key` | `scripts/rotate-auth-encryption-key.ts` | Rotation de la clé de chiffrement 2FA | Exceptionnel |

Les trois commandes de maintenance et la rotation de clé s'exécutent en
**simulation** par défaut. Ajouter `-- --apply` pour agir réellement :

```bash
npm run uploads:cleanup -- --apply
```

---

## 11. Exploitation

Après chaque déploiement :

```bash
npm ci && npm run env:check && npm run db:migrate && npm run db:check && npm run build && npm run start
```

Planifier `notifications:dispatch` toutes les minutes, `uploads:cleanup --
--apply` et `drafts:cleanup -- --apply` quotidiennement.

Sauvegarder PostgreSQL et activer le versioning et le cycle de vie du bucket S3
avant toute mise en production. Les migrations sont ascendantes : la
restauration d'une sauvegarde est la stratégie de retour arrière pour une
migration destructive.

---

## 12. Sécurité

- **Aucun secret dans Git.** `.env` et `.env.*` sont ignorés, à la seule
  exception de `.env.example`, qui ne contient que des valeurs fictives.
- **Aucun secret dans le bundle client.** `npm run check:bundle` recherche les
  secrets dans les artefacts produits ; seule la clé publique Turnstile est
  exposée via `NEXT_PUBLIC_*`.
- **Vérification continue.** CodeQL, Gitleaks (historique complet), Semgrep et
  `npm audit` s'exécutent en intégration continue, ainsi qu'une fois par
  semaine sur planification.
- **Chiffrement.** Les secrets TOTP sont chiffrés en AES-256-GCM avec données
  authentifiées associées ; les mots de passe utilisent bcrypt.
- **Confidentialité.** Les fichiers téléversés ne sont jamais placés dans
  `public/`, les listes ne divulguent aucun chemin de stockage et les
  téléchargements repassent toujours par une garde serveur.

Le stockage local est refusé au démarrage en production.

**Signalement d'une vulnérabilité** — la procédure complète est décrite dans
[SECURITY.md](SECURITY.md). Ne jamais ouvrir d'issue publique pour une faille.

---

## 13. Contribution

Résumé ; le détail est dans [CONTRIBUTING.md](CONTRIBUTING.md).

1. Créer une branche depuis `develop` : `feature/…`, `fix/…`, `refactor/…`,
   `docs/…`, `test/…` ou `chore/…`.
2. Respecter la convention Conventional Commits, en français :
   `type(périmètre): description`.
3. Exécuter `npm run validate` avant de pousser.
4. Ouvrir une pull request vers `develop` en complétant le modèle fourni.
5. Attendre que les workflows CI et CodeQL soient au vert, puis la relecture.

---

## 14. Déploiement

**Le déploiement n'est pas configuré.** Le dépôt ne contient aucune cible de
déploiement automatisée.

L'application exige un **serveur Node.js** : elle expose des route handlers, un
middleware, des pages dynamiques et une base PostgreSQL. Un hébergement
statique ne convient pas.

Le minimum à prévoir : un runtime Node 24, une base PostgreSQL 14+, un serveur
SMTP, un bucket S3 privé (`UPLOAD_STORAGE_DRIVER=s3`) et un planificateur pour
les trois tâches périodiques listées en section 11.

---

## 15. Feuille de route

| Étape | Statut |
| --- | --- |
| Suppression de compte conforme au RGPD (`PRIVACY-002`) | Planifié |
| Masquage des routes orphelines (factures, chantiers, devis commerciaux) | Planifié |
| Configuration d'une cible de déploiement | À étudier |
| Devis commerciaux chiffrés | À étudier |
| Facturation et avoirs | À étudier |
| Suivi de chantiers | À étudier |
| Messagerie interactive | À valider avec le client |

Ces éléments proviennent de
[docs/product/perimetre-v1.md](docs/product/perimetre-v1.md) et de
[docs/delivery-roadmap.md](docs/delivery-roadmap.md). Aucune date n'est
engagée.

---

## 16. Licence

Tous droits réservés. Aucune licence open source n'est actuellement accordée.

---

## 17. Auteur et maintenance

Dépôt maintenu par [`Kuroi1998`](https://github.com/Kuroi1998).

L'identité légale de l'entreprise éditrice (dénomination, numéro BCE, TVA,
adresse, assurance) est délibérément absente du code : ces champs valent `null`
dans `src/config/company.ts` tant qu'aucune preuve documentaire n'a été
produite. La procédure de vérification est décrite dans
[docs/content-verification-register.md](docs/content-verification-register.md).

---

## Documentation complémentaire

| Document | Contenu |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Structure applicative et choix techniques |
| [docs/api.md](docs/api.md) | Référence des routes HTTP |
| [docs/database.md](docs/database.md) | Schéma et migrations |
| [docs/authentication.md](docs/authentication.md) | Flux d'authentification |
| [docs/accounts.md](docs/accounts.md) | Cycle de vie des comptes |
| [docs/sessions.md](docs/sessions.md) | Gestion des sessions |
| [docs/two-factor-authentication.md](docs/two-factor-authentication.md) | TOTP et codes de récupération |
| [docs/roles-and-permissions.md](docs/roles-and-permissions.md) | Rôles et droits |
| [docs/security.md](docs/security.md) | Modèle de sécurité et rétention |
| [docs/documents.md](docs/documents.md) | Génération PDF |
| [docs/uploads.md](docs/uploads.md) | Téléversements et stockage privé |
| [docs/email-delivery.md](docs/email-delivery.md) | Outbox SMTP |
| [docs/testing.md](docs/testing.md) | Stratégie de test |
| [docs/functional-scope.md](docs/functional-scope.md) | Périmètre fonctionnel |
| [docs/delivery-roadmap.md](docs/delivery-roadmap.md) | Feuille de route de livraison |
| [docs/feature-matrix.md](docs/feature-matrix.md) | Matrice des fonctionnalités |
| [docs/content-guidelines.md](docs/content-guidelines.md) | Règles rédactionnelles |
| [docs/content-verification-register.md](docs/content-verification-register.md) | Registre de vérification du contenu |
| [docs/runbook-infrastructure.md](docs/runbook-infrastructure.md) | Exploitation de l'infrastructure |
| [docs/product/perimetre-v1.md](docs/product/perimetre-v1.md) | Périmètre contractuel de la V1 |
| [docs/audits/](docs/audits/) | Rapports d'audit datés |
