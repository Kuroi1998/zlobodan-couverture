# Sécurisation de l'environnement et de la connexion PostgreSQL

**Date** : 26 juillet 2026
**Portée** : gestion des variables d'environnement, connexion PostgreSQL, migrations, seed, diagnostic, CI.

---

## 1. Cause initiale

| Point | Constat |
| :--- | :--- |
| **Problème de validation** | La validation existait déjà (bonne base) mais était **dispersée** : `process.env` lu directement dans 9 fichiers (`csrf`, `rate-limiter`, `request-context`, `urls`, `session`, `middleware`…), sans source unique ni objet gelé, et sans garde de compilation `server-only`. |
| **Problème de connexion** | Client PostgreSQL correct mais **non résistant au Hot Reload** (un pool rouvert à chaque édition en dev), sans `checkDatabaseConnection()` par requête réelle, sans normalisation d'erreurs, sans `server-only`. |
| **Problème de build** | `output: "export"` (ajout externe « GitHub Pages ») **cassait `npm run build`** : incompatible avec les route handlers, le middleware, les pages dynamiques et la connexion PostgreSQL elle-même. |
| **Fichiers responsables** | `src/lib/security/env.ts`, `src/db/client.ts`, `next.config.js`, et les 9 lecteurs directs de `process.env`. |
| **Cause racine** | Absence de frontière compilée serveur/client et de source de vérité unique ; configuration de déploiement statique incompatible avec une application à base de données. |

---

## 2. Cartographie retenue

```
config/env.ts  (server-only, Zod, gelé)   ← source unique
   ├─→ db/client.ts (server-only, singleton HMR-safe) ─→ db/diagnostics.ts (SELECT 1, erreurs)
   ├─→ csrf / rate-limiter / request-context (edge & node)
   ├─→ server-urls.ts (server-only)   ── urls.ts (pur, client-safe) reste séparé
   └─→ config/startup.ts (Node only, journalisation démarrage) ← instrumentation.ts
```

---

## 3. Variables (noms uniquement)

