# A12 — brief de revue Astra : Cinema Helper

## Périmètre signé

- source V5 : `Barzy App/public/assets/HTML/meat-dept-prompt-helper-Def.html` ;
- bundle : `a12-cinema-helper`, 1 032 décisions, environ 13 127 tokens ;
- 281 valeurs à haute confiance et 751 atomes issus du triage structurel ;
- fixture : 20 catalogues, 2 848 entrées et trois scénarios de composition locale ;
- BZ Image DNA reste entièrement hors périmètre.

Le bundle signé se trouve dans
`migration/atlas-v5/semantic-review/astra-bundles/a12-cinema-helper.json`.
Le résultat doit être écrit dans
`migration/atlas-v5/semantic-review/astra-reviews/a12-cinema-helper.review.json`.

## Ce qu'Astra doit préserver

1. Les atomes réellement copiables : cadrages, mouvements, focales, caméras,
   éclairages, sujets, objets, décors, actions, jeu, adjectifs, artistes et styles.
2. Les 19 presets de genre, les 16 templates vidéo et les 16 exemples complets.
3. L'ordre d'insertion historique de chaque catalogue. `actions` et `acting` sont
   déjà triés alphabétiquement par le runtime V5.
4. Le deck ordonné `{ item, category, copyText }`, son identité
   `(item, category)`, la copie directe séparée par `, ` et les favoris.
5. Les deux prompts négatifs, sans les mélanger au prompt positif.

Les noms de templates et de genres sont des métadonnées de catalogue : ils ne
doivent pas être injectés automatiquement lorsque leur valeur complète est déjà
sélectionnée. Les sélecteurs CSS, clés de stockage, messages d'état, HTML et
libellés d'interface sont hors prompt.

## Ambiguïtés à trancher

### Composition locale avec pertes

Le compositeur V5 ignore silencieusement `artist`, `artstyle`, `genre` et
`templates`. Astra doit définir un comportement V6 sans perte. La proposition à
valider est : conserver le compositeur historique pour les onze catégories qu'il
comprend ; dès qu'une catégorie non comprise est présente, utiliser la copie
ordonnée et exacte de tous les `copyText` comme fallback local.

### Verbalisation IA

La V5 appelle `/api/ai/refine` sauf si `aiEnabled === false`, donc une
configuration absente déclenche tout de même une requête. La V6 doit rendre
l'action explicite, envoyer les ingrédients ordonnés, n'adopter qu'une réponse
non vide et conserver le prompt local en cas d'erreur ou de réponse périmée.

### Persistance

Le chargement tronque le deck à 80 entrées, mais l'ajout en direct n'a pas de
limite. Astra doit choisir une seule règle visible. Les setups personnels doivent
conserver deck, favoris et ordre ; le retour aux réglages par défaut ne doit pas
effacer silencieusement les setups enregistrés.

### Ponts historiques

Les quatre cibles V5 sont APG, CCP B, BZ DNA Transformer et Video Multi Framing.
Dans Prompt Atlas 6, le pont principal doit mener vers BZ Aggregator. Une cible
interne ne doit être affichée que si l'atelier V6 correspondant existe réellement.
Aucun envoi ne déclenche de génération.

### Artistes et miniatures

Les 866 artistes contiennent des URLs de miniatures distantes. Les noms et genres
sont le contrat sémantique ; les images sont facultatives, chargées paresseusement
et doivent avoir un fallback hors ligne. Elles ne sont jamais une condition de
compilation du prompt.

## Gate

Chaque ID reçoit exactement `preserve`, `correct` ou `exclude-non-prompt`.
Toute correction contient sa valeur et sa justification. Puis exécuter :

```text
npm run validate:astra-review -- migration/atlas-v5/semantic-review/astra-bundles/a12-cinema-helper.json migration/atlas-v5/semantic-review/astra-reviews/a12-cinema-helper.review.json
```

Le runtime Atlas ne doit pas être modifié pendant cette revue.
