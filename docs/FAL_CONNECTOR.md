# Connecteur fal

État : génération directe, bibliothèque, collections et reference sets (`0.10.0`).

Le connecteur suit les API officielles fal :

- authentification par `Authorization: Key …` côté serveur local uniquement ;
- solde via `GET https://api.fal.ai/v1/account/billing?expand=credits` ;
- métadonnées et schéma via `GET https://api.fal.ai/v1/models` ;
- tarif actuel via `GET https://api.fal.ai/v1/models/pricing` ;
- future exécution asynchrone via `https://queue.fal.run`.

Documentation officielle :

- <https://fal.ai/docs/documentation/setting-up/authentication>
- <https://fal.ai/docs/platform-apis/v1/account/billing>
- <https://fal.ai/docs/platform-apis/v1/models>
- <https://fal.ai/docs/platform-apis/v1/models/pricing>
- <https://fal.ai/docs/documentation/model-apis/inference/queue>

## Règles de sécurité

La clé est reçue uniquement par le serveur lié à `127.0.0.1`, vérifiée auprès de
fal, chiffrée avec AES-256-GCM et stockée dans le dossier Git-ignoré `data/`.
Elle n’est jamais incluse dans une réponse API, dans les logs ou dans le code
client.

La présence de la clé n’active pas seule la génération. L’ajout d’un modèle
vérifie son identifiant, son schéma et son prix mais n’appelle jamais son
endpoint d’inférence.

Certaines clés de portée API peuvent appeler les modèles tout en recevant un
`403` sur les informations de facturation du compte. Dans ce cas, la clé est
conservée et le solde est marqué indisponible ; un `401` reste traité comme une
clé invalide.

## Préparation d’une génération

L’endpoint local `POST /api/generations/preview` construit un aperçu à partir du
schéma OpenAPI réellement récupéré pour le modèle. Il ne transmet que les noms
de paramètres présents dans ce schéma, signale les champs obligatoires absents
et estime le coût quand l’unité fal le permet. La réponse contient toujours
`submissionLocked: true` et ne déclenche aucune soumission à la file fal.

L’endpoint local `POST /api/jobs/prepare` peut ensuite conserver cette requête
dans la file locale. Son état initial est `awaiting_confirmation` : cette opération
n’appelle pas fal et ne dépense aucun crédit.

Dans l’interface, cette préparation est désormais automatique : l’utilisateur
clique sur « Générer », voit le coût, puis confirme. La file locale reste un
détail technique et un historique de suivi, pas une étape du parcours principal.

`POST /api/jobs/:id/submit` exige le montant exact affiché et une confirmation
explicite. Juste avant l’envoi, il revérifie le modèle et le tarif auprès de fal.
Un changement de montant bloque l’envoi et exige une nouvelle confirmation. Le
job passe d’abord par l’état local `submitting`, ce qui neutralise les doubles
clics. Une erreur réseau ambiguë n’est jamais relancée automatiquement.

`POST /api/jobs/:id/refresh` suit ensuite la file fal et récupère le résultat. Les
requêtes et réponses JSON ne sont pas conservées dans l’historique fal grâce à
`X-Fal-Store-IO: 0` ; les médias générés restent servis par le CDN fal.

Une génération terminée expose son aperçu, son prompt et ses paramètres dans le
panneau local. `GET /api/jobs/:id/download/:index` relaie un média pour le
télécharger, uniquement lorsqu’il appartient déjà au résultat enregistré du job
et que son hôte est `fal.media` ou un de ses sous-domaines.

La machine d’états locale est définie (`awaiting_confirmation`, `submitting`,
`submitted`, `queued`, `running`, `completed`, `failed`, `cancelled`). Elle
empêche la création d’un job sans aperçu verrouillé préalable.
