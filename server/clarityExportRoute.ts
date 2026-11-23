import type { Express } from "express";
import { and, eq } from "drizzle-orm";
import { clarityTruthLedger } from "../drizzle/schema";
import { getDb, getOrCreateBetaUser } from "./db";
import { authenticatePrivateRequest } from "./privateSession";
import { ENV } from "./_core/env";
import { clarityExportPublicKeyHex, signClarityReceiptHash } from "./clarityExport";

export function registerClarityExportRoute(app: Express) {
  app.get("/api/clarity/export/:sessionId", async (req, res) => {
    try {
      const user = ENV.betaAuthBypass ? await getOrCreateBetaUser() : await authenticatePrivateRequest(req);
      const sessionId = String(req.params.sessionId ?? "").trim();
      if (!sessionId || sessionId.length > 64) return res.status(400).json({ error: "Invalid Clarity session ID." });
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "XinUS data services are unavailable." });
      const [record] = await db.select().from(clarityTruthLedger).where(and(eq(clarityTruthLedger.userId, user.id), eq(clarityTruthLedger.sessionId, sessionId))).limit(1);
      if (!record) return res.status(404).json({ error: "Clarity receipt not found." });
      let envelope: unknown;
      try { envelope = JSON.parse(record.canonicalPayload); }
      catch { return res.status(500).json({ error: "Stored Clarity receipt is invalid." }); }
      const payload = {
        envelope,
        receipt_hash: record.hash,
        server_signature_ed25519_hex: signClarityReceiptHash(record.hash),
        server_pubkey_hex: clarityExportPublicKeyHex(),
      };
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="clarity-${sessionId}-verifiable-export.json"`);
      return res.status(200).send(JSON.stringify(payload, null, 2));
    } catch (error) {
      console.error("[Clarity Export] request failed", error);
      return res.status(401).json({ error: "Private XinUS authentication is required." });
    }
  });
}
