// Provider results can include non-media artifacts, e.g. FLUX Draft's cache.
// Use the same filter on both sides so asset indexes and downloads agree.
export function isDisplayMedia(file) {
  const type = String(file?.content_type || file?.contentType || "").toLowerCase();
  if (/^(image|video|audio)\//.test(type)) return true;
  try {
    return /\.(png|jpe?g|webp|gif|avif|mp4|webm|mov|mp3|wav|m4a|ogg|flac)$/i.test(new URL(file.url).pathname);
  } catch { return false; }
}
