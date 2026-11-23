import { describe, expect, it } from "vitest";
import { formatGedMath } from "./gedMath";

describe("formatGedMath", () => {
  it("converts raw tutor LaTeX into readable GED math", () => {
    expect(formatGedMath("$$2 < \\sqrt{6} < 3$$ and \\frac{3}{4} \\geq \\frac{2}{3}"))
      .toBe("2 < √(6) < 3 and 3/4 ≥ 2/3");
  });
});
