# Build — bibliothèques éditables : contrat Astra pour Sol

Date : 11 septembre 2026. Base inspectée : Atlas 0.4.0, lot 3C.
Statut : architecture décidée ; implémentation à réaliser sous Sol High.

## Résultat attendu et périmètre

Dans Build, sélectionner un atelier puis une bibliothèque pour ajouter, modifier,
dupliquer, classer, masquer et restaurer ses prompts. Créer une bibliothèque
personnelle dans un atelier existant ou personnel ; la même interface la rend
utilisable immédiatement. Les titres et les déplacements ne changent aucun ID.
Les modifications appartiennent au setup actif et à ses versions enregistrées.

Pilote obligatoire : BZ Goodies + une bibliothèque personnelle indépendante.
Les outils codés Enhancer/Imperfection gardent leur adaptateur. Deck, Backstage
et Build gardent leurs invariants. Les recettes autonomes existantes continuent
à fonctionner. Aucun besoin de lire le corpus BZ Image DNA pour ce lot.

L'éditeur initial propose titre, description, catégorie, ordre, type de sortie,
texte du prompt et détails optionnels. Il utilise le compilateur existant et
son interpolation `{{scene}}`. Les formulaires arbitraires et règles conditionnelles,
packs téléchargeables, distribution et projets Paint/montage sont des lots suivants.

## Audit de l'existant : preuves et conséquences

1. `RegistryStore` contient déjà ateliers, outils, placements, recettes personnelles
   et overrides. Ses mutations valident l'état effectif et écrivent un fichier
   atomiquement. Il est le propriétaire adapté des contenus de bibliothèques.
2. `tool-configurations.local.json` contient les saisies/navigation et les presets
   des outils. Les versions et duplications le copient ; une banque de prompts
   ne doit pas être enfouie dans ce fichier de réglages.
3. Le reset HTTP appelle `store.resetDefaults`, puis une boucle indépendante de
   `saveToolConfiguration`. Le backup de registre n'inclut pas les réglages.
   `audit-build-library.mjs` reproduit : détail personnel, reset Look Library,
   restauration du backup, détail toujours absent. Ce défaut doit être corrigé.
4. `restoreVersion` écrit le registre avant les réglages. La sonde injecte un
   échec I/O sur la seconde écriture et reproduit un état partiel : titre ancien
   restauré, réglages du setup précédent conservés. Le verrou en mémoire ne rend
   pas deux fichiers atomiques ; prévoir la récupération décrite ci-dessous.
5. La prévisualisation du reset ignore actuellement les réglages. La liste des
   outils à réinitialiser est codée avec les IDs d'ateliers : elle ne suit pas
   correctement les placements lorsqu'un outil est déplacé ou partagé.
6. Goodies reste spécialisé dans routes, renderer, IDs, validation et compteurs.
   Le nom `prompt-library` existe, mais ne constitue pas encore un moteur générique.
7. Recherche VHS : sélection 1980s, `activeCategory` encore 1930s, copie de catégorie
   1930s. Reproduction enregistrée ; la portée des actions doit être explicite.
8. `saveNow()` capture le setup et l'outil mais utilise ensuite une révision mutable ;
   l'échec est absorbé et ne garantit pas qu'une navigation interrompe le changement.
   Les nouvelles opérations Build doivent attendre un flush réussi et conserver
   le brouillon en cas de conflit. Vérifier les chemins existants de navigation.

Commande reproductible (uniquement dossiers temporaires, aucun appel fournisseur) :

```powershell
node suite-v6/migration/reviews/audit-build-library.mjs
```

Cette sonde observe les défauts de la base ; ses résultats ne sont pas des
assertions du comportement souhaité. Les futurs tests vérifieront leur correction.

## Modèle de données décidé

Ajouter le package `packages/prompt-libraries` pour validation, résolution des
catalogues et compilation. Il dépend de `contracts` et `prompt-runtime`, sans
dépendre d'HTTP, des fichiers de revue, de Build ou d'un outil particulier.
Les catalogues fournis sont des données runtime, chargées par le registre.

Une bibliothèque a le même ID que son outil (relation 1:1). Garder `banana-helper`.
Son outil utilise `kind: builtin`, `adapterId: prompt-library` : ici builtin désigne
le renderer codé, `origin` distingue la bibliothèque livrée de celle créée par
l'utilisateur. Ne pas ajouter un quatrième kind uniquement pour cette fonction.
Documenter cette distinction dans le contrat Tool et valider la relation 1:1.

