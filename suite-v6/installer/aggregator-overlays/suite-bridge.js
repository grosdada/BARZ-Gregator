const SUITE_SHELL_ORIGIN = (() => {
  const requested = new URLSearchParams(location.search).get("suiteShellOrigin");
  if (/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(requested || "")) return requested;
  try { return new URL(document.referrer).origin; } catch { return "http://127.0.0.1:4326"; }
})();

const root = document.documentElement;
const dictionary = new Map(Object.entries({
  "Retour à l’accueil": "Back to home",
  "Confirmation au-delà de 1,50 $US": "Confirmation above US$1.50",
  "Clés API": "API keys",
  "Type de création": "Creation type",
  "Créer": "Create",
  "Vidéos": "Videos",
  "Images": "Images",
  "Musique": "Music",
  "Dépenses": "Spending",
  "Import ressource": "Import resource",
  "Passerelle": "Gateway",
  "Importer": "Import",
  "Ouvrir Prompt Atlas 6": "Open Prompt Atlas 6",
  "Pack image et vidéo": "Image and video pack",
  "Bibliothèque existante": "Existing library",
  "Mes LoRA Krea": "My Krea LoRAs",
  "0 LoRA récupéré": "0 LoRAs imported",
  "Reload LoRAs": "Reload LoRAs",
  "Utiliser dans Images": "Use in Images",
  "Cette action importe ta bibliothèque Krea dans BARZ pour utiliser et mixer les LoRA Flux/Krea 1. Krea 2 est exclu. L’API Krea ne fournit pas ici les fichiers .safetensors : les poids restent hébergés chez Krea.": "This imports your Krea library into BARZ so Flux/Krea 1 LoRAs can be used and mixed. Krea 2 is excluded. Krea's API does not provide .safetensors files here: the weights remain hosted by Krea.",
  "Rechercher": "Search",
  "Nom ou modèle du LoRA…": "LoRA name or model…",
  "Aucun LoRA Krea récupéré. Connecte Krea dans API, puis lance l’import.": "No Krea LoRA imported. Connect Krea in API, then start the import.",
  "Aucun LoRA ne correspond à cette recherche.": "No LoRA matches this search.",
  "Flux compatible": "Flux compatible",
  "Conservé": "Saved",
  "Génération vidéo": "Video generation",
  "Saisie locale": "Local draft",
  "Mode vidéo": "Video mode",
  "Génération": "Generation",
  "Chaîne optique · photo et vidéo": "Optical chain · photo and video",
  "Réinitialiser": "Reset",
  "Enregistrer le preset": "Save preset",
  "Preset complet": "Full preset",
  "Assemblage libre": "Custom mix",
  "Chaîne de capture": "Capture chain",
  "Caméra": "Camera",
  "Aucune caméra": "No camera",
  "Lentille": "Lens",
  "Optique": "Optics",
  "Aucune lentille": "No lens",
  "Film / support": "Film / medium",
  "Aucun film / support": "No film / medium",
  "Lumière": "Lighting",
  "Aucune lumière": "No lighting",
  "Film cinéma": "Cinema film",
  "Cinéma numérique": "Digital cinema",
  "Photo 35 mm": "35 mm photography",
  "Moyen format": "Medium format",
  "Instantané analogique": "Analog instant",
  "Capteur trouvé": "Found-footage sensor",
  "Vidéo analogique et broadcast": "Analog and broadcast video",
  "Négatif couleur": "Color negative",
  "Diapositive": "Slide film",
  "Noir et blanc": "Black and white",
  "Expérimental": "Experimental",
  "Bande vidéo": "Videotape",
  "Lumière disponible": "Available light",
  "Studio contrôlé": "Controlled studio",
  "Pratiques": "Practical lights",
  "Expressif": "Expressive",
  "Choisis un preset ou compose ta chaîne de capture.": "Choose a preset or build your capture chain.",
  "Choisis au moins un élément Capture DNA.": "Choose at least one Capture DNA element.",
  "Ajouter au prompt": "Append to prompt",
  "Afficher dans le prompt": "Show in prompt",
  "Mettre à jour le texte": "Update prompt text",
  "Actif pour la génération": "Active for generation",
  "Capture DNA ajouté au prompt.": "Capture DNA appended to the prompt.",
  "Décris les artefacts, l’époque, le mouvement ou le format à préserver…": "Describe the artifacts, era, movement, or format to preserve…",
  "Ex. Clip VHS saturé": "E.g. saturated VHS clip",
  "VHS familial · 1986": "Family VHS · 1986",
  "Actualités ORTF · 1968": "ORTF news · 1968",
  "Reportage Super 16 · 1979": "Super 16 report · 1979",
  "Plateau TV français · 1974": "French TV studio · 1974",
  "Journal Betacam · 1993": "Betacam news · 1993",
  "Journal Hi8 · 1998": "Hi8 news · 1998",
  "Documentaire MiniDV · 2003": "MiniDV documentary · 2003",
  "Éditorial flash · 1996": "Flash editorial · 1996",
  "Documentaire INA · 1987": "INA documentary · 1987",
  "Digicam nocturne · 2006": "Night digicam · 2006",
  "Cinéma nocturne 500T": "500T night cinema",
  "Décris le plan, le mouvement, la lumière et ce qui doit évoluer…": "Describe the shot, movement, lighting, and what should evolve…",
  "Décris le sujet, le cadre, la lumière, la matière et le style…": "Describe the subject, framing, lighting, material, and style…",
  "Décris la composition, le tempo, les instruments, la structure et l’atmosphère…": "Describe the composition, tempo, instruments, structure, and atmosphere…",
  "Modèle": "Model",
  "Mode": "Mode",
  "Durée": "Duration",
  "Format": "Aspect ratio",
  "Résolution": "Resolution",
  "Texte → vidéo": "Text → video",
  "Texte → image": "Text → image",
  "Texte → vidéo · Draft": "Text → video · Draft",
  "Image → vidéo": "Image → video",
  "Image → vidéo · Draft": "Image → video · Draft",
  "Vidéo → vidéo": "Video → video",
  "Audio → vidéo": "Audio → video",
  "Édition / références": "Edit / references",
  "Multi-références": "Multi-reference",
  "Première / dernière image": "First / last frame",
  "Options du modèle": "Model options",
  "Fichier": "File",
  "Afficher ou saisir le seed": "Show or enter seed",
  "Avec audio": "With audio",
  "Sans audio": "Without audio",
  "Texte seul · Pour utiliser le deck, choisis un mode avec image ou références.": "Text only · To use the deck, choose an image or reference mode.",
  "Connecte ta clé fal dans Fournisseurs.": "Connect your fal key in Providers.",
  "Prompt négatif": "Negative prompt",
  "Prompt négatif et exclusions": "Negative prompt and exclusions",
  "Références": "References",
  "Ajouter un média de référence": "Add reference media",
  "Sauvegarder ou charger un set de références": "Save or load a reference set",
  "Glisse ici des images ou des sons, ou choisis-les dans Assets.": "Drop images or audio here, or choose them from Assets.",
  "Depuis le disque": "From disk",
  "Depuis Assets": "From Assets",
  "Dépose jusqu’à deux images ici. Elles restent aussi dans le deck Vidéo.": "Drop up to two images here. They also remain in the Video deck.",
  "Enregistrer le brouillon": "Save draft",
  "Le brouillon reste sur cette machine.": "The draft stays on this machine.",
  "Générer": "Generate",
  "Expliquer pourquoi la génération est indisponible": "Explain why generation is unavailable",
  "Génération indisponible": "Generation unavailable",
  "Ce qu’il faut corriger": "What needs fixing",
  "Passer en 16:9": "Switch to 16:9",
  "Rendu en cours": "Render in progress",
  "Voir dans la file": "View in queue",
  "Voir le résultat": "View result",
  "Aucun modèle de génération n’est sélectionné.": "No generation model is selected.",
  "Choisis un modèle disponible dans le menu Modèle.": "Choose an available model from the Model menu.",
  "Le prompt est vide.": "The prompt is empty.",
  "Écris au moins une instruction dans le champ Prompt.": "Enter at least one instruction in the Prompt field.",
  "Ouvre Fournisseurs, puis vérifie et enregistre la clé API correspondante.": "Open Providers, then verify and save the matching API key.",
  "Choisis 16:9 ou 9:16. Le bouton de correction passe directement en 16:9.": "Choose 16:9 or 9:16. The fix button switches directly to 16:9.",
  "Ajoute une référence du type accepté dans le deck.": "Add an accepted reference type to the deck.",
  "Retire les références en trop ou choisis un mode qui en accepte davantage.": "Remove extra references or choose a mode that accepts more.",
  "Remplace le média manquant, ou retire-le du deck.": "Replace the missing media or remove it from the deck.",
  "Ajoute le média demandé ou retire le token @image, @video ou @audio du prompt.": "Add the requested media or remove the @image, @video, or @audio token from the prompt.",
  "Ajoute une image ou une vidéo avec la référence audio.": "Add an image or video alongside the audio reference.",
  "Choisis une valeur proposée par le modèle sélectionné.": "Choose a value offered by the selected model.",
  "Ramène la valeur dans la plage autorisée affichée par le contrôle.": "Move the value back into the allowed range shown by the control.",
  "Raccourcis ou complète ce texte pour respecter les limites du modèle.": "Shorten or complete the text to meet the model limits.",
  "Renseigne les champs obligatoires indiqués dans le message.": "Fill in the required fields named in the message.",
  "Corrige ce point dans les réglages du modèle avant de demander le tarif.": "Fix this item in the model settings before requesting a quote.",
  "Les paramètres actuels ne peuvent pas être évalués.": "The current settings cannot be evaluated.",
  "Réinitialise les options du modèle ou sélectionne à nouveau le modèle.": "Reset the model options or select the model again.",
  "Le tarif de cette génération est indisponible.": "The price for this generation is unavailable.",
  "Actualise le modèle ou vérifie son endpoint dans Fournisseurs. Aucune dépense ne sera lancée sans tarif.": "Refresh the model or verify its endpoint in Providers. No spending will start without a price.",
  "Bibliothèque locale": "Local library",
  "Références réutilisables": "Reusable references",
  "Sauvegarde les références du lanceur actuel, puis recharge-les dans Image ou Vidéo quand tu en as besoin.": "Save the current launcher references, then reload them in Image or Video when needed.",
  "Sauver ou charger un set": "Save or load a set",
  "Nom du nouveau set": "New set name",
  "Sauvegarder": "Save",
  "Aucune image": "No image",
  "File locale": "Local queue",
  "File d’images": "Image queue",
  "Générations": "Generations",
  "Sur cette machine": "On this machine",
  "Filtrer l’historique": "Filter history",
  "Période de l’historique": "History range",
  "30 dernières": "Latest 30",
  "Tout": "All",
  "Dates": "Dates",
  "Du": "From",
  "Au": "To",
  "Date de début": "Start date",
  "Date de fin": "End date",
  "Aucune génération sur cette période.": "No generations in this period.",
  "Les prompts enregistrés et reçus de Prompt Atlas apparaîtront ici.": "Prompts saved here or received from Prompt Atlas will appear here.",
  "Aucune requête préparée.": "No request prepared.",
  "0 génération": "0 generations",
  "Arrêt auto": "Auto stop",
  "Direction en direct": "Live direction",
  "Régie vidéo continue · WebRTC": "Continuous video direction · WebRTC",
  "Session temps réel payante": "Paid real-time session",
  "Univers et continuité": "World and continuity",
  "Ouverture de la session": "Session opening",
  "Coût estimé à la limite": "Estimated cost at limit",
  "Minimum fal : 1,20 $ par session.": "fal minimum: $1.20 per session.",
  "Tarif indisponible": "Price unavailable",
  "Ajoute d’abord ta clé fal dans Connexions.": "Add your fal key in Connections first.",
  "Director envoie le bloc suivant dès que le précédent est appliqué.": "Director sends the next block once the previous one is applied.",
  "Envoi auto": "Auto send",
  "+ Bloc": "+ Block",
  "0 bloc prêt": "0 blocks ready",
  "Script natif · images-clés": "Native script · keyframes",
  "La première image ouvre la session ; les suivantes sont des images finales exactes à l’heure indiquée.": "The first image opens the session; the following images are exact final frames at the specified time.",
  "Prochaine action": "Next action",
  "Bloc": "Block",
  "Mémoire": "Memory",
  "Le flux apparaîtra ici": "The stream will appear here",
  "La session ne démarre qu’après confirmation.": "The session starts only after confirmation.",
  "Démarrer la régie": "Start direction",
  "Arrêter et sauvegarder": "Stop and save",
  "Bloc préparé 1": "Prepared block 1",
  "Supprimer le bloc 1": "Delete block 1",
  "Importe une suite d’images ou choisis-les dans Assets.": "Import an image sequence or choose one from Assets.",
  "Envoyer au prochain bloc": "Send to next block",
  "Ressources": "Resources",
  "Bibliothèque": "Library",
  "Filtrer les médias": "Filter media",
  "Catégorie de bibliothèque": "Library category",
  "Collections": "Collections",
  "Tous les assets": "All assets",
  "Sans collection": "Uncollected",
  "Aucun média ne correspond à ces filtres.": "No media matches these filters.",
  "Créer une collection": "Create collection",
  "Importer depuis le disque": "Import from disk",
  "Tous": "All",
  "Sons": "Audio",
  "Renommer": "Rename",
  "Déplacer": "Move",
  "Supprimer": "Delete",
  "Ouvrir l’emplacement du fichier": "Open file location",
  "Ouvrir l’original": "Open original",
  "Télécharger": "Download",
  "Coûts estimés des générations terminées. Les échecs et requêtes non confirmées ne sont pas comptés.": "Estimated costs for completed generations. Failed and unconfirmed requests are not counted.",
  "Regrouper les dépenses": "Group spending",
  "Ajoute la clé fal dans Connexions.": "Add your fal key in Connections.",
  "Ajoute la clé HeyGen dans Connexions.": "Add your HeyGen key in Connections.",
  "Recharger": "Top up",
  "Gérer": "Manage",
  "Aucune génération terminée sur cette période.": "No completed generation in this period.",
  "Ajoute un modèle dans Connexions.": "Add a model in Connections.",
  "Ce mois": "This month",
  "Actualisé à l’ouverture": "Updated when opened",
  "Crédit API disponible": "Available API credit",
  "Actualiser les crédits API": "Refresh API credits",
  "Actualiser": "Refresh",
  "Calendrier des dépenses": "Spending calendar",
  "Période précédente": "Previous period",
  "Période suivante": "Next period",
  "Lun": "Mon",
  "Mar": "Tue",
  "Mer": "Wed",
  "Jeu": "Thu",
  "Ven": "Fri",
  "Sam": "Sat",
  "Dim": "Sun",
  "Jour": "Day",
  "Mois": "Month",
  "Année": "Year",
  "Connexions partagées": "Shared connections",
  "Coffre local chiffré": "Encrypted local vault",
  "Coffre local chiffré partagé avec Prompt Atlas": "Encrypted local vault shared with Prompt Atlas",
  "Une seule configuration pour toute la suite.": "One configuration for the entire suite.",
  "Ces clés alimentent BARZ Aggregator et Prompt Atlas 6. Elles restent sur cette machine et ne sont jamais affichées après enregistrement.": "These keys power BARZ Aggregator and Prompt Atlas 6. They stay on this machine and are never displayed after saving.",
  "Fournisseurs": "Providers",
  "Génération image, vidéo et Director": "Image, video, and Director generation",
  "Lecture facultative du solde fal": "Optional fal balance access",
  "HeyGen Video 1 et dialogues": "HeyGen Video 1 and dialogue",
  "Analyse et outils IA de Prompt Atlas": "Prompt Atlas analysis and AI tools",
  "Claude dans Prompt Atlas": "Claude in Prompt Atlas",
  "Gemini dans Prompt Atlas": "Gemini in Prompt Atlas",
  "Raisonnement et auto-blocking": "Reasoning and auto-blocking",
  "Nouvelle clé fal": "New fal key",
  "Nouvelle clé fal Admin": "New fal Admin key",
  "Nouvelle clé HeyGen": "New HeyGen key",
  "Nouvelle clé OpenAI": "New OpenAI key",
  "Nouvelle clé Anthropic": "New Anthropic key",
  "Nouvelle clé Gemini": "New Gemini key",
  "Nouvelle clé DeepSeek": "New DeepSeek key",
  "Retirer": "Remove",
  "optionnel": "optional",
  "Vérifier et enregistrer": "Verify and save",
  "Vérifier le solde": "Check balance",
  "Non configuré": "Not configured",
  "Clé API fal · générations": "fal API key · generations",
  "Clé Admin fal · solde uniquement": "fal Admin key · balance only",
  "Clé API HeyGen": "HeyGen API key",
  "Ajouter un modèle fal": "Add a fal model",
  "Identifiant de l’endpoint": "Endpoint ID",
  "Vérifier": "Verify",
  "Aucun modèle vérifié": "No verified model",
  "Passerelle locale": "Local gateway",
  "Importer depuis Prompt Atlas": "Import from Prompt Atlas",
  "Importer une suite": "Import a suite",
  "Paquet JSON": "JSON package",
  "Dernière barrière": "Final checkpoint",
  "Confirmer la génération": "Confirm generation",
  "Action définitive": "Final action",
  "Voir le paquet envoyé au fournisseur": "View payload sent to provider",
  "Annuler": "Cancel",
  "Confirmer et générer": "Confirm and generate",
  "Chargement du tarif…": "Loading price…",
  "Le tarif sera revérifié avant l’envoi. Si son montant a changé, la génération sera bloquée et une nouvelle confirmation sera demandée.": "The price will be checked again before submission. If it changes, generation will be blocked and a new confirmation requested.",
  "Détail du résultat": "Result details",
  "Fermer": "Close",
  "Télécharger .zip": "Download .zip",
  "Ouvrir le dossier": "Open folder",
  "Remplacer depuis le disque": "Replace from disk",
  "Remplacer depuis Assets": "Replace from Assets",
  "Prêt": "Ready",
  "Effacer": "Clear",
  "Automatique": "Automatic",
  "Choisir dans Assets": "Choose from Assets",
  "Utiliser": "Use",
  "Original": "Original",
  "Séquence préparée": "Prepared sequence",
  "Suivi local": "Local tracking",
  "Suppression définitive": "Permanent deletion",
  "Supprimer la ressource ?": "Delete resource?",
  "Supprimer la collection ?": "Delete collection?",
  "Renommer la sélection": "Rename selection",
  "Déplacer vers": "Move to",
  "Aucun mode disponible": "No mode available"
}));
const reverseDictionary = new Map([...dictionary].map(([french, english]) => [english, french]));
const originalText = new WeakMap();
const originalAttributes = new WeakMap();
const appliedText = new WeakMap();
let applying = false;
let theme = "dark";
let language = "en";
let lastSharedUpdatedAt = "";
let writeTimer = null;

