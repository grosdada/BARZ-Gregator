# Acting Lab — diriger un personnage sans devoir apprendre le métier d'acteur

Étude du 16 octobre 2026. Proposition de conception, sans intégration ni modification d'Atlas. Les interactions des maquettes servent à discuter des usages ; elles ne constituent pas un moteur de jeu ou de génération vidéo.

## La proposition en une minute

Un réalisateur écrit : « Elle est triste, mais sourit. » C'est une couleur. Il lui manque encore une action jouable.

Acting Lab l'aide à préciser : « Elle veut qu'il reste. Elle refuse de le supplier. Elle continue de plier un torchon pour occuper ses mains. Quand il annonce son départ, elle arrête le pliage et cherche son regard avant de reprendre une voix ordinaire. »

Le module servirait à **fabriquer une intention lisible dans le comportement**, à explorer plusieurs interprétations d'une scène, puis à en tirer une consigne courte. Sa valeur serait de répondre à cette question : **qu'est-ce que je change pour obtenir une autre prise ?**

Ma recommandation : commencer par une table de direction accompagnée d'une bibliothèque de situations. Garder l'atelier tactile comme deuxième porte d'entrée vers les mêmes choix de jeu. Ajouter la partition temporelle lorsque la scène demande réellement plusieurs étapes.

Nom de travail : **Acting Lab**. « Direction d'acteur » serait le libellé le plus explicite dans Atlas. « Argile » conviendrait au seul mode de manipulation.

## Ce qui existe et ce qui semble manquer

Lecture des sources locales, pas audit exhaustif de l'application installée :

| Présent dans les sources | Utilité actuelle | Complément envisagé |
|---|---|---|
| Acting Gen, bibliothèque de prompts ; familles Action, Emotion, VFX, Dance | Trouver une direction ou une matière à réutiliser | Donner une raison, un destinataire et un déclencheur à cette matière |
| FACS Sheet Generator, sorties d'instructions de jeu et planches | Décrire ou explorer des configurations du visage | Choisir quand et pourquoi une configuration apparaît |
| Ragdoll Studio, source de poses | Préparer l'attitude et le placement du corps | Expliquer ce que le personnage essaie d'accomplir avec cette posture |
| Composition et envoi de prompts vers l'agrégateur | Réunir les ingrédients et préparer l'exécution | Fournir un bloc de performance cohérent et modifiable |

Références locales : `suite-v6/packages/registry/src/defaults.js` ; `suite-v6/apps/atlas/public/tool-workspace.js` ; `suite-v6/apps/atlas/public/assets/HTML/ragdoll-studio.html` ; `docs/PROMPT_ATLAS_BRIDGE.md`.

L'hypothèse produit est donc un **atelier de direction transversal**. Il pourrait enrichir Acting Gen, et ouvrir FACS ou Ragdoll seulement lorsque le choix réclame ce niveau de précision. Le placer d'abord comme compagnon d'Acting Gen éviterait de disperser l'utilisateur entre deux bibliothèques concurrentes.

## Un socle documenté, avec une liberté de création

Le skill local [Acting Performance System](C:/Users/pc/.codex/plugins/cache/personal/claude-skills-for-codex/0.1.0/skills/acting-performance-system/SKILL.md) fournit une matière utile : objectif, obstacle, tactique, sous-texte, écoute, activité physique et continuité. Je m'en sers comme grille d'écriture, pas comme loi sur le comportement humain.

L'Atlantic Acting School enseigne notamment l'action jouée dans l'instant et le travail d'ensemble. Cela soutient le choix d'une entrée par les actions plutôt que par une liste d'humeurs. La transformation de ces notions en champs d'interface est ma proposition. [Atlantic Acting School](https://atlanticactingschool.org/programs/conservatory/)

