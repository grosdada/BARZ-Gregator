const maximumStoryboardImages = 16;
const minimumKeyframeSpacing = 3;

function wholeSeconds(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback;
}

export function normalizeDirectorStoryboard(value, maximum = maximumStoryboardImages) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maximum).map((item, index) => ({
    reference: item?.reference && typeof item.reference === "object"
      ? structuredClone(item.reference)
      : null,
    offset: index === 0 ? 0 : wholeSeconds(item?.offset, index * 5),
    prompt: typeof item?.prompt === "string" ? item.prompt.slice(0, 50_000) : ""
  })).filter((item) => item.reference);
}

export function validateDirectorStoryboard(value) {
  const storyboard = normalizeDirectorStoryboard(value);
  if (storyboard.length < 2) {
    throw new Error("Le script natif demande au moins une image de début et une image cible.");
  }
  for (let index = 1; index < storyboard.length; index += 1) {
    const previous = storyboard[index - 1];
    const current = storyboard[index];
    if (current.offset - previous.offset < minimumKeyframeSpacing) {
      throw new Error(`L’image ${index + 1} doit arriver au moins ${minimumKeyframeSpacing} secondes après la précédente.`);
    }
  }
  return storyboard;
}

export function compileDirectorScript(value, stagedUrls) {
  const storyboard = validateDirectorStoryboard(value);
  if (!Array.isArray(stagedUrls) || stagedUrls.length !== storyboard.length ||
      stagedUrls.some((url) => typeof url !== "string" || !url)) {
    throw new Error("Toutes les images du script doivent être préparées avant la connexion.");
  }
  const script = storyboard.map((item, index) => {
    const beat = { offset: item.offset };
    if (item.prompt.trim()) beat.prompt = item.prompt.trim();
    if (index > 0) beat.end_image_url = stagedUrls[index];
    return beat;
  });
  return {
    imageUrl: stagedUrls[0],
    script,
    lastOffset: storyboard.at(-1).offset
  };
}

export const directorScriptLimits = {
  maximumStoryboardImages,
  minimumKeyframeSpacing
};
