# Lot 4 — bibliothèques modulaires et récupération

État au 11 septembre 2026 : implémenté et validé dans Prompt Atlas V6 0.6.0.

## 4A — sauvegarde fiable

- Les versions et backups couvrent le registre et les réglages de tous les outils.
- Les resets et restaurations sont des commits composites idempotents, repris au
  démarrage après une interruption d'écriture.
- Les révisions du registre, du setup et des outils protègent les modifications
  faites depuis plusieurs fenêtres.
- Un reset suit l'emplacement effectif d'un outil déplacé et conserve les créations
  personnelles.

## 4B — modèle générique

- Registre 1.1 avec migration atomique depuis 1.0 et backup préalable.
- Bibliothèques, catégories, cartes, recettes et overrides sont validés par contrat.
- BZ Goodies est la première bibliothèque intégrée migrée ; Image DNA reste exclu.
- API unique pour créer, renommer, éditer, dupliquer, masquer, restaurer, réordonner
  et compiler n'importe quelle bibliothèque.

## 4C — expérience Build

- Création d'une bibliothèque personnelle dans l'atelier sélectionné.
- Étagère à trois niveaux : bibliothèque, catégories, cartes.
- Édition du média et du template, avec insertion explicite de `{{scene}}`.
- Réorganisation des catégories et cartes, duplication, masquage et retour à
  l'original pour les cartes intégrées.
- Renderer commun dans les ateliers : recherche, détails persistants par setup,
  copie par carte/catégorie/bibliothèque et envoi vers l'agrégateur.

## Validation

- `npm test` : 70 tests réussis.
- Test navigateur sur données temporaires : création d'une bibliothèque et d'une
  carte, modification, compilation et autosauvegarde du détail réussies.
- Aucune génération fournisseur et aucun coût API pendant l'implémentation.
