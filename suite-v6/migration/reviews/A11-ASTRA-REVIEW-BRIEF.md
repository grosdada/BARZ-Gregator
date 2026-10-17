# A11 — Seedance Framing : brief de revue Astra

Revue terminée : voir A11-ASTRA-HANDOFF.md. **Revenir sur Sol High**
pour le portage. Le brief initial ci-dessous conserve le périmètre de revue.

Date : 13 septembre 2026. Préparation : Sol. Ce document borne la prochaine passe
Astra ; il n’autorise ni portage runtime, ni appel LLM, ni génération payante, ni
modification des ateliers A1–A10. **Passer sur Astra High pour la revue, puis revenir
sur Sol avant l’implémentation.** Aucun reset de quota ne doit être consommé.

## Périmètre signé

- bundle : `a11-seedance-framing`, 532 décisions, environ 15 907 tokens,
  propriétaire exclusif `seedance` ;
- source historique : `Barzy App/public/assets/HTML/seedance_framing_final.html` ;
- fixture : `a11-legacy-fixtures.json` ;
- catalogue actif : 25 templates dans 5 catégories, chacun avec 10 stills et
  7 plans mobiles ;
- matrice gelée : les 25 templates en stills et en mouvement pour Seedance,
  Kling et WAN, avec 5 plans sur 13 secondes et deux références décrites ;
- interface : 9 références ordonnées, champs sujet/contexte par image, style
  global, durée 1–15 s, 1–30 plans et limite de sortie 300–12 000 caractères.

Le bundle à lire est
`migration/atlas-v5/semantic-review/astra-bundles/a11-seedance-framing.json`.
Le gabarit signé à compléter est
`migration/atlas-v5/semantic-review/astra-reviews/a11-seedance-framing.review.json`.

- digest canonique du bundle :
  `b72103ac890de3e662d9f95b7fca27725e104bfb88a560a6ac62e39ab9f73b0c` ;
- SHA-256 du fichier bundle :
  `0814aa3a933fca7fe38c95419019b022e68b6cadfb48507eebbfeddcbea98f20` ;
- SHA-256 du fichier fixture :
  `a8702b866bb460d71c56140f47720c6efd208ca8d2e0f4493b9423556d913a99`.

## Mission Astra

Lire les 532 valeurs du bundle et les rapprocher du catalogue et des sorties de
la fixture. Produire une décision par ID : `preserve`, `correct` avec texte et
raison, ou `exclude-non-prompt` avec raison. Conserver l’anglais original sauf
faute, contradiction ou ambiguïté réelle.

Rendre aussi un avis architectural bref sur :

1. les 25 templates et leurs catégories dans l’ordre source : CORE, SECONDARY,
   WILD CARDS, REAL puis SIGNATURE ; ne pas fusionner les auteurs homonymes ni
   réordonner silencieusement les styles ;
2. les deux banques par template : exactement 10 stills et 7 plans mobiles ;
   Wes Anderson et Sofia Coppola réemploient volontairement la banque Standard
   et ajoutent leur direction par note ; décider si V6 matérialise cette
   composition sans dupliquer le contenu ;
3. les espaces réservés `[SUBJECT]`, `[CONTEXT]`, `[STYLE]` et les balises
   `@image1…@image9` : distinguer texte éditable, référence et valeur de repli ;
4. les trois dialectes de mouvement : Seedance emploie « Cut to » sans timecode,
   Kling et WAN emploient des plages temporelles. Le texte d’information V5 nomme
   par erreur Kling pour WAN ; corriger le libellé sans changer le format ;
5. la répétition cyclique des 7 plans lorsque l’utilisateur demande 8–30 plans :
   décider si elle reste explicite, est adaptée ou devient un avertissement,
   sans inventer silencieusement de nouveaux plans ;
6. la division égale de la durée et son format `MM:SS.ss`, y compris les fractions
   non entières ; la somme doit rester exactement égale à la durée choisie ;
7. les données par référence : image, sujet et contexte voyagent ensemble. La
   première image est principale, la deuxième nourrit sujet/contexte secondaire ;
   définir le rôle des images 3–9 sans les prétendre intégrées au texte si elles
   ne le sont pas réellement ;
8. la ligne de coexistence multi-référence : relation motivée, lumière, échelle
   et contact spatial cohérents, sans transformer les images en collage ;
9. la limite de caractères historique tronque les descriptions après rendu HTML.
   Définir une sortie V6 déterministe, copiée à l’identique de l’aperçu, sans
   couper les labels, les timecodes ou créer une phrase trompeuse ;
10. GO ACTION et ses modes Continuity, Abstract et Biologique : l’appel
    `/api/ai/video-direct` doit rester une action explicite, jamais déclenchée par
    chargement, compilation, copie, import du pont ou changement de réglage ;
11. l’import dossier et les neuf slots : conserver l’ordre stable et les
    métadonnées de chaque image dans le setup ; ne jamais embarquer les data URLs
    dans un prompt texte ou un bundle de bibliothèque ;
12. les noms de cinéastes servent de directions artistiques. Préserver leur
    variété historique, tout en corrigeant seulement les fautes et contradictions
    documentées, sans homogénéiser tous les styles.

## Contraintes de portage

- Conserver tous les templates, catégories, plans et notes avec IDs stables.
- Séparer l’état de compilation des prompts personnalisés sauvegardés par setup.
- Rendre l’aperçu et la copie strictement identiques ; texte utilisateur via
  `textContent`, jamais via `innerHTML`.
- Afficher clairement le dialecte actif, la durée et le nombre de plans.
- Une compilation locale n’effectue aucun appel réseau.
- GO ACTION exige une action utilisateur et un service disponible vérifié ; une
  indisponibilité reste visible et ne fabrique pas de résultat fictif.
- Le pont prépare un brouillon vidéo et ses références, sans génération implicite.
- Deck et Backstage restent fixes ; Seedance Framing reste déplaçable et
  renommable via Build.

## Livrables Astra

1. Compléter le gabarit signé avec exactement 532 décisions.
2. Créer `a11-astra-supplement.review.json` pour les valeurs actives absentes du
   bundle et les sorties V6 attendues, lié au SHA-256 de la fixture.
3. Créer `A11-ASTRA-HANDOFF.md` avec compteurs, corrections, exclusions et contrat
   précis des modes, références, durées, répétitions et limites de copie.
4. Ne modifier aucun fichier runtime et ne lancer aucun serveur ou génération.

Valider le fichier principal avec :

`npm run validate:astra-review -- migration/atlas-v5/semantic-review/astra-bundles/a11-seedance-framing.json migration/atlas-v5/semantic-review/astra-reviews/a11-seedance-framing.review.json`
