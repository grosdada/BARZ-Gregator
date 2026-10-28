# BARZ Suite 6 installer

`barz-suite.nsi` packages a private Node runtime and two optional applications:
Prompt Atlas and Barz-Gregator. Both are selected by default; the components
page refuses to continue with neither application selected.

`prepare-product-payload.mjs` rebuilds the payload from the current working tree.
The installed launchers start each local server without a console window and
open the corresponding browser page. Application data lives under
`%APPDATA%\BARZ Suite 6` and is intentionally preserved by uninstall.

Example staging command:

```powershell
node installer/stage-components.mjs --components=atlas,aggregator --output=C:\path\to\empty\staging
```

The component proof was compiled successfully with the MakeNSIS binary already
present in electron-builder's local cache:

```powershell
npm run build:installer
```

This creates `BARZ-Suite-6-Setup-0.33.50.exe`. If a previous BARZ runtime is still
active, the installer stops only that installed runtime before replacing it. Close
the local applications before
uninstalling so Windows can remove the bundled runtime immediately.