- **Obligatoires (serveur, production)** : `DATABASE_URL`, `SESSION_SECRET`, `IP_HASH_SALT`, `APP_ORIGIN`, `TURNSTILE_SECRET_KEY`, `TRUSTED_PROXY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- **Facultatives** : `MIGRATION_DATABASE_URL` (retombe sur `DATABASE_URL`), `TEST_DATABASE_URL`, `SMTP_*`, `NEXT_PUBLIC_BASE_PATH`, `STATIC_EXPORT`.
- **Publiques (`NEXT_PUBLIC_*`)** : aucune n'est lue dans le code applicatif à ce jour. `NEXT_PUBLIC_TURNSTILE_SITE_KEY` reste documentée pour le widget à venir.
- **Serveur (jamais navigateur)** : toutes les ci-dessus hors `NEXT_PUBLIC_*`.
- **Supprimées** : aucune.
- **Renommées** : aucune (accesseurs regroupés dans `config/env.ts`, ancien `lib/security/env.ts` devenu ré-export de compatibilité).

Aucun secret n'a de valeur de repli en production. Aucun secret n'est journalisé : `maskDatabaseUrl` n'expose que `hôte:port/base`.

---

## 4. PostgreSQL

| | |
| :--- | :--- |
| Bibliothèque | `postgres` (postgres.js v3) |
| ORM | Drizzle ORM (`drizzle-orm/postgres-js`) — **une seule** stratégie canonique |
| Mode de connexion | URL complète (`DATABASE_URL`), source unique |
| Pool | `max: 10`, `idle_timeout: 30 s`, `connect_timeout: 10 s`, `max_lifetime: 30 min`, singleton `globalThis` en dev uniquement |
| SSL | Piloté par `sslmode` dans l'URL ; `require`/`verify-full` **exigé en production** par la validation |
| Timeouts serveur | `statement_timeout: 5 s`, `lock_timeout: 3 s`, `idle_in_transaction: 10 s` |
| Connexion à l'import | **Aucune** — postgres.js est paresseux (vérifié : 1 ms à la construction) |

**Base de données** (mission — valeurs masquées) : hôte masqué · port `5432` · base masquée · utilisateur masqué · version relevée par `db:check` (`PostgreSQL X.Y`, bannière tronquée) · schéma Drizzle présent (`src/db/schema/*`) · migration initiale `0000_*` présente · seed = squelette protégé (refus production).

---

## 5. Corrections apportées

1. **`src/config/env.ts`** — source de vérité unique : validation Zod, objet gelé (`getServerEnv`), accesseurs typés, `import "server-only"`, tolérance build-phase, replis dev explicites, `maskDatabaseUrl`.
2. **`src/db/client.ts`** — `server-only`, singleton HMR-safe (`globalThis` en dev), pool borné, SSL par URL, aucune connexion à l'import.
3. **`src/db/diagnostics.ts`** — `checkDatabaseConnection()` (vrai `SELECT 1`, timeout, ne lève jamais), `getDatabaseErrorMessage()` (28P01, 3D000, 42P01, ECONNREFUSED, ENOTFOUND, ETIMEDOUT, 57P03…), `closeDatabase()`.
4. **`src/config/startup.ts`** — journalisation de démarrage isolée du runtime Edge.
5. **Séparation client/serveur** — `urls.ts` scindé : `safeReturnPath` (pur, importé par un composant client) sans `process.env` ; `server-urls.ts` (`server-only`) pour les URL absolues. Garde prouvée : importer `@/config/env` dans un `"use client"` **casse le build** (erreur server-only explicite).
6. **Scripts** — `env:check` et `db:check` (tsx + `tsconfig.scripts.json` neutralisant `server-only`), sortie non nulle sur erreur, aucun secret affiché.
7. **`/api/health`** — 200/503, aucun détail interne, `no-store`.
8. **Garde base-de-test** — en `NODE_ENV=test`, une `DATABASE_URL` non locale est refusée (détection par hôte, pas par le mot « production ») ; `TEST_DATABASE_URL` prime.
9. **Seed** — refus explicite en production, client canonique, fermeture propre.
10. **`drizzle.config.ts`** — repli codé en dur supprimé, échec clair si aucune URL.
11. **CI** — job `database` avec service `postgres:16` éphémère (secrets factices), `env:check` + `db:migrate` + `db:check` (SELECT 1 réel) ; job `validate` sans base séparé.
12. **`next.config.js`** — `output: "export"` rendu **conditionnel** (`STATIC_EXPORT=true`, posé uniquement par `pages.yml`). Build serveur par défaut.
13. **Défaut corrigé** — `TURNSTILE_SECRET_KEY` vide renvoyait `""` (pris pour configuré) ; vaut désormais `null`.

---

## 6. Tests exécutés

| Vérification | Résultat |
| :--- | :--- |
| Validation d'environnement (unitaire) | ✓ 20 tests (URL valide/invalide, sslmode, secret absent/court, clé test Turnstile, APP_ORIGIN, Redis, garde test, masquage) |
| Normalisation d'erreurs PostgreSQL (unitaire) | ✓ codes 28P01/3D000/42P01/ECONNREFUSED/ENOTFOUND/ETIMEDOUT |
| Connexion PostgreSQL — `db:check` | ✓ contre hôte injoignable : erreur normalisée, cible masquée, **0 secret**, exit 1 (ETIMEDOUT et ECONNREFUSED) |
| `SELECT 1` réussi | Exercé en **CI** (service Postgres) — pas de base locale sur ce poste |
| Migrations — `db:generate` | ✓ échoue clairement sans URL, génère avec URL |
| Seed | ✓ refusé en production (exit 1) |
| Authentification / métier | ✓ pages publiques 200, zones protégées 307, `/api/health` 503 sans fuite |
| Tests unitaires | ✓ **152 / 152** |
| Tests d'intégration | Délégués à la CI (service Postgres isolé) |
| Build | ✓ serveur par défaut, exit 0 |
| GitHub Actions | Corrigé et relu — **non exécuté** (pas de push observé) |
| Clone propre | ✓ `main` : `npm ci`, `env:check`, typecheck, lint, **152 tests**, build — tous verts |

---

## 7. Résultat final

```
Variables invalides            : 0
Secrets exposés au client      : 0 (garde server-only prouvée)
Secrets journalisés            : 0 (masquage vérifié)
Erreurs PostgreSQL non gérées  : 0 (normalisation + health)
Connexions inutiles            : 0 (singleton HMR-safe, lazy)
TypeScript                     : 0 erreur
ESLint                         : 0 erreur, 0 avertissement
Tests                          : 152 / 152
Build                          : réussi (serveur)
PostgreSQL                     : SELECT 1 exercé en CI
Migrations                     : à jour (0000 présente)
```

---

## 8. Points à connaître (honnêteté)

- **`SELECT 1` réussi non exécuté localement** : aucun PostgreSQL ni Docker sur ce poste. Le chemin d'échec (timeout, refus, codes normalisés) est prouvé localement ; le chemin de succès est exercé par le job CI `database` (service `postgres:16`).
- **GitHub Actions non exécuté** : les workflows sont corrigés et relus, mais aucun `push` n'a été fait — leur exécution distante reste à confirmer.
- **État git** : des opérations git externes durant la mission ont déplacé le travail sur `main` (HEAD contient tous les commits env/DB) ; la branche `chore/env-and-postgres-hardening` est restée figée sur un commit antérieur. La validation en clone propre a été faite sur `main`, l'état réel et complet.
- **`output: "export"`** : retiré du chemin par défaut sur décision explicite. Conservé en mode opt-in pour la vitrine statique GitHub Pages (`pages.yml`), qui retire au préalable les routes dynamiques. Les deux cibles coexistent sans conflit.
- **Seed** : squelette protégé, sans donnée réelle — le contenu de démonstration reste à écrire (idempotent, sans mot de passe faible).
