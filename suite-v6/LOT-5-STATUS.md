# Lot 5 — préparation de la revue exhaustive des prompts

Mise à jour A18 du 1er octobre 2026 : le dernier outil autonome du manifeste
historique, **2D/3D Transfer workflow**, est intégré dans Character & Asset Lab.
Les six cartes de transfert 2D, les générateurs 3D image et vidéo, tous leurs
contrôles et leurs modèles sont conservés. L'état du laboratoire est persistant
par setup, chaque sortie peut être copiée ou envoyée à l'Agrégateur et la palette
cyclorama commune de 12 couleurs remplace l'ancienne palette isolée. Prompt Atlas
passe en 0.25.1 avec les correctifs Paint, médias locaux et Image Slicer sur les defaults `6.0.0-a18.1`.

État au 11 septembre 2026 : préparation mécanique terminée sous Sol High ;
revue Astra A1 terminée (400 entrées et 84 champs complémentaires de fixtures),
puis intégration A1 terminée et vérifiée sous Sol High. 167 valeurs ont été
conservées, 5 corrigées et 228 classées hors prompt mais préservées comme
interface/métadonnées/runtime.
Voir `migration/reviews/A1-ASTRA-HANDOFF.md` et la revue canonique
`migration/reviews/a1-astra.review.json`. La revue Astra A2 est maintenant terminée :
162 décisions, 57 littéraux complémentaires rapprochés et les 41 recettes couvertes.
Quatre entrées de prompt et deux titres comportent des corrections documentées.
L'intégration A2 est maintenant terminée sous Sol High suivant
`migration/reviews/A2-ASTRA-HANDOFF.md`. La revue Astra A3 est terminée :
509 décisions, 435 recettes couvertes dans 34 groupes et 225 littéraux
complémentaires rapprochés. Deux corrections grammaticales seulement ; aucune
recette supprimée. L'intégration A3 est maintenant terminée sous Sol High selon
`migration/reviews/A3-ASTRA-HANDOFF.md`.

Mise à jour du 12 septembre 2026 : revue Astra A4 et portage Sol terminés.
175 décisions : 70 valeurs conservées, 6 corrigées, 99 hors prompt ; 209 valeurs
complémentaires relues dans les deux sources. Le catalogue de compatibilité conserve
49 expressions, corrige le conflit AU58 et distingue les variantes fortes. La
suppression des coupes silencieuses du prompt de planche est approuvée. Voir
`migration/reviews/A4-ASTRA-HANDOFF.md` et les deux revues A4 enregistrées.
Prompt Atlas est en 0.10.0/A4 avec les defaults `6.0.0-a4.1` et migration
sauvegardée depuis A3.

Mise à jour A5 : revue Astra et portage Sol terminés. BZ Camera Suite conserve
les 7 sections, 22 cartes et 110 variantes de VEO Precision, avec les quatre
corrections documentées. L'état initial, l'ordre canonique du composite, la couche
entrante et les personnalisations persistantes sont couverts par les tests.
Prompt Atlas passe en 0.11.0/A5 avec les defaults `6.0.0-a5.1`.

Préparation A6 terminée sous Sol : **Consistent Character Process** est borné à
44 décisions et environ 3 088 tokens. La fixture antérieure à la revue conserve
les quatre étapes, les cinq templates, les modes humain/puppet, les grilles,
l'itération cyclique et l'extraction par code de panneau. Le gabarit Astra signé
est prêt. La revue Astra A6 est maintenant terminée : 22 valeurs conservées,
3 corrigées, 19 hors prompt, plus 51 valeurs complémentaires relues. Le handoff
`migration/reviews/A6-ASTRA-HANDOFF.md` corrige la contradiction grille/image
unique en C et définit les grilles personnalisées. Le portage runtime A6 est
terminé et vérifié sous Sol High.

## Intégration A1 livrée

- **Beauty Studio** : 42 recettes dans 7 catégories, sélection persistante par
  setup, copie et pont vers l'agrégateur ;
