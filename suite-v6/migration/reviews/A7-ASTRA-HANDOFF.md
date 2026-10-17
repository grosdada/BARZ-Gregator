# A7 — BZ Sheet : revue Astra terminée

12 septembre 2026 — gpt-6-astra. **Repasser sur Sol High pour le portage.**
Le runtime reste en 0.12.0/A6. Ce lot concerne uniquement BZ Sheet ; Barz Designer
sera traité séparément. Aucun appel de génération n'a été effectué.

## Couverture enregistrée

Les 41 valeurs du bundle signé sont relues : 20 conservées, 2 corrigées,
19 classées hors prompt. Les 345 valeurs supplémentaires de la source sont
également relues : 175 conservées, 2 corrigées, 168 hors prompt. Les décisions
des IDs partagés ne s'appliquent qu'aux occurrences de `barzy_sheet.html`.
Ces valeurs comprennent les descriptions FACS omises du bundle initial,
les noms/options et les fragments des fonctions historiques.

Sources faisant autorité : `a7-astra.review.json` et
`a7-astra-supplement.review.json`. Le supplément contient les onze cartes avec
leur formatage d'origine, le mapping des 49 expressions, les 19 options,
la grille mains nues corrigée et les sorties attendues. Le script
`record-a7-astra-review.mjs` vérifie les empreintes du bundle, de la fixture,
du corpus et du catalogue A4 avant de réenregistrer les décisions figées.

## Corrections précises

1. **Complex Expression Board**, index 12 : remplacer les deux consignes imposant
   une tête fixe par une caméra/cadrage constants, avec une exception pour les
   déplacements de tête et des yeux explicitement demandés. Toutes les autres
   phrases sont conservées. Cela rend utilisables les dix actions de tête.
2. **Composition FACS**, index 39 : utiliser `unit.label` issu du catalogue A4 et
   la description A7 associée à son ID. Supprimer le retrait aveugle du suffixe B.
   La position 31 est `facs-au51` / AU51 (Head Turn Left), la position 38 est
   `facs-au58` / AU58 (Head Back). Les variantes `facs-au56-deep` et
   `facs-au57-deep` restent distinctes et affichent « (deep) ».
3. **Options**, supplément : `Flame trower` → `Flamethrower` et
   `agjustable wrench` → `adjustable wrench`, dans le texte et le libellé.
   Garder les valeurs historiques comme clés de compatibilité ; `promptValue`
   contient la valeur corrigée. Les 19 choix et leur ordre sont conservés.
4. **Libellé**, supplément : `neutral (main nu)` → `Mains nues (combat)`.
   La clé demeure `neutral`. `none` reste le parcours standard, distinct du combat.
5. **Couleur**, décision de compilation : remplacer toutes les occurrences du
   marqueur de fond. La source n'en remplace qu'une et laisse le second marqueur
   d'Object Sheet dans le prompt copié. Aperçu, copie et brouillon doivent partager
   exactement la même sortie.
6. **Mains nues**, décision de compilation : la source utilise la grille armée
   même pour `neutral`, donnant des instructions de rechargement des mains.
   Le supplément fournit une grille dédiée de cinq lignes de cinq poses de
   combat sans objet. Conserver le fragment EMPTY HANDS. Le parcours standard
   et la grille armée restent inchangés.

Les expressions télégraphiques, mélanges de langue volontaires et options comme
`gourdin`, `matraque` ou le blaster rétro ne sont pas réécrits. Les descriptions
techniques restent des intentions de génération, pas une garantie de mesure.
Le nombre de panneaux de chaque carte est propre à celle-ci : ne pas appliquer
une grille globale CCP aux cartes A7.

## Architecture et état

Installer **BZ Sheet**, ID `barzy-sheet`, comme outil builtin à adaptateur dédié
dans **Character & Asset Lab** (`character-lab`). Build peut le déplacer et le
renommer. Deux onglets internes, dans l'ordre source : Tech Board (5 cartes) et
Character Sheet (6 cartes). Les onze prompts restent indépendants et éditables.
Pas de nouveau système d'onglets, ni de fusion avec CCP ou FACS Sheet Generator.

