# Journal des Modifications (Changelog)

Toutes les modifications importantes apportées au projet **Zlobodan Couverture** sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/), et ce projet adhère au [Gestionnaire de Version Sémantique](https://semver.org/lang/fr/).

---

## [Non publié]

### Corrigé — reproductibilité de la CI (2026-07-30)

- Alignement des postes de développement et de GitHub Actions sur Node.js
  24.18.0 et npm 11.16.0.
- Épinglage du runner Ubuntu et des images PostgreSQL, Mailpit, Gitleaks et
  Semgrep validées par la pipeline.
- Déclaration explicite des permissions de lecture du workflow principal.

### Sécurité — durcissement des requêtes et de la chaîne d'approvisionnement (2026-07-30)

- Refus des mutations `same-site` provenant d'un autre sous-domaine : seule
  une preuve `same-origin` est désormais acceptée.
- Validation stricte du type `application/json` et mesure des limites de corps
  sur les octets UTF-8 réellement reçus.
- Réduction des détails sensibles conservés dans les journaux de sécurité et
  dans les erreurs de livraison SMTP.
- Audit npm bloquant au niveau `high`, déduplication d'`esbuild` et verrouillage
  de `minimatch` sur une version corrigée.
- Ajout de tests unitaires couvrant les contrôles CSRF et la lecture bornée du
  JSON.

### Corrigé — qualité et accessibilité (2026-07-30)

- Rétablissement des erreurs TypeScript et ESLint bloquantes pendant le build,
  puis suppression des imports et paramètres inutilisés détectés.
- Ajout d'indications accessibles sur la navigation mobile, les champs de code
  postal, les titres de page, le focus clavier et la réduction des animations.
- Stabilisation des délais des suites d'intégration et E2E.

### Supprimé — code hors périmètre (2026-07-30)

- Retrait du composant de décision de devis non monté et des modules
  expérimentaux de consommation de jetons et d'URL signées qui n'étaient
  référencés par aucun chemin d'exécution.

### Modifié — reconstruction propre du dépôt (2026-07-28)

L'historique Git a été réinitialisé sur une base saine. L'intégralité de
l'ancien dépôt reste accessible sur la branche `archive/legacy-zlobodan` et au
tag `legacy-before-clean-rebuild`.

- **Tests regroupés sous une racine unique** : les 17 suites unitaires passent
  de `src/__tests__/` à `test/unit/`, aux côtés de `test/integration/`,
  `test/e2e/` et `test/restart/`. Les imports utilisent l'alias `@/` et n'ont
  pas eu à changer.
- **Audits regroupés** sous `docs/audits/`, en nommage kebab-case cohérent.
- **Périmètre produit** versionné sous `docs/product/perimetre-v1.md`.
- **README refondu** : prérequis, installation, configuration, tableau complet
  des scripts, arborescence, sécurité, feuille de route et licence.
- **`CONTRIBUTING.md` corrigé** : il documentait un build statique inexistant
  et `npm run lint` au lieu de `lint:strict`.
- **`SECURITY.md`** : ajout des versions maintenues, du canal de signalement
  privé, des informations à transmettre et des délais de traitement.

### Supprimé — reconstruction propre du dépôt (2026-07-28)

- **`tsconfig.scripts.tsbuildinfo`** : artefact de compilation versionné par
  erreur (198 Ko). Désormais couvert par `*.tsbuildinfo` dans `.gitignore`.
- **`VERSION`** : contenait `0.1.0` alors que `package.json` déclare `1.0.0`,
  et n'était référencé nulle part.
- **`docs/en/` et `docs/fr/`** : quatorze fichiers dupliquant, en plus court et
  sans maintenance, la documentation de référence de `docs/`.
- **`VERSION`**, voir ci-dessus.

### Corrigé — intégration continue (2026-07-28)

Le conteneur Mailpit s'arrêtait au démarrage et interrompait le job avant même
les tests. Cet échec en masquait trois autres, restés invisibles tant que le
job ne dépassait pas l'initialisation des conteneurs.

- **Workflow CI, conteneur Mailpit** : arrêt au démarrage
  (`authentication requires STARTTLS or TLS encryption`). Ajout de
  `MP_SMTP_AUTH_ALLOW_INSECURE`.
- **Tests unitaires** : trois assertions comparaient le nom du cookie de
  session à la valeur par défaut codée en dur, alors que la CI surcharge
  `SESSION_COOKIE_NAME`. Les tests fixent désormais eux-mêmes la variable ou
  dérivent l'attendu de la constante exportée. Vérifié sous trois noms
  différents.
- **Tests d'intégration** : `NOTIFICATION_ADMIN_EMAIL` n'était pas défini en
  CI. `getNotificationRecipient()` rendant `null` hors production, une seule
  entrée d'outbox était produite au lieu des deux attendues (accusé au client
  et alerte interne).