- **Realism Forge** : 29 cartes dans 9 familles, célébrité, tenue, pose, lieu,
  humeur et cinq réglages photographiques persistants par carte ;
- les 5 corrections Astra sont appliquées uniquement aux textes approuvés ;
- les 29 sorties Realism par défaut restent strictement équivalentes au moteur V5 ;
- le passage des defaults `6.0.0-libraries.1` à `6.0.0-a1.1` conserve les overlays
  et crée une sauvegarde avant migration ;
- vérification navigateur effectuée sur le setup réel, sans envoi ni génération.

## Intégration A2 livrée

- **Cinematic Shoot** : 41 recettes dans six familles plus All, installé par
  défaut dans Board & Sequence et déplaçable depuis Build ;
- grilles 2 × 2 à 4 × 4, modes Puppet/Humain, recherche, détails et tenue Gold
  persistants par setup et par carte ;
- les prompts personnalisés ne sont remplacés que par l'action explicite
  « Recompiler depuis les réglages » ;
- le pont envoie un brouillon image 16:9 à l'agrégateur sans génération implicite ;
- les quatre corrections de prompt, deux corrections de titre et la règle de
  grille approuvée sont appliquées avec leur provenance ;
- les overlays Bibliothèques et A1 migrent vers `6.0.0-a2.1` avec sauvegarde.

## Intégration A3 livrée

- **Acting Gen** : 435 prompts vidéo dans 34 catégories, regroupées dans les
  familles ACTION (100), EMOTION (80), VFX (95) et DANCE (160) ;
- l'outil est installé dans Motion Studio, déplaçable et renommable depuis Build ;
- ses cartes intégrées peuvent être éditées, dupliquées ou masquées et des cartes
  ou catégories personnelles peuvent être ajoutées ;
- la recherche conserve sa valeur lors de la navigation, avec une portée explicite
  « catégorie active » ou « toute la bibliothèque » ;
- les prompts n'ont aucun champ ou suffixe inventé : la compilation des 435 sorties
  reproduit les fixtures, sauf les deux corrections Astra documentées ;
- le pont envoie un brouillon vidéo à l'agrégateur sans génération implicite ;
- migration du setup réel A2 vers `6.0.0-a3.1` avec sauvegarde automatique ;
- 95 tests passent et la vérification navigateur a couvert Motion Studio, DANCE,
  recherche persistante, édition Build et réception du brouillon vidéo.

## Intégration A4 livrée

- **FACS Sheet Generator** : catalogue partagé de 49 expressions à identité
  stable, sélection ordonnée, trois sorties (jeu, portraits et planche 7 × 7)
  sans coupe silencieuse ;
- import d'une planche personnelle, aperçu selon le cadrage 7 × 7 approuvé,
  export/import JSON avec médias embarqués, IDs et ordre conservés ;
- **BZ Board** : Story et Motion, trois langages de modèle, champs et prompts
  personnalisés persistants, annotations optionnelles et héritage FACS explicite ;
- transfert structuré et idempotent de FACS vers Story ou Motion, y compris une
  sélection Motion personnalisée réellement vide ;
- les planches, prompts et cues survivent à la duplication, aux versions, aux
  sauvegardes et à la restauration ; le reset conserve les médias personnels ;
- le pont transmet le ratio ou la durée exacte et la cible de modèle à
  l'agrégateur, sans génération implicite ; une cible indisponible est signalée ;
- migration des defaults A3 vers `6.0.0-a4.1` avec sauvegarde automatique ;
- 106 tests passent et la vérification navigateur a couvert recherche, sélection,
  transfert, héritage, persistance et réception d'un brouillon vidéo de 15 secondes.

## Intégration A5 livrée

- **BZ Camera Suite** (alias de recherche VEO Precision) rejoint Camera Control ;
- 7 sections repliables, 22 cartes et 5 variantes nommées par carte, toutes
  relues et traçables ;
