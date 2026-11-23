import { describe, it, expect } from "vitest";
import { runDimensionalSubParticulateBatch } from "./subParticulateBatch";

describe("XinUS Valkyrie Adjudication & Dimensional Synthesis", () => {
  it("runs dimensional simulation and prepares defensive briefing packages", async () => {
    const report = await runDimensionalSubParticulateBatch([
      {
        caseId: "VAL-001",
        evidenceText: "Defendant surrendered documentation at checkpoint A.",
        alternativeVariable: "Assert documentation was delayed by transit.",
        enableEntanglement: true
      }
    ]);

    expect(report.totalCases).toBe(1);
    expect(report.results[0].vectorCoordinates.length).toBe(21);
    expect(report.immutableDeltaLogs.length).toBe(1);
  });
});
