# A16 — Image Analyser parity checklist

Source audited before implementation:

- `Prompt Atlas 4.5/public/index.html` — legacy Image Analyzer markup
- `Prompt Atlas 4.5/public/js/app.js` — import, analysis, copy and routing behavior
- `Prompt Atlas 4.5/server.js` — multi-provider vision contract

## Preserved controls

- [x] Model selector
- [x] Image drop zone
- [x] `Import IMG` → **Importer une image**
- [x] `Clear`
- [x] `Analyse` → **Analyser**
- [x] Editable analysis prompt
- [x] `Copy` → **Copier**
- [x] Target selector
- [x] `Send to`
- [x] A.P.G Intent destination
- [x] CCP Scene Description destination
- [x] Video Multi Framing destination

## V6 additions

- Local key configuration for OpenAI, Anthropic and Google.
- Existing keys are migrated once from Prompt Atlas 4.5 when available; raw keys are never returned to the browser.
- The Seedance split (`subject`, `context`, `style`) is visible and editable.
- Missing-key, busy, empty and drag-over states are explicit.
- Model and destination are setup-local and survive named setup versions.

