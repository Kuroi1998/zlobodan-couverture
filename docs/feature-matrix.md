# Matrice de décision fonctionnelle — Zlobodan

> Une ligne par fonctionnalité. **Aucune fonctionnalité n'est sans décision.**
>
> Contexte, justifications et fiches détaillées →
> [functional-scope.md](functional-scope.md).
> Rôles → [roles-and-permissions.md](roles-and-permissions.md).
> Phases → [delivery-roadmap.md](delivery-roadmap.md).

## Conventions

**Catégorie de décision**

| Code | Signification |
| --- | --- |
| **A** | Livrée en V1, complète, persistante, testée |
| **B** | Livrée en V1 en version simplifiée |
| **C** | Planifiée pour une version ultérieure |
| **D** | Prototype interne, jamais visible en production |
| **E** | Supprimée du projet |
| **F** | À confirmer avec le client |

**État actuel** — `Complet` · `Partiel` · `Lecture seule` · `Inatteignable`
(le code existe mais aucune donnée ne peut être créée) · `Absent` ·
`Table morte` (schéma sans aucun code).

**Valeur métier** — `Faible` · `Moyenne` · `Élevée` · `Critique`
**Complexité restante** — `Faible` · `Moyenne` · `Élevée` · `Très élevée`

---

## 1. Socle et authentification

| Fonctionnalité | Rôles | Valeur | État actuel | Complexité | Dépendances | Décision | Version |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sessions opaques, cookie `__Host-`, expiration | tous | Critique | Complet | — | PostgreSQL | **A** | V1 |
| Inscription client | Visiteur | Élevée | Partiel — e-mail jamais envoyé | Faible | SMTP | **A** | V1 |
| Vérification de l'adresse e-mail | Client | Élevée | Absent — jeton créé, jamais consommé | Faible | SMTP, outbox | **A** | V1 |
| Connexion, verrouillage progressif, Turnstile | tous | Critique | Complet | — | PostgreSQL | **A** | V1 |
| Déconnexion | tous | Critique | Complet | — | — | **A** | V1 |
| **Enrôlement TOTP `staff`/`admin`** | Staff, Admin | **Critique** | **Absent — bloque tout le back-office** | Moyenne | `users.totp_secret` | **A** | **V1** |
| Changement de mot de passe connecté | tous | Élevée | Absent | Faible | Révocation de sessions | **A** | V1 |
| Réinitialisation de mot de passe oublié | tous | Élevée | Absent — table présente | Moyenne | SMTP, outbox | **A** | V1 |
| Double facteur optionnel pour les clients | Client | Faible | Partiel | Moyenne | — | **C** | V2 |
| Fournisseur d'identité externe (Google, etc.) | tous | Faible | Absent | Élevée | OAuth | **E** | — |

## 2. Captation publique

| Fonctionnalité | Rôles | Valeur | État actuel | Complexité | Dépendances | Décision | Version |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Formulaire de contact persistant | Visiteur, Client | Critique | Complet | — | PostgreSQL, outbox | **A** | V1 |
| Assistant de demande de devis, 5 étapes | Visiteur, Client | Critique | Complet | — | PostgreSQL, stockage privé | **A** | V1 |
| Pièces jointes vérifiées et stockées hors web | Visiteur, Client | Élevée | Complet | — | S3 ou disque privé | **A** | V1 |
| Brouillon serveur de la demande | Client | Moyenne | Complet | — | Compte connecté | **A** | V1 |
| Renommage du préfixe `DEV` → `DEM` sur les demandes | — | Élevée | Défaut B3 ouvert | Faible | Migration | **A** | V1 |
| Accusé de réception par e-mail | Visiteur, Client | Élevée | Partiel — outbox non planifié | Faible | SMTP, tâche planifiée | **A** | V1 |
| Ajout de photos après soumission | Client | Faible | Absent | Moyenne | Upload authentifié | **C** | V2 |
| Modification d'une demande soumise | Client | Faible | Absent | Moyenne | — | **E** | — |
| Annulation d'une demande par le client | Client | Moyenne | Absent — transition déjà déclarée | Faible | Machine à états | **B** | V1 |

