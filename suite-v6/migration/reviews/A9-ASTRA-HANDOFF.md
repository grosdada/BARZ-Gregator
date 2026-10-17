# A9 — Knolling Board Generator : passage Astra → Sol

Revue terminée le 13 septembre 2026 par `gpt-6-astra`.
**Portage Sol terminé.** Le runtime est livré en 0.15.0/A9 dans Character & Asset Lab.

## Résultat et couverture

53 décisions signées : **15 valeurs conservées, 9 corrigées, 29 hors prompt**.
226 valeurs supplémentaires du corpus, limitées aux occurrences de la source
Knolling : **11 conservées, 3 corrigées, 212 hors prompt**. Les titres, descriptions,
résumés Explorer et identifiants exclus restent disponibles comme métadonnées ;
aucune des 17 cartes n'est supprimée. Les décisions sur les textes partagés
n'autorisent pas la modification des autres ateliers.

Les 19 valeurs `data-zone` n'avaient pas été extraites dans le corpus : elles sont
relues et enregistrées avec leurs lignes source dans `manualSourceValues`.
Les directives Puppet, Lighting, Multi-reference et Full Kit absentes du bundle
exclusif figurent bien au supplément. Les chaînes vides Human, Clothing Only et
Single sont conservées comme sorties vides valides, non comme données manquantes.

Fichiers de livraison :

- `a9-astra.review.json` et sa copie dans `astra-reviews` : décisions et corrections ;
- `a9-astra-supplement.review.json` : catalogue complet, directives, zones et sorties V6 ;
- `record-a9-astra-review.mjs` : enregistrement reproductible, entrées verrouillées par hash ;
- `a9-legacy-fixtures.json` : témoin V5 inchangé.

Les 34 sorties historiques ont été comparées au corps réel du gestionnaire Copy
V5 exécuté dans une VM isolée. Elles sont identiques. Les templates ont également
été comparés aux blocs HTML source. Le supplément contient 34 sorties V6 corrigées
et 64 cas couvrant les modes, chaque zone et les ordres avec/sans corps. Ces contrôles
ne valent pas validation visuelle du futur atelier ou de résultats d'un modèle image.

## Corrections approuvées

Les index du bundle sont à base 1 ; ceux du complément sont à base 0, triés par ID.
Les remplacements exacts et leur raison figurent dans les JSON et le recorder.

| Entrée | Décision |
| --- | --- |
| Bundle 12 — Generate 360 | Préciser horizon/verticales en projection sphérique ; ne pas promettre un HDRI réel sur la seule base d'une image 2:1. |
| Bundle 14, 21, 30, 31 — Tattoo | Corps fourni ou généré explicite ; premier tatouage IMG_2 avec corps, IMG_1 sans corps ; conservation conditionnelle ; zone cachée sans déformation du personnage. |
| Bundle 32 — Location Reconstruct | `A1 ? C2` devient `A1 → C2`. |
| Bundle 33 et 49 — Pano Compact/Free Style | Parenthèses réparées ; HFOV 45° pour huit secteurs ; raccord droit/gauche explicite ; reconstruction prioritaire sur invention ; bâtiment conservé selon sa géométrie plutôt qu'interdiction arbitraire. |
| Bundle 53 — Dress Character | `underwear ? shirt ? jacket` devient `underwear → shirt → jacket`. |
| Complément 91 — Full Kit | Les objets ne doivent pas imposer une nouvelle pose ou prise de main. |
| Complément 132 — Multi-reference | Priorité aux zones documentées ; extrapolation limitée aux régions inconnues ; exception explicite pour le rééclairage demandé par Location Reconstruct. |
| Complément 150 — Original Lighting | Conserver la position des lumières ; les reflets spéculaires suivent le changement de point de vue. |

Les références artistiques, les variantes de matière, les 27 concepts Explorer et
leur ton sont conservés. Les paragraphes TO USE restent dans les prompts hérités.
Les deux cartes panoramiques sont déjà quasi identiques en V5 et leurs corrections
convergent : conserver leurs IDs et leur place ; ne pas inventer une différence de
caméra pour justifier le titre Free Style. Free POV reste la carte à angles libres.

