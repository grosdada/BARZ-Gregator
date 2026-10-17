# Mac build handoff for Codex

Build the macOS edition from this repository's sources, not from the Windows installer or its generated `payload/`. Keep Prompt Atlas and Aggregator as separate local services connected by their existing versioned bridge. The current Windows product version is `0.33.46` (`suite-v6/installer/manifest.json`).

## Scope of the 0.33.46 port

Only port this release's branding changes: the `BARZ` mark and “Beyond Artificial Reality Zone” hover/focus label in both headers, blue Aggregator accents, orange Prompt Atlas accents, and the matching cross-app switch marks. The relevant source files are `public/index.html`, `public/styles.css`, `suite-v6/apps/atlas/public/index.html`, `suite-v6/apps/atlas/public/styles.css`, and the two Aggregator CSS overlays in `suite-v6/installer/aggregator-overlays/`. Update the Mac bundle's displayed version to `0.33.46` and verify both headers and the existing bridge. Leave all other features, APIs, data formats, and credentials unchanged; do not port Windows-only NSIS/VBScript packaging code.

## Known traps

- The current installer is Windows-only: `suite-v6/installer/build-installer.mjs`, `prepare-product-payload.mjs`, and `barz-suite.nsi` bundle `node.exe`, generate VBScript launchers and `.lnk` shortcuts, and use `%APPDATA%`/`$LOCALAPPDATA`. Make a separate macOS launcher/`.app` packaging path; do not change the working Windows release flow to accommodate it.
- Both projects require Node.js 20 or newer. Run `npm ci` independently at the repository root and in `suite-v6` **on the target Mac architecture**. Do not copy Windows `node_modules`: `sharp` and `onnxruntime-node` use native binaries; verify Apple Silicon and Intel separately if both are supported.
- The repository tracks local ONNX weights through Git LFS. Install Git LFS and run `git lfs pull` before testing the image-analysis features. Check that model loading and `file://` paths work on macOS, rather than silently assuming these assets are missing.
- Put mutable state and user-provided API credentials in macOS user data (for example `~/Library/Application Support/BARZ Suite 6`), outside the `.app` bundle and outside Git. Local secrets, runtime state, generated media, installer payload, and `node_modules` are intentionally excluded from this repository. Never hard-code or publish a key.
- Aggregator normally serves `127.0.0.1:4317`; Atlas serves `127.0.0.1:4326`. Preserve their bridge/origin behavior and test launching both, opening the Suite shell, transferring a prompt/reference, and relaunching without losing settings.
- If distributing a downloadable `.app`/DMG, verify permissions, Gatekeeper behavior, code signing and notarization. No macOS package or real-device validation is claimed by this handoff.

Start with `npm start` at the root and `npm run start:build` in `suite-v6` to validate the two services before packaging. Run both test suites, then verify the packaged app itself on a clean Mac account. The Windows installer is published separately as a GitHub Release asset, not committed into the source tree.
