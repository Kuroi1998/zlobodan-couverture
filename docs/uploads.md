# Pièces jointes privées

## Politique

- cinq fichiers maximum ;
- 10 Mo maximum par fichier ;
- 30 Mo maximum par soumission ;
- JPEG, PNG, WebP et PDF uniquement ;
- 25 millions de pixels maximum en entrée ;
- images ramenées à 2 500 px maximum.

Le navigateur propose une compression ergonomique. Elle ne constitue pas une
barrière de sécurité : le serveur relit les octets, compare signature et
extension, décode les images avec Sharp, les réencode pour retirer les
métadonnées EXIF et vérifie un terminateur plausible pour les PDF.

## Stockage

En développement, les objets vivent sous `storage/uploads`, hors de `public/`
et ignoré par Git. Le résolveur interdit toute sortie du répertoire racine.

En production, `UPLOAD_STORAGE_DRIVER=s3` est obligatoire. Le bucket doit être
privé, sans website hosting ni ACL publique. Les écritures demandent le
chiffrement serveur AES-256. Le rôle applicatif doit être limité aux actions
Get/Put/Delete/List sur le préfixe du projet.

Une clé ressemble à :

```text
quote-attachments/2026/07/<uuid>.jpg
```

Elle n’apparaît ni dans les pages, ni dans les réponses JSON, ni dans les
exports RGPD. Les noms affichés sont des noms originaux nettoyés.

## Téléchargement

`GET /api/files/quote-attachments/:id` :

1. valide l’UUID ;
2. exige une session ;
3. joint la pièce à sa demande ;
4. autorise `staff/admin` ou le `user_id` propriétaire ;
5. retourne `404` pour une ressource absente ou appartenant à un tiers ;
6. force `private, no-store`, `nosniff` et une disposition de pièce jointe.

Cette route évite les URL publiques permanentes. Une future variante par URL
signée doit conserver une durée courte et la même vérification de propriété
avant signature.

## Cohérence et orphelins

Le stockage objet ne participe pas à la transaction PostgreSQL. Les objets
sont écrits d’abord ; si l’écriture SQL échoue, le service les supprime. Un
échec de compensation crée un événement de sécurité sans divulguer la clé.

Le filet de sécurité opérationnel est :

```bash
npm run uploads:cleanup
npm run uploads:cleanup -- --apply
```

Le premier mode simule. Le second supprime uniquement les objets du préfixe
`quote-attachments/`, absents de `quote_attachments` et âgés de plus de 24 heures.
Le délai protège une écriture en cours. Planifier l’exécution quotidienne et
surveiller son code de sortie.

Activer aussi le versioning ou une corbeille à durée courte côté fournisseur
pour rendre une suppression accidentelle récupérable.
