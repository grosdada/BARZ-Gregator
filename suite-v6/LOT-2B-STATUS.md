# Lot 2B — Named Prompt Atlas setups and versions

Completed on 2026-09-11 in the isolated V6 prototype. The running Prompt Atlas
V5 and Barz-Gregator applications were not modified.

Implemented:

- Multiple named Prompt Atlas setups, with one active setup and autosaved
  registry content isolated per setup.
- Creation of a blank setup, duplication of any existing setup, switching, and
  rename operations with metadata revision checks.
- A second context check on every registry mutation so a stale window cannot
  write into a setup selected by another window.
- Named immutable version checkpoints for the active setup.
- Safe restore that first creates a visible `Avant restauration` checkpoint and
  also retains the lower-level technical registry backup.
- Build UI controls for setup selection, creation, duplication, rename, version
  save, history, and restore.
- First-run migration that copies a valid legacy V6 root overlay into the
  default `Mon Atlas` setup without moving or deleting the source file.
- Separate storage for setup metadata, per-setup overlays, creative versions,
  and technical backups. API keys, media, generation history, and application
  project files are outside this snapshot boundary.

Verified:

- Automated tests cover persistence after restart, blank/duplicate isolation,
  legacy-overlay migration, stale setup context refusal, version restore and
  recovery checkpoints, traversal rejection, and API flows.
- Manual browser review created a second setup and a named version, then opened
  its history and completed a restore successfully.
- Responsive review caught and removed a horizontal overflow at compact desktop
  widths.
- The isolated V6 suite passes 33 tests and the full workspace regression gate
  passes 99 tests, with no failures.

Intentionally deferred:

- Setup deletion/trash and import/export archives.
- Cross-device synchronization and account-level storage.
- Merge tooling for conflicting user edits across processes or machines.
- Migration of the real Prompt Atlas V5 prompt banks; this begins in lot 3A.
