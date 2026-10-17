# Alternatives ouvertes à Mixamo pour BARZ Ragdoll Studio

## Quels candidats fournissent réellement un humanoïde maillé et riggé ?

### Takeaway
Le meilleur couple prêt à intégrer est **Quaternius Universal Base Characters + Universal Animation Library** : petit modèle humanoïde, squelette commun, glTF/FBX et licence CC0. MakeHuman est le meilleur second choix si BARZ veut plus tard un mannequin plus anatomique et paramétrique, mais son pipeline est nettement plus lourd.

### Cited Findings
- **Quaternius Universal Base Characters** fournit six bases masculines/féminines en proportions Superhero, Regular et Teen, avec une topologie optimisée pour l'animation, un rig humanoïde retargetable et environ 13 000 triangles par personnage. Les formats gratuits annoncés sont FBX et glTF, et la page indique explicitement la compatibilité avec la Universal Animation Library. — [Source officielle Quaternius](https://quaternius.com/packs/universalbasecharacters)
- **Quaternius Universal Animation Library** fournit plus de 120 animations sur un rig humanoïde universel, avec locomotion en huit directions, course, poussée, reptation, nage, assise, morts et autres actions. Les formats annoncés sont FBX, GLB et Blend. — [Source officielle Quaternius](https://quaternius.com/packs/universalanimationlibrary.html)
- **Universal Animation Library 2** ajoute plus de 130 animations (combos, parkour, ferme, pêche, zombie, etc.) sous le même principe de rig universel. Elle est donc une extension possible, pas nécessaire au premier MVP. — [Source officielle Quaternius](https://quaternius.com/packs/universalanimationlibrary2.html)
- **MakeHuman** fournit un vrai maillage humain, des rigs et des poses. Son maillage de base officiel déclare 15 340 sommets, tandis que sa documentation de modèle expose plusieurs rigs, dont `default`, `default_no_toes`, `game_engine` et `cmu_mb`. — [Maillage de base officiel](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.mhclo); [documentation officielle des rigs](https://github.com/makehumancommunity/mpfb2/blob/master/docs/fileformats/mhm.md)
- MakeHuman sait exporter des personnages en FBX, OBJ, DAE et MHX2, mais produire un personnage riggé pour le Web implique d'abord une étape MakeHuman/MPFB ou Blender; ce n'est pas un GLB compact déjà prêt comme Quaternius. — [Licence et sorties officielles MakeHuman](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md); [paquet officiel MakeHuman](https://github.com/makehumancommunity/makehuman/blob/master/buildscripts/ppa/packages/makehuman-community/debian/control)
- **Khronos CesiumMan** est un vrai exemple glTF 2.0 avec maillage skinné (`JOINTS_0`, `WEIGHTS_0`), squelette nommé et animation incluse. En revanche, le squelette emploie des noms propres comme `Skeleton_torso_joint_1` et `leg_joint_R_1`, et il n'existe pas de bibliothèque de poses associée. — [Fichier glTF officiel](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/CesiumMan/glTF/CesiumMan.gltf)
- **Kenney Animated Characters** fournit de petits personnages animés et riggés. La source historique décrit un modèle avec quatre apparences et trois animations (idle, jump, run); les pages Kenney actuelles listent aussi les packs Protagonists, Survivors et Retro. — [Source Kenney via OpenGameArt](https://opengameart.org/content/animated-characters-1); [page officielle Kenney Protagonists](https://kenney.nl/assets/animated-characters-protagonists); [page officielle Kenney Survivors](https://kenney.nl/assets/animated-characters-survivors)
- **Blender Studio Character Library** contient des personnages complets riggés et render-ready, mais ce sont des assets de production Blender beaucoup plus riches que nécessaire pour une petite app Three.js. — [Annonce officielle Blender Studio](https://studio.blender.org/blog/new-the-character-library/)
- **MB-Lab/ManuelBastioni** sait produire des personnages et propose plusieurs structures de rig (base, muscle, IK), mais le projet MB-Lab historique est archivé depuis juillet 2024 et son intégration impose Blender et un gros pipeline Python/Blend. — [Dépôt officiel archivé](https://github.com/animate1978/MB-Lab); [documentation officielle du rig](https://github.com/animate1978/MB-Lab-docs/blob/master/docs/pose.rst)

### Inferences
- Pour le besoin BARZ « un mannequin un peu plus élaboré mais tranquille à implémenter », **Quaternius Regular Male ou Regular Female en glTF** est le meilleur premier choix : 13k triangles reste raisonnable, le format entre directement dans Three.js, et les poses/animations proviennent du même écosystème de rig. — [Caractères](https://quaternius.com/packs/universalbasecharacters); [animations](https://quaternius.com/packs/universalanimationlibrary.html)
- CesiumMan est techniquement le plus petit prototype pour valider le chargement/skinning, mais son apparence ancienne et son absence de bibliothèque de poses le rendent moins bon comme mannequin utilisateur.
- Kenney est un bon secours ultra-léger, mais ses pages publiques ne documentent pas assez le squelette, le nombre de polygones ni une banque de poses compatible; il demanderait plus de vérification manuelle du ZIP.
- MakeHuman serait pertinent dans une phase 2 « mannequin anatomique paramétrique », pas comme dépendance du premier Ragdoll Studio.

### Gaps
- Quaternius ne publie pas sur la page du pack la liste exacte des noms d'os ni la taille binaire de chaque GLB; il faut télécharger le pack gratuit et inventorier un fichier avant d'écrire le mapping BARZ.
- Les pages Kenney ne publient pas le nombre de triangles ni la convention de nommage du squelette.
- Aucun de ces packs n'est documenté comme utilisant exactement le squelette Mixamo; un retargeting par table de correspondance reste probablement nécessaire si BARZ veut aussi lire des FBX Mixamo existants.

## BARZ peut-il redistribuer le mesh/rig brut et le rendre en couleur plate ?

### Takeaway
Oui sans ambiguïté pour Quaternius, MakeHuman core et Kenney, car leurs assets candidats sont CC0. CesiumMan et Blender Studio restent commercialement redistribuables mais exigent une attribution CC-BY; MB-Lab est à éviter dans l'installateur BARZ à cause de son historique de licences copyleft et de sa complexité.

### Cited Findings
- Quaternius qualifie les Universal Base Characters et ses deux Universal Animation Libraries de **CC0**, utilisables dans les projets personnels, éducatifs et commerciaux. — [Base Characters](https://quaternius.com/packs/universalbasecharacters); [Animation Library 1](https://quaternius.com/packs/universalanimationlibrary.html); [Animation Library 2](https://quaternius.com/packs/universalanimationlibrary2.html)
- Le code MakeHuman est AGPL, mais le projet sépare explicitement le code des assets : maillage de base, proxies, targets, textures, vêtements, poses et expressions core sont CC0. Le projet affirme aussi ne revendiquer aucun droit sur les exports FBX/OBJ/DAE/MHX2 produits à partir de ces assets. — [Licence officielle MakeHuman](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md)
- La FAQ MakeHuman confirme que les core assets peuvent être utilisés dans un jeu fermé, vendus, copiés ou utilisés pour construire un autre générateur sans contrainte de licence sur ce générateur. — [FAQ officielle MakeHuman](https://static.makehumancommunity.org/makehuman/faq/are_makehuman_files_free.html)
- Les packs Kenney candidats affichent la licence Creative Commons CC0 sur leurs pages officielles. — [Protagonists](https://kenney.nl/assets/animated-characters-protagonists); [Survivors](https://kenney.nl/assets/animated-characters-survivors); [Retro](https://kenney.nl/assets/animated-characters-retro)
- CesiumMan est sous CC-BY-4.0 pour tous les fichiers du modèle; la licence exclut les logos et marques Cesium. BARZ peut donc le redistribuer commercialement à condition d'attribuer et de respecter cette exclusion. — [Licence officielle CesiumMan](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/CesiumMan/LICENSE.md)
- Blender Studio indique que ses personnages sont sous licence CC-BY, utilisables comme souhaité avec un crédit approprié; il faut toutefois vérifier la licence affichée sur chaque asset particulier. — [Character Library](https://studio.blender.org/blog/new-the-character-library/); [règles de remix officielles](https://studio.blender.org/remixing/)
- Le dépôt MB-Lab est archivé, son code est GPL et son historique de licence d'assets mentionne que le projet dérive de ManuelBastioniLAB et que l'AGPL s'applique. — [Code MB-Lab](https://github.com/animate1978/MB-Lab/blob/master/humanoid.py); [historique officiel Asset Licensing](https://github.com/animate1978/MB-Lab/wiki/Asset-Licensing/_history)
- CC0 est une renonciation aussi large que possible aux droits d'auteur et droits voisins, avec une licence de repli permettant reproduction, adaptation, distribution, exécution et communication à toute fin, y compris commerciale. — [Texte juridique CC0 officiel](https://creativecommons.org/publicdomain/zero/1.0/legalcode)

### Inferences
- BARZ peut embarquer un GLB Quaternius modifié, remplacer tous ses matériaux par un matériau plat, supprimer les textures et redistribuer ce dérivé dans l'installateur sans attribution obligatoire. Conserver un petit `THIRD_PARTY_ASSETS.md` citant Quaternius reste une bonne pratique de provenance, même si CC0 ne l'impose pas. — [Pack officiel](https://quaternius.com/packs/universalbasecharacters); [CC0](https://creativecommons.org/publicdomain/zero/1.0/legalcode)
- Pour MakeHuman, BARZ ne devrait embarquer qu'un **export figé des core assets CC0**, pas le moteur MakeHuman/MPFB lui-même; cela évite d'introduire l'AGPL/GPL et une dépendance Blender dans l'application.
- MB-Lab n'apporte aucun avantage décisif face à MakeHuman ou Quaternius et augmente fortement le risque de conformité; il doit être rejeté pour ce MVP.

### Gaps
- Il faut conserver dans le dépôt BARZ une copie du texte CC0 et la provenance/version/date du ZIP Quaternius effectivement transformé, afin d'auditer exactement le fichier livré.
- La licence exacte des assets tiers téléchargés depuis la bibliothèque communautaire MakeHuman peut différer du core CC0; ils ne doivent pas être inclus automatiquement.

## Formats, squelette et compatibilité Three.js : quelle implémentation modeste recommander ?

### Takeaway
Le MVP le plus simple est un **GLB Quaternius local, sans textures, chargé par GLTFLoader**, avec une table de noms d'os et une petite sélection de poses statiques extraites de la Universal Animation Library. On conserve le mannequin schématique BARZ en premier choix et on ajoute « Humanoid CC0 » comme second choix.

### Cited Findings
- Quaternius distribue les personnages en FBX et glTF, et les animations en FBX/GLB/Blend; les personnages et animations sont annoncés comme compatibles via le même rig humanoïde universel. — [Personnages](https://quaternius.com/packs/universalbasecharacters); [animations](https://quaternius.com/packs/universalanimationlibrary.html)
- Le dépôt d'assets glTF de Khronos explique que le GLB regroupe textures, maillage et données binaires dans un seul fichier, alors que le `.gltf` séparé nécessite de conserver le `.bin` et les images à côté. — [Documentation officielle Khronos Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets)
- Le fichier CesiumMan démontre qu'un glTF standard peut contenir le mesh, les poids de skin, le squelette et les canaux d'animation de translation/rotation/scale, ce qui correspond directement aux primitives comprises par un moteur glTF Web. — [Fichier glTF officiel CesiumMan](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/CesiumMan/glTF/CesiumMan.gltf)
- Les Universal Base Characters font environ 13k triangles en moyenne, soit une taille très modeste pour un unique mannequin interactif. — [Source officielle Quaternius](https://quaternius.com/packs/universalbasecharacters)
- MakeHuman offre davantage de détail et de paramétrage, mais son format natif s'appuie sur un ensemble d'assets, de targets et de rigs; MPFB construit ensuite maillage et armature dans Blender. — [Format de preset MPFB](https://github.com/makehumancommunity/mpfb2/blob/master/docs/fileformats/human_preset.md); [importeur MPFB](https://github.com/makehumancommunity/mpfb2/blob/master/docs/ui/new_human/importer.md)

### Inferences
- Plan d'intégration recommandé, de faible risque :
  1. Télécharger une version précise du pack gratuit Quaternius et choisir uniquement `Regular_Male` ou `Regular_Female`.
  2. Convertir une seule fois en **GLB** si le pack gratuit livre un `.gltf` externe, supprimer images/textures et appliquer un matériau neutre flat dans le fichier ou après chargement.
  3. Inventorier les os du GLB et créer une table BARZ sémantique (`hips`, `spine`, `head`, `upperArmL`, etc.) vers les noms réels du pack.
  4. Utiliser les mêmes poignées et TransformControls que le mannequin procédural, mais piloter les `Bone.rotation/quaternion` du SkinnedMesh.
  5. Extraire seulement 12–20 poses utiles des 120+ animations (neutral, walk contact, run, sit, crouch, reach, hero, fear, punch, kneel…), chacune stockée sous forme de quaternions par os. Cela évite d'embarquer toute la bibliothèque tout en restant conforme au CC0.
  6. Garder l'import FBX utilisateur comme option secondaire; le modèle intégré BARZ doit rester GLB pour simplifier packaging, chargement et tests.
- La couleur plate n'exige aucune UV ni texture : BARZ peut remplacer les matériaux de tous les meshes après chargement et conserver seulement le skinning. Cette modification est permise par CC0. — [CC0](https://creativecommons.org/publicdomain/zero/1.0/legalcode)
- La bibliothèque Quaternius est plus proche du besoin fonctionnel de Mixamo que MakeHuman : elle réunit **mesh riggé + squelette commun + animations/poses** sans service cloud, sans compte et sans licence restrictive. — [Personnages](https://quaternius.com/packs/universalbasecharacters); [animations](https://quaternius.com/packs/universalanimationlibrary.html)
- Recommandation de décision : **adopter Quaternius pour le second mannequin**, garder MakeHuman en option future, et ne pas investir dans MB-Lab, Blender Studio ou CesiumMan pour ce besoin précis.

### Gaps
- Avant implémentation, il faut mesurer le poids exact du GLB choisi, valider l'orientation/scale, compter les os et tester les noms/axes dans Three.js.
- Il faut vérifier si les fichiers gratuits de la Universal Animation Library contiennent une animation par GLB ou plusieurs clips dans un seul GLB; cela détermine l'outil d'extraction de poses.
- Le comportement des doigts peut augmenter fortement le nombre de gizmos. Pour un MVP, le rig UI devrait probablement exposer les gros segments corporels et masquer les phalanges, sans supprimer les os du mesh.
