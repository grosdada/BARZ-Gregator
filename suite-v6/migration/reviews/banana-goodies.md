# BZ Goodies — revue Astra et passage à Sol

Revue terminée le 11 septembre 2026. Les 77 prompts et la composition ont été
lus dans `banana_helper.html`, lignes 235–438, ainsi que `barzy-theme.js`.
Le catalogue relu est dans [banana-goodies.review.json](banana-goodies.review.json),
et les 39 cas de référence dans [banana-goodies.fixtures.json](banana-goodies.fixtures.json).
Le module est désormais intégré et testé dans l'interface V6.

## Contenu relu

77 entrées : 10 pour chacune des catégories 1930s, 1940s, 1950s, 1960s, 1970s,
1980s et 2000s, puis 7 transformations Fun. L'absence des années 1990 est celle
du catalogue source ; aucun contenu supplémentaire n'est inventé.

Chaque entrée possède ID stable, catégorie, ordre, titre, original, texte corrigé,
provenance corpus/ligne et recette V6 valide. Les 210 valeurs uniques du fichier
sont classées entre templates de prompt, titres, catégories, éléments d'assemblage
et contexte d'interface/code. Titres et infobulles ne sont pas des prompts.

17 substitutions grammaticales concernent 16 cartes : neuf `a 1980s` deviennent
`an 1980s`, sept `No text on image.` deviennent `No text on the image.`, et
`Generate character design for me` devient `Generate a character design for me`.
Le `an 1980s` de Horror Rental Cover était déjà correct. `a 2000s` reste correct
avec la prononciation « two-thousands ». Les choix créatifs sont conservés.

## Décisions de composition

1. Conserver le marqueur source `[Scene Description]` dans le contenu relu.
   La recette V6 utilise `{{scene}}` aux deux endroits : corps et suffixe. Avant
   compilation, `scene = detail.trim() || '[Details]'`. Préserver les espaces
   internes et retours ligne. Limite proposée du détail : 4 000 caractères.
2. `Copier sans détails` garde son comportement historique : prompt complet
   et suffixe avec `[Details]`. Le libellé est cohérent ; c'est le toast
   `Raw prompt copied` qui est trompeur. Le remplacer par `Prompt sans détails
   copié`. Une action supplémentaire de copie brute n'est pas nécessaire.
3. Garder les deux contraintes de texte des sept entrées Fun. Elles ne sont pas
   équivalentes : le corps impose une interdiction absolue, le suffixe contient
   une exception pour la typographie demandée. Une déduplication changerait le
   sens. Afficher le texte intégral pour permettre une adaptation volontaire.
4. Garder les copies groupées sans détails personnels : ordre canonique, en-tête
   `categoryId / title`, saut de ligne, prompt, puis deux sauts entre entrées.
   Libellés : `Copier la catégorie sans détails` et `Tout copier sans détails`.
   La recherche globale ne change pas la portée de ces actions.
5. Conserver `[Image1]`, `[Image2]`, `[Image3]` dans Multiple Image Fusion.
   Ces indications textuelles n'attachent aucun fichier. Une traduction vers
   `@imageN` attend un véritable raccordement des références.
6. Toutes les sorties sont de type **image**, y compris les images évoquant une
   VHS ou un arrêt sur vidéo. Aucun modèle, format ou fournisseur n'est imposé.

## Défauts confirmés à corriger au portage

- Compteur et toast issus du catalogue : 77, et non 70. Fun n'est pas une époque ;
  donner à cette catégorie une infobulle adaptée aux transformations.
- Les détails V5 sont seulement dans le DOM : recherche, changement de catégorie
  et Clear search reconstruisent les cartes et perdent la saisie. Les conserver
  par ID stable ; l'index du tableau filtré ne peut pas servir d'identité.
- Le remplacement V5 interprète les tokens dollar de JavaScript : dollar-ampersand,
  double dollar, dollar-backtick et dollar-apostrophe. Les quatre cas sont
  reproduits dans les fixtures. Le compilateur V6 existant utilise un callback
  et conserve ces valeurs littéralement ; il convient directement.
- Le thème historique compacte les espaces et remplace des noms dans le prompt
  affiché alors que la copie reste inchangée. Afficher et copier la même chaîne
  compilée, avec `textContent`.
- Le pont V6 déduit actuellement le média par
  `toolId === 'barz-enhancer' ? 'image' : 'video'`. Utiliser le `mediaType`
  de la sortie compilée pour envoyer Goodies dans le lanceur image.

## Contrat de portage pour Sol High

Conserver `toolId: banana-helper` et afficher `BZ Goodies`. L'identifiant
`bz-goodies` envisagé au préflight imposerait une migration inutile. Enregistrer
une seule bibliothèque dans Look Library avec `kind: builtin` et
`adapterId: prompt-library`. Ce dernier est un identifiant d'adaptateur autorisé
par le contrat, pas un nouveau `kind`.

La bibliothèque est pilotée par données : catégories et entrées contenant des
recettes. Réutiliser `validateRecipe` et `compileRecipe` ; les 77 recettes fournies
sont compatibles. Ne pas créer 77 onglets/outils ni 77 traitements particuliers.
Les catalogues runtime doivent être autonomes ; le dossier de revue conserve
la provenance de développement.

Prévoir `activeCategory`, `searchQuery`, `selectedEntryId` et `detailsByPrompt`
dans la configuration du setup. Valider types, IDs, tailles, portée de bibliothèque,
révision et contexte de setup avant écriture. L'enveloppe existante de stockage
des outils est limitée à 2 MiB. Duplication et versions doivent embarquer cet état.
Le reset bénéficie du point de récupération existant ; conserver les créations
personnelles selon la règle V6.

L'ajout/édition de contenus de bibliothèque depuis Build reste à implémenter :
le registre sait ajouter un outil-recette, mais ne gère pas encore les ajouts
ou overrides d'entrées d'une bibliothèque. Le composant générique devra accepter
un catalogue effectif (defaults + modifications locales) sans dépendre de Goodies.
La migration des 77 entrées n'achève donc pas à elle seule l'éditeur Build.

Interface : catégories, recherche globale, détail par carte, aperçu, copie,
copie sans détails, copies groupées et envoi explicite d'une sortie en brouillon
dans l'agrégateur. Conserver la saisie lorsqu'on filtre et navigue. Garder Deck
et Backstage fixes.

## Vérification et limites

Les données source sont décodées en JSON. Seule la fonction pure `finalPrompt`
relue est exécutée dans une VM isolée avec un suffixe connu ; aucune application
ni API n'est lancée. Empreintes du fichier et de la fonction vérifiées.

39 cas enregistrent séparément les sorties V5 et attendues V6 : huit catégories
avec détail vide/rempli, les six autres entrées Fun, huit cas limites dont tokens
dollar, 4 000 caractères et texte littéral, huit copies de catégorie et copie
complète. Les sorties V6 sont construites avec un oracle `split/join` indépendant
puis confrontées au compilateur actuel. 231 compilations supplémentaires couvrent
les 77 recettes avec trois saisies.

L'interface, la persistance par setup et l'enveloppe du brouillon agrégateur sont
également vérifiées dans le lot 3C. Aucun appel fournisseur payant n'est effectué.

La capture peut être reproduite sans écriture ni appel API :

```powershell
node suite-v6/migration/reviews/prepare-goodies-review.mjs "E:\Fable 5-Project\Meat Journey"
```

L'intégration Sol est terminée ; voir `LOT-3C-STATUS.md`.
