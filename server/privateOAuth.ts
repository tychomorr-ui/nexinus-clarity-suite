import { and, eq, gt, isNull, lt } from "drizzle-orm";
import type { Express, Request, Response } from "express";
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { privateOAuthAccounts, privateOAuthCodes, users } from "../drizzle/schema";
import * as db from "./db";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { authenticatePrivateRequest, createPrivateSessionToken } from "./privateSession";

export const PRIVATE_OAUTH_CLIENT_ID = "xinus-private-web";
const MIN_PASSWORD_LENGTH = 12;

function requestOrigin(req: Request) {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = typeof forwardedHost === "string" ? forwardedHost : req.headers.host;
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = typeof forwardedProto === "string" ? forwardedProto : req.protocol || "https";
  return `${protocol}://${host ?? "localhost"}`;
}

function callbackFor(req: Request) {
  return `${requestOrigin(req)}/private-oauth/callback`;
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function pkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

function passwordsMatch(password: string, stored: string) {
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;
  const candidate = Buffer.from(scryptSync(password, salt, 64).toString("hex"), "hex");
  const expected = Buffer.from(digest, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function safeHandle(value: unknown) {
  return typeof value === "string" && /^[a-z0-9][a-z0-9._-]{2,79}$/i.test(value) ? value.trim().toLowerCase() : null;
}

async function storeOrThrow() {
  const store = await db.getDb();
  if (!store) throw new Error("Private identity services are temporarily unavailable.");
  return store;
}

async function establishSession(req: Request, res: Response, user: { openId: string; name: string | null }) {
  const token = await createPrivateSessionToken({ openId: user.openId, name: user.name || "XinUS member" }, ONE_YEAR_MS);
  res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
}

async function activeAccount(req: Request) {
  try {
    const user = await authenticatePrivateRequest(req);
    const store = await storeOrThrow();
    const [account] = await store.select().from(privateOAuthAccounts).where(and(eq(privateOAuthAccounts.userId, user.id), eq(privateOAuthAccounts.enabled, true))).limit(1);
    return account ?? null;
  } catch {
    return null;
  }
}

function authorizeParameters(req: Request) {
  const clientId = typeof req.query.client_id === "string" ? req.query.client_id : "";
  const redirectUri = typeof req.query.redirect_uri === "string" ? req.query.redirect_uri : "";
  const challenge = typeof req.query.code_challenge === "string" ? req.query.code_challenge : "";
  const method = typeof req.query.code_challenge_method === "string" ? req.query.code_challenge_method : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  if (clientId !== PRIVATE_OAUTH_CLIENT_ID || redirectUri !== callbackFor(req) || !/^[A-Za-z0-9_-]{43,128}$/.test(challenge) || method !== "S256" || !state) return null;
  return { redirectUri, challenge, state };
}

export const privateOAuthSecurity = { pkceChallenge, hashPassword, passwordsMatch, safeHandle };

export function registerPrivateOAuthRoutes(app: Express) {
  app.post("/api/private-oauth/register", async (req: Request, res: Response) => {
    const handle = safeHandle(req.body?.handle);
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 120) : null;
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase().slice(0, 320) : null;
    if (!handle || password.length < MIN_PASSWORD_LENGTH) return res.status(400).json({ error: `Use a valid handle and a password of at least ${MIN_PASSWORD_LENGTH} characters.` });
    try {
      const store = await storeOrThrow();
      const [existing] = await store.select().from(privateOAuthAccounts).where(eq(privateOAuthAccounts.handle, handle)).limit(1);
      if (existing) return res.status(409).json({ error: "That private XinUS handle is already in use." });
      const anyAccount = await store.select().from(privateOAuthAccounts).limit(1);
      const openId = `xinus-private:${randomUUID()}`;
      await store.insert(users).values({ openId, name: name || handle, email, loginMethod: "private_oauth", role: anyAccount[0] ? "user" : "admin", lastSignedIn: new Date() });
      const [user] = await store.select().from(users).where(eq(users.openId, openId)).limit(1);
      if (!user) throw new Error("Private account creation did not complete.");
      await store.insert(privateOAuthAccounts).values({ userId: user.id, handle, passwordHash: hashPassword(password) });
      await establishSession(req, res, user);
      return res.status(201).json({ success: true, firstPrivateAdmin: !anyAccount[0] });
    } catch (error) {
      console.error("[Private OAuth] Registration failed", error);
      return res.status(503).json({ error: "Private account setup is unavailable. Please retry shortly." });
    }
  });

  app.post("/api/private-oauth/login", async (req: Request, res: Response) => {
    const handle = safeHandle(req.body?.handle);
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!handle || !password) return res.status(400).json({ error: "Enter your private XinUS handle and password." });
    try {
      const store = await storeOrThrow();
      const [account] = await store.select().from(privateOAuthAccounts).where(and(eq(privateOAuthAccounts.handle, handle), eq(privateOAuthAccounts.enabled, true))).limit(1);
      if (!account || !passwordsMatch(password, account.passwordHash)) return res.status(401).json({ error: "That private XinUS sign-in was not recognized. Check your details and try again." });
      const [user] = await store.select().from(users).where(eq(users.id, account.userId)).limit(1);
      if (!user) return res.status(401).json({ error: "Your private XinUS account is not available. Please contact the administrator." });
      await establishSession(req, res, user);
      return res.json({ success: true });
    } catch (error) {
      console.error("[Private OAuth] Login failed", error);
      return res.status(503).json({ error: "Private sign-in is temporarily unavailable. Please retry shortly." });
    }
  });

  app.get("/api/private-oauth/authorize", async (req: Request, res: Response) => {
    const params = authorizeParameters(req);
    if (!params) return res.status(400).send("Invalid private OAuth authorization request.");
    const account = await activeAccount(req);
    if (!account) return res.redirect(302, `/private-sign-in?returnTo=${encodeURIComponent(req.originalUrl)}`);
    try {
      const store = await storeOrThrow();
      await store.delete(privateOAuthCodes).where(lt(privateOAuthCodes.expiresAt, new Date()));
      const code = randomBytes(32).toString("base64url");
      await store.insert(privateOAuthCodes).values({ codeHash: hash(code), accountId: account.id, redirectUri: params.redirectUri, codeChallenge: params.challenge, expiresAt: new Date(Date.now() + 5 * 60 * 1000) });
      const target = new URL(params.redirectUri);
      target.searchParams.set("code", code);
      target.searchParams.set("state", params.state);
      return res.redirect(302, target.toString());
    } catch (error) {
      console.error("[Private OAuth] Authorization failed", error);
      return res.redirect(302, "/private-sign-in?auth=retry");
    }
  });

  app.post("/api/private-oauth/token", async (req: Request, res: Response) => {
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    const verifier = typeof req.body?.code_verifier === "string" ? req.body.code_verifier : "";
    const redirectUri = typeof req.body?.redirect_uri === "string" ? req.body.redirect_uri : "";
    if (!code || !verifier || redirectUri !== callbackFor(req)) return res.status(400).json({ error: "The private OAuth authorization response is incomplete. Start sign-in again." });
    try {
      const store = await storeOrThrow();
      const [record] = await store.select().from(privateOAuthCodes).where(and(eq(privateOAuthCodes.codeHash, hash(code)), eq(privateOAuthCodes.redirectUri, redirectUri), gt(privateOAuthCodes.expiresAt, new Date()), isNull(privateOAuthCodes.usedAt))).limit(1);
      if (!record || !timingSafeEqual(Buffer.from(record.codeChallenge), Buffer.from(pkceChallenge(verifier)))) return res.status(401).json({ error: "This private OAuth sign-in link has expired or was already used. Please try again." });
      await store.update(privateOAuthCodes).set({ usedAt: new Date() }).where(eq(privateOAuthCodes.codeHash, record.codeHash));
      const [account] = await store.select().from(privateOAuthAccounts).where(and(eq(privateOAuthAccounts.id, record.accountId), eq(privateOAuthAccounts.enabled, true))).limit(1);
      const [user] = account ? await store.select().from(users).where(eq(users.id, account.userId)).limit(1) : [];
      if (!user) return res.status(401).json({ error: "Your private XinUS account is not available. Please sign in again." });
      await establishSession(req, res, user);
      return res.json({ success: true });
    } catch (error) {
      console.error("[Private OAuth] Token exchange failed", error);
      return res.status(503).json({ error: "Private OAuth token exchange is unavailable. Please retry shortly." });
    }
  });
}
