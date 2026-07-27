# Périmètre fonctionnel officiel — Zlobodan

> Document de référence du cadrage. Il fixe **ce qui sera livré**, dans quelle
> version, et avec quel résultat observable.
>
> - Matrice de décision par fonctionnalité → [feature-matrix.md](feature-matrix.md)
> - Rôles et permissions → [roles-and-permissions.md](roles-and-permissions.md)
> - Phases, priorités et dépendances → [delivery-roadmap.md](delivery-roadmap.md)
>
> Date du cadrage : 27 juillet 2026. Base auditée : commit `07b78c9`, branche `main`.

---

## 1. Vision

Zlobodan Couverture est une entreprise de couverture belge. L'application a
**trois** raisons d'exister, dans cet ordre :

1. **Capter la demande** — un visiteur doit pouvoir demander un devis ou
   écrire à l'entreprise, et cette demande ne doit jamais se perdre.
2. **Traiter la demande** — l'équipe doit disposer d'un back-office qui
   remplace la boîte mail : liste, filtre, statut, affectation, notes, trace.
3. **Rassurer le client** — un client peut consulter en ligne l'état de sa
   demande et récupérer ses documents, sans téléphoner.

Tout ce qui ne sert pas directement l'un de ces trois objectifs est reporté ou
supprimé. L'application **n'est pas** un ERP, ni un logiciel comptable, ni un
CRM, ni un outil de planification d'équipes.

## 2. Utilisateurs réels

| Utilisateur | Réalité métier | Volume attendu |
| --- | --- | --- |
| Visiteur | Particulier belge cherchant un couvreur | Majorité du trafic |
| Client | Visiteur ayant créé un compte pour suivre sa demande | Faible, croissant |
| Opérateur (`staff`) | Personne du bureau qui traite les demandes | 1 à 3 personnes |
| Administrateur (`admin`) | Gérant de la SRL | 1 personne |

Il n'existe **pas** d'utilisateur « employé de chantier » aujourd'hui. Les
rôles `employee`, `manager` et `super_admin` évoqués en cadrage initial sont
**écartés** : voir [roles-and-permissions.md](roles-and-permissions.md).

---

## 3. Résultat de l'audit fonctionnel

Méthode : lecture exhaustive de `src/app`, `src/components`, `src/lib`,
`src/db`, `src/domain`, `src/services`, des 3 migrations SQL et des 11 suites
de tests ; recherche des motifs `mock`, `demo`, `fake`, `placeholder`, `TODO`,
`coming soon`, `localStorage`, `Math.random`, `setTimeout`.

### 3.1 Bonne nouvelle : il n'y a pas de fausses données

Aucun tableau statique, aucun `mock`, aucune donnée de démonstration codée en
dur dans les écrans client ou administrateur. Chaque page authentifiée
interroge réellement PostgreSQL et filtre par propriétaire. Le seul
`localStorage` du projet sert au consentement cookies, ce qui est correct.

**Le problème n'est donc pas la fausse donnée. C'est la donnée impossible.**

### 3.2 Le vrai défaut : six tables sans aucun chemin d'écriture

| Table | Lue par l'application | Écrite par l'application | Conséquence |
| --- | --- | --- | --- |
| `quotes` | oui (4 écrans) | **non** | Aucun devis commercial ne peut exister |
| `quote_lines` | oui (PDF) | **non** | Aucune ligne de prestation |
| `invoices` | oui (3 écrans) | **non** | Aucune facture ne peut exister |
| `projects` | oui (3 écrans) | **non** | Aucun chantier ne peut exister |
| `documents` | **non** | **non** | Table morte |
| `messages` | **non** | **non** | Table morte |
| `credit_notes` | **non** | **non** | Table morte |

En pratique, sur une installation propre, ces écrans sont **définitivement
vides** — pas « vides pour l'instant », vides pour toujours. Sont donc
concernés :

- `/mon-compte/devis`, section « Devis commerciaux reçus » ;
- `/mon-compte/factures` en totalité ;
- `/mon-compte/chantiers` en totalité ;
- `/admin/devis` (intitulé « Créer / Gérer Devis », sans aucune création) ;
- `/admin/factures` (intitulé « Facturation Immuable ») ;
- les compteurs « Devis à examiner », « Devis commerciaux émis », « Chantiers
  actifs », « € à encaisser » des deux tableaux de bord — tous figés à zéro ;
- le composant `QuoteDecisionButtons` (accepter / refuser) et les routes
  `/api/client/devis/[id]/accept|refuse`, correctement écrits mais
  inatteignables ;
- les routes `/api/pdf/quote/[id]` et `/api/pdf/invoice/[id]`.