## 3. Espace client

| Fonctionnalité | Rôles | Valeur | État actuel | Complexité | Dépendances | Décision | Version |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tableau de bord | Client | Élevée | Partiel — 2 tuiles sans source | Faible | `quote_requests` | **B** | V1 |
| Liste et détail de mes demandes | Client | Critique | Partiel — statuts bruts en anglais | Faible | `quote_requests` | **A** | V1 |
| Libellés de statut en français, partagés client/admin | Client | Élevée | Absent côté client | Faible | — | **A** | V1 |
| Mes pièces jointes, téléchargement contrôlé | Client | Élevée | Complet — à renommer | Faible | Stockage privé | **B** | V1 |
| Journalisation des téléchargements | — | Moyenne | Absent | Faible | `audit_log` | **A** | V1 |
| Mes échanges — historique de contact en lecture seule | Client | Moyenne | Complet — mal intitulé « Messagerie » | Faible | `contact_messages` | **B** | V1 |
| Profil : consultation | Client | Moyenne | Complet | — | `users` | **A** | V1 |
| Profil : modification du téléphone | Client | Moyenne | Absent | Faible | `users`, audit | **B** | V1 |
| Profil : nom et prénom | Client | Faible | Absent — colonnes inexistantes | Moyenne | Migration `users` | **C** | V2 |
| Profil : modification de l'e-mail | Client | Faible | Absent | Élevée | Double confirmation, SMTP | **C** | V2 |
| Sessions actives : affichage | Client | Moyenne | Complet | — | `sessions` | **A** | V1 |
| Sessions actives : révocation des autres appareils | Client | Moyenne | Absent — service déjà écrit | Faible | `revokeOtherSessions` | **B** | V1 |
| Export RGPD des données | Client | Élevée | Complet | — | PostgreSQL | **A** | V1 |
| Demande de suppression de compte | Client | Moyenne | Lien `mailto:` | Faible | Traitement manuel tracé | **B** | V1 |
| Suppression automatique du compte | Client | Faible | Absent | Élevée | Conservation comptable | **E** | — |
| Préférences de communication | Client | Faible | Absent | Moyenne | Plusieurs canaux | **E** | — |
| **Devis commerciaux — consultation** | Client | Élevée | **Inatteignable** | Moyenne | Création admin | **C** | V2 |
| **Devis commerciaux — accepter / refuser** | Client | Élevée | **Inatteignable** — code complet et testé | Faible | Création admin | **C** | V2 |
| Acceptation électronique à valeur probante | Client | Moyenne | Partiel — horodatage et IP présents | Élevée | Validation juridique | **F** | V2+ |
| **Factures — consultation et téléchargement** | Client | À confirmer | **Inatteignable** | Moyenne | Décision Q1 | **F** | V3 |
| **Chantiers — suivi** | Client | Moyenne | **Inatteignable** | Moyenne | Création admin | **C** | V2 |
| Pourcentage d'avancement de chantier | Client | Faible | Absent | Moyenne | Source de vérité inexistante | **E** | — |
| Documents émis par l'entreprise (garanties, PV) | Client | Moyenne | **Table morte** | Moyenne | Module chantiers | **C** | V2 |
| Messagerie applicative complète | Client, Staff | Faible | **Table morte** | Élevée | — | **E** | — |
| Fil de discussion lié à une demande | Client, Staff | Moyenne | Absent | Moyenne | Notifications | **C** | V2 |
| Notifications dans l'application | Client | Faible | Absent | Moyenne | — | **C** | V3 |
| Paiement en ligne | Client | À confirmer | Absent | Très élevée | Prestataire, juridique | **F** | V3+ |

## 4. Back-office

