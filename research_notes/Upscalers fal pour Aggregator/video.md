# Upscalers video fal pour BARZ Aggregator

## Quels upscalers video officiels fal sont actuellement exploitables en production ?

### Takeaway
fal propose un catalogue video suffisamment large pour justifier un onglet `Upscale`. Pour BARZ, les candidats centraux sont ByteDance, Topaz Precision/Generative, FlashVSR et SeedVR2 ; FLUX 3, Bria, Crystal, Astra 2, Kandinsky 6 VSR et RealESRGAN sont utiles comme options specialisees.

### Cited Findings
- `fal-ai/bytedance-upscaler/upscale/video` vise directement 1080p, 2K, 4K, 6K ou 8K, propose les presets `general`, `ugc`, `short_series`, `aigc`, `old_film`, les tiers `fast`, `standard`, `pro`, et un reglage de fidelite ; le preset `aigc` est explicitement destine aux sources generees par IA. — [Documentation fal](https://fal.ai/models/fal-ai/bytedance-upscaler/upscale/video/api)
- `topaz/upscale/video/precision` est le chemin fidele/non generatif : Proteus est le choix par defaut, Iris vise les visages, Artemis les sources degradees, Dione le desentrelacement, Gaia le CG/animation, Rhea le detail fin ; facteur jusqu'a 4x et videos jusqu'a cinq minutes. — [Documentation fal](https://fal.ai/models/topaz/upscale/video/precision/api)
- `topaz/upscale/video/generative` regroupe Starlight Precise 2.6, HQ, Mini, Sharp et Fast 2 ; fal decrit Precise 2.6 comme un passage de realisme pour la video IA, Mini comme restauration d'archives et Fast 2 comme la variante la plus rapide et la moins chere. — [Documentation fal](https://fal.ai/models/topaz/upscale/video/generative/api)
- `fal-ai/flashvsr/upscale/video` expose acceleration, correction colorimetrique, fusion des tuiles, qualite d'encodage, formats X264/VP9/ProRes/GIF et copie de l'audio quand elle est possible. — [Documentation fal](https://fal.ai/models/fal-ai/flashvsr/upscale/video/api)
- `fal-ai/seedvr/upscale/video` annonce une coherence temporelle, accepte une cible directe 720p/1080p/1440p/2160p ou un facteur, et sort en X264, VP9, ProRes 4444 ou GIF. — [Documentation fal](https://fal.ai/models/fal-ai/seedvr/upscale/video/api)
- `blackforestlabs/flux-video-upscale` a un mode precis et un mode creatif guide par prompt, avec sorties 1080p, 2K ou 4K ; l'entree est MP4, limitee a 20 secondes et 50 MB. — [Page modele fal](https://fal.ai/models/blackforestlabs/flux-video-upscale); [documentation fal](https://fal.ai/models/blackforestlabs/flux-video-upscale/api)
- `bria/video/increase-resolution` annonce une forte coherence temporelle et des sorties jusqu'a 8K, accepte seulement 2x ou 4x, preserve l'audio par defaut, offre MP4 H.264/H.265, WebM VP9, MOV H.265/ProRes, MKV et GIF, et limite l'entree a moins de 30 secondes et moins de 7680 x 4320. — [Documentation fal](https://fal.ai/models/bria/video/increase-resolution/api)
- `clarityai/crystal-video-upscaler` est presente comme un upscale haute precision proche de la source, avec une limite de sortie a 5K. — [Guide officiel fal](https://fal.ai/learn/tools/video-to-video-upscalers); [page modele fal](https://fal.ai/models/clarityai/crystal-video-upscaler)
- `topaz/upscale/video/creative` utilise Astra 2 pour inventer texture et detail, avec controles de creativite, realisme, nettete et prompt ; la cible demandee peut etre remplacee par une resolution supportee par Astra, typiquement 4K. — [Documentation fal](https://fal.ai/models/topaz/upscale/video/creative/api)
- `fal-ai/kandinsky6-vsr` produit des images plus nettes et stables sans scintillement, mais reechantillonne a 24 fps et limite chaque requete a 121 images, soit environ cinq secondes. — [Page modele fal](https://fal.ai/models/fal-ai/kandinsky6-vsr); [documentation fal](https://fal.ai/models/fal-ai/kandinsky6-vsr/api)
- `fal-ai/video-upscaler` applique RealESRGAN independamment a chaque image puis reassemble un MP4 ; il s'agit donc d'un baseline non generatif simple, sans controles de coherence temporelle exposes. — [Page modele fal](https://fal.ai/models/fal-ai/video-upscaler); [comparatif officiel fal](https://fal.ai/learn/tools/video-to-video-upscalers)

### Inferences
- Pour une interface BARZ claire, il vaut mieux exposer trois niveaux plutot que onze modeles a plat : `Economique` (ByteDance), `Fidele` (Topaz Proteus), `Restauration IA` (Topaz Starlight), avec un panneau avance donnant acces a FlashVSR, SeedVR2, FLUX 3 et aux autres variantes.
- Kandinsky 6 VSR n'est pas un bon choix par defaut pour une sequence Seedance de 15 secondes : il impose trois traitements et un raccord entre morceaux, ce qui augmente le risque de variation aux jointures.

### Gaps
- Les documentations ByteDance, SeedVR2 et RealESRGAN ne publient pas de duree maximale exploitable dans leur schema actuel.
- fal ne publie pas de benchmark objectif commun (PSNR, SSIM, VMAF, mesure de flicker) permettant de classer la qualite de tous ces endpoints ; les indications de qualite restent des descriptions produit et un comparatif editorial fal.

## Quelles limites pratiques faut-il integrer dans l'onglet Upscale ?

### Takeaway
Le service doit inspecter resolution, cadence, duree et audio avant soumission. Il doit aussi conserver le fichier source pour remuxer l'audio, car seuls Bria et FlashVSR exposent explicitement une option de preservation audio.

### Cited Findings
- Tous les endpoints Topaz video acceptent des sources jusqu'a cinq minutes ; ils sortent en H.265 par defaut et permettent H.264, tandis qu'un `target_fps` different de la source declenche l'interpolation Apollo. — [Catalogue Topaz officiel sur fal](https://fal.ai/topaz); [documentation generative](https://fal.ai/models/topaz/upscale/video/generative/api)
- Le prompt Astra 2 limite l'entree a 450 images, soit 15 secondes a 30 fps ; sans prompt, l'endpoint garde la limite generale de cinq minutes. — [Documentation fal](https://fal.ai/models/topaz/upscale/video/creative/api)
- FLUX 3 n'accepte que du MP4 jusqu'a 20 secondes et 50 MB ; son schema ne propose aucun controle audio. — [Documentation fal](https://fal.ai/models/blackforestlabs/flux-video-upscale/api)
- Bria preserve l'audio par defaut et accepte de nombreux couples conteneur/codec, mais seulement les facteurs 2x et 4x ; une source 720p ne peut donc pas etre amenee exactement a 1080p par ce endpoint. — [Documentation fal](https://fal.ai/models/bria/video/increase-resolution/api)
- FlashVSR peut copier les pistes audio avec FFmpeg quand c'est possible et offre X264 MP4, VP9 WebM, ProRes 4444 MOV et GIF. — [Documentation fal](https://fal.ai/models/fal-ai/flashvsr/upscale/video/api)
- Le comparatif fal confirme que Bria et FlashVSR sont les deux seuls de sa selection a exposer `preserve_audio`; pour les autres, fal recommande de garder la source et de remuxer l'audio apres upscale. — [Comparatif officiel fal](https://fal.ai/learn/tools/video-to-video-upscalers)
- ByteDance permet une cible 1080p a 8K, une cadence cible par defaut de 30 fps, une profondeur 8 bits sur tous les tiers et 10/12 bits uniquement en `pro`; son schema ne publie ni codec de sortie ni option de preservation audio. — [Documentation fal](https://fal.ai/models/fal-ai/bytedance-upscaler/upscale/video/api)
- Kandinsky 6 VSR accepte seulement les facteurs 2, 2.25 ou 4, reechantillonne a 24 fps et limite a environ cinq secondes ; une source 720p sort au minimum en 1440p et non en 1080p. — [Documentation fal](https://fal.ai/models/fal-ai/kandinsky6-vsr/api)
- SeedVR2 sait viser directement 1080p, contrairement aux endpoints limites a des facteurs fixes, et expose plusieurs formats d'encodage ; son schema ne contient pas d'option audio. — [Documentation fal](https://fal.ai/models/fal-ai/seedvr/upscale/video/api)

### Inferences
- BARZ doit calculer automatiquement le facteur necessaire a partir des dimensions reelles, ne jamais supposer que « 480p » vaut exactement 854 x 480, et masquer les modeles incapables d'atteindre la cible sans depassement.
- Pour une video Seedance avec son, le pipeline devrait extraire ou conserver la piste originale, lancer l'upscale video, puis remuxer l'audio si le modele ne garantit pas sa preservation.
- La cadence devrait rester celle de la source par defaut : monter automatiquement a 30 ou 60 fps augmente parfois le prix et peut alterer le mouvement.

### Gaps
- La preservation d'audio n'est pas documentee pour ByteDance, Topaz, FLUX 3, SeedVR2, Kandinsky, Crystal et RealESRGAN ; il faut donc la traiter comme non garantie.
- Les codecs de sortie ne sont pas documentes pour ByteDance, FLUX 3, SeedVR2 au-dela des conteneurs proposes, Kandinsky, Crystal et RealESRGAN.

## Combien coute un upscale de 15 secondes vers 1080p ?

### Takeaway
Pour un clip de 15 secondes a 24-30 fps, l'upscale 1080p va d'environ 0,11 USD a 4,50 USD selon le modele. ByteDance standard est de tres loin le moins cher ; Topaz Proteus et FlashVSR restent sous 0,50 USD ; une restauration generative de bonne qualite coute environ 0,90 a 1,80 USD chez Topaz Starlight.

### Cited Findings
- ByteDance `standard` ou `fast`, 1080p/30 fps : 0,0072 USD/s, soit **0,108 USD pour 15 s** ; `pro` coute dix fois plus, soit **1,08 USD**. — [Page modele fal](https://fal.ai/models/fal-ai/bytedance-upscaler/upscale/video)
- Topaz Precision, modeles standards dont Proteus, 1080p/30 fps : 0,20 USD par 10 secondes ; le comparatif fal donne **0,30 USD pour le meme clip de 15 s**. — [Page modele fal](https://fal.ai/models/topaz/upscale/video/precision); [comparatif officiel fal](https://fal.ai/learn/tools/video-to-video-upscalers)
- FlashVSR : 0,0005 USD par megapixel-image ; a 1920 x 1080, **15 s a 24 fps coutent environ 0,373 USD**, et **15 s a 30 fps environ 0,467 USD**. — [Page modele fal](https://fal.ai/models/fal-ai/flashvsr/upscale/video)
- RealESRGAN : 0,0008 USD par megapixel ; applique au volume de sortie 1920 x 1080, cela represente **environ 0,597 USD a 24 fps** ou **0,746 USD a 30 fps** pour 15 secondes. — [Page modele fal](https://fal.ai/models/fal-ai/video-upscaler); [comparatif officiel fal](https://fal.ai/learn/tools/video-to-video-upscalers)
- SeedVR2 : 0,001 USD par megapixel-image ; un 1080p de 15 secondes coute donc **environ 0,746 USD a 24 fps** ou **0,933 USD a 30 fps**. — [Page modele fal](https://fal.ai/models/fal-ai/seedvr/upscale/video)
- Topaz Starlight Fast 2 : 0,60 USD par 10 secondes jusqu'a 1080p, soit **environ 0,90 USD pour 15 s** ; Starlight Precise 2.6/HQ/Mini/Sharp coutent 1,20 USD par 10 secondes, soit **environ 1,80 USD**. — [Page modele fal](https://fal.ai/models/topaz/upscale/video/generative)
- FLUX 3 : **2,10 USD** en mode precis ou **3,00 USD** en mode creatif pour 15 secondes a 1080p. — [Page modele fal](https://fal.ai/models/blackforestlabs/flux-video-upscale)
- Bria : 0,14 USD/s, soit **2,10 USD pour 15 s**, sans variation publiee selon 2x ou 4x. — [Page modele fal](https://fal.ai/models/bria/video/increase-resolution)
- Crystal : 0,10 USD par megapixel et par seconde jusqu'a 30 fps ; un 1920 x 1080 de 15 secondes coute donc **environ 3,11 USD**. — [Page modele fal](https://fal.ai/models/clarityai/crystal-video-upscaler)
- Topaz Astra 2 : 3,00 USD par 10 secondes jusqu'a 1080p, soit **4,50 USD pour 15 s** ; comme Astra choisit souvent une sortie 4K, le budget prudent est **7,50 USD**. — [Page modele fal](https://fal.ai/models/topaz/upscale/video/creative); [comparatif officiel fal](https://fal.ai/learn/tools/video-to-video-upscalers)
- Kandinsky 6 VSR facture 0,00036 USD par megapixel-image aux cinq etapes par defaut ; fal donne environ 0,09 USD pour cinq secondes de 480p vers 1080p, soit **environ 0,27 USD pour trois morceaux de cinq secondes**. — [Page modele fal](https://fal.ai/models/fal-ai/kandinsky6-vsr)

### Inferences
- Les estimations FlashVSR, RealESRGAN, SeedVR2, Crystal et Kandinsky sont des calculs derives des tarifs publies, en supposant une sortie 1920 x 1080 et la cadence indiquee ; les montants reels peuvent varier avec les dimensions exactes, le nombre d'images et les arrondis de facturation.
- A qualite egale non demontree, ByteDance standard est le test le moins risque financierement : il coute moins qu'un seul centime par seconde et propose un preset `aigc` adapte a une sortie Seedance.

### Gaps
- Les tarifs Topaz sont publies par paliers et exemples ; fal indique que l'arrondi est effectue une fois par job, donc l'estimation lineaire de 15 secondes peut differer legerement du debit final.
- Aucun tarif distinct 480p-vers-1080p contre 720p-vers-1080p n'est publie pour les endpoints factures sur la sortie ; avec une meme sortie, duree et cadence, le prix publie est donc identique, sauf comportement interne non documente.

## Est-ce une alternative economique a la finalisation native Seedance 2.5 ?

### Takeaway
Oui, tres largement sur le prix, mais ce n'est pas le meme produit. Un upscaler conserve le montage, le mouvement et les erreurs du draft et ameliore ses images ; la completion Seedance regenere la tache a 1080p a partir du `draft_id`. L'onglet doit proposer les deux voies, pas remplacer silencieusement la completion native.

### Cited Findings
- Le draft Seedance 2.5 US 480p est annonce a environ 0,2646 USD/s, soit **environ 3,97 USD pour 15 s**. — [Page Seedance 2.5 US officielle](https://fal.ai/models/bytedance/seedance-2.5/us/text-to-video)
- La completion officielle prend un `draft_id`, regenere en 1080p, et le `draft_id` reste valable sept jours pour l'appelant d'origine. — [Documentation fal](https://fal.ai/models/bytedance/seedance-2.5/draft/complete/api)
- La completion 1080p non-US est annoncee a environ 1,164 USD/s, soit **environ 17,46 USD pour 15 s**, en plus du cout du draft. — [Page completion fal](https://fal.ai/models/bytedance/seedance-2.5/draft/complete)
- Le pipeline draft 480p puis ByteDance standard 1080p coute donc **environ 4,08 USD au total** (3,97 + 0,108), contre **environ 21,43 USD** pour draft puis completion native (3,97 + 17,46), avant eventuels ecarts d'arrondi. — [Tarif draft fal](https://fal.ai/models/bytedance/seedance-2.5/us/text-to-video); [tarif ByteDance upscale fal](https://fal.ai/models/fal-ai/bytedance-upscaler/upscale/video); [tarif completion fal](https://fal.ai/models/bytedance/seedance-2.5/draft/complete)
- Avec Topaz Proteus, le total draft + upscale est **environ 4,27 USD** ; avec Starlight Fast 2 **4,87 USD** ; avec Starlight Precise 2.6 **5,77 USD**. — [Tarif draft fal](https://fal.ai/models/bytedance/seedance-2.5/us/text-to-video); [tarif Topaz Precision fal](https://fal.ai/models/topaz/upscale/video/precision); [tarif Topaz Generative fal](https://fal.ai/models/topaz/upscale/video/generative)

### Inferences
- Recommandation BARZ : bouton principal `Upscale economique` = ByteDance `standard`, preset `aigc`, fidelite `high`, cible 1080p, cadence source si l'API le permet ; cout estime 0,11 USD pour 15 secondes.
- Alternative `Fidele` = Topaz Proteus, environ 0,30 USD ; elle minimise l'invention de nouveaux details et convient quand le draft est deja propre.
- Alternative `Restauration IA` = Starlight Fast 2, environ 0,90 USD, puis Starlight Precise 2.6 en qualite maximum a environ 1,80 USD ; ces modeles sont explicitement destines a reconstruire des details absents ou a donner du realisme aux videos generees.
- Option `Creative` = FLUX 3 seulement quand l'utilisateur veut accepter des details inventes et un prompt de guidage ; son prix reste tres inferieur a la completion native mais depasse les choix Topaz recommandes.
- Le gain maximal estime avec ByteDance standard est d'environ 17,35 USD par clip de 15 secondes, soit environ 81 % sur l'ensemble draft + final. Cette economie ne garantit pas une equivalence visuelle avec une vraie regeneration Seedance 1080p.
- L'interface doit afficher une comparaison avant paiement : `Finaliser avec Seedance ~17,46 USD` versus `Upscaler le draft ~0,11 / 0,30 / 0,90 / 1,80 USD`, avec une mention claire « upscale : le mouvement et les erreurs du draft restent inchanges ».

### Gaps
- Sans essais payants cote a cote sur les memes drafts Seedance, il est impossible d'affirmer que ByteDance standard, Proteus ou Starlight egale la completion native sur les visages, les petits textes, les occlusions et le scintillement.
- Le prix de completion publie concerne l'endpoint non-US ; aucune page `us/draft/complete` distincte n'a ete trouvee. BARZ doit donc obtenir l'estimation live de fal au moment de la confirmation plutot que figer 17,46 USD dans le code.
