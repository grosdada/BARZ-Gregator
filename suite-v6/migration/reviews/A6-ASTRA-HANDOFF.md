# A6 — CCP : handoff Astra → Sol

Revue achevée le 12 septembre 2026 par `gpt-6-astra`. **Repasser sur Sol High
pour le portage et les tests.** L'application reste en 0.11.0/A5 pendant la revue.

## Couverture et provenance

Les 44 valeurs du bundle ont été lues : **22 conservées, 3 corrigées, 19 hors
prompt**. Les 51 valeurs supplémentaires présentes dans les occurrences de
`cccp.html` ont aussi été lues : 4 fragments de compilation conservés et 47
valeurs d'interface/runtime exclues du prompt. Les exclusions conservent la
fonction des champs, boutons, modes et messages. Deux corrections de métadonnées
sont enregistrées séparément.

Les cinq templates, les quatre textes de mode résolus, les quatre variations,
les huit sorties de fixture et les handlers de composition/transfert ont été
examinés. Le fragment Puppet A2 résulte de deux littéraux ; les deux provenances
sont conservées. Les décisions des IDs partagés sont limitées aux occurrences
CCP, sans approbation implicite des autres outils.

- bundle : `9a77383da0be29b0be771788c4c611454a58983bdf835b8aba9e98f223fdb8ae` ;
- fixture : `ba42759e53c446976d8a998e81b9a0fa1b2b64aff3bc1867b60e4a913d5ba727` ;
- source V5 vérifiée : `e231f3766eadb89d5ea9ec1b3099a651d163384d05a04fe0fbe830a42293069b`.

`a6-astra.review.json` contient les décisions du bundle.
`a6-astra-supplement.review.json` contient les décisions supplémentaires,
le catalogue avec les originaux/corrections, les règles de composition et les
huit sorties V6 attendues. Neuf cas supplémentaires couvrent toutes les grilles
entières de 2 à 4 colonnes/lignes, avec codes de panneaux et empreintes de sorties.
Le script `record-a6-astra-review.mjs` sérialise ces décisions figées et refuse la
dérive de ses entrées. Il ne réalise pas une nouvelle revue automatique.

## Corrections de texte approuvées

| Emplacement | Correction |
| --- | --- |
| Fragment Puppet A2 | `in a reallocation` → `in a real location` ; `intentionalnon-realistic` → `intentional non-realistic` |
| Corps Puppet C | `posing. lighting` → `posing, lighting` ; `This are references for a practical puppet/figurine characters.` → `These are references for a practical puppet/figurine character.` ; `No text on image.` → `No text on the image.` |
| Suffixe de grille | Remplacement de l'override ambigu par le nombre exact de panneaux et la liste exhaustive de leurs codes ; application à A1/B seulement |
| Sous-titre et titre de page | `Consistent Character Processus` → `Consistent Character Process` |

Conserver la formulation esthétique, les répétitions de fidélité, les mots
`photo realistic`, le rendu de figurine, les matières et les descriptions des
neuf cadrages. Les expressions « perfect identity » ou « 360-degree visual
understanding » restent des intentions du prompt ; l'interface ne doit pas
les présenter comme une garantie de résultat. La grille A2 reste une planche
de sept vues, même quand la grille de storyboard change.

## Architecture et placement

Garder l'ID historique `cccp`, le nom **CCP** et le sous-titre anglais corrigé.
Installer un outil déplaçable dans `grid-generation` (Board & Sequence). Les
quatre étapes conservent leurs IDs `a1`, `a2`, `b`, `c` et restent accessibles
indépendamment. L'ordre est un parcours conseillé, pas une barrière obligeant à
générer ou importer les résultats précédents. Deck et Backstage restent fixes.

Séparer les cinq corps, les fragments de mode et les quatre variations en
données déclaratives avec IDs/provenance. L'adaptateur prend en charge la grille,
les modes, l'itération, le panneau, la copie et les brouillons. Les chaînes
`${...}` archivées documentent le code historique : aucune bibliothèque ne peut
les exécuter. Utiliser la substitution déclarative bornée déjà employée en V6.

## Composition précise des quatre sorties

**A1, contact sheet.** Pour 3 × 3, conserver les neuf plans numérotés et leurs
trois groupes, avec le suffixe corrigé. Pour les autres grilles, ajuster le
nombre, les dimensions écrites et l'intervalle des codes. Présenter les neuf
descriptions de cadrage comme une palette sans codes ni groupes de lignes,
précédée de l'instruction exacte `coverageInstruction` du supplément. Le modèle
doit en choisir un sous-ensemble pour moins de neuf panneaux ou varier ces
cadrages pour davantage de panneaux. Aucune description source n'est perdue,
aucune ancienne cellule C3 n'est imposée à une grille 4 × 2. Le suffixe donne
tous les codes autorisés, de gauche à droite puis de haut en bas.

**A2, character sheet.** Toujours quatre vues corps entier et trois portraits.
Ajouter le mode A2 sélectionné, en propageant les deux corrections Puppet.
Ne pas ajouter de suffixe de grille. La planche sept vues n'a pas de codes A1–C3.

