# Prompt Atlas bridge contract

Contract version: `1.0`

Prompt Atlas and BARZ Aggregator remain separate local applications. Prompt
Atlas prepares an intention; the aggregator decides how and where to execute it.

## Endpoint

`POST http://127.0.0.1:4317/api/imports`

Requests are accepted only from local origins. Maximum body size is 1 MiB.

## Required fields

- `schemaVersion`: currently `1.0`
- `source.app`: must be `prompt-atlas`
- `mediaType`: `image`, `video`, or `music`
- `prompt`: non-empty text

## Optional fields

- `source.version`: Prompt Atlas version
- `source.module`: originating Prompt Atlas module
- `negativePrompt`: negative prompt or exclusions
- `target.modelFamily`: human-readable target family, not a guessed API ID
- `target.modelHint`: more precise model preference
- `settings.aspectRatio`: for example `16:9`
- `settings.resolution`: provider resolution selected by the aggregator, for example `1080p`
- `settings.imageSize`: named image preset selected by the aggregator
- `settings.durationSeconds`: positive number
- `settings.width` / `settings.height`: positive integers
- `settings.seed`: integer or string seed
- `references`: up to 12 reference descriptors
- `createdAt`: ISO timestamp

Unknown fields are ignored. The aggregator normalizes the payload before saving
it as a local draft. A model hint never becomes a provider API identifier: that
mapping will live in the verified provider catalog.

## Response

The server returns `201` with the normalized draft. Prompt Atlas may then open:

`http://127.0.0.1:4317/?draft=<draft-id>`

The UI selects that draft automatically.

## Current Prompt Atlas integration

Prompt Atlas A.P.G exposes a `Send to Aggregator` button beside Copy and
Export. It sends the current prompt as a draft, transfers the image/video
type, the video duration, and a human-readable target-family hint, then opens
the returned draft URL.

The bridge deliberately does not submit a paid generation. It also does not
guess provider endpoint IDs or transfer Prompt Atlas's local data-URL
references. Reference assets remain an explicit step in BARZ Aggregator.