- activation indépendante de la variante, copie d'une carte inactive et composite
  ordonné selon le catalogue, jamais selon l'ordre des clics ;
- couche entrante unique et remplaçable, toujours placée avant les cartes caméra ;
- prompts personnalisés persistants par setup et conservés par le retour aux
  réglages par défaut ;
- effacement global limité à la sélection et à la couche entrante, sans perdre
  les variantes choisies ni l'état des sections ;
- pont vidéo vers l'agrégateur sans modèle, durée, résolution ni génération
  implicites ;
- migration vers `6.0.0-a5.1` avec sauvegarde automatique ;
- 114 tests passent, dont comparaison des 110 sorties au corpus Astra.

## Résultat reproductible

La commande `npm run prepare:semantic-review` relit le corpus V5 extrait sans
évaluer le code historique et reconstruit :

- `migration/atlas-v5/semantic-review/manifest.json` : volumes et synthèse par outil ;
- `migration/atlas-v5/semantic-review/decision-index.json` : une décision unique
  pour chacun des 13 317 littéraux du corpus ;
- `migration/atlas-v5/semantic-review/packets/*.json` : 23 paquets sans doublon,
  plafonnés à environ 10 000 tokens chacun ;
- `migration/atlas-v5/semantic-review/triage-packets/*.json` : 20 paquets séparés
  qui rendent les valeurs ambiguës relisibles sans les confondre avec la file Astra ;
- `migration/atlas-v5/semantic-review/astra-bundles/*.json` : les lots A1 à A7
  terminés et le lot A8 relu, en attente de portage Sol, sans candidats d'interface ni identifiants
  runtime.

Le corpus BZ Image DNA est exclu à la source et une seconde barrière refuse son
propriétaire et ses deux fichiers connus. Les trois familles déjà revues
(`banana-helper`, `barz-enhancer`, `imperfection`) ne sont pas remises dans la file.

## Volumes

- 2 263 prompts ou fragments à relire par Astra ; environ 119 620 tokens.
- 4 185 éléments ambigus en quarantaine structurelle, environ 32 582 tokens ; ils
  ne sont ni approuvés, ni supprimés, ni envoyés à Astra pour l'instant.
- 6 529 éléments de contexte et 166 fragments manifestement techniques/UI.
- 8 documents de contexte conservés hors paquets.

La quarantaine doit être résolue depuis le corpus et l'index avant de déclarer la
couverture exhaustive. Son rôle est d'éviter de faire payer à Astra des libellés
comme `Copy`, des sélecteurs CSS ou des morceaux d'interface, sans perdre la trace
d'un éventuel fragment de prompt court.

## Ordre de revue recommandé

### Vague A — banques et recettes à rendement immédiat

| Outil | Prompts | Tokens approx. | Décision après Astra |
| --- | ---: | ---: | --- |
| realism-forge | 76 | 2 447 | recette candidate |
| barz-beauty | 31 | 4 363 | recette candidate |
| cinematic-shoot | 94 | 8 013 | banque + adaptateur léger |
| acting-gen | 251 | 12 394 | banque expressions/danse |

Le tableau couvre la file haute confiance : 452 entrées, environ 27 217 tokens.
La quarantaine de ces quatre familles contient encore environ 12 266 tokens utiles
après retrait des seuls candidats d'interface évidents. Pour garder la consommation
prévisible, la vague A est donc divisée ainsi :

1. **A1 — Realism Forge + Beauty** : environ 9 900 tokens avec leur triage ;
2. **A2 — Cinematic Shoot** : environ 8 400 tokens avec son triage ;
3. **A3 — Acting Gen** : environ 21 300 tokens avec son triage, dont un important
   corpus de textes de danse qui ne doit pas être pris pour de l'interface.

A1 est le premier lot Astra conseillé, pas toute la vague A en un seul chargement.

