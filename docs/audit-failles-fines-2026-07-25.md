# Chasse aux failles fines — logique métier, concurrence, canaux auxiliaires

**Date** : 25 juillet 2026
**Méthode** : revue manuelle point par point, vérification dans le code, correction, test de non-régression.
**Vérification finale** : `tsc` propre · ESLint 0 avertissement · `npm test` → **104/104** · build réussi · aucun secret dans le bundle · aucun fichier > 400 lignes.

**Légende** — ✅ conforme · ⚠️ partiellement traité · ❌ vulnérable (corrigé) · ⬜ **non applicable, fonctionnalité absente** (primitive sûre fournie à l'avance).

Avertissement de méthode : plusieurs points portent sur des fonctionnalités **qui n'existent pas encore** dans ce projet (facturation, mise à jour de profil, changement d'email, suppression RGPD, réinitialisation de mot de passe, export). Je ne les déclare pas conformes. Ils sont marqués ⬜ et j'ai livré la primitive sûre pour que la fonctionnalité naisse correcte, sans prétendre qu'elle est protégée aujourd'hui.

---

## 1. Logique métier

| Point | État initial | Correctif | Criticité |
| :--- | :---: | :--- | :---: |
| Numérotation de facture en condition de course | ❌ | `generateSequentialInvoiceNumber(lastNumber, year)` **supprimée** — elle dérivait le numéro d'une valeur lue hors transaction. Remplacée par [`numbering.ts`](../src/lib/db/numbering.ts) sur `nextval()` PostgreSQL, atomique sans verrou. SQL de création fourni. | Élevée |
| Double acceptation de devis | ⚠️ | L'`UPDATE … WHERE status = 'sent'` existait déjà. Ajout de la machine à états : `accepted` et `refused` sont **terminaux**, donc la transition déclenchant la facturation ne peut pas rejouer. | Élevée |
| Transitions d'état non contrôlées | ❌ | [`state-machine.ts`](../src/lib/domain/state-machine.ts) : liste blanche explicite. Facture payée → annulée **refusée**, devis expiré non acceptable, devis non-brouillon non modifiable. Branchée dans `quoteDecisionService`. | Élevée |
| Montants en flottant | ❌ | [`money.ts`](../src/lib/domain/money.ts) : tout en centimes entiers. Test : 100 lignes à 0,10 € donnent exactement 10,00 €. | Élevée |
| Quantité / prix négatif | ❌ | Refus explicite. Une ligne à −1000 € produisait une facture négative. Un remboursement passe par une note de crédit. | Élevée |
| Cohérence d'arrondi TVA | ❌ | Convention **unique et documentée** : arrondi ligne par ligne, puis somme. Le total affiché est la somme des lignes affichées. Ventilation par taux produite. Taux hors barème belge (0/6/12/21) refusé. | Moyenne |
| Rattachement de devis anonyme sur email déclaré | ⬜ | Aucun rattachement automatique n'existe. `quote_requests.user_id` reste `NULL`. Documenté : le rattachement futur devra se faire sur `email_verified_at`, jamais sur l'adresse déclarée. | Élevée (à venir) |
| Élévation par mass assignment | ⬜ | Aucune route de mise à jour de profil n'existe. [`mass-assignment.ts`](../src/lib/security/mass-assignment.ts) fourni : `ProfileUpdateSchema` en `.strict()`, liste `NEVER_USER_WRITABLE`, helper `pickAllowedFields`. | Critique (à venir) |
| Changement d'email sans vérification | ⬜ | Fonctionnalité absente. `email` est **délibérément exclu** du schéma de profil : un changement d'adresse ne peut pas être une mise à jour de champ. Inscrit en dette. | Critique (à venir) |
| Suppression RGPD vs conservation comptable | ⬜ | Non implémentée. Choix documenté en §4 : anonymiser le client, conserver les pièces (obligation de 7 ans en Belgique). | Moyenne (à venir) |

## 2. Conditions de course et concurrence

