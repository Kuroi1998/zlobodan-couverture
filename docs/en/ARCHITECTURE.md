# Technical Architecture Documentation

```mermaid
flowchart TD
    Client[Client / Web Browser] --> Middleware[Next.js Middleware src/middleware.ts]
    Middleware --> AppRouter[App Router Next.js 14]
    AppRouter --> AuthGuard[Guards & Permissions can()]
    AuthGuard --> DB[(PostgreSQL + Drizzle ORM)]
    AppRouter --> PDF[Server PDF Service pdfService.ts]
```

## 1. Overview
The architecture is built on **Next.js 14 App Router** with **TypeScript** in strict mode. The codebase is modularly structured to guarantee **every source file remains under 400 lines of code** (target: 150–250 lines).

## 2. Directory Responsibilities
- `src/app/`: Next.js pages and API route handlers (`/mon-compte`, `/admin`, `/api/auth/*`, `/api/client/*`, `/api/pdf/*`).
- `src/components/`: Modular UI components split into dedicated sub-directories.
- `src/data/`: Static business and SEO data split per domain (`services/`, `villesData.ts`, `siteConfig.ts`).
- `src/db/`: Drizzle ORM domain schemas (`schema/users.ts`, `quotes.ts`, `invoices.ts`, `audit.ts`...).
- `src/lib/`: Core services (`authService.ts`, `pdfService.ts`, `auditService.ts`), OWASP security (`permissions.ts`, `rateLimiter.ts`, `uploadService.ts`, `magicBytes.ts`).
