// Catalog verification only: this script never submits a generation.
const endpoints = [
  "fal-ai/flux-2/turbo",
  "bytedance/seedream/v5/lite/text-to-image",
  "fal-ai/nano-banana-2",
  "fal-ai/nano-banana-2/edit",
  "fal-ai/nano-banana",
  "fal-ai/nano-banana/edit",
  "fal-ai/nano-banana-pro",
  "fal-ai/nano-banana-pro/edit",
  "fal-ai/z-image/turbo",
  "fal-ai/z-image/turbo/image-to-image",
  "ideogram/v4/fast",
  "ideogram/v4/image-to-image",
  "blackforestlabs/flux-3/text-to-video/draft",
  "blackforestlabs/flux-3/image-to-video",
  "blackforestlabs/flux-3/image-to-video/draft",
  "minimax/h3/text-to-video",
  "minimax/h3/image-to-video",
  "minimax/h3/reference-to-video",
  "minimax/h3-max/text-to-video",
  "minimax/h3-max/image-to-video",
  "minimax/h3-max/reference-to-video",
  "fal-ai/ace-step/prompt-to-audio",
  "fal-ai/ace-step",
  "fal-ai/ace-step/audio-to-audio",
  "fal-ai/stable-audio-25/text-to-audio",
  "fal-ai/stable-audio-25/audio-to-audio",
  "cassetteai/music-generator"
];
let failed = false;
for (const endpointId of endpoints) {
  let response;
  let result;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch("http://127.0.0.1:4317/api/providers/fal/models/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpointId })
    });
    result = await response.json();
    if (response.ok || !/429|rate limit/i.test(result.error || "")) break;
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 20_000));
  }
  console.log(JSON.stringify({ endpointId, status: response.status,
    pricing: result.model?.pricing, error: result.error }));
  if (!response.ok) failed = true;
}
process.exitCode = failed ? 1 : 0;
