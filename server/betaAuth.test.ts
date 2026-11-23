import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";

describe("XinUS beta access", () => {
  it("enables the temporary auth bypass unless explicitly disabled", () => {
    expect(ENV.betaAuthBypass).toBe(true);
  });
});
