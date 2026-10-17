#!/usr/bin/env python3
"""Extracteur YouTube — petit serveur local qui pilote yt-dlp + ffmpeg.

Lancement : python3 server.py   (ou double-clic sur "Extracteur YouTube.command")
L'interface s'ouvre dans le navigateur sur http://127.0.0.1:8756
"""

import json
import os
import re
import shutil
import subprocess
import tempfile
import threading
import time
import signal
import sys
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("BARZ_YT_EXTRACTOR_PORT", "8756"))
DATA_DIR = os.path.abspath(os.path.expanduser(os.environ.get("BARZ_YT_EXTRACTOR_DATA_DIR", HERE)))
os.makedirs(DATA_DIR, exist_ok=True)
PREFS = os.path.join(DATA_DIR, ".prefs.json")

IS_WIN = sys.platform.startswith("win")
IS_MAC = sys.platform == "darwin"

# Homebrew n'est pas toujours dans le PATH d'un process lancé par double-clic.
if not IS_WIN:
    for p in ("/opt/homebrew/bin", "/usr/local/bin"):
        if p not in os.environ.get("PATH", "").split(":"):
            os.environ["PATH"] = p + ":" + os.environ.get("PATH", "")


# --------------------------------------------------- différences de plateforme
def popen_extra():
    """Isole yt-dlp (et les ffmpeg qu'il lance) pour pouvoir tout arrêter d'un coup."""
    if IS_WIN:
        return {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP}
    return {"start_new_session": True}


def kill_tree(proc, hard=False):
    """Arrête le processus et toute sa descendance."""
    if proc is None:
        return
    if IS_WIN:
        # Pas de groupe de processus tuable comme sous UNIX : on passe par taskkill,
        # qui sait suivre l'arborescence (/T).
        if hard:
            subprocess.run(["taskkill", "/T", "/F", "/PID", str(proc.pid)],
                           capture_output=True)
        else:
            try:
                os.kill(proc.pid, signal.CTRL_BREAK_EVENT)
            except Exception:
                subprocess.run(["taskkill", "/T", "/F", "/PID", str(proc.pid)],
                               capture_output=True)
    else:
        os.killpg(os.getpgid(proc.pid),
                  signal.SIGKILL if hard else signal.SIGTERM)


def open_file(path):
    """Ouvre un fichier avec l'application par défaut."""
    if IS_WIN:
        os.startfile(path)                       # noqa: S606 (Windows uniquement)
    elif IS_MAC:
        subprocess.run(["open", path])
    else:
        subprocess.run(["xdg-open", path])


def reveal_file(path):
    """Montre le fichier dans le gestionnaire de fichiers."""
    if IS_WIN:
        # explorer veut "/select," HORS guillemets et le chemin DEDANS. Passée en
        # liste, la commande est citée en bloc dès que le chemin contient une
        # espace — "/select,K:\un dossier\extrait.mp3" — et explorer ouvre
        # Documents au lieu de sélectionner le fichier (vérifié sous Windows 10).
        # D'où la ligne construite à la main. explorer renvoie 1 même quand il
        # réussit : on ignore le code de retour.
        subprocess.run('explorer /select,"%s"' % os.path.normpath(path))
    elif IS_MAC:
        subprocess.run(["open", "-R", path])
    else:
        subprocess.run(["xdg-open", os.path.dirname(path)])


def tool(name):
    return shutil.which(name)


def default_outdir():
    """Le dossier de téléchargement, écrit avec les séparateurs du système.

    Sans normpath, l'interface Windows affiche un chemin bâtard, mi-antislash
    mi-slash, hérité du "~/Downloads" écrit à l'unix.
    """
    return os.path.normpath(os.path.expanduser("~/Downloads"))


def missing(name):
    """Message d'outil manquant, avec la commande d'installation du système."""
    if IS_WIN:
        cmd = {"yt-dlp": "winget install yt-dlp.yt-dlp",
               "ffmpeg": "winget install Gyan.FFmpeg"}[name]
    elif IS_MAC:
        cmd = "brew install " + name
    else:
        cmd = "installe %s avec le gestionnaire de paquets de ta distribution" % name
    return "%s est introuvable. Installe-le : %s" % (name, cmd)


# ---------------------------------------------------------------- préférences
def load_prefs():
    try:
        with open(PREFS) as f:
            return json.load(f)
    except Exception:
        return {}


