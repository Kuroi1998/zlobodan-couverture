# Rapport de restructuration du projet

**Date** : 25 juillet 2026
**Branche** : `refactor/project-structure-cleanup`
**Base** : `develop` (`edb255f`)

---

## 1. Résumé général

| Indicateur | Valeur |
| :--- | ---: |
| Fichiers analysés | 187 |
| Fichiers de code supprimés | 3 |
| Fichiers déplacés ou renommés | 24 |
| Fichiers créés (découpage, source de vérité) | 5 |
| Fichiers fusionnés | 2 → 1 |
| Dépendances supprimées | 4 |
| Dépendances mises à jour | 1 |
| Ressources publiques supprimées | 0 |
| Références d'import mises à jour | 49 |

**Validations finales** — toutes vertes : `typecheck`, `lint` (zéro avertissement), `test` (105/105), `build`, `check:bundle`, `check:size` (153 fichiers sous 400 lignes).

### Ce que la restructuration a révélé

L'inventaire n'a trouvé **aucun** composant orphelin, **aucune** ressource inutilisée et **aucun** fichier au nom suspect (`old`, `copy`, `backup`…). Le projet était déjà sain sur cet axe.

Les vrais problèmes étaient ailleurs, et trois d'entre eux cassaient réellement des fonctionnalités :

1. **`npm run db:generate` ne fonctionnait plus.** drizzle-kit 0.20 est incompatible avec drizzle-orm 0.45, que j'avais monté lors du durcissement pour corriger une injection SQL. L'outillage de migration était donc inutilisable depuis cette montée, sans que rien ne le signale.
2. **Le formulaire de devis était entièrement cassé.** Trois causes cumulées, détaillées en §5.
3. **`src/lib/utils.ts` et `src/lib/utils/` coexistaient**, le fichier masquant le dossier à la résolution de module.

---

## 2. Fichiers supprimés

### `src/lib/utils.ts`

- **Raison** : entièrement mort. Exportait `cn()` et `formatPrice()`.
- **Références vérifiées** : recherche de `\bcn(`, `formatPrice`, `clsx`, `twMerge` et de l'alias `@/lib/utils` sur l'intégralité du dépôt — aucune occurrence hors du fichier lui-même.
- **Effet de bord corrigé** : levait l'ambiguïté avec le dossier `src/lib/utils/`, que ce fichier masquait.
- **Risque** : faible. `formatPrice` est remplacé par `formatEuros` dans `src/domain/money.ts`, aux côtés de l'arithmétique en centimes. `cn()` se réintroduit en trois lignes si un besoin apparaît.

### `src/lib/utils/calculator.ts`

- **Raison** : réduit à un passe-plat vers `domain/money` après le durcissement. Deux points d'entrée pour un même calcul, donc deux comportements d'arrondi possibles.
- **Références vérifiées** : un seul appelant, `src/__tests__/businessLogic.test.ts`, mis à jour.
- **Action** : fusionné dans `src/domain/money.ts` (catégorie D).

### `scripts/run-tests.js`

- **Raison** : lanceur de tests artisanal, remplacé par Vitest. Il réimplémentait `can()` au lieu de l'importer — il validait donc une fonction fictive.
- **Références vérifiées** : aucune entrée dans `package.json` ni dans les workflows CI.
- **Risque** : nul, ses cas sont couverts par la suite Vitest.

---

## 3. Fichiers déplacés et renommés

### Convention retenue

| Type | Convention | Exemple |
| :--- | :--- | :--- |
| Composants React | `PascalCase.tsx` | `QuoteWizard.tsx` |
| Hooks | `useSomething.ts` | `useQuoteWizard.ts` |
| Modules TypeScript | `kebab-case.ts` | `rate-limiter.ts` |

Le `kebab-case` l'emporte parce que la majorité des modules de `lib/security/` l'utilisaient déjà ; il fallait aligner la minorité, pas l'inverse.

### Renommages (camelCase → kebab-case)

