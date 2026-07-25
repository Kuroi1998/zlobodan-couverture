# Corrections appliquées — faille par faille

**Date** : 25 juillet 2026
**Référence** : [audit-securite-2026-07-25.md](audit-securite-2026-07-25.md)
**Vérification** : `npx tsc --noEmit` propre · `npx next lint --max-warnings=0` propre · `npm run build` réussi · `npm test` → 50/50

Statuts : **Corrigé** · **Atténué** (traité mais un risque résiduel subsiste, voir `SECURITY.md` §3) · **Reporté** (hors périmètre, voir §5 de `SECURITY.md`).

---

## Critique

| Réf | Faille | Statut | Correction |
| :--- | :--- | :--- | :--- |
| **C1** | `/admin/*` sans authentification | **Corrigé** | `requirePageRole(["staff","admin"])` dans [admin/layout.tsx](../src/app/admin/layout.tsx). Route passée en `force-dynamic`, l'identité affichée vient de la session. Vérifié : les 4 routes `/admin` sont bien `ƒ` au build. |
| **C2** | `/mon-compte/*` sans authentification | **Corrigé** | `requirePageAuth()` dans [mon-compte/layout.tsx](../src/app/mon-compte/layout.tsx). L'email codé en dur `jean.peeters@email.be` est remplacé par celui de la session. |
| **C3** | Routes PDF : ni authentification, ni appartenance, ni validation | **Corrigé** | Séquence en 4 temps dans [pdf/invoice](../src/app/api/pdf/invoice/%5Bid%5D/route.ts) et [pdf/quote](../src/app/api/pdf/quote/%5Bid%5D/route.ts) : UUID validé → session → chargement base → `authorizeResource`. Refus en **404** pour ne pas confirmer l'existence. Le nom de fichier est construit sur l'UUID validé. |
| **C4** | XSS réfléchie via `params.id` dans le HTML du PDF | **Corrigé** | Deux verrous. (1) Toutes les interpolations de [pdfService.ts](../src/lib/services/pdfService.ts) passent par `escapeHtml`/`formatAmount`. (2) Les données rendues proviennent exclusivement de la base, jamais de la requête. Le nouveau module [encoding.ts](../src/lib/security/encoding.ts) fournit un encodeur par contexte. |
| **C5** | Signature de devis falsifiable | **Corrigé** | [quoteDecisionService.ts](../src/lib/services/quoteDecisionService.ts) : session, UUID, appartenance, transition d'état légale, validité non expirée, mise à jour conditionnée au statut attendu (deux requêtes simultanées ne peuvent pas trancher deux fois). L'audit enregistre l'identifiant interne vérifié, pas la valeur d'URL. |
| **C6** | Aucune validation de session nulle part | **Corrigé** | [session-guard.ts](../src/lib/security/session-guard.ts) — nouveau module. Lit le cookie, joint `sessions × users`, applique révocation, expiration, désactivation du compte, délai d'inactivité et durée absolue. Mémoïsé par requête. La déconnexion invalide désormais réellement côté serveur. |
| **C7** | Next.js 14.2.15 — contournement d'autorisation du middleware | **Atténué** | Montée en **14.2.35** : la vulnérabilité critique disparaît (`npm audit` passe de 1 critique + 2 hautes à 2 hautes). Correction de conception associée : **aucune autorisation dans le middleware**, les gardes vivent dans les layouts et handlers. Il n'existe pas de 14.x corrigeant les 2 hautes restantes — voir §5 de `SECURITY.md`. |

---

## Élevée

