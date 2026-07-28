# Documents émis

Documents produits par l'entreprise, versionnés et rattachés à un client. À ne
pas confondre avec les **pièces jointes**, déposées par le client, décrites dans
[uploads.md](uploads.md).

## Périmètre V1

Un seul type est implémenté :

| Type | Entité liée | Généré ou téléversé | Destinataire |
| --- | --- | --- | --- |
| `quote_request_summary` | `quote_requests` | Généré côté serveur | Client propriétaire et opérateur affecté |

La contrainte `CHECK` de la table n'énumère que ce type. Y inscrire `invoice` ou
`contract` « pour plus tard » décrirait une base qui promet des documents
inexistants ; ajouter un type le jour venu est une migration d'une ligne, plus
un gabarit et une entrée dans les tables de correspondance de
`lib/documents/naming.ts`.

Le devis commercial et la facture **ne sont pas** au périmètre : les tables
`quotes` et `invoices` n'ont aujourd'hui aucun chemin d'écriture dans
l'application, et les servir supposerait de construire d'abord l'interface de
création côté administration.

## Moteur PDF

`pdf-lib`, en JavaScript pur.

Retenu contre un rendu HTML par navigateur sans tête : celui-ci impose environ
300 Mo de binaire Chromium, une mémoire imprévisible et une compatibilité
serverless médiocre — pour un document dont la structure est stable et connue.
`pdf-lib` n'a aucune dépendance native, se comporte identiquement en
développement et en production, et laisse un contrôle exact des sauts de page.

Contrepartie assumée : `pdf-lib` ne fournit que des primitives de dessin. La
notion de flux, de saut de page et de tableau est apportée par
`lib/pdf/writer.ts` et `lib/pdf/canvas.ts`.

### Polices et jeu de caractères

Polices standard PDF (Helvetica), donc **aucun fichier de police** dans le
dépôt et aucune dépendance réseau à la génération.

Ces polices utilisent l'encodage WinAnsi, qui couvre le français mais rien
au-delà, et `pdf-lib` **lève une exception** sur un caractère hors jeu. La
description d'une demande étant un champ libre, `lib/pdf/text.ts` translittère
tout texte en amont : les accents, ligatures, tiret cadratin, `m²` et le symbole
euro passent intacts ; `ā` devient `a` ; un emoji devient `?`. Aucune saisie ne
peut donc faire échouer une génération.

## Stockage

Le stockage privé existant est réutilisé tel quel
(`lib/storage/private-object-store.ts`, pilote local ou S3). **Aucune variable
d'environnement nouvelle** n'est introduite : `UPLOAD_STORAGE_DRIVER`,
`LOCAL_UPLOAD_DIRECTORY` et les identifiants S3 gouvernent déjà les deux usages.

Clé interne, jamais une URL et jamais exposée :

```
documents/quote-request-summary/2026/<uuid-document>/version-2.pdf
```

L'identifiant du document sert de répertoire : les versions se regroupent et
deux documents ne peuvent pas entrer en collision. Rien n'est écrit dans
`public/`.

Nom proposé au téléchargement, construit côté serveur et jamais reçu du
navigateur :

```
zlobodan-recapitulatif-demande-rec-2026-000042-v2.pdf
```

## Modèle de données

Deux tables, migration `0005_documents.sql`.

`documents` porte l'**identité** — propriétaire, demande d'origine, type,
statut, visibilité, référence publique, version courante. `document_versions`
porte les **fichiers** : un par génération, avec sa clé, sa taille et son
empreinte SHA-256. Rien n'est jamais écrasé.

La table `documents` de la migration `0000` a été supprimée puis recréée : elle
n'était ni lue ni écrite par une seule ligne du dépôt, donc vide par
construction, et décrivait un fichier unique par ligne — ce qui interdit tout
historique.

### Statuts

