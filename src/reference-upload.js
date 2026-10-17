const localImage = /^\/api\/resources\/([0-9a-f]{8}-[0-9a-f-]{27,})\/content$/i;
const mediaFields = [
  "image_url", "image_urls", "reference_image_urls", "reference_image_url", "input_image_url",
  "first_frame_url", "start_image_url", "end_image_url",
  "audio_url", "audio_urls", "reference_audio_url", "reference_audio_urls", "input_audio_url", "music_url",
  "video_url", "video_urls", "reference_video_url", "reference_video_urls", "input_video_url"
];

// Resolves only known media fields, never prompt text or arbitrary input paths.
// Called after confirmation and the atomic submission claim, not during quotes.
export async function stageReferenceMedia(input, readResource, uploadMedia) {
  const staged = structuredClone(input);
  const pending = new Map();
  for (const field of mediaFields) {
    if (staged[field] === undefined) continue;
    for (const url of Array.isArray(staged[field]) ? staged[field] : [staged[field]]) {
      const match = typeof url === "string" && url.match(localImage);
      if (match && !pending.has(url)) pending.set(url, await readResource(match[1]));
      else if (typeof url !== "string" || (!match && !url.startsWith("https://"))) {
        throw new Error("Adresse de média de référence invalide.");
      }
    }
  }
  const uploaded = new Map();
  for (const [url, resource] of pending) uploaded.set(url, await uploadMedia(resource));
  for (const field of mediaFields) {
    if (Array.isArray(staged[field])) staged[field] = staged[field].map((url) => uploaded.get(url) || url);
    else if (uploaded.has(staged[field])) staged[field] = uploaded.get(staged[field]);
  }
  return staged;
}

export const stageReferenceImages = stageReferenceMedia;