Le code de décision, la machine à états, la numérotation séquentielle et le
contrôle d'appartenance sont de bonne qualité. **Il manque le début de la
chaîne, pas la fin.**

### 3.3 Défauts bloquants identifiés

| # | Défaut | Emplacement | Gravité |
| --- | --- | --- | --- |
| B1 | Le back-office est **inaccessible** sur une installation propre : le TOTP est obligatoire pour `staff`/`admin`, et aucune route d'enrôlement n'existe | `src/lib/services/auth-service.ts` | Bloquant |
| B2 | Deux liens de navigation pointent vers des pages inexistantes → 404 | `src/app/admin/layout.tsx` (`/admin/chantiers`, `/admin/clients`) | Bloquant |
| B3 | Collision de référence : une **demande** est numérotée `DEV-2026-000123` et un **devis commercial** `DEV-2026-0001`. Le client ne peut pas les distinguer | `src/lib/db/public-references.ts` vs `src/lib/db/numbering.ts` | Bloquant |
| B4 | Le jeton de vérification d'e-mail est créé en base mais jamais envoyé, et aucune route ne le consomme | `auth-service.ts`, `token-consumption.ts` | Élevée |
| B5 | Aucune route de réinitialisation de mot de passe malgré la table `password_reset_tokens` | — | Élevée |
| B6 | Aucun moyen de changer son mot de passe une fois connecté | — | Élevée |
| B7 | `npm run db:seed` est un squelette vide : rien à tester en local | `src/db/seed.ts` | Élevée |

### 3.4 Écrans dont l'intitulé ment sur le contenu

| Écran | Annonce | Réalité |
| --- | --- | --- |
| `/mon-compte/messages` — « Messagerie » | une messagerie | historique **en lecture seule** des messages de contact ; aucun envoi, aucune réponse visible |
| `/mon-compte/documents` — « Mes Documents » | des documents | uniquement les **pièces jointes** que le client a lui-même téléversées |
| `/admin/devis` — « Créer / Gérer Devis » | création | table en lecture seule |
| `/admin/factures` — « Facturation Immuable » | facturation | table en lecture seule |
| `/api/pdf/*` — « Télécharger le PDF » | un PDF | du `text/html` |
| `/mon-compte/parametres` | des paramètres | fiche **entièrement non modifiable** |

### 3.5 Confusion de vocabulaire

`/admin/devis` affiche la table `quotes` (devis commerciaux), alors que
`/api/admin/devis/[id]/status` modifie la table `quote_requests` (demandes).
Le même mot désigne deux objets différents dans la même arborescence.

### 3.6 Ce qui fonctionne réellement, de bout en bout

Ces parcours sont complets, persistants, contrôlés et testés :

1. **Formulaire de contact** — idempotence, honeypot, contrôle de délai de
   saisie, quota IP et e-mail, Turnstile, consentement horodaté et versionné,
   référence `CNT-AAAA-NNNNNN`, notification via outbox.
2. **Assistant de devis en 5 étapes** — mêmes protections, pièces jointes
   vérifiées (magic bytes, taille, MIME, checksum), stockage privé, brouillon
   serveur pour les comptes connectés, rattachement au compte.
3. **Inscription, connexion, déconnexion** — sessions opaques, bcrypt,
   verrouillage progressif, journal d'événements de sécurité, réponses
   uniformes anti-énumération.
4. **Back-office contacts et demandes** — liste paginée, recherche, filtre,
   détail, transition de statut par liste blanche, motif, notes internes,
   affectation, historique complet.
5. **Journal d'audit** en lecture seule.
6. **Export RGPD** JSON, sans secrets ni notes internes.
7. **Téléchargement des pièces jointes**, refusé en 404 si le demandeur n'est
   pas propriétaire.
8. **Outbox d'e-mails** durable, cinq tentatives à délai exponentiel.

---

## 4. Périmètre retenu — Espace client

La règle appliquée : **un module n'est livré que si un client peut y voir
quelque chose le jour de la mise en ligne.**

### 4.1 Tableau de bord client — **A, livré en V1**

Contenu : message d'accueil avec l'adresse du compte, nombre de demandes
actives, dernier statut connu, trois dernières demandes, coordonnées de
l'entreprise, raccourci vers le formulaire de demande.

**Retiré** : les tuiles « Devis à examiner » et « Pièces jointes » telles
qu'aujourd'hui. La première restera à zéro tant que le module devis
commerciaux n'est pas livré ; la seconde n'est pas une information utile.

Source : `quote_requests` filtrée sur `user_id`.

### 4.2 Profil et paramètres — **B, version simplifiée en V1**

