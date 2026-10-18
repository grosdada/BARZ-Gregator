# BARZ local rendering through Q-Builder — implementation plan

This is a design for the next release, not an enabled feature in 0.33.49.

## User experience

Add a `Cloud / Local` switch inside **Create → Videos**, next to the model selector. Keep the same prompt, references, generation history and result cards. In `Local`, the model list contains only workflows that at least one currently online ComfyUI worker can run; initially H3 and LTX. Show the eligible workers and queue length without asking the user to choose a computer. Q-Builder chooses the least-loaded eligible worker. Keep Cloud costs and API keys out of this mode. Extend the same switch to Images only when image workflows are connected.

Do not add a separate left-rail atelier: it would duplicate the composer, assets, job history and reference controls. Do not offer a model because it merely exists in a BARZ catalog; show it only after a capability check on a worker.

## Boundary

BARZ sends a typed local job to a **loopback-only** Q-Builder adapter. Q-Builder owns the configured `comfy_nodes`, workflow templates, reference uploads, worker selection, ComfyUI `/prompt` submission, polling/recovery and result copying. BARZ must not call worker ComfyUI ports from the browser, accept arbitrary workflow JSON or shell commands from the browser, or install ComfyUI on the command-post PC. The existing `comfy_input` setting stays empty.

The current Q-Builder `/api/cluster-status` reports online/GPU/VRAM/queue information, but not a render-job API or a model catalog. Add a small allowlisted interface there first:

- `GET /api/barz/capabilities`: Q-Builder probes each configured worker's required custom nodes and model filenames for the approved H3 and LTX workflow templates, then returns the eligible models/workers and availability.
- `POST /api/barz/jobs`: accept only validated H3/LTX parameters and staged reference IDs; construct the known workflow server-side and enqueue it on an eligible worker.
- `GET /api/barz/jobs/{id}`: return queued/running/failed/completed state and copied result paths. Reuse the Q-Builder job ledger for restart recovery and avoid duplicate resubmission while a worker is unreachable.

BARZ's local server proxies those routes to `127.0.0.1:8765`, normalizes status/result records into its existing job cards and Assets library, and keeps the browser on the BARZ origin. This avoids extra browser CORS or LAN firewall permissions. A local-only adapter must have a fixed allowlist and no arbitrary URLs or filesystem paths from requests.

## First milestone / acceptance

1. Start Q-Builder and two ComfyUI workers. Show only H3/LTX workflows whose exact dependencies are installed on at least one worker; show a clear offline state otherwise.
2. Submit one H3 and one LTX job from BARZ with a prompt and reference image. Confirm each is routed to an eligible worker, not blindly broadcast to all machines; multiple jobs distribute by load.
3. Return progress, errors and copied outputs into BARZ history/Assets. Restart BARZ and Q-Builder during a queued job and verify the ledger reconnects without a duplicate render.
4. Keep Cloud mode unchanged and prove that Local mode does not call fal or any paid generation provider.

The user's Q-Builder service was not running on `127.0.0.1:8765` when this plan was written, so worker/model availability and actual H3/LTX dispatch remain to be verified live.
