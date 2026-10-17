# Bibliothèques ouvertes de poses et d'animations humanoïdes

## Quelles sources peuvent légalement fournir des presets redistribuables ?

### Takeaway
Le meilleur équivalent pratique à Mixamo pour BARZ est la **Universal Animation Library de Quaternius**, complétée éventuellement par ses **Universal Base Characters** : les contenus sont annoncés CC0, disponibles en formats web/3D usuels et conçus pour un squelette humanoïde retargetable. Pour une seconde source, **CMU Motion Capture** est commercialement utilisable mais assortie d'une interdiction de revendre les données seules, tandis que **100STYLE** est très exploitable techniquement sous CC BY 4.0 avec attribution.

### Cited Findings
- **Quaternius Universal Animation Library (recommandation principale)** : la page officielle annonce plus de 120 animations sur un rig humanoïde universel, prêtes au retargeting, avec locomotion, combat, armes, emotes, nage, assise et morts ; les formats annoncés sont FBX, GLB et Blend, et la licence affichée est CC0, y compris pour les usages commerciaux. La version gratuite représente 60–70 % du pack, mais le nombre exact de clips gratuits n'est pas indiqué. — [Source officielle Quaternius](https://quaternius.com/packs/universalanimationlibrary.html)
- **Quaternius Universal Base Characters (mannequin ouvert possible)** : la page officielle annonce six personnages de base riggés (proportions adulte, super-héros et adolescent, hommes et femmes), environ 13 000 triangles, un rig humanoïde compatible avec la Universal Animation Library, des exports FBX et glTF, et une licence CC0 autorisant les usages commerciaux. — [Source officielle Quaternius](https://quaternius.com/packs/universalbasecharacters.html)
- **Quaternius Ultimate Animated Character Pack (alternative plus ancienne et plus volumineuse)** : 50+ personnages animés, aux formats FBX, OBJ et Blend, annoncés CC0 et utilisables dans des projets personnels ou commerciaux. Il est moins adapté que le couple Universal Base + Universal Animation Library parce qu'il apporte beaucoup de personnages alors que BARZ veut surtout un mannequin et quelques poses. — [Source officielle Quaternius](https://quaternius.com/packs/ultimatedanimatedcharacter)
- **MakeHuman / MPFB** distingue clairement code et contenus : le code MPFB est GPLv3, tandis que les assets intégrés — base mesh, rigs, poses, expressions et données JSON — sont CC0. Il est donc possible d'extraire ou convertir les assets sans embarquer le code GPL, à condition de rester sur les assets réellement distribués avec MPFB. — [Licence officielle MPFB](https://github.com/makehumancommunity/mpfb2/blob/master/LICENSE.md)
- Le dépôt MPFB contient des répertoires de poses pour plusieurs rigs (`cmu_mb_fk`, `default_fk`, `game_engine_fk`, `game_engine_with_breast_fk`, `mixamo_unity_fk`), mais la branche `default_fk` visible ne contient qu'un `t-pose.json`. MPFB est donc une excellente base technique/licence pour le mannequin et le format de preset, mais pas une bibliothèque riche de poses immédiatement exploitable. — [Arborescence officielle MPFB](https://github.com/makehumancommunity/mpfb2/tree/master/src/mpfb/data/poses); [dossier `default_fk`](https://github.com/makehumancommunity/mpfb2/tree/master/src/mpfb/data/poses/default_fk)
- La documentation MPFB confirme que les presets sont des JSON de rotations/translations d'os et qu'un poseur peut charger le premier frame d'un BVH comme pose statique. Elle avertit que l'import BVH direct peut modifier les bone rolls ; une conversion hors ligne vers le squelette BARZ est donc préférable à un import BVH brut dans l'application. — [Documentation officielle MPFB](https://github.com/makehumancommunity/mpfb2/blob/master/docs/ui/rigging/applypose.md)
- **CMU Motion Capture** contient 2 605 essais couvrant locomotion, interactions, sport, danse, comportements et scénarios. Le site officiel dit que les données sont « free for all uses », autorise leur inclusion dans des produits vendus, mais interdit leur revente directe, même converties. Les données d'origine sont surtout ASF/AMC ; le site renvoie vers des conversions BVH externes. — [Base officielle CMU](https://mocap.cs.cmu.edu/); [outils et formats CMU](https://mocap.cs.cmu.edu/tools.php)
- CMU précise que chaque sujet possède son propre squelette calibré, que les doigts/pouces ajoutés ne sont pas réellement capturés, et que mains et orteils peuvent être bruités. Ces caractéristiques augmentent le travail de sélection/nettoyage mais ne gênent pas un lot de poses statiques limité aux articulations principales. — [Base officielle CMU](https://mocap.cs.cmu.edu/)
- **100STYLE** propose des BVH individuels sous CC BY 4.0 : 100 styles, plus de quatre millions de frames, un squelette homogène de 28 os, 60 fps et, pour chaque style, des séquences de marche/course ainsi que des séquences `ID` d'idle. Les fichiers sont téléchargeables individuellement, ce qui permet de ne récupérer que 10 à 30 styles utiles. — [Page officielle 100STYLE](https://www.ianxmason.com/100style/)
- 100STYLE contient des catégories directement utiles à une banque de poses : `Akimbo`, `ArmsAboveHead`, `ArmsBehindBack`, `ArmsBySide`, `ArmsFolded`, `Balance`, `BentForward`, `BentKnees`, `Crouched`, `Depressed`, `Elated`, `WideLegs` et `Zombie`, chacune avec un BVH d'idle permettant d'extraire un frame statique. — [Table officielle 100STYLE](https://www.ianxmason.com/100style/)
- **AddBiomechanics** publie ses données sous CC BY 4.0, mais le corpus principal représente plus de 24 millions de frames et 70+ heures, avec des modèles biomécaniques OpenSim, forces et couples. C'est une bonne source de recherche mais une source disproportionnée pour une petite banque BARZ de poses visuelles. — [Page officielle AddBiomechanics](https://addbiomechanics.org/download_data.html)

### Inferences
- Une livraison BARZ peut légalement embarquer un petit fichier JSON de poses dérivé du pack Quaternius CC0, sans runtime externe ni attribution obligatoire ; conserver tout de même un fichier de provenance est une bonne pratique. Cette conclusion repose sur l'annonce CC0 explicite du contenu sur la page officielle. — [Source officielle Quaternius](https://quaternius.com/packs/universalanimationlibrary.html)
- CMU est utilisable si les poses sont une fonctionnalité intégrée au poseur BARZ et non un pack de données revendu séparément. Pour réduire l'ambiguïté, il faut créditer CMU, ne pas exposer les fichiers ASF/AMC ou leur conversion complète au téléchargement, et ne livrer qu'un petit nombre de transformations articulaires intégrées au produit. — [Conditions officielles CMU](https://mocap.cs.cmu.edu/)
- Pour 100STYLE, un fichier `THIRD_PARTY_ASSETS.md` doit nommer « The 100STYLE Dataset — Ian Mason », indiquer CC BY 4.0, fournir l'URL source et signaler l'extraction/modification des frames, car la page demande explicitement un crédit pour les usages créatifs ou commerciaux. — [Page officielle 100STYLE](https://www.ianxmason.com/100style/)

### Gaps
- La page Quaternius ne publie pas la liste exhaustive des clips inclus dans la partie gratuite, ni le schéma exact des noms d'os. Il faut télécharger le pack Standard, inventorier ses clips et vérifier le rig avant de figer le mapping BARZ.
- Les licences des poses téléchargées depuis la bibliothèque communautaire MakeHuman ne doivent pas être déduites de la licence CC0 des assets intégrés : MakeHuman avertit que les assets tiers peuvent avoir une licence différente. — [Licence officielle MakeHuman](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md)

## Quelles sources conviennent à une sélection légère de 10 à 30 poses ?

### Takeaway
Le plan le plus léger est de prendre **un seul rig Quaternius**, d'extraire hors ligne 16 à 24 poses significatives depuis ses animations, puis de ne livrer que des rotations articulaires JSON. Un petit complément 100STYLE peut apporter des attitudes expressives moins « jeu vidéo » ; CMU ne devient utile que si une pose précise manque.

### Cited Findings
- La Universal Animation Library est déjà organisée autour d'un rig unique et couvre beaucoup de familles d'actions ; cela évite de faire cohabiter plusieurs topologies ou plusieurs calibrations de squelette. — [Source officielle Quaternius](https://quaternius.com/packs/universalanimationlibrary.html)
- 100STYLE emploie un seul acteur et un squelette uniforme de 28 os pour toutes les séquences ; ses fichiers par style et par type de mouvement permettent un téléchargement sélectif. — [Page officielle 100STYLE](https://www.ianxmason.com/100style/)
- CMU associe des squelettes calibrés différents aux sujets et contient du bruit sur certaines extrémités ; il est donc moins homogène pour constituer rapidement une petite banque cohérente. — [Base officielle CMU](https://mocap.cs.cmu.edu/)

### Inferences
- Lot initial conseillé, à extraire de Quaternius : neutral/idle, A-pose, T-pose, walk contact, walk passing, run, crouch, sit, kneel, reach haut, reach avant, wave, point, arms crossed, hands on hips, defensive, punch anticipation, punch impact, fall, lying, carry/push et aim. Les clips précis doivent être confirmés dans le pack Standard téléchargé. — [Couverture fonctionnelle annoncée par Quaternius](https://quaternius.com/packs/universalanimationlibrary.html)
- Complément possible de 8 attitudes 100STYLE : `Akimbo_ID`, `ArmsFolded_ID`, `Balance_ID`, `BentForward_ID`, `BentKnees_ID`, `Crouched_ID`, `Depressed_ID` et `Elated_ID`. Il suffit d'extraire un frame stable de chaque BVH plutôt que d'intégrer les séquences complètes. — [Fichiers individuels officiels 100STYLE](https://www.ianxmason.com/100style/)
- Cette stratégie garde l'application petite : le runtime BARZ ne contient ni moteur de retargeting généraliste ni bibliothèque de plusieurs gigaoctets ; il ne charge qu'un dictionnaire de quaternions/rotations par pose. Le pipeline de conversion peut rester un outil de développement hors ligne.

### Gaps
- Le poids exact du pack Standard Quaternius et le nombre d'animations réellement gratuites ne sont pas publiés sur la page officielle.
- La qualité visuelle des poses extraites doit être contrôlée sur le mannequin BARZ ; les poses de combat ou avec accessoires peuvent nécessiter des corrections manuelles des poignets et épaules.

## Quel est le coût de retargeting vers le squelette simple de Ragdoll Studio ?

### Takeaway
Pour des poses statiques, la charge est raisonnable : un mapping de 15 articulations, une correction de rest-pose et une conversion en rotations locales suffisent. L'intégration devient beaucoup plus lourde seulement si BARZ veut importer arbitrairement n'importe quel BVH/FBX à l'exécution.

### Cited Findings
- Le squelette 100STYLE documenté possède 28 os avec `Hips`, quatre segments de torse, `Neck`, `Head`, colliers/épaules, bras, poignets, hanches, genoux, chevilles et orteils ; ce schéma contient donc toutes les articulations principales du mannequin BARZ, avec des os supplémentaires qu'il est possible d'ignorer. — [Hiérarchie officielle 100STYLE](https://www.ianxmason.com/100style/)
- Les ASF/AMC CMU stockent les angles en Euler et utilisent une échelle particulière ; la documentation officielle donne la conversion des longueurs en mètres et précise que le squelette réside dans ASF tandis que le mouvement est dans AMC. — [Documentation officielle CMU](https://mocap.cs.cmu.edu/info.php)
- MPFB représente une pose statique par rotations et translations d'os et sait appliquer des rotations Euler, quaternion ou axis-angle ; sa documentation constitue un bon modèle de format pour les presets BARZ sans imposer l'intégration du code GPL. — [Documentation officielle MPFB RigService](https://github.com/makehumancommunity/mpfb2/blob/master/docs/services/rigservice.md)

### Inferences
- Mapping cible minimal pour BARZ : `hips`, `spine`, `neck`, `shoulderL/R`, `elbowL/R`, `wristL/R`, `hipL/R`, `kneeL/R`, `ankleL/R`. Les doigts, orteils, clavicule séparée, tête séparée et segments de colonne supplémentaires peuvent être ignorés ou fusionnés dans le parent le plus proche.
- Pipeline hors ligne recommandé : importer FBX/GLB/BVH dans Blender ou un convertisseur dédié ; établir la correspondance d'os ; calculer pour chaque os `q_delta = inverse(q_rest_source) × q_pose_source` ; appliquer la correction d'axes/rest-pose vers BARZ ; normaliser les quaternions ; ajuster la hauteur du root pour poser les pieds au sol ; exporter un JSON par pose ; enfin valider visuellement les épaules, coudes, genoux et pieds.
- Pour 10–30 poses, un retarget hors ligne manuel/semi-automatique est nettement moins risqué qu'un import universel au runtime. Il permet aussi de supprimer toute géométrie, texture ou animation superflue et de respecter la demande de rendu en couleur plate.
- Si le modèle avancé reste riggé selon la convention Quaternius, ses propres animations demanderont peu ou pas de retargeting ; le mapping est surtout nécessaire pour répercuter la pose sur le mannequin schématique BARZ et pour le message « Send to Blocking ».

### Gaps
- Les noms d'os et orientations exacts du rig Quaternius doivent être contrôlés dans les fichiers Standard ; la page publique décrit un « universal humanoid rig » mais n'en publie pas la hiérarchie détaillée.
- La tolérance aux rotations extrêmes dépend des limites articulaires du poseur BARZ, non de la bibliothèque source ; elle doit être testée pose par pose.

## Quelles sources faut-il écarter ?

### Takeaway
Il faut écarter les corpus non commerciaux, NoDerivatives ou sans licence explicite. Le fait qu'un dépôt GitHub soit public ou que son code soit open source ne donne aucun droit sur ses données de mouvement.

### Cited Findings
- **LAFAN1** est en CC BY-NC-ND 4.0 : l'usage commercial et la création de dérivés sont incompatibles avec l'extraction, le retargeting et la distribution de presets dans BARZ. — [Dépôt officiel LAFAN1](https://github.com/ubisoft/ubisoft-laforge-animation-dataset)
- **OpenMoCap 2025** est un solveur de capture sous occlusion, pas une bibliothèque de poses. Son dépôt public n'affiche pas de fichier de licence dans l'arborescence visible et son README ne donne pas de licence explicite pour le code, les poids ou CMU-Occlu ; il ne faut donc rien redistribuer depuis ce dépôt sans clarification écrite. — [Dépôt officiel OpenMoCap](https://github.com/qianchen214/OpenMoCap)
- **XRMoCap** illustre la distinction code/données : le code est Apache-2.0, mais le projet dit explicitement que les dépendances et datasets pris en charge ont leurs propres licences. Une licence de code permissive ne couvre donc pas les motions. — [Dépôt officiel XRMoCap](https://github.com/openxrlab/xrmocap)
- Le code de **fairmotion** est BSD-3-Clause, mais il s'agit d'outils de lecture/traitement/visualisation ; cette licence ne transforme pas les datasets externes traités par l'outil en contenus BSD. — [Dépôt officiel fairmotion](https://github.com/facebookresearch/fairmotion)
- **Motion-X** est distribué sous CC BY-NC-SA et renvoie en plus aux licences des datasets sources, dont plusieurs sont réservés à la recherche non commerciale ; il n'est pas adapté à un produit BARZ redistribuable. — [Site officiel Motion-X](https://motion-x-dataset.github.io/)

### Inferences
- « Open source » doit être appliqué séparément à trois couches : code de l'outil, modèle/poids éventuels, et données de poses. Pour BARZ, seule la licence de la troisième couche autorise l'intégration des presets.
- Les téléchargements communautaires MakeHuman, les conversions non officielles de CMU et les packs republiés sur des sites tiers doivent être évités tant que leur provenance et leur licence ne sont pas conservées. Les sources officielles Quaternius, CMU et 100STYLE suffisent au MVP.

### Gaps
- Aucun texte de licence explicite n'a été trouvé dans le dépôt OpenMoCap 2025 au moment de cette recherche ; son statut peut évoluer et devra être revérifié si le projet devient intéressant plus tard.