| Information | Décision |
| --- | --- |
| E-mail | Affiché, **non modifiable** en V1 (exige une double confirmation, reportée V2) |
| Téléphone | **Modifiable** |
| Nom / prénom | **Reporté V2** — la table `users` n'a pas ces colonnes ; la migration attend |
| Mot de passe | **Modifiable**, avec saisie du mot de passe actuel, révocation des autres sessions et notification |
| Préférences de communication | **Supprimé** — un seul canal existe (e-mail transactionnel) |
| Consentements | Affichage de la version de politique acceptée, lecture seule |
| Export des données | **Conservé**, déjà fonctionnel |
| Suppression du compte | **B** — demande par e-mail, traitement manuel tracé. Pas d'auto-suppression : des documents comptables sont rattachés |

Sessions actives et état du double facteur restent affichés en lecture seule.

### 4.3 Demandes de devis — **A, livré en V1 (priorité maximale)**

Le client peut : consulter la liste de ses demandes, voir référence, date,
type d'intervention, type de toiture, surface, urgence, statut lisible en
français, pièces jointes, et créer une nouvelle demande.

Décisions explicites :

- **Modifier une demande soumise : non.** Une demande est un événement daté.
  Le client ajoute une précision, il ne réécrit pas l'historique.
- **Annuler une demande : oui**, tant que le statut est `submitted` ou
  `under_review`. Transition déjà déclarée dans la machine à états.
- **Ajouter des photos après soumission : reporté V2.**
- **Envoyer un message lié à la demande : reporté V2** (voir 4.7).

**À corriger avant livraison** : les statuts sont aujourd'hui affichés bruts
(`estimate_in_preparation`) dans l'espace client. Les libellés français
existent déjà côté admin et doivent être partagés.

### 4.4 Devis commerciaux — **C, reporté en V2**

Décision ferme : **le module n'est pas livré en V1 et disparaît de
l'interface.**

Justification : rien ne permet d'en créer un. Livrer la consultation d'un
objet que personne ne peut produire, c'est livrer une section vide.

L'**acceptation électronique** est reportée avec le module. Quand elle sera
livrée, elle devra apporter : identité de l'accepteur, horodatage serveur,
empreinte d'IP salée, version figée du document, impossibilité de modifier le
devis accepté, accusé de réception e-mail. Les briques existent déjà
(`quote-decision-service.ts`, `state-machine.ts`) — c'est le seul module
reporté dont le code est déjà écrit et testé. Il est **conservé en dépôt**,
pas supprimé.

### 4.5 Factures — **F, à confirmer avec le client, par défaut hors V1**

Question métier ouverte, à trancher avant la Phase 5 :

1. Les factures sont-elles produites dans Zlobodan ou dans un logiciel
   comptable existant (Winbooks, Odoo, Yuki…) ?
2. Si elles sont externes, veut-on seulement les **déposer** pour que le
   client les récupère ?
3. Le suivi de paiement doit-il vivre ici ou dans la comptabilité ?

**Position par défaut, si la réponse n'arrive pas : hors périmètre.** La
facturation belge est réglementée ; dupliquer une source comptable dans une
application web crée une seconde vérité, ce qui est pire que pas de
fonctionnalité du tout.

Si le client confirme un besoin, la version retenue sera minimale :
téléversement d'un PDF par l'administration, rattachement au compte, montant,
date d'émission, échéance, statut `à payer / payée / en retard`,
téléchargement côté client. **Aucun moteur de calcul, aucun paiement en
ligne.**

### 4.6 Chantiers — **C, reporté en V2**

Même raisonnement que les devis commerciaux : aucun chemin de création.
L'onglet est retiré de l'espace client en V1.

Version prévue en V2, volontairement pauvre : titre, adresse, statut, dates
prévues, interlocuteur, documents partagés. **Aucun pourcentage
d'avancement** — un pourcentage sans source de vérité est une invention.

Reportés au-delà de V2 : planning détaillé, diagrammes, rapports quotidiens,
géolocalisation, présence des équipes, gestion des matériaux, signatures
multiples.

### 4.7 Documents — **B, version simplifiée en V1**

Ce que l'onglet montre réellement aujourd'hui — les pièces jointes du client —
est correct et sécurisé. Il est **conservé, mais renommé** « Mes pièces
jointes », avec le nom de la demande liée.

La table `documents` (attestations, garanties, décennale, PV de réception) est
**reportée V2**. Elle sera alors reliée aux chantiers.

Règle non négociable, déjà respectée : le contrôle d'appartenance se fait sur
la ligne chargée en base, et un refus répond `404`, jamais `403`.

### 4.8 Messagerie — **E, supprimée / A, remplacée**

