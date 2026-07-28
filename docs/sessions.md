# Sessions

## Modèle et cookie

Une session est une valeur opaque aléatoire. Le navigateur reçoit uniquement
le token brut dans un cookie ; PostgreSQL ne conserve que son SHA-256 dans
`sessions.session_token_hash`.

Le cookie utilise :

- le nom `SESSION_COOKIE_NAME` ;
- `HttpOnly`, `Path=/` et `SameSite=Lax` ;
- `Secure` en production HTTPS ;
- une durée alignée sur la session serveur.

Ni `localStorage` ni `sessionStorage` ne contiennent d’identité ou de secret.
Une nouvelle session est générée après le mot de passe et, si nécessaire, le
challenge 2FA : aucun identifiant temporaire n’est réutilisé.

## Durées

| Rôle | Vie absolue | Inactivité |
| --- | ---: | ---: |
| `client` | 7 jours | 7 jours |
| `staff` | 8 heures | 30 minutes |
| `admin` | 8 heures | 30 minutes |

`last_seen_at` est mis à jour au plus une fois par minute. `expires_at`,
`revoked_at`, le statut du compte et la vérification d’email sont relus sur
chaque décision d’accès privée.

## Appareils et révocation

`/mon-compte/securite` affiche le navigateur, la plateforme, la création, la
dernière activité, l’expiration et la session actuelle. L’IP et le token ne
sont jamais affichés.

Actions :

- `DELETE /api/auth/sessions/[id]` : appareil choisi ;
- `POST /api/auth/sessions/revoke-others` : tous sauf le courant ;
- `POST /api/auth/sessions/revoke-all` : tous, après réauthentification forte ;
- déconnexion : session courante révoquée et cookie supprimé.

Un ancien cookie révoqué reste refusé et crée un événement critique
`SESSION_TOKEN_REUSE`, sans fermer les autres appareils. Cela évite qu’un
attaquant possédant un ancien cookie provoque un déni de service.

Le changement d’email et la réinitialisation de mot de passe ferment toutes
les sessions. Le changement de mot de passe, l’activation/désactivation 2FA et
la régénération des codes conservent au plus la session fortement vérifiée.