La commande `npm run prepare:a1-fixtures` capture déjà les sorties héritées de ce
premier lot : 42 entrées Beauty réparties dans 7 catégories, ainsi que 29 cartes
Realism Forge dans 9 onglets. Elle enregistre les deux empreintes source, les
sorties par défaut et un cas limite Realism configuré dans
`migration/reviews/a1-legacy-fixtures.json`. Ces fixtures sont antérieures à toute
correction sémantique et serviront de témoin d'équivalence.

Les deux autres lots A sont également prêts mécaniquement :

- `npm run prepare:a2-fixtures` conserve les 41 prompts Cinematic Shoot répartis
  dans 7 familles, les sorties historiques par défaut en grille 3 × 3 et un cas
  configuré 4 × 2 avec sujet, contexte, tenue et mode humain ;
- `npm run prepare:a3-fixtures` conserve 275 entrées Acting Gen dans 26 groupes et
  les 160 prompts de danse externes, dans leurs 8 catégories et leur ordre source.

Chaque paquet Astra porte désormais une empreinte SHA-256 de son contenu. Une revue
ne peut être acceptée par `npm run validate:astra-review -- <bundle> <review>` que
si elle vient de `gpt-6-astra`, correspond exactement à cette empreinte et contient
une décision pour chaque ID. Les actions `correct` et `exclude-non-prompt` exigent
une justification ; une correction exige aussi sa valeur explicite. Une revue
partielle, périmée ou silencieusement modifiée est refusée.

`npm run prepare:astra-review -- a1-realism-beauty` génère le gabarit signé à
compléter dans `migration/atlas-v5/semantic-review/astra-reviews/`. Le protocole
exact se trouve dans `migration/reviews/ASTRA-REVIEW-PROTOCOL.md`.

### Vague B — hybrides bornés

`facs-sheet-generator`, `barzy-board`, `veo-suite`, `cccp`, `barzy-sheet` et
`barz-designer` représentent 300 entrées et environ 19 005 tokens. Le texte peut
devenir déclaratif, mais les planches, grilles, sorties multiples et états restent
derrière leurs adaptateurs tant que les fixtures ne prouvent pas l'équivalence.

Le premier lot de cette vague est prêt mécaniquement : **A4 — FACS Sheet
Generator + BZ Board**, 175 décisions et environ 2 403 tokens. La fixture signée
conserve les deux catalogues, les sorties unitaires, la planche 7 × 7, le payload
inter-ateliers, Story et les trois compilateurs Motion. Elle révèle un conflit
historique de codes (`AU58`) qui doit être tranché explicitement par Astra. Voir
`migration/reviews/A4-ASTRA-REVIEW-BRIEF.md`.

Ce conflit est désormais tranché dans le handoff A4 : identités stables, mapping
dépendant de l'origine, ordre des 49 cellules conservé et variantes deep distinctes.
Le brief reste la trace du périmètre initial ; le handoff contient les décisions.

Le lot suivant est migré : **A5 — VEO Precision**. Sa fixture signée
conserve 7 familles, 22 cartes, leurs 110 intensités, l'état médian initial, l'ordre
du composite et la couche entrante de Blocking Studio. Son bundle contient 223
décisions, environ 3 348 tokens. La revue Astra est terminée : 93 valeurs
conservées, 4 corrigées et 126 hors prompt, plus 81 valeurs source complémentaires
relues. Les 110 variantes sont couvertes. Le portage runtime suit
`migration/reviews/A5-ASTRA-HANDOFF.md` et le titre historique BZ Camera Suite
est conservé. Le brief initial reste disponible.

Le prochain lot est relu : **A6 — Consistent Character Process**.
Son bundle contient 44 décisions, environ 3 088 tokens. Sa fixture capture les
quatre sorties A1/A2/B/C, les cinq templates, la grille par défaut 3 × 3 et un cas
4 × 2, les modes humain/puppet, l'itération Take 3 et l'extraction B2. Voir
`migration/reviews/A6-ASTRA-REVIEW-BRIEF.md` pour le périmètre initial et
`migration/reviews/A6-ASTRA-HANDOFF.md` pour les décisions enregistrées et les
attendus V6. Revenir sur Sol High pour l'implémentation.