| Ancien | Nouveau |
| :--- | :--- |
| `lib/auth/tokenConsumption.ts` | `lib/auth/token-consumption.ts` |
| `lib/security/magicBytes.ts` | `lib/security/magic-bytes.ts` |
| `lib/security/rateLimiter.ts` | `lib/security/rate-limiter.ts` |
| `lib/security/uploadService.ts` | `lib/security/upload-service.ts` |
| `lib/services/auditService.ts` | `lib/services/audit-service.ts` |
| `lib/services/authErrors.ts` | `lib/services/auth-errors.ts` |
| `lib/services/authService.ts` | `lib/services/auth-service.ts` |
| `lib/services/notificationService.ts` | `lib/services/notification-service.ts` |
| `lib/services/pdfService.ts` | `lib/services/pdf-service.ts` |
| `lib/services/quoteDecisionService.ts` | `lib/services/quote-decision-service.ts` |
| `lib/validations/authSchemas.ts` | `lib/validations/auth-schemas.ts` |
| `lib/validations/quoteSchemas.ts` | `lib/validations/quote-schemas.ts` |

### Déplacements structurants

| Ancien | Nouveau | Justification |
| :--- | :--- | :--- |
| `src/data/siteData.ts` | `src/config/site.ts` | Raison sociale, coordonnées, assurance : c'est de la **configuration**, pas du contenu éditorial. L'export est renommé `siteConfig`. |
| `src/lib/utils/imageCompression.ts` | `src/lib/media/image-compression.ts` | `utils` est le nom générique que la mission demande d'éviter. `media` dit ce que fait le module. Supprime au passage le dossier `lib/utils/`. |
| `src/lib/domain/money.ts` | `src/domain/money.ts` | Les règles métier ne sont pas des helpers techniques. `lib/` ne contient plus que du technique. |
| `src/lib/domain/state-machine.ts` | `src/domain/state-machine.ts` | Idem. |
| `src/components/devis/steps/types.ts` | `src/components/devis/quote-form.types.ts` | `types.ts` ne dit rien. Remonté d'un niveau : ces types servent au wizard entier, pas aux seules étapes. |
| `src/components/devis/StepWizard.tsx` | `src/components/devis/QuoteWizard.tsx` | « Step » décrivait le mécanisme, pas l'objet. |

### Suffixes redondants retirés

`faqData.ts` → `faq.ts`, `realisationsData.ts` → `realisations.ts`, `reviewsData.ts` → `reviews.ts`, `servicesData.ts` → `services.ts`, `villesData.ts` → `villes.ts`. Le suffixe `Data` n'apporte rien dans un dossier nommé `data/`.

Tous les déplacements utilisent `git mv` : l'historique est préservé.

---

## 4. Fichiers créés

| Fichier | Rôle |
| :--- | :--- |
| `src/domain/quote-options.ts` | **Source de vérité** du vocabulaire des formulaires, partagée entre l'interface et la validation serveur. |
| `src/components/devis/useQuoteWizard.ts` | État, validation et envoi du wizard. |
| `src/components/devis/QuoteProgress.tsx` | Barre de progression, sans état. |
| `src/components/devis/QuoteNavigation.tsx` | Navigation entre étapes. |
| `src/db/migrations/0000_*.sql` | Migration initiale, absente du dépôt jusqu'ici. |

---

## 5. Régressions fonctionnelles trouvées et corrigées

### Le formulaire de devis était cassé

Trois causes indépendantes, toutes introduites ou révélées par le durcissement précédent :

1. **`rgpdConsent` et `description` n'étaient jamais transmis.** Le consentement étant exigé côté serveur, *toute* demande était rejetée en 400.
2. **Divergence de vocabulaire.** La liste des interventions existait en deux exemplaires : l'interface proposait `refection`, `fuite`, `demoussage`, `gouttieres` ; le schéma Zod attendait `reparation`, `renovation`, `nettoyage`, `zinguerie`. Quatre des sept options affichées étaient donc systématiquement refusées. Le vocabulaire de l'interface fait foi — c'est celui du métier.
3. **Faux succès sur échec.** En cas d'erreur réseau, le wizard redirigeait vers la page de remerciement : le client croyait sa demande envoyée alors qu'elle était perdue.

**Correction structurelle** : `src/domain/quote-options.ts` devient l'unique définition, importée par le schéma **et** par les composants d'étape. Un test parcourt chaque option affichable et vérifie qu'elle passe la validation — la divergence ne peut plus réapparaître en silence.

