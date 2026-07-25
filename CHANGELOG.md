# Journal des Modifications (Changelog)

Toutes les modifications importantes apportées au projet **Zlobodan Couverture** sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/), et ce projet adhère au [Gestionnaire de Version Sémantique](https://semver.org/lang/fr/).

---

## [Non publié]

### Ajouté
- Préparation de la feuille de route pour la version 0.2.0.

---

## [0.1.0] - 2026-07-25

### Ajouté
- **Première publication privée du projet sur GitHub**.
- **Architecture Next.js 14 App Router & TypeScript** : 46 pages statiques SSG générées.
- **Base de Données PostgreSQL & Drizzle ORM** : Schémas modulaires (`users`, `sessions`, `tokens`, `quotes`, `invoices`, `projects`, `documents`, `messages`, `audit_log`).
- **Authentification & Sécurité OWASP** : Hachage bcrypt cost 12, vérification HaveIBeenPwned (k-anonymité), TOTP 2FA, Turnstile Captcha et middleware (CSP, HSTS, DENY, nosniff).
- **Service d'Upload Sécurisé** : Validation binaire par Magic Bytes, UUID v4 et ré-encodage `sharp` pour la purge des métadonnées EXIF.
- **Espace Client (`/mon-compte`)** : Suivi des devis avec acceptation/refus en ligne horodaté + preuve d'IP hachée dans l'audit log, factures immuables et suivi de chantier par étapes.
- **Back-Office Administration (`/admin`)** : Composition de devis, conversion devis → facture immuable et vue du registre d'audit append-only.
- **Générateur PDF Côté Serveur** : Édition des devis et factures PDF avec toutes les mentions légales belges obligatoires (BCE `BE 0849.201.394`, Décennale AXA `AXA-BE-84920139`).
- **Suite de Tests Automatisés** : 105/105 tests réussis sous Vitest et vérification automatique de la taille des fichiers (`npm run check:size`).
- **Documentation Bilingue** : Documentation complète en français et en anglais (`README`, `SECURITY`, `CONTRIBUTING`, `ARCHITECTURE`, `DATABASE`, `API`).
