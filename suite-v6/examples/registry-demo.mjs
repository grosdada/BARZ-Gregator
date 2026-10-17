import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { orderedNavigation, RegistryStore } from "../packages/registry/src/index.js";
import { compileRecipe } from "../packages/prompt-runtime/src/index.js";

const directory = await mkdtemp(path.join(os.tmpdir(), "barz-suite-v6-demo-"));
try {
  const recipe = {
    schemaVersion: "1.0",
    id: "demo-shot-v1",
    revision: 1,
    title: "Demo shot",
    fields: [{ id: "subject", type: "text", required: true }],
    outputs: [{ id: "main", mediaType: "video", template: "Slow forward dolly toward {{subject}}." }],
    referenceSlots: []
  };
  const store = new RegistryStore({ directory });
  let registry = await store.init();
  registry = await store.addWorkshop({
    expectedRevision: registry.revision,
    workshop: { id: "demo-workshop", title: "Demo Workshop", order: 20 }
  });
  registry = await store.addRecipeTool({
    expectedRevision: registry.revision,
    recipe,
    tool: { id: "demo-shot", title: "Demo Shot", kind: "recipe", recipeId: recipe.id },
    placements: [{ id: "demo-shot-placement", targetId: "demo-workshop", order: 0 }]
  });
  const restarted = new RegistryStore({ directory });
  const persisted = await restarted.init();
  const output = compileRecipe(recipe, { subject: "a weathered gate under moonlight" });
  console.log(JSON.stringify({
    tabs: orderedNavigation(persisted).map(({ title }) => title),
    persistedRevision: persisted.revision,
    output
  }, null, 2));
} finally {
  await rm(directory, { recursive: true, force: true });
}
