# Architecture de BARZ Aggregator

## Principe

BARZ Aggregator est un routeur local. L’interface ne connaît jamais les clés des
fournisseurs et ne peut pas appeler directement leurs endpoints. Toute opération
potentiellement payante doit traverser une confirmation explicite côté serveur.

```text
Prompt Atlas ──POST /api/imports──> Brouillon local
                                         │
Interface ──> modèle vérifié ──> aperçu + estimation
                                         │
                              file locale verrouillée
                                         │
                              confirmation explicite
                                         │
                              file fal + suivi du job
                                         │
                         historique local + média fal
```

## Composants actuels

- `public/` : interface sans framework, servie uniquement par l’application locale ;
- `server.js` : API locale liée à `127.0.0.1`, validation et en-têtes de sécurité ;
- `src/prompt-import.js` : contrat commun avec Prompt Atlas ;
- `src/generation-plan.js` : conversion prudente vers le schéma réel du modèle et
  estimation du prix ;
- `src/job-state.js` : machine d’états de la file, avec passage obligatoire par
  `awaiting_confirmation` ;
- `src/providers/fal.js` : métadonnées, tarifs et primitives de file fal ;
- `src/secret-vault.js` : chiffrement local des clés ;
- `src/storage.js` : stockage atomique des brouillons, modèles et jobs.

Les résultats terminés sont présentés dans l’historique local. Le téléchargement
transite par une route locale qui accepte uniquement une URL déjà enregistrée dans
le résultat du job et servie par le domaine média de fal.

La bibliothèque Assets possède deux catégories. `Generated` dérive ses médias des
résultats de jobs, sans dupliquer les fichiers distants. `Ressources` conserve les
images, vidéos et sons importés dans `data/uploads/`; ils arrivent dans « Sans
collection ». Les deux catégories partagent les mêmes filtres et collections. Les
exports groupés lisent les ressources locales ou téléchargent les médias fal,
appliquent si nécessaire une conversion locale par FFmpeg, puis assemblent une
archive ZIP sans transfert vers un service tiers.

La création d’une collection est proposée directement dans le sélecteur de
destination. Le renommage passe par une action contextuelle sur la collection et
conserve son identifiant : les assets rangés ne changent donc pas de rattachement.
La suppression demande une confirmation séparée et ne supprime aucun média : les
jobs et ressources concernés sont simplement rattachés à « Sans collection ».

Un nom d’asset est une métadonnée locale attachée au couple job/index de résultat.
Pour une sélection multiple, BARZ ajoute un suffixe numérique sur trois chiffres.
Ce nom est repris par le téléchargement individuel et par chaque entrée du ZIP,
indépendamment du format d’export choisi.

Les images de la bibliothèque peuvent alimenter le slot Références du lanceur
actif, individuellement ou par sélection. Les slots sont isolés par type de média.
Lors de la préparation, seules les URL HTTPS et seulement les champs explicitement
présents dans le schéma vérifié du modèle sont ajoutés au paquet fal. Une ressource
locale reste visible dans le slot mais n’est jamais exposée automatiquement.

Les reference sets persistants pointent vers l’identité stable de chaque asset
(`generated:<jobId>:<index>` ou `resource:<resourceId>`), et non vers sa collection.
Un déplacement entre collections ne les affecte donc pas. À la sauvegarde, le serveur
crée aussi une miniature dans `data/reference-icons/`. Lors de la lecture de l’état,
chaque référence est résolue contre les jobs et ressources présents : une référence
disparue est exposée comme `missing`, avec sa miniature conservée pour l’identifier.

Dans le lanceur, la position de chaque référence produit son identifiant de prompt
`@imageN`. Un clic sur cet identifiant l’insère à la sélection courante du champ de
prompt. L’ordre du tableau ne change que lors d’un glissement volontaire après appui
long ; cet ordre est repris tel quel par les brouillons, les jobs et les reference sets.

La suppression des ressources locales est limitée à `POST /api/resources/delete`.
Le serveur déplace d’abord chaque fichier vers un nom temporaire récupérable, met à
jour l’état, puis efface les fichiers préparés. En cas d’échec d’écriture de l’état,
les fichiers retrouvent leur nom d’origine. Les reference sets ne sont pas modifiés :
leur résolution suivante expose simplement les identifiants concernés comme `missing`.

## Barrières de dépense

Une génération ne peut être soumise qu’après les barrières suivantes :

1. la vérification d’un modèle ne fait qu’interroger catalogue, schéma et tarif ;
2. l’aperçu porte toujours `submissionLocked: true` ;
3. un job préparé reste dans `awaiting_confirmation` ;
4. l’utilisateur confirme le montant exact dans une fenêtre séparée ;
5. le serveur revérifie le tarif auprès de fal avant d’appeler la file ;
6. l’état `submitting` empêche une seconde soumission concurrente.

Une erreur de transport pendant la soumission est marquée comme incertaine et
n’est jamais relancée automatiquement. L’identifiant fal est enregistré dès sa
réception, puis l’interface suit la file et récupère le résultat.

## Frontière avec Prompt Atlas

Prompt Atlas reste une application parallèle. Son seul couplage prévu est un
bouton « Send prompt to Aggregator » qui envoie le contrat versionné. Le choix du
fournisseur, le coût, la confirmation et le suivi appartiennent à l’agrégateur.
