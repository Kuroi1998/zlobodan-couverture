# Authentification à deux facteurs

## TOTP

La méthode est TOTP RFC 6238, SHA-1, six chiffres, période de trente secondes,
émetteur « Zlobodan Couverture SRL ». SHA-1 sert ici au protocole TOTP
interopérable, jamais au stockage d’un mot de passe.

Le QR code est généré localement par `qrcode`. Le secret et l’URI `otpauth://`
ne quittent pas le serveur vers un service d’image.

## Activation

1. l’utilisateur saisit son mot de passe actuel ;
2. le serveur génère et chiffre un secret provisoire valable dix minutes ;
3. l’écran affiche QR et clé manuelle ;
4. un premier code valide active le facteur ;
5. dix codes de récupération sont créés et affichés une seule fois ;
6. les autres sessions sont révoquées.

Le secret utilise AES-256-GCM avec IV aléatoire et données associées liées à
l’utilisateur. La clé `TWO_FACTOR_ENCRYPTION_KEY` est distincte de PostgreSQL
et n’est jamais exposée au client.

## Connexion et anti-rejeu

Après le mot de passe, `auth_challenges` conserve seulement le hash d’un jeton
temporaire. Le challenge expire après dix minutes et cinq tentatives. Le code
TOTP accepte une dérive d’un pas. `last_used_time_step` empêche d’utiliser deux
fois le même pas, même depuis deux navigateurs.

## Codes de récupération

Les dix codes aléatoires sont normalisés puis stockés uniquement sous forme
SHA-256. Chaque utilisation renseigne `used_at`, envoie une alerte et écrit un
événement. Le nombre restant est affiché, jamais la valeur des codes.

La régénération exige mot de passe, TOTP ou code de récupération, confirmation
explicite et session récente. Elle invalide immédiatement l’ancien lot.

## Désactivation

La désactivation exige le mot de passe, un second facteur valide, une session
récente et une confirmation. Le secret et tous les codes sont supprimés, les
autres sessions sont révoquées et une alerte email est mise en file.

Les rôles `staff` et `admin` ne reçoivent aucune session sans 2FA confirmée.
Un administrateur ne peut ni lire ni exporter le secret d’un autre compte.

## Rotation de la clé

La version `v1` ne contient pas d’identifiant de clé. Une rotation doit donc
être atomique et effectuée pendant une fenêtre d’écriture arrêtée :

1. sauvegarder et tester la restauration ;
2. arrêter l’application et le dispatcher ;
3. définir temporairement l’ancienne clé dans
   `OLD_TWO_FACTOR_ENCRYPTION_KEY` et la nouvelle dans
   `TWO_FACTOR_ENCRYPTION_KEY` ;
4. exécuter `npm run auth:rotate-encryption-key` sans `--apply` ;
5. exécuter `npm run auth:rotate-encryption-key -- --apply` ;
6. démarrer avec la nouvelle clé, tester un TOTP et un email à lien ;
7. supprimer définitivement l’ancienne clé de l’environnement.

Le script rechiffre également les charges sensibles encore présentes dans
l’outbox. Il ne journalise aucun plaintext. En cas de perte de l’ancienne clé,
les secrets ne sont pas récupérables : révoquer les sessions, désactiver les
facteurs concernés en base avec une procédure auditée et imposer un nouvel
enrôlement.

