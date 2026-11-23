import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ENV } from "./_core/env";

type ForgeConfig = { forgeUrl: string; forgeKey: string };
type PrivateObject = { data: Buffer; contentType: string };

const CONTENT_TYPES: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".webp": "image/webp",
};

function getForgeConfig(): ForgeConfig | undefined {
  const forgeUrl = ENV.forgeApiUrl.trim();
  const forgeKey = ENV.forgeApiKey.trim();
  return forgeUrl && forgeKey ? { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey } : undefined;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "").replace(/\.\.(?:\/|\\)/g, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function privateStorageRoot() {
  return ENV.privateStorageDir.trim();
}

export function isLocalPrivateStorageKey(key: string) {
  return key.startsWith("local/");
}

/** Local fallback images remain private to the account whose numeric ID is in the object key. */
export function isLocalPrivateObjectOwnedBy(key: string, userId: number) {
  return key.startsWith(`local/hidden-gems/${userId}/`) && !key.includes("..") && !key.includes("\\");
}

function localFilePath(key: string) {
  const root = privateStorageRoot();
  if (!root) throw new Error("Private fallback storage is not configured.");
  const relative = normalizeKey(key.replace(/^local\//, ""));
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, relative);
  if (!resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error("Invalid private storage key.");
  return resolvedPath;
}

async function putLocalPrivateObject(key: string, data: Buffer | Uint8Array | string, contentType: string) {
  const localKey = `local/${key}`;
  const destination = localFilePath(localKey);
  await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  await writeFile(destination, data, { mode: 0o600 });
  return { key: localKey, url: `/manus-storage/${localKey}`, contentType };
}

async function putForgeObject(key: string, data: Buffer | Uint8Array | string, contentType: string, config: ForgeConfig) {
  const presignUrl = new URL("v1/storage/presign/put", `${config.forgeUrl}/`);
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, { headers: { Authorization: `Bearer ${config.forgeKey}` } });
  const responseType = presignResp.headers.get("content-type") ?? "";
  if (!presignResp.ok || !responseType.includes("application/json")) {
    throw new Error(`Forge storage presign did not return JSON (${presignResp.status}).`);
  }
  const payload = await presignResp.json() as { url?: string };
  if (!payload.url) throw new Error("Forge storage presign returned no upload URL.");
  const body = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data as any], { type: contentType });
  const uploadResp = await fetch(payload.url, { method: "PUT", headers: { "Content-Type": contentType }, body });
  if (!uploadResp.ok) throw new Error(`Private storage upload failed (${uploadResp.status}).`);
  return { key, url: `/manus-storage/${key}` };
}

export async function storagePut(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream"): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const forge = getForgeConfig();
  if (forge) {
    try {
      return await putForgeObject(key, data, contentType, forge);
    } catch (error) {
      if (!privateStorageRoot()) throw error;
      console.warn("[Storage] Forge upload unavailable; using configured private fallback storage.");
    }
  }
  if (privateStorageRoot()) {
    const stored = await putLocalPrivateObject(key, data, contentType);
    return { key: stored.key, url: stored.url };
  }
  throw new Error("Private file storage is unavailable. Please retry after the XinUS storage service is restored.");
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  if (isLocalPrivateStorageKey(key)) throw new Error("Local private objects are streamed through XinUS and do not expose signed URLs.");
  const config = getForgeConfig();
  if (!config) throw new Error("Private storage signing is unavailable.");
  const getUrl = new URL("v1/storage/presign/get", `${config.forgeUrl}/`);
  getUrl.searchParams.set("path", key);
  const response = await fetch(getUrl, { headers: { Authorization: `Bearer ${config.forgeKey}` } });
  const responseType = response.headers.get("content-type") ?? "";
  if (!response.ok || !responseType.includes("application/json")) throw new Error(`Private storage signing did not return JSON (${response.status}).`);
  const payload = await response.json() as { url?: string };
  if (!payload.url) throw new Error("Private storage signing returned no URL.");
  return payload.url;
}

export async function readLocalPrivateObject(key: string): Promise<PrivateObject> {
  if (!isLocalPrivateStorageKey(key)) throw new Error("Not a local private storage key.");
  const destination = localFilePath(key);
  const extension = path.extname(destination).toLowerCase();
  return { data: await readFile(destination), contentType: CONTENT_TYPES[extension] ?? "application/octet-stream" };
}