| Réf | Faille | Statut | Correction |
| :--- | :--- | :--- | :--- |
| **H1** | CSP permissive, sans nonce ni report-uri | **Atténué** | [csp.ts](../src/lib/security/csp.ts) : nonce par requête, `strict-dynamic`, suppression de `unsafe-eval` et d'`unpkg.com`, ajout de `form-action`, `manifest-src`, `worker-src`, `upgrade-insecure-requests`, `report-uri` + `report-to`. Résiduel assumé : `style-src-attr 'unsafe-inline'`, inévitable avec les props `style` de React. |
| **H2** | Scripts tiers depuis unpkg.com sans SRI | **Corrigé** | Leaflet **auto-hébergé** (`npm i leaflet@1.9.4`), import différé dans [LeafletMap.tsx](../src/components/home/LeafletMap.tsx). Supprime à la fois le risque d'approvisionnement et l'entrée `unpkg.com` de la CSP. Le contenu des popups est encodé au passage. |
| **H3** | Rate limiting inexistant et non partagé | **Atténué** | [rateLimiter.ts](../src/lib/security/rateLimiter.ts) réécrit sur Upstash Redis ; [rate-limit-guard.ts](../src/lib/security/rate-limit-guard.ts) définit 9 politiques différenciées et est **effectivement branché** sur login, register, devis, décision de devis et collecteur CSP. Réponses `429` + `Retry-After`. Résiduel : fenêtre fixe, et repli mémoire si Redis tombe — mais la dégradation est journalisée en `high`. |
| **H4** | Verrouillage utilisable comme arme de déni de service | **Corrigé** | [login-throttle.ts](../src/lib/security/login-throttle.ts) : compteur porté par le **couple (IP, compte)**, paliers 3 / 5 / 10, temporisation exponentielle bornée à 8 s, appliquée **après** vérification pour ne pas créer d'oracle temporel. L'email est haché avant de servir de clé Redis. |
| **H5** | 2FA obligatoire contournable | **Corrigé** | [authService.ts](../src/lib/services/authService.ts) : un rôle privilégié sans `totpSecret` obtient un **refus complet** (403, aucune session émise) et un événement `TOTP_REQUIRED_NOT_ENROLLED`. La branche vide est remplacée par une décision. |
| **H6** | CSRF sauté quand `Origin` est absent | **Corrigé** | [csrf.ts](../src/lib/security/csrf.ts) : politique inversée en refus par défaut. `Sec-Fetch-Site` fait autorité quand il est présent ; sinon `Origin` est comparé aux hôtes autorisés ; sans ni l'un ni l'autre, **rejet**. Le collecteur CSP est explicitement exempté, les rapports étant émis par le navigateur. |
| **H7** | `/api/devis` sans validation, sans limite, avec fuite en journal | **Corrigé** | [route.ts](../src/app/api/devis/route.ts) réécrite : schéma Zod strict ([quoteSchemas.ts](../src/lib/validations/quoteSchemas.ts)) avec listes fermées et bornes de longueur, plafond de corps, limite par IP **et par adresse email** (anti-amplification), Turnstile, honeypot, écriture réelle en base. Le journal ne contient plus que l'identifiant de la demande — plus aucune donnée personnelle. L'écho `received` est supprimé. |
| **H8** | Secrets à valeurs de repli permissives | **Corrigé** | [env.ts](../src/lib/security/env.ts) : aucun secret n'a de valeur par défaut en production, l'absence **arrête le démarrage**. La clé de test Turnstile est explicitement refusée. `verifyTurnstile` distingue désormais `not-configured` de `passed`. `hashIpAddress` passe en HMAC-SHA256 avec sel obligatoire. Contrôle exécuté au boot par [instrumentation.ts](../src/instrumentation.ts). |

---

## Moyenne

