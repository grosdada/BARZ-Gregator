# Migration V6 — couverture et critères de sortie

## Sources inspectées

Atlas : `E:\Fable 5-Project\Meat Journey`, notamment `package.json`, `electron/main.mjs`, `server.js`, `public/js/app.js`, `public/js/aggregator-bridge.js` et `Barzy App/prompt Atlas V2/app.js`. Sources HTML enregistrées : `Barzy App/public/assets/HTML/`.

Agrégateur : `E:\Codex-Proj\Barz-Gregator`, notamment `server.js`, `src/storage.js`, `src/secret-vault.js`, `public/generation-plan.js` et le contrat d'import existant.

Versions observées : Atlas package 5.2.3, lockfile encore 5.1.2 ; agrégateur 0.25.0. Ne pas résoudre cette incohérence de lockfile par une mise à jour globale de dépendances pendant la migration.

Le script `scripts/audit-atlas-v6.mjs` fournit une extraction heuristique reproductible du registre, de ses chemins et empreintes, sans évaluer son code. Il ne recense pas toutes les dépendances transitives ni toutes les chaînes de prompts : aucune promesse de couverture exhaustive sur cette seule base.

## Inventaire des adaptateurs à conserver

Classification initiale, à confirmer par extraction des entrées/sorties avant conversion. « Candidat recette » ne signifie pas qu'on peut supprimer son code sans tests.

| ID existant | Outil | Stratégie initiale |
| --- | --- | --- |
| prompt-forge | A.P.G | Adaptateur existant du pont ; IA de rédaction conservée |
| image-analyzer | Image Analyzer | Un seul outil canonique, résoudre les deux entrées du registre |
| soul-prompts | BZ Image DNA | Corpus exclu ; enveloppe de packs uniquement |
| realism-forge | BZ Realism Forge v2 | Candidat recette, après inventaire des options |
| barz-beauty | BZ Beauty | Candidat recette |
| barz-enhancer | BZ Enhancer | Candidat recette |
| barz-designer | BZ Designer | Générateur hybride, adaptateur puis décision |
| cccp | CCP | Grilles et sortie texte : conserver les deux |
| cinematic-shoot | Cinematic Shoot | Grilles et prompts, adaptateur |
| banana-helper | BZ Goodies | Candidat banque/recettes |
| workflow-3d | 2D/3D Transfer workflow | Parcours spécialisé, adaptateur |
| knolling | Knolling Board Generator | Générateur/visuels, adaptateur |
| barzy-sheet | BZ Sheet | Générateur/visuels, adaptateur |
| multishot | BZ Multishot | Sorties multiples ; pas d'aplatissement automatique |
| cinema-helper | Simple Prompt Builder | Assembleur et IA ; couverture combinatoire requise |
| veo-suite | BZ Camera Suite | Réglages/syntaxes caméra, adaptateur |
| seedance | Video Multi Framing | Cadres, références et variantes fournisseur |
| barzy-board | BZ Board | Storyboard et fonctions IA, outil codé |
| facs-sheet-generator | FACS Sheet Generator | Prompts ET planches/cartes persistées, outil hybride |
| acting-gen | Acting Gen | Expressions/acting et corpus danse à inventorier |
| imperfection | Imperfection Engine | Paramètres et composition, candidat recette partiel |
| image-slicer | Image Slicer | Outil codé Backstage |
| paint-studio | Paint Studio | Outil codé Backstage, optimisation séparée |
| image-graber | Image Graber | Outil codé Backstage, conserver l'ID historique |
| video-analyzer | Video Director | Analyse, montage et Motion Emulator à préserver |
| blocking-studio | Blocking Studio | Outil 3D codé Backstage |

Les catégories par défaut restent Deck, Idea Studio, Look Library, Character & Asset Lab, Board & Sequence, Motion Studio, Camera Control et Backstage ; Build devient le neuvième onglet. Une banque n'est pas un atelier : conserver cette distinction dans les formulaires et la migration.

## Revue exhaustive des prompts : gate obligatoire

Demandée par l'utilisateur, elle reste à réaliser. Sol peut préparer les extractions et fixtures ; **Astra relit les prompts par familles**, hors BZ Image DNA, avant validation de la migration des familles concernées. Ne pas charger des mégafichiers bruts répétitivement : préparer une extraction sans doublons avec pointeurs vers toutes leurs utilisations.

Pour chaque outil non exclu, le registre de couverture contient : chemins des fichiers et dépendances, empreintes, localisation des chaînes, textes système IA, templates/variables, options, règles de composition, sorties multiples, stockages et statut de revue. Inclure les données chargées par script/JSON externe et les bibliothèques embarquées de contenu, pas seulement le HTML enregistré.

États : `inventoried` → `extracted` → `reviewed` → `fixture-verified` → `migrated`. Une valeur par défaut identique ne valide pas toutes les variantes. La revue complète doit distinguer couverture du contenu (tous les textes lus) et couverture des combinaisons (tests représentatifs avec limites connues).

Comparer les sorties héritées et V6 sur fixtures : valeurs par défaut, choix limites, texte Unicode/multiligne, variables vides, combinaisons des options, multi-sorties, durées, ratios et références. Pour le hasard, contrôler la source aléatoire ; pour les réponses LLM, rejouer des fixtures enregistrées plutôt que faire des appels payants pour chaque test. Toute différence de prompt est expliquée et approuvée, pas normalisée silencieusement.

## Migration des données : recette de vérification

