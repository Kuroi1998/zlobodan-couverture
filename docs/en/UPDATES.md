# Detailed Updates Log

## Version 0.1.0 — July 25, 2026

### Summary
Initial release of the complete Zlobodan Couverture SRL platform.

### Added Features
- Responsive SEO showcase website for Belgian municipalities (Brussels, Waterloo, Uccle, Wavre, Ixelles, Namur, Liège).
- Leaflet / OpenStreetMap interactive map with a 40 km intervention radius circle.
- Interactive 5-step quote wizard with client-side image compression and Belgian postal code validation.
- Client Portal (`/mon-compte`): Quote tracking, online acceptance/refusal with timestamp and hashed IP proof, immutable invoices, project milestone tracking, messaging, and GDPR controls.
- Admin Back-Office (`/admin`): Inbound request queue, quote composition, quote to immutable invoice conversion, and append-only audit log viewer.
- Server-Side PDF generator with mandatory Belgian legal notices.

### Technical Modifications
- Drizzle ORM setup with modular PostgreSQL schema (`src/db/schema/*`).
- Integration of bcrypt cost 12 authentication, TOTP 2FA, HIBP k-anonymity, and OWASP middleware.
- Secure upload service with Magic Bytes binary validation and EXIF stripping via `sharp`.

### Executed Tests
- 50/50 Vitest test suite passing (business logic, sequential invoicing `FACT-2026-XXXX`, inter-user isolation).
- Automated file size check: 138/138 files < 400 lines limit.
