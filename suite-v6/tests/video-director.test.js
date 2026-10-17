import test from "node:test";
import assert from "node:assert/strict";

import { createVideoDirectorService } from "../apps/atlas/video-director-service.js";
import { directorSampleTimes, formatDirectorTime, isSupportedDirectorMedia } from "../apps/atlas/public/video-director.js";

const FRAME = "data:image/jpeg;base64,AA==";

test("Video Director formats timecodes and samples a bounded ordered window", () => {
  assert.equal(formatDirectorTime(65.4329), "01:05.432");
  assert.equal(formatDirectorTime(-1), "00:00.000");
  assert.deepEqual(directorSampleTimes(4, 10, 3), [4 + 5 / 3, 9, 12 + 1 / 3]);
  assert.equal(directorSampleTimes(0, 15, 99).length, 8);
  assert.equal(directorSampleTimes(0, 15, 1).length, 3);
});

test("Video Director accepts Windows media files with or without a MIME type", () => {
  assert.equal(isSupportedDirectorMedia({ name: "scene.mp4", type: "video/mp4" }), true);
  assert.equal(isSupportedDirectorMedia({ name: "scene.MOV", type: "" }), true);
  assert.equal(isSupportedDirectorMedia({ name: "voice.wav", type: "" }), true);
  assert.equal(isSupportedDirectorMedia({ name: "project.json", type: "application/json" }), false);
});

test("Video Director sends ordered frames to OpenAI and normalizes its five outputs", async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return new Response(JSON.stringify({
      output_text: JSON.stringify({
        analysis: "Two-beat continuity.",
        klingPrompt: "Shot one. Shot two.",
        klingNegativePrompt: "morphing, flicker",
        seedancePrompt: "Wide shot. Cut to. Close-up.",
        duration: 8,
        shots: [{ time: 0, duration: 4, frame: 1, action: "turn", camera: "push-in", motionIntensity: 1.2 }]
      })
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const service = createVideoDirectorService({
    getSettings: async () => ({ model: "gpt-4.1-mini", openaiApiKey: "local-test-key" }),
    fetchImpl
  });
  const result = await service.analyze({
    fileName: "scene.mp4", model: "gpt-4.1-mini", duration: 8,
    frames: [{ time: 0, sourceTime: 3, dataUrl: FRAME }, { time: 8, sourceTime: 11, dataUrl: FRAME }],
    transcript: "Stay where you are.", subjectChange: "replace the actor with a robot"
  });
  assert.equal(request.url, "https://api.openai.com/v1/responses");
  assert.equal(request.body.input[1].content.filter(({ type }) => type === "input_image").length, 2);
  assert.match(request.body.input[1].content[0].text, /source 3\.00s/);
  assert.match(result.klingPrompt, /MANDATORY SUBJECT REPLACEMENT: replace the actor with a robot/);
  assert.match(result.klingPrompt, /Shot one\. Shot two\./);
  assert.match(result.seedancePrompt, /Wide shot\. Cut to\. Close-up\./);
  assert.match(result.minimaxH3Prompt, /replace the actor with a robot/i);
  assert.match(result.flux3Prompt, /replace the actor with a robot/i);
  assert.match(result.wan3Prompt, /replace the actor with a robot/i);
  assert.equal(result.klingNegativePrompt, "morphing, flicker");
  assert.equal(result.model, "gpt-4.1-mini");
  assert.equal(result.shots.length, 1);
});

test("Video Director keeps a usable local fallback when the remote provider fails", async () => {
  const service = createVideoDirectorService({
    getSettings: async () => ({ model: "gpt-4.1-mini", openaiApiKey: "local-test-key" }),
    fetchImpl: async () => { throw new Error("offline"); }
  });
  const result = await service.analyze({
    fileName: "scene.mp4", duration: 6, frames: [{ time: 0, sourceTime: 0, dataUrl: FRAME }],
    subjectChange: "the same silver robot", backgroundChange: "a red laboratory"
  });
  assert.equal(result.model, "local-video-fallback");
  assert.match(result.warning, /offline/);
  assert.match(result.klingPrompt, /same silver robot/);
  assert.match(result.seedancePrompt, /red laboratory/);
  assert.ok(result.klingNegativePrompt);
});

test("Video Director refuses remote analysis when the selected provider key is missing", async () => {
  const service = createVideoDirectorService({ getSettings: async () => ({ model: "gpt-4.1-mini" }) });
  await assert.rejects(
    () => service.analyze({ duration: 5, frames: [{ time: 0, dataUrl: FRAME }] }),
    (error) => error.status === 400 && /OpenAI/.test(error.message)
  );
});