def save_prefs(d):
    try:
        cur = load_prefs()
        cur.update(d)
        with open(PREFS, "w") as f:
            json.dump(cur, f)
    except Exception:
        pass


# ------------------------------------------------------------------- le job
class Job:
    """Une extraction en cours. Un seul job à la fois, c'est suffisant."""

    def __init__(self):
        self.lock = threading.Lock()
        self.reset()

    def reset(self):
        self.running = False
        self.lines = []
        self.percent = 0.0
        self.stage = ""
        self.done = False
        self.ok = False
        self.files = []
        self.error = ""
        self.proc = None
        self.cancelled = False
        self.tmpdir = None
        self.started_at = time.time()
        self.last_at = time.time()      # dernier signe de vie de yt-dlp/ffmpeg
        self.speed = ""                 # ex. "×68" ou "1.2MiB/s"
        self.determinate = False        # a-t-on un vrai pourcentage ?

    def log(self, line, progress=False):
        with self.lock:
            self.last_at = time.time()
            if progress and self.lines and self.lines[-1].startswith("\x01"):
                self.lines[-1] = "\x01" + line      # on écrase la précédente
            else:
                self.lines.append(("\x01" if progress else "") + line)
            if len(self.lines) > 400:
                del self.lines[:200]

    def snapshot(self):
        with self.lock:
            return {
                "running": self.running,
                "lines": [l.lstrip("\x01") for l in self.lines[-60:]],
                "percent": self.percent,
                "stage": self.stage,
                "done": self.done,
                "ok": self.ok,
                "files": self.files,
                "error": self.error,
                "elapsed": time.time() - self.started_at,
                "idle": time.time() - self.last_at,
                "speed": self.speed,
                "determinate": self.determinate,
            }


JOB = Job()

PCT     = re.compile(r"\[download\]\s+([\d.]+)%")
FF_TIME = re.compile(r"\btime=(\d+):(\d+):([\d.]+)")      # progression ffmpeg
FF_SPD  = re.compile(r"\bspeed=\s*([\d.]+)x")
DL_SPD  = re.compile(r"\bat\s+([\d.]+\s*[KMG]?i?B/s)")
DL_ETA  = re.compile(r"\bETA\s+(\d+:\d+(?::\d+)?)")


# Clients YouTube de secours, dans l'ordre où on les essaie. Le client interrogé
# par défaut rend, sur beaucoup de vidéos, des URLs que googlevideo refuse ensuite
# de servir à ffmpeg : 403, et l'extraction meurt. Ces deux-là passent — vérifié
# sur plusieurs vidéos, en audio comme en vidéo. Ils ne proposent pas de m4a : les
# rejouer impose donc la voie sûre, d'où le fallback=True à l'appel.
CLIENTS_DE_SECOURS = ("tv_simply", "android")


def build_cmd(url, mode, start, end, outdir, tmpdir, quality, fallback=False,
              client=None):
    """Construit la ligne yt-dlp. start/end en secondes, ou None pour tout.

    En audio, deux stratégies : la rapide (m4a, coupe par fragments) et, si elle
    échoue, la sûre (n'importe quel flux + recalage sur les images-clés).

    `client` force le client YouTube interrogé : voir CLIENTS_DE_SECOURS.
    """
    tag = ""
    if start is not None and end is not None:
        tag = "_%s-%s" % (fmt_hms(start), fmt_hms(end))

    cmd = [
        tool("yt-dlp") or "yt-dlp",
        "--no-playlist",
        "--newline",
        "--progress",
        "--no-simulate",
        # --print impose le mode silencieux : --no-quiet rend les lignes d'état,
        # sans lesquelles on ne peut rien afficher d'utile pendant l'attente.
        "--no-quiet",
        "--print", "after_move:YTX_FILE:%(filepath)s",
        # les fichiers de travail (.webm, .part…) restent dans un dossier caché :
        # seul le fichier converti atterrit dans le dossier de destination.
        "-P", "home:" + outdir,
        "-P", "temp:" + tmpdir,
        "-o", "%(title).100B" + tag + ".%(ext)s",
        "--restrict-filenames",
    ]

    # Le recalage sur les images-clés garantit la coupe à la milliseconde, mais il
    # force un réencodage lent. En m4a, les fragments sont assez fins pour s'en
    # passer : mesuré sur une vidéo de 2 h, 38 s contre 170 s, pour un écart de
    # coupe de 15 ms. En webm en revanche il reste indispensable (10 s d'écart).
    keyframes = (mode != "audio") or fallback
    if start is not None and end is not None:
        cmd += ["--download-sections", "*%.2f-%.2f" % (start, end)]
        if keyframes:
            cmd += ["--force-keyframes-at-cuts"]

    if mode == "audio":
        fmt = "bestaudio/best" if fallback else "bestaudio[ext=m4a]"
        cmd += ["-f", fmt, "-x", "--audio-format", "mp3", "--audio-quality", "0"]
    else:
        height = {"1080": 1080, "720": 720, "480": 480}.get(quality)
        if height:
            fsel = ("bv*[height<=%d][ext=mp4]+ba[ext=m4a]/bv*[height<=%d]+ba/"
                    "b[height<=%d]/bv*+ba/b" % (height, height, height))
        else:
            fsel = "bv*[ext=mp4]+ba[ext=m4a]/bv*+ba/b"
        cmd += ["-f", fsel, "--merge-output-format", "mp4"]

    if client:
        cmd += ["--extractor-args", "youtube:player_client=" + client]

    cmd.append(url)
    return cmd


