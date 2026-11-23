import { describe, it, expect } from "vitest";
import { runDimensionalSubParticulateBatch } from "./subParticulateBatch";

describe("21-Axis Sub-Particulate Dimensional Analyzer", () => {
  it("processes cases with 21-axis vectors, waveform probability, constraint folding, and delta logs", async () => {
    const inputs = [
      {
        caseId: "DIM-201",
        evidenceText: "Verified witness statement corroborates timeline.",
        alternativeVariable: "Assume witness timeline shifted by 2 hours.",
        enableEntanglement: true
      },
      {
        caseId: "DIM-202",
        evidenceText: "Subject intake contains unverified medical prescription claims.",
        alternativeVariable: "Bypass consent protocol for review.",
        enableEntanglement: false
      }
    ];

    const report = await runDimensionalSubParticulateBatch(inputs);
    expect(report.totalCases).toBe(2);
    expect(report.results.length).toBe(2);
    expect(report.immutableDeltaLogs.length).toBe(2);

    const res1 = report.results.find(r => r.caseId === "DIM-201");
    expect(res1?.constraintPassed).toBe(true);
    expect(res1?.vectorCoordinates.length).toBe(21);
    expect(res1?.waveformProbability).toBeDefined();
    expect(res1?.entangledCaseIds).toContain("DIM-202");

    const res2 = report.results.find(r => r.caseId === "DIM-202");
    expect(res2?.constraintPassed).toBe(false);
    expect(res2?.violationReason).toBeDefined();
  });
});
