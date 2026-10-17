# A2 — revue Astra et intégration Sol terminées

Intégration du 11 septembre 2026 : Cinematic Shoot est livré dans **Board &
Sequence** avec ses 41 recettes, les six familles plus All, la carte Gold, les
grilles entières de 2 × 2 à 4 × 4, les modes Puppet/Humain et un état complet par
setup. Le prompt final est éditable ; une version personnalisée reste conservée
jusqu'à l'action explicite « Recompiler depuis les réglages ». Le pont crée un
brouillon image 16:9 dans l'agrégateur sans lancer de génération. Le bouton Iterate
n'est pas exposé tant qu'aucun service V6 vérifié ne le prend en charge.

Validation : 93 tests réussis, incluant les 41 compilations, les caractères de
remplacement JavaScript, le contexte seul, 4 × 2, le mode Humain, la persistance
serveur, le reset global et les migrations depuis Bibliothèques et A1.

Revue du 11 septembre 2026 : lecture complète des 162 valeurs du paquet
`a2-cinematic-shoot`, des 57 littéraux supplémentaires de son inventaire source,
des règles de composition et de l'interface historique. Les 41 corps de recettes
de la fixture correspondent chacun à une décision du paquet. Les 7 entrées de
navigation comprennent **All + 6 familles**, et non sept familles indépendantes.

Sources canoniques : `a2-astra.review.json` et `a2-astra-supplement.review.json`.
Le script `record-a2-astra-review.mjs` sérialise les décisions manuelles et vérifie
les correspondances ; ce n'est pas un classificateur sémantique automatique.
La source V5 et les sorties témoins restent intactes.

## Corrections approuvées

| Emplacement | Avant | Après |
| --- | --- | --- |
| Asian Kitchen, plan 7 | Other cuistots in background | Other cooks in background |
| Consigne figurine | in a reallocation | in a real location |
| Consigne figurine | intentionalnon-realistic | intentional non-realistic |
| Lost Aztec Jungle, plan 7 | Sudden spear trap trap | Sudden spear trap |
| Police / Detective, fidélité | Preserve character farmhouse angles precisely | Preserve the reference character's distinctive angles precisely |
| Titre cinematic-33 | Occult Ritual Ritual | Occult Ritual |
| Titre cinematic-40 | The Abyss Abysses | The Abyss |

Les deux corrections figurine appartiennent à la même entrée : le paquet contient
donc **4 entrées de prompt corrigées**, plus **2 titres corrigés** séparément.
Les exclusions de titres ne les suppriment pas : ils servent à la navigation et
au thème de l'itération. Conserver les 41 IDs, l'ordre, les familles et la carte Gold.

## Contrat de portage Sol — réalisé

Intégrer Cinematic Shoot dans Board & Sequence par défaut, avec un catalogue de
41 recettes et un adaptateur léger pour la composition. Placement modifiable par
Build, comme les autres outils. Copier / Envoyer à l'agrégateur produit un
brouillon image contenant la grille ; aucune génération implicite.

État propre à chaque setup : filtre de famille, recherche, carte sélectionnée,
grille (colonnes et lignes entières entre 2 et 4), mode puppet/human ; par carte,
détails sujet/contexte, tenue de référence pour Gold et éventuel prompt édité.
Conserver les modifications manuelles lors de la navigation entre cartes et
familles. Un changement de paramètres recompilant un prompt édité doit être
explicite pour éviter de perdre les retouches. Sauvegardes, duplication de setup,
versions et retour aux réglages intégrés doivent inclure cet état.

Toutes les sources des prompts référencent parfois IMG_1 ; Gold distingue IMG_1
(identité) d'IMG_2 (pose/lumière et tenue facultative), Car Race peut utiliser une
référence de véhicule. Le portage conserve ces rôles. Ne pas fabriquer d'asset ou
prétendre transférer une référence absente. Raccorder la notation au contrat réel
du pont lorsqu'il peut garantir l'ordre des images.

Le bouton historique Iterate appelle `/api/ai/refine` dans V5. Cette revue conserve
ses deux instructions mais n'implique pas que ce service existe en V6. Préserver
la copie, l'édition locale et l'envoi ; ne présenter Iterate comme opérationnel que
si un endpoint configuré et son retour sont vérifiés. Un coût éventuel doit rester
visible avant l'appel, conformément au fonctionnement de la suite.

