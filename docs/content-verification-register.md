# Registre de vérification du contenu

Suivi des informations publiques retirées du site faute de preuve, et de ce
qu'il faut réunir pour les republier.

**Dernière vérification :** 2026-07-27
**Auteur de l'audit :** revue éditoriale, visuelle, juridique et commerciale
**Validateur requis :** direction de l'entreprise ; conseil juridique pour les
mentions légales et les conditions commerciales

> Aucune information listée « à confirmer » ne doit être republiée sur la seule
> base d'une supposition. Renseigner un champ de `src/config/company.ts`
> équivaut à déclarer qu'on en détient la preuve.

---

## Contexte

Le site dérivait d'un modèle conçu pour une **entreprise française de la région
nantaise**, re-libellé en belge sans que les données soient remplacées. Les
traces en étaient visibles en production : identifiants de chantiers
`chantier-nantes-ardoise`, `chantier-orvault-tuile`, `chantier-vertou`,
`chantier-carquefou` ; mentions « Loire-Atlantique » et « à Nantes (44) » dans
des titres SEO ; mentions légales rédigées pour une **SAS** avec **SIRET** et
**RCS** ; assureurs français **SMA BTP** ; certifications françaises **RGE** et
**Qualibat** ; domaine `.fr` dans le plan de site face à `.be` dans les données
structurées.

---

## 1. Identité légale — à confirmer

| Élément | Valeur retirée | Risque | Statut |
| --- | --- | --- | --- |
| Numéro BCE | `BE 0849.201.394` | **Élevé.** Un numéro d'entreprise inexact désigne potentiellement une autre société réelle | À confirmer |
| Numéro de TVA | `BE 0849.201.394` | Élevé, même motif | À confirmer |
| Forme juridique | « SRL » dans le nom, « SAS » dans les mentions | Contradiction interne ; « SAS » est une forme française | À confirmer |
| Capital social | `18 600 €` | Moyen | À confirmer |
| RPM / RCS | « RPM Bruxelles », affiché sous le libellé « RCS » | Libellé français | À confirmer |
| Siège social | `Avenue Louise 14, 1050 Bruxelles` | Le code postal de configuration disait `1000`, l'adresse `1050` | À confirmer |
| Responsable de publication | « Direction Zlobodan Couverture » | Une personne physique doit être nommée | À confirmer |

**Action appliquée :** champs mis à `null` dans `src/config/company.ts`, typés
`string | null` pour forcer chaque appelant à traiter l'absence. Les mentions
légales affichent un encadré indiquant que ces informations sont en cours de
vérification.

**Pour republier :** extrait BCE, statuts de la société, et désignation écrite
du responsable de publication.

---

## 2. Coordonnées — à confirmer

| Élément | Valeur retirée | Observation |
| --- | --- | --- |
| Téléphone | `02 345 67 89` | Séquence 2-3-4-5-6-7-8-9 : numéro de démonstration |
| Téléphone d'urgence | `0470 12 34 56` | Séquence 1-2-3-4-5-6 : idem |
| Courriel de contact | `contact@zlobodan-couverture.be` | Domaine à confirmer |
| Courriel de support | `support@zlobodan-couverture.be` | Figurait en signature de tous les courriels |

**Action appliquée :** tous les boutons d'appel renvoient au formulaire tant
qu'aucun numéro n'est vérifié — voir `src/components/ui/ContactActionButton.tsx`.
Un bouton d'appel inopérant coûte plus qu'il ne rapporte.

**Conséquence technique :** l'adresse recevant les notifications internes ne
peut plus être déduite de la coordonnée publique. Elle provient désormais de la
variable **`NOTIFICATION_ADMIN_EMAIL`**, obligatoire en production.

---

## 3. Assurance — à confirmer

| Élément | Valeur retirée |
| --- | --- |
| Assureur | « AXA Belgium / Ethias » — deux compagnies pour un contrat |
| Numéro de police | `POL-DEC-BE-849201` |
| Mention en-tête | « Garantie Décennale Belge AXA n° … » |
| Mention Hero | « Garantie Décennale SMA BTP (10 ans) » — assureur **français** |

