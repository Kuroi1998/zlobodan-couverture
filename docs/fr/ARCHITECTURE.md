# Documentation de l'Architecture Technique

```mermaid
flowchart TD
    Client[Client / Navigateur Web] --> Middleware[Middleware Next.js src/middleware.ts]
    Middleware --> AppRouter[App Router Next.js 14]
    AppRouter --> AuthGuard[Guards & Permissions can()]
    AuthGuard --> DB[(PostgreSQL + Drizzle ORM)]
    AppRouter --> PDF[Service PDF Serveur pdfService.ts]
```

## 1. Vue d'Ensemble
L'architecture repose sur **Next.js 14 App Router** avec **TypeScript** en mode typage strict. Le projet est découpé de manière modulaire afin que **chaque fichier contienne moins de 400 lignes de code** (cible 150-250 lignes).

## 2. Responsabilités des Dossiers
- `src/app/` : Routes pages et handlers d'API (`/mon-compte`, `/admin`, `/api/auth/*`, `/api/client/*`, `/api/pdf/*`).
- `src/components/` : Composants UI modulaires (découpage sous-composants par dossier).
- `src/data/` : Données statiques et SEO séparées par domaine (`services/`, `villesData.ts`, `siteConfig.ts`).
- `src/db/` : Schémas Drizzle ORM découpés par domaine (`schema/users.ts`, `quotes.ts`, `invoices.ts`, `audit.ts`...).
- `src/lib/` : Services métier (`authService.ts`, `pdfService.ts`, `auditService.ts`), sécurité OWASP (`permissions.ts`, `rateLimiter.ts`, `uploadService.ts`, `magicBytes.ts`).

## 3. Flux de Sécurité & Données
- Le middleware `middleware.ts` applique les en-têtes HTTP de sécurité (CSP, HSTS, DENY, nosniff) et la protection CSRF sur les mutations API.
- L'autorisation est centralisée par la fonction `can(user, action, resource)` appelée côté serveur dans chaque handler d'API et layout.