Ni modèle A (messagerie complète) ni modèle B (fil lié au devis) en V1.

Décision : l'onglet « Messagerie » est **supprimé** et remplacé par
**« Mes échanges »**, un historique en lecture seule des messages de contact
envoyés depuis le compte — c'est exactement ce que la page fait déjà, sous un
nom honnête. Le bouton d'action est un lien vers le formulaire de contact.

Le fil de discussion lié à une demande (modèle B) est **reporté V2**. La table
`messages` reste en base sans code : elle est **supprimée** du schéma pour
éviter une table morte, et sera recréée avec le module.

### 4.9 Notifications — **B, version simplifiée en V1**

Livré : e-mail transactionnel via l'outbox existant, pour l'accusé de
réception client et l'alerte administrateur, sur contact et sur demande de
devis. Ajout en V1 : e-mail de **changement de statut** d'une demande.

Reporté : notifications dans l'application, centre de notifications, SMS,
temps réel, rappels de rendez-vous.

**Dépendance dure** : l'outbox n'expédie rien sans configuration SMTP et sans
exécution planifiée de `npm run notifications:dispatch`. Sans cela, la V1 est
muette. À traiter en Phase 1.

---

## 5. Périmètre retenu — Administration

### 5.1 Tableau de bord administrateur — **B, version simplifiée en V1**

Conservé : demandes entrantes actives et total, contacts non lus et total,
dix dernières demandes avec accès direct.

**Retiré** : les tuiles « Devis commerciaux émis », « € HT », « Chantiers
actifs » et « € à encaisser ». Elles sont réelles au sens technique — elles
lisent PostgreSQL — mais elles ne peuvent afficher que zéro.

### 5.2 Gestion des contacts — **A, livré en V1**

Déjà complet : liste paginée, recherche, filtre par statut, détail, transition
contrôlée, motif, notes internes, affectation, historique, audit.

Ajout V1 : bouton `mailto:` pré-rempli avec la référence et le nom.
**La réponse ne part pas depuis l'application** — ni relais SMTP sortant
nominatif, ni gestion de fil, ni suivi de délivrabilité en V1.

Ajout V1 : marquage « indésirable » déjà présent dans la machine à états, à
exposer clairement dans l'interface.

### 5.3 Gestion des demandes de devis — **A, livré en V1**

Déjà complet. Ajouts V1 :

- lien direct vers la fiche client si la demande est rattachée à un compte ;
- **interdiction explicite** de modifier les coordonnées saisies par le
  client. Une correction se fait par une note interne, jamais par réécriture
  de la déclaration d'origine.

### 5.4 Création de devis commerciaux — **C, reporté V2**

Version prévue en V2, **simplifiée** : création depuis une demande, montant
HT, TVA belge (6 % ou 21 %), résumé libre, validité, téléversement d'un PDF
produit à l'extérieur, envoi au client, statut.

Explicitement **hors périmètre même en V2** : catalogue de prestations, moteur
de remises, versions successives du document, bibliothèque de modèles.

### 5.5 Gestion des factures — **F, à confirmer** (voir 4.5)

### 5.6 Gestion des chantiers — **C, reporté V2**

Création **manuelle uniquement**, jamais automatique. Un devis accepté
n'ouvre pas un chantier : la planification est une décision humaine.

Statuts retenus, plus pauvres que la proposition initiale :
`planned` → `in_progress` → `completed`, plus `cancelled`. Les états
`scheduled` et `paused` sont **supprimés** — ils dupliquent `planned` et
`in_progress` sans changer d'action métier.

### 5.7 Gestion des utilisateurs — **B, version simplifiée en V1**

Livré en V1, réservé au rôle `admin` :

- liste des comptes, recherche, dernière connexion, rôle, état ;
- désactivation et réactivation (`deleted_at`, soft delete déjà en schéma) ;
- déclenchement d'une réinitialisation de mot de passe ;
- consultation des sessions actives et révocation.

**Non livré** : création de compte depuis l'administration (l'inscription
publique suffit), modification du rôle depuis l'interface. Le changement de
rôle se fait en base, tracé, en V1 — c'est l'opération la plus dangereuse du
système et elle ne mérite pas un bouton avant que la matrice de permissions
soit durcie.

Règles non négociables :

- suppression physique **interdite** dès qu'un document ou une opération est
  rattaché ;
- un `staff` ne peut ni voir ni toucher la fiche d'un `admin`.

### 5.8 Employés et affectations — **E, supprimé**

Il n'y a pas d'employé de chantier utilisateur du système. Le champ
`assigned_to_user_id` existe déjà et suffit : il désigne l'opérateur du bureau
responsable du dossier. Aucun rôle supplémentaire, aucun écran dédié.