### L'outillage de migration ne fonctionnait plus

drizzle-kit 0.20 est incompatible avec drizzle-orm 0.45. Montée en drizzle-kit 0.31, dont la configuration remplace `driver` par `dialect` et `connectionString` par `url`. `npm run db:generate` produit à nouveau des migrations, et la migration initiale a été générée.

### Fuite mémoire au retrait d'une photo

`URL.createObjectURL` était appelé sans `revokeObjectURL` correspondant : chaque photo retirée laissait fuir son blob jusqu'au rechargement de la page.

---

## 6. Dépendances

### Supprimées

| Paquet | Type | Raison | Vérifications |
| :--- | :--- | :--- | :--- |
| `pg` | prod | Jamais importé. L'accès passe par `postgres.js` via `drizzle-orm/postgres-js`. | Recherche d'import sur tout le dépôt ; `drizzle-orm` le déclare en peer **`optional: true`** ; `drizzle-kit` ne l'a ni en dépendance ni en peer ; `db:generate` vérifié fonctionnel après suppression. |
| `@types/pg` | dev | Types du paquet ci-dessus. | Idem. |
| `clsx` | prod | Consommé uniquement par `lib/utils.ts`, supprimé. | Recherche de `clsx` sur tout le dépôt. |
| `tailwind-merge` | prod | Idem, seul consommateur supprimé. | Recherche de `twMerge` et `tailwind-merge`. |

### Mise à jour

| Paquet | Ancien | Nouveau | Raison |
| :--- | :--- | :--- | :--- |
| `drizzle-kit` | 0.20.18 | 0.31.10 | Incompatibilité avec drizzle-orm 0.45 : l'outillage de migration était inutilisable. |

### Conservées après vérification

`leaflet` (import dynamique + CSS), `react-dom` (implicite Next), `tsx` (script `db:seed`), `autoprefixer` / `postcss` / `tailwindcss` (chaîne de build), `@types/*`, `eslint*`, `typescript`. Une recherche naïve d'`import` les signale à tort : elles sont chargées par convention ou par configuration.

---

## 7. Éléments conservés par prudence (catégorie G)

| Élément | Pourquoi il n'a pas été supprimé |
| :--- | :--- |
| `src/db/seed.ts` | N'écrit rien en base aujourd'hui (il journalise), mais il est câblé au script `db:seed` et constitue le point d'entrée attendu du jeu de démonstration. |
| Pages `mon-compte/*` et `admin/*` à données fictives | Elles affichent des données codées en dur. Ce sont des maquettes fonctionnelles destinées à être branchées, pas du code mort. |
| `docs/en/`, `docs/fr/` | Documentation bilingue maintenue hors de cette mission. Contenu non vérifié ligne à ligne. |
| `CHANGELOG.en.md`, `CONTRIBUTING.en.md`, `SECURITY.en.md`, `README.en.md` | Versions anglaises. **`SECURITY.en.md` et `README.en.md` sont désormais désynchronisés** de leurs équivalents français, largement réécrits. Signalé en §10. |
| `src/lib/db/raw-queries.ts` | Contient une exception justifiée (`nextval`). À conserver même si elle redevenait vide : c'est le point de passage unique documenté. |

---

## 8. Architecture finale

```text
src/
├── app/               Routes, layouts, handlers d'API (App Router)
├── components/        Composants React, groupés par fonctionnalité
├── config/            Configuration du site — jamais de secret
├── data/              Contenu statique, sans logique
├── domain/            Règles métier : montants, machine à états, options de devis
├── db/                Schéma Drizzle, migrations, client
├── lib/               Modules techniques uniquement
│   ├── auth/          Mots de passe, sessions, TOTP, jetons
│   ├── db/            Dépôts, tri par liste blanche, numérotation
│   ├── media/         Compression d'images
│   ├── security/      Gardes, CSP, CSRF, cache, débit, journal
│   ├── services/      Orchestration
│   └── validations/   Schémas Zod et normalisation
└── __tests__/         Tests unitaires et de sécurité
```

La distinction qui structure tout : **`domain/` porte les règles métier, `lib/` porte la technique, `config/` porte les valeurs, `data/` porte le contenu.** `domain/` est en outre la frontière partagée entre l'interface et le serveur — c'est ce qui empêche l'écran et la validation de diverger.

