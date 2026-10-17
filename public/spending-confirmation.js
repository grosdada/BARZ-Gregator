export const GENERATION_CONFIRMATION_THRESHOLD_USD = 1.5;

export function needsGenerationConfirmation(preview) {
  const rawEstimatedCost = preview?.estimatedCost;
  if (rawEstimatedCost === null || rawEstimatedCost === undefined || rawEstimatedCost === "") return true;
  const estimatedCost = Number(rawEstimatedCost);
  const currency = String(preview?.currency || "USD").toUpperCase();
  return !Number.isFinite(estimatedCost)
    || estimatedCost < 0
    || currency !== "USD"
    || estimatedCost > GENERATION_CONFIRMATION_THRESHOLD_USD;
}
