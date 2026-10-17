# Revue Astra — pilote BZ Enhancer

Date : 11 septembre 2026. Ce dossier est séparé des extractions régénérables
`../atlas-v5/`. Il contient du contenu relu en staging, pas une application déployée.

Deuxième famille relue : [Imperfection Engine](imperfection.md), avec inventaire
des réglages, corrections d'interface et 23 sorties de référence pour le portage.
Les trois familles sont désormais intégrées et testées dans la V6. La troisième,
[BZ Goodies](banana-goodies.md), a été relue par Astra puis portée par Sol :
77 entrées, 17 corrections grammaticales et 39 cas de référence V5/V6 dans un
composant de bibliothèque réutilisable par les ateliers Build.

## Résultat

Lecture des contenus et de la composition dans `md_enhancer.html` (lignes 655–1003),
avec inspection du comportement partagé de `barzy-theme.js`. Les empreintes sont
conservées dans `barz-enhancer.review.json`.

- 20 cartes fixes : 11 Enhancement, 3 Z-Depth, 3 Normal Map, 3 GI/AO.
- 8 angles actifs ; case centrale REF non sélectionnable.
- 4 modes de préservation, dont None = préfixe vide ; les 3 préfixes non vides
  finissent par une espace significative.
- Sujet libre, valeur de repli, suffixe commun, blocs étiquetés et séparateurs
  inventoriés. L'ordre est celui de la grille, pas l'ordre des clics.
- Pas d'appel IA ni de stockage métier dans ce module. Le script de thème gère
  notamment des réglages localStorage et une normalisation des textes affichés.

Le JSON contient les textes originaux, les textes corrigés, leurs localisations
et les raisons des corrections. Trois cartes contiennent la même petite faute :
`No text on image.` devient `No text on the image.`. Aucun changement créatif,
aucun changement de V5 ni des données utilisateur. Ces corrections ne sont pas
encore visibles dans l'application en service.

## Anomalies confirmées puis réparées dans l'extraction 3A

Les 20 cartes étaient présentes à l'identique dans le corpus. Mais les 8 valeurs
`data-prompt` (lignes 754–762) et les 3 chaînes des handlers `setPrefix` (770–772)
manquent, y compris parmi les valeurs context-only. Le pilote contient ces textes
réintégrés manuellement pour le pilote. Le corpus régénéré les contient désormais
avec leur provenance. Les heuristiques confondent encore certains labels et
templates HTML avec des prompts : « likely-prompt » ne signifie pas « recette ».

Le scanner lit désormais `data-prompt` et les chaînes des événements inline sans
les exécuter. Il conserve séparément valeur décodée et fragment brut. Le scanner
JavaScript ignore les regex et gère les templates imbriqués. Le texte HTML visible
reste compacté pour la revue, avec sa forme brute attachée à l'occurrence. Les
instructions du serveur et ses huit documents Markdown sont maintenant inclus.
Cela améliore la couverture mécanique sans prouver la couverture sémantique.

## Points de portage à préserver ou corriger

1. **Sujet interprété comme HTML** : `renderAnglePrompts`, lignes 960–968, insère
   `fullPrompt` dans `innerHTML` sans échappement. Un sujet `<b>test</b>` est rendu
   comme balisage alors que Copy All conserve le texte brut. Utiliser des nœuds DOM
   avec `textContent` en V6 ; ne pas reproduire ce comportement.
2. Le thème peut compacter les espaces et remplacer du texte dans l'aperçu ;
   Copy All compose directement depuis le champ. Tester l'égalité aperçu/copie,
   notamment Unicode, retours ligne, doubles espaces et texte ressemblant à du HTML.
3. Conserver les sorties multiples. Une sélection de trois angles n'est pas une
   unique recette fusionnée. L'envoi à l'agrégateur est une action explicite.
4. None conserve le suffixe commun ; il ne désactive pas toute préservation.
   Scene Lock + changement d'angle peut être contradictoire : noter ce choix
   historique, sans changer silencieusement le sens du prompt.
5. La carte Photo Enhancement autorise de recadrer/supprimer des détails ; ne pas
   lui imposer les contraintes des cartes de préservation.
