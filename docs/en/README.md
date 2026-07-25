**Languages:** [Français](README.md) | English

# Zlobodan Couverture SRL — Web Platform & Client Portal Belgium

> Professional and secure full-stack web platform developed for **Zlobodan Couverture SRL** (Roofing and Zincing company in Brussels, Walloon Brabant, and Wallonia).

![Status](https://img.shields.io/badge/status-development-orange)
![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Access](https://img.shields.io/badge/repository-private-red)
![Next.js](https://img.shields.io/badge/Next.js-14.2.35-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4.5-blue)

---

## 📋 Overview

**Zlobodan Couverture** is a modern full-stack web platform combining a high-converting localized SEO showcase site for Belgium, an interactive 5-step quote wizard, a comprehensive **Client Portal (`/mon-compte`)**, and an **Administration Back-Office (`/admin`)**. Application security (OWASP Top 10 compliance) is treated as the project's highest priority.

### Key Features
- **Localized SEO Showcase Site**: Dedicated landing pages per Belgian municipality (Brussels, Waterloo, Uccle, Wavre, Ixelles, Namur, Liège).
- **Interactive Leaflet / OpenStreetMap**: Centered on Brussels with a 40 km intervention radius circle and clickable markers without Google Maps paid keys.
- **5-Step Quote Wizard**: Interactive form with client-side image compression, Belgian postal code validation, and Honeypot anti-spam protection.
- **OWASP Authentication & Security**: bcrypt cost 12 hashing, HaveIBeenPwned k-anonymity check, TOTP 2FA, Turnstile Captcha, `httpOnly` cookies, and security middleware (CSP, HSTS, DENY, nosniff).
- **Client Portal (`/mon-compte`)**: Quote tracking with online timestamped acceptance/refusal + hashed IP audit log proof, immutable invoices, project milestone tracking (before/during/after photos), messaging, and GDPR settings.
- **Admin Back-Office (`/admin`)**: Inbound request processing, quote composition, quote to immutable invoice conversion (`FACT-2026-XXXX`), and append-only audit log viewer.
- **Server-Side PDF Generator**: Outputting official PDF quotes and invoices with mandatory Belgian legal notices (BCE N° `BE 0849.201.394`, AXA Decennial Insurance `AXA-BE-84920139`).

---

## 🛠️ Technology Stack

| Domain | Technology |
|---|---|
| **Front-end** | React 18 / Next.js 14 App Router / TypeScript 5.4 |
| **Back-end & API** | Node.js / Next.js Route Handlers |
| **Database** | PostgreSQL / Drizzle ORM |
| **Styling & UI** | Vanilla CSS / Tailwind CSS / Lucide Icons |
| **Mapping** | Leaflet / OpenStreetMap |
| **Security & Auth** | bcryptjs / speakeasy (TOTP 2FA) / Zod / sharp (EXIF Stripping) |
| **Testing & CI** | Vitest / GitHub Actions / Dependabot / CodeQL |

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js `20.x` or higher
- npm `10.x` or higher
- PostgreSQL Database (Supabase, Neon, or local instance)

### 1. Clone & Install
```bash
git clone git@github.com:USERNAME/zlobodan-couverture.git
cd zlobodan-couverture
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env.local
```

### 3. Database Migration & Seeding
```bash
npm run db:push
npm run db:seed
```

### 4. Development Mode
```bash
npm run dev
```
Access the application at `http://localhost:3000`.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Next.js development server |
| `npm run build` | Builds the production SSG static bundle |
| `npm run start` | Starts the production server |
| `npm run test` | Runs the Vitest automated test suite |
| `npm run check:size` | Verifies 100% of files stay under 400 lines |
| `npm run lint` | Runs ESLint code quality checks |

---

## 🔒 Security

To read the complete OWASP Top 10 protection matrix and vulnerability reporting guidelines, please check [SECURITY.en.md](SECURITY.en.md).

---

## 📄 Privacy Notice

**This repository is strictly private.** Its source code, documentation, data, and visual assets may not be copied, redistributed, or made public without prior written authorization.