| Point | État initial | Correctif | Criticité |
| :--- | :---: | :--- | :---: |
| Lecture-puis-écriture transactionnelle | ⚠️ | La décision de devis utilisait déjà un `UPDATE` conditionnel — correct. Les autres chemins concernés n'existent pas encore. **Non vérifié** sur la facturation, qui n'existe pas. | Élevée |
| Idempotence des mutations | ❌ | [`idempotency.ts`](../src/lib/security/idempotency.ts) : clé dérivée de (utilisateur, opération, clé client) — l'utilisateur y entre pour qu'un tiers ne puisse pas deviner et bloquer la clé d'autrui. `releaseIdempotency` en cas d'échec, sans quoi la garde deviendrait une panne. | Moyenne |
| Usage unique réel des jetons | ❌ | [`tokenConsumption.ts`](../src/lib/auth/tokenConsumption.ts) : le marquage **est** le test — `UPDATE … WHERE used_at IS NULL … RETURNING`. Aucune fenêtre entre vérification et action. | Élevée |
| Race sur l'inscription | ✅ | Contrainte `UNIQUE` déjà présente sur `users.email` ([users.ts:7](../src/db/schema/users.ts#L7)). Renforcée : l'email est désormais **normalisé NFKC** avant insertion, donc deux variantes visuellement identiques heurtent bien la contrainte. | Moyenne |

## 3. Fuites par canal auxiliaire

