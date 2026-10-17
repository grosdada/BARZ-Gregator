import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_LEGACY_ROOT = "E:/Fable 5-Project/Meat Journey";
const SOURCE_PATH = "Barzy App/public/assets/HTML/barz_designer.html";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function between(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end <= start) {
    throw new Error(`Legacy ${label} markers were not found.`);
  }
  return source.slice(start, end);
}

function evaluateLegacy(source, expression) {
  const model = between(
    source,
    "const designerCategories = {",
    "function escapeHtml(value)",
    "BZ Designer model"
  );
  const compiler = between(
    source,
    "function groupPromptCount(group)",
    "function updateCard(item,id)",
    "BZ Designer compiler"
  );
  const context = vm.createContext(Object.create(null), {
    codeGeneration: { strings: false, wasm: false }
  });
  vm.runInContext(`${model}\n${compiler}`, context, { timeout: 1_000 });
  return JSON.parse(vm.runInContext(`JSON.stringify(${expression})`, context, {
    timeout: 1_000
  }));
}

function buildFixture(source) {
  return evaluateLegacy(source, `(() => {
    const categories = Object.entries(designerCategories).map(([id, category]) => ({
      id,
      title: category.title,
      kicker: category.kicker,
      tabs: category.tabs?.map(tab => ({
        id: tab.key,
        title: tab.title,
        cardCount: tab.prompts.length
      })) ?? [],
      cardCount: groupPromptCount(category)
    }));
    const cards = Object.entries(designerCategories).flatMap(([categoryId, category]) => {
      if (category.tabs) {
        return category.tabs.flatMap(tab => tab.prompts.map((card, index) => ({
          id: categoryId + "-" + tab.key + "-" + index,
          categoryId,
          tabId: tab.key,
          title: card.title,
          highlight: card.highlight ?? null,
          colors: card.colors ?? [],
          prompt: card.prompt
        })));
      }
      return category.prompts.map((card, index) => ({
        id: categoryId + "-" + index,
        categoryId,
        tabId: null,
        title: card.title,
        highlight: card.highlight ?? null,
        colors: card.colors ?? [],
        prompt: card.prompt
      }));
    });
    const compileAll = () => Object.fromEntries(cards.map(card => [
      card.id,
      currentPrompt(card, card.id)
    ]));
    const defaultState = {
      activeCategory: activeKey,
      activeTabs: { ...activeTabs },
      drawingWeight: sketchDrawingWeight,
      drawingWeightLabel: drawingWeightLabel(),
      selectedColors: { ...selectedColors }
    };
    const defaultOutputs = compileAll();
    sketchDrawingWeight = 85;
    activeKey = "body";
    activeTabs.sketch = "kids";
    selectedColors["body-1"] = designerCategories.body.prompts[1].colors[2];
    const configuredState = {
      activeCategory: activeKey,
      activeTabs: { ...activeTabs },
      drawingWeight: sketchDrawingWeight,
      drawingWeightLabel: drawingWeightLabel(),
      selectedColors: { ...selectedColors }
    };
    return {
      title: "BZ Designer",
      subtitle: "Design prompts extracted from BZ Helper",
      categories,
      cards,
      defaultState,
      configuredState,
      defaultOutputs,
      configuredOutputs: compileAll(),
      weightCases: [20, 40, 45, 65, 85, 95].map(value => {
        sketchDrawingWeight = value;
        return { value, label: drawingWeightLabel() };
      })
    };
  })()`);
}

export async function prepareA8Fixtures({
  legacyRoot = DEFAULT_LEGACY_ROOT,
  outputPath
} = {}) {
  const source = await readFile(path.join(legacyRoot, SOURCE_PATH), "utf8");
  const designer = buildFixture(source);
  const fixture = {
    schemaVersion: "1.0",
    status: "legacy-fixture-before-astra-review",
    source: { owner: "barz-designer", path: SOURCE_PATH, sha256: sha256(source) },
    designer: {
      categoryCount: designer.categories.length,
      cardCount: designer.cards.length,
      countsByCategory: Object.fromEntries(
        designer.categories.map(category => [category.id, category.cardCount])
      ),
      ...designer,
      legacyQuirks: {
        visuallyActiveColorIsNotCompiledUntilClicked: true,
        strippedPlaceholders: [
          "[Scene Description]",
          "[DESCRIBE YOUR NEW SUBJECT HERE]",
          "[Details]"
        ]
      }
    }
  };
  await writeFile(outputPath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  return fixture;
}

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const fixture = await prepareA8Fixtures({
    legacyRoot: process.argv[2] || DEFAULT_LEGACY_ROOT,
    outputPath: path.join(here, "a8-legacy-fixtures.json")
  });
  console.log(JSON.stringify({
    categories: fixture.designer.categoryCount,
    cards: fixture.designer.cardCount,
    counts: fixture.designer.countsByCategory,
    tabs: fixture.designer.categories.find(({ id }) => id === "sketch")?.tabs
  }, null, 2));
}
