# A9 — Knolling Board Generator : brief de revue Astra

Revue et portage Sol terminés : voir `A9-ASTRA-HANDOFF.md`.
Le brief initial ci-dessous est conservé comme trace du périmètre demandé.

Date : 13 septembre 2026. Préparation : Sol. Ce document borne la prochaine passe
Astra ; il n'autorise ni portage runtime, ni génération payante, ni modification
des ateliers A1–A8. **Passer sur Astra High pour la revue, puis revenir sur Sol
avant l'implémentation.** Aucun reset de quota ne doit être consommé.

## Périmètre signé

- bundle : `a9-knolling-board`, 53 décisions, environ 12 121 tokens,
  propriétaire exclusif `knolling` ;
- source historique :
  `Barzy App/public/assets/HTML/knolling-board-generator.html` ;
- fixture : `a9-legacy-fixtures.json` ;
- interface active : 4 onglets, 17 cartes, 19 zones de tatouage et 5 familles
  de réglages dynamiques.

Le fichier à lire est
`migration/atlas-v5/semantic-review/astra-bundles/a9-knolling-board.json`.
Le gabarit signé à compléter est
`migration/atlas-v5/semantic-review/astra-reviews/a9-knolling-board.review.json`.

- digest canonique du bundle :
  `27bd2578c1c68f24128acb4248c756303d08888c70097ba5f0310c91c8e57286` ;
- SHA-256 du fichier bundle :
  `3845c66768b40905b0372400bf9bc66cc7131242adf677821cffe488a1409770` ;
- SHA-256 du fichier fixture :
  `0203bec1a64326cb5b560295bc7fba123894a12a97f9076492f633e69a375044`.

## Mission Astra

Lire chaque valeur du bundle et la rapprocher des 17 cartes, de leur texte source
et des compilations par défaut/configurées de la fixture. Produire une décision
par ID : `preserve`, `correct` avec texte et raison, ou `exclude-non-prompt` avec
raison. Conserver l'anglais original sauf faute ou ambiguïté réelle.

Rendre aussi un avis architectural bref sur :

1. les 7 cartes Generate, 2 Tattoo, 2 Actor et 6 Decor ; l'ordre de navigation
   est Generate, Tattoo, Actor, Decor, bien que Actor soit déclaré après Decor
   dans le fichier historique ;
2. les trois cartes Explorer imbriquées dans Generate, chacune produisant une
   planche de neuf variations sans devenir neuf cartes indépendantes ;
3. les réglages globaux mais à portée ciblée : éclairage Actor, référence simple
   ou multiple Decor, vêtements/accessoires et humain/marionnette pour Dress
   Character, Place It et zones ordonnées pour Tattoo ;
4. le mode Human représenté par une directive vide, alors que Puppet injecte une
   contrainte complète : décider si V6 doit afficher explicitement ce contraste
   sans inventer de prompt humain ;
5. les marqueurs `[IMG_1]`, `[IMG_2]` et le préfixe multi-image : préserver leur
   ordre et définir leur traduction vers le deck de références de l'agrégateur ;
6. l'ambiguïté de Tattoo Character entre image du corps et références tatouage,
   particulièrement lorsque les zones utilisent déjà `[IMG_1]`, `[IMG_2]`, etc. ;
7. les fragments de template `${index + 1}`, `${zone}` et `${lines.join(...)}` :
   ce sont du code de compilation, pas du texte final à montrer à l'utilisateur ;
8. l'ancien état de couleurs Character Sheet présent dans le script mais sans
   aucune carte cible dans cet atelier : l'archiver, sans le réactiver ;
9. les fautes ou artefacts d'encodage visibles, notamment la séquence de couches
   `underwear ? shirt ? jacket`, sans moderniser arbitrairement le style des prompts.

## Contraintes de portage

- Ne pas fusionner les 17 cartes ni éclater les trois planches Explorer.
- Conserver l'ordre des onglets et des cartes fixé par la fixture.
- Les réglages sans effet sur une carte ne doivent pas modifier son prompt.
- Les zones tatouage restent ordonnées, sans déduplication ou réindexation cachée.
- Toute valeur utilisateur est rendue littéralement, sans `innerHTML` ni évaluation.
- Les prompts personnalisés persistent par setup jusqu'à recompilation explicite.
- Le pont prépare un brouillon image avec ses références, sans génération implicite.
- Deck et Backstage restent fixes ; Knolling reste déplaçable et renommable via Build.

## Validation après la revue

Valider le fichier final avec :

`npm run validate:astra-review -- migration/atlas-v5/semantic-review/astra-bundles/a9-knolling-board.json migration/atlas-v5/semantic-review/astra-reviews/a9-knolling-board.review.json`

Avant de repasser sur Sol, créer `A9-ASTRA-HANDOFF.md` avec les compteurs, toutes
les corrections et exclusions, la résolution des références Tattoo et les décisions
précises de portage. Si les 17 prompts ne sont pas entièrement couverts par les
53 valeurs, ajouter un supplément signé lié au SHA-256 de la fixture.