| Point | État initial | Correctif | Criticité |
| :--- | :---: | :--- | :---: |
| Énumération par temps de réponse | ❌ | `consumeDummyVerification()` : un bcrypt factice de coût 12 est exécuté quand le compte n'existe pas. Sans lui, la branche « compte inconnu » revenait immédiatement. | Élevée |
| Comparaisons en temps constant | ❌ | [`constant-time.ts`](../src/lib/security/constant-time.ts). **Bug trouvé par les tests** : `Buffer.from("zzzz","hex")` renvoie un tampon vide, et comparer deux tampons vides retournait `true`. Corrigé par validation de forme préalable. | Élevée |
| Messages d'erreur uniformes | ✅ | `authErrors.ts` livré à l'étape précédente : message générique unique, statut 401 constant. Vérifié également sur l'inscription (réponse neutre 202). | Moyenne |
| Identifiants séquentiels exposés | ✅ | Les routes résolvent déjà un **UUID**, jamais le numéro comptable. Le numéro reste affiché mais n'est plus une clé d'accès. | Moyenne |
| Jetons dans une URL | ⬜ | Aucun parcours par lien n'existe. [`signed-urls.ts`](../src/lib/security/signed-urls.ts) impose `Referrer-Policy: no-referrer` sur les réponses de document. | Élevée (à venir) |
| Purge EXIF | ✅ | Ré-encodage `sharp` systématique. Renforcé : `limitInputPixels` et redimensionnement borné. | Moyenne |
| Données sensibles côté client | ✅ | **Vérifié, avec une nuance.** `localStorage` **est** utilisé, à un seul endroit : [CookieBanner.tsx:11](../src/components/layout/CookieBanner.tsx#L11) y stocke le drapeau de consentement aux cookies (`"accepted"` / `"refused"`). Ce n'est pas une donnée sensible et c'est l'usage attendu. Aucun jeton, aucune donnée personnelle, aucun `process.env` lu depuis un composant client. `check-client-bundle.js` scanne 44 artefacts à chaque build. | Élevée |

## 4. Cache et CDN — **le point le plus dangereux**

| Point | État initial | Correctif | Criticité |
| :--- | :---: | :--- | :---: |
| Pages authentifiées cachables | ❌ **critique** | `force-dynamic` empêchait le *prérendu* mais **n'émettait aucun en-tête de cache**. Un CDN en « Cache Everything » aurait servi le tableau de bord d'un client au visiteur suivant. [`cache-control.ts`](../src/lib/security/cache-control.ts) pose `private, no-store, no-cache, must-revalidate` + `CDN-Cache-Control` + `Cloudflare-CDN-Cache-Control` sur `/mon-compte`, `/admin`, `/api`. | **Critique** |
| En-tête `Vary` | ❌ | `Vary: Cookie, Authorization` posé même sur les réponses non cachables, pour contraindre un cache intermédiaire mal configuré. | Élevée |
| Empoisonnement par en-tête non clé | ❌ | `X-Forwarded-Host`, `X-Original-URL`, `X-Rewrite-URL`, `X-Http-Method-Override` et variantes **retirés de la requête** dans le middleware — aucun code, présent ou futur, ne peut s'y fier. | Élevée |
| Injection d'en-tête `Host` | ❌ | [`urls.ts`](../src/lib/security/urls.ts) : `getBaseUrl()` lit `APP_ORIGIN` et **lève** en production si absente. Aucun lien transactionnel ne peut être construit depuis l'en-tête reçu. | Critique |
| Retour arrière après déconnexion | ❌ | `no-store` interdit l'écriture dans le cache disque du navigateur : c'est précisément ce qui empêche la restitution par le bouton retour sur un poste partagé. | Moyenne |

## 5. Confiance mal placée dans les en-têtes

| Point | État initial | Correctif | Criticité |
| :--- | :---: | :--- | :---: |
| Spoofing de `X-Forwarded-For` | ✅ | Corrigé à l'étape précédente : `request-context.ts` ne lit **que** `CF-Connecting-IP`, et uniquement si `TRUSTED_PROXY=cloudflare`. Limite rappelée : ne vaut que si le pare-feu restreint l'ingress au CDN. | Élevée |
| Décision basée sur `User-Agent`/`Referer` | ✅ | **Vérifié par recherche exhaustive** : aucune décision d'autorisation n'en dépend. `userAgent` sert uniquement à la reconnaissance d'appareil, qui déclenche une notification, jamais un accès. | Moyenne |
| En-tête `X-Admin` / `X-User-Id` de développement | ❌ | Aucun n'était lu, mais ils sont désormais **retirés à l'entrée** par défense en profondeur. **Trouvaille voisine** : le formulaire de connexion redirigeait vers `/admin` en cas d'**échec** si l'email contenait « admin » — raccourci de développement resté en place, corrigé. | Élevée |

## 6. Uploads et traitement de fichiers

| Point | État initial | Correctif | Criticité |
| :--- | :---: | :--- | :---: |
| SVG accepté | ⚠️ | Il était rejeté par accident (aucune signature binaire ne correspondait). Désormais **refusé délibérément** : `looksLikeSvgOrXml()` le reconnaît et le refuse, ce qui rend le refus testable et résistant à un futur élargissement des formats. | Élevée |
| `Content-Disposition` / `nosniff` | ⚠️ | Posés sur les documents et les exports via `documentResponseHeaders()` et `csvResponseHeaders()`, avec `Content-Security-Policy: default-src 'none'; sandbox`. Le domaine séparé relève du runbook. | Élevée |
| Type par signature binaire | ✅ | Déjà en place, corrigé à l'étape précédente (bug WebP/WAVE). | Élevée |
| Bombes de décompression | ✅ | `limitInputPixels: 25e6` et redimensionnement borné à 2500 px. Le **worker isolé** n'est pas implémenté — risque résiduel documenté. | Élevée |
| Noms de fichiers régénérés | ✅ | UUID côté serveur, extension déduite du type détecté, vérification que le chemin résolu reste sous le répertoire cible. | Moyenne |
| URL signées courtes et révocables | ⬜ | Aucune route de document n'existe. `signed-urls.ts` fourni : TTL 10 min plafonné à 15, liées à l'utilisateur **et** à l'empreinte de session — révoquer les sessions invalide les URL sans attendre l'expiration. | Élevée (à venir) |

## 7. PDF et emails

| Point | État initial | Correctif | Criticité |
| :--- | :---: | :--- | :---: |
| SSRF par navigateur headless | ✅ | **Vérifié** : ni Puppeteer, ni Playwright, ni Chromium dans les dépendances. `pdfService` produit une chaîne HTML servie telle quelle, sans moteur de rendu — la surface n'existe pas. | Critique (si un moteur est ajouté) |
| Injection d'en-tête email (CRLF) | ✅ | `escapeEmailField()` neutralise `\r\n` sur chaque champ. Test de non-régression sur une tentative d'ajout de `Bcc:`. | Élevée |
| SPF / DKIM / DMARC | ⬜ | **Hors code.** Ajouté au runbook §9 avec les enregistrements attendus. Sans DMARC en `reject`, n'importe qui peut usurper le domaine auprès des clients. | Critique |
| Données sensibles dans les emails | ✅ | Les gabarits ne contiennent ni montant ni pièce jointe : uniquement la nature de l'événement et un contexte minimal. | Moyenne |

## 8. Export de données

| Point | État initial | Correctif | Criticité |
| :--- | :---: | :--- | :---: |
| Injection de formule CSV | ⬜❌ | Aucun export n'est implémenté (le bouton du back-office est inerte), mais [`csv.ts`](../src/lib/security/csv.ts) est livré : neutralisation de `=`, `+`, `-`, `@` **et du bruit de tête** (tabulation, retour chariot, espace) que le tableur ignore avant le premier caractère significatif. | Élevée |
| Contrôles d'accès sur les exports | ⬜ | Non applicable aujourd'hui. `csvResponseHeaders()` impose `attachment` + `no-store`. | Élevée (à venir) |
| Pagination bornée sur les exports | ⬜ | `CSV_MAX_EXPORT_ROWS = 5000` fourni. | Moyenne |

## 9. Redirections, CORS, DNS

| Point | État initial | Correctif | Criticité |
| :--- | :---: | :--- | :---: |
| Open redirect sur le retour de connexion | ❌ | Le paramètre `next` était **généré** par `guards.ts` mais jamais consommé — latent. `safeReturnPath()` le consomme désormais : refus des URL absolues, protocol-relative (`//`), antislashs, schémas actifs, et des formes encodées reconstituées après décodage. | Élevée |
| CORS | ✅ | **Vérifié** : aucun en-tête `Access-Control-*` n'est émis nulle part. `isAllowedCorsOrigin()` fourni pour un besoin futur — liste blanche stricte, jamais un reflet de l'`Origin` reçu. | Élevée |
| Clickjacking | ✅ | `frame-ancestors 'none'` + `X-Frame-Options: DENY`. La ré-authentification avant action irréversible reste en dette. | Moyenne |
| Prise de contrôle de sous-domaine | ⬜ | **Hors code, non vérifiable depuis le dépôt.** Ajouté au runbook. Le cookie `__Host-` limite déjà la portée au domaine exact, ce qui borne l'impact. | Élevée |
| Fichiers exposés (`.git`, `.env`, `.map`) | ⚠️ | `productionBrowserSourceMaps: false` déjà posé. Les leurres piègent `/.env` et `/.git/config`. La vérification effective est une commande du runbook §8 — **non vérifiée** en l'absence de déploiement. | Élevée |

## 10. Robustesse des validations

| Point | État initial | Correctif | Criticité |
| :--- | :---: | :--- | :---: |
| ReDoS | ✅ | **Audit automatisé des 130 expressions régulières** des 142 fichiers source (script de détection de quantificateurs imbriqués) : **aucune** occurrence du motif `(x+)+`. Les 6 expressions de validation d'entrée sont des classes de caractères à quantificateur borné, donc linéaires. Les entrées sont en outre plafonnées **avant** évaluation. | Moyenne |
| Longueur maximale des champs | ❌ | Email 254, téléphone 30, mot de passe **128**, TOTP 6, captcha 2048. Un mot de passe de 10 Mo soumis à bcrypt était un déni de service à requête unique. | Élevée |
| Troncature silencieuse de bcrypt | ❌ | Refus explicite au-delà de **72 octets** (et non 72 caractères — un accent en occupe deux). Sans ce contrôle, deux mots de passe différents produisent la même empreinte. | Élevée |
| Normalisation Unicode | ❌ | [`normalize.ts`](../src/lib/validations/normalize.ts) : NFKC + minuscules + purge des invisibles (U+200B, U+FEFF, surcharges bidi). Sans elle, `oﬃce@…` et `office@…` étaient deux comptes pour une seule boîte. | Moyenne |
| Profondeur et clés JSON | ✅ | `body.ts` livré à l'étape précédente : profondeur 8, `__proto__`/`constructor`/`prototype` et clés `$` refusées. | Élevée |
| Injection de journal | ❌ | `sanitizeForLog()` neutralise `\r\n\t` et borne à 500 caractères. Sans cela, une valeur contenant un retour à la ligne permet de forger de fausses lignes d'audit. | Moyenne |

## 11. Chaîne d'approvisionnement

| Point | État initial | Correctif | Criticité |
| :--- | :---: | :--- | :---: |
| `ignore-scripts` | ❌ | `.npmrc` créé avec `ignore-scripts=true`. **Vérifié empiriquement** : trois paquets utilisent `postinstall` (`esbuild`, `unrs-resolver`, `es5-ext`) ; après réinstallation complète, vitest, esbuild, Next et sharp fonctionnent — test de traitement d'image réel effectué. | Élevée |
| Dependency confusion | ✅ | **Vérifié** : aucune dépendance interne ni scope privé. Toutes les dépendances sont publiques et épinglées par le lockfile. | Moyenne |
| Dépendances inutilisées | ⚠️ | `speakeasy` et `pg` audités : `speakeasy` est utilisé (TOTP), `pg`/`@types/pg` ne le sont pas — l'accès passe par `postgres` (postgres.js). Signalé, **non supprimé** : la suppression touche le graphe de dépendances et mérite un commit isolé. | Faible |
| Actions CI épinglées | ❌ | Épinglées par **SHA de commit réel**, résolus via l'API GitHub (`actions/checkout@3d3c42e…` v7, `actions/setup-node@82076278…` v7, `gitleaks/gitleaks-action@e0c47f4f…` v3). | Moyenne |

## 12. Boucle de durcissement continue

| Point | État | Correctif |
| :--- | :---: | :--- |
| Rythme documenté et automatisé | ❌ → ✅ | Tableau de fréquences ajouté à `SECURITY.md` §7, avec la correspondance entre chaque ligne et le mécanisme qui l'exécute réellement (workflow, cron, action manuelle). |

---

## Défauts trouvés par mes propres tests

Trois, tous corrigés :

1. **`timingSafeEqualHex("zzzz","zzzz")` retournait `true`.** `Buffer.from(x,"hex")` n'échoue pas sur une entrée invalide : il retourne un tampon **vide** en ignorant les caractères non hexadécimaux. Comparer deux tampons vides donne `true`. Une fonction de comparaison de secrets qui répond « égal » sur deux valeurs mal formées est exactement le genre de défaut qu'un scanner ne voit pas.
2. **Test de ligature erroné.** J'avais utilisé U+FB01 (`ﬁ`) en attendant `office` — cette ligature donne `ofice`. Donnée de test fausse, pas le code : corrigée en U+FB03 (`ﬃ`).
3. **`useSearchParams()` cassait le prérendu statique** de `/connexion`, sortant la page du cache CDN. Remplacé par une lecture à la soumission, le contrôle `safeReturnPath` restant identique.

## Trouvaille hors périmètre

Le formulaire de connexion contenait un **contournement de développement** : en cas d'échec d'authentification, le `catch` redirigeait vers `/admin` ou `/mon-compte` selon que l'adresse saisie contenait « admin ». L'inscription affichait de même « ✅ Inscription validée » sur n'importe quelle erreur, puis redirigeait.

Ce n'était pas un contournement d'authentification — les gardes serveur renvoyaient aussitôt vers la page de connexion. Mais le symptôme visible était une boucle de redirection et la cause réelle restait invisible à l'utilisateur, y compris un mot de passe refusé pour cause de fuite connue. Les deux gestionnaires affichent désormais l'erreur.
