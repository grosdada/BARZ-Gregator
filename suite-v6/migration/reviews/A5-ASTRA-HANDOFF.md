# A5 — BZ Camera Suite (VEO Precision) : handoff Astra → Sol

Revue achevée le 12 septembre 2026 par `gpt-6-astra`. **Repasser sur Sol High
pour l'implémentation et les tests.** Le runtime reste en A4 à ce stade.

## Couverture et décisions

Le bundle `a5-veo-precision` porte l'empreinte
`b567221eaa252af043205238fe3b7c45f7d885a74ccad9424ec020936018bafd`.
Les 223 valeurs ont été lues : **93 conservées, 4 corrigées, 126 hors prompt**.
81 valeurs supplémentaires de la même source ont été lues et classées, dont
13 corps de prompts absents du bundle. Les 110 variantes sont ainsi couvertes.

Les exclusions de métadonnées signifient « ne pas concaténer au prompt ». Les
139 valeurs distinctes de noms de familles/cartes/variantes sont conservées dans
leur rôle de catalogue. Les autres exclusions sont des identifiants, messages
d'interface ou morceaux de rendu. Les décisions supplémentaires portent uniquement
sur les occurrences de `veo_precision.html`, même si un ID existe ailleurs.

`a5-astra.review.json` conserve les décisions du bundle. Le supplément
`a5-astra-supplement.review.json` contient les 81 décisions, les 22 cartes et leurs
110 variantes avec IDs stables, textes originaux/corrigés et provenance, ainsi
que les sorties V6 attendues. Le script d'enregistrement fige les empreintes du
bundle, de la fixture et du corpus et refuse leur dérive.

## Corrections approuvées

| Carte / index (0–4) | Avant → après | Motif |
| --- | --- | --- |
| fisheye / 3 | `full 180° sphere` → `180° field of view` | Champ de vision et sphère complète étaient confondus. |
| zoom / 3 | `extreme rapid` → `extremely rapid` | Grammaire. |
| film16mm / 2 | `news reel` → `newsreel` | Orthographe du nom composé. |
| tiltshift / 1 | `extreme shallow` → `extremely shallow` | Grammaire. |