```js
Library = { id, title, categories: [{ id, title, order }], entries: [Entry] }
Entry = { id, categoryId, order, description, recipe }
// recipe : contrat Recipe 1.0 existant ; recipe.title est le titre de la carte.
// origin et isModified sont calculés, jamais acceptés comme preuve du client.
```

Les IDs d'entrées et de catégories sont locaux à leur bibliothèque. Une référence
complète est `(libraryId, entryId)` ; déplacer/renommer ne change jamais ce couple.
La recette embarquée dans Entry n'est pas recopiée dans `registry.recipes` :
celui-ci reste destiné aux outils-recettes autonomes. Une entrée n'est ni un
onglet ni un Tool supplémentaire. Les recettes existantes restent intactes.

Le registre effectif expose `libraries`. Les defaults contiennent Goodies ;
l'overlay de chaque setup ajoute ces champs :

```js
customLibraries: [], // Library complètes, sans contenu fourni recopié
libraryOverlays: {
  'banana-helper': {
    categoryOverrides: {}, // titre/ordre de catégories fournies
    customCategories: [],
    entryOverrides: {}, // { entryId: { baseFingerprint, entry: Entry } }
    customEntries: [],
    hiddenEntryIds: [] // entrées fournies OU personnelles, toujours conservées
  }
}
```

Pour une bibliothèque personnelle, modifier sa définition dans `customLibraries` ;
les masquages peuvent employer le même overlay. Garder un seul emplacement
canonique par donnée. Le titre de bibliothèque vient du Tool effectif : le resolver
l'applique à Library.title afin d'éviter deux titres concurrents.

Une modification d'entrée fournie stocke l'entrée complète et l'empreinte de
sa base. Les petits objets restent simples à valider et ne dépendent pas d'un
patch de texte fragile. La version de recette est incrémentée côté serveur pour
un changement de contenu ; l'ID reste stable. Une duplication crée de nouveaux
IDs d'entrée/recette et devient personnelle. Ne jamais utiliser le titre comme clé.

Le resolver produit entrées actives, entrées masquées et diagnostics. Il trie par
ordre, puis origine fournie avant personnelle, puis ID pour les égalités.
Les catégories fournies sont renommables/réordonnables, sans suppression dans
ce lot. Une catégorie personnelle ne se supprime que si aucune entrée active
ou masquée ne la référence ; proposer d'abord le déplacement de ces entrées.
Une bibliothèque sans placement demeure accessible dans « Outils non placés ».
Retirer un placement ne supprime ni la banque ni ses prompts.

## Compilation et saisies

Le catalogue effectif est résolu côté serveur pour chaque compilation et copie.
Le client envoie des IDs et des valeurs, jamais un catalogue à faire confiance.
Les 77 recettes Goodies sont converties une fois dans les defaults : leur texte
final inclut exactement le suffixe relu. Ce suffixe n'est pas ajouté automatiquement
aux nouvelles recettes personnelles. Toutes les 39 fixtures doivent rester identiques.

Le lot prend en charge une sortie et zéro ou un champ texte `scene` par nouvelle
carte. Le formulaire affiche un bouton « Insérer les détails » et le marqueur
`{{scene}}`. Détails max 4 000 caractères ; valeur vide Goodies = `[Details]` avec
trim périphérique historique. Une nouvelle carte utilise par défaut une chaîne
vide, sans trim implicite ; son défaut est déclaré dans la recette. Les autres
formes de Recipe demeurent valides pour les outils autonomes, mais ne sont pas
converties silencieusement par cet éditeur simplifié.

Configuration runtime de bibliothèque : reprendre `activeCategory`, `searchQuery`,
`selectedEntryId`, `detailsByPrompt` pour conserver les setups Goodies actuels.
Les détails restent associés aux IDs connus, même masqués. Une sélection cachée
retombe sur la première entrée visible ; une banque vide utilise `null` et désactive
copie/envoi. Ne pas écrire une normalisation pendant un GET. La configuration
peut être réconciliée lors de sa prochaine sauvegarde ou d'un commit composite.

Après recherche, « Copier la catégorie » cible la catégorie de l'entrée sélectionnée
et l'indique dans son libellé. En l'absence de sélection, l'action est désactivée.
« Tout copier » signifie toutes les entrées actives de la bibliothèque, sans
détails ; une recherche ne modifie pas cette portée. Les entrées masquées sont
exclues. Compteurs et toasts sont calculés depuis le résultat effectif.

Chaque réponse de compilation inclut setupId, libraryId, registryRevision et les
sorties. Le client ignore les réponses d'une ancienne sélection/ancienne requête.
Copie et envoi compilent un snapshot de la sélection actuelle ; aucune sortie
ancienne encore affichée ne doit être envoyée. `text` reste copiable mais n'est
pas envoyé comme génération. Image/vidéo/musique suivent le bridge existant.

