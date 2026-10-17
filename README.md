# BARZ Aggregator

Local-first generation router for images, videos and music. The current safe
foundation contains the application shell, local persistence, a versioned Prompt
Atlas bridge, verified provider metadata and a confirmed generation queue.

fal and HeyGen are integrated provider connectors. The app can verify a key, read the account
balance, and verify exact model IDs and current pricing. The main Generate button
shows the estimated cost; a separate confirmation is mandatory before a paid
request can reach a provider. Completed generations remain visible in the local history,
where their prompt, settings and original media can be reviewed or downloaded.
The detail view can also restore a completed job into the generation launcher with
its model and parameters, without submitting a new request.
The Assets view separates generated media from locally uploaded resources. Both
categories share media filters, persistent collections, individual renaming and
ZIP export in JPG, PNG, WEBM or original format when compatible with the selection.
Collections can be created from the library heading. Their context menu supports
renaming and guarded deletion; deleting a collection returns its media to
Unfiled instead of deleting the underlying files.
Image assets can be sent individually or as a selection to the active launcher’s
reference slot. Each media launcher keeps its own references; compatible fal
schemas receive the ordered references. Local PNG/JPG/WebP images (up to 30 MB)
are uploaded to fal only after the user confirms generation; quotes stay local.
The transfer keeps the account key server-side and uses 24-hour fal storage.
Named reference sets persist stable asset identities and their order independently
from collections. Each saved reference also receives a small local preview. If its
source asset is later removed, the set marks it as `Missing` while retaining that
preview for identification.
References are labelled `@image1`, `@image2`, and so on. Clicking a label inserts it
at the prompt cursor; holding a thumbnail reveals the drag handle and enables manual
reordering. No automatic sorting changes the sequence.
Reference tokens are highlighted in the prompt without changing its plain-text value.
Reordering uses a short, reduced-motion-aware genie transition to clarify the move.
Local resources open their original only on double-click. They can be deleted from
an image context menu or as a selected group, always behind a dedicated warning.
Deleting a resource does not delete saved reference previews.

## Run

```powershell
npm start
```

Open `http://127.0.0.1:4317`.

For a macOS build, see [the Codex Mac handoff](docs/MAC-BUILD-HANDOFF.md).

## Model pack and generation feedback (0.22.1)

HeyGen Video 1 is available in text-to-video, image-to-video and multi-reference
modes. It supports 5–15 second clips, 480p, 768p or 2K output, prompt enhancement,
seed control, and mixed image/video/audio references. Local compatible references
are uploaded only after confirmation. The launcher converts BARZ `@imageN`,
`@videoN`, and `@audioN` references to the provider syntax without changing the
saved prompt. 2K is limited to 16:9 and 9:16 and is quoted at three times the 768p
rate. Pricing is estimated from the public list price; promotional billing can be lower.

Krea Flux.1 Dev is available for image generation with a LoRA mixer. Connect a
Krea API key in **Fournisseurs**, choose **Krea Flux.1 Dev + LoRA**, then import
the account library. Several compatible styles can be enabled at once with an
independent weight for each. Compatibility comes from Krea's `models` metadata:
legacy Krea1 styles remain selectable when Krea still declares them Flux-compatible.
Krea2 styles are excluded during import and again in the browser.

The Music launcher includes ACE-Step for prompt composition, explicit lyrics and
audio remix, Stable Audio 2.5 for text-to-audio and audio-to-audio, and CassetteAI
for longer tracks. Duration, instrumental mode, lyrics, source style, remix mode,
seed and audio references are exposed only where supported by each live schema.

FLUX.2 Turbo, Seedream 5 Lite, all three Nano Banana generations (text and edit),
Ideogram 4 (fast text and image-to-image), FLUX 3 Draft (text and image), FLUX 3
image-to-video, MiniMax H3 and MiniMax H3 Max (text, first/last frame, and
multi-reference) are integrated alongside Z-Image Turbo (text and image-to-image)
and the existing models.
The launcher first selects a model family, then offers only that family's compatible
generation modes.
Durations, resolutions, batch size, audio, quality, output format, strength and
seed are shown when supported. H3 also exposes its prompt-expansion mode while
keeping the provider safety checker enabled. Recreate and saved drafts retain these settings.
Compatible models expose seed through a compact dice control. Active jobs show
a progress bar: an exact percentage is used when fal provides one; otherwise the
UI marks its phase-and-runtime estimate with `≈` before reaching 100% on completion.

The button and server share the same estimator. Prices include resolution and
quality multipliers; H3 uses fal's live per-second price. H3 Max applies its
480P/768P/1080P live tiers. Its multi-reference confirmation also warns about
fal's possible reference-token surcharge beyond the included allowance.
Ideogram prompt expansion is disabled to use the prompt as entered and avoid
unquoted expansion fees. See `docs/model-pack.md` for pricing sources and limits.

MiniMax H3 Max Director now has its own live workspace. It uses fal's realtime
WebRTC transport, accepts live prompt changes, can preload the first two images
from the Video reference deck, and also accepts drag-and-drop, disk imports, or
selection from Assets directly in the Director screen. It records the received
stream locally and saves the result in Assets > Resources. Starting a session requires a separate confirmation
that shows fal's $1.20 minimum and the selected local auto-stop duration.

The **Dépenses** rail view summarizes completed local generations on a calendar.
It groups them by day, month, or year and links every line to the existing
generation detail dialog. Failed, cancelled, and unconfirmed jobs are excluded;
the displayed figures remain estimates based on the price confirmed before each
generation. The same view refreshes the live fal credit balance when the stored
key permits account billing access and links to fal's official credit recharge page.

Seedance was retired from the launcher after fal's reference endpoint repeatedly
classified synthetic photorealistic characters as possible real-person likenesses.
Existing Seedance jobs remain visible in history.

`node scripts/install-model-pack.mjs` verifies and adds the model-pack endpoints
using the running local server. It never submits a generation. `npm test` runs
the offline tests; `node scripts/check-model-pack.mjs` checks local HTTP previews
against the installed schemas without a paid request.

## Prompt Atlas bridge

Prompt Atlas will send a structured payload to:

```text
POST http://127.0.0.1:4317/api/imports
```

The current contract is documented in `docs/PROMPT_ATLAS_BRIDGE.md` and an
example lives in `examples/prompt-atlas-payload.v1.json`.

The system boundaries and spending safeguards are documented in
`docs/ARCHITECTURE.md`.

## Local data

Drafts, activity and resource metadata are stored in `data/state.local.json`;
uploaded files remain in `data/uploads/`. Provider secrets are
encrypted at rest in `data/secrets.local.json` using a local vault key. The
entire `data/` folder is ignored by Git, and API keys are never returned to the
browser after storage.
