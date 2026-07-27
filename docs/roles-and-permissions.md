# Rôles et permissions — Zlobodan

> Référence unique des rôles retenus et des droits associés.
>
> Décisions de périmètre → [functional-scope.md](functional-scope.md).
> Matrice fonctionnelle → [feature-matrix.md](feature-matrix.md).

## 1. Principe directeur

**Refus par défaut.** Une permission qui n'est pas explicitement accordée dans
ce document est refusée. Ajouter une ressource ou une action sans l'inscrire
ici la rend inaccessible — c'est le bon sens d'échec.

Trois règles complémentaires :

1. **Le contrôle vit dans les layouts serveur et les handlers d'API**, jamais
   dans `middleware.ts`. La CVE-2025-29927 permet de neutraliser l'exécution
   du middleware Next.js via un en-tête forgé ; le middleware n'est qu'un
   filet secondaire. Voir `src/lib/security/guards.ts`.
2. **L'appartenance se vérifie sur la ligne chargée en base**, jamais sur un
   identifiant reçu. Un refus d'appartenance répond `404`, jamais `403` : un
   `403` confirmerait l'existence de la ressource et permettrait d'énumérer le
   portefeuille client.
3. **Un drapeau de fonctionnalité n'est pas une permission.** Une
   fonctionnalité désactivée doit être inaccessible côté serveur, pas
   seulement masquée dans le menu.

## 2. Rôles retenus

Trois rôles, correspondant à trois personnes ou groupes réels.

| Rôle | Valeur en base | Qui | Point d'entrée |
| --- | --- | --- | --- |
| Visiteur | *aucune session* | Public | `/` |
| Client | `client` | Particulier ayant créé un compte | `/mon-compte` |
| Opérateur | `staff` | Personne du bureau qui traite les dossiers | `/admin` |
| Administrateur | `admin` | Gérant de la SRL | `/admin` |

### Rôles écartés

| Rôle proposé | Décision | Raison |
| --- | --- | --- |
| `employee` | **Supprimé** | Aucun compagnon de chantier n'utilise le système. Le champ `quote_requests.assigned_to_user_id` désigne déjà l'opérateur responsable. |
| `manager` | **Fusionné avec `admin`** | Une seule personne dirige. Un rôle intermédiaire sans utilisateur est une surface d'attaque gratuite. |
| `super_admin` | **Supprimé** | Les opérations les plus sensibles — changement de rôle, migration — passent par la base et le déploiement, pas par l'interface. |

Créer un rôle se justifie quand une personne réelle a besoin d'un sous-ensemble
strict de droits. Ce n'est le cas d'aucun des trois rôles écartés.

## 3. Matrice officielle des permissions

Portée : **périmètre V1 uniquement**. Les modules reportés (devis
commerciaux, chantiers, factures) apparaissent en fin de tableau avec la
mention *reporté*, pour que leur cadrage soit déjà fixé.

Légende : **Oui** · **Non** · **Siens** (uniquement ses propres ressources) ·
**Reporté** (module hors V1).

### 3.1 Public et captation

| Fonctionnalité | Visiteur | Client | Opérateur | Admin |
| --- | --- | --- | --- | --- |
| Consulter le site vitrine | Oui | Oui | Oui | Oui |
| Envoyer un message de contact | Oui | Oui | Oui | Oui |
| Soumettre une demande de devis | Oui | Oui | Oui | Oui |
| Téléverser une pièce jointe à sa demande | Oui | Oui | Oui | Oui |
| Enregistrer un brouillon de demande | Non | Oui | Oui | Oui |
| Créer un compte | Oui | — | — | — |

### 3.2 Espace client

| Fonctionnalité | Visiteur | Client | Opérateur | Admin |
| --- | --- | --- | --- | --- |
| Accéder à `/mon-compte` | Non | Oui | Oui | Oui |
| Voir ses demandes de devis | Non | Siens | Siens | Siens |
| Annuler une demande non traitée | Non | Siens | Non | Non |
| Voir ses pièces jointes | Non | Siens | Siens | Siens |
| Télécharger une pièce jointe | Non | Siens | Oui | Oui |
| Voir son historique d'échanges | Non | Siens | Siens | Siens |
| Consulter son profil | Non | Siens | Siens | Siens |
| Modifier son téléphone | Non | Siens | Siens | Siens |
| Modifier son adresse e-mail avec confirmation | Non | Siens | Siens | Siens |
| Changer son mot de passe | Non | Siens | Siens | Siens |
| Activer/désactiver sa 2FA | Non | Siens | Siens | Siens |
| Régénérer ses codes de récupération | Non | Siens | Siens | Siens |
| Lister et révoquer ses appareils | Non | Siens | Siens | Siens |
| Révoquer ses autres sessions | Non | Siens | Siens | Siens |
| Exporter ses données personnelles | Non | Siens | Siens | Siens |
| Demander la suppression de son compte | Non | Siens | Siens | Siens |
| Supprimer son compte lui-même | Non | Non | Non | Non |

