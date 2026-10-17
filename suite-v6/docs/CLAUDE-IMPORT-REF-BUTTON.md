# Instruction for Claude — add “Import ref” to BARZ AI Asset Library

Implement this change in the source code of the online library at
`https://barz-ai-lib.placenta.tv/AI-Asset-Lib-online/`.

The asset detail modal already contains **Previous**, **Next**, **Download**, **Original image**
and **Close**. Add a new primary button labelled **Import ref** immediately beside **Download**.
Do not replace or modify the existing download behavior.

## Required behavior

1. The button is visible only when an asset with a usable original image is selected.
2. On click, build this exact versioned message:

```js
const message = {
  type: "barz:import-reference",
  schemaVersion: "1.0",
  source: "barz-ai-lib",
  requestId: crypto.randomUUID(),
  asset: {
    id: selectedAsset.id,
    name: selectedAsset.originalName || selectedAsset.name,
    originalUrl: selectedAsset.originalUrl,
    thumbnailUrl: selectedAsset.thumbnailUrl || "",
    sourcePageUrl: window.location.href,
    mimeType: selectedAsset.mimeType || ""
  }
};
```

3. `originalUrl` points to the original downloadable image, never the displayed thumbnail.
4. Send to `window.opener` when the library was opened by BARZ Aggregator. Otherwise send to
   `window.parent` when the library is embedded.
5. Use the Aggregator origin supplied by a handshake or an `aggregatorOrigin` URL parameter as
   `targetOrigin`. Validate it against loopback origins only (`http://127.0.0.1:<port>` or
   `http://localhost:<port>`). Never use `"*"`.
6. Listen for this acknowledgement shape and match it by `requestId`:

```js
{
  type: "barz:import-reference-result",
  schemaVersion: "1.0",
  requestId: "...",
  ok: true,
  referenceTag: "@image3",
  savedToAssets: true,
  message: "Reference imported as @image3 and saved in Assets."
}
```

## Button states

- idle: `Import ref`
- waiting: `Importing…` and disabled
- success: `Imported ✓`
- duplicate: `Already imported`
- no valid receiver: `Open this library from BARZ Aggregator to import`
- failure: `Import failed — Retry`

Restore the idle state when Previous or Next selects another asset.

## Constraints

- Do not fetch or upload the image from the library page itself.
- Do not call `http://127.0.0.1` from the HTTPS page.
- Do not send login cookies, credentials, API keys or private library metadata.
- Do not start a generation.
- Do not change the Download, Original image, Previous, Next or Close controls.
- Keep the existing responsive modal layout and keyboard navigation.
- Escape all text inserted in the DOM and keep the button as `type="button"`.

## Tests to add

- The message contains the selected asset original URL, filename, stable ID and schema version.
- The thumbnail URL is never substituted for a missing original URL.
- The exact Aggregator origin is used and wildcard target origins are rejected.
- Acknowledgements update only the matching request.
- Double-clicking while waiting emits only one message.
- Switching assets resets the button state.
- Without an opener or parent handshake, no message is emitted and the explanatory state appears.

Before coding, locate the real detail-modal source instead of editing generated deployment files.
After coding, report the modified source files, test command and deployment step. Do not deploy or
change production data unless explicitly authorized.
