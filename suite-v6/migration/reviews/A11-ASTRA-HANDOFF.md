# A11 — Video Multi Framing / Seedance Framing

Revue Astra terminée le 13 septembre 2026. **Repasser sur Sol High maintenant**
pour le portage. Le runtime reste au jalon A10.

## Résultat signé

- Bundle : 532 décisions, 423 conservées, 8 corrigées, 101 hors prompt.
- Complément source : 148 valeurs lues, 17 conservées et 131 hors prompt.
- Les 680 IDs sont uniques, avec leurs occurrences dans la source.
- 25 templates, cinq catégories, 250 stills et 175 plans mobiles logiques.
  Wes et Coppola réutilisent Standard : 23 banques et 391 textes de plans uniques.
- 100 comparaisons avant limitation identiques aux fonctions historiques.
- 190 cas V6 attendus : catalogue, dialectes, limites, répétitions, références
  trouées et caractères littéraux.

La fixture signée reste inchangée, SHA-256 :
a8702b866bb460d71c56140f47720c6efd208ca8d2e0f4493b9423556d913a99.
Digest canonique du bundle :
b72103ac890de3e662d9f95b7fca27725e104bfb88a560a6ac62e39ab9f73b0c.

## Corrections éditoriales

Huit corrections : recul ouvrant le cadrage, déformation figée plutôt
qu'animation en still, contemplation sans durée de plan pour une photo, sujet
écrasé par le décor plutôt qu'agrandi, puis « ochre », « gold », « Crushing »
et « Tableau vivant ». Les ellipses, synesthésies, changements lumineux et
intentions sont conservés. Ne pas imposer un verrou général de morphologie :
certains styles demandent volontairement une transformation.

Deux corrections de métadonnées : Standard n'interdit plus les personnages ;
Fincher interdit le mouvement de caméra plutôt que toute caméra. Les noms
historiques restent des IDs/libellés de recherche, pas des modèles API.

## Écarts découverts dans la préparation

Les vrais helpers et buildMovingDraftLines ont été exécutés dans une VM isolée.
Les 100 cas figés sont avant la limitation HTML, pas des captures de la copie
finale dans le navigateur. La fixture n'est pas un oracle du rendu HTML limité.

1. Saisir Action direction déclenche GO ACTION après 1 600 ms. Un appel pendant
   une requête programme un nouvel essai après 1 200 ms. Retirer les deux.
2. Un dossier de plus de neuf fichiers est mélangé au hasard puis réduit à neuf ;
   les erreurs de lecture sont ignorées.
3. Le contexte principal vide devient le sujet de la deuxième image.
4. Le compilateur local utilise les deux premières images chargées ; GO ACTION
   transmet bien toutes les images avec leurs vrais numéros.
5. Les remplacements interprètent les dollars et repassent sur les balises
   insérées par l'utilisateur.
6. Le nettoyage temporel produit notamment « over slow » et « 5 degrees/ ».
7. La limite de caractères est dépassable : les labels de 30 plans seuls
   dépassent 300 caractères. Le budget minimum par plan aggrave ce problème.
8. WAN affiche Kling dans son en-tête. Un réglage remplace le résultat IA par
   l'aperçu local et perd le final personnalisé.

## Portage Sol : catalogue et état

Installer seedance dans Motion Studio, titre **Video Multi Framing**, alias
Seedance Framing. Préserver les IDs et l'ordre CORE, SECONDARY, WILD CARDS,
REAL, SIGNATURE. Garder deux modes indépendants :

- Stills : dix prompts image séparés, copie unitaire et copie globale annoncée
  comme liste ; aucune grille inventée.
- Moving : une séquence vidéo, dialectes Kling, Seedance et WAN.

Sauvegarder template, mode, dialecte, durée, nombre, style, action, sujet/contexte
libres, références et finals par setup. Finals indépendants par
template/mode/dialecte et par still. Recompilation explicite ; copie et envoi
utilisent le texte visible sauvegardé. Une carte still renvoyant à Shot 1
rappelle son cadrage initial dans sa sortie individuelle.

## Compilation approuvée

Le script a11-output-oracle.mjs génère les attendus du supplément. Porter son
contrat dans l'adaptateur ; ne pas importer le script de staging au runtime.

- Substitution unique par callback : les dollars, balises et Unicode saisis
  restent littéraux. Rendu via textContent.
