# A8 — BZ Designer : passage Astra → Sol

Revue terminée le 12 septembre 2026 par `gpt-6-astra`.
**Portage Sol terminé.** Le runtime est livré en 0.14.0/A8 dans Character & Asset Lab.

## Résultat vérifiable

Le bundle signé `a8-bz-designer` contient 203 décisions : **97 valeurs conservées,
11 corrigées, 95 hors prompt**. Les 114 littéraux complémentaires attribués à
cette source ont aussi été lus : **16 conservés, 98 hors prompt**. Les exclusions
concernent l'interface ou le code, pas des cartes à supprimer. Elles ne valident
pas les autres propriétaires d'un littéral partagé.

Fichiers de référence :

- `a8-astra.review.json` : revue canonique avec originaux, corrections, raisons
  et occurrences ; copie dans le répertoire `astra-reviews` généré ;
- `a8-astra-supplement.review.json` : catalogue de 55 cartes relues, archive de
  10 variantes Useful, décisions complémentaires, règles de composition et sorties ;
- `record-a8-astra-review.mjs` : enregistrement reproductible des décisions
  explicites, contrôlé par les empreintes de source, corpus et fixture ;
- `a8-legacy-fixtures.json` : témoin historique conservé inchangé.

Le SHA-256 source correspond à la fixture. Les 55 cartes sont rattachées aux
littéraux relus. Les 40 styles sont chacun recomposés exactement depuis le template
commun et leurs deux fragments. Les 110 sorties de la fixture (55 par défaut,
55 configurées) ont été comparées au compilateur de référence. Le supplément
contient les sorties V6 approuvées, quatre couleurs, les empreintes des 640 sorties
de styles aux 16 poids possibles et un cas de saisie avec HTML, dollars et sauts
de ligne. Il s'agit de contrôles de composition ; le navigateur et la persistance
du futur runtime restent à vérifier sous Sol.

## Rectification de la préparation

Le brief supposait que Beige était seulement visuel. La ligne 290 de la source
contredit cette hypothèse : `renderSections()` initialise `selectedColors[id]`
avec la première couleur avant de compiler les cartes. **Le vrai défaut V5 est
donc Beige #B3A089.** La fixture a sauté cette initialisation DOM : son état par
défaut est un état intermédiaire antérieur au rendu. Son indicateur
`visuallyActiveColorIsNotCompiledUntilClicked` est une interprétation erronée.
Ne pas l'utiliser comme exigence V6 et ne pas réécrire le témoin signé.

Le bug confirmé est différent : le rendu des pastilles force toujours la première
en `active`, même si une autre couleur est mémorisée. Un rerendu après un changement
de sous-onglet peut donc afficher Beige alors que le prompt utilise toujours Pink.
La V6 doit déterminer l'état visuel depuis la couleur mémorisée.

Autre lacune mécanique : `#515973` n'est pas dans le corpus des littéraux, alors
qu'il est présent ligne 89 de la source et dans la fixture. Il est conservé avec
cette provenance dans `manualSourceValues` du supplément. Les quatre couleurs
sont donc couvertes.

## Corrections approuvées

Les remplacements exacts figurent dans chaque décision, sans correction globale
des textes importés ou personnalisés.

| Index du bundle | Carte / variante | Modification |
| --- | --- | --- |
| 5 | Ancien Preserve Weird Design, archivé | Espaces manquantes, `in a reallocation` → `on location`, `a L.A` → `an L.A`. |
| 7 | Pixel-Perfect Design Replica | Article manquant et séparation de `Goal:`. |
| 8 | Ron Mueck Sculpture Style | Articles manquants, espace avant Ron supprimée, `subtil textured` → `subtly textured`. |
| 31 | Wax Figurine | `like 35 mm photo` → `like a 35 mm photo`. |
| 58 | Body Draw Line | `weird proportion` → `weird proportions`, paire de guillemets accidentelle retirée. |
| 108 | Puppet Integration actif | `The character skin` → `The character's skin`. |
| 120 | Photorealistic Conversion | `sillustration` → `illustration`. |
| 157 | Preserve Weird Design actif | `in a reallocation` → `on location`. |
| 170 | Puppeteer Convert | `sillustration`, mots collés, `reallocation`, `IMG_ 1` et début de phrase `Apply`. |
| 192 | B&W Body Convert | `modify any way` → `modify it in any way`. |
| 200 | High-Fidelity Macro Conversion | Article ajouté devant `80 mm macro photo`. |

