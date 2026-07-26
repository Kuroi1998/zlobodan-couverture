# Mise à jour des dépendances et réparation de la CSP

**Date** : 26 juillet 2026
**Branche** : `chore/dependencies-and-csp-hardening`
**Base** : `main` (`1337f4d`)
**Gestionnaire** : npm 11.13.0, déclaré dans `packageManager`. Lockfile unique (`package-lock.json`), aucun `pnpm-lock.yaml`, `yarn.lock` ni `bun.lock`.

---

## 1. Le défaut principal : la CSP bloquait tout le JavaScript du site

### Ce qui a été mesuré

La politique émettait `script-src 'self' 'nonce-…' 'strict-dynamic'` sur **toutes** les réponses. Or `'strict-dynamic'` annule la source `'self'` : seuls les scripts porteurs du nonce s'exécutent alors.

Un nonce ne peut pas exister dans une page **prérendue au build** — le HTML est figé avant qu'une requête n'existe. Vérifié par expérience contrôlée sur un serveur réel :

| Mode de rendu | Attributs `nonce` dans le HTML |
| :--- | ---: |
| Page dynamique (`force-dynamic`) | **18** |
| Page statique (prérendue) | **0** |

Constat en navigateur sur la page d'accueil, avant correction :

```text
hydrated:        false
webpackChunk_N_E: undefined
__next_f:        undefined
```

Autrement dit : **aucun bundle Next ne s'exécutait sur les pages publiques**. Carte Leaflet, assistant de devis, menu mobile et bandeau cookies étaient inertes en production. Le site rendait son HTML serveur et rien d'autre.

### Correction

Deux politiques, choisies par le middleware selon le mode de rendu réel de la route :

| Stratégie | Routes | `script-src` |
| :--- | :--- | :--- |
| `nonce` | `/mon-compte`, `/admin`, `/api` (rendues à la requête) | `'self' 'nonce-…' 'strict-dynamic'` |
| `static` | pages publiques prérendues | `'self' 'unsafe-inline'` |

Le nonce est **délibérément absent** de la politique statique : s'il y figurait, les navigateurs ignoreraient `'unsafe-inline'` — c'est la règle de la spécification — et bloqueraient tout à nouveau. Un test de non-régression le verrouille.

Mécanisme du nonce vérifié de bout en bout sur une route privée : en-tête `nonce-5q8cHsiaavGjJBcLOJjEhA==`, HTML `nonce="5q8cHsiaavGjJBcLOJjEhA=="`, 18 occurrences. Même valeur, pas une inférence.

---

## 2. CSP — état final

**Emplacement canonique unique** : `src/lib/security/csp.ts`, via `buildContentSecurityPolicy({ nonce, environment, strategy })`. Aucune autre définition : `next.config.js` ne pose que `X-Content-Type-Options` et `X-DNS-Prefetch-Control`, sans directive CSP.

**Une seule CSP émise** — vérifié sur le serveur : `content-security-policy` apparaît **1 fois**, `content-security-policy-report-only` **0 fois**. Aucun mode Report-Only n'a été utilisé, même temporairement.

### Directives

| Directive | Production (statique) | Production (nonce) | Développement |
| :--- | :--- | :--- | :--- |
| `default-src` | `'self'` | `'self'` | `'self'` |
| `script-src` | `'self' 'unsafe-inline'` | `'self' 'nonce-…' 'strict-dynamic'` | `'self' 'unsafe-eval' 'unsafe-inline'` |
| `style-src` | `'self' 'unsafe-inline'` | `'self' 'nonce-…'` | `'self' 'unsafe-inline'` |
| `style-src-attr` | `'unsafe-inline'` | `'unsafe-inline'` | `'unsafe-inline'` |
| `img-src` | `'self' data: blob: https://*.basemaps.cartocdn.com` | idem | idem |
| `font-src` | `'self' data:` | idem | idem |
| `connect-src` | `'self'` | idem | idem |
| `media-src` | `'self'` | idem | idem |
| `worker-src` | `'self'` | idem | idem |
| `manifest-src` | `'self'` | idem | idem |
| `frame-src` | `'none'` | idem | idem |
| `frame-ancestors` | `'none'` | idem | idem |
| `object-src` | `'none'` | idem | idem |
| `base-uri` | `'self'` | idem | idem |
| `form-action` | `'self'` | idem | idem |
| `upgrade-insecure-requests` | présent | présent | **absent** (serveur local en HTTP) |
| `report-uri` / `report-to` | `/api/security/csp-report` | idem | idem |

### Domaines externes autorisés

| Domaine | Directive | Fonctionnalité | Justification |
| :--- | :--- | :--- | :--- |
| `https://*.basemaps.cartocdn.com` | `img-src` | Tuiles de la carte d'intervention | Domaine exact tiré de `LeafletMap.tsx`. Les tuiles sont chargées en `<img>`, jamais en `fetch` — donc **absent de `connect-src`**. Vérifié : 6 tuiles sur 6 chargées. |

