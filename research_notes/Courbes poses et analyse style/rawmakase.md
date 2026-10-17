# RAWmakase PR 404 et valeur pour BARZ Image Analyser

Recherche effectuée le 12 octobre 2026. Sources primaires : GitHub (métadonnées, liste complète des fichiers et code), sources BARZ locales lues sans modification. Aucun modèle payant appelé, aucun test de génération ou rendu exécuté.

## 1. Que fait réellement le PR, et dans quel état est-il ?

### Takeaway

Le PR 404 est une bibliothèque expérimentale de rendus de pellicules calculés à partir de fiches techniques. Il ne reconnaît pas le style d'une image et ne produit aucun prompt. Le 12 octobre, il reste ouvert et non fusionné ; son auteur le juge encore insuffisant pour la fusion. [PR 404](https://github.com/pch/rawmakase/pull/404)

### Cited Findings

- Métadonnées GitHub consultées directement : `state=open`, `merged=false`, `draft=false`, `mergeable=false`, dernière mise à jour `2026-10-12T06:05:27Z`, trois commits, 261 fichiers modifiés, 49 399 insertions et 7 suppressions. Révision étudiée : `36b8b06df4ab74676e4fad5fc0f1bcc29deede00`, branche `film-looks`. `mergeable=false` n'établit pas à lui seul la raison de l'impossibilité de fusion. [PR](https://github.com/pch/rawmakase/pull/404)
- Inventaire complet obtenu par le connecteur GitHub : 98 fichiers de looks XMP, 98 presets, 25 définitions de stocks et 25 caches de courbes. Les 25 définitions couvrent **23 films et deux papiers** (`endura-premier`, `radiance-iii`). Le titre du dernier commit évoque « 22 » films : c'est une incohérence documentaire, à ne pas reprendre. [Fichiers du PR](https://github.com/pch/rawmakase/pull/404/files)
- La chaîne de fabrication comporte définitions des stocks, extraction des courbes PDF, caches JSON, génération des tables et presets, puis listes Rust générées. Les fiches sont identifiées par URL, SHA-256, page et coordonnées des graphiques ; les caches rendent la fabrication indépendante du réseau une fois dépendances installées. Le rafraîchissement refuse une fiche dont le contenu a changé. Les graphiques constitués d'images scannées ne sont pas pris en charge. [README des scripts](https://github.com/pch/rawmakase/blob/36b8b06df4ab74676e4fad5fc0f1bcc29deede00/scripts/film/README.md), [extracteur](https://github.com/pch/rawmakase/blob/36b8b06df4ab74676e4fad5fc0f1bcc29deede00/scripts/film/extract-datasheet.py)
- Modèle : couleur → spectre plausible Jakob–Hanika → exposition des couches → densité → scan, projection ou tirage. Les variantes ±1 changent l'exposition puis rééquilibrent le gris ; elles ne simulent pas une chimie de développement push/pull mesurée. Le rendu dépend de ProPhoto linéaire et de la courbe tonale RAWmakase Standard. Pas de simulation de halation ni d'effets intercouches. Dépendances déclarées : Python ≥3.11, `numpy==2.5.3`, `scipy==1.18.1`, `colour-science==0.4.7`, `pdfplumber==0.11.10`, lancement via uv. Le générateur lit aussi `dng_tone.rs` et importe `scripts/corpus/synthetic-looks.py` : copier uniquement le script ne suffit pas. [Générateur, révision figée](https://github.com/pch/rawmakase/blob/36b8b06df4ab74676e4fad5fc0f1bcc29deede00/scripts/film/film-look.py)
- À l'exécution, `film.rs` embarque les XMP par `include_str!`, les parse une fois avec `OnceLock`, puis compose les profils sur RAWmakase Standard. Une caméra sans matrice exploitable n'obtient aucun profil ; les variantes sont regroupées par film. Ce module réutilise le moteur existant, ce n'est pas un moteur vision ou un nouveau service LLM. [film.rs](https://github.com/pch/rawmakase/blob/36b8b06df4ab74676e4fad5fc0f1bcc29deede00/crates/rawmakase-model/src/camera_profiles/film.rs)
- Les tests ajoutés vérifient présence/parsing, base Standard, identifiants uniques, gris neutre et regroupement. Le test du gris admet un écart relatif des canaux inférieur à 25 % et une luminance verte à ±15 % du gris de référence ; ce n'est pas une preuve de correspondance avec une vraie pellicule. [Tests du modèle](https://github.com/pch/rawmakase/blob/36b8b06df4ab74676e4fad5fc0f1bcc29deede00/crates/rawmakase-model/src/camera_profiles/tests.rs)
- Les résultats sont explicitement modélisés, sans validation sur des scans réels. Hypothèses documentées : densitométrie approximée, colorants négatifs estimés, scan sRGB, agrandisseur 3 200 K, flare du papier de 1 %. La quatrième couche Fuji est ignorée. Le format de sortie est un profil Lightroom avec table RGB, accompagné d'un preset de grain. [Documentation des profils](https://github.com/pch/rawmakase/blob/36b8b06df4ab74676e4fad5fc0f1bcc29deede00/docs/lightroom-profiles.md)

### Inferences

- La valeur technique est la reproductibilité d'un rendu sélectionné, pas la reconstitution automatique du style d'une référence. Une table donnée appliquée dans le même espace et au même stade du pipeline produit un résultat reproductible.
- On ne peut pas appliquer directement ces tables à un JPEG sRGB de l'Image Analyser en supposant une reproduction correcte : il faut adapter et vérifier les espaces, courbes et domaines d'entrée/sortie.

### Gaps

- Aucun benchmark de reconnaissance de style, comparaison de prompts ou fidélité à une référence : cette fonctionnalité n'est pas implémentée par ce PR.
- Les résultats des tests cités par l'auteur n'ont pas été reproduits ici. Aucun temps de fabrication ni coût mémoire mesuré indépendamment.

## 2. Est-il meilleur que l'analyseur BARZ actuel ?

### Takeaway

Non pour analyser une référence et produire un prompt : les deux systèmes ont des fonctions différentes. BARZ possède déjà une analyse multimodale ; ses limites observables concernent surtout le contrat de sortie, l'incertitude et la conservation des champs structurés. RAWmakase pourrait compléter un futur traitement des couleurs, mais ne remplace pas cet analyseur.

### Cited Findings

- Le frontend importe PNG/JPEG/WebP/GIF, appelle `/api/v1/image-analyzer/analyze`, affiche un prompt et trois champs éditables `subject`, `context`, `style`, puis transmet ces valeurs à A.P.G, CCP ou Video Multi Framing. [Frontend](E:/Codex-Proj/Barz-Gregator/suite-v6/apps/atlas/public/image-analyzer.js:42)
- Le service demande une description du sujet, environnement, composition, éclairage, impression de caméra/optique, matériaux, couleurs, humeur et contraintes négatives. Sa sortie demandée est du JSON à quatre chaînes `prompt`, `subject`, `context`, `style`. Il n'offre aucun champ indépendant de palette, courbe, grain, négatif ou confiance. Il utilise OpenAI, Anthropic ou Google via des appels vision distants. [Instruction et appels](E:/Codex-Proj/Barz-Gregator/suite-v6/apps/atlas/image-analyzer-service.js:35)
- Il faut nuancer le caractère « générique » du prompt : `buildPromptSkillContext` lui ajoute déjà des références de prompt. Le routage `image-analysis` ajoute `edit-template` et `references` ; le socle image inclut aussi `lens-character`, `lighting`, `grade`, `vocabulary`, avec disponibilité et limites de longueur. Le routage distinct `style-analysis` ajoute notamment FOV, tailles de plans, kelvin, shutter et anamorphique. [Routage](E:/Codex-Proj/Barz-Gregator/suite-v6/apps/atlas/lib/prompt-skill-router.js:38), [socle](E:/Codex-Proj/Barz-Gregator/suite-v6/apps/atlas/lib/prompt-skill-router.js:178)
- La demande « strict JSON » est textuelle : les appels inspectés n'imposent pas de JSON Schema au fournisseur. `normalizeAnalysis` accepte du texte non JSON comme prompt et crée alors trois parties vides. Le frontend teste `result.seedance || fallback`, mais cet objet vide de contenu reste truthy : le fallback n'intervient donc pas dans ce cas. [Normalisation](E:/Codex-Proj/Barz-Gregator/suite-v6/apps/atlas/image-analyzer-service.js:60), [affichage](E:/Codex-Proj/Barz-Gregator/suite-v6/apps/atlas/public/image-analyzer.js:134)
- Modifier le prompt principal redécoupe les trois champs par regex de phrases et mots anglais. Cela peut écraser des champs corrigés à la main ; cette séparation n'est pas une analyse sémantique. [Découpage](E:/Codex-Proj/Barz-Gregator/suite-v6/apps/atlas/public/image-analyzer.js:28), [événement d'édition](E:/Codex-Proj/Barz-Gregator/suite-v6/apps/atlas/public/image-analyzer.js:165)
- Un chemin de style plus spécialisé existe déjà dans `blocking-engine-v5.js` : `buildStyleAnalysisInstruction` utilise CINE-DNA et retourne un fragment en anglais organisé par caméra/époque, format, film/capteur, optique, profondeur de champ, lumière, texture et grade. Il interdit d'inventer des spécifications photo pour les images non photographiques. Son `analyzeStyle` appelle le routage `style-analysis`. Présence du code confirmée ; accessibilité depuis toutes les interfaces non vérifiée. [Instruction CINE-DNA](E:/Codex-Proj/Barz-Gregator/suite-v6/apps/atlas/blocking-engine-v5.js:629), [appel style](E:/Codex-Proj/Barz-Gregator/suite-v6/apps/atlas/blocking-engine-v5.js:1341)

### Inferences

- Priorité pratique : renforcer le contrat de style en réutilisant les références locales existantes, avec des observations séparées des hypothèses. Une marque de film, un boîtier ou une focale précise ne doivent pas devenir des faits « détectés » sans preuve.
- Aucune preuve que le nom d'un film RAWmakase ajouté au prompt améliorerait une génération. La fidélité du prompt au style et la fidélité colorimétrique d'une table sont deux critères différents.
- Une analyse de style utile doit pouvoir se transférer à un autre sujet. Conserver sujet/contexte à part et produire un `stylePrompt` autonome est préférable à l'extraction par regex.

### Gaps

- Qualité visuelle des réponses BARZ non évaluée par appel réel ; modèles listés dans le code non validés auprès de leurs fournisseurs. Il serait incorrect d'en déduire leur disponibilité effective.
- Usage réel du chemin CINE-DNA dans l'interface non testé ; éviter de promettre qu'un simple branchement suffit.

## 3. Réutilisation, licence et contrat minimal recommandé

### Takeaway

Recommandation : améliorer maintenant l'analyse structurée dans Atlas ; garder RAWmakase comme piste expérimentale de bibliothèque de looks ou de post-traitement local. Aucun motif technique ne justifie d'importer l'application Rust complète pour enrichir un prompt.

### Cited Findings

- Le `LICENSE` de la révision étudiée est MIT, copyright 2026 RAWmakase contributors. Il autorise utilisation, modification, distribution et vente sous condition de conserver les notices de copyright et permission dans les copies ou portions substantielles ; aucune garantie n'est fournie. Cette observation concerne le texte de licence du dépôt, pas une certification juridique de tous les actifs tiers. [Licence figée](https://github.com/pch/rawmakase/blob/36b8b06df4ab74676e4fad5fc0f1bcc29deede00/LICENSE)
- Les définitions de stocks identifient les fabricants et sources techniques, par exemple Kodak Alaris E-4050 pour Portra 400, avec URL et empreinte. [Provenance Portra](https://github.com/pch/rawmakase/blob/36b8b06df4ab74676e4fad5fc0f1bcc29deede00/scripts/film/stocks/portra-400.json)
- Les XMP de looks générés indiquent leur provenance dans `Copyright`; les presets portent explicitement « RAWmakase contributors, MIT licence ». Le grain est un réglage distinct du preset, pas une texture spatiale encodée dans la table de couleurs. [Générateur XMP/presets](https://github.com/pch/rawmakase/blob/36b8b06df4ab74676e4fad5fc0f1bcc29deede00/scripts/film/film-look.py)
- L'application complète est un projet Rust avec espaces de travail modèle/moteur/export/interop/inférence, wgpu et eframe, entre autres. Une intégration complète ajouterait une architecture très différente du frontend JavaScript et service Node d'Atlas. [Cargo.toml amont](https://github.com/pch/rawmakase/blob/main/Cargo.toml)
- Le contrat BARZ existant garde Atlas et Aggregator séparés. Atlas envoie un brouillon versionné ; les champs inconnus sont ignorés, et les références data-URL ne sont pas transférées automatiquement. Aucun travail payant n'est soumis par le bridge. [Contrat local](E:/Codex-Proj/Barz-Gregator/docs/PROMPT_ATLAS_BRIDGE.md:1)

### Inferences

Contrat minimal proposé, **design nouveau et non fonctionnalité déjà existante** :

1. Entrée : conserver `imageDataUrl`, `model`; ajouter `mode: scene|style|both`, `targetEngine`, `schemaVersion: image-analysis/2`.
2. Sortie rétrocompatible : conserver `prompt` et `seedance.{subject,context,style}`; ajouter `styleProfile` versionné avec `medium`, `palette`, `contrast`, `toneResponse`, `lighting`, `lensFeel`, `texture`, `grade`, `stylePrompt`, `negativeConstraints` et `uncertainties`. Chaque hypothèse d'origine optique/film doit porter un statut `observed|inferred|unknown`, une justification courte et une confiance indicative non présentée comme probabilité calibrée.
3. Valider réellement ce schéma côté serveur, avec champs manquants explicites ; utiliser les sorties structurées des fournisseurs quand disponibles. Conserver les corrections manuelles des parties. Le texte complet et le profil structuré ne doivent pas se réécrire silencieusement mutuellement.
4. Ajouter un export « style seul » pour transférer lumière, matière, palette et grade à un nouveau sujet. L'export Aggregator utilise le bridge existant pour le texte. Un transport du nouveau profil nécessiterait une extension versionnée du contrat, puisque les champs inconnus actuels sont ignorés.
5. Test d'acceptation : corpus fixe photographique, illustré et mixte ; JSON valide, absence de faux paramètres photo pour l'illustration, distinction des observations/hypothèses, préservation des champs édités, compatibilité des destinations existantes. Évaluer séparément pertinence descriptive et ressemblance des générations sur un essai explicitement autorisé.

Volet RAWmakase optionnel : conserver code et provenance par révision, licence MIT et notices dépendantes. Préférer un prototype isolé produisant quelques looks validés, avec un contrat `{lookId, revision, inputColorSpace, inputTransfer, outputColorSpace, outputTransfer, intensity, grain, provenance, validationStatus}`. Établir le domaine colorimétrique avant toute conversion en `.cube` ou preview WebGL ; comparer neutralité, aplats, peaux, ombres et hautes lumières à une sortie de référence. Le grain doit être appliqué séparément et documenté. Ce prototype peut rester local sans API LLM, mais il demande des dépendances de fabrication et des actifs amont.

### Gaps

- Aucun audit complet des droits des courbes extraites, données scientifiques embarquées par les bibliothèques ou marques commerciales n'a été réalisé. La licence MIT du dépôt ne suffit pas à conclure que toute donnée fabricant peut être redistribuée sans autre vérification. Cela n'empêche pas de reprendre l'architecture et d'améliorer le schéma propre à BARZ sans copier ces actifs.
- Pas d'implémentation ni de validation du contrat proposé : ce livrable est une recommandation de recherche. Le seul fichier créé est cette note.
