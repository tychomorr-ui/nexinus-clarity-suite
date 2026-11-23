import { describe, expect, it } from "vitest";
import { assertSimulationCannotPromoteEvidence, createSitRepEvidenceTracking } from "../shared/sitrepEvidence";

describe("SitRep evidence boundary", () => {
  it("keeps confidence separate from the evidence status", () => {
    const tracking = createSitRepEvidenceTracking({
      assessmentId: "sitrep_test_1",
      mode: "general",
      situation: "A supplied timeline may be incomplete.",
      planningHorizon: "this week",
    });
    expect(tracking.baseline.confidence).toBe(0.91);
    expect(tracking.evidenceStatus).toBe("partially_verified");
    expect(tracking.baseline.simulationStatus).toBe("baseline");
    expect(tracking.humanReviewRequired).toBe(true);
  });

  it("rejects a simulation branch that promotes evidence status", () => {
    const tracking = createSitRepEvidenceTracking({
      assessmentId: "sitrep_test_2",
      mode: "general",
      situation: "The source record needs a timestamp check.",
    });
    tracking.simulationBranches[0]!.evidenceStatus = "verified";
    expect(() => assertSimulationCannotPromoteEvidence(tracking)).toThrow(/cannot promote/);
  });

  it("preserves source documents and per-claim human review state", () => {
    const tracking = createSitRepEvidenceTracking({
      assessmentId: "sitrep_test_3",
      mode: "general",
      situation: "A source-backed timeline.",
      claims: [
        { id: "claim-1", text: "The meeting occurred Monday.", sourceName: "timeline.txt", status: "verified" },
        { id: "claim-2", text: "The outcome was favorable.", sourceName: "timeline.txt", status: "unverified" },
      ],
      sourceDocuments: [{ name: "timeline.txt", size: 128, claimCount: 2 }],
    });
    expect(tracking.sourceDocuments[0]?.name).toBe("timeline.txt");
    expect(tracking.verifiedFacts).toEqual(["The meeting occurred Monday."]);
    expect(tracking.unverifiedClaims).toEqual(["The outcome was favorable."]);
    expect(tracking.evidenceStatus).toBe("partially_verified");
  });
});
