# A10 — MD Multishot : handoff Astra → Sol

Revue terminée le 13 septembre 2026. Revenir sur **Sol High** pour le portage.
Le runtime reste en A9 ; ce lot livre les décisions, le catalogue et les sorties
attendues. Aucun appel LLM ou génération n’a été effectué.

## Résultat et preuves

- 154 valeurs du bundle lues : **61 conservées, 15 corrigées, 78 hors prompt**.
- 89 valeurs complémentaires de la même source lues : toutes sont des éléments
  d’interface ou de code, conservés dans la provenance et exclus du texte final.
- Les 243 IDs couvrent toutes les occurrences de cette source dans le corpus.
- Les 24 entrées caméra, 6 séquences, 8 boards et 16 angles Multi-Angle sont
  conservés ; le catalogue complet figure dans le supplément.
- 120 sorties historiques comparées aux véritables fonctions V5 de rendu/Copy
  et Multi-Angle en VM isolée : identiques à la fixture Sol.
- 162 sorties V6 attendues : 135 sorties de cartes (toutes les grilles, flash
  ciblé compris), 27 Multi-Angle (vide, renseigné et entrée littérale), plus les
  24 sorties caméra indépendantes.
- 9 tests ciblés réussis : signature, couverture, cardinalité, ordre narratif,
  flash, conservation du texte littéral et corrections enregistrées.

Fichiers faisant autorité :

- `a10-astra.review.json` et sa copie dans
  `../atlas-v5/semantic-review/astra-reviews/a10-multishot.review.json` ;
- `a10-astra-supplement.review.json` : catalogue, champs structurés, plans de
  découpage, sorties finales attendues et limites du pont ;
- `record-a10-astra-review.mjs` : enregistrement reproductible et oracle de revue,
  pas un adaptateur à importer tel quel dans l’application ;
- `../../tests/a10-astra-review.test.js` : contrôle des engagements du lot.

Le digest canonique du bundle reste
`203c3439d259c9ab98cf4788cf39250485dfd519434b3af279127fdbe4c42bab`.
La fixture reste inchangée, SHA-256
`c4a4fe9729b68f19cd1051037fa01d27bcc75616c0c2847fdaef9f419d2b4468`.
Le supplément référence aussi le hash du corpus et celui du HTML historique.

## Corrections enregistrées

Les indices ci-dessous sont ceux du bundle signé, à partir de 1.

| Indices | Décision |
| --- | --- |
| 4 | Le flat lay final autorise le retrait des accessoires, mais conserve leur identité exacte. |
| 9 | Les blocs de trois actions sont des beats narratifs, pas des rangées d’une grille à deux colonnes. |
| 10 | Retirer la buée de respiration accidentelle sur la plage chaude. |
| 19, 119 | Garder la fin d’après-midi durant tout le western, jusqu’au coucher de soleil final. |
| 53 | Multi-Angle change viewpoint **et framing** ; conserver le style de la référence au lieu de forcer photoreal. |
| 62 | Retirer l’ancien override contradictoire au profit d’un en-tête et d’un plan déjà compilés. |
| 84, 134 | Le reflet de visage se situe sur la cornée, pas dans la pupille. |
| 109 | Corriger « the a », le « with » manquant, Fuji Velvia et overexposed. |
| 123, 147 | Remplacer les références fragiles aux numéros de plans par les vues nommées. |
| 127 | Remplacer le POV impossible montrant aussi le visage du conducteur par un angle intérieur passager. |
| 135 | Une itération conserve identité, vêtements, matières, éclairage et environnement. |
| 136 | La sélection de six vues ne prétend plus couvrir un tour complet. |

Le titre ` Image Board - Template` perd seulement son espace initial dans le
catalogue visible. Cette correction de métadonnée est enregistrée séparément.
Les références artistiques, films, marques photo, styles et noms historiques
restent disponibles. `Amat (Handheld)` reste le titre source : pas de renommage
interprétatif. Les contextes caméra sont des aides visibles, pas des ajouts cachés
au texte copié.

## Structure de l’atelier

Installer l’outil `multishot` dans **Board & Sequence** (`grid-generation`), après
les outils existants. Il reste déplaçable et renommable par Build.
Conserver Camera Angles → Multishot Sequences → Action Boards, avec Multi-Angle
au début de Multishot Sequences. Préserver l’ordre source dans chaque catalogue.

- Camera : 24 entrées, 12 Shots puis 12 Movements. Recherche nom/prompt et filtre
  All/Shots/Movements. `context` reste une aide distincte.
- Multishot : six cartes ; `multishot-0` reste la première carte, intitulée
  Initial Model Prompt avec indication « image unique ». Grille et flash global
  sont sans effet sur elle ; son flash intrinsèque et son texte 3:2 restent.
- `multishot-1` expose Hard Flash. Désactivé signifie retirer l’instruction
  « with a hard flash », pas inventer un éclairage diffus ni effacer tout reflet.
- Action Boards : huit cartes indépendantes. Aucun composite implicite.
- IDs stables du supplément : `camera-01`…`camera-24`, `multishot-0`…`multishot-5`,
  `board-0`…`board-7`, `multi-angle`. Ne pas recalculer les IDs d’après les titres.

