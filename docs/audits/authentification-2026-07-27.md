# Audit initial de l’authentification — 27 juillet 2026

## État observé avant la refonte

Bibliothèques : authentification interne Next.js/Drizzle, bcryptjs,
PostgreSQL, TOTP interne et Nodemailer. Il n’y avait ni Auth.js, ni JWT.

Modèle : cookie opaque et table `sessions`, mais aucun parcours complet de
vérification, récupération, changement d’adresse ou gestion 2FA. Le secret
TOTP vivait lisiblement dans `users`. L’outbox métier existait mais les emails
d’authentification et leur consommateur n’étaient pas complets.

| Fonction | Route/écran initial | Persistance | Validation/permissions | Tests | Problème initial |
| --- | --- | --- | --- | --- | --- |
| Inscription | `/connexion`, `/api/auth/register` | `users` partiel | Zod partiel | unités | pas de vérification consommable, consentements/noms absents |
| Vérification email | absente | table de tokens présente | absente | absents | aucun flux |
| Connexion/déconnexion | `/connexion`, login/logout | session opaque hachée | garde serveur partielle | unités/E2E métier | 2FA couplée au login, erreurs et statuts incomplets |
| Profil | `/mon-compte/parametres` | téléphone | propriétaire | E2E | écran principalement en lecture seule |
| Mot de passe oublié | absente | table de tokens présente | absente | absents | aucun flux |
| Changement email/mot de passe | absents | absent | absent | absents | aucun flux |
| Sessions/appareils | bouton « autres sessions » | `sessions` | propriétaire | partiel | pas de liste ni révocation ciblée/globale |
| 2FA | champ login | secret lisible dans `users` | rôle privilégié | partiel | pas d’enrôlement, récupération, anti-rejeu |
| Emails auth | transport de développement | outbox métier | modèles incomplets | partiel | pas de dispatcher unifié |
| Administration comptes | liens/écrans absents | `users` | permissions existantes | permissions | aucune opération de support |
| Audit sécurité | `audit_log` | PostgreSQL | admin | partiel | taxonomie incomplète |

La recherche globale a inclus `password`, `passwordHash`, `emailVerified`,
`resetToken`, `session`, `cookie`, `jwt`, `totp`, `otp`, `twoFactor`, `2fa`,
`backupCode`, `recoveryCode`, `localStorage`, `mock`, `demo`, `TODO` et
`setTimeout`. Aucun second modèle JWT/Auth.js n’a été trouvé. Les comptes de
recette étaient limités aux scripts de seed et n’étaient pas créés par le
runtime de production.

## Décision

Conserver et finaliser le modèle opaque PostgreSQL, adapté à la révocation
d’appareils. Centraliser les services sous `src/lib/services/auth/`, chiffrer
le TOTP, hacher tous les tokens/codes, étendre l’outbox et imposer les gardes
dans chaque page/route plutôt que dans le seul proxy.

L’état final et les preuves sont décrits dans
[authentication.md](../authentication.md), [accounts.md](../accounts.md),
[sessions.md](../sessions.md) et
[two-factor-authentication.md](../two-factor-authentication.md).

