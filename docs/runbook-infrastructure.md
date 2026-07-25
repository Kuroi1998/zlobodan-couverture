# Runbook d'infrastructure — Zlobodan Couverture

**Public** : personne chargée du déploiement et de l'exploitation.
**Statut** : à appliquer. Rien de ce document n'est en place aujourd'hui.

Le durcissement applicatif livré dans `src/lib/security/` ne tient que si cette configuration existe. En particulier, **la section 2 (pare-feu de l'origine) conditionne l'efficacité de la section 1** : sans elle, toute la protection CDN se contourne en une commande.

---

## 1. CDN et pare-feu applicatif (Cloudflare)

### Mise en place

1. Déléguer le DNS de `zlobodan-couverture.be` à Cloudflare.
2. Passer les enregistrements `A`/`AAAA` de l'apex et de `www` en **proxy activé** (nuage orange). Un enregistrement en « DNS only » publie l'IP d'origine.
3. Vérifier qu'aucun enregistrement résiduel (`mail`, `ftp`, `direct`, `staging`) n'expose l'IP d'origine. C'est la fuite la plus courante.

### Protections attendues

| Réglage | Valeur |
| :--- | :--- |
| Protection L3/L4 | Automatique, toujours active |
| Bot Fight Mode | Activé |
| Security Level | Medium |
| Challenge managé | `/api/auth/*`, `/api/devis`, `/admin*` |
| Browser Integrity Check | Activé |

### Règles WAF

```
# 1. Signatures d'injection sur les paramètres et le corps
(http.request.uri.query contains "union select")
or (http.request.uri.query contains "' or 1=1")
or (http.request.uri.query contains "../")
or (http.request.uri.query contains "${jndi:")
=> Block

# 2. Outils d'attaque connus
(http.user_agent contains "sqlmap") or (http.user_agent contains "nikto")
or (http.user_agent contains "nmap") or (http.user_agent contains "masscan")
or (http.user_agent contains "havij") or (http.user_agent eq "")
=> Block

# 3. Zone commerciale — l'entreprise n'intervient qu'en Belgique
(not ip.geoip.country in {"BE" "FR" "NL" "LU" "DE"})
and (http.request.uri.path contains "/api/")
=> Managed Challenge

# 4. Corrélation avec les leurres applicatifs
# L'application répond 404 avec l'en-tête x-zb-trap sur les chemins leurres
# (lib/security/decoys.ts). Créer une règle de limitation :
# 3 réponses x-zb-trap en 1 minute depuis une IP => Block 24 h.
```

### Cache

- **Pages publiques** (`/`, `/services/*`, `/realisations/*`, `/[slug]`) : statiques au build, `Cache Everything`, Edge TTL 1 jour. Une page servie par le cache absorbe la charge sans jamais atteindre l'application.
- **Ne jamais cacher** : `/admin*`, `/mon-compte*`, `/api/*`. Ces routes sont marquées `force-dynamic` côté application, mais la règle CDN doit l'expliciter.
- **Compromis à connaître** : la CSP à nonce rend chaque réponse HTML dynamique unique. Les pages publiques restent statiques, donc cachables ; les zones authentifiées ne le sont pas, et ne doivent pas l'être.

---

## 2. Pare-feu de l'origine — **critique**

Sans cette étape, les sections 1 et 3 sont décoratives : un attaquant qui découvre l'IP d'origine (moteurs de recherche d'IP, historique DNS, en-têtes d'email) contourne le CDN en visant l'IP directement.

### Règle

Le serveur n'accepte de trafic sur 80/443 **que depuis les plages Cloudflare**.

```bash
# Plages officielles, à rafraîchir périodiquement (elles changent)
curl -s https://www.cloudflare.com/ips-v4 -o /tmp/cf4
curl -s https://www.cloudflare.com/ips-v6 -o /tmp/cf6

# Exemple UFW
ufw default deny incoming
while read -r cidr; do ufw allow from "$cidr" to any port 443 proto tcp; done < /tmp/cf4
while read -r cidr; do ufw allow from "$cidr" to any port 443 proto tcp; done < /tmp/cf6
ufw allow from <IP_ADMIN_FIXE> to any port 22 proto tcp
ufw enable
```

Sur un hébergement managé (Vercel, Fly, Railway), l'équivalent est l'authentification d'origine Cloudflare (**Authenticated Origin Pulls**) — activer et exiger le certificat client.

### Vérification

```bash
# Doit échouer (délai d'attente ou refus)
curl -sv --max-time 5 https://<IP_ORIGINE>/ -H "Host: zlobodan-couverture.be"
# Doit réussir
curl -sI https://zlobodan-couverture.be/
```

### Variable applicative associée

```
TRUSTED_PROXY=cloudflare
```

Elle indique à `lib/security/request-context.ts` de lire `CF-Connecting-IP`. **Ne l'activer qu'une fois le pare-feu en place** : sans lui, cet en-tête est falsifiable par n'importe qui.

---

## 3. TLS

| Réglage | Valeur |
| :--- | :--- |
| Mode SSL Cloudflare | **Full (Strict)** — jamais « Flexible », qui laisse le lien CDN→origine en clair |
| Version minimale | TLS 1.3 (1.2 seulement si des clients anciens l'imposent, à documenter) |
| HSTS | `max-age=63072000; includeSubDomains; preload` (déjà émis par l'application) |
| Always Use HTTPS | Activé |
| Certificat d'origine | Cloudflare Origin CA, 15 ans, renouvellement automatique |

**Préchargement HSTS** : action manuelle, à soumettre sur `hstspreload.org` **après** avoir vérifié que tous les sous-domaines servent en HTTPS. Le retrait de la liste prend des mois — ne pas soumettre avant d'en être certain.

Objectif : A+ sur SSL Labs. Vérifier après mise en place.

---

## 4. PostgreSQL

### Comptes à privilèges minimaux

L'application ne doit **jamais** tourner avec le propriétaire du schéma.

```sql
-- 1. Compte de migration : utilisé uniquement au déploiement.
CREATE ROLE zlobodan_migrate LOGIN PASSWORD '<coffre>';
GRANT ALL ON SCHEMA public TO zlobodan_migrate;

-- 2. Compte applicatif : données seulement, aucune modification de structure.
CREATE ROLE zlobodan_app LOGIN PASSWORD '<coffre>';
GRANT USAGE ON SCHEMA public TO zlobodan_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO zlobodan_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO zlobodan_app;
-- Explicitement : ni DROP, ni ALTER, ni CREATE, ni superuser.

-- 3. Compte lecture seule : pages publiques, exports, statistiques.
CREATE ROLE zlobodan_readonly LOGIN PASSWORD '<coffre>';
GRANT USAGE ON SCHEMA public TO zlobodan_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO zlobodan_readonly;

-- 4. Audit append-only : imposé par la base, pas seulement par convention.
REVOKE UPDATE, DELETE ON audit_log FROM zlobodan_app;
GRANT INSERT, SELECT ON audit_log TO zlobodan_app;

-- 5. Appliquer aux tables futures.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO zlobodan_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO zlobodan_readonly;
```

### Row Level Security

Dernière ligne de défense : elle doit tenir même si une requête applicative est mal filtrée. À activer sur **toutes** les tables, y compris celles jugées sans risque.

```sql
-- L'application pose l'identité courante en début de transaction :
--   SET LOCAL app.current_user_id = '<uuid>';
--   SET LOCAL app.current_role = 'client' | 'staff' | 'admin';

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes FORCE ROW LEVEL SECURITY;

CREATE POLICY quotes_owner ON quotes
  FOR ALL TO zlobodan_app
  USING (
    current_setting('app.current_role', true) IN ('staff', 'admin')
    OR user_id::text = current_setting('app.current_user_id', true)
  );

-- Répéter pour : invoices, credit_notes, projects, documents, messages,
-- quote_requests, quote_lines, sessions, tokens, users, audit_log.
-- Une table sans politique et avec RLS activée refuse tout : c'est le bon
-- sens d'échec, mais il faut le vérifier au déploiement.
```

**Note d'intégration** : l'application ne pose pas encore ces variables de session. La RLS est donc à déployer **conjointement** à cette évolution, faute de quoi toutes les requêtes seront refusées. À traiter comme un chantier à part entière.

### Réseau et chiffrement

- Base **non exposée** sur l'internet public : réseau privé, VPC peering ou tunnel.
- `sslmode=require` au minimum dans `DATABASE_URL` — l'application refuse de démarrer sans (`lib/security/env.ts`).
- Chiffrement au repos activé côté fournisseur.
- `pg_hba.conf` : `hostssl` uniquement, `scram-sha-256`.

### Sauvegardes

- Sauvegarde quotidienne chiffrée, rétention 30 jours, plus une mensuelle sur 12 mois.
- **Test de restauration trimestriel obligatoire.** Une sauvegarde jamais restaurée n'est pas une sauvegarde.
- Restauration : instance neuve → vérification d'intégrité → bascule. **Conserver l'instance compromise** pour analyse.

---

## 5. Secrets

Aucun secret dans le dépôt. `lib/security/env.ts` interrompt le démarrage si l'un manque en production.

| Variable | Rôle | Rotation |
| :--- | :--- | :--- |
| `DATABASE_URL` | Connexion, `sslmode=require` obligatoire | À l'incident |
| `SESSION_SECRET` | Min. 32 caractères | 12 mois |
| `IP_HASH_SALT` | Min. 32 caractères. La rotation rend les empreintes historiques incomparables — attendu | 12 mois |
| `TURNSTILE_SECRET_KEY` | La clé de test `1x0000…AA` est **refusée** en production | À l'incident |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Limitation de débit partagée | 12 mois |
| `TRUSTED_PROXY` | `cloudflare` une fois §2 en place | — |
| `APP_ORIGIN` | Origine canonique pour le contrôle CSRF | — |

Coffre : Doppler, Vault, ou les secrets chiffrés de l'hébergeur. Jamais un fichier `.env` versionné.

### Isolation des environnements

- **Aucune donnée de production en développement.** Jeux de test anonymisés : emails remplacés par `client-<n>@example.test`, téléphones et noms substitués.
- Bases, comptes et secrets distincts par environnement.
- L'environnement de préproduction est protégé par mot de passe HTTP et exclu de l'indexation.

---

## 6. Supervision

### Journal de sécurité

L'application émet une ligne JSON par événement sur la sortie standard, canal `security`. À router vers un collecteur (Datadog, Better Stack, Loki).

Alertes à configurer :

| Condition | Seuil | Gravité |
| :--- | :--- | :--- |
| `SESSION_TOKEN_REUSE` | 1 occurrence | Critique — page immédiate |
| `AUDIT_WRITE_FAILURE` | 1 occurrence | Critique |
| `ACCESS_DENIED_ROLE` / `ACCESS_DENIED_OWNERSHIP` | 5 en 5 min | Haute |
| `TOTP_REQUIRED_NOT_ENROLLED` | 1 occurrence | Haute |
| `CSP_VIOLATION` | 10 en 10 min | Haute |
| Pic de 401/403/429 | 3× la normale | Haute |
| `RATE_LIMIT_EXCEEDED` avec `degraded: true` | 1 occurrence | Haute — Redis injoignable |
| `HONEYPOT_TRIGGERED` | 3 en 1 min depuis une IP | Moyenne — alimente la règle WAF |
| Création de compte en rafale | 10/h depuis une IP | Moyenne |
| Requête > 3 s | — | Moyenne |

### Supervision d'erreurs

Sentry ou équivalent, avec `beforeSend` purgeant les données personnelles. Réutiliser `redact()` de `lib/security/security-events.ts` plutôt que d'écrire un second filtre.

### Disponibilité

Sonde externe sur `/` et `/api/security/csp-report` toutes les minutes, depuis au moins deux régions.

---

## 7. Back-office

- **Liste d'IP autorisées** au niveau Cloudflare si l'entreprise travaille depuis des postes fixes — c'est la mesure la plus efficace du document, et la moins coûteuse :

```
(http.request.uri.path contains "/admin") and (not ip.src in {<IP_BUREAU> <IP_VPN>})
=> Block
```

- **Chemin non devinable** : à mettre en œuvre par une règle de réécriture Cloudflare (`/<segment-aleatoire>/*` → `/admin/*`) plutôt que dans le code, pour que le segment reste un secret d'exploitation. À traiter comme une couche d'obscurcissement : la garde de rôle applicative reste le contrôle réel.

---

## 8. Vérification après déploiement

```bash
# En-têtes de sécurité
curl -sI https://zlobodan-couverture.be/ | grep -iE "content-security-policy|strict-transport|x-frame|x-content-type|referrer-policy|permissions-policy"

# X-Powered-By absent
curl -sI https://zlobodan-couverture.be/ | grep -i "x-powered-by" && echo "ECHEC" || echo "OK"

# Zone authentifiée inaccessible sans session
curl -so /dev/null -w "%{http_code}\n" https://zlobodan-couverture.be/admin          # 307 vers /connexion
curl -so /dev/null -w "%{http_code}\n" https://zlobodan-couverture.be/mon-compte     # 307 vers /connexion

# IDOR sur les documents
curl -so /dev/null -w "%{http_code}\n" https://zlobodan-couverture.be/api/pdf/invoice/3f2504e0-4f89-41d3-9a0c-0305e82c3301  # 401

# Identifiant mal formé rejeté sans requête
curl -so /dev/null -w "%{http_code}\n" "https://zlobodan-couverture.be/api/pdf/quote/%3Cscript%3E"  # 404

# CSRF en refus par défaut
curl -so /dev/null -w "%{http_code}\n" -X POST https://zlobodan-couverture.be/api/auth/login  # 403

# Leurre
curl -sI https://zlobodan-couverture.be/wp-admin | grep -i "x-zb-trap"

# security.txt
curl -s https://zlobodan-couverture.be/.well-known/security.txt

# Limitation de débit sur plusieurs instances (Redis, pas mémoire locale)
for i in $(seq 1 15); do
  curl -so /dev/null -w "%{http_code} " -X POST https://zlobodan-couverture.be/api/auth/login \
    -H "Content-Type: application/json" -H "Origin: https://zlobodan-couverture.be" -d '{}'
done; echo
# Attendu : des 429 apparaissent, et le compteur ne se remet pas à zéro
# lorsqu'une autre instance répond.
```

Puis : SSL Labs (objectif A+), Mozilla Observatory, et une nouvelle passe de `npm audit`.