### 3.3 Back-office

| Fonctionnalité | Visiteur | Client | Opérateur | Admin |
| --- | --- | --- | --- | --- |
| Accéder à `/admin` | Non | Non | Oui | Oui |
| Voir tous les messages de contact | Non | Non | Oui | Oui |
| Changer le statut d'un contact | Non | Non | Oui | Oui |
| Écrire une note interne sur un contact | Non | Non | Oui | Oui |
| Affecter un contact | Non | Non | Oui | Oui |
| Marquer un contact comme indésirable | Non | Non | Oui | Oui |
| Voir toutes les demandes de devis | Non | Non | Oui | Oui |
| Changer le statut d'une demande | Non | Non | Oui | Oui |
| Écrire une note interne sur une demande | Non | Non | Oui | Oui |
| Affecter une demande | Non | Non | Oui | Oui |
| Ouvrir les pièces jointes d'une demande | Non | Non | Oui | Oui |
| Modifier les coordonnées déclarées par un client | Non | Non | **Non** | **Non** |
| Lister les comptes utilisateurs | Non | Non | **Non** | Oui |
| Voir la fiche d'un compte `client` | Non | Non | Non | Oui |
| Voir la fiche d'un compte `staff` ou `admin` | Non | Non | **Non** | Oui |
| Désactiver ou réactiver un compte `client` | Non | Non | Non | Oui |
| Désactiver un compte `staff` | Non | Non | **Non** | Oui |
| Désactiver un compte `admin` | Non | Non | Non | **Non** |
| Changer le rôle d'un compte | Non | Non | Non | **Non** *(hors interface en V1)* |
| Déclencher une réinitialisation de mot de passe | Non | Non | Non | Oui |
| Révoquer les sessions d'un autre utilisateur | Non | Non | Non | Oui |
| Supprimer physiquement un compte | Non | Non | Non | **Non** |
| Consulter le journal d'audit | Non | Non | **Non** | Oui |
| Modifier ou effacer le journal d'audit | Non | Non | Non | **Non** |

### 3.4 Modules reportés — cadrage anticipé

| Fonctionnalité | Visiteur | Client | Opérateur | Admin |
| --- | --- | --- | --- | --- |
| Voir ses devis commerciaux | Non | Reporté V2 · Siens | Reporté V2 | Reporté V2 |
| Accepter ou refuser un devis commercial | Non | Reporté V2 · Siens | **Non** | **Non** |
| Créer et envoyer un devis commercial | Non | Non | Reporté V2 | Reporté V2 |
| Modifier un devis déjà accepté | Non | Non | **Non** | **Non** |
| Voir ses chantiers | Non | Reporté V2 · Siens | Reporté V2 | Reporté V2 |
| Créer et suivre un chantier | Non | Non | Reporté V2 | Reporté V2 |
| Voir ses factures | Non | À confirmer · Siens | À confirmer | À confirmer |
| Créer ou déposer une facture | Non | Non | À confirmer | À confirmer |

## 4. Règles d'escalade

Les interdictions suivantes sont absolues et doivent être couvertes par des
tests de permissions dédiés.

1. **Un opérateur ne peut pas atteindre un compte plus privilégié.** Un
   `staff` ne voit pas, ne liste pas et ne modifie pas un compte `staff` ou
   `admin`. La liste des comptes lui est entièrement refusée en V1.
2. **Un administrateur ne peut désactiver aucun compte `admin`**, lui-même
   compris. Une intervention sur un administrateur passe par une procédure
   d’exploitation auditée, afin d’éviter le verrouillage du système.
3. **Le changement de rôle ne passe pas par l'interface en V1.** Il s'effectue
   en base, par le compte de migration, et laisse une entrée d'audit
   `USER_ROLE_CHANGED` écrite manuellement.