Le lot suivant est relu par Astra : **A7 — BZ Sheet**. Il borne les onze
cartes réellement actives, les quatre couleurs, les variantes de Pose Sheet et
la sélection ordonnée de huit unités FACS. Les contrôles hérités sans carte cible
sont conservés dans l'archive. Les 41 décisions et 345 valeurs complémentaires
sont enregistrées. Le portage Sol suit `migration/reviews/A7-ASTRA-HANDOFF.md` ;
le runtime A7 est terminé : BZ Sheet vit dans Character & Asset Lab avec ses
11 cartes, ses deux onglets, ses fonds par carte, ses 19 modes de pose, les
49 identités FACS partagées avec A4 et des prompts finaux personnalisables par
setup. Le pont ne crée qu'un brouillon image et ne lance aucune génération.

Le prochain lot est préparé sous Sol : **A8 — BZ Designer**. Son bundle signé
contient 203 décisions et environ 7 958 tokens. Sa fixture capture les 55 cartes
actives, les cinq sous-onglets Sketch to Image, les quatre niveaux de fidélité et
le choix de couleur Body. Deux ambiguïtés sont réservées à Astra : le défaut Beige
affiché mais non compilé, et les sept anciennes cartes Useful remplacées au runtime.
Voir `migration/reviews/A8-ASTRA-REVIEW-BRIEF.md`. Passer sur Astra High pour la
revue bornée, puis revenir sur Sol avant le portage.

Revue A8 terminée : 97 valeurs conservées, 11 corrigées, 95 hors prompt ;
114 valeurs complémentaires relues et une couleur absente du corpus rapprochée
de la source. Le rendu V5 initialise Beige avant compilation : l'hypothèse de la
fixture était inexacte. Corriger seulement la désynchronisation visuelle des
pastilles après rerendu. Les 55 cartes, archives et attendus sont enregistrés
dans `a8-astra-supplement.review.json`. Suivre `A8-ASTRA-HANDOFF.md` sous Sol High.

Le portage Sol A8 est terminé en runtime 0.14.0 : BZ Designer est installé dans
Character & Asset Lab avec ses 55 cartes actives, ses trois catégories, ses cinq
sous-onglets Sketch, le poids 20–95 appliqué aux seules 40 cartes de style, les
quatre couleurs Body et la scène Wax insérée littéralement. Les prompts finaux
personnalisés persistent par setup et survivent au reset. Les contrôles API sont
validés strictement et le pont ne produit qu'un brouillon image sans génération.

### Vague C — parcours complexes

`cinema-helper`, `knolling`, `multishot`, `seedance` et `workflow-3d` représentent
1 079 entrées et environ 61 181 tokens. Ils doivent être revus avec leurs règles de
composition et leurs sorties, pas comme une simple liste de cartes.

Le premier lot de cette vague est prêt mécaniquement : **A9 — Knolling Board
Generator**. Son bundle signé contient 53 décisions et environ 12 121 tokens.
La fixture verrouille les 4 onglets, 17 cartes, 19 zones de tatouage, les sorties
Explorer 3 × 9 et les cinq familles de réglages ciblés. L'ambiguïté entre image du
corps et références Tattoo doit être tranchée par Astra. Voir
`migration/reviews/A9-ASTRA-REVIEW-BRIEF.md` pour le périmètre initial.
La revue A9 est terminée : 15 valeurs conservées, 9 corrigées, 29 hors prompt ;
226 valeurs complémentaires et 19 zones relues. Le supplément contient le catalogue
et 98 sorties V6 attendues. `A9-ASTRA-HANDOFF.md` résout les rôles Tattoo, les raccords
panoramiques et la limite du pont actuel (prompt seul). Revenir sur Sol High pour
le portage. Le runtime Sol A9 est livré en 0.15.0 dans Character & Asset Lab :
17 cartes, Explorer imbriqué, contrôles ciblés, zones Tattoo ordonnées et sorties
personnalisées par setup. Le pont crée un brouillon image et conserve les balises
`[IMG_n]` ; les références restent à déposer dans le deck de l'agrégateur.