### 5.9 Paramètres du site — **E, supprimé du périmètre applicatif**

Les coordonnées, horaires, zones desservies et services vivent dans
`src/config/site.ts` et `src/data/`, versionnés en Git. C'est le bon endroit :
une modification passe par une revue et un déploiement, et laisse une trace.

Les rendre modifiables depuis une interface web ajouterait une surface
d'écriture privilégiée pour un gain nul à cette échelle. **Décision : ne pas
construire d'écran de paramètres.**

Rappel : secrets, clés d'API et `DATABASE_URL` restent dans l'environnement
serveur et ne sont jamais exposés à une interface.

### 5.10 Journal d'audit — **A, livré en V1**

Déjà livré, en lecture seule, `admin` uniquement.

Événements minimaux à couvrir en V1 :
`USER_REGISTER`, `USER_LOGIN`, `USER_LOGIN_FAILED`, `USER_DISABLED`,
`PASSWORD_CHANGED`, `PASSWORD_RESET_REQUESTED`, `CONTACT_STATUS_CHANGED`,
`QUOTE_REQUEST_STATUS_CHANGED`, `QUOTE_REQUEST_ASSIGNED`,
`ATTACHMENT_DOWNLOADED`.

Ce dernier n'est pas encore écrit et doit l'être : un téléchargement de pièce
jointe est un accès à une donnée personnelle.

---

## 6. Vocabulaire métier officiel

Une notion, un mot français, un nom technique. Toute autre variante est un
défaut à corriger.

| Notion métier | Terme français officiel | Table | Type / préfixe | Référence |
| --- | --- | --- | --- | --- |
| Message envoyé via le formulaire de contact | **Message de contact** | `contact_messages` | `contactMessage` | `CNT-AAAA-NNNNNN` |
| Demande chiffrable soumise par un particulier | **Demande de devis** | `quote_requests` | `quoteRequest` | **`DEM-AAAA-NNNNNN`** |
| Proposition chiffrée émise par l'entreprise | **Devis commercial** | `quotes` | `commercialQuote` | `DEV-AAAA-NNNN` |
| Document comptable exigible | **Facture** | `invoices` | `invoice` | `FACT-AAAA-NNNN` |
| Intervention planifiée et exécutée | **Chantier** | `projects` | `project` | — |
| Fichier téléversé par le client | **Pièce jointe** | `quote_attachments` | `attachment` | — |
| Fichier émis par l'entreprise | **Document** | `documents` (V2) | `document` | — |

**Correction obligatoire (défaut B3)** : le préfixe des demandes passe de `DEV`
à `DEM`. Les références déjà émises sont conservées telles quelles ; la
séquence continue avec le nouveau préfixe.

**Correction obligatoire** : les routes `/admin/devis` et
`/api/admin/devis/[id]/status` sont renommées. La seconde agit sur les
demandes et devient `/api/admin/demandes/[id]/status`.

Interdits : `estimate`, `customerQuote`, `devis` en identifiant technique.

---

## 7. Fiches des fonctionnalités livrées en V1

Format imposé par le cadrage. Aucune fonctionnalité n'entre en développement
sans sa fiche.

### F-01 · Message de contact

- **Utilisateur** : visiteur, client
- **Problème résolu** : joindre l'entreprise sans téléphoner, sans perte
- **État actuel** : ✅ **livré et testé**
- **Version** : V1
- **Tables** : `contact_messages`, `contact_status_history`, `notification_outbox`
- **Permissions** : public en écriture (protégé par quota, honeypot, délai, Turnstile) ; lecture `staff`/`admin`
- **Routes** : `/contact`, `POST /api/contact`
- **Chargement / erreurs** : gérés dans `ContactForm.tsx`
- **Notifications** : accusé de réception client + alerte administrateur
- **Tests** : `contactAndRequest.test.ts`, `test/integration/submissions.test.ts`, `test/e2e/contact-and-quote.spec.ts`
- **Acceptation** : un message soumis apparaît en administration ; il survit à un redémarrage ; une double soumission renvoie `409` avec la même référence ; le consentement est horodaté et versionné

### F-02 · Demande de devis (assistant 5 étapes)

