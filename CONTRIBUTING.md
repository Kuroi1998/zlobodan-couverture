# Guide de Contribution — Zlobodan Couverture SRL

Ce document définit les normes de contribution, la stratégie de branches, la convention des messages de commit et le processus de validation par Pull Request.

---

## 🌿 1. Stratégie de Branches

```text
main      ---> Branche stable de production (Protected)
develop   ---> Branche d'intégration active
```

### Branches temporaires :
- `feature/nom-fonctionnalite` (Nouvelle fonctionnalité)
- `fix/nom-correction` (Correction de bug)
- `refactor/nom-refactorisation` (Refactorisation du code)
- `docs/nom-documentation` (Documentation)
- `test/nom-tests` (Ajout de tests)
- `chore/nom-maintenance` (Maintenance générale)

---

## 📝 2. Convention de Commits (Conventional Commits)

Format obligatoire des messages de commit (en français) :

```text
type(périmètre): description courte en français
```

### Types autorisés :
- `feat`: Ajout d'une fonctionnalité
- `fix`: Correction d'un bug
- `docs`: Modification de la documentation
- `style`: Modification visuelle sans changement fonctionnel
- `refactor`: Restructuration du code
- `perf`: Amélioration des performances
- `test`: Ajout ou correction de tests
- `ci`: Modification de l'intégration continue
- `chore`: Maintenance générale
- `security`: Correction liée à la sécurité

### Exemples :
```text
feat(devis): ajoute la compression d'image client-side
fix(auth): corrige le verrouillage temporaire de compte
docs(readme): met à jour la documentation d'installation
security(upload): ajoute la purge EXIF des photos téléversées
```

---

## 🧪 3. Étapes Obligatoires Avant Tout Commit / PR

Avant de soumettre une Pull Request vers `develop` :

```bash
# 1. Vérification du linting
npm run lint

# 2. Vérification de la contrainte < 400 lignes
npm run check:size

# 3. Exécution de la suite de tests
npm run test

# 4. Compilation statique Next.js
npm run build
```

---

## 🔀 4. Processus de Pull Request (PR)

1. Ouvrir la Pull Request vers la branche `develop`.
2. Compléter le formulaire basé sur `.github/pull_request_template.md`.
3. S'assurer que tous les workflows GitHub Actions (CI & CodeQL) sont au vert.
4. Résoudre les éventuels commentaires de relecture.
5. Une fois validée et fusionnée dans `develop`, la branche temporaire doit être supprimée.