| Réf | Statut | Correction |
| :--- | :--- | :--- |
| **M1** | **Corrigé** | [db/client.ts](../src/db/client.ts) : `statement_timeout` 5 s, `lock_timeout` 3 s, `idle_in_transaction_session_timeout` 10 s, `connect_timeout`, `idle_timeout`, `max_lifetime`. Posés au niveau de la connexion, donc appliqués même sur un chemin de code qui les oublierait. |
| **M2** | **Corrigé** | [uploadService.ts](../src/lib/security/uploadService.ts) : création du répertoire rendue paresseuse (plus d'effet de bord à l'import), `limitInputPixels` contre les bombes de décompression, redimensionnement borné, plafonds de lot, vérification que le chemin résolu reste sous le répertoire cible, permissions `0640`. |
| **M3** | **Corrigé** | [magicBytes.ts](../src/lib/security/magicBytes.ts) : la signature WebP comparait les octets 8-11 à `"WAVE"` au lieu de `"WEBP"`. Corrigé et couvert par un test qui vérifie les deux sens (WebP accepté, WAV refusé). |
| **M4** | **Corrigé** | [authErrors.ts](../src/lib/services/authErrors.ts) : catalogue d'erreurs à message public contrôlé. L'inscription renvoie une **réponse neutre unique** quelle que soit l'issue et ne renvoie plus `userId`. Le message « un compte existe déjà » ne sort plus. |
| **M5** | **Corrigé** | [session.ts](../src/lib/auth/session.ts) : préfixe `__Host-` en production, `SameSite=Strict`, durée pilotée par le rôle. Sessions admin/staff : 30 min d'inactivité, 8 h absolues. |
| **M6** | **Corrigé** | [request-context.ts](../src/lib/security/request-context.ts) : `x-forwarded-for` n'est plus lu. Seul `CF-Connecting-IP` est accepté, et uniquement si `TRUSTED_PROXY=cloudflare`. La limite (le pare-feu doit restreindre l'ingress au CDN) est documentée dans le module et dans le runbook. |
| **M7** | **Corrigé** | [security-events.ts](../src/lib/security/security-events.ts), [csp-report](../src/app/api/security/csp-report/route.ts), [security.txt](../src/app/.well-known/security.txt/route.ts), [decoys.ts](../src/lib/security/decoys.ts). Seuils d'alerte définis dans le runbook §6. |
| **M8** | **Corrigé** | [next.config.js](../next.config.js) : `poweredByHeader: false`, `productionBrowserSourceMaps: false`. Le middleware supprime en plus `X-Powered-By` et `Server` des réponses qu'il fabrique. |
| **M9** | **Corrigé** | Un échec d'écriture d'audit produit désormais un événement `AUDIT_WRITE_FAILURE` marqué `alert: true` au lieu d'être avalé. Le champ `diff` est plafonné à 4 000 caractères pour qu'une charge volumineuse ne fasse pas échouer l'insertion. Le `REVOKE UPDATE, DELETE ON audit_log` est fourni dans le runbook §4. |

---

## Faible

| Réf | Statut | Correction |
| :--- | :--- | :--- |
| **F1** | **Corrigé** | [permissions.ts](../src/lib/auth/permissions.ts) : le contrôle d'appartenance passe en refus par défaut. Une ressource sans propriétaire identifiable est refusée. Quatre tests de non-régression. |
| **F2** | **Corrigé** | Vitest installé. [accessControl.test.ts](../src/__tests__/accessControl.test.ts) importe le vrai `can()` au lieu de le réimplémenter. `businessLogic.test.ts` importe ses dépendances. `npm test` exécute réellement 50 tests. |
| **F3** | **Corrigé** | Le repli permissif de HIBP est conservé (disponibilité) mais désormais journalisé. |
| **F4** | **Corrigé** | [.eslintrc.json](../.eslintrc.json) : 11 règles bloquantes. **Vérifiées sur un fichier sonde** — les 6 catégories déclenchent bien. Exceptions limitées à `raw-queries.ts`, `JsonLdSchema.tsx` et les fichiers de test. |
| **F5** | **Corrigé** | `escapeJsonForScript()` remplace `JSON.stringify` dans [JsonLdSchema.tsx](../src/components/seo/JsonLdSchema.tsx) : échappe `<`, `>`, `&` et les séparateurs U+2028/U+2029. |
| **F6** | **Corrigé** | [SECURITY.md](../SECURITY.md) entièrement réécrit, avec une section « risques résiduels assumés » et une section « périmètre non couvert ». |
| **F7** | **Corrigé** | Voir ci-dessous — `robots.ts` mis à jour. |

