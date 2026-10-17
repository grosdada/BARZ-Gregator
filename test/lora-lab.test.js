import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  LORA_TRAINERS,
  buildLoraTrainingInput,
  estimateLoraTrainingCost,
  normalizeLoraArtifacts
} from "../src/lora-lab.js";
import { validateSafetensorsHeader } from "../src/lora-import.js";

const openapi = { paths: { "/": { post: { requestBody: { content: { "application/json": { schema: { type: "object", properties: { image_data_url: { type: "string" }, steps: { type: "integer" }, learning_rate: { type: "number" }, default_caption: { type: "string" }, training_type: { type: "string" }, output_lora_format: { type: "string" } } } } } } } } } };

test("LoRA Lab never exposes Krea 2", () => assert.equal(LORA_TRAINERS.some((item) => /krea.?2/i.test(`${item.id} ${item.label} ${item.baseModel}`)), false));
test("builds a schema-aware fal trainer payload", () => assert.deepEqual(buildLoraTrainingInput(LORA_TRAINERS[2], openapi, { triggerPhrase: "barzperson", caption: "photo of barzperson", steps: 1200, learningRate: 0.00005, mode: "balanced", outputFormat: "comfy" }, "https://files.fal.media/dataset.zip"), { image_data_url: "https://files.fal.media/dataset.zip", default_caption: "photo of barzperson", steps: 1200, learning_rate: 0.00005, training_type: "balanced", output_lora_format: "comfy" }));
test("estimates per-thousand-step pricing", () => assert.equal(estimateLoraTrainingCost({ unitPrice: 2.26, unit: "1000 steps" }, 1500), 3.39));
test("extracts downloadable fal artifacts", () => assert.deepEqual(normalizeLoraArtifacts({ diffusers_lora_file: { url: "https://fal.media/x.safetensors" }, config_file: { url: "https://fal.media/x.json" } }), { weights: { url: "https://fal.media/x.safetensors", contentType: "application/octet-stream" }, config: { url: "https://fal.media/x.json", contentType: "application/json" } }));

test("LoRA Lab exposes Krea recovery where users expect it", async () => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(html, /id="loraLabView"[\s\S]*id="kreaLabLibrary"[\s\S]*Reload LoRAs/);
  assert.match(html, /L’API Krea ne fournit pas ici les fichiers <code>\.safetensors<\/code>/);
  assert.match(app, /importKreaLorasLabButton\.addEventListener\("click", importKreaLoras\)/);
  assert.match(app, /selectedModelsByMedia\.set\("image", model\.endpointId\)/);
  assert.match(app, /thumbnailUrl\)\}" alt="" loading="lazy"/);
  assert.match(server, /img-src[^\n]+test1-emgndhaqd0c9h2db\.a01\.azurefd\.net/);
});
test("LoRA Lab accepts large style datasets up to 500 images", async () => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(html, /10 minimum · 500 maximum/);
  assert.match(app, /slice\(0, 500 - state\.loraDatasetIds\.length\)/);
  assert.match(server, /ids\.length < 10 \|\| ids\.length > 500/);
  assert.match(server, /Le dataset doit contenir entre 10 et 500 images\./);
  assert.match(server, /totalBytes > 500_000_000/);
});
test("validates SafeTensors before importing a local LoRA", () => {
  const header = Buffer.from(JSON.stringify({
    weight: { dtype: "F16", shape: [1], data_offsets: [0, 2] }
  }));
  const prefix = Buffer.alloc(8 + header.length);
  prefix.writeBigUInt64LE(BigInt(header.length));
  header.copy(prefix, 8);
  assert.deepEqual(validateSafetensorsHeader(prefix, prefix.length + 2), {
    headerSize: header.length,
    tensorCount: 1,
    metadata: {}
  });
  assert.throws(
    () => validateSafetensorsHeader(Buffer.from("not-safe"), 8),
    /SafeTensors/
  );
});

test("LoRA Lab imports local weights into My training jobs", async () => {
  const [html, app, server] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../server.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="importLocalLoraButton"/);
  assert.match(html, /id="loraImportBaseModel"/);
  assert.match(app, /async function importLocalLoras/);
  assert.match(app, /X-Barz-Lora-Base-Model/);
  assert.match(server, /url\.pathname === "\/api\/lora-lab\/import"/);
  assert.match(server, /validateSafetensorsFile\(temporaryPath\)/);
  assert.match(server, /localStorageName/);
});