Le lot suivant est préparé sous Sol : **A10 — MD Multishot**. Son bundle signé
contient 154 décisions et environ 14 556 tokens. Sa fixture conserve les trois
onglets, 24 références caméra, 6 séquences, 8 Action Boards, les états Hard Flash
et les compilations 2×2, 2×3, 3×3 et 4×4. Elle expose le conflit historique où
les grilles 2×2 et 4×4 changent l'annonce finale sans réécrire intégralement la
liste de six ou neuf plans. Astra doit définir le contrat V6 cohérent et relire
les valeurs actives selon `migration/reviews/A10-ASTRA-REVIEW-BRIEF.md`.

Revue A10 terminée : 61 valeurs conservées, 15 corrigées, 78 hors prompt et
89 valeurs complémentaires relues. Les 120 sorties historiques concordent avec
les fonctions V5. Les grilles V6 ont désormais un plan explicite de 4 à 16
panneaux ; 162 cas attendus et 24 sorties caméra sont enregistrés. Le défaut
de copie après itération est confirmé. Voir `migration/reviews/A10-ASTRA-HANDOFF.md`
pour les décisions et les limites du service d’itération/pont. **Revenir sur
Sol High** pour l’intégration ; aucun runtime modifié pendant cette revue.

Le lot suivant est préparé sous Sol : **A11 — Seedance Framing**. Son bundle
signé contient 532 décisions et environ 15 907 tokens. Sa fixture conserve les
25 templates, leurs 250 stills et 175 plans mobiles, les trois dialectes de
sortie, les neuf références et les bornes de durée, de plans et de caractères.
Les ambiguïtés de WAN, de répétition au-delà de sept plans et du rôle des images
3 à 9 sont bornées dans `migration/reviews/A11-ASTRA-REVIEW-BRIEF.md`.
Revue Astra A11 terminée : 423 valeurs conservées, 8 corrigées, 101 hors prompt,
plus 148 valeurs complémentaires relues. Les 100 sorties avant limitation sont
confirmées et 190 attendus V6 enregistrés. Le handoff A11 précise les écarts de
la préparation, l'import déterministe, les références, le service IA et le pont.
Le portage Sol A11 est livré en runtime 0.17.0 dans Motion Studio. Il expose les
25 réalisations, les 10 sorties fixes, les trois dialectes mobiles, les neuf
références ordonnées et les finales personnalisées par setup. La compilation est
strictement explicite ; le pont crée un brouillon sans lancer de génération et
reste volontairement limité au prompt. Le service GO ACTION demeure désactivé
tant qu'aucun endpoint IA autorisé n'est raccordé. Les 190 cas Astra et la suite
complète passent, soit 179 tests sur 179.

Le lot suivant est relu par Astra : **A12 — Cinema Helper**. Son bundle signé
contient 1 032 décisions et environ 13 127 tokens : 869 valeurs conservées,
11 corrigées et 152 hors prompt. Les 2 760 valeurs complémentaires de la source
ont également été relues. La fixture verrouille 20 catalogues et 2 848 entrées,
le deck ordonné, les favoris, les deux prompts négatifs, la verbalisation IA et
les quatre ponts historiques. La revue corrige surtout le défaut où le compositeur
local perd silencieusement artistes, styles, genres et templates : la V6 doit
basculer vers une copie lossless. Voir `migration/reviews/A12-ASTRA-HANDOFF.md`.
Le portage Sol A12 est livré en runtime 0.18.0 dans Idea Studio. Cinema Helper
expose les 2 848 entrées source (2 832 ingrédients sélectionnables et 16 exemples),
la recherche transversale, les favoris et un deck ordonné limité uniformément à
80 éléments. L'ordre, les favoris, le texte final et le prompt négatif sont propres
au setup. La composition locale historique est conservée pour ses onze catégories ;
artiste, style, genre, template ou toute catégorie future déclenchent désormais la
copie ordonnée sans perte. Le deck se réordonne au clavier et par glisser-déposer,
les prompts négatifs restent séparés et le pont exige un choix explicite image ou
vidéo avant de créer un brouillon dans BZ Aggregator. La verbalisation IA reste
visible mais désactivée tant qu'aucun service autorisé n'est configuré.
La génération du catalogue est reproductible et la suite complète passe, soit
192 tests sur 192.