- **Vitrine GitHub Pages** : le workflow échouait au pré-rendu de
  `/reinitialisation-mot-de-passe`. Il ne retirait que
  `src/app/{admin,mon-compte,connexion,api}` avant l'export statique, alors que
  `/reinitialisation-mot-de-passe`, `/verification-email`,
  `/confirmation-changement-email` et `/mot-de-passe-oublie` exigent également
  un serveur. La liste est complétée et l'export vérifié : 21 pages générées.
- **Gitleaks** : le scan est borné à l'ascendance de la référence testée
  (`--log-opts HEAD`). Le checkout récupère toutes les références : sans cette
  borne, chaque exécution rejouait `archive/legacy-zlobodan` et signalait des
  charges JSON d'exemple de l'ancienne documentation d'API — des faux positifs
  `generic-api-key`, sans aucun secret réel.
- **Workflow Securite** : Semgrep bloquait sur `gcm-no-tag-length`. La longueur
  du tag d'authentification AES-256-GCM est désormais explicite
  (`authTagLength: 16`) dans `src/lib/security/secret-box.ts` et les trois
  scripts concernés. Comportement inchangé : 16 octets est déjà la valeur par
  défaut, et `secret-box.ts` validait déjà la longueur au déchiffrement.

### Supprimé — audit éditorial, visuel, juridique et commercial (2026-07-27)

L’audit a établi que le site dérivait d’un **modèle conçu pour une entreprise
française de la région nantaise**, re-libellé en belge sans que les données
soient remplacées. En ont été retirés :

- **Six témoignages clients nominatifs** marqués « vérifiés Google », et six
  avis supplémentaires intégrés aux réalisations : personnes inventées.
- **La note « 4,9/5 sur 124+ avis Google »**, affichée dans l’en-tête et le
  Hero, et le balisage `aggregateRating` correspondant dans les données
  structurées — un balisage d’avis inventé contrevient aux règles des moteurs.
- **Six réalisations présentées comme des chantiers réels**, dont les
  identifiants désignaient des communes de l’agglomération nantaise
  (`nantes`, `orvault`, `vertou`, `carquefou`) sous des noms de villes belges.
- **Cinq images de 1 à 2 Ko** — des fichiers de substitution, sans origine ni
  licence documentées — et la référence à `/images/logo.png`, absent du dépôt.
- **Le numéro BCE `BE 0849.201.394`**, le capital social, le numéro de police
  `POL-DEC-BE-849201` et les assureurs cités (« AXA Belgium / Ethias »,
  « SMA BTP » — ce dernier étant français).
- **Les certifications françaises** RGE, Qualibat et « Artisan Certifié ».
- **Les coordonnées de démonstration** `02 345 67 89` et `0470 12 34 56`.
- **Les pages locales Namur et Liège**, à 60 et 90 km, incompatibles avec le
  rayon de 40 km annoncé par ailleurs.

### Corrigé

- **Mentions légales réécrites pour le droit belge.** Elles appliquaient un
  modèle français à une société présentée comme belge : « SAS », « SIRET »,
  « RCS », et une assurance « valable pour l’ensemble du territoire français ».
  La description SEO situait de surcroît l’entreprise « à Nantes ».
- **Politique de confidentialité alignée sur le livré** : comptes, sessions,
  double authentification, pièces jointes, documents PDF et journaux d’audit y
  figurent désormais ; aucune mesure d’audience n’est mentionnée, le site n’en
  chargeant aucune.
- **Domaine canonique unifié.** Le plan de site déclarait `.fr` quand les
  données structurées déclaraient `.be`.
- **Vérificateurs de code postal.** Les deux — Hero et carte — répondaient
  « votre commune est dans notre zone » à *n’importe quelle* saisie à quatre
  chiffres.
- **`reservePublicReference`** n’est plus la seule source d’identité : les
  coordonnées publiques et le destinataire des notifications internes sont
  désormais distincts, via `NOTIFICATION_ADMIN_EMAIL`.