## Contrat des grilles

Une grille est **colonnes × lignes**, avec deux entiers compris entre 2 et 4.
Les neuf combinaisons sont couvertes : 4, 6, 8, 9, 12 ou 16 panneaux. Refuser les
fractions, NaN, chaînes inattendues et valeurs hors borne dans l’API V6. Les
anciens nombres fractionnaires acceptés par le clamp V5 ne sont pas des grilles.

La compilation utilise le modèle source six plans si le total vaut 4 ou 6,
sinon le modèle neuf plans. Elle distingue contexte, liste de plans et technique.
Elle retire les anciens titres Row/Beats, demandes de breakdown et annonces
répétées de grille, puis produit un en-tête unique, une liste de **N** panneaux
numérotés et les contraintes conservées. Les sorties du supplément sont les
attendus exacts, y compris les contraintes « N frames/keyframes » du pied.

| Total | Découpage |
| --- | --- |
| 4 | Les quatre beats choisis carte par carte dans `fourBeatPlans`. L’ouverture et le dénouement restent présents. |
| 6 | Les six beats originaux dans leur ordre. |
| 8 | Neuf beats moins le beat explicitement listé dans `omitForEight`. Le relevé de construction omet seulement le détail aérien final pour garder les huit angles du tour. |
| 9 | Les neuf beats originaux dans leur ordre. |
| 12 | Neuf beats avec un angle complémentaire après les beats 1, 4 et 7. |
| 16 | Neuf beats avec un angle complémentaire après chacun des beats 1 à 7. |

Un angle complémentaire montre **le même instant figé**, légèrement plus serré et
décalé latéralement, sans relancer l’action ou changer costume/objet/éclairage.
Il est inséré immédiatement après le beat couvert. C’est un choix explicite de
couverture pour une planche d’images : cela ne crée pas automatiquement 12 ou 16
événements nouveaux, ni une timeline Director.

Le plan de panneaux est un texte de consignes. Ne pas imprimer ses numéros,
légendes ou descriptions dans l’image. Les inscriptions nécessaires à la scène
(marquages source, accessoire, lecture d’un voyant) restent autorisées. Les
instructions de rendu ne peuvent garantir à elles seules l’obéissance du modèle.

Multi-Angle prend exactement les N premières entrées de son pool de 16. Conserver
le placeholder explicite du sujet vide et insérer les valeurs utilisateur en une
passe littérale. Aucun `eval`, remplacement secondaire de `${...}`, HTML ou
réinterprétation de `$&`. La grille du setup est la source de vérité ; un transfert
depuis Grid Builder doit être explicite et validé.

## Texte final, itération et pont

Le défaut V5 est confirmé dans le gestionnaire réel : Iterate remplace le texte
affiché, mais Copy recalcule la base. V6 doit stocker la sortie finale par carte
et par setup ; Copy et Envoyer utilisent **exactement cette valeur**. Une édition
manuelle ou itérée survit aux changements d’onglet, au redémarrage, aux versions
de setup et au reset. Une recompilation explicite remplace uniquement la sortie
visée ; les changements de contrôles ne détruisent pas une personnalisation.

L’itération reste une action explicite. Son contrat conserve thème, nombre de
panneaux, chronologie, identité et apparence ; seul le découpage/la variation de
scène change. L’image initiale utilise une instruction d’itération image unique.
Une réponse vide, invalide ou au mauvais nombre de panneaux conserve le texte
précédent et présente une erreur récupérable.

**Limite constatée :** le serveur Atlas V6 actuel n’expose pas `/api/ai/refine`.
Conserver ce contrat dans le portage, mais ne pas afficher un bouton actif qui
prétend fonctionner avant raccordement et vérification d’un service autorisé.
Une édition manuelle du résultat reste utilisable. Aucun endpoint, coût ou modèle
de réécriture ne doit être inventé pour clore le lot.

Pour le pont, les planches et Camera Shots produisent un brouillon image ; Camera
Movements produit un brouillon vidéo. Les Camera Movements sont des consignes
de mouvement réutilisables, pas une planche. Ne déduire ni modèle, durée, seed,
résolution ou ratio technique des mentions créatives du texte.

**Limite constatée :** `sendToAggregator` envoie actuellement `references: []`.
Préserver les balises éventuelles ; les images sont à ajouter dans le deck de
l’agrégateur. Un transfert réel n’est annoncé qu’après un contrat d’assets vérifié.
Une référence texte `[character]` ne devient pas arbitrairement `@image1`.

## Vérification Sol attendue

1. Compiler les 162 cas du supplément et les 24 prompts caméra, à l’identique.
2. Vérifier copie/envoi après édition, flash, grille et restauration de setup.
3. Valider le nombre de panneaux et le sens colonnes/lignes pour les neuf grilles.
4. Tester le transport littéral de caractères spéciaux et les contrôles API invalides.
5. Migrer le setup réel avec checkpoint récupérable ; conserver placements et
   personnalisations des ateliers A1–A9.
6. Vérifier un brouillon image et un brouillon vidéo via le pont local.

Rester sur Sol pour ce portage et ses tests. Repasser sur Astra uniquement au
prochain lot de revue borné, après préparation d’un nouveau brief.