Le Laban/Bartenieff Institute articule corps, effort, espace et forme. Cette façon de décrire la qualité du mouvement inspire un futur vocabulaire corporel ; elle ne valide pas un calcul d'émotion à partir d'un geste. [LIMS](https://labaninstitute.org/about-lims/)

FACS décrit les mouvements visibles du visage en unités d'action. C'est utile pour spécifier un détail, mais le passage de ces mouvements à une émotion certaine serait abusif. La synthèse de Barrett et collègues rappelle précisément les limites d'une telle inférence. [Présentation FACS](https://www.paulekman.com/facial-action-coding-system/) ; [Barrett et al., 2019](https://pubmed.ncbi.nlm.nih.gov/31313636/)

Conséquence pour le produit : aucune règle du type « regard à gauche = mensonge », « mains fermées = peur » ou « immobilité = domination ». Une même attitude peut servir plusieurs intentions ; l'utilisateur décide ce qu'elle signifie ici. Les distances, les tics et les rythmes dépendent aussi du personnage, du contexte et des conventions culturelles.

Le skill contient des recettes affirmatives comme « les forts sont calmes », « chaque scène doit comporter plusieurs bascules » ou « toujours ajouter de la vie oculaire ». Je les traiterais comme des options de mise en scène. Une comédie peut réclamer l'inverse, une scène contemplative aucune bascule, et une fixation du regard peut être volontaire. La richesse vient du choix, pas du remplissage automatique.

## Six pistes, dont trois mises en maquette

| Piste | Ce que fait l'utilisateur | Ce qu'il gagne | Décision proposée |
|---|---|---|---|
| **Table de direction** | Décrit ce que chacun veut, choisit une manière de l'obtenir | Une scène dirigée sans jargon d'acteur | Premier socle |
| **Argile** | Manipule élan, retenue et endroit où le jeu devient visible | Une exploration sensible et rapide des nuances | Deuxième porte d'entrée |
| **Partition** | Place un événement et la réaction qui lui succède | Un jeu qui évolue avec ce que le personnage apprend | Mode avancé |
| **Cabine d'essais** | Compare trois lectures d'une même réplique, texte inchangé | Des choix réellement différents avant une génération | À associer au socle |
| **Carnet du personnage** | Conserve habitudes, limites, voix et état en sortie de scène | Une continuité entre plans et épisodes | À introduire progressivement |
| **Nouvelle prise** | Indique un défaut observé et un seul changement souhaité | Une correction ciblée et un historique intelligible | Très forte valeur pratique |

Une septième piste, plus lointaine : **le miroir de répétition**. On filme une petite performance de référence, puis on en prépare le transfert vers un personnage. Act-Two documente déjà ce type d'entrée, avec des différences entre image et vidéo de personnage. Cela rend la piste concrète, mais elle dépend d'un service externe et ne correspond pas à une prévisualisation instantanée contrôlée par des curseurs. Aucun accès au compte ni essai de génération n'a été effectué. [Documentation Act-Two](https://help.runwayml.com/hc/en-us/articles/42311337895827-Performance-Capture-with-Act-Two)

## Maquette « Table de direction »

### L'entrée doit rester très simple

L'utilisateur peut commencer par « une femme essaie de retenir quelqu'un sans perdre la face ». L'interface lui propose trois questions :

1. **Qu'est-ce qu'elle veut obtenir de lui ?** — Qu'il reste encore un peu.
2. **Qu'est-ce qu'elle refuse de laisser voir ?** — Qu'elle a besoin de lui.
3. **Qu'est-ce qui la fait réagir ?** — Il dit qu'il doit partir.

Les autres renseignements restent facultatifs : ce qu'elle fait avec ses mains, ce qu'elle sait avant la scène, la présence d'un témoin et ce qui doit rester identique au plan précédent.

Des réponses manquantes peuvent être proposées comme hypothèses modifiables. Une proposition de l'assistant ne devient jamais silencieusement un fait du scénario.

### La scène fil rouge

Nora est dans sa cuisine. Malik est hors champ près de la porte. Elle replie un torchon. Il annonce : « Je dois partir. » Elle répond : « Tu peux rester cinq minutes. » Elle veut qu'il reste sans exposer son besoin. Malik n'a pas encore donné sa décision finale ; Nora ne peut donc pas réagir comme si elle connaissait déjà la fin.

Les trois lectures disponibles gardent les mêmes faits et la même réplique :

| Lecture | Tactique | Comportement proposé | Risque à surveiller |
|---|---|---|---|
| Retenir en douceur | Lui rendre le départ moins immédiat | Elle ralentit le pliage, lui laisse un espace de réponse, propose les cinq minutes simplement | Un sourire romantique ajouté sans raison |
| Le mettre à l'épreuve | L'obliger à choisir clairement | Elle finit son pli, le regarde, attend qu'il prenne la responsabilité de sa réponse | Une agressivité qui remplace le besoin |
| Lui laisser une issue | Se protéger en lui donnant la liberté de partir | Elle rend le passage libre, ses doigts gardent brièvement le tissu, puis se desserrent | Une acceptation définitive prématurée |

Le choix affiche immédiatement deux choses : **ce que le spectateur peut observer** et **le bloc de jeu à joindre au prompt**. Ce qui reste intérieur sert à la direction et ne doit pas encombrer systématiquement le texte final.

### Une sortie courte

Exemple en anglais, bloc de performance seulement :

> Nora keeps folding the tea towel while listening to Malik off-screen. At his announcement that he must leave, the next fold stops halfway. She looks toward him and takes a small breath before replying. She offers the five minutes in an ordinary, practical tone, leaving room for his answer. Her fingertips keep the unfinished fold in place.

La réplique et l'identité vocale seraient placées dans les champs adaptés à la cible, si cette cible les accepte. Une identité de voix décrit un timbre et une façon de parler ; la direction de la scène peut encore en modifier le débit ou le souffle. Une description textuelle identique ne garantit pas une voix identique entre générations.

## Maquette « Argile »

### La bonne matière à modeler : l'effort et ce qui le contient

Deux poignées suffisent pour un premier essai :

- **Élan vers l'autre** : jusqu'où elle tente d'obtenir une réponse.
- **Retenue** : jusqu'où elle contrôle les manifestations de cet élan.

Ce sont des réglages éditoriaux de faible à fort. Les nombres internes servent à positionner les poignées ; ils ne mesurent aucune émotion et ne sont pas des paramètres d'API vidéo.

Une forme souple relie les deux poignées. Quand l'élan monte et que la retenue reste forte, la forme se tend et les consignes proposent une action contenue. Quand la retenue baisse, la demande peut devenir plus visible. Cette forme représente une relation entre deux réglages ; elle n'est ni une simulation du corps ni une preuve de réalisme.

| Élan | Retenue | Lecture possible dans cette scène |
|---|---|---|
| Faible | Forte | Elle présente la possibilité sans insister, puis retourne à son activité |
| Fort | Forte | Elle maintient l'offre pratique ; le pliage interrompu porte l'effort de contrôle |
| Fort | Faible | Elle abandonne le pliage, se tourne franchement vers lui et laisse entendre la demande |
| Faible | Faible | Elle s'autorise une ouverture simple, sans chercher à retenir davantage |

La table est une convention de cette maquette pour Nora. Elle ne doit pas devenir une table universelle des émotions.

### Choisir où cela se voit

Un choix « regard / mains / posture » déplace le signe principal. Dans une future version, l'utilisateur pourrait verrouiller les autres canaux. Exemple : le visage reste égal, mais les doigts serrent le torchon. L'intérêt est de produire une variation contrôlable, pas d'accumuler un tremblement, une larme, une respiration saccadée et trois gestes.

Un changement de canal doit vérifier le cadrage : si les mains sont hors champ, ce signe ne peut pas porter le plan. Un réglage sophistiqué mais invisible n'aide pas le réalisateur.

Une autre variante serait plus littérale : **saisir le poignet du mannequin, orienter son buste ou déplacer sa cible de regard**. Le déplacement donne d'abord une forme corporelle. L'outil propose ensuite plusieurs intentions compatibles : tendre la main peut inviter, demander, arrêter ou rassurer. L'utilisateur choisit celle de sa scène. Cette lecture inverse évite de prétendre qu'un geste contient une émotion unique. Un verrou pourrait conserver le point de contact avec un objet pendant qu'on ajuste le reste du corps. Ce serait une extension à étudier avec Ragdoll, pas une promesse incluse dans les maquettes actuelles.

### Deux horizons pour le « live »

**Accessible sans modèle distant** : les poignées, la forme, une silhouette schématique, les variantes de texte et la comparaison des consignes. Une animation locale du mannequin servirait à comprendre l'amplitude ; sa qualité ne prédit pas le résultat vidéo.

**À explorer séparément** : une prévisualisation incarnée par personnage et un transfert de performance. Cela nécessite une représentation du visage et du corps, ou un modèle distant, une gestion du délai et des essais. Ne pas présenter une image fixe ou une silhouette comme une prise live action calculée en direct.

Le terme « émotion » peut rester une porte d'entrée familière. Si l'utilisateur choisit « peur », on lui demande ce qu'elle provoque ici : cacher, prévenir, fuir, rassurer quelqu'un, continuer malgré elle ? Il obtient ensuite une proposition de comportement qu'il peut refuser.

## Maquette « Partition »

Le jeu est disposé autour des informations reçues. Un changement a une cause et un après.

| Repère indicatif sur huit secondes | Événement | Nora | Malik |
|---|---|---|---|
| Début | La scène est déjà en cours | Plie le torchon et écoute | Hors champ, prêt à partir |
| Milieu | « Je dois partir » | Interrompt le pli ; évalue ce qu'elle peut encore demander | Sa décision finale reste inconnue |
| Fin | « Tu peux rester cinq minutes » | Offre la possibilité, puis attend sans résoudre la scène | Réponse conservée pour le plan suivant |

Les secondes aident à préparer la scène. Le prompt utilise d'abord l'ordre des événements : « quand elle entend… puis… enfin… ». Il ne promet pas le contrôle à l'image près. Un plan très court peut se limiter à un événement et une réaction ; il n'a aucune obligation de contenir trois ou quatre bascules.

Une fonction **« rejouer le même instant depuis l'autre personnage »** serait particulièrement intéressante. Elle conserve l'événement, mais change ce que chacun sait et veut. Dans une scène d'ensemble, les réactions peuvent être distinctes ou décalées ; la synchronisation reste possible si elle est voulue.

Le carnet conserve en sortie : le pli reste inachevé, la demande vient d'être faite, la réponse n'est pas connue. Le plan suivant commence depuis cet état. Un futur mode pourrait signaler que le torchon ou l'état corporel disparaît sans justification.

## La cabine d'essais : des prises, pas des adjectifs

Un bouton « trois lectures » doit modifier une dimension lisible et annoncer ce qui change. Exemple : même scène, même texte, même cadrage ; la tactique varie entre amadouer, tester, laisser une issue.

Des propositions plus surprenantes peuvent être offertes sur demande :

- Elle rit brièvement pour rendre sa demande moins grave, puis constate qu'il ne rit pas.
- Elle se montre excessivement pratique pour éviter d'avouer le besoin.
- Elle lui facilite vraiment le départ tout en espérant qu'il choisisse de rester.

Ces lectures combinent des intentions compatibles avec les faits. L'outil doit éviter d'inventer une trahison passée, un traumatisme ou une attirance qui n'ont pas été fournis.

La comparaison affiche un petit delta : « l'attente après la réplique remplace le sourire ». Cela donne un choix à discuter avant de dépenser une génération.

## « Nouvelle prise » : le levier le plus immédiatement utile

Au lieu de demander « rends-la plus émouvante », l'utilisateur choisit un problème observable :

| Retour utilisateur | Modification proposée | Ce qu'on laisse stable |
|---|---|---|
| Elle grimace trop | Déplacer l'accent vers l'arrêt d'une activité ; visage plus économique | Intention, texte, déclencheur |
| Elle a l'air absente quand il parle | Donner une cible d'attention et une réaction liée au sens reçu | Déroulé et réplique |
| Tout commence trop fort | Commencer par la tactique pratique ; réserver le signe visible au déclencheur | Enjeu et résultat demandé |
| Les mains bougent sans raison | Choisir une seule activité concrète, ou les laisser au repos | Le reste du jeu |
| Tous réagissent ensemble | Assigner une information reçue et une réponse propre à chacun | Événement commun |
| Le personnage change entre deux plans | Réinjecter uniquement les invariants pertinents et l'état de sortie précédent | Cadrage de chaque plan |

Ce sont des hypothèses de correction, à évaluer sur la prise suivante. Un modèle peut échouer à les suivre. La maquette ne contient pas d'analyse automatique de vidéo ; un futur assistant visuel devrait distinguer ce qu'il observe de son interprétation.

## Une bibliothèque de situations jouables

La bibliothèque gagnerait à être indexée par **ce qu'on essaie de faire à quelqu'un** :

- Obtenir : faire avouer, réclamer une place, convaincre de rester, obtenir une permission.
- Protéger : rassurer en ayant peur, détourner une question, cacher une blessure, sauver la face d'un autre.
- Éprouver : vérifier un mensonge, tester une loyauté, provoquer une réponse, attendre une excuse.
- Se séparer : laisser partir sans le vouloir, refuser sans humilier, accepter sans pardonner.
- Jouer ensemble : célébrer en étant jaloux, rire trop tard, comprendre avant les autres, suivre sans croire.
- Tenir une tâche : réparer malgré la douleur, servir malgré la colère, finir un geste après une mauvaise nouvelle.

Chaque carte porterait : situation, objectif, obstacle, tactique, déclencheur, deux indices visibles au maximum par étape dans le mode simple, variante retenue, variante expansive, exemple court et limite d'emploi. Ce plafond est une règle d'édition proposée, pas une norme théâtrale.

Une entrée « je ne sais pas » ouvrirait trois lectures bien distinctes. L'outil doit aider à décider, sans demander d'abord un dossier psychologique complet.

## Ce que ferait le texte, ce que ferait l'IA

| Fonction envisagée | Local et déterministe possible | Assistance de langage facultative |
|---|---|---|
| Parcourir des cartes et conserver des choix | Oui | Inutile |
| Modifier les poignées et afficher une proposition écrite à l'avance | Oui | Inutile |
| Assembler une consigne depuis des phrases contrôlées | Oui | Facultative pour fluidifier |
| Adapter une scène libre, proposer des tactiques nouvelles | Répertoire limité | Utile, avec hypothèses visibles |
| Diagnostiquer un rendu vidéo | Retour manuel utilisateur | Modèle visuel et fichier nécessaires |
| Produire du live action | Non, hors moteur spécialisé | Génération ou transfert séparé |

Cela autorise une première version autonome, sans appel d'API de langage. La liberté d'écriture augmente avec une assistance facultative, mais celle-ci ne serait pas indispensable pour manipuler ou exporter les choix.

Les prompts finaux devraient rester sélectifs. La documentation Runway image-vers-vidéo conseille de se concentrer sur le mouvement et de tenir compte de ce que l'image suggère déjà. J'en déduis un principe de conception : garder le dossier riche dans l'atelier, mais envoyer seulement les comportements utiles au plan. Cette règle devra être adaptée et testée pour chaque famille de modèles. [Guide Runway image-vers-vidéo](https://help.runwayml.com/hc/en-us/articles/48324313115155-Image-to-Video-Prompting-Guide)

## Une future place dans Atlas

Parcours proposé : ouvrir une carte Acting Gen ou partir d'une scène libre → choisir une lecture → ajuster le jeu → joindre le bloc de performance à la composition → envoyer un brouillon à l'agrégateur.

L'atelier posséderait son intention structurée : personnage, objectif, limite, déclencheur, tactique, indices visibles, continuité et exclusions explicitement choisies. Le prompt resterait une projection éditable de cette intention. Un changement de prompt manuel ne devrait pas réécrire les faits du personnage sans action explicite.

La caméra, les costumes et la lumière restent les responsabilités des outils concernés. Le cadrage peut être lu comme contrainte de visibilité. FACS et Ragdoll seraient des outils de détail ouverts depuis un besoin précis, plutôt que des champs obligatoires.

Le contrat d'import actuel vers l'agrégateur est versionné en 1.0 ; il accepte un texte et ignore les champs inconnus. **Il ne faut donc pas supposer qu'il conserverait une future partition de jeu.** Atlas pourrait conserver cette structure localement et transmettre le texte compilé avec un nom de module d'origine. Le transfert structuré complet demanderait une évolution explicite du contrat. Aucune évolution n'est réalisée ici.

## Ordre de travail recommandé, si on décide de poursuivre

**Étape de discussion** : comparer les trois maquettes sur la même scène. Choisir la porte d'entrée la plus naturelle et retirer les réglages inutiles.

**Premier périmètre utile** : trois questions, des cartes de tactiques, trois lectures comparables, un bloc de jeu court et une correction « nouvelle prise ». Pas besoin de visage 3D pour éprouver cette valeur.

**Deuxième périmètre** : poignées élan/retenue, choix du canal visible, verrous et comparaison des différences. L'argile doit faire gagner du temps face aux cartes ; sinon elle reste une jolie métaphore.

**Troisième périmètre** : partition pour plusieurs personnages et continuité entre plans. Puis seulement un essai de transfert de performance, si l'usage le justifie.

Ce sont des étapes de validation, sans estimation de délai ou de budget de développement.

## Comment savoir si l'idée mérite sa place

Tester avec des scènes qui ne jouent pas toutes le drame contenu : une demande cachée, une joie franche, une maladresse comique, une écoute silencieuse, une tâche physique et une scène d'ensemble. Inclure une expression expansive volontaire pour vérifier que l'outil ne transforme pas tout en minimalisme.

Avant tout rendu : vérifier si une personne peu familière de l'acting peut choisir une intention et expliquer la différence entre deux lectures sans apprendre le vocabulaire du métier.

Lors d'un éventuel essai vidéo, conserver le même point de départ, le même cadrage, le même texte et les réglages disponibles ; ne changer qu'une direction. Utiliser plusieurs sorties, même si une graine est disponible, et noter le modèle, sa version et les conditions. Évaluer séparément la clarté de la consigne, son exécution visible, la continuité et la préférence artistique. Un beau texte et un bon rendu sont deux résultats distincts.

Pas de « score de vérité émotionnelle » automatique. Des questions observables suffisent : la réaction suit-elle l'information ? le signe choisi est-il visible ? le geste a-t-il sa place dans la scène ? le personnage garde-t-il les mêmes faits ?

## Ce qui est prêt à discuter

Trois maquettes explorables accompagnent ce dossier. Leurs sorties sont des exemples écrits et des règles locales de démonstration. Elles n'envoient rien à Atlas ni à un générateur.

Le fichier `PROMPTS.md` contient huit consignes réutilisables et des exemples de blocs de jeu. `VERIFICATION.md` consigne les vérifications effectives de cette étude. Aucun rendu de performance n'a été généré et l'efficacité des formulations vidéo reste à éprouver.

Le choix central pour la suite : **l'outil doit aider à choisir une action, à doser sa manifestation et à reprendre une prise.** Les trois maquettes explorent ces gestes de travail avec des interfaces différentes.
