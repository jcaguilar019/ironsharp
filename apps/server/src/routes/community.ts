import { Hono } from "hono";
import { z } from "zod";
import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  communityDevotionals,
  communityResponses,
  communityReactions,
  profiles,
} from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";
import { requireAdmin } from "../lib/admin.js";
import { clientDateString } from "../lib/localday.js";

export const community = new Hono<AppEnv>();

community.use("*", requireAuth);
// Authoring endpoints are founder-only. requireAdmin runs after requireAuth.
community.use("/admin/*", requireAdmin);

const REACTION_TYPES = ["amen", "hit_me", "fire"] as const;
type ReactionType = (typeof REACTION_TYPES)[number];

const studyNoteSchema = z.object({ verse_ref: z.string(), note: z.string() });

// Shared shape for create/edit. Dates come in as YYYY-MM-DD strings.
const devotionalInputSchema = z.object({
  publishDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "publishDate must be YYYY-MM-DD"),
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().trim().max(300).nullish(),
  passageReference: z.string().trim().min(1).max(200),
  passageContext: z.string().trim().nullish(),
  studyNotes: z.array(studyNoteSchema).default([]),
  reflectionQ1: z.string().trim().min(1),
  reflectionQ2: z.string().trim().min(1),
  prayerPrompt: z.string().trim().nullish(),
  status: z.enum(["draft", "published"]).default("draft"),
});

const responseSchema = z.object({
  communityDevotionalId: z.string().uuid(),
  response1: z.string().trim().max(5000).nullish(),
  response2: z.string().trim().max(5000).nullish(),
  prayer: z.string().trim().max(5000).nullish(),
  q1Private: z.boolean().optional(),
  q2Private: z.boolean().optional(),
  prayerPrivate: z.boolean().optional(),
});

const reactionSchema = z.object({
  responseId: z.string().uuid(),
  reactionType: z.enum(REACTION_TYPES),
});

/**
 * Build the community feed for one devotional: every member's response with
 * private fields stripped for non-owners, plus reaction counts and which
 * reactions the requesting user has left.
 */
