# Stratégie de test

## Les cinq niveaux

| Niveau | Commande | Ce qu'il prouve |
| --- | --- | --- |
| Unitaire | `npm run test` | Schémas, machines à états, permissions, libellés, enveloppes d'API, pagination |
| Intégration | `npm run test:integration` | Les services écrivent et lisent réellement PostgreSQL, et le cloisonnement tient |
| Bout en bout | `npm run test:e2e` | Les parcours réels d'un navigateur, sur un build de production |
| Redémarrage | `npm run test:restart` | Les données survivent à l'arrêt complet du serveur |
| Build | `npm run build` | Le rendu, le typage et la taille de bundle tiennent en production |

`npm run validate` enchaîne typage, lint strict, taille, unitaires et build.
`npm run validate:full` y ajoute intégration et bout en bout.

## Organisation des fichiers

Toutes les suites vivent sous `test/`, une racine unique :

```text
test/
├── unit/          Suites Vitest sans dépendance externe (npm run test)
├── integration/   Suites Vitest sur PostgreSQL jetable
│   └── support/   Fixtures partagées
├── e2e/           Parcours Playwright Chromium
│   └── support/   Aides de navigation
├── restart/       Preuve de persistance après redémarrage
└── stubs/         Doublures de modules (`server-only`)
```

Les suites unitaires importent le code applicatif par l'alias `@/`, jamais par
chemin relatif : leur emplacement reste ainsi indépendant de celui de `src/`.

## Ce que chaque niveau ne prouve pas

Un test unitaire sur `can()` ne prouve pas qu'une route l'appelle. Un test
d'intégration sur un service ne prouve pas qu'une page l'utilise. C'est pour
cela que les trois niveaux existent, et que le cloisonnement entre clients est
vérifié **aux trois** : en unitaire sur la fonction d'autorisation, en
intégration sur les requêtes SQL, en bout en bout sur ce qu'un navigateur
reçoit réellement.

## Base de données de test

Les tests d'intégration et de bout en bout exigent une base **locale** dont le
nom se termine par `_test`. Les scripts refusent de démarrer autrement — la
vérification est dans `scripts/run-integration-tests.cjs` et
`scripts/run-e2e-tests.cjs`, pas dans une consigne.

Les fichiers d'intégration partagent la même base. Une suite qui laisse ses
lignes derrière elle fait donc échouer les assertions de comptage absolu des
autres : **chaque fichier nettoie ses propres écritures** dans `afterAll`.

## Preuve de persistance

`npm run test:restart` ne se lance qu'après `npm run test:e2e` : il relit les
données que ce dernier a produites, dans une base séparée, après un arrêt et un
redémarrage réels du serveur. Sont vérifiés :

- message de contact et son statut modifié en back-office ;
- demande de devis, sa pièce jointe, son historique ;
- **note interne** avec son auteur ;
- **demande annulée** par le client, et l'absence du bouton d'annulation ;
- **téléphone du profil** modifié.

Une donnée visible seulement avant redémarrage n'est pas considérée comme
connectée.

## Cloisonnement horizontal

Le scénario est systématiquement le même : deux comptes, une ressource
appartenant au premier, le second qui tente d'y accéder en connaissant sa
référence.

Le refus doit être **indiscernable** d'une ressource inexistante. Les tests
vérifient donc les deux branches : référence d'autrui et référence
inexistante doivent produire la même réponse.

### Une limite connue et assumée

Sur les **pages** de l'espace client, `notFound()` rend bien la frontière
« Demande introuvable », mais le statut HTTP est `200` et non `404` : la page
est `force-dynamic` et son layout interroge PostgreSQL, donc le flux de réponse
est déjà commencé quand `notFound()` s'exécute et Next ne peut plus poser le
code. Les tests portent en conséquence sur ce qui est observable et sur ce qui
compte — aucune donnée du dossier d'autrui n'atteint le navigateur — et non sur
le code de statut.

Les **routes d'API**, elles, renvoient bien `404` : elles ne streament pas.

## Écrire un test de mutation

`page.request.post()` de Playwright ne pose ni `Origin` ni `Sec-Fetch-Site`,
alors que le filtre de bordure refuse toute mutation qui ne prouve pas son
origine. Sans en-tête explicite, une assertion sur un refus d'autorisation
**passe pour la mauvaise raison** : on vérifie le contrôle CSRF en croyant
vérifier le contrôle de rôle. Le helper `mutatingHeaders(page)` existe pour
cela.

Second piège : le quota de connexion est de dix par quart d'heure et par IP.
Ajouter des tests qui se connectent chacun de leur côté finit par faire échouer
le dernier. Regrouper plutôt que d'assouplir le quota — l'assouplir
reviendrait à ne plus le tester.

## Jeu de recette

`npm run db:seed` produit quatre comptes, quatre demandes, trois contacts et
deux notes. Il est **idempotent** et exige `SEED_PASSWORD` : aucun mot de passe
par défaut n'est fourni. Il refuse de s'exécuter en production.

Il crée les secrets TOTP des comptes privilégiés et les imprime une fois — sans
eux, le back-office est inaccessible, le double facteur étant obligatoire pour
`staff` et `admin`.

Le seed n'est **pas** exécuté par la CI : les tests d'intégration comptent des
lignes en valeur absolue, et le harnais E2E provisionne déjà ses propres
comptes. C'est un outil de développement.

## Intégration continue

`.github/workflows/ci.yml` démarre un service PostgreSQL isolé, puis enchaîne :
installation, vérification d'environnement, migrations, contrôle de la base,
typage, lint strict, taille de bundle, tests unitaires, tests d'intégration,
build, puis bout en bout et preuve de redémarrage.

La base de production n'est jamais utilisée : les URL sont fournies par le
service `postgres` du workflow.
