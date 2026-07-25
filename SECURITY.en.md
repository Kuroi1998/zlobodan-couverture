# Security Policy & OWASP Report — Zlobodan Couverture SRL

This document details all application and infrastructure security controls implemented on the **Zlobodan Couverture** platform. Security is treated as the highest priority of the project.

---

## 🛡️ 1. OWASP Top 10 Defense Matrix

### A01:2021 — Broken Access Control
- **Implementation**: Centralized authorization engine `can(user, action, resource)` in `src/lib/auth/permissions.ts`.
- **Client Data Isolation**: Strict resource ownership verification (`resource.ownerId === user.id`). User A can under no circumstances access or download quotes, invoices, or documents belonging to User B.
- **Roles**: Strict RBAC model (`client`, `staff`, `admin`).

### A02:2021 — Cryptographic Failures
- **Passwords**: **bcrypt cost 12** hashing. No weak hashing (MD5, SHA-1, plain SHA-256).
- **HIBP Check**: Checked against HaveIBeenPwned API using **k-anonymity** (prefix first 5 SHA-1 hash characters only).
- **Sessions & Tokens**: `httpOnly`, `Secure`, `SameSite=Lax` cookies. Session tokens stored exclusively as SHA-256 hashes (`token_hash`) in DB.

### A03:2021 — Injection
- **Database Queries**: 100% of queries execute via Drizzle ORM using parameterized SQL queries.
- **Input Validation**: **Zod** schemas enforced on 100% of server API endpoints.

### A04:2021 — Insecure Design (Uploads)
- **Magic Bytes Scan**: Binary content header validation (`image/png`, `image/jpeg`, `image/webp`, `application/pdf`) regardless of extension.
- **Secure Storage**: Files renamed to **UUID v4** and stored outside the public web folder (`storage/uploads/`).
- **EXIF Stripping**: Image re-encoding via `sharp` to strip client GPS geolocation metadata.

### A05:2021 — Security Misconfiguration
- **HTTP Security Headers** in `src/middleware.ts`:
  - `Content-Security-Policy` (Strict CSP without `unsafe-inline` for scripts)
  - `Strict-Transport-Security` (`max-age=63072000; includeSubDomains; preload`)
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### A07:2021 — Identification & Authentication Failures
- Progressive account lockout and Turnstile Captcha after 3 failed attempts.
- TOTP 2FA mandatory for `staff` and `admin` roles, optional for `client` role.

### A09:2021 — Security Logging (Audit Log)
- `audit_log` table is **append-only** (no deletion or update allowed).
- Client IP addresses hashed with salt for GDPR compliance.

---

## 📬 2. Vulnerability Reporting Contact

To report a vulnerability or security concern:
- **Email**: `security@zlobodan-couverture.be`
- **Response Commitment**: Within 24 hours.