6. Conserver l'avertissement expérimental des render passes. Ne pas promettre
   un export technique calibré à partir de ces prompts génératifs.
7. Garder `[Scene Description]`, `[Image1]`, etc. tant qu'un mapping explicite vers
   les entrées V6 et les références de l'agrégateur n'a pas été défini.

## Réparation Sol High achevée

Travail effectué avant d'envoyer une autre famille à Astra :

- extraction des `data-prompt` et chaînes de handlers avec brut/décodé séparés ;
- fixtures pour entités HTML, regex, templates imbriqués et continuation CRLF ;
- ajout du serveur et de ses documents d'instructions comme sources attribuées ;
- régénération en staging, contrôles d'exclusion, puis remplacement du corpus ;
- conservation de la revue BZ Enhancer hors du dossier généré.

Le scanner reste statique et heuristique : il ne remplace pas un parseur complet
ni la comparaison de sorties V5/V6. Tout futur cas ambigu doit rejoindre les fixtures.

La couverture sémantique de ce pilote est relue ; les fixtures de comparaison et
la migration runtime sont maintenant terminées pour BZ Enhancer, Imperfection
et BZ Goodies.
Les tests d'intégrité de ce dossier restent distincts des contrôles navigateur.

## Lot A4 préparé

`npm run prepare:a4-fixtures` capture sans exécuter l'application historique les
49 unités de FACS Sheet Generator, les 47 unités de BZ Board, leurs compilateurs
et le contrat de passage Story/Motion. Le bundle signé `a4-facs-board` contient
175 décisions (environ 2 403 tokens de valeurs seules). La revue Astra est terminée :
70 valeurs conservées, 6 corrigées, 99 hors prompt, plus 209 valeurs complémentaires
relues. Les décisions et le portage recommandé sont dans `A4-ASTRA-HANDOFF.md` ;
le périmètre initial reste dans `A4-ASTRA-REVIEW-BRIEF.md`. Repasser sur Sol High.

## Budget modèle

Les chiffres de quota ne sont pas figés dans ce document afin d'éviter une
indication périmée. La règle de travail reste la même : Astra pour une revue
sémantique ou architecturale bornée, puis Sol pour l'implémentation et les tests.
Le solde courant doit être vérifié dans Codex avant chaque bascule.

## Lot A5 préparé

`npm run prepare:a5-fixtures` capture sans exécuter l'application historique les
7 familles, 22 cartes et 110 variantes de VEO Precision. La fixture verrouille
aussi le niveau médian par défaut, les familles repliées, l'ordre de composition
et la couche reçue de Blocking Studio. Le bundle signé contient 223 décisions,
environ 3 348 tokens. La revue Astra est terminée : 93 valeurs conservées,
4 corrigées et 126 hors prompt ; 81 valeurs supplémentaires relues assurent
la couverture des 110 variantes. Les métadonnées exclues du prompt restent
dans le catalogue. `A5-ASTRA-HANDOFF.md` précise le portage, le sélecteur de
variantes et la correction du séparateur composite. Repasser sur Sol High.
Le périmètre initial reste dans `A5-ASTRA-REVIEW-BRIEF.md`.

## Lot A6 préparé

`npm run prepare:a6-fixtures` conserve les quatre étapes de Consistent Character
Process, les cinq templates, les modes humain/puppet, les adaptations de grille,
les variations d'itération et l'extraction par code de panneau. Le bundle signé
`a6-consistent-character-process` contient 44 décisions, environ 3 088 tokens.
La revue Astra est terminée : 22 valeurs conservées, 3 corrigées, 19 hors prompt,
plus 51 valeurs supplémentaires relues. Le périmètre initial reste dans
`A6-ASTRA-REVIEW-BRIEF.md`. Les décisions et les sorties attendues sont dans
`A6-ASTRA-HANDOFF.md` et `a6-astra-supplement.review.json`. Revenir sur Sol High
pour le portage runtime.

## Lot A7 préparé