Le portage Sol A13 est livré en runtime 0.19.1 : **Image Slicer** rend Backstage
exécutable sans modifier son statut d'onglet fixe. L'outil charge localement une
image PNG, JPEG, WebP ou GIF, affiche une grille de 1 × 1 à 100 × 100 avec
curseurs rapides jusqu'à 20, permet de déplacer chaque séparation, puis encode
les tuiles en PNG, JPEG ou WebP. La destination par défaut reste le dossier de
l'image source (confirmation native au premier export imposée par le navigateur)
et « Parcourir… » permet de choisir un autre dossier. L'écriture est directe et
progressive ; un ZIP unique reste le repli des navigateurs sans accès aux dossiers.
Aucune image ne quitte la machine et aucune API payante n'est appelée. Colonnes,
lignes, format, préfixe et qualité sont persistants par setup. La migration depuis
A12 crée sa sauvegarde et conserve les personnalisations. La suite complète passe
désormais, soit 197 tests sur 197.

Le portage Sol A14 est livré en runtime 0.20.0 : **Paint Studio** rejoint
Backstage avec une refonte complète de l’atelier historique. La nouvelle régie
sépare la barre du document, les outils, le canevas zoomable et l’inspecteur
Calques / Propriétés / Historique. Elle conserve le dessin, la gomme, le texte,
les lignes, flèches et formes, les calques visibles et réordonnables, l’import
d’image, le déplacement, la duplication, les raccourcis et l’export. Elle ajoute
une pipette, le panoramique, un vrai undo/redo borné à 80 états, les dimensions
précises, les exports PNG/JPEG/WebP et un format local `.barzpaint` réouvrable.
Le cadre de sélection n’entre jamais dans l’image exportée. Tous les traitements
restent locaux et aucune génération payante n’est appelée. La migration A13 → A14
crée une sauvegarde et conserve les personnalisations. La suite complète passe,
soit 203 tests sur 203.

Le portage Sol A15 est livré en runtime 0.21.0 : **Image Grabber** rejoint
Backstage sous la forme d’une table de dérushage locale. L’outil importe ou reçoit
une vidéo par glisser-déposer, fournit lecture, scrub, pas précis de ±1 et ±10
images avec FPS réglable, timecode et numéro d’image, puis exporte l’image courante
en PNG, JPEG ou WebP. Une bande de captures permet de conserver plusieurs photogrammes,
de les réexporter ou de les envoyer directement dans Paint Studio. Les raccourcis
Espace, flèches, Maj + flèches et C accélèrent le dérushage. Aucun média ne quitte
la machine et aucune API payante n’est appelée. La migration A14 → A15 crée une
sauvegarde, conserve les personnalisations et installe l’outil dans Backstage.

La passe de finition Paint associée à A15 corrige le chevauchement des contrôles,
rétablit deux palettes réutilisables de six couleurs et ajoute un fond personnalisé
avec sélecteur de couleur, sans retirer Transparent, Noir et Blanc. La suite complète
passe désormais, soit 208 tests sur 208.

