# A4 — FACS Sheet Generator + BZ Board : revue terminée

12 septembre 2026 — gpt-6-astra. **Repasser sur Sol High pour le portage.**
La revue et les décisions sont enregistrées ; le runtime reste en 0.9.0/A3.

## Couverture et corrections approuvées

Les 175 valeurs du bundle signé ont été lues intégralement dans leur contexte :
70 conservées, 6 corrigées, 99 classées hors prompt. La fixture A4 complète, les
données et règles de composition des deux sources ont été examinées. 209 valeurs
complémentaires du corpus, omises du bundle car partagées ou classées context-only,
ont été relues dans les plages des catalogues, options et compilateurs :
162 conservées et 47 classées hors prompt. Le supplément limite ces décisions aux
occurrences A4 ; il ne valide pas BZ Sheet ou les autres ateliers partageant un ID.

Fichiers faisant autorité : `a4-astra.review.json` et
`a4-astra-supplement.review.json`. Les empreintes du bundle, de la fixture et du
corpus sont vérifiées par `record-a4-astra-review.mjs`. Les 49 entrées et les
47 choix Board sont conservés ; aucune expression n'est supprimée.

Corrections de texte, index zéro-based du bundle :

| Index | Avant | Après |
| --- | --- | --- |
| 9 | ` cinematic panels, focused on ` | ` cinematic panels. Action / choreography: ` |
| 141 | `head turns toward subject left into a three-quarter view` | `head turns toward the subject's left into a three-quarter view` |
| 144 | `head turns toward subject right into a three-quarter view` | `head turns toward the subject's right into a three-quarter view` |
| 146 | `head tilts toward the subject left shoulder` | `head tilts toward the subject's left shoulder` |
| 161 | `head tilts strongly toward the subject right shoulder` | `head tilts strongly toward the subject's right shoulder` |
| 174 | `head tilts toward the subject right shoulder` | `head tilts toward the subject's right shoulder` |

L'index 9 corrige la composition constatée « focused on crosses a flooded archive ».
Le champ utilisateur reste littéral ; ne pas le conjuguer automatiquement. Les
cinq autres corrections ajoutent le possessif. Conserver le langage télégraphique,
les indications créatives et les régions de visage neutres. Les directions AU61/62
restent explicitement image-left/viewer-left et image-right/viewer-right, tandis
que les mouvements de tête précisent le côté du personnage.

Deux corrections UI : « Langue & machoire » → « Langue & mâchoire » ; le bouton
historique « Download FACS sheet », qui ouvre un fichier local, devient
« Import FACS sheet ». Leur provenance est dans le supplément.

## Architecture décidée

Installer deux outils `kind: builtin` avec adaptateurs dédiés dans l'atelier
existant **Board & Sequence** (`grid-generation`). Leurs titres et placements
restent configurables via Build comme Cinematic Shoot. Ils ne deviennent pas deux
onglets système supplémentaires. Deck, Backstage et Build gardent leurs règles.

Extraire un catalogue FACS déclaratif commun de 49 entrées, avec identité stable,
nom, code affiché, variante et description visible. Une édition du nom ou du texte
ne doit pas changer son identité. Les instructions éditables peuvent utiliser les
overlays de contenu validés ; le découpage d'image et les compilateurs restent
dans des adaptateurs codés. Ne pas représenter les 49 positions d'une planche par
49 recettes indépendantes dont l'ordre dépendrait d'une recherche ou d'un tri.

FACS expose trois résultats : couche de jeu, prompts de portrait séparés, planche
complète. Board garde Story et Motion. Ces sorties doivent toutes être copiables
et pouvoir préparer un brouillon approprié dans l'agrégateur. Les fragments de
raffinement aux index 23, 52, 77 et 114 appartiennent à l'action IA explicite,
pas à une recette supplémentaire. Son raccordement peut être différé si le
fournisseur de raffinement V6 n'est pas prêt ; ne pas afficher un bouton factice.

## Identité FACS et compatibilité

Le catalogue machine est fourni dans le supplément. C'est un vocabulaire de
compatibilité interne à Atlas ; cette revue ne certifie pas une nomenclature
clinique FACS. Utiliser `id` pour sélectionner, sauvegarder et transférer.

| Origine et code historique | ID V6 | Code affiché |
| --- | --- | --- |
| Sheet `AU58` (Head Turn Left), Board `AU51` | `facs-au51` | AU51 |
| Sheet `AU58B` (Head Back), Board `AU58` | `facs-au58` | AU58 |
| Sheet `AU56B` (Head Tilt Right Deep) | `facs-au56-deep` | AU56 (deep) |
| Sheet `AU57B` (Head Forward Deep) | `facs-au57-deep` | AU57 (deep) |
| Autres codes identiques | `facs-` + code minuscule | code d'origine |

Les variantes deep sont des variantes d'Atlas ; ne pas les assimiler à une
intensité clinique B. Board conserve ses 47 choix habituels, et sait afficher,
sélectionner et restituer les deux variantes fortes supplémentaires lorsqu'elles
sont reçues depuis Sheet. Garder l'ordre d'insertion des sélections ; la planche
complète garde les positions 1 à 49 de Sheet. La position 31 devient AU51 et la
position 38 devient AU58, sans échange des images.

Le payload V5 supprime déjà le suffixe B. Un import V6 doit donc tenir compte de
l'origine/schema et, pour un payload ancien, du nom exact : AU58 + Head Turn Left
et AU58 + Head Back ne sont pas interchangeables. Un code seul provenant d'une
source inconnue reste non résolu ; conserver ses données et signaler le conflit.
Conserver les clés historiques de crops avec un mapping explicite : ne pas
renommer en place `AU58.jpg` en écrasant une autre carte. Les anciens pixels et
leurs légendes ne changent pas parce que le catalogue change.

