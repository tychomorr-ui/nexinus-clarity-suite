import type { Express } from "express";
import { ENV } from "./env";
import { isLocalPrivateObjectOwnedBy, isLocalPrivateStorageKey, readLocalPrivateObject } from "../storage";
import { authenticatePrivateRequest } from "../privateSession";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (isLocalPrivateStorageKey(key)) {
      try {
        const user = await authenticatePrivateRequest(req);
        if (!isLocalPrivateObjectOwnedBy(key, user.id)) {
          res.status(403).send("This private storage object is not available to your account.");
          return;
        }
        const object = await readLocalPrivateObject(key);
        res.set({ "Cache-Control": "no-store", "Content-Type": object.contentType });
        res.status(200).send(object.data);
      } catch {
        res.status(404).send("Private storage object not found.");
      }
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        console.error(`[StorageProxy] Forge signing request failed (${forgeResp.status}).`);
        res.status(502).send("Storage backend error");
        return;
      }

      const responseType = forgeResp.headers.get("content-type") ?? "";
      if (!responseType.includes("application/json")) {
        res.status(502).send("Storage backend returned an invalid response.");
        return;
      }
      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
