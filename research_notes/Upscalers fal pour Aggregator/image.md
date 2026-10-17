# Upscalers image fal.ai pour BARZ Aggregator

## Quels upscalers image officiels existent sur fal et comment se distinguent-ils ?

### Takeaway
fal propose une gamme suffisamment solide pour un onglet Upscale : Topaz Precision pour agrandir sans réinterpréter, Topaz Generative/Wonder pour reconstruire du détail absent, Topaz Creative/Bloom pour transformer des images générées par IA, Crystal pour les portraits, et Recraft Crisp pour une passe économique. Un produit clair doit d'abord demander l'intention — fidélité, reconstruction, portrait ou économique — plutôt que montrer tous les noms de modèles.

### Cited Findings
- `topaz/upscale/image/precision` est présenté comme un upscale classique non génératif, fidèle aux pixels source, jusqu'à 4×. Il propose Standard V2, High Fidelity V3/V2, Low Resolution V2, CGI, Text Refine et Faces/Face Recovery 3. — [fal, Topaz Precision API](https://fal.ai/models/topaz/upscale/image/precision/api)
- Precision expose `sharpen`, `denoise` et `fix_compression` de 0 à 1, un réglage `strength` pour Text Refine, et l'amélioration des visages activée par défaut avec une force de 0,8. — [fal, Topaz Precision API](https://fal.ai/models/topaz/upscale/image/precision/api)
- `topaz/upscale/image/generative` reconstruit ou invente les détails qui ne sont plus présents dans la source. Wonder 3.5 est la version la plus récente ; Recover 3 vise le détail naturel ; Redefine est guidable par prompt ; Recovery/V2 vise les sources extrêmement petites ou dégradées. — [fal, Topaz Generative API](https://fal.ai/models/topaz/upscale/image/generative/api)
- Wonder 3/3.5 possède trois niveaux d'amélioration (`low`, `medium`, `high`). L'amélioration de visage est activée par défaut ; Redefine ajoute prompt, créativité 1–6, texture 1–5, netteté et débruitage. — [fal, Topaz Generative API](https://fal.ai/models/topaz/upscale/image/generative/api)
- `topaz/upscale/image/creative` avec Bloom 2 est conçu pour les images générées par IA et réinvente les détails ; il propose une créativité de 1 à 9, un autoprompt et la préservation des couleurs. — [fal, Topaz Creative API](https://fal.ai/models/topaz/upscale/image/creative/api)
- `clarityai/crystal-upscaler` est spécialisé dans les visages et portraits : peau, yeux et traits du visage sont prioritaires, avec un facteur annoncé de 1× à 200× et une créativité de 0 à 10 pour doser préservation et hallucination. — [fal, Crystal Upscaler](https://fal.ai/models/clarityai/crystal-upscaler)
- `fal-ai/recraft/upscale/crisp` améliore les petits détails et les visages, mais son schéma n'expose ni facteur ni résolution cible ; l'entrée documentée doit être en PNG. — [fal, Recraft Crisp API](https://fal.ai/models/fal-ai/recraft/upscale/crisp/api)
- `fal-ai/seedvr/upscale/image/seamless` est spécialisé dans les textures raccordables : il préserve la continuité aux bords et accepte soit un facteur, soit une cible 720p/1080p/1440p/2160p. — [fal, comparatif officiel](https://fal.ai/learn/tools/image-to-image-upscalers); [fal, SeedVR2](https://fal.ai/models/fal-ai/seedvr/upscale/image/seamless)
- `topaz/upscale/image/transparent` conserve l'alpha, renvoie toujours un PNG et impose un agrandissement fixe 4×. — [fal, Topaz Transparent API](https://fal.ai/models/topaz/upscale/image/transparent/api)

### Inferences
- Pour un usage cinéma/illustration, Precision et Generative couvrent l'essentiel : le premier protège l'identité et la composition, le second récupère visuellement une image trop petite ou floue au prix d'un risque de détails inventés.
- Crystal mérite un mode distinct « Portrait » car son comportement et son échelle extrême ne correspondent pas à un upscale généraliste.
- SeedVR2 et Topaz Transparent sont utiles comme options avancées pour les assets (textures 3D, logos, cutouts), mais ne sont pas nécessaires dans l'interface principale.

### Gaps
- fal ne publie pas de benchmark indépendant ni de score quantitatif commun entre ces modèles ; « meilleur » dépend donc de la fidélité attendue et du type d'image.
- Aucun test payant n'a été lancé dans cette recherche ; les conclusions de qualité s'appuient sur les descriptions, schémas et comparatifs publiés par fal.

## Quels sont les prix et les limites d'entrée/sortie ?

### Takeaway
Pour une image carrée 1024×1024, les options sérieuses restent très abordables : Topaz Precision coûte 0,08 $ jusqu'en 4K, Wonder 3.5 environ 0,08 $ en 2K et 0,24 $ en 4K, Crystal environ 0,067 $ en 2K et 0,268 $ en 4K. Les montants Topaz sont facturés par tranches commencées ; il faut donc calculer l'estimation à partir des dimensions réelles de sortie avant confirmation.

### Cited Findings
- Topaz Precision coûte 0,08 $ par tranche commencée de 24 mégapixels de sortie, pour tous ses modèles. Une sortie jusqu'à 24 MP coûte donc 0,08 $, de plus de 24 à 48 MP 0,16 $. — [fal, Topaz Precision](https://fal.ai/models/topaz/upscale/image/precision)
- Topaz Generative Wonder 3/3.5 coûte 0,08 $ par tranche commencée de 8 MP ; les autres modèles de cet endpoint coûtent 0,08 $ par tranche commencée de 4 MP. fal donne 0,24 $ pour 24 MP avec Wonder 3/3.5 et 0,48 $ avec les autres. — [fal, Topaz Generative](https://fal.ai/models/topaz/upscale/image/generative)
- Topaz Creative/Bloom coûte 0,08 $ par tranche commencée de 2 MP, soit 0,96 $ pour 24 MP. — [fal, Topaz Creative](https://fal.ai/models/topaz/upscale/image/creative)
- Crystal coûte 0,016 $ par mégapixel de sortie ; fal donne 0,064 $ pour 4 MP et 0,256 $ pour 16 MP. — [fal, Crystal Upscaler](https://fal.ai/models/clarityai/crystal-upscaler)
- Recraft Crisp coûte 0,004 $ par image, indépendamment de la taille de sortie. — [fal, Recraft Crisp](https://fal.ai/models/fal-ai/recraft/upscale/crisp)
- SeedVR2 Seamless coûte 0,0025 $ par mégapixel de sortie. — [fal, SeedVR2](https://fal.ai/models/fal-ai/seedvr/upscale/image/seamless)
- Les endpoints image Topaz acceptent un facteur jusqu'à 4× et une sortie jusqu'à 512 MP. — [fal, catalogue Topaz](https://fal.ai/topaz)
- Les pages Topaz affichent comme formats d'entrée JPEG, PNG, WebP, GIF, AVIF, HEIC et HEIF ; Precision/Generative/Creative renvoient JPEG ou PNG. — [fal, Topaz Precision](https://fal.ai/models/topaz/upscale/image/precision); [fal, Topaz Generative](https://fal.ai/models/topaz/upscale/image/generative); [fal, Topaz Creative](https://fal.ai/models/topaz/upscale/image/creative)

| Exemple, entrée 1024×1024 | Sortie 2048×2048 (4,194 MP) | Sortie 4096×4096 (16,777 MP) | Méthode de calcul |
|---|---:|---:|---|
| Topaz Precision | 0,08 $ | 0,08 $ | 0,08 $ × plafond(MP / 24) |
| Topaz Wonder 3.5 | 0,08 $ | 0,24 $ | 0,08 $ × plafond(MP / 8) |
| Topaz Bloom 2 | 0,24 $ | 0,72 $ | 0,08 $ × plafond(MP / 2) |
| Crystal Portrait | ≈ 0,067 $ | ≈ 0,268 $ | 0,016 $ × MP |
| SeedVR2 Seamless | ≈ 0,010 $ | ≈ 0,042 $ | 0,0025 $ × MP |
| Recraft Crisp | 0,004 $ | non garanti | prix fixe ; pas de cible 2K/4K dans le schéma |

### Inferences
- Les calculs 1K→2K/4K ci-dessus appliquent directement les unités tarifaires publiées par fal aux dimensions carrées 1024, 2048 et 4096 ; ce sont des estimations, pas des devis retournés par l'API.
- Precision est le meilleur rapport coût/contrôle pour une sortie 4K fidèle. Wonder 3.5 reste peu cher au regard du coût d'une nouvelle génération vidéo 1080p et peut rendre le flux draft 480p → upscale économiquement intéressant, sans garantir qu'un upscale égale une vraie génération 1080p.
- Bloom 2 doit être signalé comme « créatif et plus cher » : sur une sortie 4K carrée, il coûte neuf fois Precision dans cet exemple.

### Gaps
- Les pages fal consultées ne publient pas de limite de poids de fichier ni de dimensions d'entrée commune aux endpoints Topaz.
- Crystal annonce jusqu'à 200×, mais sa page ne publie pas de plafond de mégapixels de sortie ; l'interface BARZ devrait imposer une limite prudente et afficher le coût avant envoi.
- Recraft Crisp ne documente ni facteur de sortie ni résolution cible ; il ne faut donc pas promettre « 2K » ou « 4K » dans l'UI pour ce mode.

## Quels modèles intégrer sans surcharger l'interface ?

### Takeaway
Recommandation MVP : quatre intentions visibles — Fidèle, Reconstruire, Portrait et Économique — avec un modèle par défaut derrière chacune. Les sous-modèles Topaz et réglages techniques peuvent rester dans « Avancé ».

### Cited Findings
- fal classe officiellement Topaz Generative, Topaz Precision et Recraft Crisp comme ses trois meilleurs upscalers image de son comparatif 2026. — [fal, comparatif officiel 2026](https://fal.ai/learn/tools/image-to-image-upscalers)
- fal recommande Standard V2 ou High Fidelity V3 pour les photos qui ne doivent pas être réinterprétées, Bloom 2 pour les images générées par IA et Recover 3 pour les originaux dégradés. — [fal, catalogue Topaz](https://fal.ai/topaz)
- Wonder 3.5 est décrit comme le dernier Wonder avec des détails plus fins et moins de motifs répétitifs. — [fal, Topaz Generative API](https://fal.ai/models/topaz/upscale/image/generative/api)
- Recraft Crisp a un coût fixe de 0,004 $ et ne demande qu'une image PNG, sans réglage de facteur. — [fal, Recraft Crisp API](https://fal.ai/models/fal-ai/recraft/upscale/crisp/api)

### Inferences
- Proposition UI :
  - **Fidèle — Topaz Precision / Standard V2** : facteur 2× ou 4× ; avancé = High Fidelity, Low Resolution, CGI, Text Refine, Faces, netteté, bruit, compression.
  - **Reconstruire — Topaz Generative / Wonder 3.5** : facteur 2× ou 4× ; avancé = force low/medium/high et amélioration visage. Afficher « peut inventer des détails ».
  - **Portrait — Crystal** : facteur, créativité, format ; afficher un avertissement au-delà de 4× et le coût calculé.
  - **Économique — Recraft Crisp** : une passe automatique à 0,004 $, sans promesse de résolution cible.
- Bloom 2 peut rester dans « Avancé / Image IA créative » au lancement. Il apporte une vraie différence mais son tarif et sa propension à réinterpréter l'image en font un choix moins universel.
- Deux spécialisations pourraient être ajoutées plus tard sans élargir la liste principale : « Texture raccordable » via SeedVR2 et « PNG transparent » via Topaz Transparent.
- Tous les appels doivent passer par le proxy serveur existant, avec upload fal, file d'attente, estimation, puis confirmation explicite avant dépense.

### Gaps
- Il faut valider sur le corpus réel de BARZ (portraits, frames générées, texte, renders 3D) avant de figer les valeurs par défaut de créativité et de face enhancement.
- Le temps moyen de traitement n'est pas publié de façon exploitable sur les pages consultées ; l'UI doit donc afficher un état de file d'attente plutôt qu'une promesse de durée.

## L'usage commercial et les restrictions sont-ils documentés ?

### Takeaway
Les endpoints recommandés portent le badge « Commercial use » sur fal. Cette indication autorise raisonnablement leur intégration pour des projets commerciaux, mais elle ne remplace pas une vérification juridique des droits sur les images d'entrée, des personnes représentées et des conditions fal en vigueur.

### Cited Findings
- Topaz Precision, Generative et Creative portent les badges « Commercial use » et « Partner » sur leurs pages fal. — [fal, Topaz Precision](https://fal.ai/models/topaz/upscale/image/precision); [fal, Topaz Generative](https://fal.ai/models/topaz/upscale/image/generative); [fal, Topaz Creative](https://fal.ai/models/topaz/upscale/image/creative)
- Crystal Upscaler porte le badge « Commercial use » et sa fiche indique explicitement « Commercial use permitted ». — [fal, Crystal Upscaler](https://fal.ai/models/clarityai/crystal-upscaler)
- Recraft Crisp porte les badges « Commercial use » et « Partner ». — [fal, Recraft Crisp](https://fal.ai/models/fal-ai/recraft/upscale/crisp)
- SeedVR2 Seamless et Topaz Transparent portent eux aussi le badge « Commercial use ». — [fal, SeedVR2](https://fal.ai/models/fal-ai/seedvr/upscale/image/seamless); [fal, Topaz Transparent](https://fal.ai/models/topaz/upscale/image/transparent)
- Les schémas Topaz comportent un safety checker activé par défaut ; sa désactivation demande une autorisation de compte. — [fal, Topaz Precision API](https://fal.ai/models/topaz/upscale/image/precision/api); [fal, Topaz Generative API](https://fal.ai/models/topaz/upscale/image/generative/api)

### Inferences
- L'onglet peut indiquer « usage commercial selon fal » sans promettre une indemnisation ou une exclusivité sur les sorties.
- Il est prudent de conserver le safety checker activé et de ne pas exposer sa désactivation dans l'interface standard.

### Gaps
- Les fiches modèles ne détaillent pas les obligations liées aux droits de portrait, marques, copyright des entrées ou juridictions ; ces points restent régis par les conditions fal et les droits détenus par l'utilisateur.
- Aucune garantie spécifique d'indemnisation commerciale n'a été trouvée dans les fiches consultées.
