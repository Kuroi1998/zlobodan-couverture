# Feuille de route de livraison — Zlobodan

> Ordre de développement, dépendances et conditions de passage d'une phase à
> la suivante.
>
> Décisions de périmètre → [functional-scope.md](functional-scope.md).
> Matrice fonctionnelle → [feature-matrix.md](feature-matrix.md).
> Rôles → [roles-and-permissions.md](roles-and-permissions.md).

## Principe

**Une phase se termine par une mise en production utilisable.** Une phase
n'est pas close tant que ses critères de validation ne sont pas satisfaits, et
la phase suivante ne démarre pas avant.

Les phases 1 à 3 constituent la **V1**. Les phases 4 et 5 constituent la V2.
La phase 6 est conditionnée à un arbitrage métier.

## Ordre de priorité

| Priorité | Objet | Phases |
| --- | --- | --- |
| 1 | Fonctionnement essentiel — le système doit être accessible et fiable | 1 |
| 2 | Traitement de la demande — le bureau doit pouvoir travailler | 2 |
| 3 | Restitution au client — le client doit voir l'état de son dossier | 3 |
| 4 | Parcours commercial — devis chiffrés | 4 |
| 5 | Suivi opérationnel — chantiers et documents | 5 |
| 6 | Gestion financière — sous réserve d'arbitrage | 6 |

---

## Phase 1 — Débloquer le socle

**Objectif : rendre le back-office accessible et l'application capable de
parler.** C'est la phase la plus courte et la plus critique : sans elle, rien
d'autre n'est livrable.

| Fonctionnalité | Fiche | Nature |
| --- | --- | --- |
| Enrôlement TOTP pour `staff` et `admin` | F-03 | **Développement — bloquant** |
| Envoi de l'e-mail de vérification et consommation du jeton | F-03 | Développement |
| Changement de mot de passe connecté | F-04 | Développement |
| Réinitialisation de mot de passe oublié | F-04 | Développement |
| Configuration SMTP et domaine authentifié (SPF, DKIM, DMARC) | F-14 | Infrastructure |
| Exécution planifiée de `notifications:dispatch` | F-14 | Infrastructure |
| Jeu de données de démonstration `db:seed` | — | Développement |
| Contrainte `CHECK` sur `users.role` | — | Migration |
| Durcissement des permissions `staff` (écarts P1, P2, P3) | — | Développement |
| Suppression des liens morts `/admin/chantiers` et `/admin/clients` | — | Nettoyage |
| Suppression des tables mortes `messages`, `documents`, `credit_notes` | — | Migration |

