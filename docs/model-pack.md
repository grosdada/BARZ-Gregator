# Pack modèles — 0.33.42

## Interface

Extension du lanceur existant, alignée à gauche. Palette conservée : fond
#070909, panneau #101313, panneau relevé #161a1a, texte #f0eee8,
secondaire #999c98, action #ff5b3a. Police existante Arial Narrow / Segoe UI.
Les nouveaux réglages restent secondaires au prompt et au deck de références.

```text
[ Modèle / mode                       ][ Format ][ Résolution ][ Durée ]
[ Nombre ][ Qualité si disponible ][ Audio si disponible ][ Seed ]
Références : indication du rôle et du nombre accepté
[ deck existant                                                    ]
                                              [ Générer ≈ coût     ]
```

Revue : pas de nouvelle galerie de cartes ni de refonte. Le premier menu regroupe
les endpoints sous leur famille lisible ; le second ne montre que ses modes de
génération compatibles. Les identifiants fal restent conservés dans les brouillons.

## Sources vérifiées le 7 octobre 2026

Les schémas et prix unitaires sont récupérés par l’API fal, sans génération.
Les règles de facturation complémentaires proviennent des pages officielles :

- https://fal.ai/models/fal-ai/flux-2/turbo
- https://fal.ai/models/bytedance/seedream/v5/lite/text-to-image
- https://fal.ai/models/bytedance/seedream/v5/lite/edit
- https://fal.ai/models/bytedance/seedream/v5/pro/text-to-image
- https://fal.ai/models/bytedance/seedream/v5/pro/edit
- https://fal.ai/models/fal-ai/flux-2-pro
- https://fal.ai/models/fal-ai/flux-2-pro/edit
- https://fal.ai/models/alibaba/qwen-image-3/text-to-image
- https://fal.ai/models/alibaba/qwen-image-3/edit
- https://fal.ai/models/fal-ai/wan/v2.7/text-to-image
- https://fal.ai/models/fal-ai/wan/v2.7/pro/text-to-image
- https://fal.ai/models/google/nano-banana-2-lite
- https://fal.ai/models/xai/grok-imagine-image/v2.0/text-to-image
- https://fal.ai/models/xai/grok-imagine-image/v2.0/edit
- https://fal.ai/models/openai/gpt-image-2
- https://fal.ai/models/openai/gpt-image-2/edit
- https://fal.ai/models/openai/gpt-image-2.5/flare/text-to-image
- https://fal.ai/models/openai/gpt-image-2.5/flare/edit
- https://fal.ai/models/openai/gpt-image-2.5/sunburst/text-to-image
- https://fal.ai/models/openai/gpt-image-2.5/sunburst/edit
- https://fal.ai/models/fal-ai/nano-banana-2
- https://fal.ai/models/fal-ai/nano-banana-2/edit
- https://fal.ai/models/fal-ai/nano-banana
- https://fal.ai/models/fal-ai/nano-banana/edit
- https://fal.ai/models/fal-ai/nano-banana-pro
- https://fal.ai/models/fal-ai/nano-banana-pro/edit
- https://fal.ai/models/fal-ai/z-image/turbo
- https://fal.ai/models/fal-ai/z-image/turbo/image-to-image
- https://fal.ai/models/ideogram/v4/fast
- https://fal.ai/models/ideogram/v4/image-to-image
- https://fal.ai/models/blackforestlabs/flux-3/text-to-video
- https://fal.ai/models/blackforestlabs/flux-3/text-to-video/draft
- https://fal.ai/models/blackforestlabs/flux-3/image-to-video
- https://fal.ai/models/blackforestlabs/flux-3/image-to-video/draft
- https://fal.ai/models/minimax/h3/text-to-video
- https://fal.ai/models/minimax/h3/image-to-video
- https://fal.ai/models/minimax/h3/reference-to-video
- https://fal.ai/models/minimax/h3-max/text-to-video
- https://fal.ai/models/minimax/h3-max/image-to-video
- https://fal.ai/models/minimax/h3-max/reference-to-video
- https://fal.ai/models/minimax/h3-max/director
- https://fal.ai/models/fal-ai/ace-step/prompt-to-audio
- https://fal.ai/models/fal-ai/ace-step
- https://fal.ai/models/fal-ai/ace-step/audio-to-audio
- https://fal.ai/models/fal-ai/stable-audio-25/text-to-audio
- https://fal.ai/models/fal-ai/stable-audio-25/audio-to-audio
- https://fal.ai/models/cassetteai/music-generator
- https://developers.heygen.com/docs/models/heygen-video
- https://github.com/fal-ai/fal-js/blob/main/libs/client/src/storage.ts

## Limites prévues

Le deck accepte les images, vidéos et sons selon le schéma du mode sélectionné.
HeyGen multi-références accepte jusqu’à 9 images, 3 vidéos et 3 sons, avec une
limite combinée de 12 médias. Les essais de génération facturés sont réservés à
l’utilisateur ; les validations automatisées simulent la soumission.