async function buildFeed(communityDevotionalId: string, viewerId: string) {
  const rows = await db
    .select({
      id: communityResponses.id,
      userId: communityResponses.userId,
      response1: communityResponses.response1,
      response2: communityResponses.response2,
      prayer: communityResponses.prayer,
      q1Private: communityResponses.q1Private,
      q2Private: communityResponses.q2Private,
      prayerPrivate: communityResponses.prayerPrivate,
      updatedAt: communityResponses.updatedAt,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(communityResponses)
    .leftJoin(profiles, eq(profiles.userId, communityResponses.userId))
    .where(eq(communityResponses.communityDevotionalId, communityDevotionalId))
    .orderBy(desc(communityResponses.updatedAt));

  const responseIds = rows.map((r) => r.id);
  const reactions = responseIds.length
    ? await db
        .select({
          responseId: communityReactions.responseId,
          reactionType: communityReactions.reactionType,
          userId: communityReactions.userId,
        })
        .from(communityReactions)
        .where(inArray(communityReactions.responseId, responseIds))
    : [];

  const byResponse = new Map<
    string,
    { counts: Record<ReactionType, number>; mine: Set<string> }
  >();
  for (const id of responseIds) {
    byResponse.set(id, { counts: { amen: 0, hit_me: 0, fire: 0 }, mine: new Set() });
  }
  for (const r of reactions) {
    const entry = byResponse.get(r.responseId);
    if (!entry) continue;
    if (r.reactionType in entry.counts) entry.counts[r.reactionType as ReactionType] += 1;
    if (r.userId === viewerId) entry.mine.add(r.reactionType);
  }

  return rows.map((r) => {
    const isOwn = r.userId === viewerId;
    const agg = byResponse.get(r.id)!;
    return {
      id: r.id,
      userId: r.userId,
      isOwn,
      displayName: r.displayName ?? "Someone",
      avatarUrl: r.avatarUrl,
      // Private fields are visible only to their author.
      response1: !isOwn && r.q1Private ? null : r.response1,
      response2: !isOwn && r.q2Private ? null : r.response2,
      prayer: !isOwn && r.prayerPrivate ? null : r.prayer,
      q1Private: r.q1Private,
      q2Private: r.q2Private,
      prayerPrivate: r.prayerPrivate,
      updatedAt: r.updatedAt,
      reactions: agg.counts,
      myReactions: Array.from(agg.mine),
    };
  });
}

// GET /api/community/today → today's published reading + feed + the user's own response.
community.get("/today", async (c) => {
  const userId = c.var.user.id;
  const today = clientDateString(c);

  const [devotional] = await db
    .select()
    .from(communityDevotionals)
    .where(
      and(
        eq(communityDevotionals.publishDate, today),
        eq(communityDevotionals.status, "published")
      )
    )
    .limit(1);

  if (!devotional) return c.json({ devotional: null, feed: [], myResponse: null });

  const feed = await buildFeed(devotional.id, userId);
  const myResponse = feed.find((f) => f.isOwn) ?? null;
  return c.json({ devotional, feed, myResponse });
});

// GET /api/community/archive → past published readings (most recent first).
community.get("/archive", async (c) => {
  const today = clientDateString(c);
  const rows = await db
    .select({
      id: communityDevotionals.id,
      publishDate: communityDevotionals.publishDate,
      title: communityDevotionals.title,
      subtitle: communityDevotionals.subtitle,
      passageReference: communityDevotionals.passageReference,
    })
    .from(communityDevotionals)
    .where(
      and(
        eq(communityDevotionals.status, "published"),
        lte(communityDevotionals.publishDate, today)
      )
    )
    .orderBy(desc(communityDevotionals.publishDate))
    .limit(60);
  return c.json({ devotionals: rows });
});

// GET /api/community/entry/:id → a single published reading + feed (archive detail).
community.get("/entry/:id", async (c) => {
  const userId = c.var.user.id;
  const id = c.req.param("id");

  const [devotional] = await db
    .select()
    .from(communityDevotionals)
    .where(and(eq(communityDevotionals.id, id), eq(communityDevotionals.status, "published")))
    .limit(1);

  if (!devotional) return c.json({ error: "Not found" }, 404);

  const feed = await buildFeed(devotional.id, userId);
  const myResponse = feed.find((f) => f.isOwn) ?? null;
  return c.json({ devotional, feed, myResponse });
});

// PUT /api/community/responses → upsert the requesting user's response.
community.put("/responses", async (c) => {
  const userId = c.var.user.id;
  const parsed = responseSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const body = parsed.data;

  const [devotional] = await db
    .select({ id: communityDevotionals.id, status: communityDevotionals.status })
    .from(communityDevotionals)
    .where(eq(communityDevotionals.id, body.communityDevotionalId))
    .limit(1);
  if (!devotional) return c.json({ error: "Devotional not found" }, 404);
  if (devotional.status !== "published") return c.json({ error: "Not open for responses" }, 403);

  const now = new Date();
  const [row] = await db
    .insert(communityResponses)
    .values({
      communityDevotionalId: body.communityDevotionalId,
      userId,
      response1: body.response1 ?? null,
      response2: body.response2 ?? null,
      prayer: body.prayer ?? null,
      q1Private: body.q1Private ?? false,
      q2Private: body.q2Private ?? false,
      prayerPrivate: body.prayerPrivate ?? true,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [communityResponses.communityDevotionalId, communityResponses.userId],
      set: {
        response1: body.response1 ?? null,
        response2: body.response2 ?? null,
        prayer: body.prayer ?? null,
        q1Private: body.q1Private ?? false,
        q2Private: body.q2Private ?? false,
        prayerPrivate: body.prayerPrivate ?? true,
        updatedAt: now,
      },
    })
    .returning();

  return c.json({ response: row });
});

// POST /api/community/reactions → toggle a reaction on a response.
community.post("/reactions", async (c) => {
  const userId = c.var.user.id;
  const parsed = reactionSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const { responseId, reactionType } = parsed.data;

  const [target] = await db
    .select({ id: communityResponses.id })
    .from(communityResponses)
    .where(eq(communityResponses.id, responseId))
    .limit(1);
  if (!target) return c.json({ error: "Response not found" }, 404);

  const [existing] = await db
    .select({ id: communityReactions.id })
    .from(communityReactions)
    .where(
      and(
        eq(communityReactions.responseId, responseId),
        eq(communityReactions.userId, userId),
        eq(communityReactions.reactionType, reactionType)
      )
    )
    .limit(1);

  if (existing) {
    await db.delete(communityReactions).where(eq(communityReactions.id, existing.id));
    return c.json({ reacted: false });
  }

  await db.insert(communityReactions).values({ responseId, userId, reactionType });
  return c.json({ reacted: true });
});

/* ── Admin / founder authoring ──────────────────────────────────────────────── */

// GET /api/community/admin/list → every reading (drafts + published), newest date first.
community.get("/admin/list", async (c) => {
  const rows = await db
    .select()
    .from(communityDevotionals)
    .orderBy(desc(communityDevotionals.publishDate));
  return c.json({ devotionals: rows });
});

// POST /api/community/admin/create → create a reading scheduled for a date.
community.post("/admin/create", async (c) => {
  const userId = c.var.user.id;
  const parsed = devotionalInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const body = parsed.data;

  // One reading per day — surface a clear conflict instead of a raw DB error.
  const [clash] = await db
    .select({ id: communityDevotionals.id })
    .from(communityDevotionals)
    .where(eq(communityDevotionals.publishDate, body.publishDate))
    .limit(1);
  if (clash) return c.json({ error: `A reading already exists for ${body.publishDate}` }, 409);

  const [row] = await db
    .insert(communityDevotionals)
    .values({
      publishDate: body.publishDate,
      title: body.title,
      subtitle: body.subtitle ?? null,
      passageReference: body.passageReference,
      passageContext: body.passageContext ?? null,
      studyNotes: body.studyNotes,
      reflectionQ1: body.reflectionQ1,
      reflectionQ2: body.reflectionQ2,
      prayerPrompt: body.prayerPrompt ?? null,
      status: body.status,
      createdByUserId: userId,
    })
    .returning();
  return c.json({ devotional: row });
});

// PUT /api/community/admin/:id → edit a reading.
community.put("/admin/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = devotionalInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const body = parsed.data;

  // Guard the per-day uniqueness when the date is being changed.
  const [clash] = await db
    .select({ id: communityDevotionals.id })
    .from(communityDevotionals)
    .where(
      and(
        eq(communityDevotionals.publishDate, body.publishDate),
        sql`${communityDevotionals.id} <> ${id}`
      )
    )
    .limit(1);
  if (clash) return c.json({ error: `A reading already exists for ${body.publishDate}` }, 409);

  const [row] = await db
    .update(communityDevotionals)
    .set({
      publishDate: body.publishDate,
      title: body.title,
      subtitle: body.subtitle ?? null,
      passageReference: body.passageReference,
      passageContext: body.passageContext ?? null,
      studyNotes: body.studyNotes,
      reflectionQ1: body.reflectionQ1,
      reflectionQ2: body.reflectionQ2,
      prayerPrompt: body.prayerPrompt ?? null,
      status: body.status,
      updatedAt: new Date(),
    })
    .where(eq(communityDevotionals.id, id))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ devotional: row });
});

// POST /api/community/admin/:id/publish → flip a draft to published.
community.post("/admin/:id/publish", async (c) => {
  const id = c.req.param("id");
  const [row] = await db
    .update(communityDevotionals)
    .set({ status: "published", updatedAt: new Date() })
    .where(eq(communityDevotionals.id, id))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ devotional: row });
});
