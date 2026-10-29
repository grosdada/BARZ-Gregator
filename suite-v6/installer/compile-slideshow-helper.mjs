import { access, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const installerDirectory = path.dirname(fileURLToPath(import.meta.url));

export async function compileSlideshowHelper(environment = process.env) {
  const frameworkRoot = path.join(environment.WINDIR || "C:\\Windows", "Microsoft.NET");
  const candidates = [
    path.join(frameworkRoot, "Framework64", "v4.0.30319", "csc.exe"),
    path.join(frameworkRoot, "Framework", "v4.0.30319", "csc.exe")
  ];
  let compiler;
  for (const candidate of candidates) {
    if (await access(candidate).then(() => true, () => false)) { compiler = candidate; break; }
  }
  if (!compiler) throw new Error("Windows .NET Framework C# compiler was not found.");
  const output = path.join(installerDirectory, "assets", "slideshow", "barz-slideshow.exe");
  await mkdir(path.dirname(output), { recursive: true });
  await new Promise((resolve, reject) => {
    const child = spawn(compiler, [
      "/nologo", "/target:winexe", "/platform:x64", "/reference:System.Drawing.dll",
      `/out:${output}`, path.join(installerDirectory, "slideshow-helper.cs")
    ], { cwd: installerDirectory, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`C# compiler exited with code ${code}`)));
  });
  return output;
}
