import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { planRuns } from "../db/schema.js";

export type PlanRun = typeof planRuns.$inferSelect;

/** The in-progress personal run of a plan, if any (at most one by construction). */
export async function activePersonalRun(userId: string, planId: string): Promise<PlanRun | null> {
  const [run] = await db
    .select()
    .from(planRuns)
    .where(
      and(
        eq(planRuns.ownerType, "user"),
        eq(planRuns.userId, userId),
        eq(planRuns.planId, planId),
        isNull(planRuns.completedAt),
        isNull(planRuns.endedAt)
      )
    )
    .orderBy(desc(planRuns.startedAt))
    .limit(1);
  return run ?? null;
}

/** The in-progress group run of a plan, if any. */
export async function activeGroupRun(groupId: string, planId: string): Promise<PlanRun | null> {
  const [run] = await db
    .select()
    .from(planRuns)
    .where(
      and(
        eq(planRuns.ownerType, "group"),
        eq(planRuns.groupId, groupId),
        eq(planRuns.planId, planId),
        isNull(planRuns.completedAt),
        isNull(planRuns.endedAt)
      )
    )
    .orderBy(desc(planRuns.startedAt))
    .limit(1);
  return run ?? null;
}

/** Every run of a plan for this owner, newest first. */
export async function personalRuns(userId: string, planId: string): Promise<PlanRun[]> {
  return db
    .select()
    .from(planRuns)
    .where(and(eq(planRuns.ownerType, "user"), eq(planRuns.userId, userId), eq(planRuns.planId, planId)))
    .orderBy(desc(planRuns.startedAt));
}

export async function groupRuns(groupId: string, planId: string): Promise<PlanRun[]> {
  return db
    .select()
    .from(planRuns)
    .where(and(eq(planRuns.ownerType, "group"), eq(planRuns.groupId, groupId), eq(planRuns.planId, planId)))
    .orderBy(desc(planRuns.startedAt));
}

/** Active run, creating one when missing (legacy data safety net). */
export async function ensurePersonalRun(userId: string, planId: string): Promise<PlanRun> {
  const existing = await activePersonalRun(userId, planId);
  if (existing) return existing;
  const [run] = await db
    .insert(planRuns)
    .values({ planId, ownerType: "user", userId })
    .returning();
  return run!;
}

export async function ensureGroupRun(groupId: string, planId: string, currentDay = 1): Promise<PlanRun> {
  const existing = await activeGroupRun(groupId, planId);
  if (existing) return existing;
  const [run] = await db
    .insert(planRuns)
    .values({ planId, ownerType: "group", groupId, currentDay })
    .returning();
  return run!;
}

/** Close a run out — "completed" finished the last day; "ended" was stopped/replaced. */
export async function closeRun(runId: string, kind: "completed" | "ended"): Promise<void> {
  await db
    .update(planRuns)
    .set(kind === "completed" ? { completedAt: new Date() } : { endedAt: new Date() })
    .where(eq(planRuns.id, runId));
}

/** Mirror a day advance onto the run (the run is the ledger; pointers stay authoritative). */
export async function setRunDay(runId: string, currentDay: number): Promise<void> {
  await db.update(planRuns).set({ currentDay }).where(eq(planRuns.id, runId));
}