| Fonctionnalité | Rôles | Valeur | État actuel | Complexité | Dépendances | Décision | Version |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tableau de bord : demandes et contacts | Staff, Admin | Élevée | Partiel — 4 tuiles sans source | Faible | PostgreSQL | **B** | V1 |
| Contacts : liste, recherche, filtre, pagination | Staff, Admin | Critique | Complet | — | PostgreSQL | **A** | V1 |
| Contacts : détail et lecture | Staff, Admin | Critique | Complet | — | — | **A** | V1 |
| Contacts : transition de statut contrôlée | Staff, Admin | Critique | Complet | — | Machine à états, audit | **A** | V1 |
| Contacts : notes internes et affectation | Staff, Admin | Élevée | Complet | — | — | **A** | V1 |
| Contacts : marquage indésirable | Staff, Admin | Moyenne | Présent dans la machine, peu visible | Faible | — | **B** | V1 |
| Contacts : réponse par `mailto:` pré-rempli | Staff, Admin | Moyenne | Absent | Faible | — | **B** | V1 |
| Contacts : envoi d'e-mail depuis l'application | Staff, Admin | Moyenne | Absent | Élevée | Délivrabilité, archivage | **E** | — |
| Demandes : liste, recherche, filtre, pagination | Staff, Admin | Critique | Complet | — | PostgreSQL | **A** | V1 |
| Demandes : détail, pièces jointes, historique | Staff, Admin | Critique | Complet | — | Stockage privé | **A** | V1 |
| Demandes : statut, notes, affectation | Staff, Admin | Critique | Complet | — | Machine à états, audit | **A** | V1 |
| Demandes : renommage de la route d'API vers `/api/admin/demandes` | — | Moyenne | Défaut de vocabulaire ouvert | Faible | — | **A** | V1 |
| Demandes : e-mail au client à chaque changement de statut | Staff, Admin | Élevée | Absent | Faible | Outbox, SMTP | **A** | V1 |
| Demandes : modification des coordonnées client | Staff, Admin | Faible | Absent | Faible | — | **E** | — |
| Comptes : liste, recherche, dernière connexion | Admin | Élevée | Absent | Faible | `users` | **B** | V1 |
| Comptes : désactivation et réactivation | Admin | Élevée | Absent — `deleted_at` en schéma | Moyenne | Révocation de sessions | **B** | V1 |
| Comptes : déclenchement d'une réinitialisation | Admin | Moyenne | Absent | Faible | Parcours mot de passe | **B** | V1 |
| Comptes : révocation des sessions d'un utilisateur | Admin | Moyenne | Service écrit, non exposé | Faible | `sessions` | **B** | V1 |
| Comptes : changement de rôle depuis l'interface | Admin | Moyenne | Absent | Moyenne | Durcissement des permissions | **C** | V2 |
| Comptes : création depuis l'administration | Admin | Faible | Absent | Faible | — | **E** | — |
| Comptes : suppression physique | — | — | Absent | — | Intégrité comptable | **E** | — |
| Journal d'audit : consultation | Admin | Élevée | Complet — accessible à tort à `staff` | Faible | Restriction de rôle | **A** | V1 |
| Journal d'audit : export CSV | Admin | Faible | Absent — utilitaire `csv.ts` présent | Faible | — | **C** | V2 |
| **Devis commerciaux : création** | Staff, Admin | Élevée | **Absent — cause racine du vide** | Élevée | `quotes`, `quote_lines`, numérotation | **C** | V2 |
| Devis : lignes, quantités, TVA, remises | Staff, Admin | Moyenne | Schéma présent, aucun code | Élevée | Création | **C** | V2 |
| Devis : téléversement d'un PDF externe | Staff, Admin | Élevée | Absent | Moyenne | Stockage privé | **C** | V2 |
| Devis : génération PDF native | Staff, Admin | Faible | Partiel — produit du HTML | Élevée | Moteur PDF | **C** | V3 |
| Devis : envoi au client | Staff, Admin | Élevée | Absent | Moyenne | Outbox | **C** | V2 |
| Devis : versions successives, catalogue, modèles | Staff, Admin | Faible | Absent | Très élevée | — | **E** | — |
| **Factures : création ou téléversement** | Staff, Admin | À confirmer | **Absent** | Élevée | Décision Q1 | **F** | V3 |
| Factures : suivi de paiement et relances | Staff, Admin | À confirmer | Absent | Élevée | Décision Q1 | **F** | V3 |
| Factures : export comptable | Staff, Admin | Faible | Absent | Élevée | — | **E** | — |
| Notes de crédit | Staff, Admin | Faible | **Table morte** | Moyenne | Facturation | **E** | — |
| **Chantiers : création manuelle et suivi** | Staff, Admin | Moyenne | **Absent** | Moyenne | `projects` | **C** | V2 |
| Chantiers : création automatique depuis un devis accepté | — | Faible | Absent | Moyenne | — | **E** | — |
| Chantiers : planning, diagrammes, rapports quotidiens | Staff | Faible | Absent | Très élevée | — | **E** | — |
| Chantiers : géolocalisation, présence, matériaux | Staff | Faible | Absent | Très élevée | — | **E** | — |
| Écran de paramètres du site | Admin | Faible | Absent | Moyenne | — | **E** | — |
| Statistiques et analytique avancée | Admin | Faible | Absent | Élevée | Volume de données | **C** | V3 |
| Rôles `employee`, `manager`, `super_admin` | — | Faible | Absent | Moyenne | Aucun utilisateur réel | **E** | — |
| Écran de gestion des employés et affectations | Admin | Faible | Absent — champ `assigned_to` suffisant | Moyenne | — | **E** | — |

