# A1 — revue Astra et intégration Sol terminées

Revue du 11 septembre 2026. Les 400 valeurs du paquet A1 ont été lues entièrement,
avec les fonctions historiques de composition et les champs de prompt des fixtures.

## Décisions enregistrées

- 167 valeurs conservées comme prompts, fragments ou valeurs de sélection.
- 5 corrections Beauty : quatre ouvertures de grille éditoriale, et un verbe.
- 228 éléments classés hors prompt (interface, runtime, métadonnées de catalogue).
  **Cette exclusion ne supprime aucune carte, aucun choix, ni aucun badge.**
- 84 champs supplémentaires des fixtures ont été lus et conservés : notamment
  tenues, lieux, options de curseurs et portraits dérivés absents du paquet.

La copie canonique est `a1-astra.review.json`, dans ce dossier, accompagnée de
`a1-astra-supplement.review.json`. Une copie complète remplace le gabarit généré.
La régénération de `semantic-review/` peut effacer cette copie mais pas la canonique.
`record-a1-astra-review.mjs` matérialise les décisions manuelles, uniquement pour
l'empreinte exacte du paquet lu ; il ne réalise pas de revue automatique.

## Corrections approuvées

Les quatre textes commençant par « Ultra-realistic close-up of Editorial 3x3 photo
grid » deviennent « Ultra-realistic editorial 3x3 photo grid ». Le reste reste
identique, y compris les neuf cadrages et la tenue. Leur ancienne ouverture faisait
de la grille elle-même l'objet du gros plan et contredisait son plan mi-corps.

Dans Skin Realism, « real skin stretches, compressions, and shows » devient
« real skin stretches, compresses, and shows ». Aucune normalisation générale de
la casse, du ton ou du vocabulaire n'est approuvée.

Deux corrections de métadonnées sont approuvées pour le portage Realism :
`200MP?12MP` → `200MP → 12MP` (la valeur de prompt indique déjà ce binning), et
`Usure / ge` → `Usure / âge`. Elles ne modifient pas les prompts.

## Ordre d'intégration sous Sol High

1. Porter Beauty : conserver les 7 catégories et 42 entrées des fixtures, appliquer
   les cinq corrections aux textes sources puis produire les variantes portrait
   avec les mêmes transformations (retrait du téléphone, mains au repos, etc.).
   Conserver titres, variantes et ordre ; envoi image vers l'agrégateur.
2. Porter Realism comme recette avec adaptateur léger : 9 onglets, 29 cartes,
   listes de sujet/tenue/pose/lieu/humeur, texte libre et 5 curseurs. Garder les
   valeurs de sujet nommées disponibles dans les sources, sans les confondre avec
   des noms de cartes. Ne pas réduire les listes au contenu du seul paquet A1.
3. Préserver `buildP` : choix personnalisé `_custom`, seuils des curseurs, état
   par défaut (10/30/30/0/30), vieillissement seulement si wear > 10 et ordre des
   sections. Résoudre `$flash`, `$grain`, `$imperf` avant l'envoi. Les textes saisis
   par l'utilisateur restent littéraux ; attention aux substitutions JavaScript `$`.
4. Comparer aux fixtures historiques : Beauty n'accepte que les différences
   approuvées ci-dessus ; Realism reste équivalent, y compris le cas configuré.
   Vérifier aussi les frontières des curseurs et l'isolation entre setups.

La composition permet volontairement des combinaisons de styles non physiques
(flash avec un éclairage existant, faible profondeur de champ et optique fixe,
vieillissement de tirage sur un look numérique). Conserver ces possibilités pour
ce portage. Une éventuelle harmonisation nécessite une décision de produit.

## Limite de couverture à ne pas masquer

Le paquet A1 est revu, mais la classification initiale `context-only` a laissé de
vrais champs hors paquet. Le supplément prouve la revue de 84 champs identifiés
par chemins et empreinte de fixture ; il ne constitue pas une approbation globale
des 6 529 éléments de contexte du corpus. Avant de déclarer les deux propriétaires
entièrement migrés/revus, rapprocher les champs effectivement portés de l'index des
littéraux et traiter les occurrences partagées. Les caractéristiques historiques
des appareils sont conservées comme descriptions de looks ; pas de certification
technique ni de vérification documentaire de leurs spécifications dans cette revue.

A1 a franchi le gate d'équivalence et la suite complète de 88 tests. A2 peut être
relu dans une passe Astra distincte après contrôle du quota ; A3 doit rester
séparé vu son volume.
