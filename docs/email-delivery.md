# Livraison des emails

## Outbox durable

Les opérations métier n’appellent jamais SMTP dans leur transaction. Elles
insèrent une ligne `notification_outbox` avec le compte ou token concerné.
`npm run notifications:dispatch` revendique jusqu’à 25 lignes, les envoie puis
met à jour leur état.

Les liens de vérification, réinitialisation et changement d’adresse sont
chiffrés dans `encrypted_payload` avec AES-256-GCM. Le token brut n’apparaît ni
dans `payload`, ni dans les logs. Seul son hash existe dans sa table métier.

## SMTP

Variables :

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` ;
- `SMTP_USER`, `SMTP_PASS` ;
- `EMAIL_FROM`.

En production la configuration complète est obligatoire. Le transport exige
TLS sur les ports non implicites et conserve la validation du certificat. Le
SMTP local Mailpit de CI est le seul chemin non chiffré : il écoute sur
`127.0.0.1`, n’utilise aucun secret réel et n’est jamais déployé.
Planifier le dispatcher chaque minute avec un seul chevauchement autorisé.

Une ligne en traitement est réclamable après quinze minutes. Un échec repasse
en attente avec délai exponentiel plafonné à une heure ; après cinq essais il
devient `failed` et crée `NOTIFICATION_FAILED`. Superviser ces lignes et
relancer seulement après correction du fournisseur.

## Liens et modèles

Tous les liens absolus sont construits depuis `APP_ORIGIN`, jamais depuis
`Host`. Cette URL doit être HTTPS en production et ne contenir que le domaine
canonique.

Chaque modèle fournit texte brut et HTML accessible, sujet, identité
Zlobodan, expiration lorsque pertinente, avertissement de sécurité et adresse
de support. Les modèles couvrent bienvenue, vérification, réinitialisation,
mot de passe, changement d’adresse, 2FA, code de récupération, nouvel
appareil, verrouillage, révocation et statut administratif.

## Exploitation

```bash
npm run notifications:dispatch
```

Vérifier régulièrement :

```sql
select status, count(*)
from notification_outbox
group by status;
```

Une indisponibilité SMTP ne supprime ni compte ni token : l’outbox permet la
reprise. Les réponses de mot de passe oublié et renvoi de vérification restent
neutres, y compris quand aucun email n’est créé.