**C'est le seul.** Quatre entrées ont été retirées après vérification qu'elles ne servaient à rien :

| Retiré | Pourquoi |
| :--- | :--- |
| `fonts.googleapis.com`, `fonts.gstatic.com` | `next/font/google` télécharge et auto-héberge les polices au build. Le HTML rendu ne charge que `/_next/static/css/…` — aucune requête sortante. |
| `challenges.cloudflare.com` | Le widget Turnstile n'est rendu nulle part. `verifyTurnstile` fait une vérification **serveur à serveur**, qui échappe à la CSP du navigateur. Permission accordée à une fonctionnalité absente. |
| `unpkg.com` | Leaflet est auto-hébergé depuis le paquet npm. |
| `https://*.cartocdn.com` | Redondant et plus large que `*.basemaps.cartocdn.com`, déjà présent. |

Le constant `TURNSTILE_WIDGET_ORIGIN` reste exporté et commenté : réactiver le widget est une ligne, pas une redécouverte.

### `'unsafe-inline'` — ce qui reste, et pourquoi

Trois usages subsistent. Aucun n'est un contournement de facilité :

1. **`script-src` sur les pages publiques prérendues.** Structurellement inévitable : un nonce n'existe pas dans du HTML figé au build. L'alternative — forcer le rendu dynamique partout — supprimerait aussi la mise en cache CDN des pages publiques, qui est la première ligne d'absorption de charge du runbook.

   **Ce que cela laisse exposé, sans détour** : sur une page publique, un script inline injecté s'exécuterait. Le risque est borné par le fait que ces pages ne rendent que des données du dépôt, qu'aucune saisie utilisateur n'y est réinjectée côté serveur et qu'aucune session n'y est accessible. Le jour où une page publique affichera du contenu soumis par un visiteur, elle devra passer en rendu dynamique pour retrouver le nonce.

2. **`style-src` sur les mêmes pages.** Next.js insère des balises `<style>` sans nonce dans les pages prérendues. Les zones privées, elles, utilisent bien `style-src 'self' 'nonce-…'`.

3. **`style-src-attr`.** React écrit les props `style={{…}}` en attributs `style`, qu'aucun nonce ni hash ne peut couvrir. Un attribut de style n'exécute pas de script ; le risque résiduel est l'exfiltration par sélecteurs CSS.

`'unsafe-eval'` est **absent de toute politique de production**. Il n'apparaît qu'en développement, où React Refresh l'exige — verrouillé par test.

### Violations

| | Nombre |
| :--- | ---: |
| Violations initiales | **La totalité du JavaScript des pages publiques** (aucun bundle exécuté) |
| Violations corrigées | Toutes |
| Violations restantes | **0** — zéro erreur console sur l'accueil, `/devis`, et le clone propre |

Contrôle actif : un domaine non autorisé (`upload.wikimedia.org`) est bien **BLOQUÉ**, tandis que `data:`, `blob:` et les tuiles passent. La CSP n'est pas simplement permissive.

---

## 3. Dépendances

| | |
| :--- | ---: |
| Dépendances directes analysées | 26 |
| Mises à jour majeures | 5 |
| Mises à jour correctives | 0 |
| Supprimées | 1 (`@eslint/eslintrc`, ajouté puis retiré, devenu inutile) |
| Remplacées | 0 |

### Détail des montées

**`vitest` 2.1.9 → 4.1.10**
Corrige la seule vulnérabilité **critique** du projet (lecture et exécution de fichiers arbitraires via le serveur UI). Entraîne `vite`, `esbuild`, `vite-node`, `@vitest/mocker`.
*Risque* : faible, dépendance de développement, jamais embarquée en production. API utilisée (`describe/test/expect/vi/beforeEach/afterEach`) inchangée.
*Migration appliquée* : Vitest 4 s'appuie sur **rolldown/oxc** et non plus sur esbuild ; la clé `esbuild.jsx` n'était plus lue et les tests important un `.tsx` échouaient. Ajout de `oxc.jsx`, les deux clés étant conservées.
*Validation* : 132 tests, typecheck, lint, build.

