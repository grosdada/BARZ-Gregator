# A5 — VEO Precision : brief de revue Astra

Date : 12 septembre 2026. Préparation : Sol. Ce document borne la prochaine passe
Astra ; il n'autorise ni implémentation, ni génération payante, ni réécriture d'un
autre atelier. **Passer sur Astra High pour la revue, puis revenir sur Sol avant le
portage.** Aucun reset de quota ne doit être consommé.

## Périmètre signé

- bundle : `a5-veo-precision`, 223 décisions, environ 3 348 tokens ;
- propriétaire exclusif : `veo-suite` ;
- source historique : `Barzy App/public/assets/HTML/veo_precision.html` ;
- fixture antérieure à la revue : `a5-legacy-fixtures.json`, avec empreinte de la
  source, 7 familles, 22 cartes, 110 variantes, états initiaux et composition
  configurée incluant la couche reçue de Blocking Studio.

Le fichier à lire est
`migration/atlas-v5/semantic-review/astra-bundles/a5-veo-precision.json`. Le
gabarit signé à compléter est
`migration/atlas-v5/semantic-review/astra-reviews/a5-veo-precision.review.json`.
- SHA-256 du bundle :
  `b567221eaa252af043205238fe3b7c45f7d885a74ccad9424ec020936018bafd`.

## Mission Astra

Lire les 223 valeurs du bundle et les 110 variantes de la fixture. Produire
une décision explicite par ID : `preserve`, `correct` avec texte et raison, ou
`exclude-non-prompt` avec raison. Conserver l'anglais original sauf faute réelle.
Les noms de familles, cartes et intensités sont des métadonnées utiles ; les
identifiants DOM, handlers, messages d'état et libellés d'interface ne sont pas
des fragments de prompt.

Rendre aussi un avis architectural bref sur :

1. la représentation déclarative de `famille → carte → 5 intensités` ;
2. la conservation de l'ordre source lors de la composition de plusieurs couches ;
3. le statut de la couche entrante de Blocking Studio, qui doit précéder les
   cartes actives sans être confondue avec une recette de la bibliothèque ;
4. la frontière entre données migrables et adaptateur codé (activation, slider,
   repli d'intensité, copie, persistance et pont vers l'agrégateur) ;
5. les formulations datées, marques de caméras ou contradictions techniques qui
   nécessitent réellement une correction plutôt qu'une normalisation de style.

## Contraintes de portage

- Chaque carte garde exactement cinq niveaux ordonnés, avec le niveau médian `2`
  comme valeur initiale.
- Toutes les familles restent repliées au premier affichage.
- Une carte inactive ne contribue jamais au composite ; l'ordre du composite est
  la couche Blocking Studio, puis l'ordre famille/carte de la source, jamais
  l'ordre des clics.
- Le futur atelier prépare un prompt ou un brouillon d'agrégateur. Il ne lance
  aucune génération pendant la navigation ou la modification d'un slider.
- Deck et Backstage restent fixes ; VEO Precision demeure un atelier déplaçable
  piloté par Build, avec son adaptateur déclaré explicitement.
- La V5 reste en lecture seule et les corrections approuvées gardent leur
  provenance.

## Validation après la revue

Valider avec :

`npm run validate:astra-review -- migration/atlas-v5/semantic-review/astra-bundles/a5-veo-precision.json migration/atlas-v5/semantic-review/astra-reviews/a5-veo-precision.review.json`

Avant de repasser sur Sol, créer un handoff résumant les compteurs, toutes les
corrections/exclusions et l'architecture recommandée. Sol réalisera le portage,
les migrations de setup, les tests d'équivalence et la vérification navigateur.
