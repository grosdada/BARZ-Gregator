# Réponse de Claude — bouton « Import ref » de la bibliothèque en ligne

Suite à `CLAUDE-IMPORT-REF-BUTTON.md` et `REFERENCE_LIBRARY_INTEGRATION.md` (12/10/2026).
Concerne uniquement la bibliothèque en ligne `https://barz-ai-lib.placenta.tv/AI-Asset-Lib-online/`.

## Ce qui est fait côté bibliothèque

- Bouton **Import ref** (`type="button"`, style primaire) dans la fenêtre de détail, juste à côté de
  **Télécharger** ; Précédent, Suivant, Télécharger, Image originale et Fermer sont inchangés, le clavier aussi.
- **L'image importée est celle de la puce sélectionnée (en bleu)** dans la fenêtre de détail — la planche, ou
  une des vues `_solo_01`, `_solo_02`… — exactement le fichier affiché et ouvert par « Image originale » ; flèches
  haut/bas comprises. Vérifié sur `bollywood-space / mint-astronaut-gold-helmet` : chaque puce envoie son propre
  fichier (`…-grid.png`, `…-grid_solo_01.png`, `…_02`, `…_03`).
- Visible seulement quand l'image affichée est un original (`jpg`, `jpeg`, `png`, `webp`, `gif`), jamais une
  vignette de `serveur/_vignettes/`.
- Message envoyé exactement au format demandé (`barz:import-reference`, `schemaVersion: "1.0"`,
  `source: "barz-ai-lib"`, `requestId` = `crypto.randomUUID()`), à `window.opener`, sinon à `window.parent`,
  avec pour `targetOrigin` l'origine exacte de l'Aggregator. `"*"` n'est jamais utilisé.
- États : `Import ref`, `Importing…` (désactivé), `Imported ✓`, `Already imported`,
  `Open this library from BARZ Aggregator to import`, `Import failed — Retry`. Le texte `message` de l'accusé
  s'affiche à côté du bouton (en texte, jamais en HTML). Retour à `Import ref` dès qu'une autre image est choisie
  (Précédent, Suivant ou une autre vue de la même fiche).
- La page ne télécharge rien, n'appelle jamais `127.0.0.1` et n'envoie ni cookie ni identifiant.

## Ce que l'Aggregator doit savoir (ajouts au protocole)

### 1. La connexion perd le paramètre `aggregatorOrigin` → poignée de main obligatoire

La bibliothèque exige une connexion : `index.php` renvoie vers `login.php`, qui revient ensuite sur
`index.php` **sans** la query string. Un `?aggregatorOrigin=…` est donc perdu si l'utilisateur n'est pas déjà
connecté. Les deux voies sont acceptées :

- **paramètre d'URL** `aggregatorOrigin=http://127.0.0.1:<port>` (ou `http://localhost:<port>`) — utile si
  l'utilisateur est déjà connecté ; mémorisé pour l'onglet (`sessionStorage`) ;
- **poignée de main (recommandée)** : après avoir ouvert la popup, l'Aggregator envoie toutes les ~500 ms

  ```js
  popup.postMessage({ type: "barz:library-handshake", schemaVersion: "1.0" },
                    "https://barz-ai-lib.placenta.tv");
  ```

  jusqu'à recevoir de la popup :

  ```js
  { type: "barz:library-ready", schemaVersion: "1.0", source: "barz-ai-lib" }
  ```

  La bibliothèque n'accepte la poignée de main que si `event.source` est son `opener` (ou son `parent`) et si
  `event.origin` est une origine locale `http://127.0.0.1:<port>` / `http://localhost:<port>`.

### 2. Popup plutôt qu'iframe

Le cookie de session est `SameSite=Lax` : dans une iframe posée sur `http://127.0.0.1`, il n'est pas envoyé,
donc la bibliothèque y demande la connexion sans pouvoir l'ouvrir. **Utilisez la popup.** L'iframe fonctionne
(testée) seulement si la session passe, ce qui n'est pas le cas aujourd'hui.

### 3. Identifiant d'asset

Une fiche contient plusieurs images (planche, vues, miniature). `asset.id` vaut donc
`<banque>/<id de fiche>/<nom du fichier>`, par exemple
`locomotives/50d38ac3823b148d8f6b1512/29-01_diesel-warbonnet_base.jpg` : stable, et propre à l'image importée.

### 4. Doublon

L'accusé de `CLAUDE-IMPORT-REF-BUTTON.md` ne dit pas comment signaler un doublon. La bibliothèque affiche
**Already imported** quand l'accusé contient `ok: true` **et** `duplicate: true` (ou `status: "duplicate"`).
Sans réponse sous 30 s : `Import failed — Retry`.

### 5. Les médias sont publics

`originalUrl` (`https://barz-ai-lib.placenta.tv/AI-Asset-Lib-online/media/<banque>/…`) se télécharge **sans
connexion** : le serveur de l'Aggregator n'a besoin d'aucun cookie. Hôte à mettre en liste blanche :
`barz-ai-lib.placenta.tv`.

## Tests

- `K:\Bibliotheque-Assets-IA\CONTEXT\import-ref\test_import_ref.js` — `node test_import_ref.js app.import-ref.js` :
  45 essais (message, original jamais remplacé par la vignette, origines refusées dont `"*"`, accusés filtrés par
  origine/fenêtre/requestId/version, double clic, changement d'asset, absence d'Aggregator, poignée de main,
  iframe).
- `faire_banc.py` (même dossier) : banc local avec une fausse page Aggregator ; testé de bout en bout dans un
  navigateur (iframe + poignée de main, import, doublon, retour au repos, cas sans Aggregator).
