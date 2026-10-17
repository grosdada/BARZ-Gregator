# A12 — Cinema Helper

Revue Astra terminée le 24 septembre 2026. **Repasser sur Sol High maintenant**
pour le portage. Aucun fichier runtime Atlas n'a été modifié pendant la revue.

## Résultat signé

- Bundle : 1 032 décisions, 869 conservées, 11 corrigées, 152 hors prompt.
- Complément source : 2 760 valeurs lues, 2 327 conservées et 433 hors prompt.
- Couverture totale : 3 792 IDs extraits de l'unique source Cinema Helper.
- Fixture : 20 catalogues, 2 848 entrées, trois scénarios de composition et les
  contrats du deck, des favoris, de l'IA, du pont et des prompts négatifs.
- BZ Image DNA reste hors périmètre.

SHA-256 de la fixture :
`d721be6d54fad72fdd11b0efad06a9d56d1709cc0ecc5a15e6c476d0f749b9e5`.
Digest canonique du bundle :
`97a5424c52cec6f7cb93f5dd99884be1e9b8d698ae6f08e1dbf1aeccc8a2a13c`.

## Corrections éditoriales

Onze corrections explicites : `trompe-l'oeil`, `sahel architecture`,
`daguerreotype`, l'exemple du château de sable, les deux time-lapses d'agar,
`looks loving`, le doublon `shot shot`, l'accord cassé du Surreal Stacking,
`surrounded` dans LIDAR et les deux phrases fautives de la machine à laver.

Ne pas normaliser les noms de logiciels, appareils, procédés, artistes ou styles
qui paraissent inhabituels : `Infini-D`, `CRI film`, `Zombienose`, `Tanjore` et
les autres valeurs non corrigées restent intentionnellement inchangés.

## Catalogue à porter

Installer **Cinema Helper** dans `prompt-forge` (Idea Studio), comme banque
mobile et renommable. Préserver des IDs stables et l'ordre source :

- 29 cadrages, 72 mouvements, 95 focales et 131 caméras ;
- 110 éclairages, 124 actions, 184 expressions et 382 adjectifs ;
- 225 sujets/objets et 105 décors ;
- 19 genres, 16 templates vidéo et 16 exemples ;
- 866 artistes avec genre et miniature facultative, 474 styles artistiques.

Le total 2 848 additionne les catalogues et leurs exemples, pas des IDs tous
mutuellement exclusifs. Appliquer les 11 corrections comme overlay sur les
valeurs source ; ne pas réordonner ou dédupliquer silencieusement.

Les miniatures d'artistes sont décoratives. Les charger paresseusement avec un
fallback hors ligne ; une URL distante cassée ne bloque ni recherche, ni ajout,
ni compilation.

## Deck, favoris et recherche

L'entrée persistée est `{ itemId, item, category, copyText }`; l'identité est
`itemId` avec compatibilité V5 sur `(item, category)`. L'ordre du deck est la
source de vérité pour la copie directe. Ajouter, retirer et réordonner au clavier
et à la souris ; garder `aria-pressed`, focus visible et annonce non colorée.

Choisir une limite unique visible pour le deck et l'appliquer avant ajout comme
au chargement. La V5 tranche seulement la restauration à 80 et laisse l'ajout
dépasser 80 : ne pas reproduire cette contradiction. Un import invalide ou trop
long n'écrase pas l'état courant.

Favoris, deck, ordre et texte final sont propres au setup. Ils survivent à la
duplication, aux versions, à l'export et à la restauration. Le reset rétablit les
réglages du setup courant sans supprimer les setups nommés de l'utilisateur.

La recherche couvre libellé, alias, catégorie et texte copié. Les sélections
aléatoires restent des actions explicites ; jamais au chargement ou au reset.

## Compilation déterministe

La copie directe historique est lossless : tous les `copyText` dans l'ordre,
séparés par `, `. Elle est le résultat déterministe de référence.

Le compositeur local historique reconnaît onze catégories et construit, dans
l'ordre : caméra, mouvement/cadrage, sujet/action/objet/jeu, décor, éclairage.
Conserver ce résultat quand le deck ne contient que ces catégories. Il n'utilise
que le premier adjectif : conserver ce comportement pour l'équivalence et le
signaler si plusieurs adjectifs sont sélectionnés.

La V5 ignore silencieusement `artist`, `artstyle`, `genre` et `templates`.
Correction V6 approuvée : dès qu'une catégorie inconnue du compositeur est
présente, afficher la copie directe lossless de tout le deck comme fallback local.
Ne jamais prétendre avoir verbalisé un ingrédient supprimé.

Les noms des 16 templates et 19 genres sont des métadonnées. La valeur complète
est insérée une seule fois. Un template structuré peut rester éditable comme bloc ;
ne pas le comprimer automatiquement en phrase.

Les prompts négatifs Realistic et Anim restent séparés du positif, copiables et
explicitement étiquetés. Aucun choix automatique selon le modèle.

## Verbalisation IA

La verbalisation est un clic explicite. Une configuration IA absente signifie
indisponible ; ne pas reproduire le défaut V5 qui appelle `/api/ai/refine` sauf
si `aiEnabled` vaut exactement `false`.

Capturer setup, révision et deck ordonné au clic. Une seule requête par setup ;
ignorer toute réponse tardive. Une réponse vide, invalide ou en erreur conserve
le prompt local précédent. Rendre le résultat avec `textContent`, jamais avec
`innerHTML`. Ne stocker aucune clé fournisseur dans un setup.

Le service reçoit tous les ingrédients, y compris artiste, style, genre et
template. Il peut proposer une seule option, mais la copie/envoi doit toujours
viser le texte visible et sauvegardé, jamais une réponse cachée.

## Pont vers BZ Aggregator

La destination canonique de Cinema Helper V6 est BZ Aggregator. Le pont crée un
brouillon contenant le prompt final visible et ne lance aucune génération.
Afficher les anciennes destinations APG, CCP B, BZ DNA Transformer ou Video
Multi Framing uniquement si un atelier V6 correspondant est installé et si le
roundtrip est testé. Sinon, les garder comme provenance historique.

Le pont ne déduit ni modèle, ni média, ni résolution depuis un style, un appareil
ou un template. L'utilisateur choisit ces paramètres dans l'agrégateur.

## Validation et reprise

Reproduire et vérifier la revue avec :

```text
npm run prepare:a12-fixtures
node migration/reviews/record-a12-astra-review.mjs
npm run validate:astra-review -- migration/atlas-v5/semantic-review/astra-bundles/a12-cinema-helper.json migration/atlas-v5/semantic-review/astra-reviews/a12-cinema-helper.review.json
node --test tests/a12-astra-review.test.js tests/a12-legacy-fixtures.test.js tests/astra-review-contract.test.js
```

Porter sous **Sol High**. Vérifier ensuite : catalogue complet, overlay des onze
corrections, copie lossless, fallback sans perte, limite du deck, persistance par
setup, reset non destructif, retour IA périmé et brouillon effectivement reçu par
BZ Aggregator. Deck et Backstage restent fixes.
