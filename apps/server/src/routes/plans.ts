import { Hono } from "hono";
import { and, asc, eq, inArray, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { devotionalPlans, devotionalDays } from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";
import { bookCounts, summarizeBooks } from "../lib/book-summary.js";
import { CANON, normalizeBookName } from "../lib/bible-coverage.js";
import { canReadPlan } from "../lib/plan-access.js";

export const plans = new Hono<AppEnv>();

plans.use("*", requireAuth);

const CANON_ORDER = new Map(CANON.map((b) => [b.book, b.bookOrder]));

/**
 * Where a plan sits in Bible order, for the library listing.
 *
 * A shelf of read-throughs wants to read Romans, 1 Corinthians, 2 Corinthians,
 * not whatever order they happened to be inserted in. The book is the one the
 * plan spends the most days in (bookCounts is already sorted that way), which
 * keeps "1 & 2 Timothy" under 1 Timothy and leaves a themed plan under whatever
 * it mostly walks through. Anything unrecognisable sorts to the end rather than
 * to the front, so a bad reference never silently leads the shelf.
 */
function canonRank(books: { book: string; days: number }[]): number {
  const top = books[0]?.book;
  if (!top) return Number.MAX_SAFE_INTEGER;
  const canonical = normalizeBookName(top);
  return (canonical && CANON_ORDER.get(canonical)) || Number.MAX_SAFE_INTEGER;
}

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

// GET /api/plans/category/:category  → plans within a category visible to this
// user. The special category "all" returns every visible plan (across all
// categories) — including ones whose category isn't a browsable tile.
plans.get("/category/:category", async (c) => {
  const userId = c.var.user.id;
  const category = c.req.param("category");
  const visible = or(eq(devotionalPlans.isPublic, true), eq(devotionalPlans.createdByUserId, userId));
  const rows = await db
    .select()
    .from(devotionalPlans)
    .where(category === "all" ? visible : and(eq(devotionalPlans.category, category), visible))
    .orderBy(asc(devotionalPlans.category), asc(devotionalPlans.createdAt));

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

  const plansWithBooks = rows.map((p) => {
    const chapters = booksByPlan.get(p.id) ?? [];
    return {
      ...p,
      bookSummary: summarizeBooks(chapters),
      // Full per-book tally, so search can rank an all-Romans plan above one
      // that only passes through Romans.
      books: bookCounts(chapters),
    };
  });

  // Category first (unchanged), then Bible order, then oldest first. The SQL
  // above cannot do the middle one: a plan's book is derived from its days, not
  // stored on the row.
  plansWithBooks.sort((a, b) => {
    if (a.category !== b.category) return a.category < b.category ? -1 : 1;
    const rank = canonRank(a.books) - canonRank(b.books);
    if (rank !== 0) return rank;
    return (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
  });

  return c.json({ plans: plansWithBooks });
});

// GET /api/plans/:planId  → a single plan (public, owned, or held by a group
// the caller belongs to — see canReadPlan)
plans.get("/:planId", async (c) => {
  const userId = c.var.user.id;
  const planId = c.req.param("planId");
  const [plan] = await db
    .select()
    .from(devotionalPlans)
    .where(eq(devotionalPlans.id, planId))
    .limit(1);
  if (!plan || !(await canReadPlan(userId, plan))) return c.json({ error: "Plan not found" }, 404);
  return c.json({ plan });
});

// GET /api/plans/:planId/days  → every day in a plan, ordered (visibility enforced via plan check)
plans.get("/:planId/days", async (c) => {
  const userId = c.var.user.id;
  const planId = c.req.param("planId");
  const [plan] = await db
    .select({ id: devotionalPlans.id, isPublic: devotionalPlans.isPublic, createdByUserId: devotionalPlans.createdByUserId })
    .from(devotionalPlans)
    .where(eq(devotionalPlans.id, planId))
    .limit(1);
  if (!plan || !(await canReadPlan(userId, plan))) return c.json({ error: "Plan not found" }, 404);
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
    .select({ id: devotionalPlans.id, isPublic: devotionalPlans.isPublic, createdByUserId: devotionalPlans.createdByUserId })
    .from(devotionalPlans)
    .where(eq(devotionalPlans.id, planId))
    .limit(1);
  if (!plan || !(await canReadPlan(userId, plan))) return c.json({ error: "Plan not found" }, 404);
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

