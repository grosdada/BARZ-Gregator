# Architecture Three.js légère pour un mannequin open source

## Quelles technologies ou dépôts sont réellement utilisables avec Three.js et sous licence permissive ?

### Takeaway
La meilleure base actuelle n'est pas d'embarquer un clone complet de Mixamo, mais de conserver l'éditeur BARZ et de lui fournir un mannequin glTF/GLB riggé sous CC0 ainsi qu'une petite sélection de poses/animations CC0 provenant de Mesh2Motion. Three.js fournit déjà, sous MIT, toutes les briques runtime nécessaires.

### Cited Findings
- Three.js est sous licence MIT et son dépôt officiel autorise l'utilisation, la modification et la redistribution du logiciel avec conservation de la notice de copyright. — [Licence officielle Three.js](https://github.com/mrdoob/three.js/blob/dev/LICENSE)
- `GLTFLoader` charge les scènes glTF 2.0, leurs skins et leurs `AnimationClip`; il accepte aussi directement un `ArrayBuffer`, ce qui convient à l'import local BARZ. — [Documentation officielle GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)
- `SkinnedMesh` est le type Three.js prévu pour une géométrie déformée par un squelette, avec indices et poids de skinning; la documentation recommande en pratique de l'obtenir via GLTFLoader ou FBXLoader. — [Documentation officielle SkinnedMesh](https://threejs.org/docs/pages/SkinnedMesh.html)
- Mesh2Motion est un projet web Three.js/TypeScript actif, avec environ 3,3 k étoiles et 899 commits au moment de cette recherche; son application est sous MIT et ses modèles, rigs et animations sont déclarés CC0. — [Dépôt officiel Mesh2Motion](https://github.com/Mesh2Motion/mesh2motion-app); [licence MIT du code](https://github.com/Mesh2Motion/mesh2motion-app/blob/main/LICENSE-MIT.MD); [licence CC0 des assets](https://github.com/Mesh2Motion/mesh2motion-app/blob/main/LICENSE-CC0.MD)
- Mesh2Motion fournit notamment `rig-human.glb` et des rigs pour plusieurs anatomies; son site annonce plus de 170 animations et l'export GLB/FBX, avec sources Blender disponibles. — [Répertoire officiel des rigs](https://github.com/Mesh2Motion/mesh2motion-app/tree/main/static/rigs); [site officiel Mesh2Motion](https://mesh2motion.org/)
- Le dépôt d'assets Mesh2Motion contient aussi les packs humains Quaternius en CC0, ce qui offre une source publique pour un mannequin plus dessiné sans reprendre un asset Mixamo. — [Asset officiel Mesh2Motion/Quaternius](https://github.com/Mesh2Motion/mesh2motion-assets/blob/main/CC0-packs/Quaternius/Quaternius-human-packs.blend)
- `human_doll` est une petite démonstration Three.js de mannequin procédural avec `SkinnedMesh`, 20 os et solveur CCD/FABRIK; son README annonce MIT et aucun asset externe, mais le dépôt n'a que quatre commits et aucune étoile, donc il faut le considérer comme prototype et non dépendance structurante. — [Dépôt officiel human_doll](https://github.com/sreerajmahesh/human_doll)
- `mannequin.js` est techniquement très proche du besoin, mais son logiciel et son éditeur sont sous GPL-3.0; l'intégrer directement imposerait d'examiner les obligations copyleft de toute distribution BARZ. — [Licence officielle mannequin.js](https://boytchev.github.io/mannequin.js/docs/licence.html)
- Poseify propose un éditeur navigateur riche sous MIT, mais reconnaît que ses 33 FBX téléchargés au setup appartiennent à PoseMy.Art, ne sont ni MIT ni CC0, et ne peuvent pas être redistribués comme assets BARZ. — [Dépôt et provenance officielle Poseify](https://github.com/iamtyroon/poseify)
- Marionettes est un composant client MIT acceptant les squelettes GLB/FBX et sérialisant les poses; il est néanmoins petit et ancien, et son modèle de démonstration est un asset Mixamo séparé du code. — [Présentation du projet Marionettes](https://explore.market.dev/ecosystems/puppet/projects/njourdane-marionettes)
- Le renderer de Posecode n'est pas une bonne dépendance embarquée pour BARZ fermé: le projet distingue une couche standard Apache-2.0 et une couche produit/renderer AGPL-3.0 avec licence commerciale séparée. — [Dépôt officiel Posecode et licences](https://github.com/posecode-dev/posecode)

### Inferences
- Candidat recommandé: un seul mannequin humain GLB CC0 issu de Mesh2Motion/Quaternius, retraité une fois dans Blender pour avoir un squelette canonique, peu de polygones, zéro texture et un matériau neutre. C'est un asset, pas une nouvelle application ni un nouveau framework.
- `human_doll` est surtout une bonne référence d'algorithmes pour ajouter ultérieurement de l'IK au code BARZ; avant de copier du code, ajouter/valider une vraie notice MIT dans le dépôt source serait prudent, car le texte de licence est actuellement seulement affirmé dans le README visible.
- Écarter mannequin.js, Posecode renderer et l'intégration complète de Poseify évite le copyleft et les problèmes de provenance d'assets.

### Gaps
- Il faut encore sélectionner le fichier humain Mesh2Motion/Quaternius exact, mesurer son poids GLB compressé et vérifier visuellement son skinning sur les amplitudes extrêmes avant de le figer dans l'installateur.
- Le statut de maintenance actuel de Marionettes et sa compatibilité avec la version précise de Three.js utilisée par BARZ doivent être testés sur un petit prototype si cette voie est retenue.

## Existe-t-il un composant open source léger comparable à un PoseMyArt/Mixamo basique ?

### Takeaway
Il existe des composants proches, mais aucun n'est à la fois mature, léger, permissif, juridiquement propre et directement meilleur que l'éditeur BARZ déjà présent. Le meilleur compromis est de reprendre les assets CC0 et éventuellement quelques algorithmes ciblés, pas d'embarquer une deuxième application complète.

### Cited Findings
- Mesh2Motion est le véritable équivalent open source le plus crédible de Mixamo pour importer, rigger, appliquer des animations et exporter; il fonctionne dans le navigateur, son code est MIT et ses rigs/animations sont CC0. — [Dépôt officiel Mesh2Motion](https://github.com/Mesh2Motion/mesh2motion-app); [site officiel](https://mesh2motion.org/)
- Mesh2Motion est cependant un outil de rigging/animation complet, avec Vite, TypeScript, export FBX, JSZip, FileSaver et autres dépendances; ce n'est pas un petit widget de pose à greffer tel quel. — [package.json officiel](https://github.com/Mesh2Motion/mesh2motion-app/blob/main/package.json)
- Marionettes est conçu comme une bibliothèque client d'édition/prévisualisation de poses, charge GLB/FBX, gère un squelette précis jusque dans les doigts et possède un sérialiseur; son code est annoncé MIT. — [Présentation du projet Marionettes](https://explore.market.dev/ecosystems/puppet/projects/njourdane-marionettes)
- Poseify dispose d'un contrat de rig 22 os corporels + 40 os de doigts, de FK/IK, d'une banque de poses et de retargeting; son code original est MIT, mais son flux d'installation récupère environ 90 Mo et ses mannequins PoseMy.Art sont explicitement exclus de la licence. — [Dépôt officiel Poseify](https://github.com/iamtyroon/poseify)
- La petite démo `human_doll` montre qu'un mannequin procédural, un CCD IK, le picking et les limites articulaires peuvent tenir dans une app vanilla Three.js sans backend ni moteur physique. — [Dépôt officiel human_doll](https://github.com/sreerajmahesh/human_doll)

### Inferences
- Pour BARZ, « composant équivalent » doit signifier une couche d'adaptation d'environ cinq modules (`RigAdapter`, `BonePicker`, `PoseCodec`, `PoseLibrary`, `RigExporter`) autour de Three.js, pas un iframe ou un fork complet.
- Mesh2Motion est la meilleure source ouverte d'assets et de conventions; Marionettes peut servir de référence pour la sérialisation et la sélection; Poseify peut inspirer le contrat de rig mais ses téléchargeurs/assets doivent être totalement exclus.
- La fonction la plus rentable de Mixamo à reproduire n'est pas l'auto-rigging, mais le couple « rig canonique + bibliothèque de mouvements que l'on scrube puis fige en pose ». BARZ peut le faire avec quelques clips CC0 et `AnimationMixer`, sans importer toute l'interface Mesh2Motion.

### Gaps
- Aucun dépôt trouvé ne fournit un paquet npm moderne, minimal et permissif qui remplace à lui seul le mannequin, la banque de poses, l'IK et l'export dans l'architecture BARZ existante.
- La compatibilité exacte entre les noms d'os du rig BARZ actuel et le rig humain Mesh2Motion doit être inventoriée avant de convertir les poses existantes.

## Comment implémenter couleur plate, picking d'os, FK, presets, glTF et BVH ?

### Takeaway
Le pipeline le plus stable est un GLB local avec squelette canonique, matériaux remplacés au chargement, marqueurs de joints raycastables, `TransformControls` attaché à l'os sélectionné en rotation locale, poses JSON en quaternions relatifs au bind pose, et export GLB via l'addon officiel. Le BVH doit rester optionnel car le retargeting entre rigs est la partie la plus fragile.

### Cited Findings
- `TransformControls.attach()` accepte tout `Object3D` présent dans le graphe de scène, propose le mode `rotate`, l'espace local, les snaps et des événements `objectChange`; un `THREE.Bone` étant un `Object3D`, il peut être contrôlé directement. — [Documentation officielle TransformControls](https://threejs.org/docs/pages/TransformControls.html); [Documentation officielle Object3D](https://threejs.org/docs/pages/Object3D.html)
- `GLTFExporter` exporte glTF 2.0 en JSON ou GLB binaire et sait inclure scènes, meshes, matériaux, skins, squelettes et une liste d'`AnimationClip`. — [Documentation officielle GLTFExporter](https://threejs.org/docs/pages/GLTFExporter.html)
- `SkeletonUtils` fournit le clonage correct des `SkinnedMesh`, ainsi que `retarget` et `retargetClip` avec mapping de noms, offsets locaux, conservation des matrices/positions et réglages de hanche. — [Documentation officielle SkeletonUtils](https://threejs.org/docs/pages/module-SkeletonUtils.html)
- `BVHLoader` convertit un fichier BVH à racine unique en `Skeleton` + `AnimationClip` et permet d'activer séparément animation des positions et rotations. — [Documentation officielle BVHLoader](https://threejs.org/docs/pages/BVHLoader.html)
- Les discussions Three.js documentent cependant des cas de décalage de frame, d'échelle et d'écrasement du skin lors de `retargetClip`, ce qui confirme que les différences de bind pose et d'espaces de coordonnées doivent être traitées explicitement. — [Discussion Three.js sur retargetClip](https://discourse.threejs.org/t/fixing-skeletonutils-retarget-and-retargetclip-functions/65149); [cas BVH/glTF écrasé](https://discourse.threejs.org/t/reposition-bvh-animation/64180)

### Inferences
- Chargement/couleur plate:
  1. charger le GLB local via `GLTFLoader`;
  2. parcourir la scène et repérer `isSkinnedMesh`;
  3. remplacer chaque matériau par un `MeshStandardMaterial` monochrome partagé, sans `map`, `normalMap`, `roughnessMap`, `metalnessMap` ni vertex colors;
  4. conserver géométrie, attributs `skinIndex`/`skinWeight`, bind matrices et `Skeleton` intacts;
  5. changer la couleur par `flatMaterial.color.set(...)`. « Flat color » signifie ici couleur uniforme éclairée; `MeshBasicMaterial` peut être proposé si l'on veut une silhouette totalement indépendante de l'éclairage.
- Picking/FK:
  1. générer une petite sphère de sélection par os utile, attachée à l'os mais placée à son origine/à son extrémité;
  2. garder les marqueurs dans un layer de picking et les masquer lors des exports;
  3. au clic, colorer le marqueur vert, attacher un unique `TransformControls` à l'os, `mode='rotate'`, `space='local'`, et désactiver `OrbitControls` durant le drag;
  4. limiter les Euler/quaternions dans une table de contraintes anatomiques et enregistrer une commande undo au `mouseUp`, pas à chaque `pointermove`.
- Presets statiques: stocker `{rigId, bindPoseHash, bones:{canonicalName:[x,y,z,w]}, rootPosition}`. Les valeurs sont des quaternions locaux relatifs au bind pose; cela évite l'ambiguïté des degrés/Euler et permet la réapplication sur les deux mannequins si les deux suivent le même contrat de rig.
- Bibliothèque initiale: extraire des poses statiques de clips CC0 Mesh2Motion en choisissant des frames significatives, puis enregistrer uniquement les quaternions JSON. Cela donne une petite banque sans embarquer toute la bibliothèque vidéo.
- Export/import glTF: exporter la racine du personnage avec `binary:true`, `trs:true`; inclure un clip seulement si BARZ exporte une animation. Pour une pose fixe, exporter les transforms d'os courants et zéro clip. À l'import, valider le rig, normaliser échelle/orientation et construire une table `canonicalBone -> Bone`.
- BVH optionnel: parser avec `BVHLoader`, désactiver les translations sauf la hanche, appliquer un mapping explicite de noms et calculer les offsets bind-pose. Fournir d'abord « importer une pose depuis la frame courante »; reporter la lecture de longues animations/retarget universel à une phase ultérieure.

### Gaps
- Three.js ne fournit pas une normalisation universelle des rigs; il faut définir le contrat canonique BARZ et une table de mapping Mesh2Motion/Mixamo/BVH.
- Les limites articulaires, le twist des avant-bras et la qualité des épaules doivent être vérifiés sur le mannequin choisi; ils dépendent du rig et des poids, pas seulement du code Three.js.

## Quel est l'effort et le risque des trois meilleures architectures ?

### Takeaway
La voie « asset GLB CC0 + éditeur BARZ » est nettement la plus courte et la moins risquée. Le mannequin procédural donne un contrôle maximal mais demande beaucoup plus de travail visuel; intégrer un éditeur tiers complet apporte surtout de la dette et des problèmes de licence/provenance.

### Cited Findings
- La chaîne officielle Three.js couvre déjà import GLB, skinning, manipulation d'`Object3D`, export GLB et retargeting; aucun moteur 3D supplémentaire n'est requis. — [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html); [SkinnedMesh](https://threejs.org/docs/pages/SkinnedMesh.html); [TransformControls](https://threejs.org/docs/pages/TransformControls.html); [GLTFExporter](https://threejs.org/docs/pages/GLTFExporter.html)
- Mesh2Motion sépare clairement code MIT et assets CC0 et expose un rig humain GLB, ce qui réduit le travail de modélisation et le risque juridique. — [Dépôt officiel Mesh2Motion](https://github.com/Mesh2Motion/mesh2motion-app); [rigs officiels](https://github.com/Mesh2Motion/mesh2motion-app/tree/main/static/rigs)
- Poseify demande environ 90 Mo au setup et sa bibliothèque de mannequins n'est pas redistribuable; l'application complète est donc un mauvais candidat à l'intégration malgré ses fonctions. — [Provenance officielle Poseify](https://github.com/iamtyroon/poseify)
- Mesh2Motion lui-même est une application complète comportant plusieurs dépendances d'import/export et de packaging, ce qui justifie de n'en reprendre que les assets et concepts utiles. — [package.json officiel Mesh2Motion](https://github.com/Mesh2Motion/mesh2motion-app/blob/main/package.json)

### Inferences
- Architecture 1 — **GLB CC0 embarqué + adaptateur BARZ** (recommandée):
  - Effort MVP estimé: 3 à 5 jours ingénieur pour sélectionner/nettoyer le GLB, mapping des os, flat material, picking/FK, conversion des poses BARZ et export image/GLB; 2 à 4 jours supplémentaires pour 20–40 presets propres et import BVH « frame courante ».
  - Empreinte: un GLB optimisé de quelques Mo au maximum, aucun framework runtime supplémentaire, uniquement les addons Three.js déjà cohérents avec l'app.
  - Risques: noms/axes d'os, qualité du skin aux épaules/hanches, nécessité de conserver le texte CC0 dans les notices. Risque global faible à moyen.
- Architecture 2 — **mannequin anatomique procédural BARZ en SkinnedMesh**:
  - Effort MVP estimé: 7 à 12 jours pour géométrie crédible, skin weights, proportions, mains/pieds, limites et tests; davantage si l'on veut des déformations musculaires convaincantes.
  - Empreinte minimale et provenance parfaite; les deux mannequins peuvent partager exactement le même contrat JSON.
  - Risques: rendu « tubes/capsules », poids de skinning artisanaux, anatomie et silhouette plus longues à affiner que prévu. Risque moyen à élevé, surtout artistique.
- Architecture 3 — **fork/embedding d'un éditeur existant** (Marionettes ou code propre de Poseify):
  - Effort estimé: 8 à 15 jours pour isoler le composant, aligner Three.js/UI/state, retirer tous les assets non autorisés, reconnecter les exports BARZ et écrire des tests de non-régression.
  - Avantage: fonctionnalités de pose déjà pensées; inconvénient: double architecture, dépendances anciennes ou larges, maintenance externe et audit de provenance.
  - Risque global élevé. Ne retenir que si un prototype de 1–2 jours prouve que Marionettes fonctionne sans patch majeur avec la version Three.js BARZ.
- Décision proposée: implémenter Architecture 1, garder le mannequin schématique actuel comme option rapide, ajouter le GLB CC0 comme option « anatomique », puis réutiliser le même `PoseCodec`. Ajouter IK/BVH seulement après validation de la pose FK et de l'export.

### Gaps
- Les estimations sont des estimations d'ingénierie basées sur l'architecture décrite, pas des durées publiées par les projets sources; elles doivent être recalibrées après inspection du rig GLB retenu et du code Ragdoll Studio actuel.
- Le poids final de l'installateur et les performances sur le matériel cible doivent être mesurés avec l'asset réellement optimisé, pas déduits du dépôt source Blender.