- **Utilisateur** : visiteur, client
- **Problème résolu** : décrire un besoin de couverture avec photos
- **État actuel** : ⚠️ **livré** — le préfixe `DEM` reste à appliquer (défaut B3 ouvert)
- **Version** : V1
- **Tables** : `quote_requests`, `quote_attachments`, `quote_status_history`, `notification_outbox`
- **Permissions** : public en écriture ; brouillon serveur réservé aux comptes connectés
- **Routes** : `/devis`, `POST /api/devis`, `GET|POST|DELETE /api/devis/draft`, `/devis/merci`
- **Notifications** : accusé de réception + alerte administrateur
- **Tests** : `businessRules.test.ts`, intégration, E2E
- **Acceptation** : la demande est persistée avec sa référence `DEM-…` ; les pièces jointes sont vérifiées par magic bytes et stockées hors du dossier public ; un fichier non conforme est refusé sans créer de ligne orpheline

### F-03 · Inscription, connexion, déconnexion

- **Utilisateur** : visiteur, client, opérateur, administrateur
- **État actuel** : ⚠️ **partiel** — défauts B1 (enrôlement TOTP) et B4 (vérification e-mail) toujours ouverts
- **Version** : V1
- **Tables** : `users`, `sessions`, `email_verification_tokens`, `audit_log`
- **À développer** : envoi réel de l'e-mail de vérification, route de
  consommation du jeton, **route d'enrôlement TOTP pour `staff`/`admin`**
- **Routes** : `/connexion`, `POST /api/auth/login|logout|register`, `+ /api/auth/verify-email`, `+ /api/auth/totp/enroll`
- **Tests** : `loginRoute.test.ts`, `authRedirects.test.ts`, `sideChannels.test.ts`
- **Acceptation** : un administrateur peut s'enrôler au TOTP et se connecter sur une installation neuve ; un client peut vérifier son adresse ; la réponse d'inscription est identique que l'adresse existe ou non ; un `client` visant `/admin` est renvoyé vers `/mon-compte`

### F-04 · Mot de passe : changement et réinitialisation

- **Utilisateur** : client, opérateur, administrateur
- **État actuel** : ⚠️ **absent** — défauts B5 et B6 toujours ouverts
- **Version** : V1
- **Tables** : `users`, `password_reset_tokens`, `sessions`, `audit_log`
- **À développer** : les deux parcours complets
- **Routes** : `+ /api/auth/password/change`, `+ /api/auth/password/forgot`, `+ /api/auth/password/reset`, `+ /mot-de-passe-oublie`
- **Acceptation** : le changement exige le mot de passe actuel ; il révoque toutes les autres sessions ; la demande de réinitialisation répond de façon identique que l'adresse existe ou non ; un jeton est à usage unique et expire en 15 minutes ; la politique de mot de passe et le contrôle de compromission s'appliquent

### F-05 · Tableau de bord client

- **État actuel** : ✅ **livré** — tuiles sans source retirées, libellés français, prochaine action affichée, états vide et erreur traités
- **Version** : V1
- **Tables** : `quote_requests`
- **Routes** : `/mon-compte`
- **Acceptation** : les compteurs correspondent exactement au nombre de lignes du compte ; un compte sans demande voit un état vide explicite et un lien vers `/devis` ; aucun indicateur affiché ne peut valoir zéro par construction

### F-06 · Suivi de mes demandes

- **État actuel** : ✅ **livré** — route `/mon-compte/demandes`, pagination serveur, écran de détail par référence, annulation contrôlée par la machine à états
- **Version** : V1
- **Tables** : `quote_requests`, `quote_attachments`
- **Routes** : `/mon-compte/demandes` (renommée depuis `/mon-compte/devis`)
- **Acceptation** : un client ne voit que ses demandes ; changer l'identifiant dans l'URL ne donne accès à rien ; les états vide, chargement et erreur sont couverts ; les statuts sont en français ; l'annulation n'est proposée que si la machine à états l'autorise

### F-07 · Mes pièces jointes

- **État actuel** : ✅ **livré** — renommé « Mes pièces jointes », paginé, téléchargement audité
- **Version** : V1
- **Tables** : `quote_attachments`, `quote_requests`
- **Routes** : `/mon-compte/documents`, `GET /api/files/quote-attachments/[id]`
- **À développer** : journalisation `ATTACHMENT_DOWNLOADED`
- **Acceptation** : le téléchargement d'une pièce d'un autre client répond `404` ; le quota de téléchargement s'applique par compte ; chaque téléchargement laisse une trace d'audit

### F-08 · Mes échanges (historique de contact)

- **État actuel** : ✅ **livré** — « Mes échanges », lecture seule assumée, paginé
- **Version** : V1
- **Tables** : `contact_messages`
- **Routes** : `/mon-compte/echanges`
- **Acceptation** : lecture seule assumée ; aucun champ de saisie ; un lien mène au formulaire de contact

### F-09 · Profil et confidentialité

