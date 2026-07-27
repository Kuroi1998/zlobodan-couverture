# Zlobodan Couverture

Application Next.js complète pour la vitrine, les demandes de contact et de
devis, le portail client et le back-office de Zlobodan Couverture.

## Fonctionnalités

- Formulaire de contact persistant avec référence `CNT-AAAA-NNNNNN`,
  idempotence, consentement, historique et notifications asynchrones.
- Assistant de devis en cinq étapes avec référence `DEV-AAAA-NNNNNN`,
  brouillon serveur pour les comptes connectés, rattachement au compte et
  pièces jointes privées.
- Back-office protégé par rôle et TOTP : recherche, filtres, pagination,
  transitions de statut auditées, affectation, et notes internes historisées
  avec leur auteur.
- Comptes complets : inscription et vérification d’adresse, récupération et
  changement de mot de passe, changement d’adresse confirmé, sessions et
  appareils révocables, TOTP et codes de récupération à usage unique.
- Administration des comptes : statut, sessions, événements de sécurité et
  déclenchement du flux normal de réinitialisation, sans accès aux secrets.
- Portail client alimenté exclusivement par PostgreSQL et limité au
  propriétaire de chaque ressource : suivi des demandes, détail par référence,
  annulation contrôlée par la machine à états, modification du profil,
  fermeture des autres sessions.
- Export JSON des données personnelles sans secrets, notes internes, IP ni
  chemins de stockage.
- Outbox SMTP durable avec reprise des traitements interrompus et cinq
  tentatives à délai exponentiel, y compris à chaque changement de statut
  visible du client.

### Ce que la V1 ne contient pas

Devis commerciaux chiffrés, factures et chantiers ont un schéma en base mais
**aucun chemin de création** : ils sont reportés, pas annulés. Les écrans qui
les afficheraient ne sont pas présentés comme disponibles, et aucun indicateur
ne les compte. Le périmètre officiel est dans
[functional-scope.md](docs/functional-scope.md) ; la feuille de route dans
[delivery-roadmap.md](docs/delivery-roadmap.md).

## Socle technique

| Domaine | Technologie |
| --- | --- |
| Application | Next.js 16 App Router, React 18, TypeScript strict |
| Base | PostgreSQL 14+ et Drizzle ORM |
| Validation | Zod côté navigateur et serveur, contraintes SQL |
| Authentification | Sessions opaques, bcrypt, TOTP RFC 6238 |
| Sécurité publique | CSRF, CSP, honeypot, débit IP/email, Turnstile optionnel |
| Fichiers | Sharp, stockage local privé en développement, S3 privé en production |
| Tests | Vitest, tests PostgreSQL et Playwright Chromium |

Les choix et flux sont détaillés dans
[authentication](docs/authentication.md), [accounts](docs/accounts.md),
[sessions](docs/sessions.md),
[two-factor-authentication](docs/two-factor-authentication.md),
[email-delivery](docs/email-delivery.md), [architecture](docs/architecture.md),
[database](docs/database.md), [api](docs/api.md), [testing](docs/testing.md),
[uploads](docs/uploads.md), [documents](docs/documents.md),
[content-guidelines](docs/content-guidelines.md),
[content-verification-register](docs/content-verification-register.md) et
[security](docs/security.md).

## Installation

Prérequis : Node.js 24, npm 11 et PostgreSQL 14 ou supérieur.

```bash
npm ci
cp .env.example .env.local
npm run env:check
npm run db:migrate
npm run db:check
npm run dev
```

`db:migrate` est la commande normale. `db:push` reste un outil de
développement et ne doit pas remplacer les migrations versionnées.

## Configuration

Le modèle complet est dans [`.env.example`](.env.example). Les valeurs
essentielles sont :

- `DATABASE_URL`, et idéalement `MIGRATION_DATABASE_URL` avec un compte DDL
  distinct ;
- `SESSION_SECRET`, `IP_HASH_SALT`, `TWO_FACTOR_ENCRYPTION_KEY`,
  `SESSION_COOKIE_NAME` et `APP_ORIGIN` ;
- les deux clés Turnstile et les deux valeurs Upstash en environnement
  multi-instance ;
- les paramètres SMTP pour expédier l’outbox ;
- `UPLOAD_STORAGE_DRIVER=s3` et les paramètres S3 en production.

Le démarrage de production refuse le stockage local. Les secrets ne sont ni
affichés par `env:check`, ni exposés dans les variables `NEXT_PUBLIC_*`, à
l’exception normale de la clé publique Turnstile.

## Commandes

```bash
npm run typecheck             # TypeScript sans émission
npm run lint:strict           # ESLint, zéro avertissement
npm run check:size            # limite de 400 lignes par source
npm run test                  # tests unitaires
npm run test:integration      # base locale jetable *_test
npm run test:e2e              # base E2E jetable + Chromium
npm run test:restart          # relit les données E2E après un nouveau serveur
npm run build                 # build serveur Next.js
npm run validate              # statique + unitaires + build
npm run validate:full         # validate + intégration + E2E
npm run notifications:dispatch
npm run auth:rotate-encryption-key       # simulation
npm run auth:rotate-encryption-key -- --apply
npm run uploads:cleanup       # simulation
npm run uploads:cleanup -- --apply
npm run drafts:cleanup        # simulation des brouillons de plus de 30 jours
npm run drafts:cleanup -- --apply
```

Les lanceurs d’intégration et E2E refusent les hôtes de base distants et les
noms ne se terminant pas par `_test`. Ils recréent uniquement ces bases
jetables.

## Exploitation

Après chaque déploiement :

```bash
npm ci
npm run env:check
npm run db:migrate
npm run db:check
npm run build
npm run start
```

Planifier `notifications:dispatch` toutes les minutes et
`uploads:cleanup -- --apply` quotidiennement. Planifier aussi
`drafts:cleanup -- --apply` quotidiennement : il supprime les brouillons non
soumis inactifs depuis plus de 30 jours. Les deux commandes sont en simulation
sans `--apply`.

Sauvegarder PostgreSQL et activer le versioning/lifecycle du bucket S3 avant
la mise en production. Les migrations sont ascendantes ; une restauration de
sauvegarde est la stratégie de retour arrière pour une migration destructive.

## CI

Le workflow GitHub Actions démarre PostgreSQL 18, applique les migrations,
vérifie la connexion, exécute TypeScript, ESLint, les contrôles de taille, les
tests unitaires et d’intégration, compile Next.js puis exécute les parcours
Chromium sur une seconde base isolée. Un second processus serveur relit ensuite
la même base sans reset pour prouver la persistance après redémarrage.

## Confidentialité

Les consentements enregistrent la date et la version de politique. Les
fichiers ne sont jamais placés dans `public/`, les listes ne divulguent aucun
chemin de stockage et les téléchargements repassent toujours par une garde
serveur. La politique de rétention proposée est documentée dans
[security](docs/security.md) et doit être validée par le responsable RGPD
avant automatisation des suppressions.
