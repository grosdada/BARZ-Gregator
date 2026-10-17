export function normalizeDirectorCues(value, maximum = 20) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim().slice(0, 50_000))
    .filter(Boolean)
    .slice(0, Math.max(0, Number(maximum) || 0));
}
