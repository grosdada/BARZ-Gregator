# Protocole de revue sémantique Astra

La revue porte uniquement sur le paquet demandé. Le corpus BZ Image DNA est hors
périmètre. Le texte anglais historique est conservé tel quel, sauf correction
délibérée, justifiée et enregistrée.

Pour chaque entrée du tableau `items` du paquet :

1. choisir exactement une action dans `preserve`, `correct` ou
   `exclude-non-prompt` ;
2. utiliser `preserve` si le fragment peut contribuer tel quel à un prompt ;
3. utiliser `correct` uniquement pour une faute, une ambiguïté accidentelle ou une
   formulation réellement cassée ; fournir alors `correctedValue` et `reason` ;
4. utiliser `exclude-non-prompt` pour un libellé d'interface, un identifiant runtime
   ou du code qui a traversé la présélection ; fournir `reason` ;
5. ne jamais homogénéiser silencieusement le ton, la ponctuation ou le vocabulaire.

Le fichier résultat garde `bundleId`, `bundleDigest`, `reviewerModel` et chaque ID
du gabarit. Quand toutes les décisions sont prises, son `status` devient
`reviewed`, puis il doit passer :

```text
npm run validate:astra-review -- <bundle.json> <review.json>
```

La validation refuse tout paquet modifié depuis la revue et toute décision absente,
dupliquée, inconnue ou insuffisamment justifiée.
