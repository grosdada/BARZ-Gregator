# A6 — Consistent Character Process : brief de revue Astra

Date : 12 septembre 2026. Préparation : Sol. Ce document borne la prochaine passe
Astra ; il n'autorise ni implémentation, ni génération payante, ni modification
des ateliers déjà migrés. **Passer sur Astra High pour la revue, puis revenir sur
Sol avant le portage.** Aucun reset de quota ne doit être consommé.

## Périmètre signé

- bundle : `a6-consistent-character-process`, 44 décisions, environ 3 088 tokens,
  propriétaire exclusif `cccp` ;
- source historique : `Barzy App/public/assets/HTML/cccp.html` ;
- fixture : `a6-legacy-fixtures.json`, qui conserve les quatre étapes, cinq
  templates, deux modes, quatre variations, la grille et deux jeux de sorties.

Le fichier à lire est
`migration/atlas-v5/semantic-review/astra-bundles/a6-consistent-character-process.json`.
Le gabarit signé à compléter est
`migration/atlas-v5/semantic-review/astra-reviews/a6-consistent-character-process.review.json`.
- SHA-256 du bundle :
  `9a77383da0be29b0be771788c4c611454a58983bdf835b8aba9e98f223fdb8ae`.
- SHA-256 de la fixture :
  `ba42759e53c446976d8a998e81b9a0fa1b2b64aff3bc1867b60e4a913d5ba727`.

## Mission Astra

Lire chaque valeur du bundle et rapprocher les cinq corps de templates ainsi que
les fragments de mode et d'itération de la fixture. Produire une décision par ID :
`preserve`, `correct` avec texte et raison, ou `exclude-non-prompt` avec raison.
Conserver l'anglais original sauf faute réelle.

Rendre aussi un avis architectural bref sur :

1. le nom historique `CCP` et le sous-titre `Consistent Character Processus` ;
2. le parcours A1 → A2 → B → C et la possibilité de copier chaque sortie ;
3. la grille 2 × 2 à 4 × 4, sachant que la liste détaillée A1 reste écrite pour
   neuf panneaux et reçoit ensuite une règle d'override ;
4. les modes `puppet` et `human`, leurs répétitions et leurs fautes éventuelles ;
5. l'itération cyclique du storyboard et le code de panneau de l'étape C ;
6. la frontière entre données déclaratives, état persistant et adaptateur codé.

## Contraintes de portage

- Préserver les quatre sorties distinctes ; ne pas les fusionner en une recette.
- L'itération change uniquement l'instruction de variation et son compteur.
- Une grille personnalisée doit rester explicite et persistante par setup.
- Valider le code de panneau contre la grille plutôt que produire silencieusement
  un panneau inexistant ; Astra doit dire si cet écart de sûreté est acceptable.
- Le pont prépare un brouillon image dans l'agrégateur sans génération implicite.
- Les références d'images restent des rôles explicites ; ne pas inventer d'asset.
- Deck et Backstage restent fixes ; l'outil reste déplaçable et renommable via Build.

## Validation après la revue

Valider le fichier final avec :

`npm run validate:astra-review -- migration/atlas-v5/semantic-review/astra-bundles/a6-consistent-character-process.json migration/atlas-v5/semantic-review/astra-reviews/a6-consistent-character-process.review.json`

Avant de repasser sur Sol, créer `A6-ASTRA-HANDOFF.md` avec les compteurs, toutes
les corrections et exclusions, puis les décisions précises de portage.