## API, conflits et validation

Sous `/api/v1/libraries`, prévoir les opérations nommées suivantes :
création, lecture de catalogue, ajout/édition/duplication d'entrée, masquage,
restauration, ajout/édition/suppression de catégorie vide, réordonnancement,
prévisualisation/compilation. Les mutations de contenu passent par RegistryStore
et AtlasSetupStore ; configuration et compilation passent par le resolver commun.
`expectedSetupId` + `expectedRevision` sont obligatoires pour le contenu.
Les saisies utilisent aussi `expectedToolRevision` et la révision de catalogue
ayant servi à les valider. Les opérations composites vérifient les deux révisions.

Une création de bibliothèque enregistre Tool, Library, catégorie initiale et
Placement dans la même transaction de registre. Exposer les méthodes de placements
existantes pour changer/ajouter/retirer la présence d'une banque dans les ateliers.
Valider le type d'adaptateur au serveur ; la seule présence d'un ID ne donne pas
accès aux outils codés. Pas de routes ouvertes à des chemins/modules arbitraires.

Valider les clés exactes, IDs réservés (`__proto__`, `constructor`, `prototype`),
doublons, références, templates et limites avant toute écriture. Utiliser Map ou
des accès à propriétés propres pour les tables indexées par IDs. Réutiliser
les plafonds Recipe ; bibliothèques limitées à 64 catégories et 512 entrées chacune,
plafond global de registre effectif 2 MiB inchangé. Les entrées masquées comptent.
Un refus de taille garde l'état précédent et le brouillon de l'éditeur.
Requêtes max 512 KiB : envoyer des opérations ciblées, pas une bibliothèque entière.

Conflit 409 : afficher « Ce setup a changé dans une autre fenêtre », conserver
le texte en cours et proposer rechargement ou duplication après rechargement.
Ne jamais actualiser la révision puis rejouer automatiquement une écriture entière.
Le flush des saisies doit retourner succès/échec ; avant changement de setup,
version, reset ou sortie de l'éditeur, attendre la réussite ou un abandon explicite.

## Reset, backups et commits de setup

Règles de produit :

| Action | Contenu fourni | Contenu personnel | Saisies |
| --- | --- | --- | --- |
| Supprimer une entrée | Masquée, restaurable | Masquée, restaurable | Conservées par ID |
| Restaurer une entrée masquée | Rendue visible avec son override | Rendue visible | Conservées |
| Revenir à l'original | Override supprimé, entrée visible | Action absente | Conservées |
| Réglages par défaut | Overrides et masquages fournis retirés | Créations et masquages personnels conservés | Valeurs par défaut du périmètre |
| Restaurer une version complète | Snapshot de l'overlay | Snapshot exact | Snapshot exact |

Le reset crée d'abord un checkpoint COMPLET du setup (overlay et réglages).
Son aperçu calcule exactement les outils/banques affectés et les créations
conservées. Pour un atelier, la portée inclut les outils effectivement placés
dans cet atelier avant reset et ses placements intégrés à rétablir. Dédupliquer
les IDs. Un outil partagé reste un seul outil : annoncer les autres ateliers
concernés dans l'aperçu. Un reset global inclut aussi les outils non placés.
Les presets personnels Imperfection restent préservés comme aujourd'hui.

Conserver les deux fichiers actuels mais centraliser les opérations composites
dans AtlasSetupStore. Supprimer la boucle de reset indépendante du serveur.
Ajouter un journal de transaction atomiquement publié par setup pour reset,
restauration de version et migrations à plusieurs fichiers :

1. Sous le verrou de coordination, vérifier setup et toutes les révisions ; construire
   et valider les deux états candidats en mémoire, y compris leurs relations.
2. Écrire un checkpoint complet immuable. Un échec interrompt sans changement actif.
3. Publier atomiquement un journal contenant transactionId, états avant/après,
   révisions et référence au checkpoint. Cette publication est le point de commit.
4. Appliquer les deux états après par écritures atomiques, puis clore le journal.
   Tant qu'un journal engagé subsiste, aucun lecteur ne sert un état intermédiaire.
5. Au démarrage ET avant les accès setup, terminer idempotemment les journaux
   engagés. Après un échec d'application, renvoyer une erreur récupérable indiquant
   le transactionId ; ne pas prétendre que rien n'a changé. Le client recharge
   après récupération, sans rejouer l'opération. Ne pas avaler une erreur I/O.