## Défauts historiques à traiter explicitement

1. **Substitution du texte utilisateur.** `buildPrompt` applique plusieurs
   `String.replace` successifs avec le texte saisi comme chaîne de remplacement.
   Les séquences dollar peuvent être interprétées, et un mot Subject injecté
   précédemment peut être remplacé à nouveau. Utiliser un remplacement fonctionnel
   en une passe sur les tokens source, sans retraiter le texte injecté. Dans les
   modèles JSON, préserver la clé `subject` ; remplacer ses valeurs prévues.
   Tester dollars, guillemets, retours ligne, mot Subject et référence déjà fournie.

2. **Contexte seul.** `Context: rainy station` devient actuellement aussi le sujet
   quand aucun libellé Subject n'est présent. Si des champs étiquetés sont détectés,
   conserver IMG_1 comme sujet par défaut et affecter Context au contexte uniquement.
   Un texte libre sans libellé garde son rôle historique de description du sujet.

3. **Grilles.** `normalizeGrid` accepte des fractions ; imposer des entiers 2–4.
   Les listes de plans restent à neuf après un passage à 4x2 ou 4x4. Ne pas annoncer
   que neuf plans listés constituent une liste exacte de seize plans. Le compilateur
   peut garder ces listes comme banque de plans et ajouter la règle prioritaire
   ci-dessous, qui couvre aussi l'extension et définit explicitement colonnes/lignes :

   `PROMPT ATLAS GRID OVERRIDE: Output exactly {total} frames arranged in {cols} columns and {rows} rows. Treat the supplied shot list as source beats, not a fixed panel count. If there are more beats than panels, keep the strongest beats in narrative order. If there are fewer beats than panels, add coherent complementary shots consistent with the same character, wardrobe, setting and lighting. Fill every panel and order the final sequence row by row, left to right. No captions, panel labels or overlays.`

   Cette règle est une correction de composition approuvée. La fixture V5 reste
   témoin historique ; les tests V6 doivent distinguer les écarts autorisés.
   Elle demande une adaptation au générateur, sans garantir son obéissance.

4. **État perdu par filtrage.** Les champs de scène et de tenue vivent dans le DOM
   V5 ; `renderSections` le reconstruit. Stocker cet état dans la configuration
   par carte, pour qu'une recherche ou un changement de famille ne le perde pas.

## Choix créatifs conservés et limites

Le mode Human historique retire seulement l'ajout PUPPET MODE ; il ne réécrit pas
les contraintes de fidélité présentes dans chaque recette (weird proportions,
no anatomical correction). Celles-ci peuvent aussi protéger les proportions d'une
personne de référence. Conserver ce comportement dans A2 et expliquer le mode
comme l'ajout/retrait de la consigne figurine. Une réécriture systématique des 41
recettes en anatomie humaine standard changerait leur intention et sort de ce lot.

Certaines recettes demandent des détails diégétiques écrits (texte cyrillique d'un
bouton, code binaire d'un HUD, hiéroglyphes) tout en portant le bandeau général
« No text on image ». Le conflit est signalé ici ; ces détails narratifs sont
conservés. Ne pas supprimer automatiquement les inscriptions, ni affaiblir
globalement la contrainte anti-légendes. Les guillemets JSON suivis du bandeau sont
un format de prompt texte, pas une promesse de JSON valide après composition.

## Validation de l'intégration

- Conserver les 41 recettes, les six familles + All, la carte Gold et ses deux tenues.
- Comparer les sorties V6 aux 41 témoins V5 en isolant les corrections de texte
  ci-dessus, la règle de grille et les réparations de substitution.
- Couvrir 3x3, 4x2, 2x2 et 4x4, modes Human/Puppet, contexte seul, détails libres,
  références et caractères spéciaux sans réinjection.
- Vérifier filtrage/retour à une carte, prompt édité, isolation de deux setups,
  duplication, restauration de version et reset.
- Tester le pont en brouillon et le rendu navigateur sans génération payante.

## Gate modèle — franchi

L'intégration A2 a été réalisée sous **Sol High**. Ne pas ouvrir A3 dans cette passe Astra.
Le rapprochement de 219 littéraux ne couvre que cette source ; les IDs partagés
avec d'autres ateliers ne valent pas approbation de ces autres contextes.
