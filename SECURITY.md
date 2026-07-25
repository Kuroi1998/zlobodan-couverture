# Politique de sécurité — Zlobodan Couverture SRL

**Dernière révision** : 25 juillet 2026
**Portée** : application web Next.js (`src/`), sa configuration, ses dépendances.
**Audit de référence** : [docs/audit-securite-2026-07-25.md](docs/audit-securite-2026-07-25.md)

Ce document remplace une version antérieure qui décrivait des protections **non implémentées** (isolation client, Zod sur toutes les API, CSP sans `unsafe-inline`, jetons de réinitialisation). Il ne décrit désormais que ce qui existe dans le code, et nomme explicitement ce qui n'existe pas.

---

## 1. Contact et signalement

- **Email** : `security@zlobodan-couverture.be`
- **Point de terminaison** : `/.well-known/security.txt` (RFC 9116)
- **Accusé de réception** : sous 72 heures ouvrées.

Merci de ne pas exécuter de test de déni de service, de ne pas accéder à des données clientes réelles, et de nous laisser un délai raisonnable avant publication.

---

## 2. Mesures en place

### Contrôle d'accès

L'application n'a **aucun** point d'entrée authentifié sans garde serveur.

| Mécanisme | Fichier |
| :--- | :--- |
| Résolution et validation de session (expiration, révocation, inactivité) | `lib/security/session-guard.ts` |
| Gardes de page et d'API (`requirePageRole`, `requireApiUser`) | `lib/security/guards.ts` |
| Moteur d'autorisation en refus par défaut | `lib/auth/permissions.ts` |
| Validation d'identifiant avant tout accès base | `lib/validations/identifiers.ts` |

Points de conception :

- Les gardes vivent dans les **layouts et handlers**, jamais dans le middleware. CVE-2025-29927 permet de neutraliser l'exécution du middleware Next.js par un en-tête forgé ; une autorisation qui y résiderait serait contournable.
- Un refus d'appartenance renvoie **404 et non 403** : un 403 confirmerait l'existence de la ressource et permettrait d'énumérer le portefeuille client.
- Une ressource sans propriétaire identifiable est **refusée**, pas accordée.
- Un jeton de session révoqué qui se représente déclenche la **révocation de toutes les sessions du compte**.

### Injection

- 100 % des accès base passent par le query builder Drizzle, donc par des requêtes paramétrées. Aucun SQL brut dans le dépôt.
- `db.execute`, `sql.raw`, `$queryRawUnsafe` et `$executeRawUnsafe` sont **bloqués par ESLint**. L'unique fichier d'exception est `lib/db/raw-queries.ts`, aujourd'hui vide et documenté.
- Le tri dynamique passe par une **liste blanche de colonnes** (`lib/db/sort.ts`) — un nom de colonne ne pouvant pas être un paramètre lié, c'est la seule construction sûre.
- La pagination est plafonnée à 100 quel que soit le `limit` reçu.
- `eval`, `new Function`, `setTimeout("chaîne")`, `innerHTML`, `outerHTML`, `dangerouslySetInnerHTML` et l'import de `child_process` sont **bloqués par ESLint**.

### XSS et encodage

- CSP à **nonce par requête**, sans `unsafe-eval` ni `unsafe-inline` sur les scripts (`lib/security/csp.ts`), avec `report-uri` vers un collecteur (`/api/security/csp-report`).
- Encodage contextuel séparé par contexte — HTML, attribut, URL, JSON embarqué, champ d'email (`lib/security/encoding.ts`).
- Leaflet est **auto-hébergé** : plus aucun script tiers chargé depuis un CDN.
- Les emails transactionnels échappent chaque champ et neutralisent les retours à la ligne.

### Anti-abus

- Limitation de débit à **stockage partagé** (Upstash Redis), avec politiques différenciées par route (`lib/security/rate-limit-guard.ts`), réponses `429` et `Retry-After`.
- Blocage progressif de l'authentification sur le **couple (IP, compte)** — 3 échecs déclenchent l'anti-automate, 5 une temporisation croissante, 10 un verrouillage. Verrouiller par compte seul en ferait une arme de déni de service contre ce compte.
- Corps de requête plafonnés, clés `__proto__` / `$` refusées (`lib/security/body.ts`).
- `statement_timeout`, `lock_timeout` et `idle_in_transaction_session_timeout` posés au niveau de la connexion.
- Champ piège sur le formulaire public, routes leurres d'administration (`lib/security/decoys.ts`).

