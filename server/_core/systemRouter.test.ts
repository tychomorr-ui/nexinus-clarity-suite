import { describe, expect, it } from "vitest";
import { systemRouter } from "./systemRouter";

describe("XinUS non-secret AI readiness", () => {
  it("reports provider policy without exposing a credential, endpoint, or model payload", async () => {
    const caller = systemRouter.createCaller({} as never);
    const status = await caller.aiReadiness();
    expect(status).toMatchObject({ provider: expect.any(String), ready: expect.any(Boolean), isCloud: expect.any(Boolean), modelConfigured: expect.any(Boolean), restrictedDataAllowed: expect.any(Boolean) });
    expect(Object.keys(status)).not.toContain("apiKey");
    expect(Object.keys(status)).not.toContain("authorization");
    expect(Object.keys(status)).not.toContain("apiUrl");
  });
});
