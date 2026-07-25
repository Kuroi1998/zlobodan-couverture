# Journal Détaillé des Mises à Jour

## Version 0.1.0 — 25 Juillet 2026

### Résumé
Initialisation et publication de la première version complète de la plateforme Zlobodan Couverture SRL.

### Fonctionnalités ajoutées
- Site vitrine SEO responsive multi-communes belges (Bruxelles, Waterloo, Uccle, Wavre, Ixelles, Namur, Liège).
- Carte interactive Leaflet / OpenStreetMap avec cercle d'intervention de 40 km.
- Wizard devis interactif en 5 étapes avec compression d'image client-side et validation code postal belge.
- Espace Client (`/mon-compte`) : Suivi des devis, acceptation/refus en ligne avec preuve d'IP hachée et horodatage, factures immuables, suivi de chantier par étapes (photos avant/pendant/après), messagerie et paramètres RGPD.
- Back-Office Administration (`/admin`) : Traitement des demandes entrantes, composition de devis, conversion devis → facture immuable et vue du registre d'audit append-only.
- Générateur PDF côté serveur avec mentions légales belges obligatoires.

### Modifications techniques
- Mise en place de Drizzle ORM avec schéma PostgreSQL modulaire (`src/db/schema/*`).
- Intégration du système d'authentification bcrypt cost 12, TOTP 2FA, k-anonymité HIBP et middleware OWASP.
- Service d'upload sécurisé avec validation Magic Bytes et purge EXIF via `sharp`.

### Tests réalisés
- 50/50 tests Vitest validés (logique métier, numérotation séquentielle `FACT-2026-XXXX`, isolation inter-utilisateurs).
- Verification automatique de la taille des fichiers : 138/138 fichiers < 400 lignes.