### Authentification

- bcrypt coût 12, vérification HaveIBeenPwned par k-anonymité.
- **2FA réellement imposée** pour `staff` et `admin` : un compte privilégié non enrôlé se voit refuser la connexion, il ne reçoit aucune session.
- Sessions administrateur courtes : 30 min d'inactivité, 8 h en absolu. Clients : 7 jours.
- Cookie `__Host-`, `httpOnly`, `Secure`, `SameSite=Strict`.
- Réponses non énumérantes : l'inscription et la connexion ne permettent pas de distinguer un compte existant d'un compte inconnu.
- Contrôle d'origine **en refus par défaut** sur les mutations : sans `Origin` ni `Sec-Fetch-Site`, la requête est rejetée.

### Détection

- Journal de sécurité structuré en JSON sur la sortie standard, avec purge des valeurs sensibles (`lib/security/security-events.ts`).
- Un échec d'écriture d'audit produit une **alerte** au lieu d'être avalé silencieusement.
- Collecteur de violations CSP.

### Chaîne d'approvisionnement

- Next.js 14.2.35, drizzle-orm 0.45.2 (correction de l'injection SQL par identifiants).
- CI : `npm ci`, `npm audit --audit-level=high` bloquant, `tsc --noEmit`, ESLint à zéro avertissement, Semgrep, Gitleaks sur l'historique complet, Dependabot.
- Vérification automatisée qu'aucun secret n'atteint le bundle client (`scripts/check-client-bundle.js`).
- Aucun secret n'a de valeur de repli : leur absence **arrête le démarrage** en production (`lib/security/env.ts`).

### Vérification

50 tests automatisés (`npm test`) couvrant : charges d'injection classiques sur chaque champ et paramètre, contrôle d'accès horizontal et vertical, pollution de prototype, SSRF, en-têtes CSP, détection de type par octets d'en-tête, purge du journal, injection dans les emails, limitation de débit.

---

## 3. Risques résiduels assumés

Ces points sont connus, acceptés en l'état, et doivent être réévalués.

| Risque | Pourquoi il subsiste | Atténuation actuelle |
| :--- | :--- | :--- |
| **`style-src-attr 'unsafe-inline'`** | React écrit les props `style={{…}}` en attributs `style`, qu'aucun nonce ni hash ne peut couvrir. | Un attribut de style n'exécute pas de script. Le risque restant est l'exfiltration par sélecteurs CSS. |
| **Aucun email n'est réellement envoyé** | Aucun client SMTP n'est installé. Les alertes « nouvel appareil », « compte verrouillé » et « réutilisation de jeton » sont construites, échappées et journalisées, **mais ne partent pas**. | Les événements restent visibles dans le journal de sécurité. Branchement prévu via `registerTransport()`. |
| **2 vulnérabilités hautes non corrigées** | `postcss` (transitif via Next.js) et deux advisories Next.js n'ont **pas** de correctif en 14.x. Le seul correctif est Next.js 16, changement majeur. | La critique (CVE-2025-29927) est corrigée. Voir §5. |
| **Fenêtre de débit fixe** | À cheval sur deux fenêtres, un client peut émettre jusqu'à deux fois le quota. | Les seuils sont dimensionnés pour casser l'automatisation, pas pour compter à la requête près. |
| **Repli mémoire du limiteur** | Si Redis ne répond pas, le compteur redevient local à l'instance. | La dégradation est **journalisée en `high`**, elle n'est pas silencieuse. |
| **Réassociation DNS sur les appels sortants** | La résolution DNS survient après le contrôle d'URL. | La liste blanche de domaines rend l'attaque sans objet : l'attaquant ne contrôle aucun domaine autorisé. |
| **Reconnaissance d'appareil approximative** | Fondée sur le couple (empreinte d'IP, agent utilisateur) — une IP mobile change souvent. | Produit des alertes en excès plutôt qu'en défaut, ce qui est le bon sens d'erreur. |
| **Verrouillage par (IP, compte)** | Un attaquant qui change d'IP repart à zéro sur ce compteur. | Assumé : le blocage distribué relève du WAF, seule couche qui voit l'ensemble du trafic. |
| **CSP à nonce et cache CDN** | Un nonce par requête rend chaque réponse HTML unique, donc non cachable en page entière. | Les pages publiques restent statiques ; seules les zones authentifiées sont dynamiques. Voir le runbook. |

