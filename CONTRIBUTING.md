# Guide de contribution

Ce document définit la préparation de l'environnement, la stratégie de
branches, les conventions de nommage et de commit, les exigences avant pull
request et les règles de relecture.

---

## 1. Préparation de l'environnement

Prérequis : Node.js `>=24 <25`, npm `>=11.10 <12`, PostgreSQL 14 ou supérieur.

```bash
npm ci
```

```bash
cp .env.example .env.local
```

```bash
npm run env:check && npm run db:migrate && npm run db:check
```

`.env.local` ne doit jamais être versionné. Voir la section 6 du
[README](README.md) pour le détail des variables.

---

## 2. Stratégie de branches

```text
main       Branche stable. Ne reçoit que des fusions depuis develop.
develop    Branche d'intégration active. Cible de toutes les pull requests.
```

Branches temporaires, créées depuis `develop` :

| Préfixe | Usage |
| --- | --- |
| `feature/` | Nouvelle fonctionnalité |
| `fix/` | Correction de bug |
| `refactor/` | Restructuration sans changement fonctionnel |
| `perf/` | Amélioration des performances |
| `docs/` | Documentation |
| `test/` | Ajout ou correction de tests |
| `chore/` | Maintenance générale |
| `ci/` | Intégration continue |

Une branche fusionnée doit être supprimée.

---

## 3. Conventions de nommage

| Élément | Convention | Exemple |
| --- | --- | --- |
| Branche | kebab-case après le préfixe | `feature/suppression-de-compte` |
| Composant React | PascalCase | `SessionsPanel.tsx` |
| Hook, service, module | camelCase ou kebab-case selon le dossier existant | `useQuoteWizard.ts`, `auth-service.ts` |
| Route App Router | kebab-case, en français | `src/app/mot-de-passe-oublie/` |
| Suite de test | camelCase + `.test.ts` | `test/unit/loginRoute.test.ts` |
| Document | kebab-case, en minuscules | `docs/audits/git-commits-etape-3.md` |
| Migration | générée par Drizzle Kit | `0006_nom_genere.sql` |

Aligner tout nouveau fichier sur la convention déjà en place dans son dossier.
Les noms ambigus (`temp`, `final`, `copie`, `test2`, `backup-old`) sont
proscrits.

---

## 4. Convention de commits

Format obligatoire, en français :

```text
type(périmètre): description courte à l'impératif
```

Types autorisés : `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`ci`, `build`, `chore`, `security`.

Exemples :

```text
feat(devis): ajoute la compression d'image côté navigateur
fix(auth): corrige le verrouillage temporaire de compte
security(upload): purge les métadonnées EXIF des photos téléversées
docs(readme): met à jour les instructions d'installation
```

Un commit correspond à une intention. Les messages `update`, `fix`, `changes`
ou `final` sont refusés en relecture.

---

## 5. Exigences avant toute pull request

```bash
npm run validate
```

Cette commande enchaîne `typecheck`, `lint:strict`, `check:size`, `test` et
`build`. Elle doit passer intégralement.

Si la modification touche la base de données, l'authentification, les
téléversements ou les documents, exécuter également les suites qui exigent
PostgreSQL :

```bash
npm run validate:full
```

Contraintes structurelles vérifiées automatiquement :

- **400 lignes maximum** par fichier source (`check:size`) ;
- **zéro avertissement** ESLint (`lint:strict`) ;
- **aucun secret** dans le bundle client (`check:bundle`, exécuté en CI).

Toute migration doit être générée par `npm run db:generate` puis relue. Ne
jamais éditer une migration déjà fusionnée.

---

## 6. Processus de pull request

1. Ouvrir la pull request vers `develop`.
2. Compléter le modèle
   [`.github/pull_request_template.md`](.github/pull_request_template.md).
3. S'assurer que les workflows **CI**, **Securite** et **CodeQL** sont au vert.
4. Répondre aux commentaires de relecture.
5. Supprimer la branche après fusion.

---

## 7. Règles de relecture

Un relecteur vérifie :

- que le périmètre annoncé correspond au diff, sans changement opportuniste ;
- qu'aucun secret, jeton, identifiant ni donnée personnelle n'apparaît ;
- que les contrôles d'accès sont posés dans les services et les route
  handlers, jamais dans le seul middleware ;
- que toute nouvelle route est couverte par un test d'autorisation ;
- que les messages d'erreur ne divulguent ni existence de compte, ni chemin de
  stockage, ni détail d'implémentation ;
- que la documentation touchée par le changement est mise à jour dans le même
  commit ;
- qu'aucune affirmation invérifiable n'est introduite dans le contenu publié
  (voir [docs/content-guidelines.md](docs/content-guidelines.md)).

Une vulnérabilité ne se signale jamais dans une pull request ou une issue
publique : suivre [SECURITY.md](SECURITY.md).
