import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../drizzle/schema";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "./db";
import { ENV } from "./_core/env";

type PrivateSessionPayload = { openId: string; name: string };

function sessionSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createPrivateSessionToken(payload: PrivateSessionPayload, expiresInMs = ONE_YEAR_MS) {
  return new SignJWT({ openId: payload.openId, name: payload.name, issuer: "xinus-private" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(Math.floor((Date.now() + expiresInMs) / 1000))
    .sign(sessionSecret());
}

export async function authenticatePrivateRequest(req: Request): Promise<User> {
  const cookieValues = parseCookieHeader(req.headers.cookie || "");
  const bearer = typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ") ? req.headers.authorization.slice(7) : undefined;
  const token = cookieValues[COOKIE_NAME] || bearer;
  if (!token) throw new Error("Private session is missing.");
  const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
  if (payload.issuer !== "xinus-private" || typeof payload.openId !== "string" || !payload.openId.startsWith("xinus-private:")) throw new Error("Private session is invalid.");
  const user = await db.getUserByOpenId(payload.openId);
  if (!user) throw new Error("Private XinUS account is unavailable.");
  return user;
}
