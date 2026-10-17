# Point de passage — Sol High

État au 11 septembre 2026 : les lots 1 à 3C sont livrés. Le prochain travail est
**4A — récupération complète des setups**, défini dans
[le contrat Build/bibliothèques](BUILD-LIBRARIES-HANDOFF-SOL.md).
Le plan de fondation ci-dessous est conservé comme historique ; ne pas le rejouer.

## Consigne de travail

Lire ce dossier et les consignes locales du dépôt. L'utilisateur exige une alerte avant de repasser de modèle ; ne pas entreprendre tous les lots successivement sans checkpoint. Les applications actuellement en service et les changements utilisateur doivent être préservés. Aucun commit/push, déploiement, achat, génération payante ou installation système n'est autorisé par ce document.

## Premier lot, seul lot à exécuter au prochain « go »

Créer sous `suite-v6/` les fondations du registre, isolées des applications live :

1. Définir les contrats de Workshop, SystemTab, Tool, Placement et Recipe à partir des exemples ; validation runtime et erreurs lisibles, limites de champs/payloads documentées.
2. Créer un registre intégré de départ contenant les six ateliers configurables et les trois onglets système, en préservant les IDs. Ne pas déplacer encore les pages HTML ou modifier le serveur Atlas en service.
3. Implémenter les mutations transactionnelles avec révision attendue et injection du répertoire de stockage pour les tests. Garantir les IDs/références, unicité des placements et contraintes des onglets fixes.
4. Implémenter l'overlay utilisateur, les sauvegardes et la restauration ciblée/globale définie dans ARCHITECTURE. Tester panne de sauvegarde, conflit concurrent, redémarrage, custom content conservé.
5. Implémenter une recette minimale de texte avec interpolation littérale typée, sans eval ; tester les valeurs manquantes, Unicode, contenu HTML affiché comme texte et absence d'exécution de contenu.
6. Ajouter des tests node:test et une démonstration locale sans connecteur fournisseur. Les exemples de ce dossier sont de nouvelles fixtures synthétiques, pas des prompts hérités déjà migrés.

Critère de fin : tests verts, changements isolés, revue de diff, compte-rendu de ce qui fonctionne et de ce qui reste simulé. **S'arrêter et demander le prochain lot**, avec quota disponible. Ne pas enchaîner directement la migration de toutes les banques, l'UI Build ou l'éditeur vidéo.

## Lots suivants et effort relatif

Ces tailles sont un classement du risque après lecture structurelle, pas des heures garanties ni des pourcentages de quota.

| Lot | Contenu | Modèle / risque |
| --- | --- | --- |
| 1 | Contrats, registre, defaults, tests isolés | Sol High ; moyen, bien borné |
| 2 | UI Build + pilote recette + preuve installateur à composants réels | Sol High ; moyen ; Astra si contrainte runtime non résolue |
| 2B | Setups nommés, checkpoints utilisateur et sélecteur Build | Sol High ; moyen, stockage sensible ; à faire avant la migration massive |
| 3 | Extraction de tous les prompts hors DNA, couverture, revue et migration par familles | Sol pour extraction/tests ; checkpoint Astra pour lecture/revue ; volume important |
| 4 | Pont partagé par adaptateurs, références, migration des données et packs | Sol High ; élevé côté non-perte de données ; revue Astra ciblée |
| 5 | Paint : reproduction/profilage puis corrections mesurées | Sol prépare mesures ; Astra choisit les corrections délicates ; moyen |
| 6 | Montage : spike clock/export, modèle de projet et migration v2 | Astra pour conception/validation ciblée ; Sol pour exécution découpée ; risque le plus élevé |
| 7 | Installateur complet, upgrades/rollback, recette des deux applications | Sol High ; moyen à élevé ; Astra pour revue finale ciblée |

Ne pas réserver l'installation à la fin : la preuve du lot 2 doit déjà installer correctement des composants minimaux. Ne pas attendre le lot 7 pour tester la récupération des données : dès le premier atelier migré, valider son export/import.

## Alertes et maîtrise de consommation

- Astra est utile aux frontières ambiguës : architecture, interprétation des générateurs complexes, diagnostic du moteur de montage et revue de migration. Sol High convient aux contrats arrêtés, adaptateurs répétitifs et tests.
- Avant chaque lot, lire le quota réel via l'outil Codex ; après le lot, relever le nouveau chiffre. Le quota est partagé avec les autres tâches et peut être arrondi/différé. Ne pas attribuer automatiquement tout delta à ce lot.
- Aucun taux de conversion fiable « nombre de fichiers → tokens → pourcentage de forfait ». Ne pas reconduire l'ancienne estimation de 100–170 % hebdomadaire.
- Le prochain checkpoint, et non le budget restant à zéro, déclenche l'alerte. Si une hypothèse architecturale casse, arrêter le lot avec reproduction minimale et question ciblée au lieu d'improviser une grande refonte.
- Message de bascule : **« ⚠️ Passe en Sol High avant de continuer : [prochain lot précis]. »** Pour un besoin Astra : **« ⚠️ Revue Astra conseillée avant ce point : [risque et preuve]. »** Attendre le choix utilisateur.
- Un crédit de reset existe au dernier relevé, mais ne doit pas être consommé sans autorisation explicite. Son existence n'est pas une garantie que toute la V6 rentrera dans le budget.

## Ce qui n'est pas encore réalisé

Pas d'UI Build V6 ; pas de banques converties ; pas de revue sémantique exhaustive ; pas de nouvel installateur ; pas d'optimisation Paint ou montage ; pas de migration des données ou nouvelles références du pont. Le code de production reste dans ses versions actuelles. Seuls le dossier de conception et son diagnostic ont été ajoutés pendant la phase Astra.