`npm run prepare:a7-fixtures` capture les 11 cartes actives de BZ Sheet dans ses
deux onglets, les couleurs par carte, les modes de Pose Sheet, le catalogue FACS
et l'ordre des huit expressions sélectionnées. Les anciens contrôles dont les
cibles ne sont plus présentes sont identifiés comme dormants au lieu d'être
réintroduits silencieusement. Le bundle signé contient 41 décisions, environ
5 696 tokens de valeurs dans le bundle. La revue Astra est terminée : 20 valeurs
conservées, 2 corrigées, 19 hors prompt ; 345 valeurs supplémentaires de la source
sont relues (175 conservées, 2 corrigées, 168 hors prompt). Le handoff
`A7-ASTRA-HANDOFF.md` définit les fonds, les poses mains nues, les identités FACS
et la validation des huit sélections. Le runtime Sol est livré en 0.13.0/A7 dans
Character & Asset Lab, avec migration sauvegardée du setup réel et tests du pont
en mode brouillon uniquement. Le périmètre initial reste dans
`A7-ASTRA-REVIEW-BRIEF.md`.

## Lot A9 préparé

`npm run prepare:a9-fixtures` capture Knolling Board Generator sans l'exécuter :
4 onglets, 17 cartes, 19 zones corporelles et toutes les branches des réglages
Lighting, Multi-reference, Accessory, Subject et Tattoo. La fixture conserve les
sorties par défaut et un cas configuré couvrant chaque branche. Le bundle signé
`a9-knolling-board` contient 53 décisions, environ 12 121 tokens. Le périmètre et
les ambiguïtés de références sont dans `A9-ASTRA-REVIEW-BRIEF.md`. La revue Astra
est terminée : 15 valeurs conservées, 9 corrigées, 29 hors prompt ; 226 valeurs
complémentaires et 19 zones source relues. Les 34 sorties historiques concordent
avec le vrai gestionnaire Copy V5. Le supplément livre 98 sorties V6 attendues.
Voir `A9-ASTRA-HANDOFF.md` pour le contrat du portage.
Le portage Sol est livré en runtime 0.15.0/A9 dans Character & Asset Lab. Il
installe les 17 cartes, les trois variantes Explorer imbriquées, les contrôles
limités à leurs cartes, les 19 zones ordonnées et les deux conventions de
références Tattoo. Les prompts personnalisés persistent et survivent au reset.

## Lot A10 préparé

`npm run prepare:a10-fixtures` capture MD Multishot sans exécuter l'application
historique : 3 onglets, 24 références caméra, 6 séquences et 8 Action Boards.
La fixture verrouille les sorties 2×2, 2×3, 3×3 et 4×4, les deux états Hard Flash
et le générateur Multi-Angle jusqu'à 16 panneaux. Le bundle signé
`a10-multishot` contient 154 décisions, environ 14 556 tokens. Le périmètre,
l'incohérence historique des grilles adaptées et le contrat de handoff attendu
sont dans `A10-ASTRA-REVIEW-BRIEF.md`. La revue Astra est terminée : 61 valeurs
conservées, 15 corrigées, 78 hors prompt, plus 89 valeurs complémentaires relues.
120 comparaisons confirment la fixture historique. Le supplément livre 162 cas
V6 et les 24 sorties caméra. `A10-ASTRA-HANDOFF.md` fixe les grilles cohérentes,
la copie du texte visible et les limites actuelles de l’itération et du pont.
Revenir sur **Sol High** pour le portage.

## Lot A11 préparé

`npm run prepare:a11-fixtures` capture Seedance Framing sans exécuter
l’application historique : 25 templates dans 5 catégories, 10 stills et 7 plans
mobiles par template, 9 références ordonnées, les trois dialectes Seedance/Kling/WAN
et les modes GO ACTION. Le bundle signé `a11-seedance-framing` contient 532
décisions, environ 15 907 tokens. La fixture verrouille les sorties des 25
templates pour les quatre chemins de compilation et expose le libellé WAN erroné,
la répétition cyclique au-delà de sept plans et le rôle incomplet des références
3 à 9. Revue Astra terminée : 423 valeurs conservées, 8 corrigées, 101 hors
prompt et 148 valeurs complémentaires relues. Les 100 sorties avant limitation
concordent ; 190 attendus V6 sont enregistrés. Les défauts de saisie déclenchant
l'IA et d'import aléatoire sont documentés dans `A11-ASTRA-HANDOFF.md`.
Le portage Sol est livré en 0.17.0/A11 dans Motion Studio : 25 réalisations,
10 sorties fixes indépendantes, trois dialectes vidéo, timecodes exacts, neuf
références ordonnées et finales persistantes par setup. Les imports sont
déterministes et atomiques. Le pont reste prompt-only et GO ACTION est
explicitement indisponible sans service autorisé. Les 190 cas attendus Astra et
la suite complète passent (179/179).