| Colonne | Valeurs | Sens |
| --- | --- | --- |
| `documents.status` | `generated`, `sent`, `archived`, `cancelled` | Cycle de vie |
| `document_versions.state` | `pending`, `ready`, `failed` | Fabrication du fichier |

L'état de fabrication est porté par la **version**, parce que c'est le fichier
que l'on fabrique, pas l'identité. Une contrainte `CHECK` refuse `ready` sans
clé de stockage, sans empreinte ou de taille nulle : un document annoncé
disponible mais introuvable au téléchargement est impossible par construction.

### Références

`REC-2026-000042`, produites par la séquence PostgreSQL
`seq_document_reference` via `lib/db/public-references.ts`. `nextval()` est le
seul mécanisme dont l'incrément est atomique sans verrou. Une transaction
annulée consomme son numéro : un trou est acceptable et explicable, un doublon
ne l'est pas.

## Génération

`lib/documents/generate.ts`. L'ordre des opérations répond à une seule
question : que reste-t-il si le processus meurt ici ?

1. **Transaction** — document créé au besoin, ligne de version en `pending`,
   **clé de stockage déjà inscrite** ;
2. **Hors transaction** — rendu du PDF, puis écriture dans le stockage ;
3. **Transaction** — passage en `ready`, empreinte, bascule de
   `current_version_id`, péremption de la version précédente.

Écrire la ligne avant le fichier est le seul ordre qui ne produit jamais de
fichier inconnu de la base : une interruption laisse une version `pending` dont
la clé est connue, donc réconciliable. L'ordre inverse laisserait un objet
orphelin que plus rien ne référence.

Le rendu et l'écriture sont gardés **séparément**, pour que l'origine de la
panne soit connue structurellement et non devinée d'après un message
d'exception.

### Idempotence

Une empreinte SHA-256 des données réellement imprimées est stockée sur chaque
version. Régénérer une demande inchangée renvoie la version existante plutôt que
d'empiler un fichier identique. L'empreinte ignore `updated_at`, qui bouge à
chaque écriture y compris sur un champ absent du document.

`force: true` émet une nouvelle version explicitement. L'ancienne reste stockée
et téléchargeable.

## Contrôle d'accès

`lib/documents/authorize.ts`, fonction **pure** : ni session, ni base, ni
requête. La matrice complète est donc testable sans serveur
(`test/unit/documentAccess.test.ts`).

Elle complète `lib/auth/permissions.can()` sans la remplacer. `can()` répond
« ce rôle manipule-t-il des documents en général » et accorde à `staff` toutes
les actions sur la ressource. `authorizeDocumentAccess` tranche la question
dangereuse : **ce** document, pour **cet** utilisateur.

| Visibilité | Administration | Opérateur affecté | Client propriétaire |
| --- | --- | --- | --- |
| `private_admin` | ✅ | ❌ | ❌ |
| `assigned_staff` | ✅ | ✅ | ❌ |
| `client` | ✅ | ❌ | ✅ |
| `client_and_staff` | ✅ | ✅ | ✅ |

Règles transverses :

- un opérateur **non affecté** au dossier n'a aucun accès, quelle que soit la
  visibilité — appartenir au pôle ne donne pas le portefeuille entier ;
- l'archivage est réservé à l'administration ;
- un document supprimé logiquement n'est servi à personne ;
- un document archivé sort des écrans du client mais reste consultable par
  l'entreprise.

Le refus est toujours rendu en **404**, jamais en 403 : un 403 sur un
identifiant de document confirmerait son existence et permettrait d'énumérer le
portefeuille client. Le motif du refus alimente le journal d'audit et ne quitte
jamais le serveur.

## Routes

| Méthode | Route | Rôle | Codes |
| --- | --- | --- | --- |
| `POST` | `/api/admin/demandes/[id]/documents` | `staff` affecté, `admin` | 201 créé, 200 réutilisé, 404, 422, 429, 500, 503 |
| `GET` | `/api/documents/[publicId]/download` | selon visibilité | 200, 401, 404, 429, 503 |
| `GET` | `/api/documents/[publicId]/preview` | selon visibilité | 200, 401, 404, 429, 503 |

