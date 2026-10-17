# A4 — FACS Sheet Generator + BZ Board : brief de revue Astra

Date : 11 septembre 2026. Préparation : Sol High. Ce document borne la prochaine
passe Astra ; il n'autorise ni implémentation, ni génération payante, ni réécriture
créative d'un autre atelier. **Passer sur Astra High pour la revue, puis revenir
sur Sol High avant tout portage.** Aucun reset de quota ne doit être consommé.

## Périmètre signé

- bundle : `a4-facs-board`, 175 décisions, environ 2 403 tokens ;
- haute confiance : 56 valeurs ; triage utile : 119 valeurs ;
- propriétaires exclusifs : `facs-sheet-generator` et `barzy-board` ;
- SHA-256 du bundle :
  `c56499d141b9c30bb61e0a94aa8dd1219d2caea34d0328e06b6e54be9fe2759d` ;
- fixture antérieure à la revue : `a4-legacy-fixtures.json`, avec empreinte de
  chaque source, 49 unités FACS, 47 unités Board, prompts par unité, prompt de
  planche 7 × 7, payload FACS, sortie Story et sorties Motion Seedance/Kling/Veo.

Le fichier à lire est
`migration/atlas-v5/semantic-review/astra-bundles/a4-facs-board.json`. Le gabarit
signé à compléter est
`migration/atlas-v5/semantic-review/astra-reviews/a4-facs-board.review.json`.

## Mission Astra

Lire les 175 valeurs intégralement et produire une décision explicite pour chaque
ID : `preserve`, `correct` avec texte et raison, ou `exclude-non-prompt` avec
raison. Conserver l'anglais original sauf faute réelle. Les morceaux de templates
concaténés peuvent rester des fragments utiles ; les identifiants DOM, clés de
stockage, noms de handlers, libellés purement UI et messages d'état doivent être
classés hors prompt, jamais supprimés des sources.

En parallèle, lire la fixture complète et rendre un avis architectural bref sur :

1. la frontière entre bibliothèque déclarative FACS et adaptateurs codés de
   génération de planche, crop, persistance locale et Story → Motion ;
2. les corrections textuelles réellement nécessaires dans les sorties témoins ;
3. la stratégie de compatibilité des codes FACS ci-dessous, sans modifier la V5 ;
4. les champs qui doivent rester configurables, leur ordre et leurs valeurs de
   repli ;
5. les garde-fous pour conserver à l'identique les prompts compilés, hors
   corrections approuvées.

## Incohérence FACS à trancher explicitement

Les deux sources historiques ne partagent pas le même vocabulaire :

- FACS Sheet : 49 entrées ; BZ Board : 47 entrées ; 46 codes communs ;
- Sheet seulement : `AU56B`, `AU57B`, `AU58B` ;
- Board seulement : `AU51` (`Head Turn Left`) ;
- conflit : `AU58` signifie `Head Turn Left` dans Sheet mais `Head Back` dans
  Board ; Sheet utilise `AU58B` pour `Head Back`.

Astra doit recommander un mapping canonique V6, avec alias de migration si utile,
qui empêche une indication envoyée depuis Sheet de changer de sens dans Board.
La décision doit préserver la traçabilité vers chaque code historique ; aucun
renommage silencieux n'est acceptable.

## Contraintes de portage à respecter dans l'avis

- FACS Sheet fabrique des instructions de jeu, des prompts d'images unitaires,
  une planche complète 7 × 7 et un payload vers Story ou Motion.
- Les cartes FACS personnelles, leurs crops et leur image source sont un état
  utilisateur ; elles ne sont pas une banque de prompts par défaut.
- BZ Board compile une sortie Story puis trois variantes Motion selon le modèle.
  Le Motion hérite des champs Story laissés vides et des FACS Story seulement si
  aucun FACS Motion n'est sélectionné.
- Le raffinement GPT est une action explicite séparée. Il ne doit jamais modifier
  silencieusement une recette ou appeler un modèle pendant une simple navigation.
- Le futur pont vers l'agrégateur prépare un brouillon ; il ne lance aucune
  génération et ne doit pas inventer de références.
- Deck et Backstage restent fixes. Astra doit préciser si ces deux hybrides sont
  des ateliers déplaçables de Build avec adaptateurs, ou des outils codés fixes,
  en justifiant la frontière plutôt qu'en aplatissant toute leur logique.

## Validation après la revue

La revue doit être validée avec :

`npm run validate:astra-review -- migration/atlas-v5/semantic-review/astra-bundles/a4-facs-board.json migration/atlas-v5/semantic-review/astra-reviews/a4-facs-board.review.json`

Avant de repasser sur Sol, créer un handoff qui résume les compteurs, toutes les
corrections, le mapping FACS choisi et l'architecture recommandée. Sol réalisera
ensuite le portage, les migrations de setup, les tests d'égalité et la vérification
navigateur.