Les journaux restent internes : aucun chemin transmis par le navigateur.
Tous les accès publics au setup participent à cette coordination, avec helpers
internes déjà verrouillés pour éviter les acquisitions imbriquées. Le serveur
local unique reste la frontière de concurrence ; plusieurs processus écrivains
sur le même dossier ne sont pas pris en charge par le verrou en mémoire actuel.

Enregistrer une version nécessite le flush du navigateur puis les révisions
registre ET réglages. Restaurer augmente les révisions actuelles ; ne jamais
remettre les anciens compteurs (un ancien onglet doit rester périmé).
Valider sémantiquement le snapshot complet avant de publier le journal.
Les anciens backups « registre seul » restent lisibles mais leur portée est
affichée : organisation/contenu seulement, aucun rétablissement des réglages.
Les nouvelles sauvegardes de reset pointent sur le checkpoint complet.

## Compatibilité et mise à jour des defaults

Ajouter Registry/Overlay 1.1 pour les bibliothèques. Une fonction de migration
pure convertit uniquement le couple connu 1.0 / `6.0.0-foundation.1` vers le
nouveau schéma/defaults versionné : ajoute `customLibraries: []` et
`libraryOverlays: {}`, conserve absolument tout le reste, valide l'état effectif.
La configuration Goodies actuelle reste compatible ; ne pas réinitialiser les
detailsByPrompt. Migrer aussi les snapshots historiques en mémoire à la lecture,
sans réécrire leur fichier immuable. Refuser proprement les versions inconnues.

L'activation disque utilise checkpoint + journal et conserve les sources.
Dupliquer un setup copie contenus, masquages et saisies sous un nouvel ID.
Un nouveau setup commence aux defaults. Les changements de defaults suivent
une table explicite de compatibilité ; ne pas ignorer `defaultsVersion` ni le
changer sans migration (le lot 3C a déjà rencontré ce blocage au démarrage).

Si une base d'entrée change alors qu'un override existe, conserver l'override
et signaler l'empreinte divergente. Une entrée de base disparue conserve un
override orphelin dans l'overlay et les historiques ; ne pas le jeter ni casser
tout le setup. Afficher un diagnostic permettant de dupliquer en entrée personnelle.
Le resolver doit distinguer diagnostics de base disparue et requête d'édition
invalide. Aucune mise à jour de fournisseur ou lecture DNA dans ce lot.

## Interface et séquence de livraison Sol

Build conserve la liste d'ateliers. Dans le panneau atelier : outils placés,
« Nouvelle bibliothèque » et accès aux outils non placés. Sélectionner une banque
ouvre catégories/cartes puis un éditeur avec Enregistrer/Annuler et aperçu.
Badge « Personnalisé » sur un contenu fourni modifié ; filtre « Masqués » pour
restauration. La suppression d'une carte explique qu'elle reste récupérable.
« Revenir à l'original » est distinct des réglages par défaut du setup.

Le renderer devient `renderPromptLibrary(tool, effectiveCatalog)` ; aucun nom,
ID ni compteur Goodies codé en dur. Les ateliers ordinaires ouvrent cet outil
comme aujourd'hui et permettent copie/envoi. Les créations dans Build doivent
être utilisables sans redémarrage. Garder le style graphite/orange existant.

Livrer sous Sol High dans cet ordre, avec un statut de lot à chaque étape :

1. **4A — récupération** : checkpoint complet, journal/récupération, validation
   et révisions composites, aperçu/reset basé sur les placements, flush UI.
2. **4B — domaine** : schéma 1.1 + migration, resolver pur, opérations de
   bibliothèques, catalogue Goodies déclaratif et API générique.
3. **4C — éditeur** : Build, renderer générique, contenus personnels,
   masquage/restauration, copies et pont ; contrôle navigateur de bout en bout.

Tests décisifs : interruption à chaque étape d'un commit puis redémarrage ;
backup complet après reset ; conflit d'une fenêtre n'ayant modifié que les
réglages ; bibliothèque partagée/déplacée ; setup/versions antérieurs à 1.1 ;
création et override Goodies puis reset gardant les prompts personnels ;
masquage/restauration avec détails ; banque vide ; catégorie supprimée référencée ;
limites/IDs réservés/texte littéral ; toutes les fixtures Goodies ; recherche VHS
et copie de la catégorie sélectionnée ; saisie puis changement immédiat de setup ;
création d'une deuxième banque sans changer le code ; envoi conforme au média
sans génération. Injecter des répertoires temporaires, aucune dépense fournisseur.

La passe Astra s'arrête à ce contrat et à la sonde d'audit. Revenir sur Sol High
pour 4A ; n'appeler Astra de nouveau qu'en présence d'une décision de domaine
non couverte par ce document ou avant la prochaine famille de prompts à relire.
