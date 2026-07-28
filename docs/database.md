# PostgreSQL et modèle de données

## Tables principales

| Table | Rôle |
| --- | --- |
| `contact_messages` | Message, référence, clé d’idempotence, propriétaire, consentement et statut |
| `contact_status_history` | Journal immuable des transitions de contact |
| `quote_requests` | Besoin technique, coordonnées, référence, propriétaire et workflow |
| `quote_attachments` | Métadonnées privées : clé objet, nom, MIME, taille, empreinte et dimensions |
| `quote_status_history` | Journal immuable des transitions de demande |
| `notification_outbox` | Emails à envoyer, charge sensible chiffrée, état, tentatives et prochaine échéance |
| `internal_notes` | Notes de back-office : auteur, horodatage, historique |
| `users` | Identité, email normalisé, hash bcrypt, rôle et statut |
| `sessions` | Sessions opaques hachées, appareils, expiration et révocation |
| `email_verification_tokens`, `password_reset_tokens` | Tokens hachés, expiration et consommation |
| `email_change_requests` | Nouvelle adresse et token de confirmation haché |
| `user_two_factor` | Secret TOTP chiffré, état et dernier pas utilisé |
| `two_factor_recovery_codes` | Codes de secours hachés et consommation |
| `auth_challenges` | Étapes 2FA temporaires, token haché et nombre d’essais |
| `security_events` | Événements de compte, session et authentification |
| `documents` | Identité d’un document émis : propriétaire, demande liée, type, statut, visibilité, référence publique et version courante |
| `document_versions` | Fichiers successifs : clé de stockage, taille, empreinte SHA-256, état de fabrication et péremption |
| `quotes`, `invoices`, `projects`, `messages` | Suite commerciale — **schéma présent, aucun chemin d’écriture en V1** |
| `audit_log` | Événements de sécurité et d’administration |

### Notes internes

Elles vivaient dans une colonne `internal_notes` sur `contact_messages` et
`quote_requests`, écrasée à chaque enregistrement de statut : aucun auteur,
aucune date, et la note d’un opérateur effacée sans trace par le suivant. La
migration `0003` les déplace dans une table dédiée, reprend l’existant et
supprime les colonnes d’origine.

Le rattachement est polymorphe — deux entités seulement, contraintes par un
`CHECK` — plutôt que deux tables jumelles : la note n’a aucune sémantique
propre à son porteur. PostgreSQL ne sachant pas référencer deux tables depuis
une même colonne, il n’y a pas de clé étrangère sur `entity_id` : l’existence
de l’entité est vérifiée par le service avant insertion.

### Tables sans chemin d’écriture

`quotes`, `quote_lines`, `invoices`, `credit_notes`, `projects`, `documents` et
`messages` sont présentes au schéma mais **aucun code de la V1 n’y écrit**.
Elles sont conservées parce que leur module est reporté, pas annulé, et que
leur structure est déjà correcte. Voir
[functional-scope.md](functional-scope.md), §3.2.

Les fichiers binaires ne sont jamais enregistrés en base64. PostgreSQL ne
conserve que les métadonnées et la clé interne de l’objet privé.

Les brouillons authentifiés utilisent `quote_requests.status='draft'`. Une
soumission met à jour cette même ligne : l’identifiant et la référence restent
stables, et l’historique conserve `draft → submitted`. Les brouillons inactifs
depuis 30 jours sont masqués à la reprise et supprimables par
`npm run drafts:cleanup -- --apply`.

## Intégrité

- UUID pour les relations internes.
- Séquences PostgreSQL pour les références publiques annuelles.
- Index uniques sur référence et `submission_key`.
- Clés étrangères avec suppression en cascade pour les historiques et
  métadonnées enfants, ou `SET NULL` pour conserver une trace après suppression
  d’un utilisateur.
- contraintes `CHECK` sur statuts, catégories, consentements, MIME et taille.
- index sur dates, statuts, email, propriétaire, demande et checksum.

