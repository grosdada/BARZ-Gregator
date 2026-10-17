# Architecture proposée — Prompt Atlas V6 / Barz Suite

## 1. Frontières des applications

Atlas et l'agrégateur conservent leurs interfaces et leurs responsabilités. Atlas garde notamment ses APIs de rédaction/vision et ses outils de Backstage ; l'agrégateur possède les connecteurs de génération image/vidéo/son et le suivi fal. Une clé LLM Atlas n'est pas remplacée par une clé fal.

L'agrégateur ne sera pas chargé dans une iframe : ses protections actuelles `frame-ancestors 'none'` et `X-Frame-Options: DENY` restent en place. Un lanceur commun ouvre les applications dans des fenêtres/vues indépendantes. Le transfert reste un bouton « Send to Aggregator », pas une fusion des écrans.

Arborescence de travail cible, à créer à côté du code actuel sous `suite-v6/` :

```text
apps/
  atlas/                 shell, Build, ateliers et adaptateurs
  aggregator/            génération, assets, dépenses
  desktop/               lanceur Electron et cycle de vie des services
packages/
  contracts/             schémas versionnés + validateurs + fixtures
  registry/              ateliers, outils, placements, overrides
  prompt-runtime/        compilation des recettes sans code
  library-format/        import/export et validation des packs
tests/                    compatibilité, migration et intégration
```

Conserver les modules JavaScript actuels et une organisation npm workspaces. Aucun passage global à React, aucun nouveau moteur de base de données ou framework n'est requis pour obtenir la modularité. Extraire progressivement le code, ne pas effectuer une copie monolithique suivie d'une réécriture totale.

## 2. Registre : ateliers, outils et placements

Identifiants stables, indépendants des noms et de l'ordre. Conserver les identifiants hérités pour les favoris, liens et projets. Un outil peut figurer dans plusieurs ateliers : distinguer `Tool` de `Placement`, plutôt que lui imposer un seul parent.

| Entité | Rôle |
| --- | --- |
| Workshop | Onglet configurable, titre, icône, ordre |
| System tab | Deck, Backstage et Build ; non renommables, non supprimables, non déplaçables |
| Tool | Recette, outil codé ou adaptateur hérité, identité canonique unique |
| Placement | Présence et ordre d'un outil dans un atelier |
| Recipe | Champs de saisie, contenus et règles déclaratives de composition |
| LibraryPack | Ensemble installable de recettes/contenus, sans code exécutable |
| User overlay | Ajouts et personnalisations, séparés des defaults livrés |

Ordre système : Deck en premier ; les six ateliers existants, puis les ateliers ajoutés selon l'ordre utilisateur ; Backstage et Build en fin. Les onglets système restent visibles même lorsque les autres sont réordonnés.

Trois types de Tool :

- `recipe` : banque de prompts ou générateur déclaratif, éditable dans Build.
- `builtin` : logiciel avec comportement spécialisé ; Build peut gérer ses placements autorisés, pas remplacer son code. Les outils de Backstage restent dans Backstage.
- `legacy` : page existante temporairement conservée ; adaptateur d'entrée/sortie explicite, sans exécuter du JavaScript utilisateur dans Build.

Build ne crée pas un nouveau Paint Studio sans code. Il crée des ateliers, des banques, des formulaires et des assembleurs de prompts. Les ateliers sont des regroupements ; leurs renommages ne modifient aucun contenu.

## 3. Recettes et bibliothèque de prompts

Une recette possède une révision, des champs typés (texte, choix, nombre, booléen, référence), des valeurs par défaut et une sortie déclarée. La première version du runtime permet interpolation littérale `{{fieldId}}`, conditions simples et concaténation ordonnée. Aucune fonction arbitraire, `eval`, expression JavaScript ou URL de script dans les packs.

Les chaînes anglaises des prompts sont des données à préserver. Ne pas traduire, raccourcir ou « améliorer » pendant la migration. Les générateurs complexes conservent d'abord leur adaptateur et leurs tests de sortie ; ils deviennent déclaratifs uniquement si toutes leurs possibilités sont représentables sans perte.

Les recettes à plusieurs sorties déclarent chaque sortie séparément. Ne pas concaténer silencieusement plusieurs plans en un prompt unique. Proposer l'envoi du plan sélectionné ou plusieurs brouillons ; la compilation vers un séquenceur Director sera une intégration explicitement testée, pas une hypothèse.

Les appels IA de rédaction sont une capacité codée facultative ; la recette décrit les champs, les textes système et le résultat attendu, mais ne reçoit jamais la clé fournisseur. Toute dépense nécessite une action explicite de l'utilisateur.

## 4. Defaults, personnalisation et restauration

Séparer le snapshot livré, versionné et immuable, de l'overlay utilisateur. Calculer l'interface effective à partir des deux. Persister côté serveur dans le dossier utilisateur : un cache navigateur n'est pas la source de vérité.