**Action appliquée :** plus aucun assureur n'est nommé. Le site énonce
désormais un fait juridique — les travaux de gros œuvre engagent la
responsabilité décennale de l'entrepreneur en droit belge — sans revendiquer de
couverture particulière.

**Pour republier :** contrat d'assurance (assureur, numéro, période, activités
et territoire couverts) **et** autorisation d'employer la marque de l'assureur.

---

## 4. Avis et notes — supprimés

| Élément | Valeur retirée |
| --- | --- |
| Note | `4.9 / 5` en bandeau d'en-tête et dans le Hero |
| Nombre d'avis | `124+ avis clients vérifiés Google` |
| Balisage | `aggregateRating` : `ratingValue 4.9`, `reviewCount 124` |
| Témoignages | 6 avis nominatifs marqués `verifiedGoogle: true` |
| Avis de chantier | 6 `clientReview` supplémentaires dans les réalisations |

Les témoignages portaient des noms de personnes vraisemblables
(Jean-Marc Vanderbeeken, Chantal Dubois, Antoine Thiry, Sophie Wouters,
Michel Laurent, Bernard Peeters) présentés comme des clients réels.

**Action appliquée :** `src/data/reviews.ts` et le carrousel supprimés ;
`aggregateRating` retiré du JSON-LD.

> Un balisage d'avis inventé contrevient aux règles des moteurs de recherche et
> expose à une sanction de référencement, indépendamment de la question
> commerciale.

**Pour republier :** profil d'avis réel, avec la note et le nombre relevés à une
date explicite, ou lien vers le profil sans reproduire la note.

---

## 5. Réalisations — supprimées

Les six fiches présentées comme des chantiers réalisés portaient des
identifiants de communes de l'agglomération nantaise, tout en affichant des
villes belges. Les descriptions, matériaux, durées et avis clients associés
n'étaient rattachés à aucun chantier vérifiable.

**Action appliquée :** `src/data/realisations.ts`, les pages `/realisations`, le
comparateur avant/après et les liens de navigation supprimés. Le plan de site et
les pages locales ne les référencent plus.

**Pour republier :** photographies de chantiers réellement réalisés, autorisation
écrite du client, absence de données personnelles identifiables (plaques,
numéros de maison, intérieurs reconnaissables).

---

## 6. Images — supprimées

| Fichier | Poids | Décision |
| --- | --- | --- |
| `public/images/hero-roof.webp` | 1 823 o | Supprimé — origine inconnue |
| `public/images/chantiers/chantier-01.webp` | 1 592 o | Supprimé — origine inconnue |
| `public/images/chantiers/chantier-02.webp` | 1 424 o | Supprimé — origine inconnue |
| `public/images/chantiers/chantier-03.webp` | 2 075 o | Supprimé — origine inconnue |
| `public/images/chantiers/before-after-01.webp` | 1 275 o | Supprimé — origine inconnue |
| `public/images/logo.png` | **absent** | Référencé par le JSON-LD : lien mort |

Un à deux kilo-octets : ce sont des fichiers de substitution, pas des
photographies. Aucun n'était accompagné d'une licence ou d'un auteur.

**Action appliquée :** fichiers supprimés ; le Hero utilise un dégradé, les
pages de service un bloc typographique, et l'image Open Graph a été retirée.
Aucune image ne subsiste dans `public/`.

**Pour republier :** photographies de l'entreprise ou banque d'images sous
licence, avec preuve conservée. Les visuels d'illustration ne doivent jamais
figurer dans une galerie de réalisations sans mention explicite.

---

## 7. Engagements commerciaux — reformulés

