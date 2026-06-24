import { Hono } from "hono";
import { and, asc, eq, inArray, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { devotionalPlans, devotionalDays } from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";
import { summarizeBooks } from "../lib/book-summary.js";

export const plans = new Hono<AppEnv>();

plans.use("*", requireAuth);

// GET /api/plans  → all plans visible to this user (public + their own generated)
plans.get("/", async (c) => {
  const userId = c.var.user.id;
  const rows = await db
    .select()
    .from(devotionalPlans)
    .where(or(eq(devotionalPlans.isPublic, true), eq(devotionalPlans.createdByUserId, userId)))
    .orderBy(asc(devotionalPlans.category), asc(devotionalPlans.createdAt));

  const countByCategory: Record<string, number> = {};
  for (const p of rows) {
    countByCategory[p.category] = (countByCategory[p.category] ?? 0) + 1;
  }

  return c.json({ plans: rows, countByCategory });
});

// GET /api/plans/category/:category  → plans within a category visible to this user
plans.get("/category/:category", async (c) => {
  const userId = c.var.user.id;
  const category = c.req.param("category");
  const rows = await db
    .select()
    .from(devotionalPlans)
    .where(
      and(
        eq(devotionalPlans.category, category),
        or(eq(devotionalPlans.isPublic, true), eq(devotionalPlans.createdByUserId, userId))
      )
    )
    .orderBy(asc(devotionalPlans.createdAt));

  // Derive a "book of the Bible" summary per plan from its daily passages.
  const planIds = rows.map((p) => p.id);
  const booksByPlan = new Map<string, string[]>();
  if (planIds.length > 0) {
    const days = await db
      .select({ planId: devotionalDays.planId, chapter: devotionalDays.chapter })
      .from(devotionalDays)
      .where(inArray(devotionalDays.planId, planIds))
      .orderBy(asc(devotionalDays.dayNumber));
    for (const d of days) {
      const list = booksByPlan.get(d.planId) ?? [];
      list.push(d.chapter);
      booksByPlan.set(d.planId, list);
    }
  }

  const plansWithBooks = rows.map((p) => ({
    ...p,
    bookSummary: summarizeBooks(booksByPlan.get(p.id) ?? []),
  }));

  return c.json({ plans: plansWithBooks });
});

// GET /api/plans/:planId  → a single plan (must be public or owned by caller)
plans.get("/:planId", async (c) => {
  const userId = c.var.user.id;
  const planId = c.req.param("planId");
  const [plan] = await db
    .select()
    .from(devotionalPlans)
    .where(
      and(
        eq(devotionalPlans.id, planId),
        or(eq(devotionalPlans.isPublic, true), eq(devotionalPlans.createdByUserId, userId))
      )
    )
    .limit(1);
  if (!plan) return c.json({ error: "Plan not found" }, 404);
  return c.json({ plan });
});

// GET /api/plans/:planId/days  → every day in a plan, ordered (visibility enforced via plan check)
plans.get("/:planId/days", async (c) => {
  const userId = c.var.user.id;
  const planId = c.req.param("planId");
  const [plan] = await db
    .select({ id: devotionalPlans.id })
    .from(devotionalPlans)
    .where(
      and(
        eq(devotionalPlans.id, planId),
        or(eq(devotionalPlans.isPublic, true), eq(devotionalPlans.createdByUserId, userId))
      )
    )
    .limit(1);
  if (!plan) return c.json({ error: "Plan not found" }, 404);
  const days = await db
    .select()
    .from(devotionalDays)
    .where(eq(devotionalDays.planId, planId))
    .orderBy(asc(devotionalDays.dayNumber));
  return c.json({ days });
});

// GET /api/plans/:planId/days/:dayNumber  → a single day's content
plans.get("/:planId/days/:dayNumber", async (c) => {
  const userId = c.var.user.id;
  const planId = c.req.param("planId");
  const dayNumber = Number(c.req.param("dayNumber"));
  if (!Number.isInteger(dayNumber) || dayNumber < 1) {
    return c.json({ error: "Invalid dayNumber" }, 400);
  }
  const [plan] = await db
    .select({ id: devotionalPlans.id })
    .from(devotionalPlans)
    .where(
      and(
        eq(devotionalPlans.id, planId),
        or(eq(devotionalPlans.isPublic, true), eq(devotionalPlans.createdByUserId, userId))
      )
    )
    .limit(1);
  if (!plan) return c.json({ error: "Plan not found" }, 404);
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