Les références locales acceptées pour la génération sont des PNG/JPG/WebP de
30 Mo maximum. Leur copie chez fal est faite après confirmation et expire après
24 heures ; l’original reste dans Assets. Le fichier technique `draft_cache` de
FLUX Draft reste dans le résultat brut, sans devenir une vignette de la galerie.

MiniMax H3 : coût calculé avec la durée explicite et le tarif fal live de
0,05 USD par seconde au moment de la vérification. Les sorties 480P et 768P sont
natives ; 2K et 4K utilisent l’upscale proposé par le modèle. Le contrôle de
sécurité reste toujours actif.
MiniMax H3 Max : durée de 5 à 15 secondes et tarifs live par résolution. Au
10 septembre 2026, texte/image utilisent 0,0125 / 0,02 / 0,04 USD par seconde
en 480P / 768P / 1080P pendant la promotion fal ; multi-références utilise
0,05 / 0,08 / 0,16 USD. fal peut ajouter 0,02 USD par tranche de 1 000 tokens
de références au-delà des 4 096 tokens inclus ; le devis prévient lorsque ce
mode est sélectionné. Le Director expérimental dispose d’un écran séparé : flux
WebRTC en direct, changements de prompt pendant la session, image initiale et
finale reprises du deck Vidéo ou déposées directement dans la régie, sélection
depuis Assets, enregistrement WebM local et arrêt automatique
configurable. Le lancement affiche le minimum fal de 1,20 USD par session ; le
tarif promotionnel constaté est 0,02 USD/s en 480P/768P, doublé en 1080P.
Ideogram : mégapixels de 1024², multiplicateurs
TURBO 0,75 / BALANCED 1,5 / QUALITY 2,5 sur son unité live ; expansion du prompt
désactivée. Nano Banana 2 : multiplicateurs de résolution 0,75 / 1 / 1,5 / 2.
Nano Banana Original : 0,0398 USD par image au tarif live vérifié. Nano Banana
Pro : 0,15 USD par image en 1K/2K et multiplicateur ×2 en 4K.
Z-Image Turbo : 0,005 USD par mégapixel dans les deux modes, avec lots de
1 à 4 images, seed, JPG/PNG/WebP et une référence en image-to-image.
Les résolutions usuelles sont proposées, avec dimensions explicites en 2K pour
FLUX.2, Z-Image Turbo et Ideogram Fast, et jusqu’à 4K pour Seedream et
Ideogram image-to-image.

Le pack image 0.33.42 ajoute FLUX.2 Pro en texte et édition, Seedream 5 Lite et
Pro en texte et édition, Qwen Image 3 en texte et édition, Wan 2.7 standard et
Pro, Nano Banana 2 Lite, Grok Imagine Image 2.0, GPT Image 2.0 et GPT Image 2.5
Flare/Sunburst. Le catalogue fal ne publie pas de second endpoint « Qwen Image
3 Pro » : le modèle Qwen Image 3 disponible est déjà le modèle phare. Aucun
endpoint fictif n’est ajouté. Midjourney et les SREF sont volontairement exclus.
Les références multiples respectent la limite réelle de chaque schéma, jusqu’à
16 pour GPT Image 2.5 ; le compteur du deck suit désormais cette limite.

HeyGen 2K est proposé en 16:9 et 9:16, au tarif public de 0,09 USD/s, soit trois
fois le tarif 768p. ACE-Step est tarifé 0,0002 USD/s pour la composition, les
paroles et le remix. Stable Audio 2.5 est tarifé 0,20 USD par rendu. CassetteAI
est tarifé 0,02 USD par minute de sortie. Tous ces montants sont revérifiés par
l’API fal lors de la soumission avant la confirmation finale.

## Recette du matin

1. FLUX.2 Turbo : texte seul, une image, vérifier affichage et téléchargement.
2. Nano Banana 2 Édition : une image de Ressources, puis plusieurs références.
3. FLUX 3 Draft Image → vidéo : une référence, 5 secondes.
4. MiniMax H3 Multi-références : deux références dans l’ordre, 5 secondes.
5. MiniMax H3 Max : vérifier les trois modes et leurs tarifs sans soumettre,
   puis lancer un rendu 480P de 5 secondes avec l’utilisateur.
6. Recreate : retrouver modèle, format, résolution, audio, nombre et références.
7. Director : ouvrir l’écran sans démarrer, vérifier le devis et les références,
   puis lancer la première session facturée uniquement avec l’utilisateur.

Ne lancer ces essais facturés qu’avec l’utilisateur.

## Vérification effectuée

- 84 tests automatisés passent (mapping, coûts, limites, staging, identité des
  références, conservation des réglages et filtrage du cache Draft).
- 406 combinaisons modèle / format / résolution passent par l’API locale de
  devis ; leur prix et leur contenu correspondent au calcul du navigateur.
- Un PNG technique de 1 pixel a été transféré avec succès au stockage fal.
- Dans l’API locale : FLUX Draft, Nano Banana 4K par lot, ajout d’une ressource
  locale au mode Édition, trois modes MiniMax H3 et devis navigateur/serveur cohérents.
- Aucun nouveau job de génération n’a été soumis pendant cette vérification. Les rendus réels et les
  validations propres aux moteurs distants restent à tester avec l’utilisateur.
