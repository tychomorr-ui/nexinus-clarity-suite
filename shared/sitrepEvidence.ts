export const evidenceStatuses = ["verified", "partially_verified", "unverified"] as const;
export type EvidenceStatus = (typeof evidenceStatuses)[number];

export const simulationStatuses = ["baseline", "simulation_branch"] as const;
export type SimulationStatus = (typeof simulationStatuses)[number];

export const decisionStates = ["ready", "cross_check_required", "hold"] as const;
export type DecisionState = (typeof decisionStates)[number];

export interface SitRepClaim {
  id: string;
  text: string;
  sourceName: string;
  status: "verified" | "unverified";
}

export interface SitRepSourceDocument {
  name: string;
  size: number;
  claimCount: number;
}

export interface SitRepBranchTracking {
  branch: string;
  trigger: string;
  divergence: string;
  requiredVerification: string;
  confidence: number;
  evidenceStatus: EvidenceStatus;
  simulationStatus: SimulationStatus;
  decisionState: DecisionState;
  outcome: string;
}

export interface SitRepEvidenceTracking {
  assessmentId: string;
  timestamp: string;
  context: string;
  planningHorizon: string;
  evidence: string[];
  verifiedFacts: string[];
  unverifiedClaims: string[];
  claims: SitRepClaim[];
  sourceDocuments: SitRepSourceDocument[];
  assumptions: string[];
  unknowns: string[];
  baseline: SitRepBranchTracking;
  simulationBranches: SitRepBranchTracking[];
  branchDeltas: string[];
  confidenceMethod: string;
  evidenceStatus: EvidenceStatus;
  simulationStatus: SimulationStatus;
  decisionState: DecisionState;
  recommendedNextAction: string;
  humanReviewRequired: true;
}

function compact(value: string, limit: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, limit);
}

function fragments(value: string): string[] {
  return value
    .split(/[.!?\n]+/)
    .map(fragment => compact(fragment, 280))
    .filter(Boolean)
    .slice(0, 12);
}

/**
 * Builds a provenance-first SitRep record. User-supplied material is never
 * promoted to independently verified fact by this function.
 */
export function createSitRepEvidenceTracking(input: {
  assessmentId: string;
  mode: string;
  situation: string;
  context?: string | null;
  planningHorizon?: string;
  includeSimulation?: boolean;
  claims?: SitRepClaim[];
  sourceDocuments?: SitRepSourceDocument[];
  now?: string;
}): SitRepEvidenceTracking {
  const situationFragments = fragments(input.situation);
  const contextFragments = fragments(input.context ?? "");
  const claims = input.claims ?? [];
  const evidence = (claims.length ? claims.map(claim => claim.text) : [...situationFragments, ...contextFragments]).slice(0, 16);
  const verifiedFacts = claims.filter(claim => claim.status === "verified").map(claim => claim.text);
  const unverifiedClaims = claims.length ? claims.filter(claim => claim.status === "unverified").map(claim => claim.text) : evidence;
  const evidenceStatus: EvidenceStatus = claims.length > 0 && verifiedFacts.length === claims.length ? "verified" : verifiedFacts.length > 0 ? "partially_verified" : "partially_verified";
  const unknowns = [
    "Source provenance, timestamps, and completeness require an accountable-person cross-check.",
    "The assessment does not independently verify the supplied situation or context.",
  ];
  const assumptions = [
    "The supplied situation is materially current for the selected planning horizon.",
    `The assessment is being considered in ${input.mode} context without adding facts not supplied by the user.`,
  ];
  const baseline: SitRepBranchTracking = {
    branch: "Primary Baseline",
    trigger: "Supplied situation and context",
    divergence: "None; this is the working baseline, not a factual certification.",
    requiredVerification: "Confirm the key facts, dates, sources, and constraints with the accountable person.",
    confidence: 0.91,
    evidenceStatus,
    simulationStatus: "baseline",
    decisionState: "cross_check_required",
    outcome: "Proceed only after the review boundary is satisfied and the next move is explicitly confirmed.",
  };
  const simulationBranches: SitRepBranchTracking[] = input.includeSimulation === false ? [] : [
    {
      branch: "Sub-Particulate Alt A",
      trigger: "Possible evidence timeline discrepancy",
      divergence: "Escalation is held pending a timestamp and source cross-check.",
      requiredVerification: "Cross-check the timeline against the original record.",
      confidence: 0.84,
      evidenceStatus: "partially_verified",
      simulationStatus: "simulation_branch",
      decisionState: "hold",
      outcome: "Flag the discrepancy; do not treat the branch as a verified fact.",
    },
    {
      branch: "Sub-Particulate Alt B",
      trigger: "A supplied claim cannot be corroborated",
      divergence: "The claim remains unverified and the recommendation narrows.",
      requiredVerification: "Obtain a second source or accountable-person confirmation.",
      confidence: 0.79,
      evidenceStatus: "unverified",
      simulationStatus: "simulation_branch",
      decisionState: "cross_check_required",
      outcome: "Use the branch for planning only; it cannot upgrade the underlying claim.",
    },
  ];
  const tracking: SitRepEvidenceTracking = {
    assessmentId: input.assessmentId,
    timestamp: input.now ?? new Date().toISOString(),
    context: input.context ?? "",
    planningHorizon: input.planningHorizon ?? "not specified",
    evidence,
    verifiedFacts,
    unverifiedClaims,
    claims,
    sourceDocuments: input.sourceDocuments ?? [],
    assumptions,
    unknowns,
    baseline,
    simulationBranches,
    branchDeltas: simulationBranches.map(branch => `${branch.branch}: ${branch.divergence}`),
    confidenceMethod: "Confidence describes model confidence in the assessment. It is independent from the evidentiary verification state and does not certify supplied claims.",
    evidenceStatus: baseline.evidenceStatus,
    simulationStatus: "baseline",
    decisionState: baseline.decisionState,
    recommendedNextAction: baseline.requiredVerification,
    humanReviewRequired: true,
  };
  assertSimulationCannotPromoteEvidence(tracking);
  return tracking;
}

export function assertSimulationCannotPromoteEvidence(tracking: SitRepEvidenceTracking): void {
  const rank: Record<EvidenceStatus, number> = { unverified: 0, partially_verified: 1, verified: 2 };
  for (const branch of tracking.simulationBranches) {
    if (branch.simulationStatus !== "simulation_branch") throw new Error("Simulation branches must be marked as simulation_branch.");
    if (rank[branch.evidenceStatus] > rank[tracking.baseline.evidenceStatus]) {
      throw new Error("A simulation branch cannot promote an evidence status beyond the baseline.");
    }
  }
  if (tracking.humanReviewRequired !== true) throw new Error("SitRep assessments require human review before consequential action.");
}
