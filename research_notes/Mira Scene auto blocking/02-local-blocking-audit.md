# Audit local du Blocking Studio

## Où se trouve réellement Blocking Studio dans BARZ Suite 6 ?

### Takeaway
La v6 actuelle ne contient pas le véritable Blocking Studio : elle expose seulement `2D/3D Transfer workflow`, un générateur de prompts embarqué en iframe. Les traces de l'ancien Blocking Studio subsistent dans les données de migration, mais ni son outil, ni sa route, ni son moteur d'auto-blocking ne sont enregistrés dans le runtime courant.

### Cited Findings
- Le registre v6 déclare `workflow-3d` sous le titre `2D/3D Transfer workflow`, puis le place dans `character-lab` en position 3. Il ne déclare aucun outil `blocking-studio`. — [Registre v6](../../suite-v6/packages/registry/src/defaults.js#L188); [placement](../../suite-v6/packages/registry/src/defaults.js#L379)
- Le serveur Atlas n'autorise comme outils intégrés que la liste terminant par `video-editor`, `workflow-3d`; il ne sert aucun module ou endpoint Blocking Studio. — [Serveur Atlas](../../suite-v6/apps/atlas/server.js#L70)
- Le routeur d'interface importe et monte `workflow-3d`, mais n'importe ni ne monte Blocking Studio. — [Routeur d'atelier](../../suite-v6/apps/atlas/public/tool-workspace.js#L8); [dispatch](../../suite-v6/apps/atlas/public/tool-workspace.js#L4255)
- Le wrapper `workflow-3d` charge `/assets/HTML/3D-IA-Workflow.html` dans une iframe et lit huit sorties textuelles (deux sorties 3D et six transferts 2D); il ne crée aucune scène Three.js. — [Wrapper 2D/3D](../../suite-v6/apps/atlas/public/workflow-3d.js#L1); [iframe](../../suite-v6/apps/atlas/public/workflow-3d.js#L77); [test de parité](../../suite-v6/tests/workflow-3d.test.js#L6)
- Les données de migration décrivent l'ancien outil comme un plateau Three.js avec mannequins articulables, primitives de décor, focales 24/35/50/85 mm et timeline de caméra, exportant une capture et du texte de trajectoire. — [Description legacy](../../suite-v6/migration/atlas-v5/prompt-literals.json#L25164)
- L'ancien shell ouvrait explicitement `../public/assets/HTML/blocking-studio.html`, mais ce fichier n'existe plus dans l'arbre BARZ Suite v6 ni dans l'inventaire source conservé. — [Chemin legacy](../../suite-v6/migration/atlas-v5/prompt-literals.json#L193332); [inventaire source](../../suite-v6/migration/atlas-v5/source-manifest.json#L342)

### Inferences
- Le screenshot utilisateur correspond au Blocking Studio legacy ou à une build antérieure, pas au module `workflow-3d` actuellement intégré dans la v6.
- Une intégration correcte doit créer un nouvel outil autonome `blocking-studio` et ne doit pas remplacer `workflow-3d`, car leurs usages sont différents : scène 3D éditable contre compilation de prompts de transfert.
- Blocking Studio est un outil codé et opérationnel, donc sa place produit la plus cohérente est Backstage, avec une configuration persistante séparée; `workflow-3d` peut rester dans Character & Asset Lab.

### Gaps
- Le fichier legacy `blocking-studio.html` n'est pas disponible dans le workspace actuel; il faudra soit le récupérer d'une ancienne distribution, soit reconstruire l'interface Three.js à partir du contrat et des traces de migration.
- Les modèles binaires ONNX et les anciens modules `blocking-fit.js`, `blocking-refine.js`, `reproject.js` ne sont pas présents dans la v6; leurs signatures et hashes sont connus, mais pas leur code source complet. — [Manifest des modules legacy](../../suite-v6/migration/atlas-v5/source-manifest.json#L419)

## Comment fonctionnait l'ancien AI Auto-Blocking ?

### Takeaway
L'ancien système combinait deux voies : une estimation sémantique par modèle multimodal qui produisait un JSON de primitives, puis un solveur local OWLv2 + MobileSAM + MoGe qui tentait de détecter, segmenter et projeter les volumes dans un nuage 3D avant de les ajuster à des primitives.

### Cited Findings
- Le contrat multimodal exigeait, depuis une seule image, un JSON strict contenant des objets primitifs, positions, rotations, échelles, couleurs, ancres image, ainsi qu'une caméra. Le document précise qu'il s'agit d'un « first pass », non d'une reconstruction métrique, limité typiquement à 2–8 volumes principaux et soumis à l'ambiguïté monoculaire. — [Contrat AUTO-BLOCKING](../../suite-v6/migration/atlas-v5/prompt-literals.json#L8823)
- Le backend legacy possédait `buildAutoBlockInstruction`, `autoBlock`, `normalizeAutoBlockScene` et retournait des erreurs spécifiques pour JSON invalide ou scène vide. — [Packet sémantique](../../suite-v6/migration/atlas-v5/semantic-review/packets/shared-shell-01.json#L2415); [validation JSON](../../suite-v6/migration/atlas-v5/prompt-literals.json#L54809)
- La détection locale utilisait `@huggingface/transformers` en tâche `zero-shot-object-detection`, avec `Xenova/owlv2-base-patch16-ensemble` quantifié `q8`. — [Tâche OWLv2](../../suite-v6/migration/atlas-v5/prompt-literals.json#L59627); [modèle OWLv2](../../suite-v6/migration/atlas-v5/prompt-literals.json#L183450); [quantification](../../suite-v6/migration/atlas-v5/prompt-literals.json#L163928)
- Les requêtes de détection étaient une petite liste générique : personnes et véhicules, bâtiments/murs/portes/fenêtres, mobilier simple, plantes/arbres/poteaux/panneaux, ballon/baril/conteneur. — [Libellé `traffic light`](../../suite-v6/migration/atlas-v5/prompt-literals.json#L248091); [libellé `street sign`](../../suite-v6/migration/atlas-v5/prompt-literals.json#L307474)
- La segmentation locale chargeait MobileSAM via deux modèles ONNX, `encoder.onnx` et `decoder.onnx`, et conservait un embedding par `imageId`; le code disposait d'erreurs explicites pour modèle absent, encode/decode en échec ou embedding absent. — [Encodeur MobileSAM](../../suite-v6/migration/atlas-v5/prompt-literals.json#L365463); [décodeur MobileSAM](../../suite-v6/migration/atlas-v5/prompt-literals.json#L366878); [erreurs MobileSAM](../../suite-v6/migration/atlas-v5/semantic-review/packets/shared-shell-01.json#L2437)
- La profondeur/géométrie locale chargeait `public/assets/vendor/models/moge2/model.onnx` avec `onnxruntime-node` sur CPU, puis recevait un buffer RGB avec largeur et hauteur. — [Dépendance ONNX](../../suite-v6/migration/atlas-v5/prompt-literals.json#L262567); [modèle MoGe](../../suite-v6/migration/atlas-v5/prompt-literals.json#L368748); [erreur modèle absent](../../suite-v6/migration/atlas-v5/prompt-literals.json#L181628)
- `blocking-fit.js` convertissait les détections en primitives, ajustait chaque objet sur les points sous son masque, puis cherchait un plan de sol dominant; les échecs prévus incluaient « only N pts under mask », « too few points » et « no dominant floor plane ». — [Points insuffisants sous masque](../../suite-v6/migration/atlas-v5/prompt-literals.json#L174495); [trop peu de points](../../suite-v6/migration/atlas-v5/prompt-literals.json#L143152); [sol non trouvé](../../suite-v6/migration/atlas-v5/prompt-literals.json#L306396)
- `blocking-refine.js` dépendait de `reproject.js`, qui dépendait lui-même de `blocking-fit.js`; l'ensemble corrigeait dimensions/axes après reprojection. — [Dépendances de modules](../../suite-v6/migration/atlas-v5/source-manifest.json#L434)

### Inferences
- Le contrôle « Thresh 0.30 » montré par l'utilisateur pilote vraisemblablement le seuil de confiance OWLv2, tandis que « Max obj 6 » tronque le nombre de détections avant segmentation et ajustement.
- Le terme « AI Auto-Blocking » masque une chaîne fragile à quatre étages. Une erreur ou approximation au stade détection, masque, profondeur ou plan de sol se propage directement dans la scène finale.
- La voie multimodale peut retourner une scène même sans solveur local, mais sa caméra, son yaw et ses profondeurs restent des estimations textuelles; la voie locale améliore la géométrie seulement si tous les modèles et masques sont disponibles.

### Gaps
- Le code complet des fonctions legacy n'est pas conservé, donc les valeurs exactes de prétraitement, NMS, redimensionnement et combinaison des deux voies ne peuvent pas être vérifiées.
- Aucun fichier ONNX (`model.onnx`, `encoder.onnx`, `decoder.onnx`) n'est présent dans le workspace BARZ actuel; leur taille, leur licence de redistribution et leur version exacte ne peuvent pas être confirmées depuis les sources locales.

## Pourquoi le résultat est mauvais ou ne fonctionne pas dans la v6 ?

### Takeaway
Le premier problème est structurel : la v6 n'a pas migré le module et son moteur. Dans l'ancienne version, les performances médiocres viennent ensuite du vocabulaire de détection étroit, du traitement CPU de trois réseaux, de l'ambiguïté d'une seule image et d'un ajustement de primitives qui dépend fortement de masques et d'un plan de sol propres.

### Cited Findings
- `suite-v6/package.json` ne déclare aucune dépendance runtime pour `onnxruntime-node`, `@huggingface/transformers` ou `sharp`; le serveur v6 est donc incapable d'exécuter tel quel l'ancien solveur. — [Package v6](../../suite-v6/package.json#L1)
- Le runtime v6 ne comporte aucun endpoint `solverGeometry`, `solverEmbed`, `solverSegment`, `solverDetect`, `solverAutoblock` ni `/api/auto-block`; ces fonctions n'existent que dans les traces du serveur legacy. — [Serveur v6](../../suite-v6/apps/atlas/server.js#L70); [fonctions legacy](../../suite-v6/migration/atlas-v5/prompt-literals.json#L178914)
- La liste OWLv2 ne couvre pas librement les objets arbitraires d'une scène; elle repose sur quelques noms génériques fixes, tandis que le contrat multimodal accepte seulement quatorze primitives. — [Contrat de primitives](../../suite-v6/migration/atlas-v5/prompt-literals.json#L8823); [détecteur zero-shot](../../suite-v6/migration/atlas-v5/prompt-literals.json#L59627)
- Le solveur local faisait tourner MoGe, MobileSAM encodeur/décodeur et OWLv2 via CPU/JS/ONNX, ce qui implique plusieurs chargements et passages d'inférence avant de produire une scène. — [MoGe CPU](../../suite-v6/migration/atlas-v5/prompt-literals.json#L262567); [MobileSAM](../../suite-v6/migration/atlas-v5/prompt-literals.json#L365463); [OWLv2](../../suite-v6/migration/atlas-v5/prompt-literals.json#L183450)
- Il n'existe aucun test v6 de Blocking Studio ou d'auto-blocking; les tests couvrent seulement `workflow-3d` et la présence d'une couche textuelle Blocking Studio dans les prompts Veo. — [Tests du workflow 3D](../../suite-v6/tests/workflow-3d.test.js#L1); [fixture de couche entrante](../../suite-v6/tests/a5-legacy-fixtures.test.js#L24)

### Inferences
- Dans la v6 installée, toute tentative de réutiliser l'ancien bouton sans restaurer modèles, endpoints et modules ne peut qu'échouer, rester sans effet ou s'appuyer sur une ancienne instance externe.
- Même restauré à l'identique, l'ancien pipeline resterait lent au premier lancement et imprécis sur les scènes hors vocabulaire, les objets minces, les surfaces sans texture, les images sans sol visible et les compositions à forte occlusion.
- La bonne cible d'intégration n'est pas « remettre le bouton » : il faut un service de reconstruction versionné, un contrat de scène stable, un téléchargement explicite des poids, un cache persistant et un mode de secours réellement utilisable.

### Gaps
- Sans le fichier HTML legacy et ses appels réseau, on ne peut pas déterminer si l'interface actuelle essayait d'utiliser d'abord le VLM, d'abord le solveur local, ou une combinaison conditionnelle.
- Les logs d'une exécution utilisateur n'ont pas été fournis; on ne peut donc pas trancher entre absence de modèles, erreur de dépendance, temps d'inférence CPU excessif ou sortie invalide pour la panne observée.

## Où brancher un nouveau moteur d'auto-blocking ?

### Takeaway
Le nouveau moteur doit être isolé derrière un adaptateur de scène stable et ne pas être couplé directement à Three.js. L'interface peut ainsi accepter Mira-Scene ou un autre backend sans changer le format sauvegardé ni les outils manuels.

### Cited Findings
- Le contrat legacy fournit déjà un bon noyau d'échange : objets typés, position/rotation/échelle, couleur/label/ancre image, caméra et notes. — [Schéma legacy](../../suite-v6/migration/atlas-v5/prompt-literals.json#L8823)
- Le système v6 sait déjà persister une configuration par outil et restaurer des contrôles pour `workflow-3d`; un nouvel adaptateur `blocking-studio` peut reprendre ce modèle sans remplacer l'atelier existant. — [Configuration workflow-3d](../../suite-v6/packages/tool-adapters/src/index.js#L635); [restauration iframe](../../suite-v6/apps/atlas/public/workflow-3d.js#L83)
- Les points d'intégration v6 sont centralisés dans le registre, l'ensemble `BUILTIN_TOOL_IDS`, le catalogue runtime du serveur et le dispatch `tool-workspace.js`. — [Registre](../../suite-v6/packages/registry/src/defaults.js#L188); [serveur](../../suite-v6/apps/atlas/server.js#L70); [dispatch](../../suite-v6/apps/atlas/public/tool-workspace.js#L4255)

### Inferences
- Le backend devrait exposer `analyze` puis `scene`, avec progression et annulation, et retourner toujours le même JSON normalisé, quelle que soit l'implémentation (Mira-Scene, solveur léger ou reconstruction manuelle).
- Un mode `Rapide` peut produire caméra + primitives simples localement; un mode `Mira-Scene` peut être proposé comme moteur avancé optionnel si sa licence, ses poids et le GPU le permettent.
- Les scènes doivent être sauvegardées dans les setups Prompt Atlas, et l'utilisateur doit pouvoir continuer à éditer chaque objet après l'auto-blocking; l'IA ne doit jamais rendre le résultat opaque ou non modifiable.

### Gaps
- L'emplacement produit exact (Backstage fixe ou atelier 3D configurable) doit être confirmé par le coordinateur en fonction de la politique v6; l'audit technique recommande Backstage parce que le module demande du code et des modèles.
- La conversion précise de la sortie Mira-Scene vers le schéma de primitives dépend des sorties réellement fournies par ce modèle; elle est traitée dans l'étude de faisabilité externe.