- Style vide : source-matched avec référence, sinon neutral cinematic.
- Wes et Coppola utilisent Standard avec leur direction explicite. Les stills
  de Wes excluent les whip pans ; les notes originales restent disponibles en IA.
- Sans image, sujet/contexte libres sont utilisables. Valeurs vides :
  emplacements descriptifs visibles et envoi suspendu.
- Seedance : Cut to sans timecodes. Kling/WAN : Sequence shot N suivi de
  MM:SS.ss-MM:SS.ss, chacun avec le bon libellé.
- Durée entière 1–15, nombre entier 1–30. Chaque frontière est arrondie depuis
  i × durée × 100 / nombre en centièmes ; segments contigus et total exact.
- 1–7 plans : préfixe source. 8–30 : cycle historique annoncé comme répétition,
  avec cycle/sourceBeat. Avertissement de rythme sous 0,5 s par plan, sans
  prétendre définir les capacités d'une API.
- Durées internes remplacées par « across this shot ». Garder les cinq degrés
  du plan concerné ; renvois mobiles Shot 1 = cadrage d'ouverture.

Limiter le texte final entier, séparateurs inclus, entre 300 et 12 000
caractères (longueur JS UTF-16). Ne pas tronquer. Montrer longueur/limite ;
conserver copie exacte ; suspendre l'envoi tant que le final dépasse. Chaque
still possède sa propre limite. Le champ readyToSend de l'oracle vérifie
seulement complétude et longueur ; service et médias sont vérifiés au runtime.

## Références, fichiers et persistance

Neuf slots fixes avec gaps : @image3, @image7, @image9 gardent leurs numéros.
Image, ID et descriptions restent ensemble. Le contexte principal vient du
champ libre, de la première image ou de son tag suivi de « setting », jamais
du sujet secondaire. Lister toutes les références et conserver la coexistence
des deux premières. Les images 3–9 sont listées mais pas mises en scène par le
compilateur local ; l'interface doit le dire.

Import dossier : tri des chemins relatifs déterministe par points de code,
aperçu d'ordre et choix jusqu'à neuf images avant remplacement. Pas de hasard
ou d'écrasement en cas de dépassement. Décoder avant validation atomique et
signaler les erreurs. Remplacement : effacer les anciennes descriptions sauf
choix explicite de les garder. Capturer setup/révision/slot ; ignorer les
lectures devenues périmées.

Réutiliser les conventions de médias A4 : types/tailles validés, duplication,
versions, export et restauration. Reset conserve médias personnels et finals.
Les bibliothèques de prompts ne contiennent pas de data URLs.

## GO ACTION et pont

La V6 n'expose actuellement pas /api/ai/video-direct. Préserver son contrat :
model, model_ai, mode, director, intent, durationSec, shotCount et references
avec ref/description/imageBase64. Afficher l'indisponibilité tant qu'un service
autorisé n'est pas branché et testé. Aucune requête au chargement, à la saisie,
au réglage, à la copie ou à l'import. Ne stocker aucune clé BYOK dans les setups.

Le chemin IA transmet le style du réalisateur mais pas les plans de l'aperçu.
Ne pas promettre qu'il en respecte l'ordre. Une seule requête explicite,
configuration capturée au clic, retours périmés ignorés. Erreur : final précédent
conservé. Valider contenu et longueur ; vérifier durée/nombre si structure
disponible. Sinon, signaler une structure non vérifiée, sans inventer de succès.

Le pont V6 actuel des outils passe references: []. Avant d'annoncer le transfert
d'images, Sol doit l'implémenter et vérifier la réception effective. Sinon,
indiquer le transfert du texte seul et les pièces à joindre. Stills vers image,
séquence vers vidéo. Le dialecte ne sélectionne pas silencieusement un modèle
ou une résolution ; les réglages suivent les capacités réelles du pont.
Aucune génération implicite.

## Validation et reprise

Les décisions sont reproductibles avec :

    node migration/reviews/record-a11-astra-review.mjs
    npm run validate:astra-review -- migration/atlas-v5/semantic-review/astra-bundles/a11-seedance-framing.json migration/atlas-v5/semantic-review/astra-reviews/a11-seedance-framing.review.json
    node --test tests/a11-astra-review.test.js tests/a11-legacy-fixtures.test.js tests/astra-review-contract.test.js

Porter sous **Sol High**, vérifier les 190 attendus, persistance/reset, imports,
résultats tardifs et contenu du brouillon reçu. Deck et Backstage restent fixes.
Revenir sur Astra une fois le prochain lot borné préparé.
