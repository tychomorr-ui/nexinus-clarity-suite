import { describe, expect, it } from "vitest";
import { EVIDENCE_WORK_OBJECTS } from "@/components/ProductWorkboard";
import { canReviewCase, canSaveCheckIn, canSaveComparison, clampSkillProgress, createCheckIn, createCollectionRecord, createComparison, createWorkboardItem, formatDeadlineLabel, readWorkboardItems, removeWorkboardItem, toggleWorkboardItem, writeWorkboardItems } from "./workboard";

describe("XinUS expanded workboard behavior", () => {
  it("names a distinct evidence-aware work object for every standalone product", () => {
    expect(Object.values(EVIDENCE_WORK_OBJECTS).map(item => item.label)).toEqual([
      "Decision Thread", "Skill Loop", "Appraisal Evidence Packet", "Case Timeline", "Support Plan Check-in", "Follow-through Review", "SitRep Decision Brief", "PAM Continuity Card",
    ]);
  });

  it("keeps GED skill progress within a usable 0–100 range", () => {
    expect(clampSkillProgress(95, 10)).toBe(100);
    expect(clampSkillProgress(5, -10)).toBe(0);
    expect(clampSkillProgress(40, 10)).toBe(50);
  });

  it("requires both sides before saving a collection or scenario comparison", () => {
    expect(canSaveComparison("Finding A", "Finding B")).toBe(true);
    expect(canSaveComparison("", "Finding B")).toBe(false);
    expect(canSaveComparison("Scenario A", "   ")).toBe(false);
  });

  it("requires a concrete next step for Recovery and Task Force check-ins", () => {
    expect(canSaveCheckIn("Confirm the support meeting")).toBe(true);
    expect(canSaveCheckIn("   ")).toBe(false);
  });

  it("formats PD Pro deadline review labels consistently", () => {
    expect(formatDeadlineLabel("2026-10-14T00:00:00.000Z", "File motion")).toContain("File motion");
    expect(canReviewCase(17)).toBe(true);
    expect(canReviewCase(null)).toBe(false);
  });

  it("creates, completes, and removes a device-persistent workboard item", () => {
    const item = createWorkboardItem("Review notes", "Before the meeting", "item-1", "2026-08-12T00:00:00.000Z");
    expect(item).toMatchObject({ id: "item-1", complete: false, title: "Review notes" });
    const completed = toggleWorkboardItem([item!], "item-1");
    expect(completed[0]?.complete).toBe(true);
    expect(removeWorkboardItem(completed, "item-1")).toEqual([]);
    expect(createWorkboardItem("   ", "", "item-2")).toBeNull();
  });

  it("persists and restores ProductWorkboard items by app-specific storage key", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    const item = createWorkboardItem("Study fractions", "20 minutes", "ged-1", "2026-08-12T00:00:00.000Z")!;
    writeWorkboardItems(storage, "ged_tutor", [item]);
    expect(readWorkboardItems(storage, "ged_tutor")).toEqual([item]);
    expect(readWorkboardItems(storage, "sitrep")).toEqual([]);
    values.set("xinus:workboard:clarity:v1", "invalid");
    expect(readWorkboardItems(storage, "clarity")).toEqual([]);
  });

  it("creates structured collection, comparison, and check-in records only with valid action data", () => {
    expect(createCollectionRecord("Coin", "Estate sale", "12", "collection-1")).toMatchObject({ appraisalId: 12, name: "Coin" });
    expect(createCollectionRecord("", "", "", "collection-2")).toBeNull();
    expect(createComparison("Option A", "Option B", "Verify costs", "comparison-1")).toMatchObject({ a: "Option A", b: "Option B" });
    expect(createComparison("", "Option B", "", "comparison-2")).toBeNull();
    expect(createCheckIn("steady", "Support call", "Call sponsor", "checkin-1")).toMatchObject({ status: "steady", nextStep: "Call sponsor" });
    expect(createCheckIn("steady", "", " ", "checkin-2")).toBeNull();
  });

  it("supports the expanded GED Tutor, Hidden Gems, SitRep, Recovery, and Task Force follow-through transitions", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    const studyItem = createWorkboardItem("Practice fractions", "Math foundations", "ged-plan", "2026-08-12T00:00:00.000Z")!;
    writeWorkboardItems(storage, "ged_tutor", [studyItem]);
    expect(readWorkboardItems(storage, "ged_tutor")[0]?.title).toBe("Practice fractions");
    expect(clampSkillProgress(80, 10)).toBe(90);

    expect(createCollectionRecord("Pocket watch", "Family estate", "14", "gem-record")).toMatchObject({ appraisalId: 14 });
    expect(createComparison("Watch A", "Watch B", "Seek an expert", "gem-compare")).toMatchObject({ conclusion: "Seek an expert" });
    expect(createComparison("Travel tomorrow", "Delay travel", "Recheck weather", "sitrep-compare")).toMatchObject({ a: "Travel tomorrow" });
    expect(createCheckIn("needs_support", "Missed meeting", "Contact support coordinator", "recovery-checkin")).toMatchObject({ status: "needs_support" });
    expect(createCheckIn("high_friction", "Pattern alert", "Review safe next step", "task-force-checkin")).toMatchObject({ status: "high_friction" });
  });
});
