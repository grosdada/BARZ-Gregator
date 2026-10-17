import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_LEGACY_ROOT = "E:/Fable 5-Project/Meat Journey";
const REALISM_SOURCE = "Barzy App/public/assets/HTML/realism-forge-v2.html";
const BEAUTY_SOURCE = "Barzy App/public/assets/HTML/md-beauty.html";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function between(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end <= start) throw new Error(`Legacy ${label} markers were not found.`);
  return source.slice(start, end);
}

function isolatedContext(source, expression) {
  const context = vm.createContext(Object.create(null), {
    codeGeneration: { strings: false, wasm: false }
  });
  vm.runInContext(source, context, { timeout: 1_000 });
  return JSON.parse(vm.runInContext(`JSON.stringify(${expression})`, context, { timeout: 1_000 }));
}

function beautyFixture(source) {
  const data = between(source, "let genderSelfie", "// -- RENDER FUNCTIONS --", "Beauty data");
  return isolatedContext(data, `({
    categories: [
      { id: "selfie-f", entries: selfiePrompts.f },
      { id: "selfie-m", entries: selfiePrompts.m },
      { id: "portrait-f", entries: makePortraitPrompts("f") },
      { id: "portrait-m", entries: makePortraitPrompts("m") },
      { id: "skin", entries: skinPrompts },
      { id: "lighting", entries: lightingPrompts },
      { id: "negatives", entries: negativePrompts }
    ]
  })`);
}

function realismFixture(source) {
  const data = between(source, "const OUTFITS=[", "let favs=", "Realism data");
  const compiler = between(source, "function enC(", "const esc=", "Realism compiler");
  return isolatedContext(`${data}\n${compiler}`, `(() => {
    const defaultOutputs = TABS.flatMap(tab => tab.cards.map((card, index) => {
      const key = tab.id + "-" + index;
      return { tabId: tab.id, cardIndex: index, title: card.title, output: buildP(card.tpl, key) };
    }));
    Object.assign(S, {
      desc: "a violinist waiting beside a rain-streaked bus shelter",
      celeb: "",
      outfit: OUTFITS[0].v,
      pose: POSES[3].v,
      location: LOCATIONS[5].v,
      mood: MOODS[1].v
    });
    cardSl["edge"] = { flash: 100, grain: 100, dof: 0, wear: 100, imperf: 100 };
    const edgeOutput = buildP(TABS[0].cards[0].tpl, "edge");
    return {
      controls: { outfits: OUTFITS, poses: POSES, locations: LOCATIONS, moods: MOODS },
      celebrityCounts: { female: CELEBS_F.length, male: CELEBS_M.length },
      celebrities: { female: CELEBS_F, male: CELEBS_M },
      sliders: SL_DEFS,
      tabs: TABS.map(tab => ({
        id: tab.id,
        label: tab.label,
        intro: tab.intro,
        cards: tab.cards.map(card => ({ title: card.title, specs: card.specs, template: card.tpl }))
      })),
      defaultOutputs,
      edgeFixture: {
        tabId: TABS[0].id,
        cardIndex: 0,
        state: JSON.parse(JSON.stringify(S)),
        sliders: JSON.parse(JSON.stringify(cardSl.edge)),
        output: edgeOutput
      }
    };
  })()`);
}

export async function prepareA1Fixtures({ legacyRoot = DEFAULT_LEGACY_ROOT, outputPath } = {}) {
  const realismPath = path.join(legacyRoot, REALISM_SOURCE);
  const beautyPath = path.join(legacyRoot, BEAUTY_SOURCE);
  const [realismSource, beautySource] = await Promise.all([
    readFile(realismPath, "utf8"),
    readFile(beautyPath, "utf8")
  ]);
  const beauty = beautyFixture(beautySource);
  const realism = realismFixture(realismSource);
  const fixture = {
    schemaVersion: "1.0",
    status: "legacy-fixture-before-astra-review",
    sources: [
      { owner: "realism-forge", path: REALISM_SOURCE, sha256: sha256(realismSource) },
      { owner: "barz-beauty", path: BEAUTY_SOURCE, sha256: sha256(beautySource) }
    ],
    beauty: {
      categoryCount: beauty.categories.length,
      entryCount: beauty.categories.reduce((sum, category) => sum + category.entries.length, 0),
      ...beauty
    },
    realism: {
      tabCount: realism.tabs.length,
      cardCount: realism.tabs.reduce((sum, tab) => sum + tab.cards.length, 0),
      ...realism
    }
  };
  await writeFile(outputPath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  return fixture;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const fixture = await prepareA1Fixtures({
    legacyRoot: process.argv[2] || DEFAULT_LEGACY_ROOT,
    outputPath: path.join(here, "a1-legacy-fixtures.json")
  });
  console.log(JSON.stringify({
    beautyCategories: fixture.beauty.categoryCount,
    beautyEntries: fixture.beauty.entryCount,
    realismTabs: fixture.realism.tabCount,
    realismCards: fixture.realism.cardCount,
    realismOutputs: fixture.realism.defaultOutputs.length
  }, null, 2));
}
