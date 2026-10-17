# Vérifications de l'étude Acting Lab

16 octobre 2026.

## Périmètre

Les ajouts se limitent au dossier d'étude `research_notes/Acting-Lab-2026-10-16`, à la maquette de conversation dans le répertoire de visualisations de ce chat et à des fichiers de contrôle dans `.codex-temp`. Aucun fichier de l'application, registre d'outils, installateur ou contrat d'import n'a été modifié. Aucun déploiement ni appel de génération d'image ou de vidéo n'a été réalisé.

Les trois interfaces sont des maquettes conceptuelles interactives. Les comportements et textes sont des exemples préparés pour une scène fictive. Elles ne traitent pas une scène libre et ne sont pas raccordées à Prompt Atlas.

## Contrôles effectués

- Lecture des définitions d'Acting Gen et de FACS dans les sources locales, du rendu des familles d'Acting Gen et du contrat de pont vers l'agrégateur. Cette lecture ne vaut pas audit exhaustif de la version installée.
- Consultation de sources primaires sur l'enseignement du jeu, le mouvement, FACS, les limites de l'inférence émotionnelle et les possibilités documentées de Runway. Les liens et les déductions de conception sont séparés dans `CONCEPT.md`.
- Vérification de syntaxe du script de maquette.
- Ouverture du rendu de prévisualisation dans Microsoft Edge en mode automatisé, via Playwright.
- Navigation entre les trois pistes avec le sélecteur réel du carrousel.
- Choix des trois lectures : changement du comportement affiché et du bloc anglais.
- Poignées Argile au clavier et par glissement ; changement de canal visible ; répercussion dans la consigne.
- Sélection des événements de la partition et changement du délai de réponse ; mise à jour des connaissances du personnage et de la consigne.
- Absence de débordement horizontal sur les trois pistes aux largeurs de fenêtre 1100, 800, 390 et 320 pixels. La surface utile de prévisualisation est légèrement plus étroite que la fenêtre.
- Vérification que les poignées restent entièrement dans leur zone aux quatre largeurs.
- Captures des trois pistes, d'une vue mobile et d'une vue sombre ; inspection visuelle des captures.
- Aucune erreur JavaScript de page lors du passage final.

Une poignée coupée sur les petits écrans a été repérée visuellement puis corrigée. Les contrôles finaux ont été rejoués après cette correction. Le résultat automatisé final est conservé dans `verification-result.json`. Le script de contrôle est `.codex-temp/verify-acting-study.cjs`.

## Ce qui reste à valider si le concept est retenu

L'intérêt des gestes d'interface avec un utilisateur, la qualité réelle du jeu produit, l'obéissance de chaque modèle aux consignes, la continuité des personnages et les modalités d'une éventuelle prévisualisation incarnée. Aucune mesure d'efficacité ou d'économie de crédits n'est revendiquée.

Le socle de prompts peut être essayé dès maintenant par copier-coller. Son caractère exploitable comme consigne ne constitue pas une validation de rendu vidéo.