def explain(lines):
    """Traduit les erreurs yt-dlp les plus courantes en langage clair."""
    txt = "\n".join(lines[-25:])
    cas = [
        (("not a bot", "Too Many Requests", "429"),
         "YouTube limite temporairement les téléchargements depuis ta connexion "
         "(trop de requêtes rapprochées).\nAttends quelques minutes et réessaie — "
         "le même extrait repassera sans rien changer."),
        (("Video unavailable",),
         "Cette vidéo n'est pas disponible au téléchargement."),
        (("Private video", "members-only", "This video is available to this channel"),
         "Vidéo privée ou réservée aux abonnés : elle ne peut pas être extraite."),
        (("live stream recording is not available",),
         "L'enregistrement de ce direct n'est pas disponible."),
        # "age" tout court matchait "webpage", "message", "usage"… : toute panne
        # sans rapport était annoncée comme une restriction d'âge.
        (("Sign in to confirm your age", "age-restricted", "confirm your age"),
         "Vidéo soumise à une vérification d'âge : YouTube refuse le téléchargement."),
        (("HTTP Error 403", "403 Forbidden", "403: Forbidden"),
         "YouTube a refusé l'accès au flux (erreur 403), y compris avec les "
         "clients de secours.\nC'est souvent passager : attends "
         "quelques minutes et réessaie."),
        (("Requested format is not available",),
         "Aucun flux exploitable pour ce réglage. Essaie une autre qualité."),
    ]
    for motifs, message in cas:
        if any(m in txt for m in motifs):
            return message
    return None


def fmt_hms(sec):
    sec = int(round(sec))
    h, rem = divmod(sec, 3600)
    m, s = divmod(rem, 60)
    return "%dh%02dm%02ds" % (h, m, s) if h else "%02dm%02ds" % (m, s)


def run_job(*a):
    """Enveloppe : quoi qu'il arrive, le job se termine et l'interface repart."""
    try:
        _run_job(*a)
    except Exception as e:
        JOB.error = "Erreur interne : %s" % e
        JOB.stage = "Échec"
        JOB.running, JOB.done = False, True
    finally:
        if JOB.tmpdir:
            shutil.rmtree(JOB.tmpdir, ignore_errors=True)


