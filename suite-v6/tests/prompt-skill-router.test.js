import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPromptSkillContext,
  getPromptSkillReferenceStatus,
  PROMPT_SKILL_REFERENCE_VERSION
} from "../apps/atlas/lib/prompt-skill-router.js";

test("prompt skill reference is available and versioned", async () => {
  const status = await getPromptSkillReferenceStatus();
  assert.equal(status.available, true);
  assert.equal(status.version, PROMPT_SKILL_REFERENCE_VERSION);
  assert.match(status.source, /prompt-engines-reference\.html/);
  assert.match(status.source, /prompt-skills-update-2026-10-03\.html/);
});

test("image routing selects the active engine and craft sections only", async () => {
  const result = await buildPromptSkillContext({
    media: "image",
    targetEngine: "GPT Image",
    task: "compose"
  });
  assert.equal(result.available, true);
  assert.ok(result.sections.includes("gpt-image"));
  assert.ok(result.sections.includes("image-universal"));
  assert.ok(result.sections.includes("lighting"));
  assert.equal(result.sections.includes("midjourney"), false);
  assert.match(result.text, /GPT Image family/);
});

test("video routing understands product labels and preserves its context budget", async () => {
  const result = await buildPromptSkillContext({
    media: "video",
    targetEngine: "Seedance 2.5",
    task: "auto-block",
    maxChars: 32000
  });
  assert.ok(result.sections.includes("seedance-25"));
  assert.ok(result.sections.includes("blockout"));
  assert.ok(result.sections.includes("frame-zero"));
  assert.ok(result.sections.includes("contact"));
  assert.ok(result.text.length <= 32500);
});

test("video analysis receives every generated prompt dialect", async () => {
  const result = await buildPromptSkillContext({
    media: "video",
    targetEngine: "multi-engine",
    task: "video-analysis",
    maxChars: 70000
  });
  for (const section of ["seedance-20", "update:skill-wan30", "update:skill-flux3", "update:skill-h3", "update:skill-kling3"]) {
    assert.ok(result.sections.includes(section), `missing ${section}`);
  }
  assert.ok(result.sections.includes("syntax-matrix"));
  assert.ok(result.sections.includes("continuity"));
});

test("updated engine skills replace their older engine sections", async () => {
  const result = await buildPromptSkillContext({ media: "video", targetEngine: "Kling 3 Omni", task: "compose", maxChars: 42000 });
  assert.ok(result.sections.includes("update:skill-kling3"));
  assert.equal(result.sections.includes("kling-3"), false);
  assert.match(result.text, /kling3-video-prompt v2/i);
  assert.match(result.text, /Negative prompt \(API hosts only\)/i);
});

test("Atlas Advisor loads the executable Blocking Studio skill only for previz requests", async () => {
  const blocking = await buildPromptSkillContext({
    media: "video",
    targetEngine: "Blocking Studio",
    task: "advisor",
    requestText: "Construis une scène avec un dolly in",
    maxChars: 48000
  });
  assert.ok(blocking.sections.includes("skill:blocking-studio-director"));
  assert.match(blocking.text, /barz-blocking-scene/);
  assert.match(blocking.text, /Use metres\. X points screen-right/);

  const unrelated = await buildPromptSkillContext({ media: "video", targetEngine: "Kling 3 Omni", task: "advisor", requestText: "Écris un prompt vidéo", maxChars: 48000 });
  assert.equal(unrelated.sections.includes("skill:blocking-studio-director"), false);
});

