import { Hono } from "hono";
import { z } from "zod";
import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { userPlanProgress, devotionalPlans, devotionalDays, devotionalSubmissions, profiles } from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";
import { clientDayWindow } from "../lib/localday.js";
import {
  TIER_LIMITS,
  UPGRADE_PATH,
  TIER_NAMES,
  THIRTY_DAYS_MS,
  type MembershipTier,
} from "../lib/tiers.js";

export const progress = new Hono<AppEnv>();

progress.use("*", requireAuth);

// GET /api/progress  → all of the user's plan progress rows
progress.get("/", async (c) => {
  const userId = c.var.user.id;
  const rows = await db
    .select()
    .from(userPlanProgress)
    .where(eq(userPlanProgress.userId, userId))
    .orderBy(desc(userPlanProgress.startedAt));
  return c.json({ progress: rows });
});

// GET /api/progress/active  → the most recent in-progress plan, hydrated with
// the current day's chapter/theme for the Home screen headline card.
progress.get("/active", async (c) => {
  const userId = c.var.user.id;
  const [active] = await db
    .select()
    .from(userPlanProgress)
    .where(
      and(eq(userPlanProgress.userId, userId), isNull(userPlanProgress.completedAt))
    )
    .orderBy(desc(userPlanProgress.startedAt))
    .limit(1);

  if (!active) return c.json({ active: null });

  const [plan] = await db
    .select()
    .from(devotionalPlans)
    .where(eq(devotionalPlans.id, active.planId))
    .limit(1);
  const [day] = await db
    .select()
    .from(devotionalDays)
    .where(
      and(
        eq(devotionalDays.planId, active.planId),
        eq(devotionalDays.dayNumber, active.currentDay)
      )
    )
    .limit(1);

  // Has the user submitted anything for this plan today? Lets the UI show
  // "Done today" instead of "Continue" once the day's reading is in. Bounded to
  // the *client's* local day (x-timezone-offset header) so it doesn't flip off
  // in the evening when the UTC day rolls over ahead of the user's.
  const { start: todayStart, end: tomorrowStart } = clientDayWindow(c);
  const [doneRow] = await db
    .select({ id: devotionalSubmissions.id })
    .from(devotionalSubmissions)
    .where(
      and(
        eq(devotionalSubmissions.userId, userId),
        eq(devotionalSubmissions.planId, active.planId),
        gte(devotionalSubmissions.submittedAt, todayStart),
        lt(devotionalSubmissions.submittedAt, tomorrowStart)
      )
    )
    .limit(1);

  return c.json({
    active: {
      planId: active.planId,
      planTitle: plan?.title ?? "",
      totalDays: plan?.totalDays ?? 0,
      currentDay: active.currentDay,
      chapter: day?.chapter ?? null,
      theme: day?.theme ?? null,
      doneToday: !!doneRow,
    },
  });
});

const startSchema = z.object({
  planId: z.string().uuid(),
  forGroup: z.boolean().optional(),
});

const updateProgressSchema = z.object({
  currentDay: z.number().int().positive().optional(),
  completed: z.boolean().optional(),
});

// POST /api/progress  → start (unlock) a plan
progress.post("/", async (c) => {
  const userId = c.var.user.id;
  const parsed = startSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const { planId, forGroup } = parsed.data;

  // Already started — return existing row without consuming an unlock
  const [existing] = await db
    .select()
    .from(userPlanProgress)
    .where(and(eq(userPlanProgress.userId, userId), eq(userPlanProgress.planId, planId)))
    .limit(1);

  if (existing) return c.json({ progress: existing });

  // New plan — check monthly unlock limit (group plans don't count against personal quota)
  if (!forGroup) {
    const [profile] = await db
      .select({
        membershipTier: profiles.membershipTier,
        planUnlocksCount: profiles.planUnlocksCount,
        planUnlocksWindowStart: profiles.planUnlocksWindowStart,
      })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (profile) {
      const tier = (profile.membershipTier ?? "free") as MembershipTier;
      const limit = TIER_LIMITS[tier].planUnlocksPerMonth;

      if (limit !== Infinity) {
        const now = new Date();
        const windowStart = profile.planUnlocksWindowStart;
        const windowExpired =
          !windowStart ||
          now.getTime() - new Date(windowStart).getTime() > THIRTY_DAYS_MS;

        const currentCount = windowExpired ? 0 : (profile.planUnlocksCount ?? 0);

        if (currentCount >= limit) {
          const resetDate = windowStart
            ? new Date(new Date(windowStart).getTime() + THIRTY_DAYS_MS)
            : now;
          const upgradeTier = UPGRADE_PATH[tier];
          return c.json(
            {
              error: `You've used all ${limit} plan unlocks for this month. Your next unlock is available on ${resetDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })}.`,
              resetsAt: resetDate.toISOString(),
              upgradeTo: upgradeTier,
              upgradeToName: upgradeTier ? TIER_NAMES[upgradeTier] : null,
            },
            403
          );
        }

        await db
          .update(profiles)
          .set({
            planUnlocksCount: windowExpired ? 1 : currentCount + 1,
            planUnlocksWindowStart: windowExpired
              ? now
              : (profile.planUnlocksWindowStart ?? now),
            updatedAt: now,
          })
          .where(eq(profiles.userId, userId));
      }
    }
  }

  const [row] = await db
    .insert(userPlanProgress)
    .values({ userId, planId, currentDay: 1 })
    .returning();

  return c.json({ progress: row }, 201);
});

// DELETE /api/progress/:planId  → abandon a plan
progress.delete("/:planId", async (c) => {
  const userId = c.var.user.id;
  const planId = c.req.param("planId");

  await db
    .delete(userPlanProgress)
    .where(and(eq(userPlanProgress.userId, userId), eq(userPlanProgress.planId, planId)));

  return c.json({ ok: true });
});

// PATCH /api/progress/:planId  → advance the day / mark complete
progress.patch("/:planId", async (c) => {
  const userId = c.var.user.id;
  const planId = c.req.param("planId");
  const parsed = updateProgressSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const body = parsed.data;

  // Fetch current state before updating so we can detect transitions.
  const [before] = await db
    .select({ completedAt: userPlanProgress.completedAt })
    .from(userPlanProgress)
    .where(and(eq(userPlanProgress.userId, userId), eq(userPlanProgress.planId, planId)))
    .limit(1);
  if (!before) return c.json({ error: "Progress not found" }, 404);

  const set: Record<string, unknown> = {};
  if (typeof body.currentDay === "number") set.currentDay = body.currentDay;
  if (body.completed === true) set.completedAt = new Date();
  if (body.completed === false) set.completedAt = null;

  const [row] = await db
    .update(userPlanProgress)
    .set(set)
    .where(
      and(eq(userPlanProgress.userId, userId), eq(userPlanProgress.planId, planId))
    )
    .returning();

  if (!row) return c.json({ error: "Progress not found" }, 404);

  const wasCompleted = !!before.completedAt;
  const isNowCompleted = !!row.completedAt;

  if (!wasCompleted && isNowCompleted) {
    // Transitioning null → timestamp: first completion.
    await db
      .update(profiles)
      .set({ totalCompleted: sql`${profiles.totalCompleted} + 1`, updatedAt: new Date() })
      .where(eq(profiles.userId, userId));
  } else if (wasCompleted && !isNowCompleted) {
    // Transitioning timestamp → null: un-completing.
    await db
      .update(profiles)
      .set({ totalCompleted: sql`greatest(${profiles.totalCompleted} - 1, 0)`, updatedAt: new Date() })
      .where(eq(profiles.userId, userId));
  }

  return c.json({ progress: row });
});