---

## 9. Résultats des commandes

| Étape | Commande | Résultat |
| :--- | :--- | :--- |
| Installation | `npm install` | OK. `npm ci` a échoué une fois sur un verrou de fichier Windows/OneDrive — incident d'environnement, pas de configuration. |
| Types | `npm run typecheck` | OK, aucune erreur |
| Lint | `npm run lint` | OK, **zéro avertissement** |
| Tests | `npm test` | **105 / 105** |
| Build | `npm run build` | OK, 46 pages générées |
| Bundle | `npm run check:bundle` | 44 artefacts, aucun secret |
| Taille | `npm run check:size` | 153 fichiers, tous sous 400 lignes |
| Migrations | `npm run db:generate` | OK après correction |
| Dépendances circulaires | `npx madge --circular` | **Aucune** |
| SonarLint / SonarQube | — | **Non exécuté** : aucun scanner configuré dans ce dépôt. |

---

## 10. Régressions vérifiées

Serveur de production lancé et interrogé réellement (`next start`).

| Vérification | Résultat |
| :--- | :--- |
| Pages publiques (`/`, `/a-propos`, `/services`, `/realisations`, `/contact`, `/devis`, `/devis/merci`, `/connexion`, mentions légales, politique de confidentialité) | **200** |
| Page commune dynamique `/couvreur-bruxelles` | **200** |
| Page service dynamique `/services/renovation-refection-toiture` | **200** |
| `/robots.txt`, `/sitemap.xml`, `/.well-known/security.txt` | **200** |
| `/admin`, `/admin/devis`, `/mon-compte`, `/mon-compte/factures` sans session | **307** vers `/connexion?next=…` |
| En-têtes de sécurité sur page publique | CSP à nonce, HSTS, `X-Frame-Options`, `nosniff`, pas de `X-Powered-By` |
| Cache des zones authentifiées | `no-store` + `CDN-Cache-Control` + `Cloudflare-CDN-Cache-Control` |
| Leurre `/wp-admin` | **404** + `x-zb-trap: 1` |
| CSRF sans `Origin` | **403** |
| Modes de rendu | Pages publiques statiques, zones authentifiées dynamiques — inchangés |
| URL publiques | **Aucun ajout, suppression ni renommage** de fichier de route (`git diff --name-status` sur `src/app`) |

### Découverte pendant ces tests

`Vary: Cookie` **ne tient pas** sur les pages rendues par Next.js : il réécrit l'en-tête après le middleware. Mes jetons ne survivent que sur les réponses fabriquées par le middleware lui-même (refus CSRF, leurres). Constaté sur un serveur réel, pas déduit du code.

Sans conséquence pratique — `Cache-Control: no-store` est présent sur toutes les réponses privées et prime — mais l'affirmation « `Vary` correct » de l'audit précédent était fausse. Corrigée dans `SECURITY.md`.

---

## 11. Recommandations restantes

Non appliquées ici, faute de certitude suffisante ou parce qu'elles dépassent le cadre d'une restructuration.

1. **Resynchroniser `README.en.md` et `SECURITY.en.md`.** Leurs équivalents français ont été largement réécrits ; les versions anglaises décrivent désormais un état dépassé. Une documentation fausse est pire qu'absente — c'est le constat qui avait ouvert l'audit initial.
2. **Grouper les routes publiques sous `app/(public)/`.** Bénéfice réel mais faible ici : la séparation public/privé est déjà lisible. À faire lors du prochain ajout de section, pas pour lui-même.
3. **Brancher les pages `mon-compte/*` et `admin/*` sur la base.** Elles affichent des données fictives ; c'est le chantier fonctionnel suivant, hors périmètre.
4. **Extraire les formulaires de `connexion/page.tsx`** (302 lignes, deux formulaires dans un fichier). Sous la limite, mais deux responsabilités distinctes.
5. **Convertir `public/images/` en AVIF** en complément du WebP. Non fait : je n'ai pas vérifié le rendu après conversion, et la mission interdit de dégrader une ressource sans contrôle visuel.
6. **Configurer SonarQube** si l'analyse est attendue en CI : aucun `sonar-project.properties` n'existe dans ce dépôt.
