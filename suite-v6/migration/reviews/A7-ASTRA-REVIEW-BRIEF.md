# A7 — BZ Sheet : brief de revue Astra

Date : 12 septembre 2026. Préparation : Sol. Ce document borne la prochaine passe
Astra ; il n'autorise ni implémentation, ni génération payante, ni modification
des ateliers déjà migrés. **Passer sur Astra High pour la revue, puis revenir sur
Sol avant le portage.** Aucun reset de quota ne doit être consommé.

## Périmètre signé

- bundle : `a7-character-sheet`, 41 décisions, environ 5 696 tokens,
  propriétaire exclusif `barzy-sheet` ;
- source historique : `Barzy App/public/assets/HTML/barzy_sheet.html` ;
- fixture : `a7-legacy-fixtures.json` ;
- interface active : 2 onglets, 11 cartes, 4 couleurs de fond, 19 choix de pose,
  49 unités FACS et une sélection ordonnée de 8 unités.

Le fichier à lire est
`migration/atlas-v5/semantic-review/astra-bundles/a7-character-sheet.json`.
Le gabarit signé à compléter est
`migration/atlas-v5/semantic-review/astra-reviews/a7-character-sheet.review.json`.
- SHA-256 canonique du bundle :
  `049c4e94e5984b0f7ba1a3e36b5974500c966cace3815fa4a4503a1bd54a1f63` ;
- SHA-256 du fichier fixture :
  `54dbd96b3c1a8adf3edb6dd79d3ed6ed635ac99e98bd63519fe7378cda61053b`.

## Mission Astra

Lire chaque valeur du bundle et rapprocher les 11 corps de prompts, les fragments
de pose, les descriptions FACS et les compilations par défaut/configurées de la
fixture. Produire une décision par ID : `preserve`, `correct` avec texte et raison,
ou `exclude-non-prompt` avec raison. Conserver l'anglais original sauf faute réelle.

Rendre aussi un avis architectural bref sur :

1. les cinq Tech Boards et les six Character Sheets comme sorties distinctes ;
2. la couleur de fond, persistante par carte et par setup ;
3. Pose Sheet : mode standard, mains nues ou arme unique, sans perdre les 25 poses ;
4. Complex Expression Board : exactement huit unités FACS, ordre de sélection inclus ;
5. la réutilisation du catalogue FACS A4 sans dupliquer ses identités stables ;
6. les contrôles éclairage, multi-référence, sujet et accessoires dont les cibles
   n'existent plus dans les 11 cartes actives : les conserver comme données dormantes
   ou les exclure proprement du runtime A7 ;
7. la frontière entre bibliothèque déclarative et compilateurs de pose/FACS.

## Contraintes de portage

- Ne pas fusionner les onze sorties en un prompt composite.
- Rendre les valeurs utilisateur littéralement, sans `innerHTML` ni évaluation.
- Une sélection FACS contient au plus huit identités et conserve leur ordre.
- Les prompts personnalisés survivent au reset jusqu'à recompilation explicite.
- Le pont prépare un brouillon image dans l'agrégateur sans génération implicite.
- Deck et Backstage restent fixes ; BZ Sheet reste déplaçable et renommable via Build.

## Validation après la revue

Valider le fichier final avec :

`npm run validate:astra-review -- migration/atlas-v5/semantic-review/astra-bundles/a7-character-sheet.json migration/atlas-v5/semantic-review/astra-reviews/a7-character-sheet.review.json`

Avant de repasser sur Sol, créer `A7-ASTRA-HANDOFF.md` avec les compteurs, toutes
les corrections et exclusions, puis les décisions précises de portage.
