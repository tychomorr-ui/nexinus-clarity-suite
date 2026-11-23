import { decodeJwt, jwtVerify } from "jose";
import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";
import { privateOAuthSecurity } from "./privateOAuth";
import { createPrivateSessionToken } from "./privateSession";

describe("XinUS private OAuth foundation", () => {
  it("uses strict private handles, salted password verification, and a stable PKCE challenge", () => {
    expect(privateOAuthSecurity.safeHandle("Private.Member_01")).toBe("private.member_01");
    expect(privateOAuthSecurity.safeHandle("no spaces allowed")).toBeNull();
    const hash = privateOAuthSecurity.hashPassword("a secure private password");
    expect(privateOAuthSecurity.passwordsMatch("a secure private password", hash)).toBe(true);
    expect(privateOAuthSecurity.passwordsMatch("incorrect password", hash)).toBe(false);
    expect(privateOAuthSecurity.pkceChallenge("verifier-123")).toBe("Ds3NpaREu9I2EYq6l0l3ZkFyv_Gt5O4EpGD6cZlY0Kg");
  });

  it("issues locally signed private sessions without a hosted identity provider claim", async () => {
    const token = await createPrivateSessionToken({ openId: "xinus-private:person-1", name: "Private person" });
    const verified = await jwtVerify(token, new TextEncoder().encode(ENV.cookieSecret), { algorithms: ["HS256"] });
    expect(verified.payload).toMatchObject({ openId: "xinus-private:person-1", issuer: "xinus-private" });
    expect(decodeJwt(token).issuer).toBe("xinus-private");
  });
});
