import { COOKIE_NAME, ONE_YEAR_MS, decodeOAuthState, encodeOAuthState } from "@shared/const";
import { and, eq, lt } from "drizzle-orm";
import type { Express, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { oauthLoginStates } from "../../drizzle/schema";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function requestOrigin(req: Request) {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = typeof forwardedHost === "string" ? forwardedHost : req.headers.host;
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = typeof forwardedProto === "string" ? forwardedProto : req.protocol || "https";
  return `${protocol}://${host ?? "localhost"}`;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/start", async (req: Request, res: Response) => {
    try {
      const store = await db.getDb();
      if (!store) throw new Error("OAuth state storage is unavailable.");
      const nonce = randomUUID();
      const redirectUri = `${requestOrigin(req)}/api/oauth/callback`;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await store.delete(oauthLoginStates).where(lt(oauthLoginStates.expiresAt, new Date()));
      await store.insert(oauthLoginStates).values({ nonce, redirectUri, expiresAt });
      res.json({ state: encodeOAuthState({ redirectUri, nonce }), redirectUri });
    } catch (error) {
      console.error("[OAuth] Could not initialize sign-in", error);
      res.status(503).json({ error: "Unable to start sign-in. Please try again." });
    }
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    const decoded = decodeOAuthState(state);
    const store = await db.getDb();
    const expected = decoded.nonce && store ? await store.select().from(oauthLoginStates).where(and(eq(oauthLoginStates.nonce, decoded.nonce), eq(oauthLoginStates.redirectUri, decoded.redirectUri))).limit(1) : [];
    if (!decoded.nonce || !expected[0] || expected[0].expiresAt.getTime() < Date.now()) {
      if (decoded.nonce && store) await store.delete(oauthLoginStates).where(eq(oauthLoginStates.nonce, decoded.nonce));
      res.redirect(302, "/?auth=retry");
      return;
    }
    await store!.delete(oauthLoginStates).where(eq(oauthLoginStates.nonce, decoded.nonce));

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