**`next` 14.2.35 → 16.2.10**
Next 14 n'avait **aucune** version corrigée pour ses advisories : la montée était le seul correctif possible.
*Risque* : élevé (deux majeures d'écart), maîtrisé par une migration explicite.
*Migration appliquée* : `cookies()` et `headers()` deviennent asynchrones (Next 15) ; `params` et `searchParams` deviennent des promesses (7 emplacements) ; `NextRequest.ip` est retiré (Next 16).
*Décision sur `NextRequest.ip`* : **aucun repli sur `x-forwarded-for`**, qui est écrit par le client et donc falsifiable — c'est précisément ce que `request-context.ts` refuse de faire depuis l'audit précédent. Sans `TRUSTED_PROXY=cloudflare`, l'IP devient « inconnue », ce que les appelants traitent déjà comme tel et jamais comme « autorisé ».
*Validation* : hydratation, 6/6 tuiles, 7 marqueurs, JSON-LD, wizard interactif, 11 routes publiques en 200, zones privées en 307.

**React reste en 18.3.1** — Next 16 le supporte (`peer ^18.2.0 || ^19.0.0`). Une variable de moins à la fois ; React 19 n'est requis par aucune vulnérabilité.

**`eslint` 8.57.1 → 9.39.5** et **`eslint-config-next` 14.2.15 → 16.2.10**
Deux causes : ESLint 8 portait plusieurs advisories hautes sans correctif rétroporté, et **Next 16 a supprimé `next lint`**, ce qui imposait d'exécuter ESLint directement, donc de migrer en configuration plate.
*Conflit rencontré et résolu sans le masquer* : ESLint **10** a d'abord été installé, puis écarté — `eslint-plugin-import`, `eslint-plugin-jsx-a11y` et `eslint-plugin-react` plafonnent leur peer à `^9`, et `npm ls` remontait des entrées `invalid`. ESLint 9.39.5 est la combinaison réellement supportée. **Aucun `--force` ni `--legacy-peer-deps`** n'a été utilisé. `npm ls eslint` remonte désormais **0** conflit.
*Migration appliquée* : `.eslintrc.json` → `eslint.config.mjs`. `eslint-config-next` 16 exposant une configuration plate native, le pont `FlatCompat` s'est révélé inutile et a été retiré avec sa dépendance.
*Validation critique* : les 11 règles de sécurité ont été **vérifiées sur un fichier sonde** — les 6 catégories (SQL brut, `sql.raw`, `innerHTML`, `setTimeout` chaîne, `new Function`, eval implicite) déclenchent toujours.

**`@types/node` 20.19.43 → 24.13.3**
`engines.node` déclare `>=24 <25` : les définitions de types ne correspondaient pas au runtime exigé.
*Risque* : faible, dépendance de développement.

### Classement des dépendances non montées

| Catégorie | Paquets | Motif |
| :--- | :--- | :--- |
| **A — conserver** | `bcryptjs`, `drizzle-orm`, `postgres`, `sharp`, `speakeasy`, `leaflet`, `zod`, `autoprefixer`, `postcss`, `tsx`, `drizzle-kit`, `@types/*` (hors node) | Stables, aucune vulnérabilité, aucune incompatibilité. |
| **G — conserver temporairement** | `react` / `react-dom` 18 → 19 | Non requis : Next 16 supporte React 18. Migration à mener séparément, avec ses propres tests. |
| **G** | `eslint` 9 → 10 | Bloqué par les peers des plugins de `eslint-config-next`. À revoir quand l'écosystème suivra. |
| **G** | `tailwindcss` 3 → 4 | Réécriture complète de la configuration. Aucun bénéfice sécurité. |
| **G** | `typescript` 5 → 7, `zod` 3 → 4, `lucide-react` 0.378 → 1.x | Majeures sans enjeu de sécurité ; changements d'API à instruire hors de cette mission. |

Aucune dépendance directe inutilisée ne subsiste : `pg` et `@types/pg` avaient déjà été retirés lors de la restructuration précédente.

### Lockfile

`package-lock.json` versionné, jamais édité à la main. `npm ci` réussit dans un clone propre (**code de sortie 0**, 457 paquets). `npm dedupe` n'a pas été exécuté : aucun doublon problématique constaté.

---

## 4. Vulnérabilités

| | Avant | Après |
| :--- | ---: | ---: |
| Critiques | 1 | **0** |
| Hautes | 17 | 4 |
| Modérées | 6 | 5 |
| **Total** | **24** | **9** |

**Corrigées : 15**, dont l'unique critique. Toutes les vulnérabilités des chaînes `vitest`/`vite`/`esbuild` et `eslint`/plugins sont fermées.

### Les 9 restantes — toutes sur `next` 16.2.10

Elles sont **toutes corrigées en Next 16.2.11**. Cette version est publiée mais **volontairement non installée** : `.npmrc` impose `min-release-age=7`, une protection contre l'installation d'une version fraîchement compromise. 16.2.11 est parue le 21/07 et devient éligible le **28/07**.

Décision prise avec l'utilisateur : **respecter la politique et attendre**. Un `npm update next` à partir du 28/07 ferme les neuf.

Exploitabilité réelle dans ce projet, vérifiée dans le code :

| Advisory | Gravité | Atteignable ici ? |
| :--- | :---: | :--- |
| SSRF dans les Server Actions sur serveur personnalisé | haute | **Non** — aucune Server Action (`"use server"` absent), aucun serveur personnalisé |
| Contournement Middleware/Proxy (Turbopack + locale unique) | haute | **Non** — ni i18n ni locales, Turbopack non utilisé en production |
| Déni de service via les Server Actions | haute | **Non** — aucune Server Action |
| SSRF dans les `rewrites` par nom d'hôte contrôlé | haute | **Non** — aucun `rewrites` configuré |
| Déni de service de l'API d'optimisation d'images (SVG) | modérée | **Non** — `images.unoptimized: true` |
| Divulgation non authentifiée des Server Functions internes | modérée | **Non** — aucune Server Action |
| Charge utile non bornée de Server Action (Edge) | modérée | **Non** — aucune Server Action |
| Confusion de cache sur réponses à corps (× 2) | modérée | **Potentiellement** — traitement HTTP générique |

**7 des 9 sont structurellement inatteignables. 2 restent potentiellement atteignables** et constituent le risque assumé pendant deux jours.

Aucune n'a été masquée : `npm audit --audit-level=critical` reste bloquant en CI sur les critiques, et le workflow documente désormais explicitement pourquoi les hautes ne bloquent pas.

---

## 5. Séparation serveur / client

Vérifié : aucun composant `"use client"` n'importe de module serveur. `node:crypto`, l'accès base, les modules d'authentification et la génération d'en-têtes vivent exclusivement côté serveur. `scripts/check-client-bundle.js` scanne les artefacts à chaque build — **aucun secret détecté**.

Un défaut réel a été corrigé au passage, signalé par `react-hooks` 7 : `CookieBanner` appelait `setState` **synchronement dans un effet**, provoquant un rendu en cascade. Remplacé par `useSyncExternalStore`, l'outil prévu pour lire un état extérieur à React — avec en prime la synchronisation entre onglets.

---

## 6. Résultats des commandes

Toutes exécutées sur le dépôt, puis **rejouées à l'identique dans un clone propre**.

| Étape | Commande | Code | Résultat |
| :--- | :--- | :---: | :--- |
| Clone | `git clone --branch chore/dependencies-and-csp-hardening` | 0 | OK, aucun `.env` versionné |
| Installation | `npm ci` | **0** | 457 paquets, 34 s |
| Types | `npm run typecheck` | **0** | Aucune erreur |
| Lint | `npm run lint:strict` | **0** | **0 erreur, 0 avertissement** |
| Tests | `npm test` | **0** | **132 / 132**, 9 fichiers |
| Build | `npm run build` | **0** | Compilé, 46 pages |
| Bundle | `npm run check:bundle` | 0 | Aucun secret |
| Taille | `npm run check:size` | 0 | Tous les fichiers < 400 lignes |
| `npm ls eslint` | — | 0 | **0 conflit de peer** |
| `npm audit` | — | — | Endpoint registre **indisponible** (réponse gzip malformée, incident npmjs.org). Contourné par interrogation directe de l'API d'avis, avec décompression. |
| GitHub Actions | — | — | **Non exécuté** : pas de `push` effectué. Les workflows ont été corrigés et relus ; leur exécution reste à confirmer sur le dépôt distant. |

### Tests fonctionnels — clone propre, build de production

| Parcours | Résultat |
| :--- | :--- |
| Pages publiques (accueil, à-propos, services, réalisations, contact, devis, connexion, page commune, page service) | 200 |
| `robots.txt`, `sitemap.xml`, `/.well-known/security.txt` | 200 |
| `/admin`, `/mon-compte` sans session | 307 vers `/connexion?next=…` |
| Hydratation React | active |
| Carte Leaflet | 6/6 tuiles, 7 marqueurs, styles appliqués |
| Assistant de devis | interactif (étape 1 → 2) |
| Aperçus d'images (`blob:`) | chargés |
| Icônes `data:` | chargées |
| Domaine non autorisé | **bloqué** |
| JSON-LD | 2 blocs, tous deux valides (`RoofingContractor,LocalBusiness` et `FAQPage`) |
| Console navigateur | **aucune erreur** |

---

## 7. Ce qui reste à faire

1. **`npm update next` à partir du 28/07/2026** — ferme les 9 advisories restantes dès que 16.2.11 franchit `min-release-age`.
2. **Pousser la branche et vérifier GitHub Actions** — les workflows sont corrigés mais leur exécution distante n'a pas été observée.
3. **React 19** — non requis par la sécurité, à mener comme une migration à part entière.
4. **Supprimer `'unsafe-inline'` de `script-src` sur les pages publiques** — suppose de renoncer au prérendu statique, donc à la mise en cache CDN. À rouvrir si une page publique se met un jour à afficher du contenu soumis par un visiteur.
5. **ESLint 10** — quand `eslint-plugin-import`, `jsx-a11y` et `react` déclareront le support.