def _run_job(url, mode, start, end, outdir, quality):
    JOB.reset()
    JOB.running = True
    JOB.started_at = JOB.last_at = time.time()
    JOB.stage = "Analyse de la vidéo…"

    if not tool("yt-dlp"):
        JOB.error = missing("yt-dlp")
        JOB.running, JOB.done = False, True
        return
    if mode == "audio" and not tool("ffmpeg"):
        JOB.error = missing("ffmpeg")
        JOB.running, JOB.done = False, True
        return

    try:
        os.makedirs(outdir, exist_ok=True)
    except Exception as e:
        JOB.error = "Dossier de destination inutilisable : %s" % e
        JOB.running, JOB.done = False, True
        return

    # Les fichiers de travail vont dans le dossier temporaire du système, jamais
    # dans le dossier de destination : rien à nettoyer chez l'utilisateur, et on
    # évite les restrictions d'accès de macOS sur Téléchargements / Documents.
    tmpdir = tempfile.mkdtemp(prefix="ytx-")
    JOB.tmpdir = tmpdir

    try:
        before = set(os.listdir(outdir))
    except OSError:
        before = None            # macOS peut interdire de lister : ce n'est qu'un filet
    seclen = (end - start) if (start is not None and end is not None) else None

    def attempt(fallback, client=None):
        """Une invocation de yt-dlp. Renvoie son code de retour."""
        cmd = build_cmd(url, mode, start, end, outdir, tmpdir, quality, fallback,
                        client)
        JOB.log("$ " + " ".join(cmd))
        JOB.stage = "Analyse de la vidéo…"
        try:
            proc = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, bufsize=1, cwd=outdir,
                **popen_extra(),          # pour pouvoir tout arrêter d'un coup
            )
            JOB.proc = proc
            for line in proc.stdout:
                line = line.rstrip("\n")
                if line.startswith("YTX_FILE:"):
                    path = line[len("YTX_FILE:"):].strip()
                    if path and path not in JOB.files:
                        JOB.files.append(path)
                    continue

                # --- progression : ffmpeg (extrait) ou yt-dlp (vidéo entière)
                is_progress = False
                m = FF_TIME.search(line)
                if m and seclen:
                    done = int(m.group(1))*3600 + int(m.group(2))*60 + float(m.group(3))
                    JOB.percent = max(0.0, min(99.0, done/seclen*100))
                    JOB.determinate = True
                    is_progress = True
                    sp = FF_SPD.search(line)
                    JOB.speed = ("×%s" % sp.group(1).rstrip("0").rstrip(".")) if sp else ""
                m = PCT.search(line)
                if m:
                    JOB.percent = float(m.group(1))
                    JOB.determinate = True
                    is_progress = True
                    sp, eta = DL_SPD.search(line), DL_ETA.search(line)
                    JOB.speed = (sp.group(1) if sp else "") + \
                                (("  ·  reste " + eta.group(1)) if eta else "")

                JOB.log(line, progress=is_progress)

                # --- étape en cours, dite avec les mots de l'utilisateur
                if "[ExtractAudio]" in line or "Extracting audio" in line:
                    JOB.stage, JOB.determinate = "Conversion en MP3…", False
                elif "[Merger]" in line:
                    JOB.stage, JOB.determinate = "Assemblage de la vidéo…", False
                elif "[MoveFiles]" in line or "Deleting original" in line:
                    JOB.stage, JOB.determinate = "Finalisation…", False
                elif "[download] Destination" in line or line.startswith("Input #0"):
                    JOB.stage = "Extraction du passage…"
                elif line.startswith("[info]"):
                    JOB.stage = "Préparation du flux…"
                elif line.startswith("[youtube]"):
                    JOB.stage = "Analyse de la vidéo…"
            return proc.wait()
        except Exception as e:
            JOB.error = str(e)
            return -1

    code = attempt(False)

    # La voie rapide (m4a) n'existe pas pour toutes les vidéos : en cas d'échec,
    # on repasse par la voie sûre plutôt que de rendre la main sur une erreur.
    if code != 0 and not JOB.files and mode == "audio" and not JOB.cancelled:
        JOB.log("")
        JOB.log("— la voie rapide a échoué, seconde tentative avec le flux de secours —")
        JOB.percent, JOB.determinate, JOB.speed, JOB.error = 0.0, False, "", ""
        code = attempt(True)

    # YouTube sert à ffmpeg des URLs qu'il refuse ensuite (403) selon le client
    # interrogé : c'est le motif d'échec le plus courant, et il ne dépend ni de la
    # vidéo ni du mode. On rejoue via un client dont les URLs passent.
    if (code != 0 and not JOB.files and not JOB.cancelled
            and any("403" in l for l in JOB.lines[-80:])):
        for secours in CLIENTS_DE_SECOURS:
            JOB.log("")
            JOB.log("— YouTube a refusé le flux (403) : nouvel essai via le client "
                    "%s —" % secours)
            JOB.percent, JOB.determinate, JOB.speed, JOB.error = 0.0, False, "", ""
            code = attempt(True, secours)
            if code == 0 and JOB.files:
                break
            if JOB.cancelled:
                break

    # Filet de sécurité : si --print n'a rien donné, on regarde les nouveaux fichiers.
    if not JOB.files and before is not None:
        try:
            after = set(os.listdir(outdir))
            JOB.files = [os.path.join(outdir, f) for f in sorted(after - before)
                         if not f.startswith(".")]
        except Exception:
            pass

    shutil.rmtree(tmpdir, ignore_errors=True)
    JOB.files = [f for f in JOB.files if os.path.exists(f)]
    JOB.ok = code == 0 and bool(JOB.files)

    # en mode audio, on exige bien un MP3 : sinon la conversion a échoué
    if JOB.ok and mode == "audio":
        bad = [f for f in JOB.files if not f.lower().endswith(".mp3")]
        if bad:
            JOB.ok = False
            JOB.error = ("La conversion en MP3 n'a pas abouti (fichier obtenu : %s).\n"
                         "Vérifie que ffmpeg répond : ffmpeg -version"
                         % os.path.basename(bad[0]))

    if not JOB.ok and not JOB.error:
        if JOB.cancelled:
            JOB.error = "Extraction arrêtée. Aucun fichier conservé."
        else:
            clair = explain(JOB.lines)
            if clair:
                JOB.error = clair
            else:
                tail = "\n".join(l.lstrip("\x01") for l in JOB.lines[-6:])
                JOB.error = "L'extraction a échoué (code %s).\n\n%s" % (code, tail)
    JOB.stage = "Terminé" if JOB.ok else ("Arrêté" if JOB.cancelled else "Échec")
    JOB.percent = 100.0 if JOB.ok else JOB.percent
    JOB.running, JOB.done = False, True


