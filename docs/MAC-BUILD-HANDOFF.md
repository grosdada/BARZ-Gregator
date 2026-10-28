# Mac build handoff for Codex

Build the macOS edition from this repository's sources, not from the Windows installer or its generated `payload/`. Keep Prompt Atlas and Aggregator as separate local services connected by their existing versioned bridge. The current Windows product version is `0.33.50` (`suite-v6/installer/manifest.json`).

## Scope of the 0.33.50 port

If 0.33.49 is already on Mac, apply only this delta. In Video Multi Framing, add the reference source menu (PC, Aggregator Assets, online Library), 10 MB encoded image limit, double-click ×4 preview, editable AI subject/context descriptions, 1–30 still count and the Multiview video tab with up to 60 requested hard-cut shots on Seedance 2.5/Wan 3.0. The centered, colored GO ACTION control and its busy state must be shared by Multi still image, Video sequence and Multiview. Filling stills must populate every selected still, including 11–30. Exporting the stills creates image drafts in Aggregator's visible image queue; it must not submit paid jobs automatically. Video sequence drafts must transfer prompts longer than the editor's 2,500-character advisory limit together with their uploaded reference images. The fal catalog now includes WAN 3 text-to-video, image-to-video and reference-to-video as a separate family from Wan Motion. Preserve the existing secured reference import path and same-origin checks for the online Library popup. Test a batch, a video draft over 2,500 characters with a real reference, and a manually edited description on Mac.

Port only the source/UI/API delta; the Windows installer and generated payload remain Windows-specific. A video model may not obey every requested hard cut, so do not present the 60-shot plan as a guaranteed rendered outcome. Update the Mac bundle display version to `0.33.50`.

## Scope of the 0.33.49 port

If 0.33.48 is already on Mac, apply only this delta: rename the shared "Atlas Advisor" control, panel title and ask button to "Barz Advisor"/"Ask Barz" in both modules. Add a compact "MAJ" control immediately to the right of the Advisor in Aggregator. It checks the latest release, shows current/latest versions and explicit install action, and keeps the existing provider/model selector unchanged. The Windows backend in `src/update-manager.js` downloads the release installer into user data, verifies GitHub's SHA-256 and file size, then starts `src/update-install.ps1` to run NSIS, restart BARZ and expose progress. **Do not port the Windows `.exe` or PowerShell helper to Mac.** Implement a separate macOS path only when a signed macOS release asset exists; until then, show the version check/release link with automatic install unavailable. Keep update downloads and mutable state outside the `.app` bundle and never print credentials.

If 0.33.48 is not yet on Mac, also carry over that release's navigation order (Images, Videos, Director), compact model-name trigger without chevron, blue/grey job progress, muted blue and beige light theme across Assets/Spending/API/LoRA Lab, thin history and mode-switch borders, and working Blocking Studio Environment Reset. If 0.33.47 is also absent, carry over its collapsible histories with Latest 30 / All / calendar, blue/orange Advisor styling, inactive Image Slicer Pro outline, and prompt-only "Send to prompt" behavior.

The proposed Q-Builder/ComfyUI "Cloud / Local" video mode is architecture work only in this release (`docs/LOCAL-QBUILDER-INTEGRATION.md`); do not expose a nonfunctional local-render button on Mac. Leave unrelated tools, APIs, data formats, and credentials untouched. Do not port Windows-only NSIS/VBScript packaging code.

## Previous 0.33.46 branding handoff (already completed; do not repeat)

The previous release changed the `BARZ` mark and “Beyond Artificial Reality Zone” hover/focus label in both headers, blue Aggregator accents, orange Prompt Atlas accents, and the cross-app switch marks. This paragraph is historical context only: do not rework that branding while porting 0.33.49.

## Known traps

- The current installer is Windows-only: `suite-v6/installer/build-installer.mjs`, `prepare-product-payload.mjs`, and `barz-suite.nsi` bundle `node.exe`, generate VBScript launchers and `.lnk` shortcuts, and use `%APPDATA%`/`$LOCALAPPDATA`. Make a separate macOS launcher/`.app` packaging path; do not change the working Windows release flow to accommodate it.
- Both projects require Node.js 20 or newer. Run `npm ci` independently at the repository root and in `suite-v6` **on the target Mac architecture**. Do not copy Windows `node_modules`: `sharp` and `onnxruntime-node` use native binaries; verify Apple Silicon and Intel separately if both are supported.
- The repository tracks local ONNX weights through Git LFS. Install Git LFS and run `git lfs pull` before testing the image-analysis features. Check that model loading and `file://` paths work on macOS, rather than silently assuming these assets are missing.
- Put mutable state and user-provided API credentials in macOS user data (for example `~/Library/Application Support/BARZ Suite 6`), outside the `.app` bundle and outside Git. Local secrets, runtime state, generated media, installer payload, and `node_modules` are intentionally excluded from this repository. Never hard-code or publish a key.
- Aggregator normally serves `127.0.0.1:4317`; Atlas serves `127.0.0.1:4326`. Preserve their bridge/origin behavior and test launching both, opening the Suite shell, transferring a prompt/reference, and relaunching without losing settings.
- If distributing a downloadable `.app`/DMG, verify permissions, Gatekeeper behavior, code signing and notarization. No macOS package or real-device validation is claimed by this handoff.

Start with `npm start` at the root and `npm run start:build` in `suite-v6` to validate the two services before packaging. Run both test suites, then verify the packaged app itself on a clean Mac account. The Windows installer is published separately as a GitHub Release asset, not committed into the source tree.
