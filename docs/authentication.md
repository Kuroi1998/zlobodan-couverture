# Authentification

## Architecture retenue

Une seule stratégie est utilisée :

```text
composant React
→ route App Router
→ validation Zod et garde de débit
→ service métier d’authentification
→ transaction PostgreSQL
→ session opaque ou outbox
```

La façade `src/lib/services/auth-service.ts` réexporte les services spécialisés
de `src/lib/services/auth/`. Les routes ne hachent pas de mot de passe, ne
créent pas de token et ne prennent aucune décision de rôle elles-mêmes.

## Parcours publics

### Inscription et vérification

`POST /api/auth/register` normalise l’adresse, vérifie les deux consentements et
la confirmation, contrôle la politique de mot de passe et Have I Been Pwned,
puis crée un compte `client` en `pending_verification`. bcrypt utilise un coût
12. Le token aléatoire de 32 octets est envoyé dans l’outbox et seul son
SHA-256 est conservé dans `email_verification_tokens`.

`POST /api/auth/verify-email` consomme le token une seule fois et active le
compte dans une transaction. `POST /api/auth/resend-verification` conserve une
réponse neutre, un quota et un délai de deux minutes.

### Connexion

`POST /api/auth/login` utilise toujours « Adresse e-mail ou mot de passe
incorrect » pour les identifiants refusés. La comparaison bcrypt factice d’un
compte absent réduit l’écart temporel. Après plusieurs échecs, le compte est
verrouillé temporairement ; les compteurs sont remis à zéro après succès.

Un mot de passe correct ne crée aucune session quand la 2FA est active. Il crée
un `auth_challenges` haché, valable dix minutes et cinq essais. La session
opaque n’est émise qu’après `POST /api/auth/two-factor/challenge`.

Le paramètre `next` passe par `safeReturnPath` : seuls les chemins internes
sont acceptés. La destination finale est aussi limitée par le rôle.

### Mot de passe oublié

`POST /api/auth/forgot-password` rend la même réponse et impose un délai
minimum, que le compte existe ou non. Le token expire après quinze minutes,
n’est stocké que haché et ne sert qu’une fois.

`POST /api/auth/reset-password` remplace le hash, marque tous les tokens
restants comme utilisés, révoque toutes les sessions et met une confirmation
dans l’outbox. Il ne connecte jamais automatiquement.

## Actions authentifiées

- `POST /api/auth/change-password` exige le mot de passe actuel et la 2FA
  lorsqu’elle est active ; les autres sessions sont révoquées.
- `POST /api/auth/change-email` ne change rien immédiatement. Un token
  valable trente minutes part vers la nouvelle adresse.
- `POST /api/auth/change-email/confirm` vérifie de nouveau l’unicité, applique
  le changement atomiquement, prévient l’ancienne adresse et révoque toutes
  les sessions.
- `/api/auth/sessions/*` liste ou révoque les sessions appartenant au compte.
- `/api/auth/two-factor/*` configure, confirme, désactive et régénère les
  codes après réauthentification forte.

## Erreurs publiques

Les codes stables incluent `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`,
`ACCOUNT_DISABLED`, `TWO_FACTOR_REQUIRED`, `INVALID_TWO_FACTOR_CODE`,
`INVALID_RECOVERY_CODE`, `SESSION_EXPIRED`, `TOKEN_INVALID`,
`TOKEN_EXPIRED`, `RATE_LIMITED` et `REAUTHENTICATION_REQUIRED`.

Les erreurs techniques et stacks restent côté serveur. Les routes utilisent
les statuts HTTP appropriés ; elles ne renvoient pas `200 success:false`.

## Vérification

```bash
npm run typecheck
npm run lint:strict
npm run test
npm run test:integration
npm run test:e2e
npm run build
```

Le scénario PostgreSQL d’intégration couvre le cycle complet. Le scénario
Playwright `authentication.spec.ts` pilote les écrans, déchiffre uniquement
l’outbox de test et prouve que les valeurs sensibles restent illisibles en
base.