- **Engagements reformulés** : « 24h/24 7j/7 », « devis sous 48h »,
  « intervention sous 2h », « diagnostic gratuit à domicile », « 18 ans
  d’expérience », « plus de 700 toitures » et les fourchettes « 90 € à 185 € par
  m² » ont laissé place à des formulations proportionnées.

### Ajouté

- **`src/config/company.ts`** : source unique de l’identité d’entreprise. Les
  champs non prouvés sont typés `string | null` et valent `null`, ce qui oblige
  chaque page à traiter l’absence plutôt qu’à afficher une valeur vide.
- **`ContactActionButton`** : les appels à l’action téléphoniques se rabattent
  sur le formulaire tant qu’aucun numéro n’est vérifié.
- **Garde-fou de contenu** (`src/__tests__/contentIntegrity.test.ts`, 25 tests) :
  détecte placeholders, coordonnées de démonstration, notes codées en dur,
  `aggregateRating`, certifications françaises, assureurs nommés, promesses de
  délai, communes nantaises résiduelles, images référencées mais absentes, et
  incohérence entre pages locales et zone déclarée.
- Documentation : `docs/content-verification-register.md` (registre des preuves
  à réunir) et `docs/content-guidelines.md` (règles de rédaction).

### Ajouté — infrastructure documentaire
- **Infrastructure documentaire réelle** : génération serveur de PDF avec
  `pdf-lib`, stockage privé versionné, empreinte SHA-256 par version et
  contrôle d’accès serveur à chaque consultation.
- **Tables `documents` et `document_versions`** (migration
  `0005_documents.sql`) : identité d’un côté, fichiers de l’autre, avec
  référence publique `REC-2026-000042` issue de la séquence
  `seq_document_reference`. Une contrainte `CHECK` interdit une version
  « prête » sans fichier ni empreinte.
- **Récapitulatif de demande** généré depuis PostgreSQL, avec moteur de mise en
  page maison : tableaux paginés à en-tête répété, pied de page numéroté,
  translittération WinAnsi rendant impossible l’échec sur une saisie libre.
- **Routes `/api/documents/[publicId]/download` et `/preview`**, servies par la
  même résolution et sans redirection vers le stockage, plus
  `POST /api/admin/demandes/[id]/documents` pour la génération.
- **Génération idempotente** : une demande inchangée réutilise sa version ;
  `force` émet explicitement une nouvelle version, l’ancienne étant conservée.
- **`/mon-compte/documents`** liste désormais les documents établis en plus des
  pièces jointes ; `/admin/demandes/[id]` expose génération et historique des
  versions.
- Documentation : `docs/documents.md`.

### Corrigé
- **Faux PDF supprimés.** `lib/services/pdf-service.ts` produisait du HTML servi
  en `text/html` sous un nom de fichier `.html`, exposé par
  `/api/pdf/quote/[id]` et `/api/pdf/invoice/[id]`. Ces deux routes étaient de
  surcroît inatteignables, `quotes` et `invoices` n’ayant aucun chemin
  d’écriture dans l’application : les liens « Ouvrir » de `/admin/devis`,
  `/admin/factures` et `/mon-compte/factures` étaient morts par construction.
  Routes, générateur et liens retirés.
- **`reservePublicReference` aiguillait par ternaire** : « tout ce qui n’est pas
  un contact » désignait la demande de devis. L’ajout d’un troisième type aurait
  puisé dans la mauvaise séquence et produit deux documents au même numéro.
  Remplacé par un aiguillage exhaustif.

### Ajouté (antérieurement)
- **Socle d’authentification complet** : inscription avec consentements,
  vérification et renvoi d’email, connexion/déconnexion, récupération et
  changement de mot de passe, changement d’adresse confirmé.
- **Gestion des appareils** dans `/mon-compte/securite` : liste, expiration,
  révocation ciblée, des autres appareils ou globale après réauthentification.
- **2FA TOTP complète** : QR local, secret AES-256-GCM, challenge serveur
  temporaire, anti-rejeu par pas temporel, dix codes de récupération hachés à
  usage unique, désactivation et régénération fortes.
- **Administration des comptes** dans `/admin/comptes` : statut, sessions,
  activité de sécurité, révocation et déclenchement d’une réinitialisation.
- **Outbox d’authentification** : quinze modèles texte/HTML, liens absolus,
  charges sensibles chiffrées, cinq tentatives et TLS SMTP vérifié.
