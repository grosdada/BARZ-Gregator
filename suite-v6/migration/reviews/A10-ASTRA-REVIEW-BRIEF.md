# A10 — MD Multishot : brief de revue Astra

Revue Astra terminée : voir `A10-ASTRA-HANDOFF.md`. Revenir sur **Sol High**
pour l’intégration ; le brief initial ci-dessous reste la trace du périmètre.

Date : 13 septembre 2026. Préparation : Sol. Ce document borne la prochaine passe
Astra ; il n'autorise ni portage runtime, ni appel LLM, ni génération payante, ni
modification des ateliers A1–A9. **Passer sur Astra High pour la revue, puis revenir
sur Sol avant l'implémentation.** Aucun reset de quota ne doit être consommé.

## Périmètre signé

- bundle : `a10-multishot`, 154 décisions, environ 14 556 tokens,
  propriétaire exclusif `multishot` ;
- source historique : `Barzy App/public/assets/HTML/MD Multishot.html` ;
- fixture : `a10-legacy-fixtures.json` ;
- interface active : 3 onglets, 24 références caméra, 6 séquences Multishot et
  8 Action Boards ;
- compilations gelées : grilles 2×2, 2×3, 3×3 et 4×4, flash activé/désactivé,
  multi-angle vide/configuré et toutes les sorties Action Board.

Le bundle à lire est
`migration/atlas-v5/semantic-review/astra-bundles/a10-multishot.json`.
Le gabarit signé à compléter est
`migration/atlas-v5/semantic-review/astra-reviews/a10-multishot.review.json`.

- digest canonique du bundle :
  `203c3439d259c9ab98cf4788cf39250485dfd519434b3af279127fdbe4c42bab` ;
- SHA-256 du fichier bundle :
  `78e484ec6546f75c5f482d77b45eca5aafdea1966f9bd0322c717adb6365d319` ;
- SHA-256 du fichier fixture :
  `c4a4fe9729b68f19cd1051037fa01d27bcc75616c0c2847fdaef9f419d2b4468`.

## Mission Astra

Lire les 154 valeurs du bundle et les rapprocher du catalogue et des sorties
compilées de la fixture. Produire une décision par ID : `preserve`, `correct` avec
texte et raison, ou `exclude-non-prompt` avec raison. Conserver l'anglais original
sauf faute ou ambiguïté réelle.

Rendre aussi un avis architectural bref sur :

1. les trois rôles distincts à ne pas aplatir : dictionnaire Camera Angles,
   générateurs Multishot et récits Action Boards ;
2. les 24 entrées Camera, exactement 12 Shots et 12 Movements, avec `prompt` et
   `context` séparés ; décider si le contexte reste une aide visible ou devient
   un fragment optionnel, sans l'ajouter silencieusement au prompt copié ;
3. les six séquences, dont `Initial Model Prompt` est active mais ne suit aucune
   adaptation de grille ; décider si elle reste une carte, devient un exemple ou
   est archivée, sans la supprimer tacitement ;
4. la seule option Hard Flash, portée uniquement par `Multishot 01`, et son
   remplacement exact de `{{FLASH_OPTION}}` ;
5. les huit Action Boards, dont le libellé historique ` Image Board - Template`
   commence par une espace accidentelle ; corriger le titre visible seulement si
   la décision est enregistrée ;
6. la sélection historique de source : un total inférieur ou égal à six utilise
   le template 2×3, sinon le 3×3. Les grilles 2×2 et 4×4 ajoutent un override mais
   la liste interne reste respectivement à six ou neuf plans : proposer un contrat
   V6 non contradictoire, déterministe et testable ;
7. le générateur Multi-Angle : 16 angles ordonnés au maximum, sujet vide explicite,
   même sujet comme source unique et numérotation ligne par ligne ;
8. les expressions `[character]`, `[specific feature]` et autres crochets : ce
   sont des emplacements éditables, pas des références automatiquement inventées ;
9. l'itération `/api/ai/refine` : elle conserve le thème, la grille/contact sheet,
   la morphologie, le style cinématographique et l'absence de texte. Elle ne doit
   jamais se lancer au chargement, au copier ou pendant une simple compilation ;
10. les valeurs de code `${g.cols}`, `${atlasGrid.total}` et fragments d'intention
    LLM : distinguer compilation, interface, contexte de modèle et prompt final ;
11. la réception de grille par URL, stockage et `postMessage` dans V5 : V6 doit
    employer l'état de setup et le pont interne, sans multiplier les sources de
    vérité ;
12. les formulations datées, références de films et fautes éventuelles : corriger
    seulement ce qui est cassé et conserver la variété créative historique.

## Contraintes de portage

- Préserver l'ordre des trois onglets et de tous les catalogues de la fixture.
- Ne pas fusionner Shots et Movements, Multishot et Action Boards.
- Afficher clairement la grille cible et le nombre final de panneaux.
- Toute sortie V6 doit annoncer une seule grille et un seul nombre de panneaux ;
  les listes de plans doivent correspondre à ce nombre.
- Hard Flash ne modifie aucune autre carte.
- Le filtre Camera n'altère ni l'ordre source ni le texte copié.
- Le texte utilisateur et les réponses d'itération sont rendus avec `textContent`,
  jamais injectés avec `innerHTML`.
- Les prompts personnalisés persistent par setup jusqu'à recompilation explicite.
- Le pont prépare un brouillon image et ses références, sans génération implicite.
- Deck et Backstage restent fixes ; MD Multishot reste déplaçable et renommable
  via Build.

## Livrables Astra

1. Compléter le gabarit signé avec exactement 154 décisions.
2. Créer `a10-astra-supplement.review.json` pour les valeurs actives absentes du
   bundle et les sorties V6 attendues, lié au SHA-256 de la fixture.
3. Créer `A10-ASTRA-HANDOFF.md` avec les compteurs, corrections, exclusions et le
   contrat précis de compilation pour 2×2, 2×3, 3×3 et 4×4.
4. Ne modifier aucun fichier runtime et ne pas lancer de serveur ou de génération.

Valider le fichier principal avec :

`npm run validate:astra-review -- migration/atlas-v5/semantic-review/astra-bundles/a10-multishot.json migration/atlas-v5/semantic-review/astra-reviews/a10-multishot.review.json`
