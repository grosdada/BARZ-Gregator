# Lot 3B — premiers outils migrés

État : terminé le 11 septembre 2026.

## Outils utilisables

- **BZ Enhancer** dans **Look Library** : 20 recettes relues, trois corrections
  grammaticales validées, générateur de huit angles dans l’ordre canonique et
  quatre niveaux de continuité.
- **Imperfection Engine** dans **Motion Studio** : 43 réglages, dix presets
  intégrés, presets personnels nommables/importables/exportables et compilateur
  conditionnel.

Les chaînes saisies par l’utilisateur sont toujours rendues avec `textContent`.
Les noms contenant une apostrophe, de l’Unicode ou du texte ressemblant à du HTML
ne sont pas interprétés comme du code.

## Setups et versions

Les réglages et presets personnels sont enregistrés côté serveur dans le setup
actif. Une duplication de setup copie cet état sans le partager. Les versions de
setup incluent désormais les configurations d’outils et leur restauration crée
toujours un point de récupération préalable.

Le retour aux réglages intégrés restaure les contrôles Enhancer et Imperfection,
mais conserve les presets Imperfection créés par l’utilisateur.

## Pont agrégateur

Chaque outil possède une action explicite d’envoi vers BARZ Aggregator. L’action
crée uniquement un brouillon via le contrat `POST /api/imports` et ne lance aucune
génération. Imperfection peut être envoyé seul ou ajouté après un prompt principal.

## Vérification

- 23/23 sorties historiques Imperfection reproduites exactement.
- 20/20 cartes Enhancer présentes avec provenance.
- Validation stricte des états, bornes, enums et imports de presets.
- Persistance, duplication, versions, restauration et reset testés.
- Suite complète : **56 tests réussis**.
- Contrôle navigateur : navigation atelier, affichage des deux outils, édition
  littérale, sauvegarde automatique et nom de preset `L'atelier <test>` vérifiés.
