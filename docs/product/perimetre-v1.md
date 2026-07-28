# PERIMETRE_V1.md

## 1. Informations du document

* **Projet** : Zlobodan
* **Version du document** : 1.0
* **Date** : 27 juillet 2026
* **Référence Git analysée** : `v1.0.0-stable`
* **Tag analysé** : `v1.0.0-stable`
* **Auteur de l’analyse** : Antigravity (Expert Système)
* **Statut** : À valider

## 2. Objectif de la V1

La V1 de Zlobodan est un outil de captation et de qualification de prospects pour une entreprise de couverture.
Le but est d'offrir une vitrine professionnelle permettant aux visiteurs de découvrir les services, de créer un compte sécurisé, et de déposer une demande de devis qualifiée (avec photos et détails).
Le parcours métier principal s'arrête à la qualification administrative de la demande (statuts, notes internes, génération d'un récapitulatif PDF). La suite du processus commercial (devis, facturation, suivi de chantier) n'est pas couverte par cette V1 et reste gérée en dehors de l'application ou prévue pour une V2.

## 3. Règles de classement

* **Incluse dans la V1** : Fonction démontrable, testée, sécurisée, avec des données réelles et un parcours complet. Vendable immédiatement.
* **Différée après la V1** : Fonction utile mais incomplète ou absente, non bloquante pour le parcours principal défini pour la V1. Ne sera pas livrée.
* **Retirée du produit** : Fonction obsolète ou non pertinente.
* **À terminer avant la V1** : Fonction indispensable au parcours principal mais techniquement incomplète (ex: manque de tests, UX partielle).
* **À valider avec le client** : Décision métier requise avant de pouvoir statuer.

## 4. Synthèse générale

| Catégorie                | Nombre de fonctions |
| ------------------------ | ------------------: |
| Incluse dans la V1       | 6                   |
| Différée                 | 6                   |
| Retirée                  | 0                   |
| À terminer               | 1                   |
| À valider avec le client | 2                   |

## 5. Matrice fonctionnelle complète

| ID | Fonction | Présence | Maturité | Statut V1 | Justification |
| -- | -------- | -------- | -------- | --------- | ------------- |
| AUTH-001 | Authentification 2FA | Complète | Testée et stable | Incluse | Implémentation TOTP complète avec codes de récupération présente dans le code et la DB. |
| PRIVACY-001 | Export RGPD | Implémentée | Tests principaux | Incluse | L'API d'export existe et permet d'extraire les données du profil client. |
| REQ-001 | Demandes de devis | Complète | Testée et stable | Incluse | Parcours complet depuis le client (formulaire brouillon) jusqu'à la qualification admin (workflow, notes). |
| DOC-001 | Génération de récapitulatif PDF | Complète | Testée et stable | Incluse | Le système génère des versions PDF des demandes via `DocumentsPanel` et les stocke. |
| MSG-001 | Historique des contacts | Partielle | Tests principaux | Incluse | La messagerie est un simple historique en lecture seule des messages du formulaire de contact. |
| PROFILE-001 | Gestion du profil | Complète | Testée et stable | Incluse | Mise à jour des informations, mot de passe, changement d'email. |
| PRIVACY-002 | Suppression de compte | Absente | Non testée | À terminer | Aucune route ou bouton de suppression trouvé. Requis par le RGPD. |
| INVOICE-001 | Factures | Partielle | Non testée | Différée | Tables DB et vues en lecture seule existantes, mais aucune interface de création ou logique métier. |
| BILLING-001 | Facturation | Absente | Non testée | Différée | Aucune logique comptable (taxes, paiements, échéances) présente dans le code. |
| QUOTE-001 | Devis commerciaux | Partielle | Non testée | Différée | Les tables existent mais l'interface client a été explicitement retirée ("La section a été retirée"). Pas d'UI de création. |
| PROJECT-001 | Chantiers | Partielle | Non testée | Différée | Interface client présente en lecture seule mais aucun accès administrateur pour les gérer. |
| INVOICE-002 | Avoirs | Partielle | Non testée | Différée | Schéma DB existant, aucune interface. |
| MSG-002 | Messagerie interne / Échanges | Absente | Non testée | À valider avec le client | Le client veut-il vraiment discuter via la plateforme ou continuer par e-mail ? (actuellement différé V2). |
| ADMIN-001 | Rôles et Permissions Admin | Complète | Testée | À valider avec le client | Les rôles (admin, staff) fonctionnent. Le client a-t-il défini qui sera "staff" vs "admin" ? |

