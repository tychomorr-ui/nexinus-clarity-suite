export type WorkflowQualityEvent = {
  workflow: string;
  outcome: "success" | "failure" | "fallback";
  dataSensitivity?: "standard" | "restricted";
};

/**
 * Emits only aggregate-safe operational signals. Never add prompts, responses,
 * photo bytes, case material, user identifiers, request addresses, or secrets.
 */
export function recordWorkflowQuality(event: WorkflowQualityEvent) {
  if (process.env.XINUS_QUALITY_TELEMETRY === "false") return;
  console.info("[XinUS Quality]", JSON.stringify({
    workflow: event.workflow,
    outcome: event.outcome,
    sensitivity: event.dataSensitivity ?? "standard",
  }));
}
