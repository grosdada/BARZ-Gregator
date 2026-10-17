# Lot 3C — BZ Goodies et bibliothèque de prompts

État : terminé le 11 septembre 2026.

## Outil livré

BZ Goodies est disponible dans Look Library avec ses 77 prompts relus et ses
huit catégories. L'interface comprend une recherche globale, une sélection par
catégorie, les détails propres à chaque prompt, l'aperçu compilé, la copie du
prompt courant, les copies groupées sans détails et l'envoi au lanceur image de
BARZ Aggregator.

Le catalogue runtime est autonome dans le package `tool-adapters`. Les fichiers
de revue conservent la provenance de développement sans être requis pour servir
Goodies. L'outil utilise le nouvel identifiant d'adaptateur `prompt-library`,
prévu pour accueillir d'autres banques de prompts.

## Fidélité et corrections

- 77/77 entrées conservent leur ordre, leurs catégories et leur contenu créatif.
- 17 corrections grammaticales relues sont appliquées à 16 entrées.
- Les détails remplacent littéralement les deux marqueurs de scène ; les tokens
  dollar, le HTML apparent, l'Unicode, les espaces et les retours ligne restent
  du texte.
- Les contraintes des sept transformations Fun sont conservées intégralement.
- Les compteurs proviennent du catalogue et affichent 77.
- `Copier sans détails` garde le comportement historique et utilise un message
  de confirmation fidèle à l'action.

## État, reset et pont agrégateur

La catégorie, la recherche, la sélection et les détails par prompt sont validés
et enregistrés dans le setup actif. Duplication, versions et restauration les
embarquent grâce au stockage générique déjà livré. Le reset de Look Library et
le reset global restaurent Goodies avec un point de récupération.

Le pont agrégateur utilise maintenant le `mediaType` de la sortie compilée au
lieu de déduire le média depuis deux IDs historiques. Goodies ouvre donc un
brouillon image. Aucun clic dans Prompt Atlas ne lance de génération payante.

## Vérification

- 39 sorties de référence V5/V6 et 231 compilations de contrôle.
- Tests de catalogue, validation, persistance API, copies groupées et type image.
- Suite V6 complète : **61 tests réussis**.
- Contrôle navigateur réussi : affichage des 77 recettes et des huit catégories,
  recherche globale (`VHS`), navigation intercatégorie, persistance des détails
  par prompt et traitement littéral de `<b>` et `$&`.
- La saisie temporaire utilisée pour ce contrôle a été supprimée du setup actif.
