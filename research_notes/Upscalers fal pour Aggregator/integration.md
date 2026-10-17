# Integration d'un onglet Upscale fal dans BARZ Aggregator

## Quels endpoints et schemas fal faut-il integrer ?

### Takeaway
Pour un MVP utile, je recommande trois profils video — **Economique** avec ByteDance, **Fidele** avec Topaz Precision et **Creatif** avec FLUX Video Upscale — plus FlashVSR comme option rapide avec preservation audio explicite. Pour l'image, Topaz Precision, Topaz Generative (Wonder 3.5) et SeedVR2 couvrent respectivement la fidelite, la reconstruction de detail et l'option economique.

### Cited Findings
- `fal-ai/bytedance-upscaler/upscale/video` accepte `video_url`, une cible `1080p|2k|4k|6k|8k`, un FPS cible, un preset `general|ugc|short_series|aigc|old_film`, un tier `fast|standard|pro`, une fidelite `high|medium` et une profondeur 8/10/12 bits; le ratio libre 1,1x-10x remplace la cible mais est limite a 4K. Le mode Pro coute 10x et les profondeurs 10/12 bits l'exigent. — [Schema officiel fal](https://fal.ai/models/fal-ai/bytedance-upscaler/upscale/video/api)
- `topaz/upscale/video/precision` est le choix non generatif/fidele. Il expose 21 variantes Proteus, Iris, Dione, Artemis, Gaia, Rhea et Theia, un facteur d'upscale, un FPS cible, compression, bruit, halo, grain, recuperation de detail et H.264/H.265; les videos sont limitees a 5 minutes. — [Schema officiel Topaz Precision sur fal](https://fal.ai/models/topaz/upscale/video/precision/api)
- `blackforestlabs/flux-video-upscale` propose un facteur, un mode fidele (`creativity: 0`) ou creatif (`creativity: 1`) et un prompt creatif facultatif; l'entree doit etre un MP4 de 20 secondes et 50 Mo maximum. — [Schema officiel FLUX Video Upscale](https://fal.ai/models/blackforestlabs/flux-video-upscale/api)
- `fal-ai/flashvsr/upscale/video` expose facteur, vitesse de decodage, correction couleur, qualite de fusion des tuiles, format/qualite d'ecriture et surtout `preserve_audio`, qui copie les pistes audio d'origine quand c'est possible. — [Schema officiel FlashVSR](https://fal.ai/models/fal-ai/flashvsr/upscale/video/api)
- `fal-ai/seedvr/upscale/video` permet une cible `720p|1080p|1440p|2160p` ou un facteur, avec seed, noise scale, format X264/VP9/ProRes/GIF et qualite/ecriture. — [Schema officiel SeedVR2 Video](https://fal.ai/models/fal-ai/seedvr/upscale/video/api)
- `topaz/upscale/image/precision` agrandit fidelement les photos jusqu'a 4x avec Standard V2, High Fidelity, Low Resolution, CGI ou Text Refine. — [Page officielle Topaz Image Precision](https://fal.ai/models/topaz/upscale/image/precision)
- `topaz/upscale/image/generative` expose Wonder 3.5, Recover 3, Standard MAX, Redefine et Recovery, avec facteur, detection du sujet, traitement des visages et des controles conditionnels de creativite, texture, prompt, nettete et denoise. — [Schema officiel Topaz Image Generative](https://fal.ai/models/topaz/upscale/image/generative/api)
- `fal-ai/seedvr/upscale/image` partage la logique cible/facteur de SeedVR2 et retourne une image avec dimensions et URL. — [Schema officiel SeedVR2 Image](https://fal.ai/models/fal-ai/seedvr/upscale/image/api)

### Inferences
- Le produit ne devrait pas afficher une liste brute de tous les endpoints. Trois intentions video — **Fidele**, **Economique**, **Creatif** — peuvent choisir un endpoint recommande, tandis qu'un volet avance laisse l'utilisateur imposer le modele. Cette abstraction suit les usages annonces par fal pour Topaz, FLUX et ByteDance. — [Topaz sur fal](https://fal.ai/topaz); [FLUX Video Upscale](https://fal.ai/models/blackforestlabs/flux-video-upscale); [ByteDance Upscaler](https://fal.ai/models/fal-ai/bytedance-upscaler/upscale/video)
- FlashVSR est le meilleur endpoint par defaut lorsque l'audio doit absolument rester dans le fichier, car c'est le seul des quatre schemas MVP qui garantit explicitement une option `preserve_audio`; pour les autres, BARZ devrait remuxer localement la piste source apres traitement plutot que supposer qu'elle est conservee. — [FlashVSR API](https://fal.ai/models/fal-ai/flashvsr/upscale/video/api); [Topaz Precision API](https://fal.ai/models/topaz/upscale/video/precision/api); [FLUX API](https://fal.ai/models/blackforestlabs/flux-video-upscale/api); [ByteDance API](https://fal.ai/models/fal-ai/bytedance-upscaler/upscale/video/api)
- Un draft Seedance 480p 16:9 est documente en 864x496; un simple facteur 2 ne produit donc que 1728x992, pas un vrai 1080p. Pour la voie draft -> 1080p, il faut privilegier une cible `1080p` (ByteDance ou SeedVR2) ou calculer un facteur adapte puis recadrer/padder si une geometrie exacte 1920x1080 est requise. — [Dimensions et tarification Seedance 2.5](https://fal.ai/models/bytedance/seedance-2.5/text-to-video); [SeedVR2 Video API](https://fal.ai/models/fal-ai/seedvr/upscale/video/api)

### Gaps
- Les pages officielles fournissent des descriptions et exemples, mais pas un benchmark independant commun sur le meme draft Seedance. La qualite relative doit etre validee par un petit A/B payant separe avant de definir le modele par defaut.
- Les schemas Topaz, FLUX et ByteDance ne documentent pas explicitement la conservation de l'audio; il ne faut donc pas la promettre sans test ou remux local.

## Comment calculer et confirmer le prix avant toute depense ?

### Takeaway
Le devis est deterministic pour ByteDance, FLUX, SeedVR2 et FlashVSR des que BARZ connait duree, FPS et dimensions de sortie. Topaz reste estimable, mais sa grille de credits/arrondis doit etre traitee comme une formule versionnee et revérifiee juste avant la confirmation.

### Cited Findings
- ByteDance coute 0,0072 $/s en 1080p, 0,0144 $/s en 2K et 0,0288 $/s en 4K a 30 fps; 60 fps double ces montants et Pro les multiplie par 10. — [Prix officiel ByteDance Upscaler](https://fal.ai/models/fal-ai/bytedance-upscaler/upscale/video)
- FLUX Video Upscale facture la seconde livree: en mode fidele, 0,14 $/s en 1080p, 0,25 $/s en 2K et 0,55 $/s en 4K; en creatif, 0,20, 0,35 et 0,79 $/s. — [Prix officiel FLUX Video Upscale](https://fal.ai/models/blackforestlabs/flux-video-upscale)
- SeedVR2 Video facture 0,001 $ par megapixel de donnees video, soit `largeur_sortie x hauteur_sortie x nombre_frames / 1 000 000`. — [Prix officiel SeedVR2 Video](https://fal.ai/models/fal-ai/seedvr/upscale/video)
- FlashVSR facture 0,0005 $ par megapixel de donnees video avec la meme base `largeur x hauteur x frames`. — [Prix officiel FlashVSR](https://fal.ai/models/fal-ai/flashvsr/upscale/video)
- Topaz Precision annonce, a 30 fps, 0,20 $ par tranche de 10 secondes en 1080p pour les modeles standards, mais donne egalement 0,80 $ pour une minute et precise que les credits sont arrondis une fois par job; la page dit explicitement que resolution, duree et FPS changent le total. — [Prix officiel Topaz Video Precision](https://fal.ai/models/topaz/upscale/video/precision)
- Topaz Starlight coute, a 30 fps et jusqu'a 1080p, 1,20 $/10 s pour les modeles qualite et 0,60 $/10 s pour Fast 2; a 60 fps, le prix double. — [Prix officiel Topaz Video Generative](https://fal.ai/models/topaz/upscale/video/generative)
- Topaz Image Precision coute 0,08 $ par tranche commencee de 24 MP de sortie; Wonder 3/3.5 coute 0,08 $ par tranche commencee de 8 MP; Bloom 2 coute 0,08 $ par tranche commencee de 2 MP. — [Topaz Image Precision](https://fal.ai/models/topaz/upscale/image/precision); [Topaz Image Generative](https://fal.ai/models/topaz/upscale/image/generative); [Topaz Image Creative](https://fal.ai/models/topaz/upscale/image/creative)
- BARZ verifie deja le modele et le prix courant via `/models/pricing`, calcule une preview sans upload, cree un job `awaiting_confirmation`, exige `confirm: true` avec le cout affiche, reverifie le modele et bloque si le montant a change avant l'envoi. — [Client fal BARZ](../../src/providers/fal.js); [Pipeline de confirmation BARZ](../../server.js)

### Inferences
- Il faut reutiliser la meme barriere de depense: `preview -> prepare -> confirmation explicite -> claim atomique -> upload -> queue.submit`. Une modification de prix entre preview et submit doit produire un HTTP 409 et demander une nouvelle confirmation, comme le fait deja BARZ. — [Architecture actuelle](../../server.js)
- Une quote video doit etre calculee apres inspection locale par FFprobe ou equivalente: duree reelle, largeur, hauteur, FPS et audio. Pour un asset distant sans metadonnees fiables, BARZ doit d'abord le rapatrier/prober localement sans lancer de modele, sinon le bouton payant reste bloque. Cette conclusion decoule directement des unites largeur x hauteur x frames et des tarifs sensibles au FPS. — [SeedVR2 pricing](https://fal.ai/models/fal-ai/seedvr/upscale/video); [Topaz Precision pricing](https://fal.ai/models/topaz/upscale/video/precision)
- Pour Topaz Precision, l'interface doit afficher `≈` et une estimation conservatrice tant que fal ne fournit pas une unite live suffisante pour reproduire ses arrondis. La divergence entre l'exemple 10 s et l'exemple 60 s interdit de deduire une simple fonction lineaire sans marge. — [Prix officiel Topaz Video Precision](https://fal.ai/models/topaz/upscale/video/precision)
- Le devis doit montrer au minimum: endpoint, intention, sortie prevue, FPS, duree facturee, audio preserve/remuxe, cout upscale seul et cout pipeline total. Le bouton devrait lire par exemple `Upscaler en 1080p — ≈ 0,11 $`, puis ouvrir une confirmation distincte; l'upscale ne doit jamais demarrer automatiquement apres le draft. — [Regle de confirmation BARZ](../../README.md)

### Gaps
- Je n'ai trouve aucune API fal publique de preflight retournant le prix exact d'une requete arbitraire avant soumission. Le catalogue `/models/pricing` utilise actuellement par BARZ fournit un prix/unite, mais les grilles multi-dimensionnelles doivent rester codees et testees cote application. — [Implementation actuelle du catalogue fal](../../src/providers/fal.js)
- Le calcul exact des credits Topaz Precision pour toutes les durees et FPS n'est pas entierement specifie par la page publique; une quote prudente ou une clarification fal est necessaire.

## Quels controles utilisateur sont essentiels ?

### Takeaway
L'onglet doit rester simple par defaut: source unique, cible, intention et audio. Les controles propres aux modeles doivent etre caches dans `Avance`, faute de quoi l'utilisateur devra comprendre une dizaine de vocabulaires incompatibles.

### Cited Findings
- Les endpoints video acceptent une URL unique `video_url`, tandis que les endpoints image acceptent une URL unique `image_url`; il s'agit donc d'un outil de transformation d'un asset, pas d'un deck multi-reference. — [Topaz Video Precision API](https://fal.ai/models/topaz/upscale/video/precision/api); [Topaz Image Generative API](https://fal.ai/models/topaz/upscale/image/generative/api)
- Les controles communs documentes sont facteur ou cible, format/codec, qualite, et parfois FPS; les controles creatifs et de restauration sont propres a chaque modele. — [SeedVR2 Video API](https://fal.ai/models/fal-ai/seedvr/upscale/video/api); [Topaz Video Precision API](https://fal.ai/models/topaz/upscale/video/precision/api); [FLUX Video API](https://fal.ai/models/blackforestlabs/flux-video-upscale/api)
- BARZ sait deja selectionner des Assets locaux ou generes et n'envoie les fichiers locaux a fal qu'apres confirmation; la limite actuelle est 100 Mo pour un media general et le stockage fal cree par BARZ expire apres 24 heures. — [BARZ README](../../README.md); [Upload fal BARZ](../../src/providers/fal.js)

### Inferences
- Controles essentiels video: **Source**, **Sortie 1080p/2K/4K**, **Intention Fidele/Economique/Creatif**, **Modele recommande/manuel**, **Preserver l'audio ON**, **Codec H.264/H.265**, cout et avertissement sur la geometrie de sortie. Controles essentiels image: **Source**, **2x/4x ou cible**, **Fidele/Restaurer/Creatif**, **Visages ON/OFF**, format et cout. — [Schemas fal compares](https://fal.ai/topaz)
- `Avance` doit etre genere depuis le schema verifie: preset/tier/fidelite/bit depth pour ByteDance; modele, FPS et artefacts pour Topaz; creativity/prompt pour FLUX; noise scale/seed/format pour SeedVR2; acceleration/color fix/quality pour FlashVSR. — [ByteDance API](https://fal.ai/models/fal-ai/bytedance-upscaler/upscale/video/api); [Topaz Precision API](https://fal.ai/models/topaz/upscale/video/precision/api); [FLUX API](https://fal.ai/models/blackforestlabs/flux-video-upscale/api); [SeedVR2 API](https://fal.ai/models/fal-ai/seedvr/upscale/video/api); [FlashVSR API](https://fal.ai/models/fal-ai/flashvsr/upscale/video/api)
- Il faut ajouter sur chaque video terminee un bouton **Envoyer vers Upscale** qui fixe cet asset comme source, mais conserve aussi le drop disque et le picker Assets. Les references ordinaires doivent rester independantes de cette source unique. Cette separation evite que le mapping multi-reference actuel choisisse silencieusement la mauvaise video. — [Mapping de references BARZ](../../public/generation-plan.js)

### Gaps
- Aucun schema commun ne garantit un format HDR, une plage couleur ou des metadonnees identiques a la source; ces options ne doivent pas etre promettes dans le MVP.

## Quel job flow, quels uploads et quels pieges faut-il gerer ?

### Takeaway
Le job upscale peut reutiliser la machine d'etats de generation, mais pas son formulaire tel quel: celui-ci exige un prompt et un `mediaType` de generation. Il faut un type de job `upscale` et un preview dedie, tout en conservant les memes verrous de confirmation et de suivi fal.

### Cited Findings
- Le preview de generation BARZ exige actuellement un prompt non vide et fait correspondre le media de sortie du modele au launcher; il n'est donc pas directement adapte a une transformation sans prompt. — [Generation preview BARZ](../../public/generation-plan.js)
- BARZ sait deja soumettre a `queue.fal.run`, conserver `request_id`, interroger status/result et traiter les jobs longs de maniere asynchrone. fal recommande aussi Queue/Webhooks pour les traitements longs. — [Client fal BARZ](../../src/providers/fal.js); [Documentation Queue fal via SeedVR2](https://fal.ai/models/fal-ai/seedvr/upscale/video/api)
- Les sources locales sont actuellement uploadees uniquement apres confirmation, vers une URL fal de 24 h; `stageReferenceMedia` connait deja `video_url` et `image_url`. — [Staging BARZ](../../src/reference-upload.js); [Upload fal BARZ](../../src/providers/fal.js)
- Les limites varient fortement: FLUX impose 20 s/50 Mo; Topaz accepte jusqu'a 5 minutes; Bria impose moins de 30 s; la limite BARZ actuelle de media general est 100 Mo. — [FLUX API](https://fal.ai/models/blackforestlabs/flux-video-upscale/api); [Topaz Precision API](https://fal.ai/models/topaz/upscale/video/precision/api); [Bria API](https://fal.ai/models/bria/video/increase-resolution/api); [Upload BARZ](../../src/providers/fal.js)

### Inferences
- Flux recommande: 1) importer/choisir l'asset; 2) sonder les metadonnees localement; 3) calculer le preview sans upload; 4) preparer un job immuable; 5) afficher la confirmation; 6) claim atomique; 7) uploader la source seulement alors; 8) soumettre a la queue; 9) poller ou recevoir le webhook; 10) telecharger/cacher immediatement le resultat dans Assets; 11) remuxer l'audio source si l'endpoint ne le garantit pas. — [Pipeline BARZ actuel](../../server.js); [Queue fal](https://fal.ai/models/fal-ai/seedvr/upscale/video/api)
- Les validations doivent etre propres au modele avant confirmation: taille/duree/type du fichier, facteur autorise, plafond de sortie, compatibilite codec et FPS. La limite generique BARZ de 100 Mo ne suffit pas pour FLUX et peut bloquer inutilement certains longs clips Topaz. — [FLUX API](https://fal.ai/models/blackforestlabs/flux-video-upscale/api); [Topaz Precision API](https://fal.ai/models/topaz/upscale/video/precision/api); [Upload BARZ](../../src/providers/fal.js)
- Comme le stockage d'entree cree par BARZ expire apres 24 h et que la duree de vie garantie des URLs de sortie n'est pas documentee dans les pages consultees, le resultat doit etre copie localement des que le job finit. Le lien fal ne doit pas etre le seul exemplaire durable dans Assets. — [Upload fal BARZ](../../src/providers/fal.js)
- Le job doit conserver `sourceAssetId`, hash/fingerprint, metadonnees sondees, endpoint exact, input exact, devis confirme, URL d'upload temporaire, request ID, resultat local, statut du remux audio et erreur. Cela permet `Recreer` sans payer par accident ni perdre la provenance. — [Modele de job et confirmation existants](../../server.js)

### Gaps
- La duree de retention officielle des URLs de sortie fal n'a pas ete trouvee dans les pages officielles consultees; la copie locale est donc une mesure de prudence, pas une affirmation que les sorties expirent apres 24 h.
- La conservation audio de Topaz, FLUX, ByteDance et SeedVR2 doit etre verifiee sur un clip test; seul FlashVSR et Bria l'exposent explicitement dans leur schema. — [FlashVSR API](https://fal.ai/models/fal-ai/flashvsr/upscale/video/api); [Bria API](https://fal.ai/models/bria/video/increase-resolution/api)

## Draft Seedance 480p + upscale peut-il remplacer le completion 1080p ?

### Takeaway
**Economiquement, oui sans ambiguite; qualitativement, pas comme remplacement universel.** Pour 15 secondes, le draft US coute environ 3,97 $, puis un upscale 1080p coute de 0,11 $ a 4,50 $ selon le moteur, contre environ 17,46 $ pour le completion Seedance natif; le pipeline economique tombe donc autour de 4,08 $ au total, soit environ 81 % moins cher que draft + completion natif (21,43 $).

### Cited Findings
- Seedance 2.5 US facture approximativement 0,2646 $/s en 480p et 1,396278 $/s en 1080p; la formule token utilise 24 images/s. Pour 15 s, cela donne environ 3,969 $ en draft 480p et 20,944 $ en generation US 1080p directe. — [Prix Seedance 2.5 US](https://fal.ai/models/bytedance/seedance-2.5/us/text-to-video)
- Le completion officiel d'un draft regenere le job a 1080p et annonce environ 1,164 $/s, soit 17,46 $ pour 15 s; ce completion est une nouvelle generation a partir du `draft_id`, pas un upscaling pixel. — [Endpoint officiel Draft Completion](https://fal.ai/models/bytedance/seedance-2.5/draft/complete)
- ByteDance standard 1080p/30 fps coute 0,0072 $/s, soit **0,108 $** pour 15 s; Pro coute dix fois plus, soit **1,08 $**. — [Prix ByteDance Upscaler](https://fal.ai/models/fal-ai/bytedance-upscaler/upscale/video)
- Pour une sortie 1080p a 24 fps, FlashVSR coute environ **0,373 $** et SeedVR2 environ **0,746 $** sur la formule `1920 x 1080 x 360 frames`; ces montants sont des calculs directs des tarifs au megapixel de donnees video. — [Prix FlashVSR](https://fal.ai/models/fal-ai/flashvsr/upscale/video); [Prix SeedVR2](https://fal.ai/models/fal-ai/seedvr/upscale/video)
- FLUX coute **2,10 $** en mode fidele et **3,00 $** en creatif pour 15 s a 1080p. — [Prix FLUX Video Upscale](https://fal.ai/models/blackforestlabs/flux-video-upscale)
- Topaz Starlight coute **0,90 $** en Fast 2 ou **1,80 $** avec les modeles qualite pour 15 s a 1080p/30 fps; Astra 2 coute **4,50 $**. — [Prix Topaz Generative](https://fal.ai/models/topaz/upscale/video/generative); [Prix Topaz Creative](https://fal.ai/models/topaz/upscale/video/creative)

### Inferences
- Comparaison de pipeline sur le tarif draft US de 3,969 $: ByteDance standard ≈ **4,077 $ total**, ByteDance Pro ≈ **5,049 $**, FlashVSR ≈ **4,342 $**, SeedVR2 ≈ **4,715 $**, FLUX fidele ≈ **6,069 $**, Topaz Starlight Fast ≈ **4,869 $**, Starlight qualite ≈ **5,769 $**, Astra 2 ≈ **8,469 $**. Tous restent sous les **21,429 $** du draft 480p + completion 1080p a 17,46 $. — [Seedance US](https://fal.ai/models/bytedance/seedance-2.5/us/text-to-video); [Draft Completion](https://fal.ai/models/bytedance/seedance-2.5/draft/complete); [tarifs upscalers fal](https://fal.ai/models/fal-ai/bytedance-upscaler/upscale/video)
- Le meilleur chemin produit est donc: draft facultatif, bouton **Finaliser en 1080p natif — ≈ 17,46 $**, et bouton distinct **Upscaler en 1080p** avec choix d'intention et cout. Ne jamais presenter l'upscale comme identique au completion: le completion regenere a haute resolution depuis le job Seedance, alors qu'un upscaler conserve ou invente des details a partir des pixels du draft. — [Draft Completion](https://fal.ai/models/bytedance/seedance-2.5/draft/complete); [Topaz generatif](https://fal.ai/models/topaz/upscale/video/generative)
- Recommandation economique initiale: **ByteDance Standard + preset `aigc` + fidelite `high`** pour le bouton conseille; **Topaz Precision/Proteus ou Gaia CG** pour une finition fidele; **FLUX Creative ou Topaz Starlight** seulement sur demande, car ils peuvent reconstruire ou halluciner du detail. — [ByteDance API](https://fal.ai/models/fal-ai/bytedance-upscaler/upscale/video/api); [Topaz Precision API](https://fal.ai/models/topaz/upscale/video/precision/api); [FLUX API](https://fal.ai/models/blackforestlabs/flux-video-upscale/api); [Topaz Generative](https://fal.ai/models/topaz/upscale/video/generative)

### Gaps
- L'economie est certaine d'apres les grilles publiques, mais l'equivalence visuelle avec le completion Seedance ne l'est pas. Un A/B sur 3 a 5 drafts difficiles (visages, texte, mouvement rapide, faible lumiere, particules) est requis avant de recommander l'upscale automatiquement.
- Le prix du draft US et le prix du completion non-US proviennent de deux endpoints publies separement; BARZ doit verifier le prix live de chacun au moment de la confirmation et ne pas figer les totaux ci-dessus. — [Seedance US](https://fal.ai/models/bytedance/seedance-2.5/us/text-to-video); [Draft Completion](https://fal.ai/models/bytedance/seedance-2.5/draft/complete)