function normalized(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function translated(value) {
  const compact = normalized(value);
  if (!compact) return value;
  const result = language === "fr" ? reverseDictionary.get(compact) : dictionary.get(compact);
  if (result !== undefined) return value.replace(compact, result);
  if (language === "fr") return value;
  const phrases = [
    ["Génération d’image", "Image generation"],
    ["Génération musicale", "Music generation"],
    ["Génération en cours", "Generation in progress"],
    ["Le fournisseur ", "The provider "],
    [" n’est pas connecté.", " is not connected."],
    ["HeyGen 2K est disponible uniquement en 16:9 ou 9:16.", "HeyGen 2K is available only in 16:9 or 9:16."],
    ["Envoi sécurisé…", "Secure submission…"],
    ["Terminé", "Completed"],
    ["Échec", "Failed"],
    ["Annulé", "Cancelled"],
    ["À reprendre", "Needs attention"],
    ["Configurée", "Configured"],
    ["À configurer", "Set up"],
    ["Coller la clé API", "Paste API key"],
    ["Entrer une nouvelle clé pour la remplacer", "Enter a new key to replace it"],
    ["Lecture du coffre partagé…", "Reading shared vault…"],
    ["Coffre local prêt.", "Local vault ready."],
    ["Préparation…", "Preparing…"],
    ["Vérification du tarif…", "Checking price…"],
    ["Aucune dépense", "No spending"],
    ["Aucune nouvelle image ajoutée au script.", "No new image added to the script."],
    ["Dépose tes images ici", "Drop your images here"],
    ["Première image", "First frame"],
    ["Dernière image", "Last frame"],
    ["Début", "Start"],
    ["Fin", "End"],
    ["Connexion sécurisée au compte", "Secure connection to the"],
    ["Non connecté", "Not connected"],
    ["Usage facturé", "Billed usage"],
    ["Qualité", "Quality"],
    ["Rapide", "Fast"],
    ["Équilibrée", "Balanced"],
    ["Haute qualité", "High quality"],
    ["Aléatoire", "Random"],
    ["Référence", "Reference"],
    ["Vidéo mouvement", "Motion video"],
    ["Image personnage", "Character image"],
    ["Ajoute la vidéo dont le mouvement doit être reproduit", "Add the video whose motion should be reproduced"],
    ["Ajoute le personnage à animer", "Add the character to animate"],
    ["Sélectionner ce média", "Select this media"],
    ["Télécharger ce média", "Download this media"],
    ["Voir le détail", "View details"],
    ["Clic droit pour gérer", "Right-click to manage"],
    ["Actualisé à ", "Updated at "],
    [" au total", " total"],
    [" · optionnel", " · optional"],
    ["Bloc préparé ", "Prepared block "],
    ["Supprimer le bloc ", "Delete block "]
  ];
  let next = compact;
  for (const [french, english] of phrases) next = next.replaceAll(french, english);
  return next === compact ? value : value.replace(compact, next);
}
function applyText(node, capture = false) {
  if (node.parentElement?.closest("script,style,textarea,pre,code,[contenteditable='true']")) return;
  if (capture || !originalText.has(node)) originalText.set(node, node.nodeValue);
  const next = translated(originalText.get(node));
  if (node.nodeValue !== next) {
    appliedText.set(node, next);
    node.nodeValue = next;
  }
}
function applyElement(element, capture = false) {
  for (const name of ["placeholder", "title", "aria-label", "label"]) {
    if (!element.hasAttribute(name)) continue;
    let values = originalAttributes.get(element);
    if (!values) { values = new Map(); originalAttributes.set(element, values); }
    if (capture || !values.has(name)) values.set(name, element.getAttribute(name));
    element.setAttribute(name, translated(values.get(name)));
  }
}
function applyTree(target, capture = false) {
  if (!target) return;
  if (target.nodeType === Node.TEXT_NODE) return applyText(target, capture);
  if (!(target instanceof Element || target instanceof Document)) return;
  if (target instanceof Element) applyElement(target, capture);
  const walker = document.createTreeWalker(target, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) walker.currentNode.nodeType === Node.TEXT_NODE
    ? applyText(walker.currentNode, capture)
    : applyElement(walker.currentNode, capture);
}
function updateControls() {
  document.querySelectorAll("[data-theme-choice], [data-language-choice]").forEach((button) => {
    const active = button.dataset.themeChoice === theme || button.dataset.languageChoice === language;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}
function applyPreferences(nextTheme, nextLanguage) {
  const previousLanguage = language;
  theme = nextTheme === "light" ? "light" : "dark";
  language = nextLanguage === "fr" ? "fr" : "en";
  root.dataset.theme = theme;
  root.dataset.language = language;
  root.lang = language;
  document.body.dataset.theme = theme;
  document.body.dataset.language = language;
  applying = true;
  try { applyTree(document); } finally { applying = false; }
  updateControls();
  if (language !== previousLanguage) {
    window.dispatchEvent(new CustomEvent("barz:languagechange", { detail: { language } }));
  }
}
async function writePreferences() {
  try {
    const response = await fetch("/api/preferences", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme, language })
    });
    if (response.ok) lastSharedUpdatedAt = (await response.json()).updatedAt || lastSharedUpdatedAt;
  } catch {}
}
function scheduleWrite() { clearTimeout(writeTimer); writeTimer = setTimeout(writePreferences, 80); }
async function readPreferences() {
  try {
    const response = await fetch("/api/preferences", { cache: "no-store" });
    if (!response.ok) return;
    const value = await response.json();
    if (value.updatedAt && value.updatedAt === lastSharedUpdatedAt) return;
    lastSharedUpdatedAt = value.updatedAt || "";
    applyPreferences(value.theme, value.language);
  } catch {}
}
function injectControls() {
  if (document.querySelector(".rail-preferences")) return;
  const switchLink = document.querySelector(".app-switch-atlas");
  if (!switchLink) return;
  const container = document.createElement("div");
  container.className = "rail-preferences";
  container.setAttribute("aria-label", "Display preferences");
  container.innerHTML = `
    <div class="preference-switch theme-preference" role="group" aria-label="Theme">
      <button type="button" data-theme-choice="light" aria-label="Light theme" title="Light theme"><span aria-hidden="true">☀</span></button>
      <button type="button" data-theme-choice="dark" aria-label="Dark theme" title="Dark theme"><span aria-hidden="true">☾</span></button>
    </div>
    <div class="preference-switch language-preference" role="group" aria-label="Language">
      <button type="button" data-language-choice="en" aria-label="English">EN</button>
      <button type="button" data-language-choice="fr" aria-label="Français">FR</button>
    </div>`;
  switchLink.after(container);
  container.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    applyPreferences(button.dataset.themeChoice || theme, button.dataset.languageChoice || language);
    scheduleWrite();
  });
}

