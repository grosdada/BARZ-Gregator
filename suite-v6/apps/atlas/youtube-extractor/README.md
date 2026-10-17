# Extracteur YouTube

Petite app locale : coller un lien YouTube, choisir un passage à l'image près, extraire
en MP3 ou en MP4. Interface dans le navigateur, moteur local — rien ne sort de la machine
en dehors des requêtes à YouTube.

- Trim visuel : pellicule de vignettes, aperçu au survol, image exacte des points IN et OUT
- Zoom sur la timeline pour les vidéos longues
- Audio (MP3) ou vidéo (MP4), coupe exacte à quelques millisecondes
- Voyant d'avancement : étape, vitesse, temps écoulé, détection d'inactivité

**Prérequis :** `yt-dlp` et `ffmpeg` (`brew install yt-dlp ffmpeg`), Python 3.

**macOS et Windows**, avec le même `server.py` : les quelques mécanismes propres à chaque
système sont regroupés dans une petite couche en haut du fichier. Voir la section
« Windows » en bas.

---

# Extracteur YouTube

Petite app locale qui remplace la ligne de commande : URL → trim IN/OUT → bouton Extraire.

## Lancer

Double-clic sur **« Extracteur YouTube »** sur le **Bureau**. L'interface s'ouvre dans le
navigateur, c'est tout.

Le moteur ne se lance plus au clic : c'est un **service** géré par macOS, démarré à
l'ouverture de session et relancé automatiquement s'il s'arrête. L'icône du Bureau n'est
qu'un raccourci vers son adresse — elle ne peut donc pas « ne rien faire ».

Pour l'arrêter définitivement (il ne redémarrera plus, même à la prochaine session) :
**`Arrêter le service.command`** dans ce dossier. Et **`Démarrer le service.command`**
pour le remettre.

## Où vit le code

macOS interdit à un service de lire le dossier `Documents`. Le moteur tourne donc depuis
`~/Library/Application Support/Extracteur YouTube/`, atteignable ici via le raccourci
**`moteur-de-l-app`**.

Ce dossier-ci reste la copie de travail. Après toute modification de `server.py` ou
`index.html`, double-clic sur **`Mettre à jour l'app.command`**, puis
`Démarrer le service.command` pour recharger.

## Utiliser

1. Coller le lien YouTube, **Charger** — la vidéo apparaît dans un lecteur.
2. Placer le passage — le trim est visuel de bout en bout :
   - la barre sous les panneaux est une **pellicule** : les vignettes de la vidéo, en clair
     pour la partie sélectionnée, assombries autour. Survole-la pour voir l'image à n'importe
     quel endroit sans rien déplacer.
   - **tire les poignées** (bleue = IN, orange = OUT) : le lecteur se cale en direct sur
     l'image, figé, sans partir en lecture.
   - dès que tu lâches, les deux panneaux affichent l'**image exacte** de la première et de la
     dernière frame de l'extrait (mention « image exacte » en bas à gauche, ~1 s d'attente).
   - réglage fin : `«` `»` décalent d'1 s, `‹` `›` de 0,1 s, ou tape le temps à la main
     (`1:23`, `12:30`, `1:02:03`).
   - au clavier : <kbd>I</kbd> et <kbd>O</kbd> posent IN/OUT au point de lecture,
     <kbd>←</kbd><kbd>→</kbd> décalent de 0,1 s le panneau sélectionné (1 s avec Maj).
     Si les raccourcis ne répondent pas, clique une fois hors du lecteur YouTube :
     tant que le lecteur a le focus, c'est lui qui capte les touches.
   - **zoom** sur les longues vidéos : `+` / `−`, la **molette** sur la pellicule (le zoom
     se fait autour du curseur), **⤢ Sélection** pour cadrer l'extrait, **Tout** pour revenir
     à la vue complète. Une fois zoomé, une mini-barre sous la pellicule montre où tu te
     trouves dans la vidéo : glisse-la pour te déplacer. En tirant une poignée jusqu'au bord,
     la vue défile toute seule.
   - **Écouter la sélection** relit exactement l'extrait choisi.
   - **↺ Réinitialiser** (à côté de *Charger*) repart de zéro sans toucher à tes réglages
     de dossier et de format.
3. **Audio (MP3)** ou **Vidéo (MP4)** — pour la vidéo, une qualité max au choix.
4. Choisir le dossier (**Parcourir…**), puis **Extraire**.
   Le fichier apparaît en bas avec *Ouvrir* et *Finder*.

Le compteur de durée passe au **vert entre 60 et 180 s** en mode audio : c'est la fenêtre
utile pour un clone de voix ElevenLabs.

Le dernier dossier, le mode et la qualité sont mémorisés dans `.prefs.json`.

## Pendant l'extraction

