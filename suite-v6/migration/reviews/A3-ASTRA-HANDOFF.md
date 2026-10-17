# A3 — Acting Gen : revue Astra terminée, intégration Sol à faire

Date : 11 septembre 2026. Relecteur : gpt-6-astra.
Ce document autorise le portage du corpus A3 décrit ci-dessous, pas une nouvelle
réécriture créative ni une génération payante. L'application reste en 0.8.0/A2.
**Passer sur Sol High avant l'implémentation.** Aucun reset de quota consommé.

## Périmètre réellement lu et décisions

Les 509 valeurs du bundle A3 ont été lues intégralement, ainsi que les titres,
corps et regroupements des 435 recettes de la fixture. Le fonctionnement du
script historique et les 225 littéraux complémentaires des deux inventaires
ont aussi été examinés. Le supplément rapproche les 734 littéraux des sources.
Cette revue ne valide pas d'autres ateliers partageant un identifiant de texte.

- 275 entrées Acting : ACTION 100, EMOTION 80, VFX 95, dans 26 groupes ;
- 160 danses comiques dans 8 catégories supplémentaires ;
- total : 435 recettes, 34 groupes, quatre grandes sections ;
- bundle : 437 valeurs conservées (433 corps + 4 fragments d'itération),
  2 corps corrigés, 70 éléments classés hors prompt ;
- aucune suppression de recette, de titre ou de catégorie.

Les index ci-dessous sont les index zéro-based du bundle fixé par SHA-256.

| Recette | Index | Correction unique |
| --- | --- | --- |
| RECURSIVE LOOP | 290 | `unescapable` → `inescapable` |
| DUPLICATION ARTIFACT | 422 | `motion blur taken literal` → `motion blur taken literally` |

Les phrases nominales, mouvements irréalistes, transformations, duplications,
effets désynchronisés et gags physiques sont intentionnels : ne pas les lisser.
Le titre « Irish Reel Reel » est conservé, sa répétition pouvant être volontaire.
Les descriptions sportives sont des directions créatives, pas des instructions
techniques certifiées. Ne pas leur ajouter des corrections biomécaniques.
« MORPH ADN BIOLOGIQUE » est une recette de transformation visuelle : elle ne
fait pas partie du corpus **BZ Image DNA**, qui reste exclu de la migration.

## Portage recommandé : bibliothèque modulaire

Réutiliser le moteur `prompt-library`, avec un adaptateur de données Acting
distinct de `libraryFromGoodiesCatalog` (celui-ci impose des détails et une
sortie image). Le moteur générique accepte déjà les recettes sans champ scene.

- Installer `acting-gen` par défaut dans Motion Studio, déplaçable et renommable
  via Build ; Deck et Backstage restent fixes.
- Conserver les 34 groupes avec des identifiants préfixés par section.
  `action-dance` (10 chorégraphies) ne doit pas fusionner avec la section
  `dance` (160 routines comiques).
- Les identifiants suggérés et l'ordre source de chaque entrée sont consignés
  dans `a3-astra-supplement.review.json`. Ne pas dériver un ID du titre modifiable
  ou de la position dans une liste filtrée.
- Dans l'interface, afficher ACTION / EMOTION / VFX / DANCE puis leurs catégories,
  ou un sélecteur groupé compact. La clé historique `sfx` signifie ici VFX,
  pas un atelier de son. Ne pas afficher 34 onglets débordants.
- Le contrat de bibliothèque actuel est plat : réutiliser ses catégories.
  Si une hiérarchie devient nécessaire, étendre explicitement le contrat et ses
  tests, sans injecter de propriétés non validées. Une présentation groupée
  dérivée des catégories suffit pour ce lot.
- Conserver les titres, descriptions des catégories de danse, ordre et provenance.
  Respecter la personnalisation existante des bibliothèques dans Build.

## Composition et pont

La sortie historique est **le corps du prompt, seul**. Aucun champ sujet, format,
durée, seed ou référence n'était composé dans la source.

- Recettes avec `fields: []`, `mediaType: "video"`, `settings: {}` et
  `referenceSlots: []` ; pas de suffixe esthétique automatique.
- Ne pas transformer les mots « subject », « person » ou « object » en variables.
  Ils font partie du texte ; certaines recettes ont plusieurs protagonistes.
- Vérifier par compilation l'égalité littérale des 435 sorties avec la fixture,
  sauf les deux valeurs corrigées explicitement ci-dessus.
- Ne pas injecter de contrainte globale anti-morphing, anti-glitch ou anti-texte :
  elle contredirait plusieurs effets. Le no-text lu appartient seulement au
  fragment d'itération optionnelle.
- Copier et envoyer un brouillon vidéo dans l'agrégateur, **sans génération**.
  Ne pas écraser ses paramètres ou ses références par des valeurs inventées.

## État, personnalisation et défauts historiques à éviter

La configuration générique contient déjà activeCategory, searchQuery,
selectedEntryId et detailsByPrompt. Ne pas ajouter de détails inutiles pour ces
recettes sans variables. Les éditions de recette peuvent utiliser les overlays
existants ; toute extension de configuration doit être validée et migrée.

- Conserver recherche et sélection par setup ; appliquer la recherche de façon
  cohérente après un changement de catégorie. La V5 laissait le champ rempli
  tout en réaffichant une liste non filtrée.
- Préserver le texte personnalisé lors d'un changement d'onglet, d'une recherche,
  d'un rechargement et d'une duplication de setup. La V5 perdait les itérations
  en réaffichant le DOM.
- Le retour aux defaults est explicite, avec avertissement et mécanisme de
  sauvegarde existant. Ne pas écraser les overlays des autres bibliothèques.
- Utiliser textContent et des listeners, pas les templates HTML/onclick V5
  interpolant le texte. Tester apostrophes, guillemets, chevrons et esperluettes.
- Charger les données revues, pas le HTML historique des danses via fetch et
  DOMParser. Les titres de compatibilité Seedance/Kling sont des libellés
  historiques, pas des capacités fournisseur vérifiées.

## Itération IA : fragments conservés, activation différée

Les quatre fragments aux index 153, 211, 355 et 467 conservent l'intention
originale : variation du même thème, sujet et jeu, nouveaux gestes, caméra et
lumière, réponse limitée au prompt. Ils ne sont pas quatre recettes de plus.

L'ancienne requête `/api/ai/refine` envoyait `outputType: "image"` malgré les
prompts vidéo et utilisait `result.refined` pour modifier seulement le DOM.
Ne pas recopier cette incohérence. Ne pas rendre opérationnel un bouton Iterate
sans fournisseur explicitement configuré, validation et persistance du résultat.
Ce raccordement n'est pas nécessaire au portage A3 et ne justifie aucune dépense.

## Vérification exigée sous Sol

1. 435 IDs uniques, 34 catégories, répartition 100/80/95/160 et ordre source.
2. Compilation exhaustive égale aux fixtures, avec seulement les deux corrections.
3. Aucune inclusion de texte UI, fragment d'itération ou corpus BZ Image DNA.
4. Recherche/navigation, copie et brouillon vidéo sans génération implicite.
5. Édition, ajout, masquage et renommage via Build ; personnalisation conservée
   après navigation, rechargement, export/import et duplication de setup.
6. Migration des defaults A2 vers A3 avec sauvegarde, sans perte des setups,
   overlays A1/A2, ateliers custom et bibliothèques déjà installées.
7. Test navigateur d'une action, émotion, transformation et danse ; contrôler
   les caractères spéciaux et une catégorie vide après filtrage.
8. Tests de non-régression existants, puis rapport et lien de l'application.

## Reproduction de la revue (ne relit pas sémantiquement de nouvelles sources)

`node migration/reviews/record-a3-astra-review.mjs`

`npm run validate:astra-review -- migration/atlas-v5/semantic-review/astra-bundles/a3-acting-gen.json migration/reviews/a3-astra.review.json`

Le sérialiseur fige les empreintes du bundle, de la fixture et des inventaires,
vérifie la couverture exclusive des décisions et rapproche chaque corps par
égalité exacte. Toute dérive exige une nouvelle revue, pas une approbation
automatique. Les données canoniques sont écrites aussi dans
`migration/atlas-v5/semantic-review/astra-reviews/a3-acting-gen.review.json`.