La couverture sphérique 360° × 180° est documentée par le
[manuel Blender](https://archive.blender.org/wiki/2015/index.php/Doc:UK/2.6/Manual/Render/Cycles/Camera/).
Le choix de huit secteurs de 45° vient du découpage demandé par les prompts.
Il reste une instruction de composition, pas une garantie géométrique du modèle.

## Structure V6

Installer le tool ID `knolling` dans le workshop existant `character-lab`
(Character & Asset Lab). Il reste déplaçable et renommable par Build.

Ordre visible : Generate (7), Tattoo (2), Actor (2), Decor (6), malgré l'ordre DOM
différent. IDs et ordre des cartes : ceux de `catalog.tabs` et `catalog.cards`.
Generate conserve son groupe Explorer avec trois sous-onglets : chaque carte
compose UNE image contenant neuf variantes. Aucun composite global, aucun envoi
automatique de neuf générations. Chaque action du pont cible la carte active.

État par setup : onglet, sous-onglet Explorer, réglages du catalogue et prompt final
personnalisé par carte. Contrôles visibles uniquement là où ils agissent :

- Actor : Original/Diffuse pour les deux extractions ;
- Decor : Single/Multi pour les six cartes ;
- Dress Character : Puppet/Human et Clothing Only/Full Kit ;
- Extract Tattoo Board : Board Only/Place It ;
- Tattoo Character : mode corps et zones ordonnées.

Défauts : Generate/var1, Original, Single, Puppet, Clothing Only, Board Only,
corps fourni, aucune zone fixe. Les deux modes vides ne doivent pas recevoir un
texte « human » ou « single » inventé. Les 5 anciennes cibles Character Sheet et
leurs couleurs restent archivées, aucun sélecteur de fond dans cet atelier.

Le compilateur remplace seulement les marqueurs connus des templates intégrés.
Les fragments `${...}` sont une notation d'archive : implémenter leur composition
explicitement, sans eval, Function ou interpolation de code importé. Utiliser des
remplacements par callback afin de garder les dollars littéraux.

Prévisualisation, copie et pont partagent le même prompt final. Un prompt personnalisé
reste littéral et survit au reset, jusqu'à « Recompiler depuis les réglages ».
Valider les enums, clés et types API. Zones : tableau de valeurs canoniques uniques,
maximum 19 ; rejeter les doublons ou valeurs inconnues au lieu de trier/nettoyer.

## Références Tattoo et pont

Choix explicite `tattooBodyMode` :

- `provided-body` : IMG_1 = corps/personnage, IMG_2 et suivants = tatouages ;
- `tattoos-only` : IMG_1 et suivants = tatouages, création d'un corps adulte neutre.

La première zone vise le premier tatouage, la deuxième le deuxième, etc. Une
suppression ou un déplacement volontaire dans la liste met à jour les numéros
visibles avant compilation. Aucun tri automatique par anatomie. Sans zone,
placement automatique avec les mêmes rôles. Avec corps fourni, ne pas changer
pose ou vêtements pour exposer une zone cachée ; demander une référence adaptée
dans l'aide du sélecteur. Le modèle ne doit pas inventer un autre emplacement.

Le résumé de zones V5 utilise toujours IMG_1 : le remplacer par les mêmes indices
que le compilateur. Corriger l'aide Tattoo pour préciser les rôles ; les IDs stables
des assets ne doivent pas être remplacés par les noms ou l'ordre des collections.

Pour Dress Character, IMG_1 reste le personnage et IMG_2 la planche vêtements.
Pour Decor, IMG_1 est la référence primaire ; Multi exploite les références suivantes
du même lieu. Location Reconstruct est conçu pour plusieurs vues : signaler ce
besoin dans son aide, sans inventer des fichiers quand Single est choisi.
Actor exige un acteur indiqué par point rouge : l'utilisateur prépare cette image,
l'adaptateur ne peint pas de point automatiquement.

**Limite constatée du pont actuel** : `tool-workspace.js` envoie `references: []`.
Le brief disait « avec ses références », mais il n'existe pas encore de sélection
d'assets dans cet atelier. Pour A9, conserver le pont image existant et afficher
clairement l'ordre attendu pour compléter le deck dans l'agrégateur. Ne pas annoncer
un transfert de fichiers qui n'a pas lieu. N'attacher des références que si elles
ont été explicitement sélectionnées via un contrat déjà pris en charge ; toute
extension du sélecteur d'assets est un lot distinct. Conserver `[IMG_n]` dans Atlas,
comme A7/A8 ; aucune substitution globale des prompts personnalisés en `@imageN`.
Ne pas attribuer de modèle, ratio, résolution, seed ou coût à partir du texte.

## Vérifications Sol attendues

Comparer les sorties compilées avec les 98 sorties approuvées du supplément.
Vérifier persistance, duplication/version/restauration des setups et reset avec
prompt personnalisé. Tester toutes les zones, les deux modes de corps, le retrait
d'une zone et le changement d'ordre. Vérifier les contrôles hors portée et les
valeurs API invalides. Contrôler visuellement les quatre onglets, l'Explorer, la
copie et un brouillon image dans l'agrégateur, sans lancer de génération.

Ajouter A9 à la migration des defaults avec sauvegarde du setup réel ; ne pas
réécrire les configurations A1–A8. Mettre à jour version, statut et tests après
le portage. Cette revue s'arrête ici pour respecter l'alternance Astra/Sol.