La correction fisheye conserve le cadre circulaire ; la description officielle
[Nikon](https://www.nikon.com/company/news/2017/0531_lens_01/) donne un angle de
180° horizontal et vertical pour le rendu circulaire. Le libellé `News Reel`
devient aussi `Newsreel`. Aucune autre retouche stylistique n'est approuvée.
Les marques, les références de cinéma, les textures datées et les effets
volontairement excessifs restent des instructions esthétiques.

## Modèle de données et placement

Garder l'ID outil `veo-suite` et le titre historique **BZ Camera Suite**, observé
dans le registre V5 et dans la page. `VEO Precision` reste un alias de recherche.
Ajouter une entrée déplaçable dans l'atelier caméra existant : elle reste un outil
avec adaptateur, pas un nouvel onglet système. Deck et Backstage restent fixes.

La donnée est déclarative : 7 sections, 22 cartes identifiées par les clés
historiques, et exactement 5 variantes par carte. Les IDs proposés dans le
supplément sont `veo-suite-{key}-{index}`. Conserver les positions source.
Les intitulés de sections doivent avoir des IDs stables pour que leur renommage
ne casse pas leur état replié. Ne pas utiliser les titres comme clés persistantes.

L'UI doit appeler le sélecteur **Variante**. Dolly passe du travelling avant au
latéral ; Digital Cinema change de famille de caméras ; Static change de style.
Il serait faux de présenter ces positions comme un pourcentage d'intensité.
Le catalogue de base est immuable, les éditions personnelles restent dans les
overlays du setup selon les contrats V6 existants. Les variantes restent du texte
déclaratif : aucune exécution de code fourni par une bibliothèque.

## Compilation et état

Au premier affichage : cartes inactives, index `2` partout, sections repliées,
couche entrante vide. Changer une variante n'active pas la carte. La copie d'une
carte inactive reste possible ; elle copie seulement sa variante courante.

Compiler la couche entrante puis les cartes actives dans l'ordre section/carte
source, indépendamment de l'ordre des clics et de l'état replié. Retenir toutes
les cartes actives même si leurs choix se contredisent : l'utilisateur compose
son rendu. Ne pas ajouter d'exclusivité automatique ni de réécriture.

Le compilateur V5 utilise `join(', ')` sur des phrases déjà terminées par un point,
ce qui produit `impact., tight close-up`. **Écart V6 approuvé : joindre les couches
non vides par un saut de ligne.** Garder chaque corps intact, y compris les
espaces et signes saisis par l'utilisateur. Les attendus configurés du supplément
montrent précisément ce changement ; la fixture V5 reste intacte.

Valider les clés, les booléens et les index entiers 0–4. Une valeur absente d'un
ancien setup reprend `2` ; une mutation invalide doit être refusée, pas arrondie.
Les erreurs ne doivent jamais produire `undefined` dans le texte.

`Clear All` désactive les cartes et vide l'entrée, en conservant les variantes
et les sections repliées, conformément à la V5. Le reset des réglages rétablit
les defaults complets avec le mécanisme de sauvegarde V6. Il conserve les textes
personnels. Faire participer l'état de cet outil aux duplications, versions,
exports/imports et restaurations de setup.

## Ponts

La couche Blocking Studio est une seule chaîne remplaçable, avec sa provenance
en métadonnée séparée. La V5 remplace cette couche à chaque message, elle ne
l'accumule pas. Préserver cette idempotence ; un retrait vide la couche sans
modifier les cartes. Garder l'alias de cible `camera-suite` → `veo-suite`.

La V5 accepte n'importe quel expéditeur de `postMessage`. Réutiliser en V6 un
contrat de réception vérifiant origine, fenêtre source et payload string : le
pont doit être lié à la fenêtre/iframe connue de Blocking Studio. Échapper le
rendu des noms et textes personnalisés. Si le producteur historique ne rejoint
pas encore la V6, documenter cet état et fournir la saisie/copie locale ; ne pas
annoncer un pont validé sur la seule base d'un test de compilation.

Le pont agrégateur prépare un brouillon vidéo avec le texte complet. Cette source
n'a ni modèle API, ni durée, ni résolution, ni références d'images : ne pas les
inventer ni les déduire de mots tels que `4K`, `480i`, `2.39:1` ou `VEO`. Les
réglages du lanceur restent explicites. Aucune action de slider/copie ne lance de
génération.

## Vérification à réaliser sous Sol

- Comparer chaque sortie unitaire aux 110 corps de la fixture, avec seulement les
  quatre corrections approuvées ; comparer le composite à l'attendu V6.
- Vérifier vide, entrée seule, cartes activées en ordre inverse, index 0/4,
  carte inactive modifiée, copie unitaire et Clear All avec conservation des index.
- Vérifier les index invalides, les textes Unicode/HTML/dollars littéraux et les
  longues entrées. Ne pas tronquer silencieusement.
- Vérifier setup isolé, duplication, version, restauration, reset et migration A4
  avec sauvegarde sans écraser les personnalisations existantes.
- Vérifier au navigateur clavier/focus du sélecteur, titres personnalisés rendus
  comme texte, remplacement d'entrée répété et brouillon agrégateur sans dépense.

## Reproduire les décisions

`node migration/reviews/record-a5-astra-review.mjs`

`npm run validate:astra-review -- migration/atlas-v5/semantic-review/astra-bundles/a5-veo-precision.json migration/reviews/a5-astra.review.json`

Ces commandes sérialisent les décisions figées ; elles ne réalisent pas une
nouvelle revue automatique. L'enregistrement vérifie aussi que les 110 corps ont
tous une décision et une provenance source.
