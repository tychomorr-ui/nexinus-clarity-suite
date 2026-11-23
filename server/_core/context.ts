import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { getOrCreateBetaUser } from "../db";
import { authenticatePrivateRequest } from "../privateSession";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  if (ENV.betaAuthBypass) {
    try {
      user = await getOrCreateBetaUser();
    } catch (error) {
      console.error("[Beta Auth] Could not provision beta identity", error);
    }
  }

  if (!user) {
    try {
      user = await authenticatePrivateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