---

## Défauts découverts pendant le durcissement

Deux problèmes non identifiés à l'audit, révélés par les tests écrits en couche 7 :

1. **`z.coerce.boolean()` sur le consentement RGPD** — `Boolean("false")` vaut `true`, donc le contrôle acceptait n'importe quelle valeur, y compris un refus explicite. Remplacé par un parseur de case à cocher (`CheckboxBoolean`) dans [quoteSchemas.ts](../src/lib/validations/quoteSchemas.ts). Le même défaut affectait `isUrgent`.
2. **Pagination rejetante** — un `limit` excessif levait une erreur, offrant à un client la possibilité de provoquer un 500. Passée en **plafonnement** (`Math.min`) plutôt qu'en rejet.

Un troisième point s'est révélé à la construction : la garde d'environnement se déclenchait pendant `next build`, où aucun secret de production n'a de raison d'être présent. Corrigé par la détection de `NEXT_PHASE`, le contrôle réel étant déplacé au démarrage du serveur.

---

## Mesures recommandées hors de ma portée

Ces points sortent de ce que je peux implémenter seul depuis le dépôt. Ils sont ordonnés par rapport bénéfice/effort.

### 1. Indispensables — le reste ne tient pas sans elles

| Mesure | Pourquoi | Qui |
| :--- | :--- | :--- |
| **Pare-feu restreignant l'ingress HTTP aux plages Cloudflare** | Sans elle, toute la protection amont se contourne en visant l'IP d'origine. C'est l'erreur la plus fréquente et la plus coûteuse. | Exploitation |
| **Cloudflare avec proxy activé** + règles WAF | Le déni de service volumétrique ne se traite pas dans le code. | Exploitation |
| **Comptes PostgreSQL à privilèges minimaux** | Le compte applicatif ne doit pouvoir ni `DROP` ni `ALTER`. Purement déploiement. | Base de données |
| **Base non exposée sur l'internet public** | Chiffrement en transit et au repos, accès par réseau privé. | Infrastructure |
| **Secrets dans un coffre dédié** | Aucun `.env` versionné, procédure de rotation écrite. | Exploitation |

### 2. Chantiers de développement à part entière

| Mesure | Effort | Remarque |
| :--- | :--- | :--- |
| **Row Level Security** | Moyen | Nécessite que l'application pose `app.current_user_id` par transaction. À déployer conjointement, sinon toutes les requêtes seront refusées. |
| **Montée en Next.js 16** | Moyen à élevé | Seul correctif des 2 vulnérabilités hautes restantes. Changement majeur, à planifier avec non-régression. |
| **Transport email** | Faible | Débloque toutes les alertes de sécurité. `registerTransport()` attend une implémentation. |
| **Parcours d'enrôlement 2FA** | Moyen | La connexion refuse désormais un admin non enrôlé ; il lui faut un chemin pour s'enrôler. |
| **Réinitialisation de mot de passe** | Moyen | Les tables existent, le parcours non. |
| **File d'attente pour les traitements coûteux** | Moyen | PDF, images, emails hors du cycle de requête HTTP. |
| **Ré-authentification avant action sensible** | Faible | Facturation, suppression de client, export. Le socle de session le permet déjà. |

### 3. Organisationnelles

- **Test de restauration de sauvegarde trimestriel.** Une sauvegarde jamais restaurée n'est pas une sauvegarde.
- **Test d'intrusion externe** une fois le runbook appliqué — c'est l'objet initial de ce chantier.
- **Anonymisation des jeux de test**, pour qu'aucune donnée de production ne circule en développement.
- **Revue trimestrielle** de ce document et de `SECURITY.md`. Une documentation de sécurité fausse est pire que pas de documentation : c'est précisément ce que l'audit a trouvé au départ.
