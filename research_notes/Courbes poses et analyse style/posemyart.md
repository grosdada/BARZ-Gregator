# PoseMy.Art et MVP Ragdoll Studio

Recherche du 12 octobre 2026. Observation directe de l’application anglaise et documentation officielle uniquement. Les propositions BARZ ci-dessous sont des recommandations de conception, pas des fonctions existantes vérifiées dans le dépôt. Aucun code applicatif ni actif PoseMy.Art n’a été copié.

## Quelles interactions rendent le mannequin facile à poser ?

### Takeaway

Le principe utile pour BARZ est une boucle courte : choisir une pose proche, sélectionner une articulation visible, ajuster, vérifier sous un autre angle, puis exporter. Les contrôles doivent rester lisibles lorsque la caméra ou plusieurs membres se superposent.

### Cited Findings

- Le tutoriel officiel décrit la sélection par clic sur le personnage ou son icône, des points colorés aux articulations, trois anneaux de rotation et une poignée centrale permettant une rotation libre. Caméra : glisser gauche pour orbiter, droit pour déplacer, molette pour zoomer. Il documente déplacement/rotation/échelle du personnage, miroir de pose, undo/redo et réglage de la lumière. — [Tutoriel officiel](https://posemy.art/how-to-use-posemyart/)
- Observation directe : mannequin gris en T-pose, grille de sol, repères articulaires rouges/bleus/verts, flèches de translation au bassin. Sélectionner son icône révèle poses, transformations, miroir, remplacement du modèle, sauvegarde de pose, mains, groupes, duplication, couleur, visibilité, verrouillage et suppression. — [Application inspectée](https://posemy.art/app/?lang=en)
- Le site annonce IK par déplacement intuitif et FK pour les articulations ; modèles réalistes, anime, animaux, formes simples, transfert de poses entre corps et bibliothèque de mains. — [Fonctionnalités officielles](https://posemy.art/features/)

### Inferences

- MVP recommandé : mannequin procédural BARZ construit avec volumes simples, squelette explicite et poignées assez grandes ; couleur des côtés doublée par des noms gauche/droite pour éviter une dépendance à la couleur.
- Deux niveaux complémentaires : poignées de mains/pieds avec IK à deux segments pour les gestes courants ; rotation FK et champs numériques pour bassin, torse, cou, tête et correction précise. Maintenir un objectif de coude/genou évite les retournements imprévisibles.
- Garder déplacement global et articulation distincts, afficher le nom du membre actif, permettre reset du membre et reset complet, verrouillage caméra, annulation par geste et miroir réversible. Préserver le cadrage pendant l’édition.
- Une option pour maintenir un pied au sol est plus pertinente pour le MVP qu’une simulation physique. Ici « Ragdoll » devrait désigner le mannequin articulé ; chute physique, collisions et gravité seraient un mode ultérieur explicite.

### Gaps

- IK annoncé par l’éditeur mais solveur, limites articulaires, verrouillage effectif des pieds et gestion des collisions non testés. Ne pas les présenter comme des capacités observées.
- Aucun déplacement de joint ni export téléchargé pendant cette inspection : observation du rendu initial et des menus, sans validation fonctionnelle exhaustive.

## Quelles fonctions garder dans le MVP ?

### Takeaway

Construire un éditeur local de pose et de référence, avec sauvegarde rééditable et sortie vers les outils BARZ. La variété des actifs de PoseMy.Art ne constitue pas un prérequis.

### Cited Findings

- L’éditeur annonce plus de 6 300 poses, 5 500 scènes et 2 400 animations. Ces chiffres commerciaux décrivent sa bibliothèque et ne mesurent pas une exigence pour BARZ. — [Fonctionnalités](https://posemy.art/features/)
- Le guide documente copie/collage de pose et de mains, reset d’une articulation, regroupement, attachement d’un accessoire à une articulation et remplacement d’un modèle. — [Guide détaillé](https://posemy.art/blog/ultimate-posemyart-toolkit/)
- La FAQ précise qu’une connexion Internet reste nécessaire, même pour l’application installée. — [FAQ](https://posemy.art/faq/)

### Inferences

| MVP essentiel | Extension après validation d’usage |
|---|---|
| Un mannequin BARZ et proportions contrôlées | Animaux, anatomie détaillée, vêtements, variantes complexes |
| Pose FK + IK mains/pieds, miroir, reset, undo/redo | Physics ragdoll, collisions et animation continue |
| Pose bank locale originale, recherche, favoris | Grande bibliothèque de mocap et retargeting multi-rigs |
| Caméra orbit/pan/zoom, vues face/profil, FOV, lumière simple | Multiples lumières, rendu réaliste, timeline |
| PNG propre, projet JSON, duplication locale d’un acteur | OBJ/GLB et import de modèles arbitraires |
| Envoyer l’image aux Références, envoyer l’acteur au Blocking | Synchronisation bidirectionnelle en temps réel |

- Recommandation : conserver Ragdoll Studio comme module adjacent, centré sur la pose d’un acteur ; Blocking Studio garde la composition du décor, le placement de plusieurs acteurs et les plans. Une duplication simple dans Ragdoll peut aider à comparer des poses ; les scènes complexes relèvent du Blocking.
- Tout le rendu, la bibliothèque livrée et la persistance du MVP doivent fonctionner sans API LLM, abonnement ou téléchargement d’actifs à la première utilisation.
- Une première banque d’environ 20 à 30 poses originales suffit comme hypothèse de conception : debout neutre, marche, assis, accroupi, agenouillé, course, bras tendu, porter, tirer/pousser et quelques intentions de jeu. À valider avec les besoins utilisateurs, pas avec la taille du catalogue concurrent.

### Gaps

- Aucun audit des composants existants de Blocking Studio dans cette recherche. Le choix concret du moteur et des adaptateurs reste à confronter au dépôt par le coordinateur.
- Accessibilité clavier des poignées 3D, performances sur GPU faible et fidélité anatomique demandent des essais BARZ dédiés.

## Quels exports et quelle banque de poses sont utiles ?

### Takeaway

Distinguer une image de référence, une pose réutilisable et une scène éditable. Un seul fichier image ne peut pas assurer la continuité entre Ragdoll et Blocking.

### Cited Findings

- Observation directe : export propose largeur/hauteur, profondeur, Canny, image normale, normales de surface et OpenPose avec ou sans mains ; valeur initiale observée : 512 × 512. Le menu caméra expose capture, reset, verrouillage, FOV (45 dans cette session), sauvegarde de position. — [Application inspectée](https://posemy.art/app/?lang=en)
- Le guide distingue export image avec fond/sol transparents et capture conservant des repères de scène ; il documente sauvegarde de scène, ajout comme groupe ou remplacement, et export OBJ. — [Guide détaillé](https://posemy.art/blog/ultimate-posemyart-toolkit/)
- La bibliothèque permet de chercher une animation et d’en sélectionner une image avec un curseur, pour obtenir une pose statique. — [Tutoriel officiel](https://posemy.art/how-to-use-posemyart/)
- Observation directe : onglets poses/animations, recherche, pagination et compteur gratuit de session. — [Application inspectée](https://posemy.art/app/?lang=en)

### Inferences

- MVP : PNG en dimensions choisies, fond transparent ou uni, aucun gizmo ni UI, mêmes caméra et cadrage que l’aperçu. Une commande séparée de capture avec grille évite une ambiguïté entre export final et vue de travail.
- Stocker les poses dans un schéma BARZ versionné, indépendamment des fichiers images : identifiant stable, titre, tags, rig/version, rotations locales, racine, proportions, miniature, origine et licence. Ajouter catégories, favoris et « mes poses » ; une sélection applique la pose à l’acteur actif, sans changer automatiquement sa position dans le décor.
- Projet JSON distinct : acteurs, pose, transforms, caméra, lumière, paramètres d’export et identifiants d’actifs. Les modèles livrés se résolvent localement par identifiant, sans URL distante implicite.
- Export de squelette/OpenPose et profondeur : deuxième étape utile si un consommateur BARZ les attend. Fixer format, ordre des joints, couleur, visibilité, résolution et gestion des membres hors cadre ; appeler un export « OpenPose » uniquement après validation contre le consommateur visé. Les normales et Canny sont moins prioritaires.
- Reporter OBJ/GLB : formats de géométrie utiles, mais le pont interne de pose doit rester un contrat explicite. Ne pas supposer qu’un fichier géométrique remplace les contraintes, l’état d’édition et l’identification du rig.

### Gaps

- L’extension exacte et le schéma des fichiers de pose/scène PoseMy.Art n’ont pas été examinés ; aucun besoin de les reproduire.
- Format binaire effectif des images, encodage couleur/alpha et compatibilité ControlNet non vérifiés par un export réel.

## Comment contractualiser les sorties locales vers BARZ ?

### Takeaway

Définir trois actions séparées : télécharger un rendu, ajouter ce rendu aux Références et transmettre un acteur éditable à Blocking Studio. Les propositions ci-dessous sont de nouveaux contrats, pas des noms de routes déjà implémentées.

### Cited Findings

- La documentation du concurrent distingue sauvegarde éditable et image du point de vue choisi, ce qui justifie de préserver cette séparation de données. — [Sauvegarde et images de référence](https://posemy.art/poses-reference-for-drawing/)

### Inferences

Contrats proposés à adapter aux interfaces existantes du dépôt :

| Action | Contenu minimal | Accusé de réception et comportement |
|---|---|---|
| Export image | Blob PNG, MIME, dimensions, mode alpha/fond, nom de fichier ; métadonnées de caméra et provenance en accompagnement | Afficher la fin réelle de création du fichier ; erreurs d’encodage visibles |
| Ajouter aux Références | `schema: barz.reference-import`, `version: 1`, `requestId`, `source: ragdoll-studio`, `asset` local, `role: pose`, titre, dimensions, provenance et snapshot de caméra | Retour `assetId` ou erreur ; ne pas lancer une génération ; dédupliquer la répétition du même `requestId` |
| Envoyer au Blocking | `schema: barz.actor-transfer`, `version: 1`, `requestId`, rig/version, proportions, pose articulaire, transform racine, couleur, miniature et provenance ; caméra en option distincte | Ajouter un nouvel acteur par défaut ; retour `actorId`, avertissements d’adaptation ou refus explicite de rig incompatible |

- Convention à documenter avant implémentation : unités (mètres), axe vertical, main du repère, ordre des composantes quaternion, rotations locales au parent, pose de repos et ordre/identifiants des articulations. Par exemple : repère droit Y-up, quaternions `[x,y,z,w]`, rig `barz-humanoid-v1`. Le choix doit correspondre au moteur existant, avec un adaptateur si nécessaire.
- Un transfert de pose vers un acteur existant doit être une action explicitement ciblée, différente de « Ajouter au Blocking ». Conserver la racine de destination lors d’une simple application de pose.
- Le bouton Références transmet une copie locale durable du PNG. Éviter un simple object URL temporaire ou un chemin absolu arbitraire comme contrat durable. Utiliser le stockage d’actifs local existant et des identifiants validés.
- Si le transport utilise `postMessage`, contrôler origine et source, valider le schéma et les tailles, puis acquitter par `requestId`. Si IPC local existe déjà, utiliser son mécanisme typé. Aucune route ne doit exécuter du code ou charger automatiquement une URL contenue dans une pose.
- L’import n’écrase pas une scène. Un succès veut dire donnée enregistrée et consommable, pas seulement événement envoyé. En cas d’erreur, garder le document Ragdoll ouvert.
- Vérifications prioritaires : round-trip de pose identique ; miroir appliqué deux fois revient à l’original ; transfert conserve taille, latéralité et orientation ; capture correspond au cadrage ; double clic ne duplique pas l’actif ; utilisation complète hors connexion.

### Gaps

- Les API actuelles de Références et de Blocking n’ont pas été vérifiées ici ; ne pas présenter les noms de schémas proposés comme des contrats existants.
- Le contexte mémoire mentionne une préférence antérieure pour les ponts versionnés de Prompt Atlas ; c’est un précédent d’architecture, non une preuve de l’état actuel des API Ragdoll/Blocking.

## Quels risques techniques et de licence éviter ?

### Takeaway

S’inspirer des interactions, puis implémenter indépendamment avec des actifs dont BARZ possède les droits de redistribution. La licence des images ne donne pas la licence des maillages, rigs ou bibliothèques du concurrent.

### Cited Findings

- Les conditions permettent les captures/images produites avec l’outil pour usage personnel ou commercial, sans attribution obligatoire. Elles interdisent copie/modification des matériaux et rétro-ingénierie du logiciel dans la licence générale. — [Conditions officielles](https://posemy.art/terms-of-service/)
- Les modèles 3D ne peuvent pas être revendus ou redistribués, affichés sur un autre site ou utilisés dans une application commerciale. L’usage comme base commerciale requiert une transformation rendant le modèle méconnaissable ; une licence différente peut être demandée à l’éditeur. — [Conditions officielles](https://posemy.art/terms-of-service/)

### Inferences

- Option la plus simple pour ce projet : mannequin procédural propre à BARZ, poses écrites/testées en interne et miniatures rendues localement. Ne pas exporter les mannequins PoseMy.Art pour les intégrer au produit, même comme point de départ.
- Ne pas scraper ou redistribuer la banque de poses, ses vignettes, ses animations ou ses fichiers de scènes. L’autorisation des images utilisateur ne constitue pas une licence de bibliothèque réutilisable dans BARZ.
- Pour une future bibliothèque tierce, conserver auteur, licence, version et preuve du droit de redistribution avec chaque asset. Vérifier séparément mesh, textures, animations et thumbnails.
- Risques d’implémentation : singularités IK, proportions qui déplacent les contacts, inversion des coudes/genoux, miroir calculé par échelle négative, divergence caméra entre aperçu et export, pertes d’état au rechargement et modèles externes trop lourds. Les traiter avec conventions explicites, limites raisonnables, instantanés d’annulation et validation des imports.
- La simplicité locale est une recommandation de produit ; elle ne requiert aucun clone du code, aucune interrogation des API privées de PoseMy.Art ni aucun contournement Premium.

### Gaps

- Cette recherche rapporte les conditions publiées ; elle ne constitue pas une analyse juridique exhaustive de leur portée ou de la protection d’une pose isolée. Toute réutilisation substantielle d’un actif PoseMy.Art demanderait une autorisation écrite adaptée.
- Aucun droit précis de redistribution d’une bibliothèque tierce n’a été évalué : le MVP proposé n’en dépend pas.
