import { desc, eq, inArray } from "drizzle-orm";
import { gemAppraisals, gedSessions, recidivismSubjects, recidivismTriggers } from "../../drizzle/schema";
import { getDb } from "../db";
import { getEntitledProducts } from "../entitlements";
import { protectedProcedure, router } from "../_core/trpc";

function appraisalTitle(result: unknown) {
  return result && typeof result === "object" && "title" in result && typeof (result as { title?: unknown }).title === "string" ? (result as { title: string }).title : "Appraisal recorded";
}

export const dashboardRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Private XinUS activity services are unavailable.");
    const products = await getEntitledProducts(ctx.user.id, ctx.user.role);
    const canUseGed = products.includes("ged_tutor");
    const canUseGems = products.includes("hidden_gems");
    const canUseTaskForce = products.includes("task_force_pro");

    const [ged, gems, subjects] = await Promise.all([
      canUseGed ? db.select({ id: gedSessions.id, subject: gedSessions.subject, title: gedSessions.title, updatedAt: gedSessions.updatedAt }).from(gedSessions).where(eq(gedSessions.userId, ctx.user.id)).orderBy(desc(gedSessions.updatedAt)).limit(4) : Promise.resolve([]),
      canUseGems ? db.select({ id: gemAppraisals.id, result: gemAppraisals.result, createdAt: gemAppraisals.createdAt }).from(gemAppraisals).where(eq(gemAppraisals.userId, ctx.user.id)).orderBy(desc(gemAppraisals.createdAt)).limit(4) : Promise.resolve([]),
      canUseTaskForce ? db.select({ id: recidivismSubjects.id, name: recidivismSubjects.name, riskScore: recidivismSubjects.riskScore, streak: recidivismSubjects.streak, updatedAt: recidivismSubjects.updatedAt }).from(recidivismSubjects).where(eq(recidivismSubjects.ownerUserId, ctx.user.id)).orderBy(desc(recidivismSubjects.updatedAt)).limit(6) : Promise.resolve([]),
    ]);
    const subjectIds = subjects.map(subject => subject.id);
    const triggers = subjectIds.length ? await db.select({ id: recidivismTriggers.id, subjectId: recidivismTriggers.subjectId, situation: recidivismTriggers.situation, occurredAt: recidivismTriggers.occurredAt }).from(recidivismTriggers).where(inArray(recidivismTriggers.subjectId, subjectIds)).orderBy(desc(recidivismTriggers.occurredAt)).limit(4) : [];
    const subjectName = new Map(subjects.map(subject => [subject.id, subject.name]));
    const recentActivity = [
      ...ged.map(session => ({ id: `ged-${session.id}`, product: "GED Tutor", kind: "Study session", title: session.title, detail: session.subject.toUpperCase(), at: session.updatedAt })),
      ...gems.map(appraisal => ({ id: `gems-${appraisal.id}`, product: "Hidden Gems", kind: "Appraisal", title: appraisalTitle(appraisal.result), detail: "Private appraisal record", at: appraisal.createdAt })),
      ...triggers.map(trigger => ({ id: `task-${trigger.id}`, product: "Task Force Pro", kind: "Operational signal", title: trigger.situation, detail: subjectName.get(trigger.subjectId) || "Private subject", at: trigger.occurredAt })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 10);
    return {
      privacyNotice: "Only activity owned by your signed-in XinUS account is shown here. Case, subject, and appraisal details remain within their protected product workspaces.",
      products: {
        ged: { active: canUseGed, sessionCount: ged.length, next: ged[0] ? { subject: ged[0].subject, title: ged[0].title } : null },
        gems: { active: canUseGems, appraisalCount: gems.length, next: gems[0] ? { title: appraisalTitle(gems[0].result) } : null },
        taskForce: { active: canUseTaskForce, subjectCount: subjects.length, highRiskCount: subjects.filter(subject => subject.riskScore >= 70).length, next: subjects[0] ? { name: subjects[0].name, riskScore: subjects[0].riskScore } : null },
      },
      recentActivity,
    };
  }),
});