Consultation et téléchargement passent par la **même** résolution
(`lib/documents/access.ts`) et ne diffèrent que par `Content-Disposition`. Une
prévisualisation « allégée » est le moyen le plus courant de rouvrir un accès
qu'on croyait fermé.

Le corps de la requête de génération ne porte que des intentions — type et
`force`. Ni propriétaire, ni clé de stockage, ni référence, ni visibilité ne
sont acceptés depuis l'extérieur.

### En-têtes

```
Content-Type: application/pdf
Content-Disposition: attachment|inline; filename="…"; filename*=UTF-8''…
X-Content-Type-Options: nosniff
Cache-Control: private, no-store, max-age=0, must-revalidate
Referrer-Policy: no-referrer
Content-Security-Policy: default-src 'none'; object-src 'none'; sandbox
```

Les octets transitent par la route ; il n'y a **aucune redirection** vers le
stockage. C'est ce qui garantit que rien n'est servi sans contrôle, et ce qui
rend le téléchargement journalisable — impossible derrière une URL signée.

`lib/security/signed-urls.ts` existe dans le dépôt mais n'est utilisé par aucun
chemin de code : le modèle retenu est le passage par la route.

## Journal d'audit

Écrit via `logAuditEvent` dans la table `audit_log` existante, plutôt que dans
une table parallèle.

`document.generated`, `document.generation_failed`, `document.viewed`,
`document.downloaded`.

N'y figurent jamais : le contenu du document, la clé de stockage, une URL
signée. L'empreinte suffit à prouver quelle version a été produite.

## Interfaces

- `/mon-compte/documents` — documents établis, puis pièces jointes. La liste
  porte la propriété dans sa clause `where` et exclut les versions non
  publiées.
- `/admin/demandes/[id]` — panneau de génération et historique complet des
  versions, échecs compris : masquer un échec le rendrait indétectable.

Le bouton de génération est masqué à l'opérateur non affecté, et la route
applique la **même** règle : masquer un bouton ne protège rien à lui seul.

## Tests

| Fichier | Portée |
| --- | --- |
| `test/unit/pdfEngine.test.ts` | Translittération, découpe, pagination, métadonnées |
| `test/unit/documentTemplate.test.ts` | Contenu réellement imprimé, décodé depuis les flux |
| `test/unit/documentAccess.test.ts` | Matrice d'autorisation, noms, clés, en-têtes |

Les tests de gabarit décompressent les flux de contenu et décodent les chaînes
hexadécimales : chercher le texte dans les octets bruts ne trouve rien, et un
test qui s'en contenterait passerait aussi bien sur un PDF vide.

## Limites connues

- **Aucun logo.** Le dépôt ne contient pas d'actif de marque ; l'en-tête est
  typographique. L'ajout se réduira à un `embedPng` le jour où le fichier
  existera.
- **Pas de génération asynchrone.** Le récapitulatif se rend en quelques
  dizaines de millisecondes ; une file d'attente serait de la complexité sans
  contrepartie.
- **Pas de nettoyage automatique des versions `failed`.** Leur clé est inscrite,
  donc elles sont réconciliables, mais aucune tâche planifiée ne les balaie
  encore.
- **Documents téléversés par l'administration** : hors périmètre V1.
- **Instantané drizzle-kit `0005` manquant.** Sans effet sur `db:migrate` ;
  à produire depuis un terminal interactif avant le prochain `db:generate`.
  Procédure dans [database.md](database.md).
- **Vérification en base non effectuée** dans l'environnement de développement
  ayant produit ce module : PostgreSQL n'y était pas joignable. Migration,
  tests d'intégration, parcours E2E et test de persistance après redémarrage
  restent à exécuter.