if (window.top === window) window.name = "barz-aggregator";
document.addEventListener("click", (event) => {
  const link = event.target.closest?.("a.app-switch-atlas");
  if (!link) return;
  event.preventDefault();
  if (window.parent !== window) {
    window.parent.postMessage({ type: "barz-suite:switch", app: "atlas", url: "http://127.0.0.1:4326/" }, SUITE_SHELL_ORIGIN);
    return;
  }
  window.location.assign("http://127.0.0.1:4326/suite.html?app=atlas");
}, true);

window.addEventListener("message", async (event) => {
  const message = event.data || {};
  if (event.source !== window.parent || event.origin !== SUITE_SHELL_ORIGIN || message.schemaVersion !== "1.0") return;
  const fromDataUrl = message.type === "barz-suite:import-reference" &&
    typeof message.dataUrl === "string" && message.dataUrl.startsWith("data:image/");
  const fromBlob = message.type === "barz-suite:import-reference-blob" &&
    message.blob instanceof Blob && /^(image|video)\//.test(message.mimeType || message.blob.type);
  if (!fromDataUrl && !fromBlob) return;
  try {
    const blob = fromBlob ? message.blob : await (await fetch(message.dataUrl)).blob();
    const fallbackExtension = blob.type.startsWith("video/") ? "webm" : "png";
    const file = new File([blob], message.name || `barz-reference-${Date.now()}.${fallbackExtension}`, {
      type: message.mimeType || blob.type || "application/octet-stream"
    });
    window.dispatchEvent(new CustomEvent("barz:external-reference", { detail: { file } }));
  } catch (error) {
    window.dispatchEvent(new CustomEvent("barz:external-reference-error", {
      detail: { message: error.message || "Reference import failed." }
    }));
  }
});

function start() {
  injectControls();
  applyTree(document, true);
  applyPreferences("dark", "en");
  readPreferences();
  window.setInterval(readPreferences, 1_000);
  const observer = new MutationObserver((mutations) => {
    if (applying) return;
    applying = true;
    try {
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData") {
          if (appliedText.get(mutation.target) === mutation.target.nodeValue) appliedText.delete(mutation.target);
          else applyText(mutation.target, true);
        }
        mutation.addedNodes.forEach((node) => applyTree(node, true));
      });
    } finally { applying = false; }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