4. **Aucun rôle ne peut modifier le journal d'audit.** Le compte applicatif ne
   doit disposer que d'un `INSERT` et d'un `SELECT` sur `audit_log`.
5. **Une session `client` ne peut jamais devenir une destination `/admin`**,
   même si le paramètre `next` de la connexion est forgé. Déjà couvert par
   `getPostLoginDestination`.
6. **Le double facteur est obligatoire pour `staff` et `admin`.** Un compte
   privilégié sans secret enrôlé ne reçoit aucune session — le refus est
   complet, il n'y a pas de mode dégradé.

## 5. Écarts relevés au cadrage — état

Les trois écarts identifiés lors du cadrage sont **corrigés**.

| # | Écart | État | Où |
| --- | --- | --- | --- |
| P1 | `canStaff()` autorisait toute action sauf deux suppressions : un `staff` avait donc `manage` sur `users`, donc en droit l'élévation de rôle | **Corrigé** — liste blanche `STAFF_RESOURCES`, aucun droit sur `users` ni `audit_log`, aucune suppression | `src/lib/auth/permissions.ts` |
| P2 | `/admin/audit` protégé par le seul layout `["staff","admin"]` : un opérateur lisait le journal complet, empreintes d'IP comprises | **Corrigé** — garde propre à la page, et l'entrée de menu n'est plus rendue pour `staff` | `src/app/admin/audit/page.tsx` |
| P3 | `users.role` était un `varchar(20)` sans contrainte | **Corrigé** — `CHECK (role IN ('client','staff','admin'))` | migration `0003` |

Le type `ResourceType` comporte encore `project`, `message` et `document`, qui
correspondent à des tables sans code. Ces valeurs sont conservées le temps que
leur module arrive ; elles ne donnent accès à rien, puisque aucune route ne les
emploie.

### Gardes de page

Chaque page du back-office porte désormais **sa propre** garde, en plus de
celle du layout. Un layout est un filet, pas une barrière : une page ajoutée
sans garde hériterait silencieusement du niveau le plus permissif de son
segment.

## 6. Tests de permissions exigés

Aucune fonctionnalité n'est déclarée livrée sans ces tests, en complément de
`src/__tests__/accessControl.test.ts` et `authRedirects.test.ts` :

- un `client` atteignant `/admin` et chacune de ses sous-routes est redirigé ;
- un `client` appelant chaque route d'API `/api/admin/*` reçoit `403` ;
- un utilisateur non authentifié appelant une route privée reçoit `401` ;
- un `client` demandant une pièce jointe qui ne lui appartient pas reçoit
  `404`, et non `403` ;
- un `staff` atteignant `/admin/audit` ou `/admin/comptes` est **redirigé**
  vers `/mon-compte` — convention du projet pour les pages, qui évite de
  confirmer l'existence de la zone ;
- un `staff` appelant l'API de gestion de comptes reçoit `403` ;
- l'entrée de menu « Audit » n'apparaît pas pour un `staff` ;
- un compte `admin` sans secret TOTP ne reçoit aucune session ;
- une transition de statut non déclarée est refusée en `409` et n'écrit rien.

## 7. Drapeaux de fonctionnalité

Un seul cas d'usage justifie un drapeau en V1 : masquer un module partiellement
déployé pendant sa phase de recette.

```ts
export type FeatureFlags = Readonly<{
  /** Devis commerciaux — création admin et consultation client. Retrait prévu : livraison Phase 3. */
  commercialQuotes: boolean;
  /** Chantiers — création admin et suivi client. Retrait prévu : livraison Phase 4. */
  projects: boolean;
  /** Factures — sous réserve de la décision Q1. Retrait prévu : arbitrage client. */
  invoices: boolean;
}>;
```

Contraintes :

- les valeurs sont résolues **côté serveur**, jamais lues depuis le
  navigateur ;
- un drapeau désactivé rend la route **inaccessible** — la page renvoie
  `notFound()` et l'API renvoie `404` — il ne se contente pas de retirer
  l'entrée de menu ;
- un drapeau ne remplace jamais un contrôle de permission : les deux
  s'appliquent, dans cet ordre ;
- chaque drapeau porte en commentaire sa **condition de retrait**. Un drapeau
  sans date ni condition est un défaut.

En V1, la position par défaut des trois drapeaux est `false`, et les routes
correspondantes sont retirées du dépôt plutôt que masquées — voir la section
« Nettoyage » de [delivery-roadmap.md](delivery-roadmap.md).
