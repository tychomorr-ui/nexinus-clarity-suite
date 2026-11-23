export type WorkboardComparison = { id: string; a: string; b: string; conclusion: string; createdAt: string };
export type WorkboardCheckIn = { id: string; status: string; signal: string; nextStep: string; createdAt: string };
export type WorkboardItem = { id: string; title: string; details: string; complete: boolean; createdAt: string };
export type WorkboardCollectionRecord = { id: string; name: string; provenance: string; appraisalId?: number; createdAt: string };
export type StorageLike = { getItem(key: string): string | null; setItem(key: string, value: string): void };

export function clampSkillProgress(current: number, delta: number) {
  return Math.max(0, Math.min(100, current + delta));
}

export function canSaveComparison(a: string, b: string) {
  return Boolean(a.trim() && b.trim());
}

export function canSaveCheckIn(nextStep: string) {
  return Boolean(nextStep.trim());
}

export function formatDeadlineLabel(dueAt: Date | string, label: string) {
  return `${new Date(dueAt).toLocaleDateString()} · ${label}`;
}

export function createWorkboardItem(title: string, details: string, id: string, createdAt = new Date().toISOString()): WorkboardItem | null {
  if (!title.trim()) return null;
  return { id, title: title.trim(), details: details.trim(), complete: false, createdAt };
}

export function toggleWorkboardItem(items: WorkboardItem[], id: string) {
  return items.map(item => item.id === id ? { ...item, complete: !item.complete } : item);
}

export function removeWorkboardItem(items: WorkboardItem[], id: string) {
  return items.filter(item => item.id !== id);
}

export function createComparison(a: string, b: string, conclusion: string, id: string, createdAt = new Date().toISOString()): WorkboardComparison | null {
  if (!canSaveComparison(a, b)) return null;
  return { id, a: a.trim(), b: b.trim(), conclusion: conclusion.trim(), createdAt };
}

export function createCheckIn(status: string, signal: string, nextStep: string, id: string, createdAt = new Date().toISOString()): WorkboardCheckIn | null {
  if (!canSaveCheckIn(nextStep)) return null;
  return { id, status, signal: signal.trim(), nextStep: nextStep.trim(), createdAt };
}

export function createCollectionRecord(name: string, provenance: string, appraisalId: string, id: string, createdAt = new Date().toISOString()): WorkboardCollectionRecord | null {
  if (!name.trim()) return null;
  return { id, name: name.trim(), provenance: provenance.trim(), appraisalId: appraisalId ? Number(appraisalId) : undefined, createdAt };
}

export function canReviewCase(caseId: number | null | undefined): caseId is number {
  return typeof caseId === "number" && caseId > 0;
}

export function workboardStorageKey(productKey: string) {
  return `xinus:workboard:${productKey}:v1`;
}

export function readWorkboardItems(storage: StorageLike, productKey: string): WorkboardItem[] {
  try {
    const parsed = JSON.parse(storage.getItem(workboardStorageKey(productKey)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(item => item && typeof item.title === "string") as WorkboardItem[] : [];
  } catch {
    return [];
  }
}

export function writeWorkboardItems(storage: StorageLike, productKey: string, items: WorkboardItem[]) {
  storage.setItem(workboardStorageKey(productKey), JSON.stringify(items));
}