**B, storyboard.** Adapter les dimensions et les codes de la sortie. Retirer
` (3x3 Grid 1)` dans la désignation de la référence `Character Shot Sheet` : la
grille demandée en sortie ne décrit pas nécessairement l'image de référence,
qui peut aussi être la planche sept vues A2. Garder son rôle de fidélité spatiale.
Ordre : corps, suffixe de grille, mode B, `USER SCENE INPUT`, scène intacte,
puis éventuelle instruction d'itération.

**C, image extraite.** Sélectionner le corps humain ou puppet ; substituer la
grille SOURCE et le code validé. Supprimer entièrement le suffixe de génération
de grille. Les instructions de cadrage, de lumière prise dans le panneau et de
suppression des labels restent intactes. C prépare une image autonome ; ce
prompt ne réalise pas un recadrage pixel à pixel.

Le champ `grid` conserve la simplicité historique : grille demandée en A1/B,
grille de la référence à isoler en C. Le libellé doit montrer cette différence
sur C. Ce réglage est une déclaration de l'utilisateur, pas une détection des
dimensions d'un asset. Modifier la grille ne modifie pas les images déjà créées.

Les transformations concernent uniquement les templates intégrés avant insertion
de la scène. Ne pas transformer `3x3`, `A1`, `$&`, `${...}`, retours ligne ou HTML
contenus dans le texte personnel. Un prompt final personnalisé reste souverain
jusqu'à l'action explicite de recompilation, comme dans les autres outils V6.

## État, itération et validation

Defaults : grille 3 × 3, modes Puppet indépendants pour A2/B/C, scène vide,
panneau A1, compteur `iterationTake = 0`, quatre étapes repliées. Un changement
de mode d'une étape ne change pas les autres. Préserver l'état dans les setups,
duplications, versions, exports/imports et restaurations. La migration A5 → A6
doit créer la sauvegarde habituelle et conserver les personnalisations.

Le compteur zéro correspond à Take 1 sans suffixe. Chaque clic Iterate avance
une fois : Take 2 = fresh coverage ; Take 3 = alternate pacing ; Take 4 = new
lensing ; Take 5 = different energy ; Take 6 reprend fresh coverage. Copier ou
envoyer n'incrémente jamais le compteur. Le bouton Iterate ouvre B et copie la
nouvelle instruction comme la V5 ; un échec du presse-papiers conserve le texte
visible et le compteur déjà incrémenté, sans nouvel incrément automatique.

Écart V6 approuvé : tout changement réel de scène, saisi ou reçu du pont, remet
le compteur à zéro. La V5 le fait à la saisie mais pas à la réception du pont.
Une livraison répétée à texte identique conserve le compteur. Un changement de
grille ou de mode garde le compteur, conformément aux handlers historiques.

Accepter uniquement des colonnes/lignes entières 2–4 et des modes connus.
L'itération est un entier sûr positif ou nul, avec contrôle avant incrément.
Normaliser le panneau par trim/majuscules ; vide signifie A1. Valider sa présence
dans la liste de la grille (lettre = ligne, chiffre = colonne). Une entrée
invalide bloque uniquement la compilation/envoi C avec une erreur de champ
claire, pas les étapes A1/A2/B. Si changer la grille rend le panneau invalide,
le montrer sans le remplacer silencieusement par une autre composition.

Le reset restaure les réglages ci-dessus via le mécanisme de sauvegarde V6,
en conservant les prompts personnels. Distinguer cet acte d'une simple remise
à zéro de l'itération.

## Ponts et références

Chaque étape prépare un brouillon IMAGE. Ni `4K` dans C, ni « video-ready » dans
B ne constituent des réglages API. Aucun modèle, ratio, résolution, durée ou
asset ne doit être inventé ; la grille interne n'est pas le ratio de l'image.
Garder les références comme rôles explicites. Les IDs d'assets réels ne sont
transmis que s'ils ont été choisis et résolus par le mécanisme existant.

Les messages historiques `prompt-atlas:send-prompt` vers `cccp` alimentent la
scène B par remplacement. Réutiliser le contrat V6 pour vérifier origine,
fenêtre source connue et payload string. Une réception idempotente ne déclenche
ni copie ni dépense. Si le producteur V5 n'est pas encore raccordé, documenter
la limite plutôt que déclarer le pont testé avec une simple compilation.

## Vérification Sol

Comparer les huit sorties aux attendus V6, les neuf configurations de grille et
leurs empreintes. Compléter les contrôles des deux modes de C, A2 indépendant
de la grille, codes hors bornes, modes indépendants, cycle complet des quatre
variations, changement/réception de scène et conservation du texte personnel.
Vérifier que C ne contient jamais le suffixe OUTPUT GRID. Vérifier au navigateur
la copie, les erreurs de champ, la persistance entre setups, le reset sauvegardé
et la réception effective d'un brouillon image sans génération.

Les tests de fixtures V5 restent inchangés : ils prouvent la capture historique,
y compris ses défauts. Les attendus V6 approuvés vivent dans le supplément.

Reproduire l'enregistrement : `node migration/reviews/record-a6-astra-review.mjs`.
Valider : `npm run validate:astra-review -- migration/atlas-v5/semantic-review/astra-bundles/a6-consistent-character-process.json migration/reviews/a6-astra.review.json`.