---

## 4. Périmètre non couvert

Le code **ne peut pas** traiter les points suivants. Ils restent exposés tant que le runbook n'est pas appliqué.

- **Déni de service volumétrique (L3/L4)** — se traite en amont du serveur, pas dans l'application.
- **Exposition de l'IP d'origine** — sans pare-feu restreignant le trafic HTTP aux plages du CDN, toute la protection amont se contourne en attaquant l'IP directement. C'est l'erreur la plus fréquente.
- **TLS** — version, suites de chiffrement, préchargement HSTS, renouvellement des certificats.
- **Comptes PostgreSQL à privilèges minimaux et Row Level Security** — les politiques sont décrites dans le runbook mais s'appliquent au déploiement, pas au dépôt.
- **Isolation réseau de la base**, chiffrement au repos.
- **Gestion et rotation des secrets** dans un coffre dédié.
- **Sauvegardes et test de restauration.**
- **Isolation des environnements** et anonymisation des jeux de test.

Voir [docs/runbook-infrastructure.md](docs/runbook-infrastructure.md).

---

## 5. Dette de sécurité identifiée

1. **Montée en Next.js 16** — seul correctif disponible pour `postcss` et deux advisories Next.js restantes. Changement majeur : à planifier avec tests de non-régression, hors du périmètre de ce durcissement.
2. **Branchement d'un transport email** — sans lui, aucune alerte n'atteint l'utilisateur.
3. **Parcours d'enrôlement 2FA** — la connexion refuse désormais un compte privilégié non enrôlé ; le parcours d'enrôlement dédié reste à écrire.
4. **Réinitialisation de mot de passe** — les tables de jetons existent, le parcours n'est pas implémenté.
5. **File d'attente pour les traitements coûteux** (génération de PDF, redimensionnement, envoi d'emails), aujourd'hui absents ou synchrones.

---

## 6. Plan de réponse à incident

### Qui contacter

1. Responsable technique (astreinte) — canal interne.
2. `security@zlobodan-couverture.be`.
3. En cas de fuite de données personnelles : **Autorité de protection des données** (Belgique), sous **72 heures** après prise de connaissance — art. 33 RGPD.

### Révoquer toutes les sessions en urgence

```sql
-- Coupe l'intégralité des sessions actives, tous comptes confondus.
UPDATE sessions SET revoked_at = NOW() WHERE revoked_at IS NULL;
```

Effet immédiat : `resolveSession()` rejette tout jeton révoqué et déclenche en outre la révocation en cascade du compte concerné.

Pour un seul compte, utiliser `revokeAllSessionsForUser(userId)` (`lib/security/session-guard.ts`).

### Forcer une réinitialisation globale des mots de passe

```sql
BEGIN;
UPDATE sessions SET revoked_at = NOW() WHERE revoked_at IS NULL;
-- Invalide les empreintes sans supprimer les comptes.
UPDATE users SET password_hash = 'INVALIDATED-' || gen_random_uuid()::text;
COMMIT;
```

Puis notifier les clients par un canal hors application, le transport email n'étant pas branché (§3).

### Restaurer une sauvegarde

Procédure détaillée dans le runbook, section « Sauvegardes ». Principe : restaurer sur une instance neuve, vérifier l'intégrité, basculer, **conserver l'instance compromise** pour analyse.

### En cas de fuite de données personnelles

1. Contenir : révoquer les sessions, couper l'accès compromis.
2. Qualifier : quelles tables, quels champs, combien de personnes. Le journal de sécurité et `audit_log` sont les sources.
3. Notifier l'Autorité de protection des données sous **72 h**.
4. Informer les personnes concernées si le risque est élevé (art. 34 RGPD).
5. Conserver les journaux et une copie forensique avant toute remise en état.

### Rotation d'un secret compromis

1. Générer la nouvelle valeur dans le coffre.
2. Déployer.
3. Révoquer l'ancienne.
4. Pour `IP_HASH_SALT` : la rotation rend les empreintes d'IP historiques incomparables aux nouvelles. C'est le comportement attendu, à documenter dans le ticket d'incident.
