# A8 — BZ Designer : brief de revue Astra

Revue terminée : voir `A8-ASTRA-HANDOFF.md`. Rectification : la fixture omet
l'initialisation de couleur de `renderSections()`. Beige est bien le défaut réel
V5 ; l'hypothèse contraire ci-dessous reste la trace de la préparation initiale.

Date : 12 septembre 2026. Préparation : Sol. Ce document borne la prochaine passe
Astra ; il n'autorise ni implémentation, ni génération payante, ni modification
des ateliers déjà migrés. **Passer sur Astra High pour la revue, puis revenir sur
Sol avant le portage.** Aucun reset de quota ne doit être consommé.

## Périmètre signé

- bundle : `a8-bz-designer`, 203 décisions, environ 7 958 tokens,
  propriétaire exclusif `barz-designer` ;
- source historique : `Barzy App/public/assets/HTML/barz_designer.html` ;
- fixture : `a8-legacy-fixtures.json` ;
- interface active : 3 catégories, 55 cartes, 5 sous-onglets Sketch to Image,
  un curseur de fidélité et 4 couleurs proposées sur une carte Body Draw.

Le fichier à lire est
`migration/atlas-v5/semantic-review/astra-bundles/a8-bz-designer.json`.
Le gabarit signé à compléter est
`migration/atlas-v5/semantic-review/astra-reviews/a8-bz-designer.review.json`.
- SHA-256 canonique du bundle :
  `df03eadd319a6a5f88f2a4c8b12a90101c4f79d8cbdc0a2e0adff88ccd0160e3` ;
- SHA-256 du fichier fixture :
  `b06ba4ad206addce3328ea57cb8ba03ac3825aa51309ab2cf99adea661d663f0`.

## Mission Astra

Lire chaque valeur du bundle et la rapprocher des 55 cartes, de leurs corps de
prompt et des compilations par défaut/configurées de la fixture. Produire une
décision par ID : `preserve`, `correct` avec texte et raison, ou
`exclude-non-prompt` avec raison. Conserver l'anglais original sauf faute réelle.

Rendre aussi un avis architectural bref sur :

1. les 49 cartes Sketch réparties entre Photo (9), Clay, Manga, Comics et Kids
   (10 chacune), puis les 3 cartes Body et les 3 raccourcis Useful actifs ;
2. le curseur Original drawing weight (20–95, pas de 5), ses quatre libellés et
   l'injection littérale du pourcentage dans les 40 prompts de style ;
3. la carte B&W Body Convert : le témoin Beige paraît actif au chargement mais le
   prompt conserve `[BG_COLOR]` jusqu'au premier clic ; décider d'un vrai défaut
   Beige ou d'un état « couleur non choisie » visuellement honnête ;
4. les dix anciens raccourcis Useful déclarés puis remplacés au runtime par trois
   entrées : archiver les sept cartes dormantes sans les réactiver silencieusement ;
5. la suppression historique de `[Scene Description]`,
   `[DESCRIBE YOUR NEW SUBJECT HERE]` et `[Details]` lors de la copie : déterminer
   lesquels deviennent des champs V6 explicites et lesquels restent des marqueurs ;
6. la conservation de `[IMG_1]`, `[IMG_2]` et variantes comme références destinées
   au deck de l'agrégateur ;
7. la frontière entre catalogue déclaratif, compilateur de poids, choix de couleur
   et prompts finaux personnalisés par setup.

## Contraintes de portage

- Ne pas fusionner les 55 cartes en un prompt composite.
- Rendre toutes les valeurs utilisateur littéralement, sans `innerHTML` ni évaluation.
- Conserver l'ordre catégories, sous-onglets et cartes de la fixture.
- Ne pas inventer de correction pour les deux anomalies historiques avant la revue.
- Les prompts personnalisés survivent au reset jusqu'à recompilation explicite.
- Le pont prépare un brouillon image dans l'agrégateur sans génération implicite.
- Deck et Backstage restent fixes ; BZ Designer reste déplaçable et renommable via Build.

## Validation après la revue

Valider le fichier final avec :

`npm run validate:astra-review -- migration/atlas-v5/semantic-review/astra-bundles/a8-bz-designer.json migration/atlas-v5/semantic-review/astra-reviews/a8-bz-designer.review.json`

Avant de repasser sur Sol, créer `A8-ASTRA-HANDOFF.md` avec les compteurs, toutes
les corrections et exclusions, le traitement des cartes dormantes, du défaut de
couleur et des marqueurs, puis les décisions précises de portage.