Les mutations du registre sont transactionnelles avec `expectedRevision` : refuser une écriture périmée avec conflit `409`, valider les références puis sauvegarder atomiquement. Deux fenêtres ne doivent pas s'écraser silencieusement.

« Revenir aux réglages par défaut » :

1. Choisir l'atelier courant ou tous les réglages intégrés.
2. Afficher exactement les titres, ordres, options et overrides concernés.
3. Créer une sauvegarde récupérable ; si elle échoue, ne rien modifier.
4. Réinitialiser les personnalisations des éléments intégrés du périmètre.
5. Conserver les ateliers et recettes créés par l'utilisateur ; leurs placements restent valides, après les placements intégrés si nécessaire.

Jamais de suppression de prompts personnels, clés, Deck/favoris, médias, références, collections, projets Paint/montage ou historique de dépenses par ce bouton. La suppression explicite d'un atelier propose de conserver ses outils non placés dans Build. La suppression d'un placement ne supprime pas l'outil. Une mise à jour des defaults conserve les overrides et signale les conflits ; elle ne fait pas de reset automatique.

### Setups nommés et versions utilisateur

Un backup technique n'est pas un setup créatif. Ajouter une entité `AtlasSetup` avec ID stable, nom choisi par l'utilisateur, dates, révision et version des defaults de départ. Un setup contient l'overlay configurable d'Atlas : ateliers personnalisés, noms et ordre, recettes personnelles, placements et réglages des outils configurables. Deck, Backstage et Build restent des onglets système ; clés API, médias, projets Paint/montage, historique de dépenses et fichiers de l'agrégateur restent globaux et ne sont jamais dupliqués avec un setup.

Chaque setup actif est persisté comme espace de travail. L'action « Enregistrer une version » crée un checkpoint immuable et nommé de ce setup ; « Enregistrer sous un nouveau setup » le duplique sous une nouvelle identité. L'utilisateur peut donc maintenir par exemple un setup image, un setup vidéo et un setup expérimental, puis revenir à une version antérieure sans toucher aux autres.

UI Build prévue : sélecteur du setup actif, Nouveau, Dupliquer, Renommer, Enregistrer une version et Historique. Le passage vers un autre setup affiche ce qui change et revient au précédent en cas d'échec de chargement. La suppression demande confirmation et refuse de supprimer le dernier setup ; une corbeille récupérable est préférable à une suppression immédiate.

Chaque version enregistre provenance et empreinte de son overlay. Restaurer une ancienne version crée d'abord un checkpoint de l'état courant et une nouvelle révision active : l'historique reste linéaire et aucune restauration ne détruit la suite. Les backups automatiques de récupération restent séparés et sont conservés même si un setup est renommé.

Les mises à jour des defaults sont fusionnées séparément dans chaque setup au premier chargement de celui-ci. Les conflits sont signalés setup par setup. Import/export d'un setup utilise un paquet de données validé, sans secrets ni code exécutable.

## 5. Pont unique, adapté par outil

Conserver la compatibilité avec [le contrat actuel 1.0](../PROMPT_ATLAS_BRIDGE.md). APG est actuellement le seul outil branché. Le bouton commun s'appuie sur un SDK avec un adaptateur de sortie par outil, pas une recherche du texte dans une iframe au hasard.

Le SDK recueille un instantané du prompt final, exclusions, type de média, paramètres, origine (outil/recette/révision) et références ordonnées. Au niveau utilisateur : statut d'envoi, erreur lisible, réessai sans doublon et lien « Ouvrir le brouillon » si l'ouverture de fenêtre est bloquée.

Les fonctionnalités nouvelles (provenance détaillée, pièces jointes, idempotence, plusieurs brouillons) nécessitent une négociation de capacités et un contrat validé des deux côtés. Ne pas simplement ajouter des champs au 1.0 actuel : certains champs inconnus sont ignorés. En présence d'un ancien récepteur, utiliser le mode texte compatible et annoncer les références non transférées.

Le modèle suggéré est une intention, pas un endpoint fal déduit d'un nom. En cas de modèle absent, mode incompatible ou correspondance ambiguë, demander un choix dans l'agrégateur. Ne pas utiliser le premier résultat d'une recherche partielle pour générer.

L'image référencée est identifiée par son ID stable ; l'ordre et l'association aux mentions `@imageN` font partie de l'instantané. Ne pas modifier aveuglément les mentions par remplacement de texte. Un asset absent est marqué missing et bloque la génération qui en dépend. Pour les images Atlas locales, une étape de transfert binaire autorisé est nécessaire ; un chemin disque ou un Blob URL d'un autre processus n'est pas une référence portable.

L'agrégateur enregistre le brouillon, rend ses paramètres visibles et ne déclenche jamais la génération au moment de l'import. Conserver l'instantané utilisé pour Recreate. Aucun secret n'apparaît dans une URL, dans le payload du prompt ou dans les journaux.

