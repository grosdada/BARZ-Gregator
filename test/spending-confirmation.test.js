import test from "node:test";
import assert from "node:assert/strict";
import {
  GENERATION_CONFIRMATION_THRESHOLD_USD,
  needsGenerationConfirmation
} from "../public/spending-confirmation.js";

test("submits generations costing up to 1.50 USD without a confirmation popup", () => {
  assert.equal(GENERATION_CONFIRMATION_THRESHOLD_USD, 1.5);
  assert.equal(needsGenerationConfirmation({ estimatedCost: 0.25, currency: "USD" }), false);
  assert.equal(needsGenerationConfirmation({ estimatedCost: 1.5, currency: "USD" }), false);
});

test("requires confirmation above 1.50 USD or when the price cannot be compared safely", () => {
  assert.equal(needsGenerationConfirmation({ estimatedCost: 1.500001, currency: "USD" }), true);
  assert.equal(needsGenerationConfirmation({ estimatedCost: null, currency: "USD" }), true);
  assert.equal(needsGenerationConfirmation({ estimatedCost: 1, currency: "EUR" }), true);
});