## Lot A8 préparé

`npm run prepare:a8-fixtures` capture BZ Designer tel qu'il s'exécute réellement :
3 catégories, 55 cartes et les 5 sous-onglets Sketch to Image. La fixture verrouille
le curseur Original drawing weight, ses quatre libellés, les sorties par défaut et
configurées, le choix de couleur ainsi que le nettoyage historique de trois marqueurs.
Elle expose sans la corriger la couleur Beige visuellement active mais non compilée,
et distingue les 3 raccourcis Useful actifs des 7 anciennes cartes remplacées au
runtime. Le bundle signé `a8-bz-designer` contient 203 décisions, environ 7 958
tokens. Le périmètre de revue est dans `A8-ASTRA-REVIEW-BRIEF.md`. Passer sur
**Sol High** maintenant : la revue Astra est terminée (97 valeurs conservées,
11 corrigées, 95 hors prompt ; 114 valeurs complémentaires relues). Voir
`A8-ASTRA-HANDOFF.md` et `a8-astra-supplement.review.json`. La lecture du rendu V5
a rectifié l'hypothèse de préparation : Beige est initialisé avant compilation.
Le défaut réel est le témoin visuel qui peut revenir sur Beige après un rerendu.
La fixture signée reste inchangée ; les attendus corrigés figurent au supplément.
Le portage Sol est livré en 0.14.0/A8 dans Character & Asset Lab : 55 cartes,
trois catégories, cinq sous-onglets Sketch, poids borné, couleurs persistantes,
scène Wax littérale et sorties personnalisées par setup. Le pont crée uniquement
un brouillon image sans modèle ni paramètres de génération déduits.

## Lot A12 préparé

`npm run prepare:a12-fixtures` capture Cinema Helper : 20 catalogues, 2 848
entrées, deck ordonné, favoris, compositeur local, verbalisation IA, prompts
négatifs et ponts historiques. Le bundle signé `a12-cinema-helper` contient
1 032 décisions, environ 13 127 tokens. Revue Astra terminée : 869 valeurs
conservées, 11 corrigées, 152 hors prompt, plus 2 760 valeurs complémentaires
relues. Le compositeur V5 perd quatre catégories ; le handoff impose une copie
lossless dès qu'artiste, style, genre ou template est présent. Voir
`A12-ASTRA-HANDOFF.md`. Repasser sur **Sol High** pour le portage.
Le portage Sol est livré en 0.18.0/A12 dans Idea Studio : 2 832 ingrédients
sélectionnables, 16 exemples de templates, recherche transversale, favoris et
deck ordonné limité à 80 éléments, tous persistants par setup. Le compositeur
historique reste exact pour ses onze catégories et bascule vers la copie ordonnée
sans perte dès qu'une catégorie non prise en charge est présente. Les prompts
négatifs sont séparés, le média du brouillon Aggregator est explicite et la
verbalisation IA reste désactivée sans service autorisé. La suite complète passe
(192/192).

## Lot A13 livré sans revue Astra

Image Slicer est un utilitaire local et non une banque sémantique : ses fragments
extraits sont des libellés, dimensions, noms de fichiers et états de progression.
Le portage Sol 0.19.0 l'installe donc directement dans Backstage. La grille reste
ajustable, les réglages sont persistants par setup et toutes les tuiles sont
regroupées dans un ZIP stocké sans compression. Aucun fichier n'est envoyé à un
service distant. Migration A12 → A13 et archive ZIP sont couvertes ; la suite
complète passe (196/196).
