# Imperfection Engine — revue Astra pour V6

Revue du 11 septembre 2026. Contenu relu dans la source, réglages et fonctions
d'assemblage compris. Empreintes, données et fragments conservés dans
[imperfection.review.json](imperfection.review.json). La revue a ensuite été portée
dans la V6 ; l’état de réalisation est décrit dans `LOT-3B-STATUS.md`.

## Résultat et périmètre

- 10 préréglages, 43 valeurs d'état : 2 activations de section, 15 réglages caméra,
  16 réglages personnage et 10 contraintes. Parmi les réglages : 10 curseurs,
  3 menus (8 appareils, 7 activités, 3 directions d'orbite).
- 107 chaînes/templates dans la fonction d'assemblage ont été pris en compte,
  indépendamment du classement heuristique. 17 étaient context-only et absents
  du lot proposé à Astra, dont des contraintes et des consignes de parole.
- Ordre de sortie : `[CAMERA]`, `[SUBJECT]`, `[CONSTRAINTS]`, séparés par deux
  retours ligne. Les contraintes actives survivent à la désactivation des sections.
- Le module fournit des indications de mouvement à combiner avec un sujet/scénario.
  Il ne collecte ni identité du sujet, ni dialogue, ni paramètres de fournisseur.

Les « 1 200 tokens » annoncés correspondaient au texte sélectionné par heuristique.
La revue nécessaire inclut aussi les fonctions, valeurs context-only et données.
Ce chiffre ne permet donc pas de prévoir la consommation d'une revue complète.

## Corrections préparées

Trois corrections d'interface sont enregistrées avec original, remplacement et
localisation : label initial Weight Shift `8-12 sec` → `12-20 sec` pour la valeur 2 ;
`Breath Between Words` → `Breaths Between Sentences`, conforme au prompt émis ;
glyphe de case cochée `?` → `✓`. Aucun texte créatif n'a été réécrit. Ces corrections
doivent être appliquées au portage V6 ; elles ne sont pas visibles dans V5.

Le score de réalisme est une somme arbitraire de paramètres, sans validation sur
des images. Les fixtures confirment 95,5 % par défaut, et encore 95,5 % quand les
deux sections principales sont désactivées. Décision V6 : remplacer ce pourcentage
par des compteurs de réglages/contraintes actifs.

## Vérification

[23 sorties de référence](imperfection.legacy-fixtures.json) ont été capturées :
défaut, les 10 préréglages, caméra seule, personnage seul, contraintes seules,
sortie vide, les 3 directions d'orbite, activités still/exhausted/puppet_henson,
minimum et maximum des curseurs avec interrupteurs désactivés/activés.

Seules les deux fonctions relues de composition/statistiques ont été exécutées
dans un contexte isolé avec DOM simulé ; aucune application ni API n'a été lancée.
L'empreinte source a été contrôlée, les sorties ne contiennent pas `undefined`,
la sortie vide et les phrases de contraintes/parole/stop-motion ont été vérifiées.
Ces références préparent la comparaison V6 ; elles ne valident pas encore son code.
Les transitions successives entre presets et les interactions navigateur restent
à tester pendant le portage.

## Passage à Sol High : intégration des deux familles relues

1. Intégrer les 20 cartes fixes de BZ Enhancer à partir de sa revue, en gardant
   les originaux/provenances et en appliquant ses trois corrections grammaticales.
2. Garder les angles Enhancer et Imperfection comme adaptateurs codés avec options
   et préréglages en données. Le compilateur V6 actuel fait des substitutions ;
   il ne sait pas exprimer tous ces tests, tableaux et assemblages conditionnels.
3. Porter la composition Imperfection à l'identique et comparer aux 23 références.
   Conserver le sens de zero/off, l'ordre des phrases, les espaces et les contraintes
   dans le prompt principal. La mention de 12 fps reste une consigne textuelle.
4. Initialiser toute l'interface depuis l'état validé. Écouter `change` sur les
   cases plutôt que les basculer manuellement depuis leurs labels. Valider clic,
   clavier et absence de double bascule dans le navigateur.
5. Afficher les noms de presets par `textContent`, avec événements attachés en
   code : l'ancien nom entre dans `innerHTML` et dans du JavaScript entre apostrophes.
   Tester un nom comme `L'atelier`, Unicode et texte ressemblant à du HTML.
6. Valider les imports (types, bornes, enums et structure) avant écriture. Fournir
   une récupération si le stockage est invalide. Conserver l'import historique
   `imperfection_engine_presets.json`, un dictionnaire nom → état.
7. Sauver les presets et réglages dans le setup V6 actif avec IDs stables ; le nom
   est modifiable. Inclure leur état dans les versions de setup. Restaurer les
   defaults ne supprime pas les créations de l'utilisateur.
8. Préserver le comportement historique : preset intégré = remplacement caméra/
   personnage, sections et contraintes conservées ; preset utilisateur partiel =
   fusion des propriétés présentes. Tester les transitions depuis un état modifié.
9. Raccorder l'envoi explicite à l'agrégateur avec choix ajouter/remplacer le prompt.
   Conserver la possibilité de modifier les contraintes parfois contradictoires
   avec les presets marionnettes, stop-motion ou appareils fixes.

Ce portage concret est maintenant terminé : 23/23 sorties historiques sont
identiques, les réglages et presets vivent dans le setup actif, et les versions
de setup les restaurent avec le registre.