- **État actuel** : ✅ **livré** — téléphone modifiable, autres sessions révocables, e-mail affiché sans champ de saisie
- **Version** : V1
- **Tables** : `users`, `sessions`, `audit_log`
- **À développer** : modification du téléphone, changement de mot de passe (F-04), révocation des autres sessions
- **Routes** : `/mon-compte/parametres`, `+ POST /api/client/profile`, `GET /api/client/privacy/export`
- **Acceptation** : le téléphone modifié est persisté et audité ; l'e-mail est affiché sans champ de saisie ; l'export contient les données du seul compte connecté, sans notes internes ni chemins de stockage

### F-10 · Back-office : messages de contact

- **État actuel** : ✅ **livré** — lien `mailto:` pré-rempli, notes internes historisées avec auteur
- **Version** : V1
- **Tables** : `contact_messages`, `contact_status_history`, `audit_log`
- **Permissions** : `staff`, `admin`
- **Routes** : `/admin/contacts`, `/admin/contacts/[id]`, `POST /api/admin/contacts/[id]/status`
- **Acceptation** : les messages soumis apparaissent ; les données survivent à un redémarrage ; le filtre et la recherche fonctionnent ; une transition non déclarée est refusée en `409` ; chaque changement est écrit dans l'historique et l'audit ; un `client` reçoit `403`

### F-11 · Back-office : demandes de devis

- **État actuel** : ✅ **livré** — route renommée `/api/admin/demandes/[id]/status`, coordonnées non éditables, e-mail au client à chaque changement visible
- **Version** : V1
- **Tables** : `quote_requests`, `quote_status_history`, `quote_attachments`, `users`, `audit_log`
- **Permissions** : `staff`, `admin`
- **Routes** : `/admin/demandes`, `/admin/demandes/[id]`, `POST /api/admin/demandes/[id]/status`
- **Acceptation** : identiques à F-10, plus : les pièces jointes sont consultables par l'opérateur ; l'affectation n'accepte qu'un compte `staff` ou `admin` actif ; un changement de statut déclenche un e-mail au client

### F-12 · Back-office : comptes utilisateurs

- **État actuel** : ⚠️ **absent** — reporté en Phase 2. La couche de permissions est en revanche durcie : `staff` n'a plus aucun droit sur `users` (écart P1 corrigé)
- **Version** : V1
- **Tables** : `users`, `sessions`, `audit_log`
- **Permissions** : `admin` uniquement
- **Routes** : `+ /admin/comptes`, `+ /admin/comptes/[id]`, `+ POST /api/admin/comptes/[id]/status`
- **Acceptation** : un `staff` reçoit `403` ; un `staff` n'apparaît pas comme cible modifiable pour un autre `staff` ; la désactivation révoque immédiatement les sessions ; aucune suppression physique n'est proposée ; chaque action est auditée

### F-13 · Journal d'audit

- **État actuel** : ✅ **livré** — restreint à `admin` (écart P2 corrigé), entrée de menu masquée pour `staff`
- **Version** : V1
- **Permissions** : `admin` uniquement
- **Routes** : `/admin/audit`
- **Acceptation** : lecture seule ; aucun bouton d'action ; les IP sont affichées hachées et tronquées ; un `staff` reçoit `403`

### F-14 · Notifications par e-mail

- **État actuel** : ⚠️ **partiel** — l'événement `quote_request.status_changed` est livré et testé ; l'exécution planifiée et la configuration SMTP restent à mettre en place (décision Q5)
- **Version** : V1
- **Tables** : `notification_outbox`
- **À développer** : événement `quote_request.status_changed`, planification de `notifications:dispatch`, supervision des échecs
- **Acceptation** : un message en échec est réessayé cinq fois à délai croissant puis marqué `failed` ; aucun envoi n'est perdu au redémarrage ; l'absence de configuration SMTP est visible en supervision, pas silencieuse

---

## 8. Modèle de critères d'acceptation

Tout écran livré doit satisfaire ces huit points, sans exception :

1. Les données proviennent de PostgreSQL, jamais d'un tableau en dur.
2. L'utilisateur ne voit que ce qui lui appartient ; forger l'URL ne donne
   rien de plus, et le refus est un `404`.
3. Les trois états — vide, chargement, erreur — sont traités visuellement.
4. L'état vide explique quoi faire, il ne se contente pas d'être vide.
5. La page fonctionne après actualisation et après redémarrage du serveur.
6. Aucun bouton n'est affiché s'il ne produit pas d'effet observable.
7. L'écran est utilisable sur un écran de 375 px de large.
8. Les tests unitaires, d'intégration, de permissions et E2E passent sur un
   build de production.

---

## 9. Fonctionnalités reportées