## 6. Fonctions incluses dans la V1

### REQ-001 : Demandes de devis
* **Description** : Création, suivi et qualification des demandes de devis.
* **Utilisateurs** : Clients (création, consultation) et Administrateurs (qualification, notes, changement de statut).
* **Critères d'acceptation** :
  - Un client peut soumettre une demande structurée.
  - La demande est sauvegardée en base.
  - Un administrateur peut changer le statut de la demande.
  - Un administrateur peut ajouter des notes internes (invisibles au client).
  - Un administrateur assigné peut générer le document PDF de la demande.

### AUTH-001 : Authentification à deux facteurs (2FA)
* **Description** : Sécurisation du compte via application TOTP.
* **Utilisateurs** : Tous (Clients et Administrateurs).
* **Critères d'acceptation** :
  - L'utilisateur peut activer le 2FA.
  - Des codes de récupération sont générés et vérifiés.
  - La connexion exige le code TOTP si activé.

### DOC-001 : Génération documentaire (Récapitulatifs)
* **Description** : Création de PDF non modifiables liés à une demande de devis.
* **Utilisateurs** : Administrateurs assignés.
* **Critères d'acceptation** :
  - Un clic génère la version courante de la demande.
  - Les versions précédentes sont conservées et téléchargeables.
  - L'accès direct aux documents par URL est protégé.

### MSG-001 : Historique de contact
* **Description** : Affichage en lecture seule des messages envoyés par le client.
* **Utilisateurs** : Clients.
* **Critères d'acceptation** :
  - Le client voit la liste des messages envoyés via le formulaire public.
  - Les statuts de traitement sont visibles.

### PRIVACY-001 : Export RGPD
* **Description** : Export des données personnelles.
* **Utilisateurs** : Clients.
* **Critères d'acceptation** :
  - Un appel à l'API génère l'export des données du profil.

### PROFILE-001 : Gestion du profil
* **Description** : Modification des informations personnelles et de sécurité.
* **Utilisateurs** : Clients.
* **Critères d'acceptation** :
  - Mise à jour du nom, prénom, téléphone.
  - Modification de l'adresse e-mail (avec confirmation).
  - Changement de mot de passe sécurisé.
  - Révocation des sessions actives.

## 7. Fonctions à terminer