1. Recenser les données serveur et les stockages par profil/origine navigateur ; inclure fichiers locaux, cartes FACS IndexedDB, projets d'outils, favoris et réglages. Montrer ce qui manque.
2. Exporter en copie avec manifeste et empreintes ; ne jamais mettre les clés en clair dans le rapport ou une archive de prompts.
3. Importer en staging V6, valider les schémas et références, préserver les IDs ou fournir une table explicite d'équivalence.
4. Comparer les nombres d'éléments et les fichiers, puis ouvrir des projets représentatifs. Tester caractères accentués et chemins Windows longs/avec espaces.
5. Activer la copie seulement après validation ; garder le snapshot préimport et V5 utilisable. Une seconde importation du même export ne crée pas de doublons.

Cas de recette : déplacer une image de collection ne casse pas un set ; image supprimée = missing et miniature conservée ; restauration defaults n'affecte pas les assets ; deux médias homonymes restent distincts ; média distant indisponible annoncé ; interruption d'import récupérable ; coffre inutilisable signalé sans perdre les autres données.

Cas setups : créer deux setups avec des ordres et recettes différents ; relancer et retrouver le setup actif ; basculer sans mélange ; créer deux versions d'un setup et restaurer la première sans supprimer la seconde ; dupliquer et renommer ; refuser la suppression du dernier setup ; restaurer après échec d'écriture ; mettre à jour les defaults dans un setup sans modifier les autres. Vérifier qu'aucune clé, média, dépense ou projet lourd n'est copié dans les paquets de setup.

## Paint Studio : intervention Astra ciblée, pas réécriture aveugle

Le code possède déjà un ordonnanceur `requestAnimationFrame`, du lissage et la prise en compte des événements pointeur coalescés. Ajouter simplement un RAF n'est donc pas une solution à démontrer.

Pistes observées à mesurer : rendu complet de la scène, travail sur les masques/points, conversions `toDataURL`, historique en mémoire. `snapshotPaint()` clone superficiellement certains objets ; vérifier les alias de points/masques et la couverture des calques dans undo/redo avant de qualifier un bug de confirmé.

Préparer un projet reproductible avec grand fond, plusieurs calques, trait long, masque, gomme et transformations. Relever temps de frame p50/p95, latence pointeur et mémoire avec même machine/projet avant/après. Premier objectif : ne pas régresser le résultat visuel ni l'undo ; viser l'interaction à 60 Hz sur ce projet de référence, sans annoncer un chiffre acquis.

Optimisations candidates selon profil : cache des calques stables, overlay actif, décodage réutilisé, aperçu distinct de la résolution d'export, historique profond cohérent mais borné. Conserver import/export, pression, gomme, sélection, masques, transformations et calques. La modernisation visuelle n'est pas prioritaire sur l'intégrité des projets.

## Video Director / montage : risque principal

Ce Video Director est l'outil de montage d'Atlas, **pas H3 Max Director**, le service de génération live de l'agrégateur.

Constats : la boucle de composition tourne même en pause lorsque la vue est visible ; le projet v2 rapproche des médias par nom ; l'export compose un canvas dans un flux `captureStream(FPS)` enregistré par MediaRecorder pendant une progression en temps réel. La présence de `readyState` ne prouve pas à elle seule que le frame décodé correspond au temps demandé. Ces points justifient des tests ; ils ne démontrent pas à eux seuls la cause de tous les anciens rendus figés.

Découpage cible :

- Modèle de projet versionné : média ID + empreinte, tracks, clips, liens, effets et animations ; distinction temps source/temps timeline, FPS rationnel.
- Commandes/undo : modifications atomiques du projet, indépendantes du DOM.
- Horloge et synchronisation : lecture, pause, seek, frame step, vitesse ; attente du frame demandé lors des opérations déterministes.
- Composition : ordre des pistes, effets et overlays partagés avec le calcul d'export.
- Export en job : progression, annulation, fichier temporaire puis validation/activation, erreur récupérable.

Ne pas promettre de convertir tous les effets canvas en FFmpeg automatiquement. Un spike Astra compare un petit montage à l'export déterministe local pour un sous-ensemble annoncé ; tout effet non supporté doit être traité explicitement, jamais ignoré. Le MediaRecorder actuel peut rester une capture temps réel distincte, pas être présenté comme un export garanti frame-exact.

Tests avant remplacement : coupes à la frame, trim/in-out, vitesses, clips liés et undo, pistes cachées vs muettes, fondu audio/vidéo, texte/solides, keyframes, médias homonymes/manquants, sauvegarde/rechargement v2, ratio/FPS, export XML existant, durée et synchro A/V d'un montage de 60 s. Mesurer dropped frames/temps CPU et comparer un échantillon d'images preview/export. Les effets bruités utilisent un état reproductible si l'export doit correspondre à l'aperçu.

## Recette finale de la suite

- Installer Atlas seul, Aggregator seul, puis les deux dans une machine/profil de test ; mettre à jour en conservant le choix.
- V5 reste utilisable, aucun écrasement de ses données ; ports occupés et caméra 3784 testés.
- Créer/renommer/réordonner un atelier, y ajouter une recette, relancer et retrouver l'état.
- Créer, versionner, dupliquer et basculer entre plusieurs setups sans mélange de leurs overlays.
- Vérifier les invariants Deck/Backstage/Build côté serveur, pas seulement boutons grisés.
- Annuler une restauration defaults, l'effectuer, récupérer son backup ; créations et projets inchangés.
- Envoyer depuis chaque outil qui produit un prompt ; pour les outils purement média, proposer leur export utile sans inventer un prompt.
- Récepteur absent, timeout, popup bloquée, double clic, modèle manquant, référence absente : état lisible et aucune dépense.
- Pack invalide ou malveillant refusé ; import/export valide ; mise à jour et rollback sans perte de personnalisation.
- Réexécuter les tests actuels des deux applications, plus les tests de chaque lot. Aucune API payante requise par défaut dans la recette automatisée.
