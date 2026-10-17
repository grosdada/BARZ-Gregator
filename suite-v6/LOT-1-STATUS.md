# Lot 1 — completed foundation

Completed on 2026-09-11, isolated from both live applications.

Implemented:

- Runtime contracts and limits for Workshop, SystemTab, Tool, Placement, and Recipe.
- Immutable V6 default registry with six configurable workshops and fixed Deck,
  Backstage, and Build tabs.
- User overlay persisted in an injected directory, with atomic writes and
  expected-revision conflict detection.
- Workshop creation, rename and move; atomic recipe/tool/placement creation;
  placement removal.
- Explicit reset preview; workshop-scoped and global default reset.
- Backup before reset, backup listing, safe restore, and recovery backup.
- Literal typed recipe compiler with no executable recipe hook.
- Local demonstration and automated tests, without provider calls.

Verified:

- V6 tests pass, including restart, two-window conflict, invalid mutation,
  backup failure, scoped/global reset, user-content preservation, and path
  traversal rejection.
- The root Barz-Gregator test command also passes with the new tests included.
- The demonstration performs no network request and removes its temporary data.

Deliberately not implemented in this lot:

- Build UI or HTTP routes.
- Atlas legacy tool/prompt migration.
- BZ Image DNA content inspection.
- Shared bridge upgrades, installer, Paint Studio changes, or Video Director
  changes.
- Cross-process storage locking; the future desktop runtime must enforce one
  owner per data directory.
