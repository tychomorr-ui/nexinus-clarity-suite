import { afterEach, describe, expect, it, vi } from "vitest";
import { recordWorkflowQuality } from "./workflowQuality";

const prior = process.env.XINUS_QUALITY_TELEMETRY;

afterEach(() => {
  if (prior === undefined) delete process.env.XINUS_QUALITY_TELEMETRY;
  else process.env.XINUS_QUALITY_TELEMETRY = prior;
  vi.restoreAllMocks();
});

describe("XinUS privacy-preserving workflow quality telemetry", () => {
  it("emits only workflow outcome and sensitivity", () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    recordWorkflowQuality({ workflow: "hidden_gems.appraise", outcome: "failure", dataSensitivity: "restricted" });
    expect(log).toHaveBeenCalledWith("[XinUS Quality]", "{\"workflow\":\"hidden_gems.appraise\",\"outcome\":\"failure\",\"sensitivity\":\"restricted\"}");
  });

  it("can be disabled without changing the workflow behavior", () => {
    process.env.XINUS_QUALITY_TELEMETRY = "false";
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    recordWorkflowQuality({ workflow: "clarity.run", outcome: "success" });
    expect(log).not.toHaveBeenCalled();
  });
});