État propre au setup : onglet actif, fonds par ID de carte, option de pose,
liste ordonnée d'IDs FACS, recherche FACS, cartes ouvertes et `customOutputs`.
Defaults : Tech Board, tous les fonds bleus, pose `none`, huit FACS dans l'ordre
de la fixture, recherche vide, cartes repliées, aucun prompt personnalisé.
Conserver les quatre couleurs et leurs codes exacts, y compris White (#F2ECCA).

Réutiliser les identités, labels, noms et positions A4. Les 49 textes visibles A7
sont une projection spécifique de ce catalogue, indexée par ID : ils ne remplacent
pas les descriptions A4 globales. Le supplément prouve chaque correspondance
par code historique, nom et position. Les anciens codes AU58 sont résolus selon
leur origine BZ Sheet ; un code d'origine inconnue ne suffit pas.

La sélection peut contenir zéro à huit IDs valides et uniques pendant l'édition.
La compilation de la planche FACS exige exactement huit IDs. Afficher le compteur
et un message local si elle est incomplète ; ne pas compléter, tronquer ou fabriquer
des émotions. Ne bloquer que cette sortie, les autres cartes restent utilisables.
« Random 8 » choisit huit IDs uniques et enregistre leur ordre ; aucun tirage au
chargement, à la copie ou à la compilation. « Clear » garde une vraie sélection vide.

La couleur reste indépendante par carte ; le mode de pose n'affecte que Pose Sheet.
Les modes `none`, `neutral`, `ref` et les seize objets sont tous conservés. Aucun
champ de saisie d'arme supplémentaire n'est nécessaire. Tous les remplacements
portent sur les templates intégrés avant toute valeur libre et utilisent une
substitution littérale.

Les cinq Tech Boards gardent leur formatage, y compris les quatre corps en JSON
suivis de `[Scene Description]` : ce sont des prompts texte, pas du JSON à parser
comme configuration. Conserver les marqueurs de référence et de style tels quels
jusqu'à un mapping de références explicite. L'utilisateur peut les modifier dans
le prompt final ; ne pas inventer une référence Asset à partir de `[IMG_1]`.

Les prompts finaux personnalisés sont conservés à la navigation, au reset et dans
les versions de setup. Seul « Recompiler depuis les réglages » les remplace.
Une sélection FACS incomplète bloque cette recompilation, mais pas la copie/envoi
d'un prompt final déjà personnalisé : celui-ci est autonome et envoyé littéralement.

Les contrôles éclairage, multi-référence, accessoires et humain/puppet ciblent des
cartes absentes. Leurs fragments sont conservés dans l'archive de revue ; ne pas
les afficher comme réglages actifs ni les injecter dans les onze cartes. La V5
n'appliquait notamment pas son mode puppet dormant aux Character Sheets actuelles.

## Pont et migration

Une sortie prépare un brouillon image sur action explicite. Les templates
`tech-car` et `master-reference` portent respectivement 3:4 et 4:3. Les neuf autres
ne fixent aucun ratio API ; une grille de panneaux ne définit pas le ratio final.
Pour un prompt final personnalisé, ne pas déduire de ratio d'un ancien template.
Aucun modèle, seed, durée ni résolution imposé. Les images sont choisies dans
l'agrégateur tant que le pont de référence structuré n'est pas disponible.

Adopter des defaults A7 depuis A6 avec sauvegarde, sans écraser les personnalisations
des outils et ateliers précédents. Le nouvel état doit suivre duplication,
versions, restauration et reset selon les contrats existants.

## Vérification sous Sol

L'oracle relit les 22 sorties historiques par défaut/configurées avec égalité
exacte. Les sorties V6 attendues ne divergent que pour Object Sheet et la planche
FACS dans ces deux jeux. D'autres cas couvrent les 19 options, les 44 combinaisons
carte/couleur et huit actions de tête dont les deux variantes deep. Les tests
de compte, doublon et sélection invalide sont nécessaires au compilateur V6.

Vérifier aussi les 49 identités individuellement dans une sélection de huit, le
retrait/réajout en fin de liste, la recherche sans réordonnancement, la persistance
des choix, les prompts finaux avec Unicode, balisage, retours ligne et dollars
littéraux, et l'absence de fragments dormants injectés. Utiliser les textes
approuvés du supplément, pas les templates JavaScript historiques exécutables.

Au navigateur : deux onglets, choix de fond répercuté dans l'aperçu, standard /
mains nues / référence, sélection FACS incomplète puis complète, personnalisation,
reset conservant le texte, réception d'un brouillon image avec ratio approprié.
La revue actuelle ne constitue pas une validation de ce futur runtime.

## Reproduction

`node migration/reviews/record-a7-astra-review.mjs`

`npm run validate:astra-review -- migration/atlas-v5/semantic-review/astra-bundles/a7-character-sheet.json migration/reviews/a7-astra.review.json`

Ces commandes sérialisent les décisions enregistrées ; elles ne relisent ni
n'approuvent automatiquement de nouveaux contenus. La prochaine action est
**go Sol A7**, pour implémenter et tester ce portage.
