# Comptes

## Modèle

`users` possède un UUID interne et un `public_id` non prédictible pour les URL
d’administration. `normalized_email` est en minuscules, unique et indexé. Les
rôles et statuts ont des contraintes SQL fermées.

Statuts :

- `pending_verification` : aucune session complète ;
- `active` : accès autorisé selon le rôle ;
- `locked` : verrouillage de connexion temporaire ;
- `disabled` : désactivation administrative et sessions révoquées ;
- `deleted` : suppression logique, relations métier conservées.

L’inscription publique force toujours le rôle `client`. Le rôle envoyé par le
navigateur est ignoré parce qu’il n’appartient à aucun schéma d’entrée.

## Profil et opérations sensibles

Le client modifie prénom, nom et téléphone par liste blanche. Une ancienne
ligne sans prénom/nom peut encore modifier son téléphone ; ces champs ne sont
pas effacés par une valeur vide.

Le mot de passe et l’adresse se gèrent dans `/mon-compte/securite`. Le
changement d’adresse exige un mot de passe, la 2FA active, une confirmation sur
la nouvelle boîte puis une reconnexion. Les anciennes et nouvelles adresses
sont averties.

## Administration

`/admin/comptes` et `/admin/comptes/[publicId]` sont réservés à `admin`. La
fiche expose statut, rôle, vérification, 2FA active ou non, sessions et
événements, jamais les empreintes de mot de passe, secrets ou codes.

Un administrateur peut :

- désactiver/réactiver un client ou un opérateur vérifié ;
- révoquer ses sessions ;
- déclencher le flux normal de réinitialisation.

Il ne peut pas modifier son propre statut, désactiver un autre administrateur,
activer une adresse non vérifiée, changer un rôle depuis l’interface ni
choisir un mot de passe à la place de l’utilisateur.

## Support

Pour une perte de mot de passe, déclencher la réinitialisation ; ne jamais
demander l’ancien mot de passe. Pour une perte du second facteur, utiliser
d’abord un code de récupération. Une récupération administrative de 2FA n’est
pas automatisée : vérifier l’identité hors bande, consigner la décision,
révoquer toutes les sessions et faire réenrôler la 2FA. Aucun secret existant
ne doit être communiqué.

## Migration des comptes existants

Ancien format : UUID, email, hash bcrypt, rôle, colonnes TOTP lisibles.

Nouveau format : email normalisé, statut fermé, `public_id`, TOTP dans
`user_two_factor.encrypted_secret`, codes séparés hachés.

Stratégie :

1. `scripts/migrate-database.ts` crée un tampon temporaire ;
2. il chiffre chaque secret TOTP avec `TWO_FACTOR_ENCRYPTION_KEY` ;
3. la migration `0004_auth_foundation.sql` copie le tampon et supprime les
   anciennes colonnes ;
4. les identifiants, relations et hashes bcrypt sont conservés ;
5. un hash bcrypt à un autre coût est rehaché après une connexion réussie.

Aucun mot de passe n’est réinitialisé silencieusement. Les champs prénom/nom
restent nullables pour la compatibilité et sont complétés par le client.

