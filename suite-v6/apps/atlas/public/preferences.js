(() => {
  const THEME_KEY = "barz-atlas-theme";
  const LANGUAGE_KEY = "barz-atlas-language";
  const root = document.documentElement;
  const dictionary = new Map(Object.entries({
    "Ouvrir BZ Aggregator": "Open BZ Aggregator",
    "Studio d’idées": "Idea Studio",
    "Bibliothèque de looks": "Look Library",
    "Labo personnages et assets": "Character & Asset Lab",
    "Storyboard et séquences": "Board & Sequence",
    "Studio de mouvement": "Motion Studio",
    "Contrôle caméra": "Camera Control",
    "Construis Atlas sans toucher au code.": "Build Atlas without touching code.",
    "Révision du registre": "Registry revision",
    "Révision": "Revision",
    "Setup Prompt Atlas actif": "Active Prompt Atlas setup",
    "Setup Atlas": "Atlas setup",
    "Changer de setup": "Change setup",
    "Créer un setup vide": "Create an empty setup",
    "Nouveau": "New",
    "Dupliquer": "Duplicate",
    "Dupliquer le setup actif": "Duplicate the active setup",
    "Renommer": "Rename",
    "Enregistrer une version": "Save a version",
    "Historique": "History",
    "Éditeur des ateliers": "Workshop editor",
    "Ateliers": "Workshops",
    "Glisse pour organiser. Deck, Backstage et Build restent fixes.": "Drag to organize. Deck, Backstage and Build stay fixed.",
    "Créer un atelier": "Create a workshop",
    "Ateliers réorganisables": "Reorderable workshops",
    "Réglages par défaut": "Default settings",
    "Sauvegardes": "Backups",
    "Inspecteur": "Inspector",
    "Choisis un atelier": "Choose a workshop",
    "Son nom, ses prompts et son ordre apparaîtront ici.": "Its name, prompts and order will appear here.",
    "Atelier": "Workshop",
    "Atelier personnel": "Personal workshop",
    "Atelier intégré": "Built-in workshop",
    "Nom de l’atelier": "Workshop name",
    "Enregistrer": "Save",
    "Déplacer l’atelier": "Move workshop",
    "Monter": "Move up",
    "Descendre": "Move down",
    "Réinitialiser cet atelier": "Reset this workshop",
    "Prompts et outils": "Prompts and tools",
    "Nouvelle bibliothèque": "New library",
    "Prompt simple": "Simple prompt",
    "Recette active": "Active recipe",
    "Prompt compilé": "Compiled prompt",
    "Copier": "Copy",
    "Bibliothèque": "Library",
    "Bibliothèque intégrée": "Built-in library",
    "Bibliothèque personnelle": "Personal library",
    "Nouvelle carte": "New card",
    "Nom de la bibliothèque": "Library name",
    "Catégories": "Categories",
    "Créer une catégorie": "Create a category",
    "Voir les cartes masquées": "Show hidden cards",
    "Carte": "Card",
    "Carte intégrée": "Built-in card",
    "Carte personnelle": "Personal card",
    "Titre": "Title",
    "Catégorie": "Category",
    "Description": "Description",
    "Type de sortie": "Output type",
    "Vidéo": "Video",
    "Son": "Audio",
    "Texte": "Text",
    "Insérer les détails": "Insert details",
    "marque l’emplacement des détails.": "marks where the details will be inserted.",
    "Revenir à l’original": "Restore original",
    "Masquer": "Hide",
    "Setup actif": "Active setup",
    "Outils de l’atelier": "Workshop tools",
    "Nouvel atelier": "New workshop",
    "Fermer": "Close",
    "Crée un nouvel espace dans la barre de gauche. Tu pourras ensuite y ranger tes prompts.": "Create a new space in the left rail, then organize your prompts inside it.",
    "Nom": "Name",
    "Annuler": "Cancel",
    "Créer l’atelier": "Create workshop",
    "Nouveau setup": "New setup",
    "Crée une nouvelle configuration indépendante de Prompt Atlas.": "Create an independent Prompt Atlas configuration.",
    "Nom du setup": "Setup name",
    "Créer": "Create",
    "Fige l’organisation et les prompts du setup actif. Tu pourras y revenir sans perdre les versions suivantes.": "Freeze the active setup organization and prompts. You can return to it without losing later versions.",
    "Nom de cette direction": "Version name",
    "Enregistrer la version": "Save version",
    "Historique du setup": "Setup history",
    "Restaurer une version enregistre d’abord automatiquement l’état actuel.": "Restoring a version first saves the current state automatically.",
    "Nouveau prompt": "New prompt",
    "Ce pilote crée une recette avec un champ texte. Le formulaire complet arrivera avec la migration des banques.": "This creates a recipe with one text field.",
    "Nom du champ": "Field name",
    "Sujet": "Subject",
    "Template du prompt": "Prompt template",
    "Utilise": "Use",
    "à l’endroit où la saisie doit apparaître. Le contenu reste du texte littéral.": "where the input should appear. Content remains literal text.",
    "Type de média": "Media type",
    "Ajouter le prompt": "Add prompt",
    "Crée une banque indépendante dans l’atelier sélectionné. Elle fonctionne immédiatement dans Atlas.": "Create an independent library in the selected workshop. It works immediately in Atlas.",
    "Première catégorie": "First category",
    "Principal": "Main",
    "Créer la bibliothèque": "Create library",
    "Nouvelle catégorie": "New category",
    "Créer la catégorie": "Create category",
    "Revenir aux réglages par défaut ?": "Restore default settings?",
    "Tes ateliers, prompts et outils personnels seront conservés. Une sauvegarde récupérable sera créée avant le changement.": "Your personal workshops, prompts and tools will be preserved. A recoverable backup will be created first.",
    "Créer la sauvegarde et réinitialiser": "Back up and reset",
    "Sauvegardes des réglages": "Settings backups",
    "Restaurer une sauvegarde crée d’abord un nouveau point de récupération.": "Restoring a backup first creates a new recovery point.",
    "Enregistré dans le setup": "Saved in setup",
    "Mini-app ajoutée au Deck.": "Mini-app added to Deck.",
    "Mini-app retirée du Deck.": "Mini-app removed from Deck.",
    "Ajouter cette mini-app au Deck": "Add this mini-app to Deck",
    "Retirer cette mini-app du Deck": "Remove this mini-app from Deck",
    "Modifications en attente": "Unsaved changes",
    "Enregistrement…": "Saving…",
    "Échec de l’enregistrement": "Save failed",
    "Général": "General",
    "Sortie": "Output",
    "Cible": "Target",
    "Modèle IA": "AI model",
    "Complexité": "Complexity",
    "Absurdité": "Absurdity",
    "Mots-guides": "Guide words",
    "Optionnel · objets, lieux, matières ou intentions à privilégier": "Optional · preferred objects, places, materials or intentions",
    "Générer avec l’IA": "Generate with AI",
    "Seed local": "Local seed",
    "Guide + générer": "Guide + generate",
    "Exporter": "Export",
    "Envoyer à BZ Aggregator": "Send to BZ Aggregator",
    "Envoyer à l’agrégateur": "Send to Aggregator",
    "Envoyer à l'agrégateur": "Send to Aggregator",
    "Génère un seed, puis affine-le.": "Generate a seed, then refine it.",
    "Plus réaliste": "More realistic",
    "Plus cinéma": "More cinematic",
    "Plus absurde": "More absurd",
    "Commercial propre": "Cleaner commercial",
    "Plus sombre": "Darker",
    "Plus drôle": "Funnier",
    "Éditorial": "Editorial",
    "Vers image": "To image",
    "Vers vidéo": "To video",
    "Tout": "Select all",
    "Aucun": "None",
    "Aléatoire": "Random",
    "Aucun prompt généré.": "No prompt generated yet.",
    "HISTORIQUE": "HISTORY",
    "Aucune clé · utilise l’onglet API de la suite": "No key · use the suite API tab",
    "Absurd Prompt Generator · 50 familles originales, mix pondéré, seed local et raffinement IA partagé.": "Absurd Prompt Generator · 50 original families, weighted mixing, local seeds and shared AI refinement.",
    "IA non configurée": "AI not configured",
    "IA indisponible": "AI unavailable",
    "Rechercher": "Search",
    "Effacer": "Clear",
    "Ajouter": "Add",
    "Appliquer": "Apply",
    "Supprimer": "Delete",
    "Rétablir": "Restore",
    "Réinitialiser": "Reset",
    "Prêt": "Ready",
    "Chargement…": "Loading…",
    "Analyse en cours…": "Analyzing…",
    "Importer un média": "Import media",
    "Importer une vidéo": "Import video",
    "Analyser la mise en scène": "Analyze staging",
    "Source et sélection": "Source and selection",
    "Redirection facultative": "Optional redirection",
    "Décor": "Setting",
    "Notes": "Notes",
    "Boucler la sélection": "Loop selection",
    "Transcript audio": "Audio transcript",
    "Copier le transcript": "Copy transcript",
    "Ouvrir le dossier": "Open folder",
    "Choisir un dossier": "Choose folder",
    "Lancer la découpe": "Slice images",
    "Référence visuelle": "Visual reference",
    "Position caméra": "Camera position",
    "Aucune lumière": "No light",
    "Élévation": "Elevation",
    "Intensité": "Intensity",
    "+ Ajouter une lumière": "+ Add a light",
    "Dépose une image au centre du plateau": "Drop an image in the center",
    "Chargement de la scène 3D…": "Loading 3D scene…",
    "Blocking Studio n’a pas pu être chargé": "Blocking Studio could not be loaded"
    ,"Découpe une image localement avec une grille ajustable et enregistre les tuiles dans le dossier source ou le dossier choisi.": "Slice an image locally with an adjustable grid and save the tiles in the source folder or a selected folder."
    ,"Compose, annote et retouche localement avec des calques, un historique complet et des exports haute qualité.": "Compose, annotate and edit locally with layers, full history and high-quality exports."
    ,"Dépose une image ou clique pour la choisir": "Drop an image or click to choose one"
    ,"PNG · JPG · WEBP · GIF — traitement entièrement local": "PNG · JPG · WEBP · GIF — processed entirely locally"
    ,"Aperçu de l’image à découper": "Preview of the image to slice"
    ,"DÉCOUPE": "SLICING"
    ,"Grille ajustable": "Adjustable grid"
    ,"COLONNES": "COLUMNS"
    ,"LIGNES": "ROWS"
    ,"Préfixe": "Prefix"
    ,"Qualité JPG / WEBP": "JPG / WEBP quality"
    ,"QUALITÉ JPG / WEBP": "JPG / WEBP QUALITY"
    ,"DESTINATION": "DESTINATION"
    ,"Dossier de l’image source": "Source image folder"
    ,"Parcourir…": "Browse…"
    ,"Charge une image pour commencer.": "Load an image to begin."
    ,"Découper et enregistrer": "Slice and save"
    ,"Une grille très dense peut demander beaucoup de mémoire et de temps.": "A very dense grid may require significant memory and time."
    ,"Sélection de dossier indisponible dans ce navigateur : export ZIP utilisé.": "Folder selection is unavailable in this browser: ZIP export will be used."
    ,"ZIP dans Téléchargements (navigateur incompatible)": "ZIP in Downloads (browser unsupported)"
    ,"Prêt. Les séparateurs orange peuvent être déplacés.": "Ready. The orange dividers can be moved."
    ,"Échec de la découpe.": "Slicing failed."
    ,"Image précédente": "Previous frame"
    ,"Position dans la vidéo": "Position in video"
    ,"Les images capturées apparaîtront ici et resteront disponibles jusqu’au changement d’outil.": "Captured frames will appear here and remain available until you switch tools."
    ,"Définition": "Resolution"
    ,"Durée": "Duration"
    ,"État": "Status"
    ,"Aucune vidéo chargée": "No video loaded"
    ,"Envoyer dans BZ Aggregator · Références": "Send to BZ Aggregator · References"
    ,"Captures vidées.": "Captures cleared."
    ,"Vidéo chargée localement.": "Video loaded locally."
    ,"Modèle vision": "Vision model"
    ,"Modèle d’analyse d’image": "Image analysis model"
    ,"Vérification de la clé…": "Checking key…"
    ,"Configurer les clés IA": "Configure AI keys"
    ,"Image à décoder": "Image to decode"
    ,"Aperçu de l’image importée": "Imported image preview"
    ,"Le prompt détaillé apparaîtra ici.": "The detailed prompt will appear here."
    ,"CCP · Description de scène": "CCP · Scene description"
    ,"Identité et caractéristiques principales": "Identity and main characteristics"
    ,"Lieu, action et détails narratifs": "Location, action and narrative details"
    ,"Caméra, lumière, matière et ambiance": "Camera, light, material and mood"
    ,"Contexte": "Context"
    ,"clé prête": "key ready"
    ,"clé manquante": "key missing"
    ,"Modèle indisponible": "Model unavailable"
    ,"Clés de vision": "Vision keys"
    ,"Effacer la clé active": "Remove active key"
    ,"Analyse copiée.": "Analysis copied."
    ,"Aucun prompt à envoyer.": "No prompt to send."
    ,"Modèle d’analyse vidéo": "Video analysis model"
    ,"Video Analyser": "Video Analyzer"
    ,"Video Director prêt": "Video Director ready"
    ,"Video Director indisponible": "Video Director unavailable"
    ,"Audio original": "Original audio"
    ,"Audio sélectionné": "Selected audio"
    ,"Black MP4 sélectionné": "Selected Black MP4"
    ,"Vidéo originale": "Original video"
    ,"Vidéo sélectionnée": "Selected video"
    ,"Aucun média chargé": "No media loaded"
    ,"Importer un média vidéo ou audio": "Import video or audio media"
    ,"Point d’entrée": "In point"
    ,"Adaptation du prompt généré": "Generated prompt adaptation"
    ,"Ces champs remplacent le sujet et le décor dans tous les prompts, sans modifier la vidéo source.": "These fields replace the subject and setting in every prompt without changing the source video."
    ,"Sujet de remplacement": "Replacement subject"
    ,"Décor de remplacement": "Replacement setting"
    ,"Instructions supplémentaires": "Additional instructions"
    ,"Prompt vidéo": "Video prompt"
    ,"Le prompt Seedance apparaîtra ici.": "The Seedance prompt will appear here."
    ,"Format du prompt vidéo": "Video prompt format"
    ,"Kling · négatif": "Kling · negative"
    ,"Le prompt négatif apparaîtra ici.": "The negative prompt will appear here."
    ,"Le transcript apparaîtra ici.": "The transcript will appear here."
    ,"L’analyse plan par plan apparaîtra ici.": "The shot-by-shot analysis will appear here."
    ,"Photogrammes de continuité": "Continuity frames"
    ,"Tout sélectionner": "Select all"
    ,"Tout désélectionner": "Deselect all"
    ,"Télécharger la sélection": "Download selection"
    ,"Document d’analyse": "Analysis document"
    ,"Récit d’analyse": "Analysis narrative"
    ,"Tout télécharger": "Download all"
    ,"Télécharger": "Download"
    ,"Les images-clés apparaîtront ici après l’analyse.": "Keyframes will appear here after analysis."
    ,"Démarrage du moteur de montage…": "Starting the editing engine…"
    ,"Le logiciel reste intégré dans Atlas, sans ouvrir une nouvelle fenêtre.": "The editor stays integrated in Atlas without opening a new window."
    ,"Réessayer": "Try again"
    ,"Préparation de Library Editor et de son espace média local.": "Preparing Library Editor and its local media workspace."
    ,"Editor prêt": "Editor ready"
    ,"Chargement de la scène 3D…": "Loading 3D scene…"
    ,"Moteur local prêt · scène sauvegardée automatiquement dans ce navigateur": "Local engine ready · scene saved automatically in this browser"
    ,"Prévisualise la scène en 3D, cadre les caméras et reconstruis un blocking éditable depuis une image de référence.": "Preview the scene in 3D, frame the cameras and rebuild editable blocking from a reference image."
    ,"Sélection": "Selection"
    ,"Flèche": "Arrow"
    ,"Rétablir · Ctrl Shift Z": "Redo · Ctrl Shift Z"
    ,"Opacité": "Opacity"
    ,"Pointillé": "Dashed"
    ,"Réduire": "Zoom out"
    ,"Calques": "Layers"
    ,"Propriétés": "Properties"
    ,"OBJET SÉLECTIONNÉ": "SELECTED OBJECT"
    ,"SÉLECTION": "SELECTION"
    ,"Sélectionne un objet sur le canevas pour modifier précisément ses propriétés.": "Select an object on the canvas to edit its properties precisely."
    ,"Intérieur": "Fill"
    ,"Contour pointillé": "Dashed outline"
    ,"Épaisseur du contour": "Stroke width"
    ,"Double flèche": "Double arrow"
    ,"Tout devant": "Bring to front"
    ,"Avancer": "Bring forward"
    ,"Reculer": "Send backward"
    ,"Tout derrière": "Send to back"
    ,"Transparent": "Transparent"
    ,"Noir": "Black"
    ,"Blanc": "White"
    ,"Couleur personnalisée": "Custom color"
    ,"Affiner avec l’IA": "Refine with AI"
    ,"Affinage du prompt": "Prompt refinement"
    ,"Affiner le prompt avec l’IA": "Refine prompt with AI"
    ,"Optionnel : cinématographique, concis, spécifique au modèle…": "Optional: cinematic, concise, model-specific…"
    ,"Lecture du coffre API partagé…": "Reading shared API vault…"
    ,"IA prête · dimensions verrouillées": "AI ready · dimensions stay locked"
    ,"IA prête · mesures, ratios et ordre protégés": "AI ready · measurements, ratios and order are protected"
    ,"Aucune clé IA · configure-la dans l’onglet API de la suite": "No AI key · configure one in the suite API tab"
    ,"Démarrage du moteur d’extraction local…": "Starting the local extraction engine…"
    ,"Moteur local prêt · yt-dlp prêt · FFmpeg prêt": "Local engine ready · yt-dlp ready · FFmpeg ready"
    ,"Moteur local prêt · yt-dlp manquant · FFmpeg manquant": "Local engine ready · yt-dlp missing · FFmpeg missing"
    ,"YouTube Extractor nécessite yt-dlp et FFmpeg.": "YouTube Extractor requires yt-dlp and FFmpeg."
    ,"Instruction de réalisation optionnelle": "Optional direction"
    ,"Clés IA partagées": "Shared AI keys"
    ,"Prompt d’échelle prêt": "Scale prompt ready"
    ,"Démarrage de YouTube Extractor…": "Starting YouTube Extractor…"
    ,"Extraction YouTube locale avec découpe précise, choix du format et ouverture du dossier de sortie.": "Local YouTube extraction with precise trimming, format selection and output-folder access."
    ,"Object Scale Chart conserve ses mesures exactes et peut affiner son prompt avec les IA partagées de la suite.": "Object Scale Chart preserves exact measurements and can refine its prompt with the suite's shared AI providers."
    ,"Mon Atlas": "My Atlas"
    ,"Cet atelier ne contient pas encore d’outil exécutable. Ajoute ses prompts depuis Build.": "This workshop does not contain an executable tool yet. Add its prompts from Build."
    ,"Cet atelier est vide. Ajoute son premier prompt.": "This workshop is empty. Add its first prompt."
    ,"Compiler le prompt": "Compile prompt"
    ,"Détails": "Details"
    ,"bibliothèque": "library"
    ,"prompt simple": "simple prompt"
    ,"outil": "tool"
    ,"Déplacer la catégorie à gauche": "Move category left"
    ,"Déplacer la catégorie à droite": "Move category right"
    ,"Nouveau nom de la catégorie": "New category name"
    ,"Catégorie renommée.": "Category renamed."
    ,"Catégorie supprimée.": "Category deleted."
    ,"Cette catégorie est vide.": "This category is empty."
    ,"Aucune carte visible dans cette catégorie.": "No visible cards in this category."
    ,"Masquée": "Hidden"
    ,"Modifiée": "Modified"
    ,"Active": "Active"
    ,"Scène Atlas chargée dans Blocking Studio.": "Atlas scene loaded in Blocking Studio."
    ,"La scène Atlas n’a pas pu être chargée.": "The Atlas scene could not be loaded."
    ,"Ordre des ateliers enregistré.": "Workshop order saved."
    ,"Crée une configuration vierge à partir des réglages Atlas intégrés.": "Create a blank configuration from the built-in Atlas settings."
    ,"Dupliquer le setup": "Duplicate setup"
    ,"Le contenu et l’historique ne seront pas modifiés.": "Content and history will not be changed."
    ,"Setup renommé.": "Setup renamed."
    ,"Nouveau setup actif.": "New setup active."
    ,"Version du setup enregistrée.": "Setup version saved."
    ,"Aucune version enregistrée pour ce setup.": "No version has been saved for this setup."
    ,"Version restaurée. L’état précédent reste récupérable.": "Version restored. The previous state remains recoverable."
    ,"Atelier créé.": "Workshop created."
    ,"Nom de l’atelier enregistré.": "Workshop name saved."
    ,"Prompt ajouté à l’atelier.": "Prompt added to workshop."
    ,"Bibliothèque créée et prête à recevoir ses cartes.": "Library created and ready for cards."
    ,"Bibliothèque renommée.": "Library renamed."
    ,"Catégorie créée.": "Category created."
    ,"Crée d’abord une catégorie.": "Create a category first."
    ,"Nouvelle direction à personnaliser.": "New direction to customize."
    ,"Nouvelle carte créée.": "New card created."
    ,"Carte enregistrée dans le setup.": "Card saved in the setup."
    ,"Carte dupliquée. La copie est indépendante.": "Card duplicated. The copy is independent."
    ,"Carte masquée.": "Card hidden."
    ,"Carte restaurée.": "Card restored."
    ,"Version intégrée restaurée.": "Built-in version restored."
    ,"Prompt copié.": "Prompt copied."
    ,"Le navigateur n’a pas autorisé la copie.": "The browser did not allow copying."
    ,"Les personnalisations des réglages intégrés seront retirées.": "Built-in setting customizations will be removed."
    ,"Réglages réinitialisés. Sauvegarde créée.": "Settings reset. Backup created."
    ,"Aucune sauvegarde pour le moment.": "No backups yet."
    ,"Sauvegarde restaurée. Un point de récupération a été créé.": "Backup restored. A recovery point was created."
    ,"Surrealiste": "Surrealist"
    ,"Kafkaien": "Kafkaesque"
    ,"Dadaiste": "Dadaist"
    ,"Fantastique": "Fantastic"
    ,"Cosmique": "Cosmic"
    ,"Organique": "Organic"
    ,"Industriel": "Industrial"
    ,"Pataphysique": "Pataphysical"
    ,"Situationniste": "Situationist"
    ,"Constructiviste": "Constructivist"
    ,"Hauntologie": "Hauntology"
    ,"Amélioration": "Enhancement"
    ,"Profondeur": "Depth"
    ,"Normales": "Normals"
    ,"Lumière indirecte": "Indirect lighting"
    ,"Prompt prêt": "Prompt ready"
    ,"Les trois corrections grammaticales validées sont appliquées. Le texte créatif reste inchangé.": "The three approved grammar corrections are applied. Creative wording remains unchanged."
    ,"Ouvrir le brouillon ↗": "Open draft ↗"
    ,"Rétablir les réglages intégrés": "Restore built-in settings"
    ,"Fond cyclo": "Cyclorama background"
    ,"Version relue Astra": "Astra-reviewed version"
    ,"Version personnalisée": "Custom version"
    ,"Version personnalisée enregistrée": "Custom version saved"
    ,"Recompiler depuis les réglages": "Recompile from settings"
    ,"Rétablir les réglages BZ Sheet": "Restore BZ Sheet settings"
    ,"Rétablir les réglages BZ Designer": "Restore BZ Designer settings"
    ,"Rétablir les réglages Knolling": "Restore Knolling settings"
    ,"Rétablir les réglages Video Multi Framing": "Restore Video Multi Framing settings"
    ,"Rétablir les réglages BZ Multishot": "Restore BZ Multishot settings"
    ,"Rétablir les réglages CCP": "Restore CCP settings"
    ,"Rechercher une recette": "Search recipes"
    ,"Colonnes": "Columns"
    ,"Lignes": "Rows"
    ,"Personnage": "Character"
    ,"Humain": "Human"
    ,"Sujet et contexte": "Subject and context"
    ,"Adapter à @image1 la tenue exacte de @image2": "Adapt the exact outfit from @image2 to @image1"
    ,"Le mode Puppet ajoute uniquement la couche de fidélité aux proportions de la figurine.": "Puppet mode only adds the layer that preserves the figurine’s proportions."
    ,"Version personnalisée conservée : les réglages ne l’écrasent pas.": "Custom version preserved: settings do not overwrite it."
    ,"Prompt final — éditable": "Final prompt — editable"
    ,"Rétablir Cinematic Shoot": "Restore Cinematic Shoot"
    ,"UGC naturel": "Natural UGC"
    ,"Documentaire": "Documentary"
    ,"Cinéma à l’épaule": "Handheld cinema"
    ,"Clip musical": "Music video"
    ,"Orbite contrôlée": "Controlled orbit"
    ,"Enregistrer comme preset": "Save as preset"
    ,"Caméra": "Camera"
    ,"Actif": "Active"
    ,"Dérive de la main": "Hand drift"
    ,"Fréquence de dérive": "Drift frequency"
    ,"Micro-tremblement": "Micro shake"
    ,"Respiration autofocus": "Autofocus breathing"
    ,"Variation d’exposition": "Exposure variation"
    ,"Contraintes": "Constraints"
    ,"Modificateur prêt": "Modifier ready"
    ,"Prompt principal (facultatif)": "Main prompt (optional)"
    ,"Ajouter au prompt principal": "Add to main prompt"
    ,"Ouvrir le brouillon": "Open draft"
    ,"Changer d’image": "Change image"
    ,"Revenir au dossier source": "Return to source folder"
    ,"DÉCOUPE PRO": "PRO SLICER"
    ,"Segments directs": "Direct segments"
    ,"Les découpes apparaissent en temps réel": "Slices appear in real time"
    ,"Découpe de la zone": "Zone slice"
    ,"Changer de dossier": "Change folder"
    ,"Clique sur « Recompiler depuis les réglages » pour créer cette finale.": "Click “Recompile from settings” to create this final version."
    ,"Ruptures brèves du regard": "Brief gaze breaks"
    ,"Whip pans spontanés": "Spontaneous whip pans"
    ,"Caméra en mouvement libre": "Free-roaming camera"
    ,"Activité du sujet": "Subject activity"
    ,"Fréquence de clignement": "Blink frequency"
    ,"Micro-mouvements des lèvres": "Micro lip movements"
    ,"Déglutition occasionnelle": "Occasional swallowing"
    ,"Hésitations « um / uh »": "“Um / uh” hesitations"
    ,"Hochements de tête": "Head nods"
    ,"Pas de déformation du visage": "No facial deformation"
    ,"Cinq doigts cohérents": "Five consistent fingers"
    ,"Vêtements et accessoires stables": "Stable clothing and accessories"
    ,"Direction lumineuse cohérente": "Consistent lighting direction"
    ,"Textes et logos sans déformation": "Text and logos without distortion"
    ,"Arrière-plan stable": "Stable background"
    ,"Direction du regard cohérente": "Consistent gaze direction"
    ,"Prompt reçu dans Camera Control.": "Prompt received in Camera Control."
    ,"Scène reçue dans CCP · Étape B.": "Scene received in CCP · Step B."
    ,"Ajoute une clé OpenAI, Anthropic, Gemini ou DeepSeek dans l’onglet API de la suite.": "Add an OpenAI, Anthropic, Gemini, or DeepSeek key in the suite API tab."
    ,"Brouillon envoyé à l’agrégateur. Aucune génération lancée.": "Draft sent to Aggregator. No generation started."
    ,"L’image de référence est invalide.": "The reference image is invalid."
    ,"L’image à envoyer est invalide.": "The image to send is invalid."
    ,"Image ajoutée aux Assets et aux références de BZ Aggregator.": "Image added to Assets and BZ Aggregator references."
    ,"Choisir les références": "Choose references"
    ,"Décrocher l’app du Deck": "Remove the app from Deck"
    ,"Ajouter l’app au Deck": "Add the app to Deck"
    ,"Choisis au moins un angle pour créer les blocs.": "Choose at least one angle to create the blocks."
    ,"Place une caméra 3D autour de @image1 et génère le prompt exact du nouveau point de vue.": "Place a 3D camera around @image1 and generate the exact prompt for the new viewpoint."
    ,"Compose un rig lumière 3D autour de @image1 sans modifier la géométrie de la scène.": "Build a 3D light rig around @image1 without changing the scene geometry."
    ,"Améliore une référence à partir des 20 recettes relues.": "Enhance a reference using the 20 reviewed recipes."
    ,"Sujet ou référence": "Subject or reference"
    ,"Note optionnelle sur l’ambiance ou le résultat lumineux…": "Optional note about the mood or lighting result…"
    ,"Image prête : elle sera envoyée comme @image1.": "Image ready: it will be sent as @image1."
    ,"Prompt sélectionné": "Selected prompt"
    ,"Cette bibliothèque est vide. Ajoute sa première carte depuis Build.": "This library is empty. Add its first card from Build."
    ,"Portée de la recherche": "Search scope"
    ,"Catégorie active": "Active category"
    ,"Toute la bibliothèque": "Entire library"
    ,"Direction personnalisée": "Custom direction"
    ,"Aucun prompt ne correspond à cette recherche.": "No prompt matches this search."
    ,"Détails du sujet, du produit ou de la scène": "Subject, product, or scene details"
    ,"Ex. une chanteuse sur scène, veste rouge, public dans la pénombre…": "E.g. a singer on stage, red jacket, audience in dim light…"
    ,"Les détails restent attachés à chaque carte dans le setup actif.": "Details remain attached to each card in the active setup."
    ,"Le texte relu reste littéral. Les personnalisations se font depuis Build et restent attachées au setup.": "Reviewed text remains literal. Customizations are made in Build and stay attached to the setup."
    ,"Copier sans détails": "Copy without details"
    ,"Tout copier sans détails": "Copy all without details"
    ,"Catégorie copiée sans détails.": "Category copied without details."
    ,"Prompt sans détails copié.": "Prompt without details copied."
    ,"Rétablir la navigation et les détails": "Restore navigation and details"
    ,"Rétablir la navigation": "Restore navigation"
    ,"Navigation et détails restaurés.": "Navigation and details restored."
    ,"Navigation restaurée.": "Navigation restored."
    ,"Personnalisé…": "Custom…"
    ,"Célébrité (facultatif)": "Celebrity (optional)"
    ,"Réglages de cette carte": "Card settings"
    ,"Planche cinéma": "Cinematic board"
    ,"Le mode Humain retire la couche Puppet sans réécrire les contraintes créatives de la recette.": "Human mode removes the Puppet layer without rewriting the recipe’s creative constraints."
    ,"Navigation, réglages et prompts personnalisés restaurés.": "Navigation, settings, and custom prompts restored."
    ,"Sélectionne au moins une expression.": "Select at least one expression."
    ,"Personnage principal": "Main character"
    ,"Référence personnage": "Character reference"
    ,"Action / chorégraphie": "Action / choreography"
    ,"Environnement": "Environment"
    ,"Référence décor": "Setting reference"
    ,"Personnages secondaires": "Secondary characters"
    ,"Notes de dessin": "Drawing notes"
    ,"Référence de style": "Style reference"
    ,"Inclure le système d’annotations colorées": "Include the colored annotation system"
    ,"Modèle cible": "Target model"
    ,"Référence storyboard": "Storyboard reference"
    ,"Références secondaires": "Secondary references"
    ,"Action — override": "Action — override"
    ,"Décor — override": "Setting — override"
    ,"Caméra — override": "Camera — override"
    ,"Hériter de Story": "Inherit from Story"
    ,"Sélection Motion indépendante": "Independent Motion selection"
    ,"Active une ou plusieurs cartes caméra, ou ajoute une couche entrante.": "Activate one or more camera cards, or add an incoming layer."
    ,"personnalisé": "custom"
    ,"Colle ici un prompt à placer avant les instructions caméra…": "Paste a prompt here to place before the camera instructions…"
    ,"Effacer la sélection": "Clear selection"
    ,"Prompt caméra composite": "Composite camera prompt"
    ,"Rétablir cette variante": "Restore this variant"
    ,"Rétablir Camera Control": "Restore Camera Control"
    ,"Réglages restaurés. Tes variantes personnalisées sont conservées.": "Settings restored. Your custom variants are preserved."
    ,"8 aléatoires": "8 random"
    ,"Retirer de la sélection": "Remove from selection"
    ,"Prompt recompilé depuis les réglages relus.": "Prompt recompiled from reviewed settings."
    ,"Réglages BZ Sheet restaurés. Tes versions personnalisées sont conservées.": "BZ Sheet settings restored. Your custom versions are preserved."
    ,"Scène optionnelle": "Optional scene"
    ,"Lieu, lumière, action ou décor à insérer littéralement…": "Location, light, action, or setting to insert literally…"
    ,"Le texte est inséré tel quel, sans nettoyage ni interprétation.": "Text is inserted as written, without cleanup or interpretation."
    ,"Version personnalisée conservée · recompile manuelle disponible": "Custom version preserved · manual recompile available"
    ,"Réglages BZ Designer restaurés. Tes versions personnalisées sont conservées.": "BZ Designer settings restored. Your custom versions are preserved."
    ,"Éclairage": "Lighting"
    ,"Lumière originale": "Original lighting"
    ,"Studio diffus": "Diffuse studio"
    ,"Références du lieu": "Location references"
    ,"Vêtements": "Clothing"
    ,"Kit complet": "Full kit"
    ,"Références fournies": "Provided references"
    ,"Le pont transmet le prompt et conserve les balises [IMG_n]. Les images restent à placer dans le deck de l’agrégateur.": "The bridge sends the prompt and preserves [IMG_n] tags. Images still need to be placed in the Aggregator reference deck."
    ,"Réglages Knolling restaurés. Tes versions personnalisées sont conservées.": "Knolling settings restored. Your custom versions are preserved."
    ,"Les neuf emplacements sont occupés.": "All nine slots are occupied."
    ,"Import ignoré : le setup ou l’emplacement a changé.": "Import ignored: the setup or slot changed."
    ,"Choisis un preset ou écris librement.": "Choose a preset or type freely."
    ,"10 images fixes": "10 still images"
    ,"Séquence vidéo": "Video sequence"
    ,"Réalisation": "Direction"
    ,"Skill de réalisation · chargé par l’IA": "Direction skill · loaded by AI"
    ,"Décris le sujet ou choisis @imageN.": "Describe the subject or choose @imageN."
    ,"Choisis @imageN, un preset, ou décris le décor.": "Choose @imageN, a preset, or describe the setting."
    ,"Les @image déjà attribuées aux autres rôles sont masquées.": "@image references already assigned to other roles are hidden."
    ,"Décor principal": "Main setting"
    ,"Décor secondaire": "Secondary setting"
    ,"Direction d’action": "Action direction"
    ,"Choisis une mise en mouvement ou écris librement.": "Choose an action direction or type freely."
    ,"Décris l’arc général : situation de départ, évolution, point d’arrivée.": "Describe the overall arc: starting situation, development, and destination."
    ,"Limite de caractères": "Character limit"
    ,"GO ACTION · vérification IA…": "GO ACTION · AI check…"
    ,"GO ACTION · réalisation en cours…": "GO ACTION · directing in progress…"
    ,"Références 1–9 · bac compact": "References 1–9 · compact tray"
    ,"Décrire la référence": "Describe reference"
    ,"Les neuf références restent à portée en haut du module. Ouvre « Décrire la référence » seulement quand tu as besoin de préciser son rôle.": "The nine references remain within reach at the top of the module. Open “Describe reference” only when you need to clarify its role."
    ,"Finale non compilée": "Final version not compiled"
    ,"Finale recompilée explicitement depuis les réglages.": "Final version explicitly recompiled from settings."
    ,"Décris le sujet et le décor, puis respecte la limite de caractères.": "Describe the subject and setting, then stay within the character limit."
    ,"Le brouillon sera créé sans lancer de génération.": "The draft will be created without starting a generation."
    ,"Envoi des références…": "Sending references…"
    ,"Finale enregistrée": "Final version saved"
    ,"Attention : durée moyenne inférieure à 0,5 s par plan.": "Warning: average duration is below 0.5 seconds per shot."
    ,"Liste des 10 images copiée.": "List of 10 images copied."
    ,"Recompile pour créer cette image fixe.": "Recompile to create this still image."
    ,"Réglages restaurés. Tes références et finales personnelles sont conservées.": "Settings restored. Your references and custom final versions are preserved."
    ,"Sujet / référence": "Subject / reference"
    ,"Décris le sujet commun à toutes les vues…": "Describe the subject shared by all views…"
    ,"Itération IA…": "AI iteration…"
    ,"Compile d’abord un prompt à faire évoluer.": "Compile a prompt to iterate first."
    ,"Itération en cours…": "Iteration in progress…"
    ,"Variation IA enregistrée dans le prompt courant.": "AI variation saved in the current prompt."
    ,"Itérer avec l’IA": "Iterate with AI"
    ,"Réglages Multishot restaurés. Tes versions personnalisées sont conservées.": "Multishot settings restored. Your custom versions are preserved."
    ,"Scène utilisateur": "User scene"
    ,"Décris l’action, le lieu, l’atmosphère et les moments indispensables…": "Describe the action, location, atmosphere, and essential moments…"
    ,"Réglages CCP restaurés. Tes versions personnalisées sont conservées.": "CCP settings restored. Your custom versions are preserved."
    ,"désactivé": "disabled"
    ,"rare": "rare"
    ,"périodique": "periodic"
    ,"fréquent": "frequent"
    ,"constant": "constant"
    ,"Enregistrer ce préréglage": "Save this preset"
    ,"Il sera conservé dans le setup actif.": "It will be saved in the active setup."
    ,"Renommer le préréglage": "Rename preset"
    ,"Son contenu ne sera pas modifié.": "Its content will not be changed."
    ,"Préréglage Imperfection": "Imperfection preset"
    ,"Réglages intégrés restaurés. Tes presets personnels sont conservés.": "Built-in settings restored. Your personal presets are preserved."
    ,"Modèle global : Claude Opus 5.5": "Global model: Claude Opus 5.5"
    ,"+ Aléatoire": "+ Random"
    ,"DECK — l’ordre ci-dessous est conservé": "DECK — the order below is preserved"
    ,"Ajoute des ingrédients depuis le catalogue.": "Add ingredients from the catalog."
    ,"PROMPT NÉGATIF SÉPARÉ": "SEPARATE NEGATIVE PROMPT"
    ,"Brouillon vidéo": "Video draft"
    ,"Brouillon image": "Image draft"
    ,"Verbaliser avec l’IA": "Verbalize with AI"
    ,"Direction visuelle 1930s : décor, lumière, matière et langage photographique.": "1930s visual direction: setting, lighting, material, and photographic language."
    ,"Matières & peau": "Materials & skin"
    ,"Éclairages": "Lighting"
    ,"Rétablir la sélection Beauty": "Restore Beauty selection"
    ,"Début de siècle": "Early century"
    ,"Compact Numérique": "Digital compact"
    ,"Caméscope": "Camcorder"
    ,"Caméra TV / Tube": "TV / tube camera"
    ,"Sujet ou description libre": "Subject or free description"
    ,"T-shirt blanc + chaîne + jean": "White T-shirt + chain + jeans"
    ,"Robe à fleurs + sandales": "Floral dress + sandals"
    ,"Perfecto + col roulé + bottes": "Leather jacket + turtleneck + boots"
    ,"Chemise hawaïenne + cargo": "Hawaiian shirt + cargo pants"
    ,"Chemise bureau débraillée": "Untucked office shirt"
    ,"Survêtement + baskets neuves": "Tracksuit + new sneakers"
    ,"Gros pull + velours côtelé": "Chunky sweater + corduroy"
    ,"Blazer décontracté + t-shirt": "Casual blazer + T-shirt"
    ,"Débardeur + short basket": "Tank top + basketball shorts"
    ,"Doudoune + écharpe + bottes": "Puffer jacket + scarf + boots"
    ,"Salopette jean + marinière": "Denim overalls + striped shirt"
    ,"Coupe-vent 90s + rétro": "1990s windbreaker + retro styling"
    ,"Toge de diplômé": "Graduation gown"
    ,"Regard caméra, détendu·e": "Relaxed, looking at camera"
    ,"Adossé·e au mur, bras croisés": "Leaning against a wall, arms crossed"
    ,"Sur le canapé avec un mug": "On the sofa with a mug"
    ,"Signe peace, penché·e": "Leaning in, peace sign"
    ,"Profil, non posé·e": "Unposed profile"
    ,"En groupe, bras sur l'épaule": "In a group, arm over a shoulder"
    ,"Allongé·e, plongée depuis le haut": "Lying down, top-down view"
    ,"Penché·e sur son téléphone": "Leaning over a phone"
    ,"Pose raide, sourire forcé": "Stiff pose, forced smile"
    ,"De dos, regard par-dessus l'épaule": "Back view, looking over the shoulder"
    ,"Assis·e dans un escalier": "Sitting on stairs"
    ,"Pris·e en clignant des yeux": "Caught blinking"
    ,"Avec un animal dans les bras": "Holding an animal"
    ,"Soufflant des bougies": "Blowing out candles"
    ,"Chambre en désordre (nuit)": "Messy bedroom (night)"
    ,"Soirée / house party": "Party / house party"
    ,"Cuisine (néon, bazar)": "Kitchen (neon, clutter)"
    ,"Barbecue jardin (crépuscule)": "Garden barbecue (dusk)"
    ,"Trottoir ville (nuit, néons)": "City sidewalk (night, neon)"
    ,"Intérieur de voiture": "Car interior"
    ,"Banc de parc (soleil filtré)": "Park bench (filtered sunlight)"
    ,"Couloir d'école / fac": "School / university hallway"
    ,"Salon (lumière tamisée, TV)": "Living room (dim light, TV)"
    ,"Station de métro": "Subway station"
    ,"Sentier en forêt": "Forest trail"
    ,"Réception de mariage": "Wedding reception"
    ,"Rayon de supermarché": "Supermarket aisle"
    ,"Sérieux": "Serious"
    ,"Ennuyé": "Bored"
    ,"Ému / larmes aux yeux": "Emotional / teary-eyed"
    ,"En colère": "Angry"
    ,"Pensif / rêveur": "Thoughtful / dreamy"
    ,"Épuisé": "Exhausted"
    ,"Gêné / mal à l'aise": "Embarrassed / uncomfortable"
    ,"Éméché / joyeux": "Tipsy / cheerful"
    ,"Effrayé": "Frightened"
    ,"Concentré": "Focused"
    ,"Très grainé": "Very grainy"
    ,"Flou extrême": "Extreme blur"
    ,"Usure / âge": "Wear / age"
    ,"Très abîmé": "Heavily damaged"
    ,"Accidenté": "Rough"
    ,"Rétablir les réglages Realism": "Restore Realism settings"
    ,"Chaque variante produit une seule image contenant une grille de 9 propositions.": "Each variant produces one image containing a grid of 9 proposals."
    ,"3D Lab · Vidéo": "3D Lab · Video"
    ,"État conservé dans le setup actif": "State saved in the active setup"
    ,"Rétablir Story": "Restore Story"
    ,"A1 Contact sheet  →  A2 Character sheet  →  B Storyboard  →  C Image isolée": "A1 Contact sheet  →  A2 Character sheet  →  B Storyboard  →  C Isolated image"
    ,"Fabrique une couverture multi-angle cohérente à partir de l’image principale.": "Create a consistent multi-angle overview from the main image."
    ,"Produit les 7 vues techniques fixes du même personnage, indépendamment de la grille.": "Produce 7 fixed technical views of the same character, independently of the grid."
    ,"Transforme une scène en storyboard séquentiel et permet d’en produire des variations.": "Turn a scene into a sequential storyboard and create variations of it."
    ,"Isole un panneau valide du storyboard en une seule image cinématographique.": "Extract a valid storyboard panel as a single cinematic image."
    ,"Orbite autour du sujet": "Orbit around subject"
    ,"Gestes des mains": "Hand gestures"
    ,"Micro-mouvements des yeux": "Micro eye movements"
    ,"Respirations entre les phrases": "Breaths between sentences"
    ,"Mouvement naturel des cheveux": "Natural hair movement"
    ,"Importer des images": "Import images"
    ,"Sujet principal": "Main subject"
    ,"+ Sujet secondaire": "+ Secondary subject"
    ,"+ Décor secondaire": "+ Secondary setting"
    ,"Cette histoire guide l’ordre des plans sans remplacer la direction d’action.": "This story guides shot order without replacing the action direction."
    ,"Copier la liste des 10 images": "Copy the list of 10 images"
    ,"Non enregistré": "Not saved"
    ,"Sélection · V": "Selection · V"
    ,"Flèche · A": "Arrow · A"
    ,"Dépose une vidéo": "Drop a video"
    ,"ou utilise “Importer une vidéo”": "or use “Import video”"
    ,"Vider les captures": "Clear captures"
    ,"OpenAI · clé prête": "OpenAI · key ready"
    ,"Dépose une image ici": "Drop an image here"
    ,"Importer une image": "Import image"
    ,"Glisse pour orbiter la caméra · molette pour la distance": "Drag to orbit the camera · wheel to adjust distance"
    ,"Aucune image": "No image"
    ,"Plongée": "High angle"
    ,"Contre-plongée": "Low angle"
    ,"Glisse pour déplacer la lumière sélectionnée · molette pour la distance": "Drag to move the selected light · wheel to adjust distance"
    ,"Dépose une vidéo ou un audio": "Drop a video or audio file"
    ,"La fenêtre analysée est limitée à 15 secondes.": "The analyzed window is limited to 15 seconds."
    ,"Copier Prompt vidéo": "Copy video prompt"
    ,"Schéma + prompt factuel": "Diagram + factual prompt"
    ,"Le schéma conserve les proportions et les mesures exactes. Aucun raffinement IA n’est appliqué.": "The diagram preserves exact proportions and measurements. No AI refinement is applied."
    ,"Prêt à envoyer le schéma et son prompt.": "Ready to send the diagram and its prompt."
    ,"Kodak FunSaver, Fujifilm QuickSnap, AGFA LeBox. Objectif plastique fixe, flash intégré, film 400-800 ISO. L'appareil des fêtes, des vacances, des mariages.": "Kodak FunSaver, Fujifilm QuickSnap, AGFA LeBox. Fixed plastic lens, built-in flash, ISO 400–800 film. The camera of parties, vacations, and weddings."
    ,"Kodak FunSaver — Soirée": "Kodak FunSaver — Party"
    ,"Kodak FunSaver · 35mm · ISO 800 · f/10 · 30mm plastique · Flash intégré": "Kodak FunSaver · 35mm · ISO 800 · f/10 · 30mm plastic · Built-in flash"
    ,"AGFA LeBox — Intérieur Nuit": "AGFA LeBox — Night Interior"
    ,"Angle · caméra 3D": "Angle · 3D camera"
    ,"Timeline multipiste, moniteur composité, effets, masques, fondus et rendu FFmpeg.": "Multitrack timeline, composited monitor, effects, masks, fades, and FFmpeg rendering."
  }));
  const reverseDictionary = new Map([...dictionary].map(([french, english]) => [english, french]));

  const patterns = [
    [/^(\d+) outil\(s\) · intégré$/, (_, n) => `${n} tool${n === "1" ? "" : "s"} · built-in`],
    [/^(\d+) outil\(s\) · personnel$/, (_, n) => `${n} tool${n === "1" ? "" : "s"} · personal`],
    [/^(\d+) élément(?:s)?$/, (_, n) => `${n} item${n === "1" ? "" : "s"}`],
    [/^(\d+) setup(?:s)?$/, (_, n) => `${n} setup${n === "1" ? "" : "s"}`],
    [/^Clés prêtes : (.+)$/, (_, providers) => `Keys ready: ${providers}`],
    [/^Complexité · (.+)$/, (_, value) => `Complexity · ${value}`],
    [/^Absurdité · (.+)$/, (_, value) => `Absurdity · ${value}`],
    [/^SEED SLIDERS · (\d+) familles$/, (_, count) => `SEED SLIDERS · ${count} families`],
    [/^(\d+) tuiles$/, (_, count) => `${count} tiles`],
    [/^Télécharger (.+)$/, (_, label) => `Download ${label}`],
    [/^Envoyer (.+) à BZ$/, (_, label) => `Send ${label} to BZ`],
    [/^Lumières · (.+)$/, (_, count) => `Lights · ${count}`],
    [/^Aucun résultat dans cette catégorie\.$/, () => "No results in this category."],
    [/^Emplacement vide$/, () => "Empty slot"],
    [/^Choisir un préréglage…$/, () => "Choose a preset…"],
    [/^Ajouter (.+) au Deck$/, (_, title) => `Add ${title} to Deck`],
    [/^Retirer (.+) du Deck$/, (_, title) => `Remove ${title} from Deck`],
    [/^Rechercher dans (.+)…$/, (_, name) => `Search ${name}…`],
    [/^(.+) copié\.$/, (_, name) => `${name} copied.`],
    [/^(\d+) recettes?$/, (_, count) => `${count} recipe${count === "1" ? "" : "s"}`],
    [/^(\d+) découpes? · (\d+) traits?$/, (_, slices, lines) => `${slices} slice${slices === "1" ? "" : "s"} · ${lines} line${lines === "1" ? "" : "s"}`],
    [/^(\d+) réglages? actifs?$/, (_, count) => `${count} active setting${count === "1" ? "" : "s"}`],
    [/^(\d+) contraintes?$/, (_, count) => `${count} constraint${count === "1" ? "" : "s"}`],
    [/^(\d+) résultats? dans toute la bibliothèque$/, (_, count) => `${count} result${count === "1" ? "" : "s"} in the entire library`],
    [/^(\d+) résultats? dans la catégorie active$/, (_, count) => `${count} result${count === "1" ? "" : "s"} in the active category`],
    [/^(\d+) prompts? dans cette catégorie$/, (_, count) => `${count} prompt${count === "1" ? "" : "s"} in this category`],
    [/^(\d+) caractères?( · personnalisé)?$/, (_, count, custom) => `${count} character${count === "1" ? "" : "s"}${custom ? " · custom" : ""}`],
    [/^(\d+) cartes? · (\d+) caractères?$/, (_, cards, chars) => `${cards} card${cards === "1" ? "" : "s"} · ${chars} character${chars === "1" ? "" : "s"}`],
    [/^Setup « (.+) » chargé\.$/, (_, name) => `Setup “${name}” loaded.`],
    [/^(.+) · révision (\d+)$/, (_, value, revision) => `${value} · revision ${revision}`],
    [/^Supprimer la catégorie « (.+) » \?$/, (_, name) => `Delete category “${name}”?`],
    [/^Copier (.+) sans détails$/, (_, name) => `Copy ${name} without details`],
    [/^(\d+) \/ (\d+) caractères$/, (_, count, limit) => `${count} / ${limit} characters`],
    [/^(\d+) sélectionné\(s\)$/, (_, count) => `${count} selected`]
    ,[/^(\d[\d\s ]*) entrées? source · deck ordonné et sauvegardé dans ce setup\.$/, (_, count) => `${count} source entries · deck ordered and saved in this setup.`]
    ,[/^(\d+) résultat\(s\)$/, (_, count) => `${count} result${count === "1" ? "" : "s"}`]
    ,[/^(\d+) prompts? dans (.+)$/, (_, count, category) => `${count} prompt${count === "1" ? "" : "s"} in ${category}`]
    ,[/^Modèle global : (.+)$/, (_, model) => `Global model: ${model}`]
  ];

  const frenchPatterns = [
    [/^(\d+) outil\(s\) · intégré$/, (_, n) => `${n} outil${n === "1" ? "" : "s"} · intégré`],
    [/^(\d+) outil\(s\) · personnel$/, (_, n) => `${n} outil${n === "1" ? "" : "s"} · personnel`],
    [/^(\d+) outil\(s\) intégré\(s\) modifié\(s\)$/, (_, n) => `${n} outil${n === "1" ? " intégré modifié" : "s intégrés modifiés"}`]
  ];

  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();
  const appliedText = new WeakMap();
  let applying = false;
  let language = root.dataset.language === "fr" ? "fr" : "en";
  let theme = root.dataset.theme === "light" ? "light" : "dark";
  let lastSharedUpdatedAt = "";
  let sharedWriteTimer = null;

  function translateCore(value) {
    if (!value) return value;
    if (language === "fr") {
      const exact = reverseDictionary.get(value);
      if (exact !== undefined) return exact;
      for (const [pattern, replacer] of frenchPatterns) {
        if (pattern.test(value)) return value.replace(pattern, replacer);
      }
      return value;
    }
    const exact = dictionary.get(value);
    if (exact !== undefined) return exact;
    for (const [pattern, replacer] of patterns) {
      if (pattern.test(value)) return value.replace(pattern, replacer);
    }
    return value;
  }

  function translateValue(value) {
    if (typeof value !== "string") return value;
    const match = value.match(/^(\s*)([\s\S]*?)(\s*)$/);
    return `${match[1]}${translateCore(match[2])}${match[3]}`;
  }

  function skipText(node) {
    const parent = node.parentElement;
    return !parent || Boolean(parent.closest("script,style,textarea,pre,code,[contenteditable='true']"));
  }

  function rememberAttribute(element, name, value) {
    let values = originalAttributes.get(element);
    if (!values) { values = new Map(); originalAttributes.set(element, values); }
    values.set(name, value);
  }

  function applyElement(element, capture = false) {
    if (!(element instanceof Element)) return;
    for (const name of ["placeholder", "title", "aria-label"]) {
      if (!element.hasAttribute(name)) continue;
      const values = originalAttributes.get(element);
      if (capture || !values?.has(name)) rememberAttribute(element, name, element.getAttribute(name));
      const original = originalAttributes.get(element)?.get(name) ?? element.getAttribute(name);
      const next = translateValue(original);
      if (element.getAttribute(name) !== next) element.setAttribute(name, next);
    }
  }

  function applyText(node, capture = false) {
    if (skipText(node)) return;
    if (capture || !originalText.has(node)) originalText.set(node, node.nodeValue);
    const original = originalText.get(node) ?? node.nodeValue;
    const next = translateValue(original);
    if (node.nodeValue !== next) {
      appliedText.set(node, next);
      node.nodeValue = next;
    }
  }

  function applyTree(target, capture = false) {
    if (!target) return;
    if (target.nodeType === Node.TEXT_NODE) return applyText(target, capture);
    if (!(target instanceof Element || target instanceof Document)) return;
    if (target instanceof Element) applyElement(target, capture);
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeType === Node.TEXT_NODE) applyText(node, capture);
      else applyElement(node, capture);
    }
  }

  function updateControls() {
    document.querySelectorAll("[data-theme-choice]").forEach((button) => {
      const active = button.dataset.themeChoice === theme;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-language-choice]").forEach((button) => {
      const active = button.dataset.languageChoice === language;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function preferencePayload() {
    return { type: "barz:preferences", theme: theme === "light" ? "sand" : "atlas-studio", language };
  }

  function syncFrame(frame) {
    if (!(frame instanceof HTMLIFrameElement)) return;
    try { frame.contentWindow?.postMessage(preferencePayload(), window.location.origin); } catch {}
    if (frame.dataset.barzPreferenceBound !== "1") {
      frame.dataset.barzPreferenceBound = "1";
      frame.addEventListener("load", () => {
        try { frame.contentWindow?.postMessage(preferencePayload(), window.location.origin); } catch {}
      });
    }
  }

  function syncFrames() {
    document.querySelectorAll("iframe").forEach(syncFrame);
  }

  async function writeSharedPreferences() {
    try {
      const response = await fetch("/api/v1/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, language })
      });
      if (!response.ok) return;
      const value = await response.json();
      lastSharedUpdatedAt = value.updatedAt || lastSharedUpdatedAt;
    } catch {}
  }

  function scheduleSharedWrite() {
    clearTimeout(sharedWriteTimer);
    sharedWriteTimer = setTimeout(writeSharedPreferences, 80);
  }

  async function readSharedPreferences() {
    try {
      const response = await fetch("/api/v1/preferences", { cache: "no-store" });
      if (!response.ok) return;
      const value = await response.json();
      if (value.updatedAt && value.updatedAt === lastSharedUpdatedAt) return;
      lastSharedUpdatedAt = value.updatedAt || "";
      setTheme(value.theme, false);
      setLanguage(value.language, false);
    } catch {}
  }

  function setTheme(next, persist = true) {
    theme = next === "light" ? "light" : "dark";
    root.dataset.theme = theme;
    if (document.body) document.body.dataset.theme = theme;
    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, theme);
        localStorage.setItem("barzy-home-theme", theme === "light" ? "sand" : "atlas-studio");
        localStorage.setItem("barzy-theme-version", "40");
      } catch {}
      scheduleSharedWrite();
    }
    updateControls();
    syncFrames();
    window.dispatchEvent(new CustomEvent("barz:themechange", { detail: { theme } }));
  }

  function setLanguage(next, persist = true) {
    language = next === "fr" ? "fr" : "en";
    root.dataset.language = language;
    root.lang = language;
    if (document.body) document.body.dataset.language = language;
    if (persist) {
      try { localStorage.setItem(LANGUAGE_KEY, language); } catch {}
      scheduleSharedWrite();
    }
    applying = true;
    try { applyTree(document); } finally { applying = false; }
    updateControls();
    syncFrames();
    window.dispatchEvent(new CustomEvent("barz:languagechange", { detail: { language } }));
  }

  function bindControls() {
    document.querySelectorAll("[data-theme-choice]").forEach((button) => {
      if (button.dataset.preferenceBound === "1") return;
      button.dataset.preferenceBound = "1";
      button.addEventListener("click", () => setTheme(button.dataset.themeChoice));
    });
    document.querySelectorAll("[data-language-choice]").forEach((button) => {
      if (button.dataset.preferenceBound === "1") return;
      button.dataset.preferenceBound = "1";
      button.addEventListener("click", () => setLanguage(button.dataset.languageChoice));
    });
  }

  async function start() {
    try {
      theme = localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
      language = localStorage.getItem(LANGUAGE_KEY) === "fr" ? "fr" : "en";
    } catch {}
    applying = true;
    try { applyTree(document, true); } finally { applying = false; }
    bindControls();
    setTheme(theme, false);
    setLanguage(language, false);
    await readSharedPreferences();
    window.setInterval(readSharedPreferences, 1_000);

    const observer = new MutationObserver((mutations) => {
      if (applying) return;
      applying = true;
      try {
        for (const mutation of mutations) {
          if (mutation.type === "characterData") {
            if (appliedText.get(mutation.target) === mutation.target.nodeValue) appliedText.delete(mutation.target);
            else applyText(mutation.target, true);
          }
          mutation.addedNodes.forEach((node) => applyTree(node, true));
        }
        bindControls();
        syncFrames();
      } finally { applying = false; }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  window.barzPreferences = {
    get language() { return language; },
    get theme() { return theme; },
    setLanguage,
    setTheme,
    refresh() { applyTree(document); updateControls(); syncFrames(); }
  };

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin || event.data?.type !== "barz:preferences") return;
    setTheme(event.data.theme === "sand" || event.data.theme === "light" ? "light" : "dark", false);
    setLanguage(event.data.language, false);
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
