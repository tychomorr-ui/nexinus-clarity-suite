import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const ENV_KEYS = ["XINUS_PRIVATE_STORAGE_DIR", "BUILT_IN_FORGE_API_URL", "BUILT_IN_FORGE_API_KEY"] as const;
const original = Object.fromEntries(ENV_KEYS.map(key => [key, process.env[key]]));
const directories: string[] = [];

afterEach(async () => {
  for (const key of ENV_KEYS) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.unstubAllGlobals();
  vi.resetModules();
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

async function loadStorage() {
  vi.resetModules();
  return import("./storage");
}

describe("XinUS private storage fallback", () => {
  it("writes and reads a private local object when Forge is unavailable", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "xinus-storage-"));
    directories.push(directory);
    process.env.XINUS_PRIVATE_STORAGE_DIR = directory;
    delete process.env.BUILT_IN_FORGE_API_URL;
    delete process.env.BUILT_IN_FORGE_API_KEY;
    const { isLocalPrivateObjectOwnedBy, readLocalPrivateObject, storagePut } = await loadStorage();

    const stored = await storagePut("hidden-gems/44/object.png", Buffer.from("photo-bytes"), "image/png");
    expect(stored).toMatchObject({ key: expect.stringMatching(/^local\/hidden-gems\/44\/object_[a-f0-9]{8}\.png$/), url: expect.stringMatching(/^\/manus-storage\/local\//) });
    expect(isLocalPrivateObjectOwnedBy(stored.key, 44)).toBe(true);
    expect(isLocalPrivateObjectOwnedBy(stored.key, 45)).toBe(false);
    expect(isLocalPrivateObjectOwnedBy("local/hidden-gems/44/../other.png", 44)).toBe(false);
    await expect(readLocalPrivateObject(stored.key)).resolves.toEqual({ data: Buffer.from("photo-bytes"), contentType: "image/png" });
  });

  it("falls back privately when Forge responds with non-JSON content", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "xinus-storage-"));
    directories.push(directory);
    process.env.XINUS_PRIVATE_STORAGE_DIR = directory;
    process.env.BUILT_IN_FORGE_API_URL = "https://forge.example.test";
    process.env.BUILT_IN_FORGE_API_KEY = "server-only-token";
    const fetchMock = vi.fn().mockResolvedValue(new Response("<html>unavailable</html>", { status: 200, headers: { "content-type": "text/html" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { storagePut } = await loadStorage();

    await expect(storagePut("hidden-gems/44/object.png", Buffer.from("photo-bytes"), "image/png")).resolves.toMatchObject({ key: expect.stringMatching(/^local\//) });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