**Dépendances** : décision Q5 (adresse d'expédition et domaine) — bloquante.

**Critères de validation**

1. Sur une base vierge, un administrateur s'enrôle au TOTP et accède à
   `/admin` sans intervention SQL.
2. Un client s'inscrit, reçoit l'e-mail de vérification, valide son adresse et
   se connecte.
3. Un mot de passe oublié se réinitialise de bout en bout ; le jeton est à
   usage unique et expire.
4. `npm run db:seed` produit un jeu réaliste : deux clients, un opérateur, un
   administrateur, cinq contacts, cinq demandes avec pièces jointes.
5. Aucun lien de navigation ne renvoie un 404.
6. Un `staff` atteignant `/admin/audit` est redirigé vers `/mon-compte`, et
   l'entrée de menu ne lui est pas affichée.
7. `npm run validate:full` passe.

---

## Phase 2 — Traitement de la demande

**Objectif : le bureau abandonne la boîte mail.**

| Fonctionnalité | Fiche | Nature |
| --- | --- | --- |
| Renommage du préfixe de référence `DEV` → `DEM` | F-02 | Migration + code |
| Renommage `/api/admin/devis/[id]/status` → `/api/admin/demandes/[id]/status` | F-11 | Refactorisation |
| Libellés de statut français partagés client et administration | F-06 | Développement |
| E-mail au client à chaque changement de statut de sa demande | F-11 | Développement |
| Bouton `mailto:` pré-rempli sur un contact | F-10 | Développement |
| Marquage indésirable rendu visible | F-10 | Développement |
| Interdiction d'éditer les coordonnées déclarées | F-11 | Développement |
| Tableau de bord administrateur réduit aux indicateurs réels | — | Nettoyage |
| Gestion des comptes utilisateurs, réservée à `admin` | F-12 | Développement |
| Journalisation `ATTACHMENT_DOWNLOADED` | F-07 | Développement |

**Dépendances** : Phase 1 close. Décision Q2 (nombre d'opérateurs réels).

**Critères de validation**

1. Un contact et une demande soumis apparaissent en administration en moins
   d'une minute, et l'alerte e-mail arrive réellement.
2. Un changement de statut déclenche un e-mail au client, visible dans la
   boîte de réception d'un compte de test réel.
3. Une transition non déclarée est refusée en `409` et n'écrit ni statut, ni
   historique, ni audit.
4. Les données survivent à un redémarrage complet
   (`npm run test:restart` passe).
5. Une nouvelle demande porte une référence `DEM-…` ; les références `DEV-…`
   déjà émises restent lisibles.
6. Aucun indicateur du tableau de bord administrateur ne peut valoir zéro par
   construction.
7. Un `staff` est redirigé depuis `/admin/comptes` et reçoit `403` sur son API.

---

## Phase 3 — Espace client honnête *(clôture de la V1)*

**Objectif : le client voit exactement ce qui existe, ni plus, ni moins.**

| Fonctionnalité | Fiche | Nature |
| --- | --- | --- |
| Retrait des onglets Devis commerciaux, Factures, Chantiers | — | **Nettoyage** |
| Renommage « Messagerie » → « Mes échanges » | F-08 | Nettoyage |
| Renommage « Mes Documents » → « Mes pièces jointes » | F-07 | Nettoyage |
| Renommage `/mon-compte/devis` → `/mon-compte/demandes` | F-06 | Refactorisation |
| Tableau de bord client réduit aux indicateurs réels | F-05 | Nettoyage |
| Statuts en français dans l'espace client | F-06 | Développement |
| Annulation d'une demande non traitée | F-02 | Développement |
| Modification du téléphone sur le profil | F-09 | Développement |
| Révocation des autres sessions | F-09 | Développement |
| États vide, chargement et erreur sur chaque écran | — | Développement |
| Recette mobile à 375 px sur tous les écrans client | — | Recette |

**Dépendances** : Phase 2 close. Décision Q6 (le compte client est-il
conservé).

**Critères de validation**

1. Un client connecté ne voit aucune section vide par construction.
2. Aucun bouton affiché ne reste sans effet observable.
3. Modifier l'identifiant dans l'URL ne donne accès à la ressource d'un autre
   compte ; le refus est un `404`.
4. Chaque écran traite explicitement les trois états, et l'état vide indique
   quoi faire.
5. Tous les écrans client sont utilisables à 375 px de large.
6. Le parcours complet — inscription, vérification, demande, suivi,
   téléchargement, export RGPD — passe en E2E sur un build de production.
7. `npm run validate:full` passe.

> **Fin de la V1.** À ce stade, l'application couvre la captation, le
> traitement et la restitution. Elle ne contient aucun écran fictif.

---

## Phase 4 — Devis commerciaux *(V2)*

**Objectif : sortir du devis papier.** À n'engager que si le volume de
demandes traitées le justifie.

| Fonctionnalité | Nature |
| --- | --- |
| Création d'un devis commercial depuis une demande | Développement |
| Montant HT, TVA belge, résumé, validité | Développement |
| Téléversement du PDF produit à l'extérieur | Développement |
| Envoi au client via l'outbox | Développement |
| Consultation côté client, réintroduction de l'onglet | Développement |
| Acceptation et refus en ligne | **Code déjà écrit et testé, à rebrancher** |
| Traçabilité de l'acceptation : identité, horodatage, empreinte d'IP, version figée | Développement |

**Dépendances** : Phase 3 close. Décisions Q3 et Q4 — l'acceptation en ligne
ne se livre pas sans validation juridique.

**Critères de validation**

1. Un devis créé depuis une demande porte un numéro `DEV-AAAA-NNNN` unique,
   même sous création simultanée.
2. Un devis `accepted` ou `refused` ne peut plus changer d'état ni de montant.
3. Un devis expiré ne peut pas être accepté, même si son statut est encore
   `sent`.
4. Le client reçoit un e-mail à l'envoi et à l'expiration prochaine.
5. Un autre client ne peut ni consulter, ni télécharger, ni décider.
6. Chaque décision produit une entrée d'audit avec l'identité et l'horodatage.

---

## Phase 5 — Chantiers et documents *(V2)*

| Fonctionnalité | Nature |
| --- | --- |
| Création manuelle d'un chantier, rattaché à un client | Développement |
| Statuts `planned` → `in_progress` → `completed`, plus `cancelled` | Développement |
| Titre, adresse, dates prévues, interlocuteur, notes internes | Développement |
| Documents émis par l'entreprise, rattachés au chantier | Développement + migration |
| Consultation côté client, réintroduction de l'onglet | Développement |
| Fil de discussion lié à une demande ou à un chantier | Développement + migration |

**Dépendances** : Phase 4 close.

**Critères de validation**

1. Aucun pourcentage d'avancement n'est affiché.
2. Un chantier n'est jamais créé automatiquement.
3. Une transition de statut non déclarée est refusée.
4. Un document est visible du seul client propriétaire ; le refus est un
   `404` ; chaque téléchargement est audité.

---

## Phase 6 — Facturation *(conditionnelle)*

**Ne démarre pas sans réponse positive à la décision Q1.**

Si le client confirme le besoin, périmètre strictement limité à :
téléversement d'un PDF, rattachement au compte, montant, date d'émission,
échéance, statut `à payer / payée / en retard`, consultation et téléchargement
côté client.

Explicitement exclus, quelle que soit la réponse : moteur de calcul comptable,
export vers un logiciel de comptabilité, relances automatiques, paiement en
ligne.

**Critères de validation**

1. La numérotation est continue et sans doublon sous concurrence.
2. Une facture émise n'est jamais réécrite.
3. Le registre de l'application concorde avec la source comptable.

---

## Nettoyage à effectuer

Inventaire des retraits, à exécuter aux phases indiquées.

### Pages supprimées

| Chemin | Phase | Motif |
| --- | --- | --- |
| `src/app/mon-compte/factures/page.tsx` | 3 | Inatteignable — module reporté |
| `src/app/mon-compte/chantiers/page.tsx` | 3 | Inatteignable — module reporté |
| `src/app/admin/devis/page.tsx` | 3 | Lecture seule sur une table jamais alimentée |
| `src/app/admin/factures/page.tsx` | 3 | Idem |

### Pages renommées

| Avant | Après | Phase |
| --- | --- | --- |
| `/mon-compte/devis` | `/mon-compte/demandes` | 3 |
| `/mon-compte/messages` | `/mon-compte/echanges` | 3 |
| `/api/admin/devis/[id]/status` | `/api/admin/demandes/[id]/status` | 2 |

### Routes d'API désactivées

| Chemin | Phase | Devenir |
| --- | --- | --- |
| `/api/client/devis/[id]/accept` | 3 | **Conservé en dépôt, route retirée.** Rebranché en Phase 4 |
| `/api/client/devis/[id]/refuse` | 3 | Idem |
| `/api/pdf/quote/[id]` | 3 | Retiré. Le module devis livrera un vrai PDF |
| `/api/pdf/invoice/[id]` | 3 | Retiré jusqu'à l'arbitrage Q1 |

### Composants supprimés

| Composant | Phase | Devenir |
| --- | --- | --- |
| `src/components/account/QuoteDecisionButtons.tsx` | 3 | Supprimé du dépôt : composant non monté et hors périmètre livré |

### Entrées de navigation retirées

| Emplacement | Entrée | Phase |
| --- | --- | --- |
| `src/app/admin/layout.tsx` | `/admin/chantiers` — **cible inexistante, 404** | **1** |
| `src/app/admin/layout.tsx` | `/admin/clients` — **cible inexistante, 404** | **1** |
| `src/app/admin/layout.tsx` | « Créer / Gérer Devis » | 3 |
| `src/app/admin/layout.tsx` | « Facturation Immuable » | 3 |
| `src/app/mon-compte/layout.tsx` | « Mes Factures » | 3 |
| `src/app/mon-compte/layout.tsx` | « Mes Chantiers » | 3 |

### Indicateurs retirés

| Écran | Indicateur | Phase |
| --- | --- | --- |
| `/mon-compte` | « Devis à examiner » | 3 |
| `/mon-compte` | « Pièces jointes » | 3 |
| `/admin` | « Devis commerciaux émis » et « € HT » | 2 |
| `/admin` | « Chantiers actifs » et « € à encaisser » | 2 |

### Schéma de base

| Objet | Phase | Motif |
| --- | --- | --- |
| Table `messages` | 1 | Aucun code — recréée en Phase 5 |
| Table `documents` | 1 | Aucun code — recréée en Phase 5 |
| Table `credit_notes` | 1 | Aucun code — dépend d'une facturation non retenue |
| Valeurs `project`, `message`, `document` de `ResourceType` | 1 | Ressources sans table |

Les tables `quotes`, `quote_lines`, `invoices` et `projects` sont
**conservées** : leur module est reporté, pas annulé, et leur schéma est déjà
correct.

### Mocks supprimés

Aucun. L'audit n'a trouvé aucune donnée de démonstration codée en dur dans
l'application. Le seul travail dans ce registre est l'**ajout** d'un jeu de
seed réel, en Phase 1.

---

## Récapitulatif des dépendances critiques

| Fonctionnalité | Ne peut pas être déclarée livrable sans |
| --- | --- |
| Toute page `/admin` | Enrôlement TOTP fonctionnel |
| Tout e-mail sortant | SMTP configuré **et** dispatch planifié |
| Vérification d'adresse, mot de passe oublié | E-mail sortant |
| Consultation d'une demande | Authentification, `quote_requests`, permissions, contrôle d'appartenance |
| Téléchargement d'une pièce jointe | Stockage privé accessible, quota, audit |
| Devis commercial | Création administrateur, numérotation séquentielle, machine à états |
| Chantier | Devis commercial livré |
| Document émis | Chantier livré |
| Facture | Décision Q1 tranchée |
