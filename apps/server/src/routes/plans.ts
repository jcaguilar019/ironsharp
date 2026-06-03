import { Hono } from "hono";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { devotionalPlans, devotionalDays } from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";

export const plans = new Hono<AppEnv>();

plans.use("*", requireAuth);

// GET /api/plans  → all plans (with a per-category count helper baked in)
plans.get("/", async (c) => {
  const rows = await db
    .select()
    .from(devotionalPlans)
    .orderBy(asc(devotionalPlans.category), asc(devotionalPlans.createdAt));

  const countByCategory: Record<string, number> = {};
  for (const p of rows) {
    countByCategory[p.category] = (countByCategory[p.category] ?? 0) + 1;
  }

  return c.json({ plans: rows, countByCategory });
});

// GET /api/plans/category/:category  → plans within a category
plans.get("/category/:category", async (c) => {
  const category = c.req.param("category");
  const rows = await db
    .select()
    .from(devotionalPlans)
    .where(eq(devotionalPlans.category, category))
    .orderBy(asc(devotionalPlans.createdAt));
  return c.json({ plans: rows });
});

// GET /api/plans/:planId  → a single plan
plans.get("/:planId", async (c) => {
  const planId = c.req.param("planId");
  const [plan] = await db
    .select()
    .from(devotionalPlans)
    .where(eq(devotionalPlans.id, planId))
    .limit(1);
  if (!plan) return c.json({ error: "Plan not found" }, 404);
  return c.json({ plan });
});

// GET /api/plans/:planId/days  → every day in a plan, ordered
plans.get("/:planId/days", async (c) => {
  const planId = c.req.param("planId");
  const days = await db
    .select()
    .from(devotionalDays)
    .where(eq(devotionalDays.planId, planId))
    .orderBy(asc(devotionalDays.dayNumber));
  return c.json({ days });
});

// GET /api/plans/:planId/days/:dayNumber  → a single day's content
plans.get("/:planId/days/:dayNumber", async (c) => {
  const planId = c.req.param("planId");
  const dayNumber = Number(c.req.param("dayNumber"));
  const [day] = await db
    .select()
    .from(devotionalDays)
    .where(
      and(
        eq(devotionalDays.planId, planId),
        eq(devotionalDays.dayNumber, dayNumber)
      )
    )
    .limit(1);
  if (!day) return c.json({ error: "Day not found" }, 404);
  return c.json({ day });
});