# --------------------------------------------------------------- infos vidéo
def pick_storyboard(formats):
    """Choisit la planche de vignettes la plus utile (tuiles ~160px de large)."""
    best, best_score = None, None
    for f in formats or []:
        if not str(f.get("format_id", "")).startswith("sb"):
            continue
        frags = f.get("fragments") or []
        w, fps = f.get("width"), f.get("fps")
        if not frags or not w or not fps:
            continue
        score = abs(w - 160) + (200 if w > 320 else 0)
        if best_score is None or score < best_score:
            best, best_score = f, score
    if not best:
        return None
    return {
        "fps": best["fps"],
        "rows": best.get("rows") or 1,
        "cols": best.get("columns") or 1,
        "tw": best["width"],
        "th": best.get("height") or int(best["width"] * 9 / 16),
        "frags": [fr["url"] for fr in best["fragments"]],
    }


def video_info(url):
    if not tool("yt-dlp"):
        raise RuntimeError(missing("yt-dlp"))
    out = subprocess.run(
        [tool("yt-dlp"), "-J", "--no-playlist", "--no-warnings", url],
        capture_output=True, text=True, timeout=90,
    )
    if out.returncode != 0:
        msg = (out.stderr or out.stdout).strip().splitlines()
        raise RuntimeError(msg[-1] if msg else "Lecture de la vidéo impossible.")
    d = json.loads(out.stdout)
    return {
        "id": d.get("id"),
        "title": d.get("title"),
        "duration": d.get("duration"),
        "uploader": d.get("uploader"),
        "thumbnail": d.get("thumbnail"),
        "storyboard": pick_storyboard(d.get("formats")),
    }


# ------------------------------------------------- images exactes (aperçu trim)
STREAM_LOCK = threading.Lock()
STREAM_CACHE = {}        # url vidéo -> (url de flux, timestamp)
FRAME_CACHE = {}         # (url vidéo, t arrondi) -> octets JPEG
FRAME_ORDER = []
FRAME_MAX = 240


def stream_url(url, force=False, client=None):
    """URL directe d'un flux léger, mise en cache (elle expire côté YouTube).

    `client` force le client YouTube interrogé : voir CLIENTS_DE_SECOURS.
    """
    cle = (url, client)
    with STREAM_LOCK:
        ent = STREAM_CACHE.get(cle)
    if ent and not force and time.time() - ent[1] < 5400:
        return ent[0]
    cmd = [tool("yt-dlp") or "yt-dlp", "--no-playlist", "--no-warnings", "--get-url",
           "-f", "bv*[height<=360][ext=mp4]/bv*[height<=480]/b[height<=480]/bv*/b"]
    if client:
        cmd += ["--extractor-args", "youtube:player_client=" + client]
    cmd.append(url)
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    lines = [l for l in r.stdout.splitlines() if l.startswith("http")]
    if r.returncode != 0 or not lines:
        raise RuntimeError("Flux vidéo introuvable pour l'aperçu.")
    with STREAM_LOCK:
        STREAM_CACHE[cle] = (lines[0], time.time())
    return lines[0]