### PRIVACY-002 : Suppression de compte
* **État existant** : Absent du code métier (aucune route d'action trouvée).
* **Éléments manquants** : Route d'API sécurisée avec re-vérification du mot de passe, bouton dans l'espace "Sécurité", traitement d'anonymisation ou de suppression en cascade.
* **Complexité** : Moyenne.
* **Condition de validation** : Implémenter la suppression stricte conformément au RGPD pour autoriser le lancement public.

## 8. Fonctions à valider avec le client

### MSG-002 : Messagerie interactive
* **Question** : Souhaitez-vous gérer les échanges directs avec les clients à l'intérieur de la plateforme Zlobodan pour la V1, ou préférez-vous traiter les demandes qualifiées par e-mail/téléphone classique ?
* **Choix recommandé** : Ne pas inclure dans la V1. Traiter par e-mail.
* **Impact** : Développements lourds (système de notifications, threads de discussion).
* **Statut par défaut** : Non incluse dans la V1 tant que la décision n’est pas obtenue.

### ADMIN-001 : Flux de qualification (Staff vs Admin)
* **Question** : Un collaborateur "Staff" ne peut générer de document que sur les demandes qui lui sont explicitement assignées. Souhaitez-vous conserver cette restriction de moindre privilège pour la V1 ?
* **Choix recommandé** : Oui, conserver la sécurité stricte existante.
* **Statut par défaut** : Fonctionnement actuel maintenu.

## 9. Fonctions différées

* **INVOICE-001 (Factures)** : L'interface client existe mais ne permet aucune action réelle (ni PDF, ni paiement). Confuse pour un client réel. L'interface admin est un simple registre. À masquer/retirer pour la V1.
* **BILLING-001 (Facturation)** : Aucun moteur de facturation présent. Zlobodan V1 est un outil d'acquisition, pas un ERP comptable.
* **QUOTE-001 (Devis commerciaux)** : L'émission de vrais devis chiffrés nécessite un moteur de ligne de prix complexe non implémenté. L'UI a été retirée du front client.
* **PROJECT-001 (Chantiers)** : Le suivi de chantier côté client est présent en base, mais il n'y a pas d'interface admin pour les piloter. Fonctionnalité orpheline.
* **INVOICE-002 (Avoirs)** : Dépend de la facturation.
* **MSG-003 (Fils de discussion sur devis)** : Prévu en V2 selon l'historique du code.

## 10. Fonctions retirées

Aucune fonction techniquement mature n'est retirée. Toutefois, les pages `mon-compte/factures`, `admin/factures`, `mon-compte/chantiers`, `admin/devis` doivent être désactivées de l'interface car elles sont orphelines et non fonctionnelles (voir section 15).

## 11. Analyse détaillée des fonctions prioritaires

* **Factures** : Ne désigne actuellement qu'une table de base de données. Il n'y a pas de PDF, pas de création. NON INCLUS.
* **Chantiers** : Affichage d'une liste vide côté client, aucune interface côté administrateur. NON INCLUS.
* **Devis commerciaux** : Tables prêtes, interface d'administration basique en lecture seule, mais UI client explicitement retirée ("V2"). NON INCLUS.
* **Facturation** : Totalement absent du code logique. NON INCLUS.
* **Avoirs** : Uniquement dans la base de données. NON INCLUS.
* **Documents** : La génération est fonctionnelle mais strictement limitée au "Récapitulatif de demande de devis" généré par l'administrateur. INCLUS pour ce périmètre précis.
* **Échanges** : Historique simple des demandes de contact côté client. INCLUS. (Pas de messagerie interactive interne).
* **2FA** : Implémentation complète et sécurisée (TOTP + codes de secours). INCLUS.
* **Export RGPD** : API fonctionnelle d'extraction des données. INCLUS.
* **Suppression de compte** : Élément légal manquant. À TERMINER.

## 12. Ce que la V1 comprend

La version V1 de Zlobodan comprend :
* La présentation publique des services de l'entreprise.
* La création et la sécurisation d'un compte client (incluant le 2FA).
* Un formulaire structuré de demande de devis (avec pièces jointes et brouillons).
* Un espace client permettant de suivre l'évolution des statuts de ses demandes.
* Un espace client permettant d'exporter ses données personnelles.
* Un espace administrateur pour réceptionner, qualifier (statuts, notes internes) et assigner les demandes.
* La génération sécurisée d'un récapitulatif PDF figeant la demande qualifiée.

## 13. Ce que la V1 ne comprend pas

La version V1 ne comprend pas :
* La création, l'édition ou l'envoi de devis commerciaux chiffrés.
* La création, le paiement ou le suivi des factures et des avoirs.
* La gestion comptable ou financière (TVA, acomptes, soldes).
* Le suivi de l'avancement des chantiers (dates, photos de progression).
* Une messagerie interactive bidirectionnelle (chat) au sein de la plateforme.
* Les intégrations avec des logiciels comptables externes.

## 14. Parcours de démonstration

1. Ouverture du site public.
2. Le visiteur utilise le simulateur / formulaire pour décrire son besoin (toiture, surface).
3. Le visiteur crée un compte client sécurisé pour valider l'envoi de la demande.
4. L'administrateur se connecte au portail d'administration.
5. L'administrateur ouvre la nouvelle demande reçue, lit les informations et les pièces jointes.
6. L'administrateur change le statut de la demande en "À l'étude" et s'assigne le dossier.
7. L'administrateur rédige une note interne ("Visite sur place à planifier").
8. L'administrateur génère le document PDF récapitulatif officiel de la demande.
9. Le client se reconnecte à son espace, voit le changement de statut de sa demande et peut exporter ses données.

## 15. Fonctions visibles à masquer

| Élément | Emplacement | Statut V1 | Action |
| ------- | ----------- | --------- | ------ |
| Page Mes Factures | `/mon-compte/factures` | Différée | Désactiver la route et masquer du menu client |
| Page Mes Chantiers | `/mon-compte/chantiers` | Différée | Désactiver la route et masquer du menu client |
| Page Registre Factures | `/admin/factures` | Différée | Désactiver la route et masquer du menu admin |
| Page Devis Commerciaux | `/admin/devis` | Différée | Désactiver la route et masquer du menu admin |

*Justification : Ces pages ne contiennent pas de boutons de création et affichent en permanence un état vide, ce qui donnerait au client l'impression d'une application "cassée" ou "inachevée". Il faut les cacher jusqu'à la V2.*

## 16. Questions client

1. **Suppression de compte** : La suppression du compte par l'utilisateur (obligatoire RGPD) doit-elle anonymiser les demandes existantes ou les détruire intégralement ?
2. **Messagerie** : Confirmez-vous que la communication post-qualification (envoi du devis commercial, discussions techniques) se fera via vos canaux habituels (e-mail externe, téléphone) pour cette V1 ?

## 17. Risques et dépendances

* **Risques légaux (RGPD)** : L'absence de bouton de suppression de compte expose l'application à un défaut de conformité RGPD. Cette lacune doit être comblée avant la mise en production.
* **Risques commerciaux** : Le terme "Espace Client" est souvent perçu par le public comme incluant factures et devis. Une communication transparente sur la landing page est nécessaire pour préciser qu'il s'agit d'un "Espace de demande de projet".

## 18. Formulation contractuelle proposée

Périmètre fonctionnel de la V1

La version V1 de Zlobodan comprend :
- Un site vitrine de présentation des services.
- Un espace d'authentification sécurisé pour les utilisateurs (2FA, gestion de profil, export RGPD).
- Un module de collecte de demandes de projets structurées (incluant l'envoi de fichiers).
- Un tableau de bord administrateur permettant la réception, l'assignation, et le suivi des statuts des demandes.
- Un système de génération de documents PDF figeant les récapitulatifs des demandes clients.

La version V1 ne comprend pas :
- L'émission, la signature ou la gestion de devis commerciaux.
- L'émission, le paiement ou le suivi des factures et des avoirs.
- Le suivi technique et calendaire des chantiers en cours.
- Une messagerie instantanée ou conversationnelle intégrée à l'application.

Toute fonctionnalité non mentionnée dans la liste des éléments inclus fera l’objet d’une analyse, d’un devis et d’une validation séparés.

## 19. Conditions de gel de la V1

Le périmètre est figé sous réserve de :
- L'implémentation de la fonctionnalité de suppression/anonymisation de compte (PRIVACY-002).
- Le masquage ou la suppression technique des routes de facturation, devis commerciaux et chantiers qui sont incomplètes.
- La validation explicite du périmètre par le client.

## 20. Validation

| Rôle               | Nom | Décision | Date |
| ------------------ | --- | -------- | ---- |
| Développeur        | Antigravity | PROPOSÉ | 27/07/2026 |
| Client             |     |          |      |
| Responsable métier |     |          |      |
