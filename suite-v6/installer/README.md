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

This creates `BARZ-Suite-6-Setup-0.33.57.exe`. If a previous BARZ runtime is still
active, the installer stops only that installed runtime before replacing it. Close
the local applications before
uninstalling so Windows can remove the bundled runtime immediately.

The optional slideshow reads local images from `installer/diaporama` during the
build. `generate-slideshow.mjs` makes small banners and full-size installation
posters. The native `slideshow-helper.cs` is compiled as a windowless Windows
helper and updates the NSIS image every 2.5 seconds. During file extraction it
expands the picture below the installation progress bar, then restores the
compact banner when the Next button becomes available. Only generated BMPs are
embedded in the executable and extracted to its temporary directory. Source
images and generated banners are ignored by Git. Silent installs skip the
slideshow.
