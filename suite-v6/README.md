# BARZ Suite V6 — isolated foundation

This directory contains the tested V6 registry foundation. It does not replace,
start, or modify either live application.

Commands:

```powershell
cd suite-v6
npm test
npm run demo
npm run start:build
npm run build:installer
```

The Build app opens at `http://127.0.0.1:4326/`. Its registry source of
truth is server-side JSON in an injected data directory. Built-in defaults and
user changes are stored separately. The reviewed libraries and tools available
in the V6 runtime include BZ Enhancer, BZ Goodies, Imperfection Engine, Beauty
Studio, Realism Forge, Cinematic Shoot, Acting Gen, FACS Sheet Generator,
BZ Board, BZ Camera Suite (VEO Precision), BZ Sheet, BZ Designer, Knolling Board
and BZ Multishot. They can send drafts to BARZ Aggregator without starting a paid
generation. Prompt Atlas is currently at runtime milestone 0.28.0. The Windows
installer packages Prompt Atlas and Barz-Gregator as optional components with a
shared, private Node runtime.

Editable prompt libraries are implemented through one generic model, API,
Build editor and runtime renderer. Built-in entries can be edited, hidden and
restored; personal libraries, categories and cards can be created and reordered.
Named setups and versions capture both the registry and per-tool state. See the
[lot 4 status](LOT-4-STATUS.md).

The reproducible V5 prompt-review preparation is documented in
[lot 5 status](LOT-5-STATUS.md). It produces 23 deduplicated Astra packets and a
decision index covering every literal while keeping BZ Image DNA out of the
corpus.

Limits enforced at runtime:

- Registry document: 2 MiB JSON maximum.
- Recipe document: 256 KiB JSON maximum.
- 64 workshops, 512 tools, 2,048 placements, 512 recipes, 512 libraries.
- IDs: 1–80 lowercase ASCII characters (`a-z`, digits, `_`, `-`).
- Titles: 1–120 characters; prompt text/template: 50,000 characters.
- Recipes: 64 fields and 16 outputs maximum.

All mutations require the caller's expected revision. Mutations from multiple
windows in the same desktop process are serialized. The prototype HTTP layer maps
`RegistryConflictError` to status 409. Cross-process locking belongs to the
desktop lifecycle lot: only one suite process may own a data directory.

The recipe compiler treats all field values as literal strings and provides no
executable hook. The Build UI renders prompt output with `textContent`, never
dynamic `innerHTML`.
