# Lot 4 — bibliothèques éditables dans Build

Passe Astra terminée le 11 septembre 2026, sur la base Atlas 0.4.0.
Implémentation Sol terminée dans Atlas 0.6.0. La migration du setup actif vers
le schéma 1.1 reste à déclencher par le redémarrage contrôlé du serveur local.

Contrat pour la suite :
[BUILD-LIBRARIES-HANDOFF-SOL.md](../docs/v6/BUILD-LIBRARIES-HANDOFF-SOL.md).

Décisions : bibliothèques et modifications personnelles dans le registre du
setup ; saisies dans les réglages d'outils ; compilation depuis le catalogue
effectif ; IDs stables ; prompts masqués récupérables ; reset préservant les
créations personnelles ; checkpoint complet et récupération des écritures composites.

Sonde exécutée : `node suite-v6/migration/reviews/audit-build-library.mjs`.
Les trois défauts mesurés au départ sont corrigés :

- la restauration d'un backup remet aussi les détails Goodies ;
- la recherche VHS actualise la catégorie active et sa commande de copie ;
- une restauration interrompue reprend son commit composite au redémarrage.

Le lot 4 ajoute les tests de régression correspondants, la migration 1.0 → 1.1,
le modèle de bibliothèques et le parcours UI/API générique. Aucun appel fournisseur.

Ordre réalisé sous Sol High :

1. 4A : checkpoints complets, commits récupérables, portée des resets et flush.
2. 4B : schéma/migration, bibliothèques, overrides et API générique.
3. 4C : éditeur Build et renderer commun, contrôle utilisateur de bout en bout.

Voir [LOT-4-STATUS.md](LOT-4-STATUS.md) pour le périmètre livré et sa validation.