Dix de ces entrées sont actives, une est une ancienne variante archivée. Les
instructions de fidélité, proportions caricaturales, style, éclairage et absence
de texte restent conservées. Le code couleur explicite `#404135` de Body Ref/Line
reste conservé malgré son nom approximatif : ne pas le remplacer par une autre
couleur sur la seule base de l'adjectif. Les titres de cartes restent des
métadonnées et gardent leurs identités.

## Contrat de portage

Installer `barz-designer` dans **Character & Asset Lab**, déplaçable et renommable
depuis Build. Préserver les IDs des cartes de la fixture, leur ordre et leurs
trois catégories : Sketch (49), Body (3), Useful (3). Sketch comporte Photo (9),
Clay, Manga, Comics et Kids (10 chacune). Une carte correspond à une sortie image ;
aucun composite global.

Sélection initiale : Sketch / Photo, cartes repliées. Mémoriser par setup la
catégorie, le sous-onglet, le poids global Sketch, la couleur de `body-1`, le champ
de scène de Wax Figurine et les prompts finaux par carte. Pour Body, fournir
Beige #B3A089, Blue #515973, Pink #DE7C68, White #F2ECCA. Reset : Beige, poids 55,
Sketch / Photo ; garder les prompts finaux personnalisés selon le contrat A7.

Le curseur Original Drawing Weight est entier, de 20 à 95 par pas de 5. Il
s'applique uniquement aux 40 cartes Clay/Manga/Comics/Kids. Le masquer sur Photo,
Body et Useful où il ne change aucun texte. Préserver les quatre libellés :
20–40 `style-led reinterpretation`, 45–60 `balanced style freedom`, 65–80
`source-led style transfer`, 85–95 `strict source fidelity`. Ce pourcentage est
une instruction dans le prompt ; ne pas le transformer en paramètre du modèle.
Refuser les valeurs API invalides, fractionnaires ou hors pas plutôt que les borner.

Wax Figurine reçoit un champ facultatif `scene`, vide par défaut, à la place de
son `[Scene Description]`. Les autres cartes actives ne contiennent ni
`[DESCRIBE YOUR NEW SUBJECT HERE]` ni `[Details]` : ne pas ajouter deux contrôles
sans cible. Garder le nettoyage historique du template intégré, puis insérer le
texte utilisateur littéralement. Les doubles espaces, dollars, HTML et marqueurs
écrits par l'utilisateur ne doivent pas être nettoyés.

Conserver `[IMG_1]`, `[IMG_2]` et les marqueurs scène/style de Puppet Integration
dans le texte initial. L'utilisateur peut les ajuster dans le prompt final. La
normalisation de `[IMG_ 1]` concerne uniquement la faute exacte de Puppeteer
Convert. Ne pas attribuer automatiquement des fichiers aux références, ni
effectuer de substitution globale sur les prompts personnalisés.

Le catalogue expose des textes et réglages ; le compilateur est une fonction
déterministe limitée aux placeholders reconnus. Utiliser la composition et les
sorties approuvées du supplément, sans évaluer le code V5. Prévisualisation, copie
et pont partagent le même résultat final. Un prompt final personnalisé reste
littéral jusqu'à « Recompiler depuis les réglages », même après un reset.

Le pont prépare explicitement un seul brouillon image, sans modèle, ratio,
résolution ou IDs d'assets inférés. La migration vers les prochains defaults
crée une sauvegarde et conserve les overlays, noms et emplacements personnalisés.
Deck et Backstage restent fixes.

## Archive Useful

Conserver les sept anciennes cartes comme archive relue : Character Design Sheet,
3D Action Figure, Character Combat, Pet as Human, Realistic Origami, Food Explosion,
Multiple Image Fusion. Conserver aussi les trois variantes antérieures de Preserve
Weird Design, Puppet Integration et Pencil Line Drawing pour leur provenance.
Les trois versions finales sont les seules actives. L'archive peut alimenter une
future bibliothèque explicite ; elle ne crée pas dix cartes supplémentaires.

## Vérification attendue sous Sol

Comparer les 55 sorties initiales et configurées aux attendus, les quatre couleurs
et les 16 poids. Vérifier le retour d'onglet après Pink, la fidélité masquée sur
Photo, la saisie littérale de la scène, les prompts personnalisés, les erreurs API,
la persistance après rechargement, la duplication/version/restauration d'un setup
et le reset. Vérifier la migration sauvegardée et un brouillon image reçu dans
l'agrégateur, sans lancement de génération. Terminer par le contrôle navigateur.