## 6. Exécution, stockage et migration

Un seul lanceur Electron orchestre les composants installés, chacun avec son serveur local et ses routes `/api` existantes. Garder des origines distinctes pour éviter une refonte immédiate de toutes les URLs absolues. Le lanceur découvre les ports effectifs et fournit la connexion au SDK ; le port 4317 ne doit plus être codé en dur dans tous les outils.

Mode navigateur de développement : ports usuels 3783/4317. Mode suite : ports réservés ou disponibles sous contrôle du lanceur, avec identité/health-check. Ne jamais tuer un processus inconnu pour récupérer un port. Les métadonnées V6 vivent sur disque côté serveur et survivent à un changement de port. Les projets des outils hérités doivent disposer d'une migration explicite avant de dépendre de ce fonctionnement.

Les données navigateur V5 (localStorage/IndexedDB) appartiennent à leur origine/profil. L'Electron existant utilise un port potentiellement variable : une simple copie des fichiers applicatifs ne récupère pas ces données. Prévoir un export assisté depuis l'instance V5 contenant les données, avec manifest, fichiers et compte-rendu des éléments non récupérés. Ne pas prétendre retrouver automatiquement tous les anciens profils.

Installation : code immuable dans le répertoire choisi ; configurations/registre/projets sous `%APPDATA%\BARZ Suite 6`, gros médias dans un dossier utilisateur configurable. Aucun stockage durable dans Program Files ou le dossier de code. Migrer par copie vérifiée, jamais par déplacement destructif. Conserver V5 et sa configuration tant que la recette de migration n'est pas validée.

Barz doit recevoir son chemin de données et exposer un cycle `start/stop`, au lieu de toujours prendre `data/` à côté du serveur. Préserver les IDs `generated:<jobId>:<index>` et `resource:<resourceId>`, les collections et les sets ; le coffre de clés se migre séparément sans exposition de son contenu. Toutes les générations ne disposent pas nécessairement d'une copie média locale : le rapport distingue URLs distantes et fichiers disponibles.

Les APIs applicatives écoutent en loopback. La caméra téléphone Atlas, si utilisée, conserve un service réseau distinct, opt-in, avec gestion des ports et arrêt propre. Réutiliser aveuglément le démarrage HTTPS actuel peut entrer en conflit avec l'installation V5 sur 3784.

Sécurité du pont : accepter une origine locale ne suffit pas à autoriser toutes les écritures. Broker suite authentifié/capacités limitées ; pour les instances navigateur indépendantes, appairage local explicite et protection des mutations. Contrôler Origin, taille/type de payload, chemins et destinations des fichiers. Ne pas ouvrir le CORS ni retirer la CSP pour faciliter le pont.

## 7. Installateur commun

Un seul runtime Electron et un identifiant d'application V6 distinct, pour coexister avec V5. Page de composants avec Atlas et Aggregator cochés par défaut ; au moins un composant requis. Les fichiers du composant décoché ne sont pas installés : ce n'est pas simplement masquer un bouton.

Prototype NSIS à réaliser tôt : page de composants/sections, installation par utilisateur, choix du dossier, raccourcis selon composants, mise à jour qui préserve le choix, désinstallation qui conserve les données sauf action séparée explicite. Electron-builder permet un script NSIS personnalisé ; la sélection réelle des payloads doit être éprouvée, pas supposée couverte par son assistant standard. Sources : [electron-builder NSIS](https://www.electron.build/nsis/) et [NSIS, pages et sections](https://nsis.sourceforge.io/Docs/Chapter4.html).

Atlas seul : bouton d'envoi indiquant que l'agrégateur est absent, export de brouillon possible. Aggregator seul : fonctionnement autonome. Les dépendances des outils Atlas (dont ffmpeg/vision) restent avec le composant nécessaire, avec licences. Le mécanisme de mise à jour V5 ne doit pas installer son ancien exécutable par-dessus la suite V6.

## 8. Packs BZ Image DNA

Concevoir l'enveloppe, pas analyser le corpus exclu. Pack de données avec ID, version, compatibilité de schéma, catalogue et miniatures. Chargement à la demande, recherche/index indépendant des images pleine taille ; aucune importation massive au démarrage.

Import en staging avec plafonds de taille décompressée, nombre/taille des fichiers, validation des chemins (traversal, symlinks, collisions et noms Windows), types autorisés et absence de code. Vérifier l'intégrité par empreintes ; l'authenticité des packs officiels nécessite une signature et une racine de confiance, pas seulement un hash fourni par le pack. Activation atomique, retour à la version précédente et conservation des overrides.

Les packs utilisateur sont identifiés comme tels, sans prétendre être signés officiellement. L'hébergement, les URLs de téléchargement et une éventuelle distribution commerciale ne sont pas décidés dans ce chantier. Aucun abonnement/service externe à créer sans accord.
