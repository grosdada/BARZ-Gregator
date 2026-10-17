# Réponse de Claude — bouton « Importer GLB » (Blocking Studio)

Bibliothèque en ligne `https://barz-ai-lib.placenta.tv/AI-Asset-Lib-online/`, déployé le 14/10/2026.
Suite de `CLAUDE-IMPORT-REF-REPONSE.md` (même poignée de main, même sécurité).

## Ce qui est fait

- **Importer GLB** dans la fenêtre de détail, à côté de **Import ref**, visible **seulement** si la fiche a un vrai
  fichier `.glb` (champ `modeles` du manifeste). Les `.gltf` et les autres formats ne sont jamais proposés.
- Plusieurs GLB dans une fiche (ex. `…-3D.glb` et `…-3D-Quad.glb`) : une liste déroulante choisit le fichier envoyé.
  Un lien **Télécharger le GLB** est affiché à côté.
- Message au contrat exact `barz:import-glb` (ci-dessous), envoyé à `window.opener`, sinon `window.parent`, à l'origine
  exacte apprise par `aggregatorOrigin` ou par la poignée de main `barz:library-handshake` → `barz:library-ready`
  (une seule réponse ready, partagée par les deux boutons). Jamais `"*"`. Pas de base64, aucun appel à `127.0.0.1`.
- Accusé `barz:import-glb-result` filtré par origine, fenêtre, `requestId` et `schemaVersion` ; `duplicate: true` →
  « Déjà importé ». L'accusé d'image (`barz:import-reference-result`) ne termine jamais un import GLB.
- États : Importer GLB · Importation… · Importé ✓ · Déjà importé · Ouvrez cette bibliothèque depuis Blocking Studio ·
  Échec de l'import — Réessayer (aussi sans réponse sous 30 s). Retour au repos quand on change de fiche ou de GLB.
- Pastille « 3D » en haut à gauche des cartes qui ont un modèle 3D.

## Exemple réel du message produit

(capté dans le banc d'essai avec le vrai code de la page, fiche Loki de `vaisseaux-bank-new`)

```json
{
  "type": "barz:import-glb",
  "schemaVersion": "1.0",
  "source": "barz-ai-lib",
  "requestId": "bad80a81-791f-4c8a-b7d6-2e25b0ed9e6d",
  "asset": {
    "id": "vaisseaux-bank-new/001/001_Loki_3D.glb",
    "name": "Loki",
    "fileName": "001_Loki_3D.glb",
    "modelUrl": "https://barz-ai-lib.placenta.tv/AI-Asset-Lib-online/media/vaisseaux-bank-new/Vaisseaux-sheet/001_Loki/001_Loki_3D.glb",
    "sourcePageUrl": "https://barz-ai-lib.placenta.tv/AI-Asset-Lib-online/index.php",
    "mimeType": "model/gltf-binary",
    "format": "glb"
  }
}
```

`asset.id` = `<banque>/<id de fiche>/<fichier>` (stable ; une fiche peut avoir plusieurs GLB). `sourcePageUrl` est
l'URL réelle de la page (dans le banc, elle valait `http://127.0.0.1:8811/…`).

## GLB de test

- `https://barz-ai-lib.placenta.tv/AI-Asset-Lib-online/media/vaisseaux-bank-new/Vaisseaux-sheet/001_Loki/001_Loki_3D.glb`
  (vaisseau, 5,6 Mo)
- `https://barz-ai-lib.placenta.tv/AI-Asset-Lib-online/media/mode-cringe-batch-1/001-cape-doree-satinee/001-cape-doree-satinee-3D.glb`
  (personnage, 1,8 Mo)

**Téléchargeable sans session : oui.** Vérifié sans cookie : `HTTP 200`, `Content-Type: model/gltf-binary`
(déclaré le 14/10 par `media/.htaccess`), le fichier commence par la signature `glTF`. Aucun jeton ni URL signée
n'est nécessaire : `media/` est public. Hôte à mettre en liste blanche : `barz-ai-lib.placenta.tv`.

## Combien

- `vaisseaux-bank-new` : 30 vaisseaux avec GLB.
- `mode-cringe-batch-1` à `-3` : 279 fiches avec GLB (285 fichiers).

## Fichiers modifiés

- En ligne : `AI-Asset-Lib-online/app.js` (sauvegarde `app.js.avant-glb-3d`), `AI-Asset-Lib-online/media/.htaccess`
  (nouveau, types MIME 3D), `banks.json` (champ `modeles` ; sauvegardes `banks.json.avant-maj-…-2026-10-14-…`).
- Source et tests : `K:\Bibliotheque-Assets-IA\CONTEXT\import-ref\` — `module_import_ref.js`, `patch_import_ref.py`
  (construit `app.import-ref.js`), `test_import_ref.js` (`node test_import_ref.js app.import-ref.js` : 58 essais, dont 13 GLB).
