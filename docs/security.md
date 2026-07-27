# Sécurité, confidentialité et exploitation

## Contrôles appliqués

- validation Zod stricte, normalisation Unicode, email et téléphone ;
- listes fermées pour les statuts et catégories, du navigateur jusqu’aux
  contraintes SQL ;
- corps JSON et multipart bornés ;
- honeypot, délai minimal de 800 ms, limitation par IP et email, Turnstile
  configurable ;
- clé UUID d’idempotence et unicité PostgreSQL ;
- contrôle d’origine CSRF sur chaque mutation d’API ;
- CSP, `nosniff`, politique de cache privé et suppression des en-têtes forgés ;
- sessions opaques hachées et révocables, cookies `HttpOnly`, `Secure` en
  production et expiration par rôle ;
- TOTP obligatoire pour les rôles privilégiés, secret AES-256-GCM, challenge
  haché à cinq essais, anti-rejeu et codes de récupération hachés ;
- tokens de vérification, réinitialisation et changement d’adresse stockés
  uniquement hachés ; charges de lien chiffrées dans l’outbox ;
- réauthentification par mot de passe et second facteur pour les actions
  sensibles ;
- autorisation dans chaque layout/handler et contrôle de propriété serveur ;
- messages d’erreur publics génériques, événements internes sans données
  sensibles ;
- stockage objet privé et détection des types par signature binaire.

Le proxy Next.js n’est jamais la seule barrière d’autorisation. Les gardes
verticales vivent dans les composants serveur et routes concernées.

## Données personnelles

Les consentements stockent le booléen, la date et
`privacy_policy_version=2026-07-26`. Les exports utilisent une liste explicite
de colonnes et excluent mots de passe, secrets TOTP, jetons, notes internes,
empreintes IP et clés de stockage.

L’application ne rattache automatiquement que les demandes envoyées pendant
une session authentifiée. Revendiquer a posteriori une demande anonyme exige
un futur parcours de vérification d’email ; une simple correspondance d’adresse
ne serait pas une preuve suffisante.

## Politique de rétention proposée

Ces durées sont des valeurs d’exploitation proposées, pas un avis juridique.
Le responsable RGPD doit les valider avant d’automatiser la suppression.

| Donnée | Durée proposée après clôture | Sort |
| --- | --- | --- |
| Brouillon de devis non soumis | 30 jours après dernière modification | suppression automatique |
| Spam de contact | 90 jours | suppression |
| Contact sans suite | 24 mois | suppression ou anonymisation |
| Demande refusée/annulée sans contrat | 24 mois | suppression avec pièces jointes |
| Dossier transformé en contrat | durée légale métier validée | archivage puis suppression |
| Pièce jointe | même durée que son parent | suppression objet + métadonnée |
| Outbox envoyée | 90 jours | suppression |
| Audit de sécurité | 12 mois, sauf incident | suppression contrôlée |

Une conservation contentieuse ou réglementaire doit être représentée par un
gel explicite avant tout job automatique. Les sauvegardes et versions S3
doivent expirer selon une fenêtre documentée, sinon une suppression applicative
n’efface pas réellement la donnée.

## Secrets et production

- utiliser un compte SQL applicatif sans DDL et un compte de migration séparé ;
- exiger TLS pour PostgreSQL et SMTP ;
- fournir une clé `TWO_FACTOR_ENCRYPTION_KEY` distincte, aléatoire et gérée
  comme un secret ; suivre la rotation décrite dans
  [two-factor-authentication.md](two-factor-authentication.md) ;
- fournir Redis partagé à toutes les instances ;
- restreindre l’origine aux adresses du proxy déclaré ;
- stocker les secrets dans le gestionnaire de la plateforme ;
- rendre le bucket S3 privé et journaliser ses accès ;
- planifier le dispatcher d’outbox, le nettoyage d’orphelins et
  `drafts:cleanup -- --apply` ;
- superviser les `503`, rejets d’upload, échecs de notification et conflits de
  workflow.

Sans SMTP, les soumissions restent persistées et les notifications restent en
attente. Sans Turnstile ou Redis en développement mono-instance, les autres
protections restent actives ; ces absences ne sont pas acceptables pour un
déploiement public multi-instance.

## Réponse aux incidents

1. révoquer les sessions concernées et faire tourner les secrets selon leur
   procédure ; ne jamais remplacer aveuglément la clé 2FA avant rechiffrement ;
2. préserver les journaux et suspendre les jobs de rétention ;
3. identifier les références affectées sans copier les messages en clair dans
   les canaux d’incident ;
4. restaurer depuis une sauvegarde testée si l’intégrité est compromise ;
5. documenter la chronologie, la portée et les actions RGPD nécessaires.

Voir aussi [SECURITY.md](../SECURITY.md) pour le modèle de sécurité historique
du projet, ainsi que [authentication.md](authentication.md) et
[sessions.md](sessions.md).