Le portage Sol A16 est livré en runtime 0.22.0 : **Image Analyser** rejoint
Backstage après inventaire complet de la version 4.5. Import et glisser-déposer,
Clear, modèle vision, Analyse, Copy, sélecteur de destination et Send to sont tous
conservés. Les ponts A.P.G/Idea Studio, CCP et Video Multi Framing sont actifs,
la décomposition sujet/contexte/style est éditable, et les clés OpenAI, Anthropic
et Google restent dans le backend local. Le correctif A15 ajoute également Clear
à Paint Studio et aux captures d’Image Grabber, ainsi que le menu Send vers Paint
ou BZ Aggregator · Références. La suite complète A16 passe 214 tests sur 214.

Le correctif de parité A17 est livré en runtime 0.23.1 : **Video Director** rejoint
Backstage, comme dans l’application originale, avec ses trois modules **Editor**,
**Analyser** et **Motion Emulator**. L’Editor original complet (chutier, moniteurs,
timeline multipiste, texte, effets, keyframes, sauvegarde/chargement et exports)
et le Motion Emulator hors ligne (pose, depth, 3D, exports et prompt Seedance)
sont restaurés sans retirer de fonctions. L’Analyser V6 conserve import vidéo/audio,
Clear, analyse, exports MP3,
Black MP4 et MP4 en original ou extrait, sélection IN/OUT limitée à 15 secondes,
boucle, photogrammes sélectionnables, ZIP, document d’analyse, récit et paquet
complet. Les sorties Kling 3, Seedance 2, négatif Kling, transcript et breakdown
restent indépendantes et copiables. OpenAI, Anthropic et Google partagent la
gestion locale des clés ; FFmpeg assure le repli d’extraction, la transcription
préparée et tous les exports. Kling et Seedance peuvent créer un brouillon dans
BZ Aggregator sans lancer de génération. Voir
`migration/reviews/A17-VIDEO-DIRECTOR-CONTROLS.md`. La suite complète A17 passe
221 tests sur 221.

La finition visuelle A17.1 est livrée en runtime 0.23.2 : l’Editor et Motion
Emulator partagent désormais la palette sombre de Prompt Atlas V6 (noir,
graphite, acier, signal corail), sans fond blanc ou crème. La structure et toutes
les commandes historiques restent inchangées ; le constructeur de prompt du
Motion Emulator se replie proprement sous les moniteurs lorsque la largeur manque.

### Hors vagues Astra pour le moment

- `shared-shell` : 426 éléments / 11 156 tokens provenant de 19 sources ; Sol doit
  d'abord les réattribuer ou les classer comme infrastructure commune.
- quarantaine structurelle : résoudre les 4 185 décisions ambiguës avant le gate final.

## Gate modèle

Rester sous Sol High pour l'attribution structurelle, les fixtures, l'implémentation
et les tests. Passer à Astra High uniquement pour une vague sémantique bornée, en
commençant par A1. Ne pas charger les 23 paquets en une seule passe.

La migration d'une famille ne passe à `reviewed` qu'après lecture de toutes ses
entrées, décision explicite sur les corrections et conservation de la provenance.

## Validation

- `node --check migration/prepare-semantic-review.mjs`
- `npm test`
- `npm run prepare:a1-fixtures`
- `npm run prepare:a2-fixtures`
- `npm run prepare:a3-fixtures`
- `npm run prepare:a4-fixtures`
- `npm run prepare:a5-fixtures`
- `npm run prepare:a6-fixtures`
- `npm run prepare:a7-fixtures`
- `npm run prepare:a8-fixtures`
- `npm run prepare:a9-fixtures`
- `npm run prepare:a10-fixtures`
- `npm run prepare:a11-fixtures`
- `npm run prepare:a12-fixtures`
- `npm run build:a12-catalog`
- somme des dispositions = 13 317 ; un seul index par ID ; aucun ID dupliqué dans
  les paquets ; aucune occurrence Image DNA dans la file ; exécuter la suite de
  tests courante avant chaque handoff.
