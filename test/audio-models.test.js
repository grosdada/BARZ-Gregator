import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  createGenerationPreview,
  deriveModelControls,
  modelFamily,
  modelModeLabel
} from "../src/generation-plan.js";

const catalog = JSON.parse(readFileSync(
  new URL("../data/catalog.seed.json", import.meta.url),
  "utf8"
));

function audioModel(endpointId) {
  const model = catalog.find((item) => item.endpointId === endpointId);
  assert.ok(model, `${endpointId} should be in the built-in catalog`);
  return model;
}

function draft(prompt, settings = {}, references = []) {
  return {
    mediaType: "music",
    prompt,
    settings: { durationSeconds: 60, ...settings },
    references
  };
}

test("ships the agreed music model families in the built-in catalog", () => {
  const endpoints = [
    "fal-ai/ace-step/prompt-to-audio",
    "fal-ai/ace-step",
    "fal-ai/ace-step/audio-to-audio",
    "fal-ai/stable-audio-25/text-to-audio",
    "fal-ai/stable-audio-25/audio-to-audio",
    "cassetteai/music-generator"
  ];
  assert.deepEqual(endpoints.filter((endpointId) => (
    !catalog.some((model) => model.endpointId === endpointId)
  )), []);
  assert.equal(modelFamily(audioModel(endpoints[0])).label, "ACE-Step");
  assert.equal(modelFamily(audioModel(endpoints[3])).label, "Stable Audio 2.5");
  assert.equal(modelModeLabel(audioModel(endpoints[5])), "Morceau long");
});

test("maps ACE-Step composition, lyrics, and remix inputs", () => {
  const composer = createGenerationPreview(draft(
    "cinematic synthwave, slow pulse",
    { instrumental: true }
  ), audioModel("fal-ai/ace-step/prompt-to-audio"));
  assert.equal(composer.providerInput.prompt, "cinematic synthwave, slow pulse");
  assert.equal(composer.providerInput.duration, 60);
  assert.equal(composer.providerInput.instrumental, true);
  assert.equal(composer.estimatedCost, 0.012);
  assert.equal(composer.canSubmit, true);

  const song = createGenerationPreview(draft("soul, warm brass", {
    lyrics: "[verse]\nHold the line\n[chorus]\nWe go home"
  }), audioModel("fal-ai/ace-step"));
  assert.equal(song.providerInput.tags, "soul, warm brass");
  assert.match(song.providerInput.lyrics, /\[chorus\]/);
  assert.equal(song.canSubmit, true);

  const audio = { kind: "audio", url: "https://example.com/source.wav" };
  const remix = createGenerationPreview(draft("ambient techno", {
    originalTags: "acoustic folk",
    editMode: "remix"
  }, [audio]), audioModel("fal-ai/ace-step/audio-to-audio"));
  assert.equal(remix.providerInput.tags, "ambient techno");
  assert.equal(remix.providerInput.original_tags, "acoustic folk");
  assert.equal(remix.providerInput.audio_url, audio.url);
  assert.equal(remix.providerInput.edit_mode, "remix");
  assert.equal(remix.canSubmit, true);
});

test("maps Stable Audio duration and prices CassetteAI by output minute", () => {
  const stable = createGenerationPreview(draft(
    "dark industrial ambience", { durationSeconds: 120 }
  ), audioModel("fal-ai/stable-audio-25/text-to-audio"));
  assert.equal(stable.providerInput.seconds_total, 120);
  assert.equal(stable.estimatedCost, 0.2);
  assert.equal(stable.canSubmit, true);

  const cassette = createGenerationPreview(draft(
    "a long evolving orchestral suite", { durationSeconds: 120 }
  ), audioModel("cassetteai/music-generator"));
  assert.equal(cassette.providerInput.duration, 120);
  assert.equal(cassette.estimatedCost, 0.04);
  assert.equal(cassette.canSubmit, true);

  const stableAudioControls = deriveModelControls(
    audioModel("fal-ai/stable-audio-25/audio-to-audio").inputSchema,
    "fal-ai/stable-audio-25/audio-to-audio"
  );
  assert.deepEqual(stableAudioControls.referenceKinds, ["audio"]);
});
