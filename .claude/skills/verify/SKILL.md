---
name: verify-barz
description: Verify BARZ Aggregator changes through its running local browser UI.
---

# Verify BARZ Aggregator

1. Start the app with `npm start`; it listens on `http://127.0.0.1:4317`.
2. Open a cache-busted URL such as `/?v=<package-version>` in the in-app browser.
3. Drive the changed flow through visible controls and capture a screenshot.
4. Read browser error logs after the interaction.
5. For API-backed UI actions, probe one invalid request through the local HTTP
   surface and confirm that no secrets appear in the response.

The local fal key may not expose billing but can still generate. Never submit a
paid request merely to verify unrelated UI. Existing completed jobs are suitable
for history, library, collection and download verification.
