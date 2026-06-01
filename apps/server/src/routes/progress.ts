import { Hono } from "hono";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { userPlanProgress, devotionalPlans, devotionalDays } from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";

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

  return c.json({
    active: {
      planId: active.planId,
      planTitle: plan?.title ?? "",
      totalDays: plan?.totalDays ?? 0,
      currentDay: active.currentDay,
      chapter: day?.chapter ?? null,
      theme: day?.theme ?? null,
    },
  });
});

// POST /api/progress  → start a plan (idempotent)
progress.post("/", async (c) => {
  const userId = c.var.user.id;
  const { planId } = await c.req.json().catch(() => ({ planId: undefined }));
  if (!planId) return c.json({ error: "planId is required" }, 400);

  const [row] = await db
    .insert(userPlanProgress)
    .values({ userId, planId, currentDay: 1 })
    .onConflictDoNothing()
    .returning();

  if (row) return c.json({ progress: row }, 201);

  // Already started — return the existing row.
  const [existing] = await db
    .select()
    .from(userPlanProgress)
    .where(
      and(eq(userPlanProgress.userId, userId), eq(userPlanProgress.planId, planId))
    )
    .limit(1);
  return c.json({ progress: existing });
});

// PATCH /api/progress/:planId  → advance the day / mark complete
progress.patch("/:planId", async (c) => {
  const userId = c.var.user.id;
  const planId = c.req.param("planId");
  const body = await c.req.json().catch(() => ({}));

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
  return c.json({ progress: row });
});
