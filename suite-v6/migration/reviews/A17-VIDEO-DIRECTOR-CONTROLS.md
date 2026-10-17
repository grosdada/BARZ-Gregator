# A17 — Video Director · inventaire et parité

## Source relue

- `E:/Fable 5-Project/Meat Journey/Barzy App/prompt Atlas V2/index.html`
- `E:/Fable 5-Project/Meat Journey/Barzy App/prompt Atlas V2/app.js`
- `E:/Fable 5-Project/Meat Journey/Barzy App/public/assets/HTML/motion-emulator/`

Video Director reste dans l’onglet système **Backstage** et conserve ses trois
modules originaux, dans le même ordre : **Editor**, **Analyser**, puis
**Motion Emulator**. Editor est le module actif par défaut.

## Editor conservé à l’identique

- Import multiple vidéo/audio, chutier et Clear.
- Outils Grab, Cut, ajout de pistes vidéo/audio et clips texte.
- Sauvegarde/chargement du montage JSON, export WebM/MP4 et FCP7 XML.
- Moniteurs Source/Program, mode Split/Mono, plein écran app ou moniteur et ratios.
- Transport complet, boucle, pas image, timecode 30 fps et marques IN/OUT.
- Timeline multipiste réordonnable, zoom, trim, fades, marqueurs et couleurs.
- Copier/coller et duplication de clips, liaison audio, vitesse/durée et suppression.
- Opacité et taille animables avec clés et interpolations Normal/Bezier/Hold.
- Color Correction, Wiggle et Noise, avec copie/collage des effets et animation.
- Éditeur de texte : contenu, police, taille, position, couleur et graisse.

## Commandes conservées

- Import Media devient **Importer un média**, avec sélecteur local et dépôt vidéo/audio.
- Analyze Director Flow devient **Analyser la mise en scène**.
- Export MP3 garde les sorties **audio original** et **audio sélectionné**.
- Export Black MP4 garde les sorties **original** et **sélectionné**.
- Export MP4 garde la **vidéo originale** et la **vidéo sélectionnée**.
- **Clear** vide le média, les photogrammes et toutes les sorties.
- Le moniteur conserve la lecture native, le point IN, le point OUT, la fenêtre
  maximale de 15 secondes, le timecode précis et la boucle.
- La bande conserve les photogrammes échantillonnés, leur timecode, leur case de
  sélection, le téléchargement individuel et **Tout sélectionner**.
- Le menu **Télécharger** conserve la sélection, le document d'analyse, le récit
  d'analyse et le paquet complet, avec option ZIP.
- Les instructions **Sujet** et **Décor** sont conservées ; **Notes** est ajouté
  pour les contraintes de continuité ou de son.
- Les sorties **Kling 3**, **Seedance 2**, **Kling Negative Prompt**,
  **Audio Transcript** et **Director Breakdown** restent séparées et copiables.

## Améliorations V6

- Poste de montage sombre en trois zones : moniteur/trim, photogrammes, sorties.
- Habillage commun aux trois modules : noir, graphite, acier et signal corail,
  sans panneau blanc ou crème, avec bordures fines et angles sobres comme le
  reste de Prompt Atlas V6.
- Motion Emulator garde ses trois zones sur grand écran et place le constructeur
  de prompt sous les moniteurs quand la largeur devient insuffisante.
- Barre de progression avec pourcentage pendant capture, transcription, analyse
  et exports.
- Choix OpenAI, Anthropic ou Google et gestion des clés dans le backend local.
- Transcription OpenAI facultative ; l'analyse visuelle continue avec un avertissement
  si le transcript ne peut pas être produit.
- Extraction des images dans le navigateur, avec repli FFmpeg côté local.
- Exports média encodés localement par FFmpeg ; « original » traite bien toute la
  durée et « sélectionné » uniquement la fenêtre IN/OUT.
- Envoi direct des prompts Kling et Seedance vers un brouillon BZ Aggregator,
  sans déclencher de génération payante.
- Modèle, nombre de photogrammes et boucle sont persistants par setup.

## Motion Emulator conservé à l’identique

- Import MP4, Clear, FPS cible, résolution, palette de profondeur et sorties
  depth/skeleton/both avec composite côte à côte.
- Traitement annulable avec progression/ETA et exports séparés.
- Prévisualisation, scrub, lecture, test depth sur l’image courante et vue Pose 3D.
- Déduction et réédition des champs Seedance (sujet, tenue, décor, lumière,
  caméra, focale, style et mouvement), copie et téléchargement du prompt assemblé.
- MediaPipe, Depth Anything V2, Three.js, Transformers et WebM Muxer restent
  embarqués localement ; l’export MP4 passe par le FFmpeg local.

## Sécurité et coûts

- Aucun appel distant à l'import, à la lecture, au trim ou à l'export.
- Une API IA n'est appelée qu'après clic explicite sur **Analyser la mise en scène**.
- Les clés ne sont jamais renvoyées au navigateur ; l'interface ne reçoit que leur
  état configuré/non configuré.
- Taille locale bornée à 80 Mo et fenêtre d'analyse bornée à 15 secondes.

## Vérification

- Tests de registre et migration A16 → A17.
- Persistance des contrôles par setup et reset global.
- Contrat des commandes et sorties visibles.
- Échantillonnage/timecodes, requête vision, normalisation et fallback local testés.
- Vérification manuelle des trois onglets dans Backstage, chargement des deux
  iframes hors ligne, cohérence du thème sombre et absence d’erreur navigateur
  bloquante.
