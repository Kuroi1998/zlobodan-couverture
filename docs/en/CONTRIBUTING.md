# Contribution Guide — Zlobodan Couverture SRL

This document defines contribution standards, branch strategy, conventional commit formatting, and the Pull Request review workflow.

---

## 🌿 1. Branch Strategy

```text
main      ---> Production stable branch (Protected)
develop   ---> Active integration branch
```

### Temporary Feature Branches:
- `feature/feature-name` (New feature)
- `fix/bug-name` (Bug fix)
- `refactor/refactor-name` (Code refactoring)
- `docs/doc-name` (Documentation update)
- `test/test-name` (Test addition)
- `chore/chore-name` (General maintenance)

---

## 📝 2. Conventional Commits Standard

Mandatory commit message structure:

```text
type(scope): concise description
```

### Allowed Types:
- `feat`: New feature addition
- `fix`: Bug fix
- `docs`: Documentation modification
- `style`: Visual style changes without logic alteration
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Test suite addition or fix
- `ci`: CI/CD workflow updates
- `chore`: General maintenance
- `security`: Security fix

---

## 🧪 3. Mandatory Steps Before Commit / PR

Before submitting a Pull Request to `develop`:

```bash
# 1. Linting check
npm run lint

# 2. File size limit check (< 400 lines)
npm run check:size

# 3. Test suite execution
npm run test

# 4. Production Next.js build verification
npm run build
```

---

## 🔀 4. Pull Request (PR) Process

1. Create Pull Request targeting `develop`.
2. Fill in `.github/pull_request_template.md`.
3. Ensure all GitHub Actions workflows pass cleanly.
4. Merge after review, and delete the temporary branch.