## État et composition

Les données de chaque outil sont propres au setup et à ses versions. Préserver les
prompts édités à la main lors de la navigation et du rechargement ; une recompilation
qui les remplace doit rester une action explicite.

- FACS : sélection ordonnée, recherche, mode acting/board, anchor, framing,
  wardrobe, carte de référence active. Garder les trois valeurs initiales de
  `fixture.facsSheet.defaultText`, le mode acting et la sélection vide.
- Story, ordre visuel : personnage/référence, action, environnement/référence,
  personnages secondaires, caméra, nombre de cases/ratio, style de dessin/notes,
  référence de style/fin, annotations, cues FACS.
- Story par défaut : référence personnage `[IMG_1]`, décor `[IMG_2]`, caméra
  Arthouse handheld, 12 cases, 16:9, rough pencil B&W, annotations actives,
  champs libres et sélection vides. Options : 6/9/12/16 cases ; ratios
  16:9, 9:16, 2.39:1, 1:1, 4:3 ; conserver les cinq caméras et cinq styles.
- Motion : modèle, référence de planche, référence personnage/durée, décor et
  références secondaires, rythme/tenue finale, overrides personnage/secondaires/
  action/décor/caméra, audio, cues. Defaults : seedance, `@[storyboard ref]`,
  `[IMG_1]`, `[IMG_2]`, références secondaires IMG_3 à IMG_6, 15 secondes,
  urgent quick cuts…, tenue finale 1 seconde ; overrides et audio vides.
  Conserver les modèles de texte seedance/kling/veo, durées 5/8/10/15/20 et
  quatre rythmes. Ce sont des choix de composition historiques ; aucune capacité
  ou limite tarifaire actuelle d'API n'a été vérifiée dans cette revue.
- Motion hérite des champs Story quand ses overrides sont vides. Les références
  Motion sont initialement remplies : elles n'héritent donc des références Story
  que si on les efface ou utilise Import from Story. Conserver cette distinction.
- Pour les FACS Motion, rendre `inherit-story` et `custom` explicites : migration
  d'une liste Motion vide vers inherit-story, liste non vide vers custom. Une
  liste custom vide signifie zéro cue ; elle ne doit pas réactiver Story.

Corriger le transfert : il ajoute des cues structurés au destinataire sans
concaténer définitivement un paragraphe FACS dans l'action saisie. Cela évite le
double bloc contradictoire et permet de retirer une expression. Réimporter les
mêmes IDs est idempotent. Les anciens paragraphes saisis/importés restent
littéraux ; ne pas les retirer par regex. Les expressions opposées représentent
des étapes distinctes, pas une obligation de les jouer simultanément.

## Planche complète et images personnelles

La source tronque le prompt à 4 950 caractères ; les témoins finissent par
« past the l... » ou « The resul... ». Supprimer cette coupe et les coupes
420/300/220 des champs dans le compilateur V6. Garder les 49 instructions entières
et la phrase finale. Conserver les normalisations d'espaces existantes, hors
coupes de longueur. Le pont vérifiera les vraies limites du modèle choisi sans
supprimer silencieusement le texte.

Les cartes importées sont des médias avec ID stable, image de planche, crops,
mapping ordonné, cropVersion et provenance. Garder le 7 × 7 et le cadrage utile
(x 9 %, y 2,5 %, largeur 82 %, hauteur 75 % de la cellule ; sortie 360 × 460).
Une importation doit montrer un aperçu du découpage ; pas de rééchantillonnage
automatique des cartes enregistrées au seul motif d'une nouvelle version.

IndexedDB V5 sur le port 3783 n'est pas le stockage V6 sur 4326 : prévoir un
export/import explicite des cartes V5 avec images, IDs et ordre. Les sets/setup
exportés doivent indiquer si les médias sont embarqués ou manquants, jamais
promettre une restauration complète avec un simple ID local. Le reset des réglages
conserve les images personnelles ; leur suppression demande la confirmation
habituelle et ne doit pas se cacher dans le reset d'un atelier.

## Vérification à réaliser sous Sol

La fixture préparée est un témoin partiel. `defaultFullBoardPrompt` utilise des
champs vides dans le stub, contrairement aux textareas initialement remplis dans
le HTML. Capturer les vrais defaults HTML et les 49 sorties unitaires avant de
porter ; conserver les témoins historiques intacts et ajouter des attendus V6.

Tester les trois modes FACS, les 49 identités/positions, les cinq corrections de
description, le mapping source et les variantes fortes. La planche doit rester
complète même avec de longs champs. Vérifier les trois Motion, l'absence de cues,
les annotations désactivées, tous les replis, les références personnalisées,
les champs Unicode/markup/dollar littéraux, et la correction Story de l'index 9.

Tester transfert répété, retrait d'un cue et sélection custom vide. Vérifier
persistance, duplication/version/export/import de setup et médias, migration A3
avec sauvegarde, reset sans perte d'images, et retour vers les defaults. Vérifier
au navigateur copie et brouillons image/vidéo sans génération automatique.
Les autres tests passent avant handoff ; aucune nouvelle génération payante n'est
nécessaire pour la validation fonctionnelle de ces compilateurs locaux.

## Reproduction de l'enregistrement

`node migration/reviews/record-a4-astra-review.mjs`

`npm run validate:astra-review -- migration/atlas-v5/semantic-review/astra-bundles/a4-facs-board.json migration/reviews/a4-astra.review.json`

Ces commandes réenregistrent et valident les décisions figées. Elles ne relisent
pas automatiquement de nouveaux textes et refusent la dérive des entrées.