## 5. Infrastructure de livraison

| Fonctionnalité | Valeur | État actuel | Complexité | Dépendances | Décision | Version |
| --- | --- | --- | --- | --- | --- | --- |
| Outbox de notifications durable | Critique | Complet | — | PostgreSQL | **A** | V1 |
| **Configuration SMTP et domaine authentifié** | **Critique** | **Absent — décision Q5** | Moyenne | SPF, DKIM, DMARC | **A** | **V1** |
| **Exécution planifiée de `notifications:dispatch`** | **Critique** | **Absent** | Faible | Hébergement | **A** | **V1** |
| **Jeu de données de démonstration (`db:seed`)** | Élevée | **Squelette vide** | Moyenne | — | **A** | V1 |
| Contrainte `CHECK` sur `users.role` | Élevée | Absent | Faible | Migration | **A** | V1 |
| Suppression des tables mortes `messages`, `documents`, `credit_notes` | Moyenne | 3 tables sans code | Faible | Migration | **A** | V1 |
| Nettoyage des téléversements orphelins | Moyenne | Script présent | Faible | Planification | **B** | V1 |
| Purge des brouillons expirés | Moyenne | Script présent | Faible | Planification | **B** | V1 |
| Supervision des échecs d'envoi | Élevée | Absent | Moyenne | Hébergement | **B** | V1 |
| Sauvegarde et restauration vérifiées | Critique | Hors application | Moyenne | Hébergement | **A** | V1 |

---

## Synthèse quantitative

| Catégorie | Nombre |
| --- | --- |
| **A** — livrée en V1 | 37 |
| **B** — livrée en V1, simplifiée | 17 |
| **C** — reportée V2 ou V3 | 19 |
| **D** — prototype interne | 0 |
| **E** — supprimée | 19 |
| **F** — à confirmer avec le client | 5 |
| **Total inventorié** | **97** |

Sur les 54 fonctionnalités retenues pour la V1 (A + B), **24 sont déjà
livrées** et n'exigent aucun développement, 12 sont partielles, et 18 restent
à écrire — dont 8 relèvent du socle d'authentification et d'infrastructure.