| Avant | Après |
| --- | --- |
| « Service d'urgence 24h/24 & 7j/7 dans toute la région » | « Demandes urgentes traitées en priorité, selon nos disponibilités » |
| « Intervention sous 2h sur fuite active » | « Urgences traitées en priorité » |
| « Devis gratuit sous 48h », « métré sur place sous 48h » | « Devis détaillé après analyse de votre demande » |
| « Diagnostic toiture gratuit à domicile » | « Décrivez votre situation, nous l'analysons » |
| « 18 ans de métier », « plus de 700 toitures rénovées » | Retiré |
| « Entrepreneur Agréé Primes », « Entreprise RGE Qualibat », « Artisan Certifié » | « Accompagnement aux primes régionales » |
| « 90 € à 185 € par m² » | « Tarif établi après analyse de votre demande » |
| « Nos couvreurs agréés / diplômés / certifiés » | « Nos équipes » |

La bannière d'alerte permanente a été désactivée : une alerte affichée en
continu n'est pas une alerte.

Les fourchettes de prix ont été retirées plutôt qu'encadrées : issues du modèle
français, elles ne correspondaient à aucun barème vérifié et s'affichaient sans
mention de TVA, de contenu ni de validité. Les **facteurs** de variation ont été
conservés — ils informent sans rien promettre.

---

## 8. Zone d'intervention — corrigée

La configuration annonçait un rayon de **40 km** autour de Bruxelles tout en
listant Namur (≈ 60 km), Mons (≈ 65 km) et Liège (≈ 90 km). Deux pages locales
existaient pour Namur et Liège, avec des « chantiers récents » fictifs.

**Action appliquée :** zone ramenée à Bruxelles-Capitale et au Brabant wallon,
cohérente avec elle-même. Pages Namur et Liège supprimées. Cercle de 40 km
retiré de la carte. Un test vérifie que toute commune disposant d'une page
figure dans la zone déclarée.

**À confirmer :** l'étendue réelle de la zone d'intervention.

---

## 9. Hébergement — à confirmer

Les mentions légales indiquaient simultanément un hébergement « au sein de
l'Union européenne » et une adresse de Vercel Inc. en Californie. Ni l'un ni
l'autre n'a pu être vérifié.

**Action appliquée :** section « Hébergement » indiquant que l'information est
en cours de confirmation.

**Pour republier :** contrat ou facture d'hébergement, et localisation réelle
des serveurs.

---

## 10. Services tiers — inventoriés

| Service | Finalité | Données transmises | Consentement |
| --- | --- | --- | --- |
| Cloudflare Turnstile | Anti-robot des formulaires | IP, signaux de navigateur | Strictement nécessaire |
| CARTO / OpenStreetMap | Fonds cartographique | IP lors du chargement des tuiles | Strictement nécessaire au affichage de la carte |
| Upstash Redis | Limitation de débit | Identifiants techniques dérivés | Sans objet (serveur) |
| Fournisseur SMTP | Courriels transactionnels | Adresse du destinataire | Sans objet (serveur) |
| Stockage objet | Pièces jointes et documents | Fichiers déposés | Sans objet (serveur) |

**Mesure d'audience : aucune.** `src/lib/analytics.ts` n'émet un événement que
si `window.gtag` existe, et aucun script de ce type n'est chargé. La politique
de confidentialité ne mentionne donc pas de service d'analytique — conformément
à la règle « ne pas documenter un service qui n'est pas utilisé ».

---

## Procédure de republication

1. Réunir la preuve (document officiel, contrat, extrait BCE, profil vérifié).
2. Renseigner le champ correspondant dans `src/config/company.ts`.
3. Mettre à jour le test `src/__tests__/contentIntegrity.test.ts`, qui vérifie
   aujourd'hui que ces champs valent `null` — cette mise à jour délibérée est le
   garde-fou.
4. Consigner ici la date, la source et le validateur.
5. Vérifier la propagation : site, données structurées, PDF, courriels.

## Points nécessitant une validation humaine

- Mentions légales et politique de confidentialité : rédigées d'après le code et
  le droit belge applicable, **non validées par un juriste**.
- Conditions générales de prestation : **absentes**. Le site ne permet
  aujourd'hui qu'une demande de contact ou de devis, sans vente en ligne ; des
  conditions de prestation restent à rédiger et à valider si l'entreprise
  souhaite encadrer ses devis.
- Durées de conservation annoncées (trois ans après le dernier échange) : à
  confirmer par l'entreprise.
