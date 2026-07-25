**Langues :** Français | [English](README.en.md)

# Zlobodan Couverture SRL — Plateforme Web & Espace Client Belgique

> Plateforme web professionnelle et sécurisée développée pour l'entreprise **Zlobodan Couverture SRL** (couverture-zinguerie à Bruxelles, Brabant Wallon et Wallonie).

![Statut](https://img.shields.io/badge/statut-développement-orange)
![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Accès](https://img.shields.io/badge/dépôt-privé-red)
![Next.js](https://img.shields.io/badge/Next.js-14.2.35-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4.5-blue)

---

## 📋 Présentation

**Zlobodan Couverture** est une plateforme web full-stack moderne combinant un site vitrine haute conversion localisé pour la Belgique, un configurateur interactif de devis en 5 étapes, un **Espace Client (`/mon-compte`)** complet et un **Back-Office d'Administration (`/admin`)**. La sécurité applicative (conformité OWASP Top 10) est traitée comme la priorité numéro un du projet.

### Fonctionnalités disponibles
- **Site vitrine SEO localisé** : Landing pages dédiées par commune belge (Bruxelles, Waterloo, Uccle, Wavre, Ixelles, Namur, Liège).
- **Carte interactive Leaflet / OpenStreetMap** : Centrée sur Bruxelles avec cercle d'intervention de 40 km et marqueurs cliquables sans clé payante Google Maps.
- **Wizard Devis 5 étapes** : Formulaire interactif avec compression d'image client-side, géolocalisation de code postal belge et protection Honeypot anti-spam.
- **Authentification & Sécurité OWASP** : Mots de passe bcrypt cost 12, vérification k-anonymité HaveIBeenPwned, TOTP 2FA, Captcha Turnstile, cookies `httpOnly` et middleware de sécurité (CSP, HSTS, DENY, nosniff).
- **Espace Client (`/mon-compte`)** : Suivi des devis avec acceptation/refus en ligne horodaté + preuve d'IP hachée dans l'audit log, factures immuables, suivi de chantier par étapes (photos avant/pendant/après), messagerie et paramètres RGPD.
- **Back-Office Admin (`/admin`)** : Traitement des demandes entrantes, composition de devis, conversion devis → facture immuable (`FACT-2026-XXXX`) et consultation du registre d'audit append-only.
- **Générateur PDF Côté Serveur** : Édition des devis et factures PDF avec l'ensemble des mentions légales belges obligatoires (N° BCE `BE 0849.201.394`, Décennale AXA `AXA-BE-84920139`).

---

## 🛠️ Technologies Utilisées

| Domaine | Technologie |
|---|---|
| **Front-end** | React 18 / Next.js 14 App Router / TypeScript 5.4 |
| **Back-end & API** | Node.js / Next.js Route Handlers |
| **Base de données** | PostgreSQL / Drizzle ORM |
| **Styles & UI** | Vanilla CSS / Tailwind CSS / Lucide Icons |
| **Cartographie** | Leaflet / OpenStreetMap |
| **Sécurité & Auth** | bcryptjs / speakeasy (TOTP 2FA) / Zod / sharp (Purge EXIF) |
| **Tests & CI** | Vitest / GitHub Actions / Dependabot / CodeQL |

---

## 🚀 Installation & Démarrage

### Prérequis
- Node.js version `20.x` ou supérieure
- npm version `10.x` ou supérieure
- Base de données PostgreSQL (Supabase, Neon ou instance locale)

### 1. Clonage du dépôt & Installation
```bash
git clone git@github.com:USERNAME/zlobodan-couverture.git
cd zlobodan-couverture
npm install
```

### 2. Configuration des variables d'environnement
```bash
cp .env.example .env.local
```

### 3. Exécution des migrations & Seeding
```bash
npm run db:push
npm run db:seed
```

### 4. Lancement en développement
```bash
npm run dev
```
Le site est disponible sur `http://localhost:3000`.

---

## 📜 Scripts Disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Lance le serveur de développement Next.js |
| `npm run build` | Effectue la compilation statique SSG de production |
| `npm run start` | Lance le serveur de production |
| `npm run test` | Exécute la suite de tests automatisés Vitest |
| `npm run check:size` | Vérifie que 100% des fichiers font moins de 400 lignes |
| `npm run lint` | Analyse la qualité du code avec ESLint |

---

## 🏗️ Architecture du Projet

```text
.
├── .github/              # Workflows CI/CD, modèles d'issues & PR
├── docs/                 # Documentation bilingue FR / EN
├── scripts/              # Scripts de validation automatique (size limit, bundle, tests)
├── storage/              # Stockage sécurisé hors dossier public
├── src/
│   ├── app/              # Routes Next.js App Router (/mon-compte, /admin, /api)
│   ├── components/       # Composants UI modulaires (< 200 lignes par fichier)
│   ├── data/             # Données métier et SEO découpées par domaine
│   ├── db/               # Schémas Drizzle ORM modulaires (users, quotes, invoices...)
│   └── lib/              # Services métier, authentification et sécurité OWASP
└── SECURITY.md           # Politique de sécurité et rapport d'audit
```

---

## 🔒 Sécurité

Pour consulter la matrice complète des protections OWASP Top 10 et les modalités de signalement de faille, veuillez lire [SECURITY.md](SECURITY.md).

---

## 📄 Confidentialité

**Ce dépôt est strictement privé.** Son code source, sa documentation, ses données et ses ressources graphiques ne peuvent être copiés, redistribués ou rendus publics sans autorisation écrite préalable.
