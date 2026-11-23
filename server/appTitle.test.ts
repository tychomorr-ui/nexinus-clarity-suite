import { describe, expect, it } from "vitest";

describe("managed application title", () => {
  it("uses XinUS Clarity Suite across the project environment", () => {
    expect(process.env.VITE_APP_TITLE).toBe("XinUS Clarity Suite");
  });
});