def grab_frame(url, t):
    """L'image exacte à t secondes, en JPEG. ~1 s la première fois."""
    key = (url, round(float(t), 1))
    with STREAM_LOCK:
        if key in FRAME_CACHE:
            return FRAME_CACHE[key]

    def shoot(src):
        p = subprocess.run(
            [tool("ffmpeg") or "ffmpeg", "-v", "error", "-ss", "%.2f" % float(t),
             "-i", src, "-frames:v", "1", "-q:v", "5", "-f", "mjpeg", "pipe:1"],
            capture_output=True, timeout=45,
        )
        return p.stdout if p.returncode == 0 and p.stdout else None

    data = shoot(stream_url(url))
    if not data:                      # l'URL a sans doute expiré : on la renouvelle
        data = shoot(stream_url(url, force=True))
    if not data:
        # Même 403 que pour l'extraction : selon le client interrogé, YouTube
        # refuse de servir l'URL à ffmpeg et la vignette reste sur "aperçu".
        for secours in CLIENTS_DE_SECOURS:
            try:
                data = shoot(stream_url(url, client=secours))
            except Exception:
                data = None
            if data:
                break
    if not data:
        raise RuntimeError("Image indisponible.")

    with STREAM_LOCK:
        FRAME_CACHE[key] = data
        FRAME_ORDER.append(key)
        while len(FRAME_ORDER) > FRAME_MAX:
            FRAME_CACHE.pop(FRAME_ORDER.pop(0), None)
    return data


def _quiet(fn, *a):
    try:
        return fn(*a)
    except Exception:
        return None


TK_PICKER = (
    "import tkinter, tkinter.filedialog as fd\n"
    "r = tkinter.Tk(); r.withdraw(); r.attributes('-topmost', True)\n"
    "p = fd.askdirectory(title=%r, initialdir=%r)\n"
    "print(p or '')\n"
)


def choose_folder(current):
    """Ouvre le sélecteur de dossier du système. None si l'utilisateur annule."""
    if IS_MAC:
        script = 'POSIX path of (choose folder with prompt "Où enregistrer l\'extrait ?")'
        r = subprocess.run(["osascript", "-e", script], capture_output=True, text=True)
        if r.returncode != 0:
            return None                      # annulé
        return r.stdout.strip().rstrip("/") or current

    # Ailleurs : tkinter, mais dans un process séparé. Appelé depuis un thread du
    # serveur, tkinter est instable ; un sous-process évite le problème.
    code = TK_PICKER % ("Où enregistrer l'extrait ?", current or os.path.expanduser("~"))
    try:
        r = subprocess.run([sys.executable, "-c", code],
                           capture_output=True, text=True, timeout=300)
    except Exception:
        return None
    path = (r.stdout or "").strip()
    if r.returncode != 0 or not path:
        return None                          # annulé, ou tkinter absent
    return os.path.normpath(path)


