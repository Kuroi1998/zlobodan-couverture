# Changelog

All notable changes to the **Zlobodan Couverture** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Roadmap preparation for version 0.2.0.

---

## [0.1.0] - 2026-07-25

### Added
- **Initial private release of the project on GitHub**.
- **Next.js 14 App Router & TypeScript Architecture**: 46 static SSG pages generated.
- **PostgreSQL Database & Drizzle ORM**: Modular domain schemas (`users`, `sessions`, `tokens`, `quotes`, `invoices`, `projects`, `documents`, `messages`, `audit_log`).
- **Authentication & OWASP Security**: bcrypt cost 12 hashing, HaveIBeenPwned k-anonymity check, TOTP 2FA, Turnstile Captcha, and security middleware (CSP, HSTS, DENY, nosniff).
- **Secure Upload Service**: Magic Bytes binary detection, UUID v4 renaming, and `sharp` EXIF stripping.
- **Client Portal (`/mon-compte`)**: Quote tracking with online timestamped acceptance/refusal + hashed IP audit log proof, immutable invoices, and project milestone tracking.
- **Admin Back-Office (`/admin`)**: Quote composition, quote to immutable invoice conversion, and append-only audit log viewer.
- **Server-Side PDF Generator**: Outputting PDF quotes and invoices with mandatory Belgian legal notices (BCE N° `BE 0849.201.394`, AXA Decennial Insurance `AXA-BE-84920139`).
- **Automated Test Suite**: 50/50 tests passing under Vitest and automated file size limit check (`npm run check:size`).
- **Bilingual Documentation**: Comprehensive documentation in French and English (`README`, `SECURITY`, `CONTRIBUTING`, `ARCHITECTURE`, `DATABASE`, `API`).
