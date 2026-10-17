import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const algorithm = "aes-256-gcm";

export class SharedApiVault {
  constructor(directory) {
    this.directory = directory;
    this.keyPath = path.join(directory, "vault-key.local");
    this.secretsPath = path.join(directory, "secrets.local.json");
    this.masterKey = null;
  }

  async init() {
    await mkdir(this.directory, { recursive: true });
    try {
      this.masterKey = await readFile(this.keyPath);
      if (this.masterKey.length !== 32) throw new Error("Invalid vault key");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const candidate = randomBytes(32);
      try {
        await writeFile(this.keyPath, candidate, { mode: 0o600, flag: "wx" });
        this.masterKey = candidate;
      } catch (writeError) {
        if (writeError.code !== "EEXIST") throw writeError;
        this.masterKey = await readFile(this.keyPath);
      }
      if (this.masterKey.length !== 32) throw new Error("Invalid vault key");
    }
  }

  async readAll() {
    let encrypted;
    try { encrypted = JSON.parse(await readFile(this.secretsPath, "utf8")); }
    catch (error) { if (error.code === "ENOENT") return {}; throw error; }
    const decipher = createDecipheriv(algorithm, this.masterKey, Buffer.from(encrypted.iv, "base64"));
    decipher.setAuthTag(Buffer.from(encrypted.tag, "base64"));
    return JSON.parse(Buffer.concat([
      decipher.update(Buffer.from(encrypted.data, "base64")), decipher.final()
    ]).toString("utf8"));
  }

  async writeAll(secrets) {
    const iv = randomBytes(12);
    const cipher = createCipheriv(algorithm, this.masterKey, iv);
    const data = Buffer.concat([cipher.update(JSON.stringify(secrets), "utf8"), cipher.final()]);
    await writeFile(this.secretsPath, `${JSON.stringify({
      algorithm,
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      data: data.toString("base64")
    }, null, 2)}\n`, { mode: 0o600 });
  }

  async get(name) {
    const value = (await this.readAll())[name];
    return typeof value === "string" ? value : null;
  }

  async has(name) { return Boolean(await this.get(name)); }

  async set(name, value) {
    const secrets = await this.readAll();
    secrets[name] = value;
    await this.writeAll(secrets);
  }

  async delete(name) {
    const secrets = await this.readAll();
    if (!Object.hasOwn(secrets, name)) return false;
    delete secrets[name];
    await this.writeAll(secrets);
    return true;
  }
}
