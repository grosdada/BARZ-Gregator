# Prompt Atlas V6 — dossier de passage

État au 11 septembre 2026 : architecture proposée après inspection du code. Les lots 1, 2, 2B et l'extraction mécanique 3A sont isolés sous `suite-v6/`, sans modification de l'application en service. Voir les rapports du [lot 1](../../suite-v6/LOT-1-STATUS.md), du [lot 2](../../suite-v6/LOT-2-STATUS.md), des [setups/versionnements du lot 2B](../../suite-v6/LOT-2B-STATUS.md) et de [l'extraction du lot 3A](../../suite-v6/LOT-3A-STATUS.md). Les décisions ci-dessous servent de contrat pour les prochains lots ; elles ne prétendent pas garantir la durée totale du chantier.

## Périmètre retenu

Une suite locale contenant deux applications autonomes : Prompt Atlas prépare les prompts et fournit ses outils créatifs ; Barz-Gregator reçoit les brouillons et gère la génération média. Une installation commune avec choix des composants. Aucune génération payante déclenchée par le pont.

Dans Atlas, six ateliers configurables et trois onglets système fixes : Deck, Backstage et le nouveau Build. Build permet de créer, renommer, déplacer les ateliers, de gérer leurs contenus et d'ajouter des recettes de prompts. Les outils logiciels restent des outils codés, raccordés par des adaptateurs.

## Documents

- [Architecture et décisions](ARCHITECTURE.md)
- [Migration, inventaire et points de contrôle](MIGRATION.md)
- [Passage à Sol et discipline de budget](HANDOFF-SOL.md)
- [Exemple de configuration Build](registry.example.json)
- [Exemple de recette sans code](recipe.example.json)

Les JSON sont des exemples de contrats à valider lors du premier lot, pas des configurations déjà acceptées par les applications actuelles.

## Résultat de l'audit structurel

Le registre actuel comporte 27 entrées pour 26 identifiants distincts : Image Analyzer apparaît deux fois. Les ateliers sont codés dans le shell, les contenus mêlent HTML, banques, assembleurs, appels IA, canvas et outils vidéo. Copier les onglets dans un tableau JSON ne suffirait donc pas à rendre toute l'application modulaire.

Le diagnostic reproductible est `node scripts/audit-atlas-v6.mjs` depuis la racine de Barz-Gregator. Il lit le registre et les sources enregistrées, sans exécuter les scripts. Il ignore le contenu de BZ Image DNA. Ses empreintes portent sur les sources lues, non sur des banques sémantiquement validées. Les références de fichiers natives désignent le fichier hôte complet.

**La revue exhaustive de tous les prompts n'est pas terminée.** Elle demeure une condition avant migration définitive, avec une liste de couverture explicite et une revue Astra par lots. BZ Image DNA est exclu à la demande de l'utilisateur ; son enveloppe de bibliothèque sera conçue sans charger son corpus.

## Protection de l'existant

Ne pas déplacer ni écraser `E:\Fable 5-Project\Meat Journey`, l'installation Prompt Atlas 5, les données actuelles ou les applications en service. Construire la V6 dans un espace séparé, copier les données sur consentement explicite et vérifier les copies. Ne pas lancer de génération, installer un paquet système, publier ni acheter de service dans ce lot d'architecture.

## Point budget

Le compteur partagé Codex indiquait 52 % utilisés au début de cette phase et 53 % au point de contrôle suivant. Cette différence arrondie n'est pas un compteur de tokens Astra et ne prédit pas le coût de la V6. Le solde hebdomadaire se contrôle avant chaque lot ; aucun reset n'est consommé sans demande explicite.

Passage prévu : **Sol High pour le premier lot de fondations**, puis revue Astra ciblée avant la migration des familles de prompts et avant la refonte du montage. Ne pas exécuter tout le dossier d'un seul bloc.
