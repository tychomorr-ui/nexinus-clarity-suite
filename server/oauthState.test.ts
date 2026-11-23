import { describe, expect, it } from "vitest";
import { decodeOAuthState, encodeOAuthState } from "../shared/const";

describe("XinUS durable OAuth state", () => {
  it("round-trips the callback redirect and one-time nonce used by the durable sign-in flow", () => {
    const state = encodeOAuthState({ redirectUri: "https://xinus.example.test/api/oauth/callback", nonce: "nonce-123" });
    expect(decodeOAuthState(state)).toEqual({ redirectUri: "https://xinus.example.test/api/oauth/callback", nonce: "nonce-123" });
  });

  it("returns an empty redirect for malformed state so the callback can safely direct the user to retry", () => {
    expect(decodeOAuthState("not-valid-base64")).toEqual({ redirectUri: "" });
  });

  it("continues to decode legacy redirect-only state without a nonce", () => {
    const legacy = btoa("https://xinus.example.test/api/oauth/callback");
    expect(decodeOAuthState(legacy)).toEqual({ redirectUri: "https://xinus.example.test/api/oauth/callback" });
  });
});
