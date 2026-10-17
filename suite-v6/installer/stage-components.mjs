import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const installerDirectory = path.dirname(fileURLToPath(import.meta.url));

function safeComponent(value) {
  return /^[a-z][a-z0-9-]*$/.test(value);
}

export async function stageComponents({ outputDirectory, selected, sourceDirectory = installerDirectory }) {
  if (!outputDirectory || typeof outputDirectory !== "string") throw new TypeError("outputDirectory is required");
  if (!Array.isArray(selected) || selected.length === 0) throw new Error("Select atlas, aggregator, or both");
  if (new Set(selected).size !== selected.length || selected.some((item) => !safeComponent(item))) {
    throw new Error("Component selection is invalid");
  }
  const manifest = JSON.parse(await readFile(path.join(sourceDirectory, "manifest.json"), "utf8"));
  const optional = Object.entries(manifest.components).filter(([, item]) => !item.required).map(([id]) => id);
  if (selected.some((id) => !optional.includes(id))) throw new Error("Unknown optional component");

  await mkdir(outputDirectory, { recursive: true });
  if ((await readdir(outputDirectory)).length > 0) throw new Error("Output directory must be empty");
  const ids = [
    ...Object.entries(manifest.components).filter(([, item]) => item.required).map(([id]) => id),
    ...selected
  ];
  for (const id of ids) {
    const source = path.resolve(sourceDirectory, manifest.components[id].source);
    const sourceRoot = `${path.resolve(sourceDirectory)}${path.sep}`;
    if (!source.startsWith(sourceRoot) || !(await stat(source)).isDirectory()) throw new Error(`Invalid payload source for ${id}`);
    await cp(source, path.join(outputDirectory, id), { recursive: true, errorOnExist: true, force: false });
  }
  const receipt = {
    schemaVersion: manifest.schemaVersion,
    product: manifest.product,
    selected: ids,
    stagedAt: new Date().toISOString()
  };
  await writeFile(path.join(outputDirectory, "install-selection.json"), `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
  return receipt;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const outputArgument = process.argv.find((value) => value.startsWith("--output="))?.slice(9);
  const selectedArgument = process.argv.find((value) => value.startsWith("--components="))?.slice(13);
  const receipt = await stageComponents({
    outputDirectory: outputArgument,
    selected: selectedArgument?.split(",").filter(Boolean) ?? []
  });
  console.log(JSON.stringify(receipt, null, 2));
}