| Fonctionnalité | Version cible | Condition de déclenchement |
| --- | --- | --- |
| Devis commerciaux (création, envoi, acceptation) | V2 | Volume de demandes traitées suffisant pour justifier la sortie du devis papier |
| Chantiers | V2 | Module devis commerciaux livré |
| Documents émis par l'entreprise | V2 | Module chantiers livré |
| Fil de discussion lié à une demande | V2 | Retour utilisateur montrant que l'e-mail ne suffit pas |
| Nom et prénom séparés sur le compte | V2 | Migration `users` |
| Modification de l'e-mail avec double confirmation | V2 | — |
| Ajout de photos après soumission | V2 | — |
| Factures | V3 ou jamais | Décision métier — voir §4.5 |
| Paiement en ligne | V3+ | Prestataire de paiement choisi, cadre juridique validé |
| Notifications temps réel, SMS, centre de notifications | V3+ | Besoin démontré |
| Statistiques et analytique avancée | V3+ | Volume de données rendant l'analyse pertinente |

## 10. Fonctionnalités supprimées

| Fonctionnalité | Raison |
| --- | --- |
| Messagerie applicative (modèle A) | Besoin inexistant à cette échelle ; le téléphone et l'e-mail couvrent le cas |
| Rôles `employee`, `manager`, `super_admin` | Aucun utilisateur correspondant |
| Écran de paramètres du site | Les données de configuration sont mieux versionnées en Git |
| Préférences de communication | Un seul canal existe |
| Notes de crédit (`credit_notes`) | Dépend d'une facturation non retenue |
| Statuts de chantier `scheduled` et `paused` | Doublons sans action métier distincte |
| Suppression automatique de compte | Incompatible avec la conservation comptable |
| Tuiles de tableau de bord sans source | Ne peuvent afficher que zéro |
| Envoi d'e-mail de réponse depuis l'administration | Délivrabilité, fils de discussion et archivage légal hors périmètre |

## 11. Risques

**Fonctionnels**

- La V1 ne contient aucun parcours commercial. Si l'attente réelle du client
  était « envoyer des devis en ligne », le cadrage doit être rediscuté avant
  la Phase 2. → à confirmer.
- Retirer les onglets Devis, Factures et Chantiers réduit visiblement
  l'application. C'est voulu ; cela doit être annoncé, pas subi.

**Techniques**

- Le TOTP obligatoire sans enrôlement rend le back-office inaccessible.
  **C'est le risque numéro un** : sans correction, la V1 n'est pas livrable.
- L'absence de seed empêche toute recette locale réaliste.
- L'outbox sans planification ni SMTP rend la V1 silencieuse.
- Le renommage du préfixe de référence touche des données déjà émises : la
  migration doit conserver l'existant et ne renommer que la suite.

**Sécurité**

- Le rôle `staff` dispose aujourd'hui de `manage` sur `users` et de la mise à
  jour de toute ressource. À durcir avant de livrer F-12.
- La page `/admin/audit` est accessible à `staff` : le journal doit être
  réservé à `admin`.
- Le téléchargement de pièce jointe n'est pas audité.
- La colonne `users.role` est un `varchar` sans contrainte `CHECK` : une
  valeur inattendue est possible en base. À contraindre.

**Maintenance**

- Trois tables mortes (`documents`, `messages`, `credit_notes`) alourdissent le
  schéma sans usage. Retirées en V1, recréées avec leur module.
- `/api/pdf/*` produit du HTML sous un nom de PDF. Soit on livre un vrai PDF,
  soit on renomme la route et l'intitulé. Reporté avec le module devis.

## 12. Décisions à confirmer avec le client

| # | Question | Bloque | Position par défaut |
| --- | --- | --- | --- |
| Q1 | La facturation doit-elle vivre dans Zlobodan, ou dans le logiciel comptable existant ? | Phase 5 | Hors périmètre |
| Q2 | Combien de personnes utiliseront réellement le back-office, et faut-il distinguer `staff` de `admin` ? | Phase 1 | Deux rôles conservés |
| Q3 | Le devis commercial doit-il être envoyé depuis l'application, ou reste-t-il un PDF envoyé par e-mail ? | Phase 3 | Reste hors application en V1 |
| Q4 | Le client doit-il pouvoir accepter un devis en ligne, avec la valeur juridique que cela suppose ? | Phase 3 | Reporté, à valider juridiquement |
| Q5 | Quelle adresse d'expédition SMTP et quel domaine authentifié (SPF, DKIM, DMARC) ? | Phase 1 | Bloquant, sans position par défaut |
| Q6 | Faut-il conserver un compte client, ou le suivi par référence + e-mail suffit-il ? | Phase 1 | Compte conservé |