Les règles Zod donnent un retour lisible, mais les contraintes SQL restent la
dernière barrière si une autre application écrit un jour dans la base.

## Transactions

Une création contact regroupe la réservation de référence, le message,
l’historique initial et l’outbox. Une création devis regroupe les mêmes
éléments avec les métadonnées des pièces jointes. Une transition regroupe la
mise à jour optimiste du parent et sa ligne d’historique.

Les contraintes uniques règlent la course entre deux requêtes portant la même
clé d’idempotence. Le service relit alors la référence existante et l’API
retourne `409`.

## Migrations

Les fichiers `src/db/migrations/*.sql` sont versionnés. Exécuter :

```bash
npm run db:migrate
```

Le lanceur sait adopter une ancienne base créée par `db:push` uniquement si
toutes les tables du socle attendu sont présentes. Une base partielle est
refusée. Les nouvelles bases appliquent l’historique complet.

Avant une migration de production :

1. sauvegarder la base et vérifier la restauration ;
2. exécuter la migration avec le compte `MIGRATION_DATABASE_URL` ;
3. lancer `db:check` et un smoke test ;
4. conserver l’ancienne version applicative jusqu’à validation.

Les migrations ascendantes sont privilégiées. Pour un changement destructif,
utiliser le schéma expand/migrate/contract ; le retour arrière repose sur la
sauvegarde et non sur un SQL inverse improvisé.

### Migration `0004_auth_foundation`

Le lanceur prépare `auth_totp_migration_buffer` avant Drizzle. Sur une ancienne
base, il chiffre chaque `users.totp_secret` avec la clé serveur et l’utilisateur
comme donnée associée. La migration crée les tables d’authentification, importe
le tampon, puis supprime les colonnes TOTP lisibles. Sur une base neuve, le
tampon vide permet d’appliquer le même SQL. Les hashes de mot de passe ne sont
jamais réécrits par la migration.

Ne pas lancer le SQL `0004` directement : utiliser `npm run db:migrate`, qui
effectue cette préparation compatible.

### Migration `0005_documents`

Crée la séquence `seq_document_reference`, puis les tables `documents` et
`document_versions`. Voir [documents.md](documents.md) pour le modèle complet.

La table `documents` issue de `0000` est **supprimée puis recréée**, et non
altérée. Aucune ligne du dépôt ne l’écrivait ni ne la lisait : elle est vide par
construction. Elle décrivait par ailleurs un fichier unique par ligne, ce qui
interdit tout historique de version — la raison même de cette migration.

Les deux tables se référencent mutuellement : `documents.current_version_id`
pointe vers une version, chaque version pointe vers son document. La contrainte
correspondante est donc posée après la création des deux tables.

> **À faire avant le prochain `db:generate`.** Le SQL de `0005` est écrit à la
> main — comme `0004` — mais son instantané `meta/0005_snapshot.json` **manque**.
> `npm run db:migrate` n'en a pas besoin : le migrateur ne lit que le journal et
> les fichiers `.sql`. En revanche, `npm run db:generate` diffère du dernier
> instantané disponible (`0004`) et proposerait de recréer les tables
> documentaires, ce qui échouerait sur une base déjà migrée.
>
> Produire l'instantané depuis un **terminal interactif** :
>
> ```bash
> npm run db:generate -- --name documents
> ```
>
> drizzle-kit demandera si `owner_id` → `owner_user_id` est un renommage :
> répondre **création/suppression**, l'ancienne table étant supprimée puis
> recréée. Conserver ensuite le `0005_documents.sql` du dépôt et ne garder du
> résultat que l'instantané.

## Tests

`test:integration` et `test:e2e` refusent une base distante ou un nom sans
suffixe `_test`. Chaque suite recrée uniquement le schéma de sa base jetable,
applique les vraies migrations et ferme les connexions.
