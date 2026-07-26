# PostgreSQL et modèle de données

## Tables principales

| Table | Rôle |
| --- | --- |
| `contact_messages` | Message, référence, clé d’idempotence, propriétaire, consentement et statut |
| `contact_status_history` | Journal immuable des transitions de contact |
| `quote_requests` | Besoin technique, coordonnées, référence, propriétaire et workflow |
| `quote_attachments` | Métadonnées privées : clé objet, nom, MIME, taille, empreinte et dimensions |
| `quote_status_history` | Journal immuable des transitions de demande |
| `notification_outbox` | Emails à envoyer, état, tentatives et prochaine échéance |
| `users`, `sessions` | Identité, rôles, TOTP et sessions opaques |
| `quotes`, `invoices`, `projects`, `documents`, `messages` | Suite commerciale et portail client |
| `audit_log` | Événements de sécurité et d’administration |

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

## Tests

`test:integration` et `test:e2e` refusent une base distante ou un nom sans
suffixe `_test`. Chaque suite recrée uniquement le schéma de sa base jetable,
applique les vraies migrations et ferme les connexions.