# ------------------------------------------------------------------- serveur
class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype="application/json; charset=utf-8", cache=False):
        data = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "max-age=3600" if cache else "no-store")
        self.end_headers()
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _json(self, obj, code=200):
        self._send(code, json.dumps(obj))

    def do_GET(self):
        parts = urllib.parse.urlparse(self.path)
        path, q = parts.path, urllib.parse.parse_qs(parts.query)

        if path in ("/", "/index.html"):
            try:
                with open(os.path.join(HERE, "index.html"), "rb") as f:
                    self._send(200, f.read(), "text/html; charset=utf-8")
            except Exception as e:
                self._send(500, str(e), "text/plain; charset=utf-8")

        elif path == "/api/status":
            self._json(JOB.snapshot())

        elif path == "/api/frame":
            try:
                img = grab_frame(q.get("u", [""])[0], float(q.get("t", ["0"])[0]))
                self._send(200, img, "image/jpeg", cache=True)
            except Exception as e:
                self._send(503, str(e), "text/plain; charset=utf-8")

        elif path == "/api/env":
            p = load_prefs()
            self._json({
                "ytdlp": bool(tool("yt-dlp")),
                "ffmpeg": bool(tool("ffmpeg")),
                "outdir": p.get("outdir") or default_outdir(),
                "mode": p.get("mode", "audio"),
                "quality": p.get("quality", "1080"),
            })
        else:
            self._send(404, "not found", "text/plain")

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        length = int(self.headers.get("Content-Length") or 0)
        try:
            payload = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            payload = {}

        if path == "/api/info":
            try:
                u = payload.get("url", "").strip()
                info = video_info(u)
                # on prépare l'URL de flux en tâche de fond : la 1re image sera plus rapide
                threading.Thread(target=lambda: _quiet(stream_url, u), daemon=True).start()
                self._json(info)
            except Exception as e:
                self._json({"error": str(e)}, 400)

        elif path == "/api/browse":
            folder = choose_folder(payload.get("current", ""))
            if folder:
                save_prefs({"outdir": folder})
            self._json({"path": folder})

        elif path == "/api/extract":
            if JOB.running:
                return self._json({"error": "Une extraction est déjà en cours."}, 409)
            url = (payload.get("url") or "").strip()
            if not url:
                return self._json({"error": "URL manquante."}, 400)
            mode = "video" if payload.get("mode") == "video" else "audio"
            outdir = os.path.normpath(
                os.path.expanduser(payload.get("outdir") or "~/Downloads"))
            quality = str(payload.get("quality") or "1080")
            start, end = payload.get("start"), payload.get("end")
            if payload.get("full") or start is None or end is None:
                start = end = None
            else:
                start, end = float(start), float(end)
                if end <= start:
                    return self._json({"error": "Le point OUT doit être après le IN."}, 400)
            save_prefs({"outdir": outdir, "mode": mode, "quality": quality})
            threading.Thread(
                target=run_job, args=(url, mode, start, end, outdir, quality),
                daemon=True,
            ).start()
            self._json({"started": True})

        elif path == "/api/cancel":
            if JOB.proc and JOB.running:
                JOB.cancelled = True
                JOB.stage = "Arrêt en cours…"
                # on fige le processus visé : sans ça, une extraction relancée
                # dans les 3 s se ferait tuer par le filet de la précédente.
                proc = JOB.proc
                try:      # yt-dlp lance ffmpeg : on arrête toute la descendance
                    kill_tree(proc)
                except Exception:
                    _quiet(proc.terminate)
                # filet : si le processus s'accroche, on force au bout de 3 s
                threading.Timer(3, lambda: _quiet(kill_tree, proc, True)).start()
            self._json({"ok": True})

        elif path == "/api/quit":
            self._json({"ok": True})
            threading.Timer(0.4, lambda: os._exit(0)).start()

        elif path == "/api/reveal":
            f = payload.get("path") or ""
            if os.path.exists(f):
                _quiet(reveal_file, f)
            self._json({"ok": True})

        elif path == "/api/play":
            f = payload.get("path") or ""
            if os.path.exists(f):
                _quiet(open_file, f)
            self._json({"ok": True})

        else:
            self._send(404, "not found", "text/plain")


def already_running():
    """Un serveur répond-il déjà sur le port ? (évite les doublons au double-clic)"""
    try:
        with urllib.request.urlopen(
                "http://127.0.0.1:%d/api/env" % PORT, timeout=1.5) as r:
            return r.status == 200
    except Exception:
        return False


def sweep_temp():
    """Efface les dossiers de travail qu'un arrêt brutal aurait laissés."""
    root = tempfile.gettempdir()
    cutoff = time.time() - 3 * 3600
    try:
        for name in os.listdir(root):
            if not name.startswith("ytx-"):
                continue
            path = os.path.join(root, name)
            try:
                if os.path.isdir(path) and os.path.getmtime(path) < cutoff:
                    shutil.rmtree(path, ignore_errors=True)
            except OSError:
                pass
    except OSError:
        pass


def main():
    url = "http://127.0.0.1:%d/" % PORT
    if already_running():
        print("L'Extracteur tourne déjà — j'ouvre simplement l'interface.")
        webbrowser.open(url)
        return
    sweep_temp()
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print("Extracteur YouTube — interface : %s" % url)
    print("(laisse cette fenêtre ouverte ; Ctrl-C pour quitter)")
    if not os.environ.get("YTX_NO_BROWSER"):
        threading.Timer(0.7, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nAu revoir.")
        srv.shutdown()


if __name__ == "__main__":
    main()
