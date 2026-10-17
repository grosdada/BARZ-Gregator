# Lot 2 — Build UI and component-installer proof

Completed on 2026-09-11 without modifying the running Atlas V5 or
Barz-Gregator application.

Implemented:

- A loopback-only Prompt Atlas Build prototype with a same-origin JSON API.
- Build navigation with fixed Deck/Backstage/Build positions.
- Workshop selection, creation, rename, accessible move controls, and drag
  reorder backed by expected-revision transactions.
- Reset preview, scoped/global reset, backup list, and backup restore UI.
- A synthetic built-in cinematic-shot recipe and a server-side compiler tester.
- Creation of user prompt recipes with one text field, literal templates, media
  type, workshop placement, and persistence.
- Restrictive CSP, frame denial, local Host validation, same-origin mutation
  checks, request-size limits, and text-only dynamic rendering.
- NSIS sections for mandatory core and independently selectable Atlas and
  Aggregator payloads, with neither-app selection rejected.
- A platform-neutral component stager and a successfully compiled Windows
  component-proof executable.

Verified:

- Automated tests cover the API, navigation invariants, user recipe compilation,
  revision conflicts, origin refusal, reset backups, all component selections,
  and NSIS source references.
- Manual browser review selected the pilot recipe and compiled it successfully.
  The review caught and fixed a hidden-panel layout defect.
- The full Barz-Gregator regression gate passes: 92 tests, 0 failures.

Still intentionally absent:

- Navigation into the real legacy Atlas tools; this is a standalone Build slice.
- Editing/deleting arbitrary recipe fields, conditional recipe logic, icons, or
  legacy prompt conversion.
- Send to Aggregator from the new runtime; the shared bridge is a later lot.
- Named Atlas setups and user-created version checkpoints are implemented by
  the completed follow-up lot 2B; see `LOT-2B-STATUS.md`.
- A production desktop payload and install/update/uninstall test matrix. The compiled
  executable contains marker payloads only and must not be treated as the V6
  installer.
