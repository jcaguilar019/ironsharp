import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { devotionalSubmissions } from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";

export const submissions = new Hono<AppEnv>();

submissions.use("*", requireAuth);

// GET /api/submissions/:planId/:dayNumber → the user's own submission, if any
submissions.get("/:planId/:dayNumber", async (c) => {
  const userId = c.var.user.id;
  const planId = c.req.param("planId");
  const dayNumber = Number(c.req.param("dayNumber"));

  const [row] = await db
    .select()
    .from(devotionalSubmissions)
    .where(
      and(
        eq(devotionalSubmissions.userId, userId),
        eq(devotionalSubmissions.planId, planId),
        eq(devotionalSubmissions.dayNumber, dayNumber)
      )
    )
    .limit(1);

  return c.json({ submission: row ?? null });
});

// PUT /api/submissions → upsert the user's submission for a plan day
submissions.put("/", async (c) => {
  const userId = c.var.user.id;
  const body = await c.req.json().catch(() => ({}));
  const { planId, dayNumber } = body;
  if (!planId || typeof dayNumber !== "number") {
    return c.json({ error: "planId and dayNumber are required" }, 400);
  }

  const values = {
    userId,
    planId,
    dayNumber,
    response1: body.response1 ?? null,
    response2: body.response2 ?? null,
    prayer: body.prayer ?? null,
    voiceMemoUrl: body.voiceMemoUrl ?? null,
    q1Private: body.q1Private ?? false,
    q2Private: body.q2Private ?? false,
    prayerPrivate: body.prayerPrivate ?? true,
    voiceMemoPrivate: body.voiceMemoPrivate ?? false,
    submissionSource: body.submissionSource ?? "typed",
    updatedAt: new Date(),
  };

  const [row] = await db
    .insert(devotionalSubmissions)
    .values(values)
    .onConflictDoUpdate({
      target: [
        devotionalSubmissions.userId,
        devotionalSubmissions.planId,
        devotionalSubmissions.dayNumber,
      ],
      set: {
        response1: values.response1,
        response2: values.response2,
        prayer: values.prayer,
        voiceMemoUrl: values.voiceMemoUrl,
        q1Private: values.q1Private,
        q2Private: values.q2Private,
        prayerPrivate: values.prayerPrivate,
        voiceMemoPrivate: values.voiceMemoPrivate,
        submissionSource: values.submissionSource,
        updatedAt: values.updatedAt,
      },
    })
    .returning();

  return c.json({ submission: row });
});