- **Journal `security_events`** et migration versionnée
  `0004_auth_foundation.sql`.
- **Rotation contrôlée de la clé d’authentification** avec
  `npm run auth:rotate-encryption-key`.
- **Parcours Playwright d’authentification** : inscription, vérification,
  récupération, TOTP, récupération de secours et appareils.
- Documentation : `docs/authentication.md`, `docs/accounts.md`,
  `docs/sessions.md`, `docs/two-factor-authentication.md` et
  `docs/email-delivery.md`.
- **Écran de détail d'une demande client** (`/mon-compte/demandes/[reference]`) :
  suivi, pièces jointes, étapes, annulation. Le contrôle d'appartenance est
  dans la clause `where`, et un refus est indiscernable d'une référence
  inexistante.
- **Annulation d'une demande par le client**, soumise à la machine à états,
  avec historique et audit dans une même transaction.
- **Modification du profil** : le téléphone est réellement modifiable, avec
  liste blanche de champs. L'écran de paramètres était jusqu'ici entièrement en
  lecture seule.
- **Fermeture des autres sessions** depuis l'espace client.
- **Notes internes persistantes** : table dédiée avec auteur, horodatage et
  historique, remplaçant une colonne écrasée à chaque changement de statut.
- **Notification client au changement de statut** d'une demande, insérée dans
  l'outbox au sein de la transaction de transition.
- **Jeu de recette réel** (`npm run db:seed`) : quatre comptes dont les secrets
  TOTP, quatre demandes, trois contacts, deux notes. Idempotent, exige
  `SEED_PASSWORD`, refusé en production. Le script était un squelette vide.
- **Pagination serveur** sur toutes les listes de l'espace client, états de
  chargement (`loading.tsx`) et frontières d'erreur (`error.tsx`) par zone.
- **Journalisation `document.downloaded`** : un téléchargement de pièce jointe
  est un accès à une donnée personnelle et laisse désormais une trace.
- Documentation : [docs/api.md](docs/api.md), [docs/testing.md](docs/testing.md).

### Modifié
- Les comptes possèdent désormais un `public_id`, un email normalisé unique,
  un statut fermé, prénom/nom, dates de changement et de désactivation.
- Les secrets TOTP historiques sont chiffrés avant suppression de leurs
  anciennes colonnes ; les hashes de mot de passe et relations sont préservés.
- La réutilisation d’un cookie révoqué est refusée et auditée sans révoquer les
  sessions légitimes restantes.
- bcrypt est centralisé au coût 12 avec détection et rehash après connexion.
- **Libellés de statut en français partagés** entre l'espace client et le
  back-office. Le client lisait `estimate_in_preparation` là où l'opérateur
  lisait « Devis en préparation ».
- **Enveloppe de réponse d'API normalisée** et codes HTTP corrects, construits
  exclusivement par `src/lib/api/responses.ts`.
- Routes renommées pour lever la confusion entre demande et devis commercial :
  `/mon-compte/devis` → `/mon-compte/demandes`,
  `/api/admin/devis/[id]/status` → `/api/admin/demandes/[id]/status`.
- Onglets client renommés : « Messagerie » → « Mes échanges » (lecture seule
  assumée), « Mes documents » → « Mes pièces jointes ».
- Requêtes de liste : projections explicites au lieu de `select()`, et
  agrégats calculés par PostgreSQL — la version précédente chargeait vingt-trois
  colonnes pour en afficher huit.

### Supprimé
- **Six indicateurs structurellement nuls** des deux tableaux de bord : devis
  commerciaux émis, montant HT, chantiers actifs, montant à encaisser, devis à
  examiner, pièces jointes. Ils lisaient bien PostgreSQL, mais sur des tables
  qu'aucun chemin d'écriture n'alimente.
- Liens de navigation `/admin/chantiers` et `/admin/clients`, dont les pages
  n'existent pas.

### Sécurité
- Le rôle `staff` passe à une **liste blanche de ressources** : il avait
  jusqu'ici `manage` sur `users`, donc en droit la capacité d'élever un rôle.
- Le **journal d'audit** est réservé à `admin` : un opérateur y lisait
  l'activité de tous et les empreintes d'IP.
- Contrainte `CHECK` sur `users.role`.
- Garde de rôle propre à **chaque** page du back-office, en plus du layout.

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
