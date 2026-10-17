# Online reference libraries in BARZ Aggregator

## Product behavior

The References area gains two tabs:

- **Current references** keeps the existing drop zone and ordered `@imageN` deck.
- **Online library** opens a configured asset library without replacing the current draft.

The first configured library is:

`https://barz-ai-lib.placenta.tv/AI-Asset-Lib-online/`

Selecting an asset keeps the existing detail dialog. A new **Import ref** button, placed beside
**Download**, imports the original image into Aggregator. The imported image is stored as a normal
local resource, appended to the active reference deck, assigned the next `@imageN` position, and
never submitted to a generation provider automatically.

If the active model cannot accept another image, the asset is still saved in Assets and the UI
explains why it was not added to the deck.

## Recommended transport

Use a versioned `postMessage` handoff. Do not let the HTTPS library call the local HTTP API
directly. That approach is fragile because of CORS, Private Network Access and mixed-context
browser rules.

The library can run either inside an iframe or in a popup opened by Aggregator. The popup is the
fallback when the library disallows framing or when its login cookies cannot work in an iframe.

```js
{
  type: "barz:import-reference",
  schemaVersion: "1.0",
  source: "barz-ai-lib",
  requestId: "unique-request-id",
  asset: {
    id: "stable-library-asset-id",
    name: "asset-name.png",
    originalUrl: "https://barz-ai-lib.placenta.tv/.../original.png",
    thumbnailUrl: "https://barz-ai-lib.placenta.tv/.../thumb.jpg",
    sourcePageUrl: "https://barz-ai-lib.placenta.tv/AI-Asset-Lib-online/...",
    mimeType: "image/png"
  }
}
```

The library sends the message to `window.opener` when opened by Aggregator, otherwise to
`window.parent` when embedded. It uses the actual Aggregator origin as `targetOrigin`, supplied by
Aggregator in the library URL or through an initial handshake. It never uses `"*"`.

## Aggregator receiver

Aggregator accepts the event only when all conditions are true:

- `event.origin === "https://barz-ai-lib.placenta.tv"`;
- `event.source` is the registered library iframe or popup;
- `type` and `schemaVersion` match exactly;
- `asset.originalUrl` is HTTPS and belongs to the allowlisted library host;
- the file is not already being imported.

The browser then calls a new local endpoint:

`POST /api/reference-imports/from-library`

The server downloads the original asset, not the thumbnail. It validates every redirect, rejects
private or local destination addresses, enforces an image MIME allowlist and a size limit, and
stores the result through the same resource pipeline as `POST /api/resources`.

The response returns the new public resource record. The browser converts it with the existing
`assetToReference` path, appends it to the active reference deck when capacity permits, then calls
the existing `renderAssets()` and `renderReferences()` functions.

## Security requirements

- Allowlist exact source hosts; do not create an arbitrary remote URL fetcher.
- Accept only HTTPS source URLs.
- Validate DNS and every redirect to prevent SSRF.
- Reject HTML, SVG and executable content in the first version.
- Enforce the existing upload size limit before and during streaming.
- Sanitize the suggested filename and ignore paths from the remote site.
- Never forward library cookies, passwords or session tokens to Aggregator.
- Never send imported media to fal, Krea, HeyGen or another provider automatically.

## UX states

The remote button uses these states:

- `Import ref`
- `Importing…`
- `Imported ✓`
- `Already imported`
- `Open this library from BARZ Aggregator to import`
- `Import failed — Retry`

Aggregator shows a toast naming the assigned token, for example:

`Reference imported as @image3 and saved in Assets.`

When the deck is full:

`Image saved in Assets. This mode cannot accept another reference.`

## Acceptance tests

1. Importing a PNG adds one resource and one ordered reference without starting a generation.
2. The original asset is used even when the detail modal displays a thumbnail.
3. A second click is idempotent and does not create a duplicate.
4. A full or incompatible deck still saves the asset and shows a precise explanation.
5. Messages from any other origin are ignored.
6. Non-HTTPS, redirect-to-localhost, HTML, SVG and oversized assets are rejected.
7. Closing and reopening the library does not clear the current draft or reference order.
8. The existing disk and Assets import paths remain unchanged.
