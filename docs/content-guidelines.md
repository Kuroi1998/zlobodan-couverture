# Règles de contenu

Comment ajouter ou modifier une information publique sans réintroduire ce que
l'audit du 2026-07-27 a retiré. Le détail de cet audit vit dans
[content-verification-register.md](content-verification-register.md).

## Principe

Toute information publique appartient à l'une de ces trois catégories :

1. **Vérifiée** — une preuve exploitable existe : document officiel, contrat,
   extrait BCE, profil contrôlé, ou donnée réellement présente en base.
2. **Générique et prudente** — n'affirme aucun chiffre ni aucune promesse forte.
   « Nous étudions votre demande et revenons vers vous » entre dans cette
   catégorie.
3. **À confirmer** — ne se publie pas. Elle est retirée de l'interface et
   consignée au registre.

Une information de catégorie 3 ne devient pas publiable parce qu'elle améliore
la conversion.

## Source de vérité

| Information | Fichier |
| --- | --- |
| Dénomination, BCE, TVA, adresse, téléphone, courriel, responsable de publication | `src/config/company.ts` |
| Assureur et police | `src/config/company.ts` (`insuranceCoverage`) |
| Zone d'intervention, horaires, badges, garanties | `src/config/site.ts` |
| Prestations | `src/data/services/` |
| Pages locales | `src/data/villes.ts` |
| Questions fréquentes | `src/data/faq.ts` |

Ne recopiez jamais une coordonnée dans un composant. `siteConfig.name` est un
alias de `companyIdentity.tradeName` : il existe pour éviter la duplication, pas
pour la permettre.

## Renseigner une donnée d'identité

Les champs de `companyIdentity` sont typés `string | null`. Ils valent `null`
tant qu'aucune preuve n'existe, et le typage oblige chaque page à traiter
l'absence — c'est ce qui permet aux mentions légales d'afficher un encadré
honnête plutôt qu'un champ vide.

Renseigner un champ suppose donc de :

1. détenir la preuve ;
2. modifier `src/config/company.ts` ;
3. mettre à jour `test/unit/contentIntegrity.test.ts`, qui vérifie
   aujourd'hui que ces champs sont nuls ;
4. consigner la source et la date au registre.

L'étape 3 est délibérément contraignante : publier un numéro d'entreprise mérite
une modification explicite, pas un effet de bord.

## Écrire une affirmation commerciale

Avant de publier une promesse, répondez à ces questions :

- que promet-elle exactement ?
- l'entreprise peut-elle la tenir **dans tous les cas** visés ?
- quelle preuve en existe-t-il ?
- quelles sont les conditions et les limites ?

Si la réponse n'est pas nette, reformulez.

| N'écrivez pas | Écrivez |
| --- | --- |
| « Intervention 24h/24 et 7j/7 » | « Demandes urgentes traitées en priorité, selon nos disponibilités » |
| « Devis gratuit sous 48h » | « Devis détaillé après analyse de votre demande » |
| « À partir de 99 € » | « Tarif établi après analyse de votre demande » |
| « Entreprise agréée / certifiée » | Nommez le dispositif précis, s'il existe et s'applique en Belgique |
| « Plus de X chantiers », « X ans d'expérience » | Rien, sauf preuve |
| « Garantie décennale AXA n° … » | « Responsabilité décennale, conformément au droit belge » |

Attention aux dispositifs **français** : RGE, Qualibat, SIRET, RCS, SAS, SMA BTP
n'ont pas cours en Belgique. Leur présence signale une reprise de modèle.

## Ajouter une réalisation

Une fiche ne peut être présentée comme un chantier réel que si :

- le chantier a réellement été réalisé par l'entreprise ;
- les photographies proviennent de ce chantier ;
- le client a autorisé la publication par écrit ;
- aucune donnée personnelle n'est identifiable — plaque d'immatriculation,
  numéro de maison, nom sur une boîte aux lettres, intérieur reconnaissable ;
- la description est fidèle.

Une image d'illustration peut accompagner la description d'un service, à
condition d'être clairement identifiée comme telle et de ne jamais figurer dans
une galerie de réalisations.

Les pièces jointes déposées par les clients sont **privées par défaut**. Une
photo reçue via un formulaire n'est pas publiable au motif qu'elle a été reçue.

## Ajouter une image

Documentez chemin, usage, origine, auteur, licence, preuve, personnes
identifiables et décision. Toute image d'origine inconnue est retirée.

Aucune image ne réside actuellement dans `public/`. Un test vérifie qu'aucun
fichier ne référence une image absente du dépôt : ajouter une référence sans
ajouter le fichier fait échouer la suite.

Les textes alternatifs décrivent l'image (« Rénovation d'une toiture en ardoise
naturelle »), jamais une liste de mots-clés. Une image purement décorative porte
`alt=""`.

## Ajouter une page locale

Une page par commune n'est légitime que si l'entreprise y intervient réellement
et que le contenu lui est propre. Un test vérifie que toute commune disposant
d'une page figure dans `siteConfig.coveredPostalCodes`.

N'écrivez jamais « Notre agence à … » en l'absence d'agence.

## Métadonnées et données structurées

Les métadonnées sont indexées puis citées dans les résultats de recherche :
elles propagent une erreur bien au-delà du site. Elles ne doivent porter aucune
affirmation absente des pages.

Le JSON-LD doit refléter le contenu visible. N'y placez ni `aggregateRating`
sans profil d'avis réel, ni prix, ni zone plus large que celle annoncée, ni
identifiant d'entreprise non vérifié.

## Garde-fou automatisé

`test/unit/contentIntegrity.test.ts` relit les fichiers publiés et échoue
sur : contenu provisoire, coordonnées de démonstration, noms fictifs
conventionnels, notes et nombres d'avis codés en dur, `aggregateRating`,
certifications françaises, assureurs nommés, disponibilité permanente affirmée,
délais de devis garantis, communes nantaises résiduelles, images référencées mais
absentes, et incohérence entre pages locales et zone déclarée.

Les commentaires sont ignorés : une correction peut citer le texte qu'elle
retire sans déclencher l'alerte qu'elle documente.

Ce test ne remplace pas la relecture. Il verrouille ce qui a déjà été trouvé.
