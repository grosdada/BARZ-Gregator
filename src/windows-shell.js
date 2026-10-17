import { spawn } from "node:child_process";
import path from "node:path";

export function explorerSelectArgument(filePath) {
  return `/select,"${path.win32.normalize(filePath)}"`;
}

export async function revealFileInExplorer(filePath, spawnProcess = spawn) {
  const explorer = spawnProcess(
    "explorer.exe",
    [explorerSelectArgument(filePath)],
    {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      windowsVerbatimArguments: true
    }
  );

  await new Promise((resolve, reject) => {
    explorer.once("spawn", resolve);
    explorer.once("error", reject);
  });
  explorer.unref();
}
