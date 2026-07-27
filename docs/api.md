# Points de terminaison HTTP

> Référence des routes d'API de la V1. Le périmètre fonctionnel est décrit dans
> [functional-scope.md](functional-scope.md), les droits dans
> [roles-and-permissions.md](roles-and-permissions.md).

## Conventions

**Toutes les mutations passent par une route `/api/`, jamais par une Server
Action.** Ce n'est pas un choix de style : le contrôle d'origine du filtre de
bordure (`src/proxy.ts`) ne s'applique qu'aux chemins `/api/`. Une Server
Action poste vers l'URL de la page et échapperait à ce contrôle au profit du
seul mécanisme interne de Next. Un seul mécanisme, une seule barrière à
vérifier.

Corollaire : **toute requête mutante doit prouver son origine**, par
`Sec-Fetch-Site` (posé par le navigateur) ou par un en-tête `Origin`
correspondant au site. Un client non-navigateur qui l'omet reçoit `403`.

### Forme des réponses

Succès :

```json
{ "success": true, "data": { } }
```

Échec :

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Veuillez vérifier les champs indiqués.",
    "fields": { "phone": ["Numéro de téléphone invalide."] }
  }
}
```

`fields` n'est présent que pour `VALIDATION_ERROR`. Le client lit `error.code`,
jamais `error.message` : le texte peut être reformulé sans rien casser.

Les enveloppes sont construites exclusivement par `src/lib/api/responses.ts` :
aucun handler ne compose sa propre réponse d'échec, donc aucun ne peut y
glisser une trace d'exécution, un nom de table ou un message du pilote
PostgreSQL.

### Codes

| Code | HTTP | Signification |
| --- | --- | --- |
| — | 200 | Lecture ou modification aboutie |
| — | 201 | Ressource créée |
| — | 204 | Action aboutie, rien à renvoyer |
| `BAD_REQUEST` | 400 | Requête malformée |
| `UNAUTHENTICATED` | 401 | Session absente ou expirée |
| `FORBIDDEN` | 403 | Rôle insuffisant, ou origine non prouvée |
| `NOT_FOUND` | 404 | Ressource inexistante **ou** n'appartenant pas à l'appelant |
| `CONFLICT` | 409 | Conflit métier : transition interdite, double soumission |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | `Content-Type` non pris en charge |
| `VALIDATION_ERROR` | 422 | Corps syntaxiquement valide, sémantiquement refusé |
| `RATE_LIMITED` | 429 | Quota dépassé |
| `INTERNAL_ERROR` | 500 | Erreur maîtrisée côté serveur |
| `SERVICE_UNAVAILABLE` | 503 | PostgreSQL ou stockage indisponible |

**`404` et non `403` pour un refus d'appartenance.** Sur un identifiant de
demande ou de pièce jointe, un `403` confirmerait l'existence de la ressource
et permettrait d'énumérer le portefeuille client. Les deux cas — « n'existe
pas » et « ne vous appartient pas » — produisent une réponse identique.

---

## Public

### `POST /api/contact`

Enregistre un message de contact.

- **Droit** : public
- **En-tête requis** : `Idempotency-Key`
- **Protections** : honeypot, contrôle du délai de saisie, quota par IP et par
  adresse e-mail, Turnstile
- **Entrée** : `fullName`, `email`, `phone`, `subject`, `message`,
  `consentPrivacy`, `captchaToken?`
- **Réponses** : `201` avec la référence `CNT-AAAA-NNNNNN` · `409` doublon,
  avec la référence d'origine · `422` validation · `503` persistance impossible

### `POST /api/devis`

Enregistre une demande de devis et ses pièces jointes (`multipart/form-data`).

- **Droit** : public ; rattachement au compte si une session existe
- **En-tête requis** : `Idempotency-Key`
- **Réponses** : `201` avec la référence · `409` doublon · `413` fichier trop
  volumineux · `422` validation ou type de fichier refusé

### `GET|POST|DELETE /api/devis/draft`

Brouillon serveur de l'assistant. Réservé aux comptes connectés en écriture ;
la lecture répond `{ authenticated: false, draft: null }` à un visiteur.

### `GET /api/health`

Sonde de disponibilité. Aucune donnée métier.

---

## Espace client

Toutes ces routes exigent une session. **L'identité provient systématiquement
de la session serveur** ; aucun schéma n'accepte de champ `userId`.

### `PATCH /api/client/profile`

Modifie le profil.

- **Droit** : titulaire du compte
- **Quota** : 30 / heure par compte
- **Entrée** : `{ "phone": "0470123456" }` — liste blanche stricte. La chaîne
  vide vaut effacement. Tout champ inconnu (`role`, `email`, `id`…) fait
  échouer la validation au lieu d'être ignoré
- **Réponses** : `200` · `404` compte introuvable · `422` validation

### `POST /api/client/demandes/[reference]/cancel`

Annule une demande dont l'appelant est propriétaire.

- **Droit** : propriétaire, et transition `→ cancelled` déclarée
- **Quota** : 10 / heure par compte
- **Réponses** : `200` · `404` inexistante ou appartenant à un tiers · `409`
  état ne permettant plus l'annulation

L'écriture, l'entrée d'historique et l'audit sont dans une même transaction.

### `POST /api/client/sessions/revoke-others`

Ferme toutes les sessions du compte sauf celle qui présente la requête.

- **Droit** : titulaire ; la session conservée est résolue côté serveur et ne
  peut pas être désignée par l'appelant
- **Réponses** : `200` · `401`

### `GET /api/client/privacy/export`

Export RGPD au format JSON. Ne contient ni notes internes, ni chemins de
stockage, ni secrets.

### `GET /api/files/quote-attachments/[id]`

Télécharge une pièce jointe.

- **Droit** : propriétaire de la demande porteuse, ou opérateur
- **Quota** : 60 / minute par compte
- **Audit** : chaque téléchargement écrit `document.downloaded`
- **Réponses** : `200` (flux binaire, `Cache-Control: private, no-store`) ·
  `404` · `503` stockage indisponible

### `POST /api/client/devis/[id]/accept|refuse`

Acceptation et refus d'un devis commercial. **Code conservé mais inatteignable
en V1** : aucun chemin ne crée de devis commercial. Rebranché en Phase 4.

---

## Back-office

Droit `staff` ou `admin`, sauf mention contraire.

### `POST /api/admin/contacts/[id]/status`

Transition de statut d'un message de contact, avec affectation facultative.

- **Entrée** : `status`, `reason?`, `assignedToUserId?`
- **Réponses** : `200` · `403` rôle insuffisant ou opérateur désactivé · `404`
  · `409` transition non déclarée, ou statut modifié entre-temps · `422`

Les notes internes **ne passent plus par ici** : elles écrasaient la note
précédente à chaque changement de statut.

### `POST /api/admin/demandes/[id]/status`

Même contrat, sur une demande de devis.

Route renommée depuis `/api/admin/devis/[id]/status` : elle agit sur
`quote_requests`, alors que `/admin/devis` affichait `quotes`. Le même mot
désignait deux objets distincts.

Un changement vers `contacted`, `visit_scheduled`, `estimate_sent`, `accepted`,
`rejected` ou `cancelled` insère une notification client dans l'outbox, **dans
la même transaction** que la transition.

### `POST /api/admin/notes`

Ajoute une note interne à un dossier.

- **Entrée** : `entityType` (`contact_message` | `quote_request`), `entityId`,
  `content` (1 à 5000 caractères)
- **Réponses** : `201` · `403` rôle client · `404` dossier inexistant · `422`

L'existence du dossier est vérifiée avant insertion : `entity_id` est
polymorphe, donc sans clé étrangère, et rien au niveau du moteur n'empêcherait
d'attacher une note à un identifiant inexistant.

---

## Quotas de débit

| Politique | Fenêtre | Plafond |
| --- | --- | --- |
| `login` | 15 min | 10 |
| `register`, `passwordReset` | 1 h | 5 |
| `contactMessage`, `quoteRequest` | 1 h | 5 |
| `contactMessagePerEmail` | 24 h | 8 |
| `quoteRequestPerEmail` | 24 h | 5 |
| `upload` | 1 h | 20 |
| `documentDownload` | 1 min | 60 |
| `quoteDecision` | 1 h | 20 |
| `accountUpdate` | 1 h | 30 |
| `requestCancel` | 1 h | 10 |
| `browse` | 1 min | 120 |

Le compteur porte sur l'IP pour les routes publiques, sur le compte pour les
routes authentifiées : une action authentifiée doit voir son quota suivre
l'identité, pas le réseau.