Sous le bouton *Extraire* : l'étape en cours, la vitesse, le temps écoulé et un point vert
qui bat. Quand yt-dlp donne un pourcentage la barre le suit ; sinon elle défile, pour que
l'immobilité ne soit jamais confondue avec un plantage. Après 45 secondes sans le moindre
signe, un encadré le dit franchement et rappelle qu'Arrêter ne casse rien.

Une extraction sur une vidéo longue prend du temps : c'est le débit de YouTube qui commande,
et il varie beaucoup d'une fois sur l'autre. Compte quelques dizaines de secondes pour un
extrait pris au milieu d'une vidéo de deux heures.

## Si ça se bloque

L'interface ne peut plus rester figée : si le serveur ne répond plus, un message le dit et le
bouton *Extraire* redevient utilisable. Relance l'app depuis le Bureau et recharge la page.

**Arrêter** interrompt vraiment l'extraction, yt-dlp et ffmpeg compris. Les fichiers de
travail vivent dans le dossier temporaire du système : une extraction interrompue ne laisse
jamais de `.webm` ni de fichier incomplet dans ton dossier de destination.

## Nom des fichiers

`Titre_de_la_video_12m30s-14m00s.mp3` — le minutage est dans le nom, donc plusieurs extraits
de la même vidéo ne s'écrasent pas.

## Comment l'aperçu marche

Deux sources d'image, complémentaires :

- les **planches de vignettes** de YouTube (une image toutes les ~5 s) : instantanées, elles
  servent à la pellicule, au survol et au retour pendant que tu tires une poignée ;
- l'**image exacte** au timecode demandé, découpée par ffmpeg dans le flux : ~1 s, déclenchée
  quand tu arrêtes de bouger. C'est elle qui te dit précisément où tombe la coupe.

Les vidéos courtes n'ont pas de planches côté YouTube : dans ce cas la pellicule reste neutre,
mais les images exactes fonctionnent quand même.

## Dépendances

`yt-dlp` et `ffmpeg` (déjà installés). Les pastilles en haut à droite le confirment.
Pour mettre à jour yt-dlp quand YouTube change quelque chose :

    brew upgrade yt-dlp

---

## Windows

### Installation

1. **Python 3** — [python.org/downloads](https://www.python.org/downloads/), en cochant
   **« Add python.exe to PATH »** à l'installation.
2. **yt-dlp et ffmpeg** — dans un terminal :

   ```
   winget install yt-dlp.yt-dlp
   winget install Gyan.FFmpeg
   ```

   Puis **ferme et rouvre le terminal** pour que le PATH soit pris en compte.
3. Récupère ce dossier et double-clique sur **`Extracteur YouTube.bat`**.

Pour y accéder plus vite, pose un raccourci vers ce `.bat` sur le bureau et donne-lui
`Extracteur YouTube.ico` comme icône — une bobine de cinéma, lisible jusqu'à 16 px.
**Copie d'abord le `.ico` sur un disque local** (par exemple
`%LOCALAPPDATA%\YT-Extractor\`) et pointe le raccourci dessus : si le dossier du projet
vit sur un lecteur réseau, Explorer refuse d'en charger l'icône et le raccourci reste
nu.

Une fenêtre de console s'ouvre et l'interface apparaît dans le navigateur. Laisse la
console ouverte pendant l'utilisation ; la fermer arrête l'app. Le lanceur prévient si
Python, yt-dlp ou ffmpeg manquent, au lieu de se refermer sans explication.

Il n'y a pas de service qui démarre tout seul comme sur macOS : sous Windows, l'app tourne
tant que la console est ouverte. Pour un lancement au démarrage de la session, place un
raccourci vers le `.bat` dans le dossier `shell:startup`.

### Ce qui diffère entre les deux systèmes

Tout est isolé en haut de `server.py` (`popen_extra`, `kill_tree`, `open_file`,
`reveal_file`, `choose_folder`) :

| Élément | macOS | Windows |
|---|---|---|
| Arrêt d'une extraction | groupe de processus + `SIGTERM`/`SIGKILL` | `CTRL_BREAK`, puis `taskkill /T /F` |
| Sélecteur de dossier | `osascript` | `tkinter.filedialog`, dans un sous-process |
| Ouvrir un fichier | `open` | `os.startfile` |
| Afficher dans l'explorateur | `open -R` | `explorer /select,` |
| Lancement | agent `launchd` + raccourci Bureau | `Extracteur YouTube.bat` |

Le sélecteur de dossier passe par un sous-process : appelé depuis un thread du serveur,
tkinter est instable, alors qu'un process séparé est fiable.

### Testé ?

Les deux, désormais. La partie Windows a été exécutée et mesurée sur Windows 10 : coupe
exacte à la milliseconde, arrêt qui ne laisse ni processus ni fichier, sélecteur de
dossier, lancement par le `.bat`. Le détail des mesures et les quelques pièges rencontrés
sont dans `NOTE-POUR-CLAUDE-WINDOWS.md`.
