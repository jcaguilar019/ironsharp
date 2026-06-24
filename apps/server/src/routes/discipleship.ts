import { Hono } from "hono";
import { z } from "zod";
import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  discipleRelationships,
  groups,
  groupMembers,
  profiles,
  devotionalSubmissions,
  devotionalDays,
  customQuestions,
  flaggedResponses,
  mailboxMessages,
} from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";
import { notifyDiscipleshipInvite, notifyMailboxMessage } from "../lib/push.js";

export const discipleship = new Hono<AppEnv>();
discipleship.use("*", requireAuth);

const QUESTION_TYPES = ["q1", "q2", "q3", "praise"] as const;

type Relationship = typeof discipleRelationships.$inferSelect;

/** Load a relationship by id; null if missing. */
async function loadRelationship(id: string): Promise<Relationship | null> {
  const [rel] = await db
    .select()
    .from(discipleRelationships)
    .where(eq(discipleRelationships.id, id))
    .limit(1);
  return rel ?? null;
}

// ─── Feature 1 — Initiation ───────────────────────────────────────────────────

const inviteSchema = z.object({
  groupId: z.string().uuid(),
  discipleId: z.string().min(1),
});

// POST /api/discipleship/invite — caller (discipler) invites a disciple they
// share a one-on-one group with. Creates a pending relationship.
discipleship.post("/invite", async (c) => {
  const userId = c.var.user.id;
  const parsed = inviteSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const { groupId, discipleId } = parsed.data;

  if (discipleId === userId) return c.json({ error: "You can't disciple yourself." }, 400);

  // The group must be a one-on-one that both users belong to.
  const [group] = await db
    .select({ id: groups.id, groupType: groups.groupType })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group || group.groupType !== "one-on-one") {
    return c.json({ error: "Discipleship requires a one-on-one group." }, 400);
  }

  const members = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));
  const memberIds = new Set(members.map((m) => m.userId));
  if (!memberIds.has(userId) || !memberIds.has(discipleId)) {
    return c.json({ error: "Both people must be members of this group." }, 400);
  }

  const [rel] = await db
    .insert(discipleRelationships)
    .values({ disciplerId: userId, discipleId, groupId, status: "pending" })
    .onConflictDoUpdate({
      target: [discipleRelationships.disciplerId, discipleRelationships.discipleId],
      set: { status: "pending", groupId, privacyNoticeAcceptedAt: null, updatedAt: new Date() },
    })
    .returning();

  notifyDiscipleshipInvite(userId, discipleId).catch((err) =>
    console.error("[discipleship] notifyDiscipleshipInvite failed:", err)
  );

  return c.json({ relationship: rel });
});

// POST /api/discipleship/:id/accept — the disciple accepts the invite (and the
// one-time privacy notice).
discipleship.post("/:id/accept", async (c) => {
  const userId = c.var.user.id;
  const rel = await loadRelationship(c.req.param("id"));
  if (!rel) return c.json({ error: "Not found" }, 404);
  if (rel.discipleId !== userId) return c.json({ error: "Only the disciple can accept." }, 403);

  const [updated] = await db
    .update(discipleRelationships)
    .set({ status: "active", privacyNoticeAcceptedAt: new Date(), updatedAt: new Date() })
    .where(eq(discipleRelationships.id, rel.id))
    .returning();
  return c.json({ relationship: updated });
});

// POST /api/discipleship/:id/decline — the disciple declines; the row is removed.
discipleship.post("/:id/decline", async (c) => {
  const userId = c.var.user.id;
  const rel = await loadRelationship(c.req.param("id"));
  if (!rel) return c.json({ error: "Not found" }, 404);
  if (rel.discipleId !== userId) return c.json({ error: "Only the disciple can decline." }, 403);

  await db.delete(discipleRelationships).where(eq(discipleRelationships.id, rel.id));
  return c.json({ ok: true });
});

// GET /api/discipleship — all relationships the caller is part of, with role,
// counterpart, and mailbox unread count. Drives every entry point + the notice gate.
discipleship.get("/", async (c) => {
  const userId = c.var.user.id;

  const rels = await db
    .select()
    .from(discipleRelationships)
    .where(
      sql`${discipleRelationships.disciplerId} = ${userId} OR ${discipleRelationships.discipleId} = ${userId}`
    );
  if (rels.length === 0) return c.json({ relationships: [] });

  const counterpartIds = rels.map((r) => (r.disciplerId === userId ? r.discipleId : r.disciplerId));
  const relIds = rels.map((r) => r.id);

  const [people, unreadRows] = await Promise.all([
    db
      .select({ userId: profiles.userId, displayName: profiles.displayName, avatarUrl: profiles.avatarUrl })
      .from(profiles)
      .where(inArray(profiles.userId, counterpartIds)),
    db
      .select({
        relationshipId: mailboxMessages.discipleshipRelationshipId,
        unread: sql<number>`count(*)::int`,
      })
      .from(mailboxMessages)
      .where(
        and(
          inArray(mailboxMessages.discipleshipRelationshipId, relIds),
          ne(mailboxMessages.senderId, userId),
          isNull(mailboxMessages.readAt)
        )
      )
      .groupBy(mailboxMessages.discipleshipRelationshipId),
  ]);

  const peopleById = new Map(people.map((p) => [p.userId, p]));
  const unreadById = new Map(unreadRows.map((r) => [r.relationshipId, r.unread]));

  const relationships = rels.map((r) => {
    const role = r.disciplerId === userId ? "discipler" : "disciple";
    const counterpartId = role === "discipler" ? r.discipleId : r.disciplerId;
    const cp = peopleById.get(counterpartId);
    return {
      id: r.id,
      role,
      status: r.status,
      groupId: r.groupId,
      privacyNoticeAcceptedAt: r.privacyNoticeAcceptedAt,
      counterpart: {
        userId: counterpartId,
        displayName: cp?.displayName ?? "Member",
        avatarUrl: cp?.avatarUrl ?? null,
      },
      unreadCount: unreadById.get(r.id) ?? 0,
    };
  });

  return c.json({ relationships });
});

// ─── Feature 2 — Custom question (Q3) ─────────────────────────────────────────

const questionSchema = z.object({
  questionText: z.string().trim().min(1).max(1000),
  forDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "forDate must be YYYY-MM-DD"),
});

// POST /api/discipleship/:id/questions — discipler sets the Q3 for a date.
discipleship.post("/:id/questions", async (c) => {
  const userId = c.var.user.id;
  const rel = await loadRelationship(c.req.param("id"));
  if (!rel) return c.json({ error: "Not found" }, 404);
  if (rel.disciplerId !== userId) return c.json({ error: "Only the discipler can set a question." }, 403);

  const parsed = questionSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const { questionText, forDate } = parsed.data;

  const [row] = await db
    .insert(customQuestions)
    .values({ discipleshipRelationshipId: rel.id, discipleId: rel.discipleId, questionText, forDate })
    .onConflictDoUpdate({
      target: [customQuestions.discipleshipRelationshipId, customQuestions.forDate],
      set: { questionText },
    })
    .returning();
  return c.json({ question: row });
});

// GET /api/discipleship/:id/questions?forDate= — either party fetches the Q3 for a date.
discipleship.get("/:id/questions", async (c) => {
  const userId = c.var.user.id;
  const rel = await loadRelationship(c.req.param("id"));
  if (!rel) return c.json({ error: "Not found" }, 404);
  if (rel.disciplerId !== userId && rel.discipleId !== userId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const forDate = c.req.query("forDate");
  if (!forDate) return c.json({ error: "forDate is required" }, 400);

  const [row] = await db
    .select()
    .from(customQuestions)
    .where(
      and(
        eq(customQuestions.discipleshipRelationshipId, rel.id),
        eq(customQuestions.forDate, forDate)
      )
    )
    .limit(1);
  return c.json({ question: row ?? null });
});

// ─── Feature 3 — Always-visible responses ─────────────────────────────────────

// GET /api/discipleship/:id/responses — discipler views the disciple's
// submissions for the relationship's group plan. Private fields are stripped.
discipleship.get("/:id/responses", async (c) => {
  const userId = c.var.user.id;
  const rel = await loadRelationship(c.req.param("id"));
  if (!rel) return c.json({ error: "Not found" }, 404);
  if (rel.disciplerId !== userId) return c.json({ error: "Only the discipler can view responses." }, 403);
  if (!rel.groupId) return c.json({ responses: [] });

  const [group] = await db
    .select({ currentPlanId: groups.currentPlanId })
    .from(groups)
    .where(eq(groups.id, rel.groupId))
    .limit(1);
  const planId = group?.currentPlanId;
  if (!planId) return c.json({ responses: [] });

  const [subs, days, questions, flags] = await Promise.all([
    db
      .select()
      .from(devotionalSubmissions)
      .where(
        and(
          eq(devotionalSubmissions.userId, rel.discipleId),
          eq(devotionalSubmissions.planId, planId)
        )
      )
      .orderBy(desc(devotionalSubmissions.dayNumber)),
    db
      .select({ dayNumber: devotionalDays.dayNumber, chapter: devotionalDays.chapter })
      .from(devotionalDays)
      .where(eq(devotionalDays.planId, planId)),
    db
      .select({ forDate: customQuestions.forDate, questionText: customQuestions.questionText })
      .from(customQuestions)
      .where(eq(customQuestions.discipleshipRelationshipId, rel.id)),
    db
      .select({ responseId: flaggedResponses.responseId, questionType: flaggedResponses.questionType })
      .from(flaggedResponses)
      .where(eq(flaggedResponses.discipleshipRelationshipId, rel.id)),
  ]);

  const chapterByDay = new Map(days.map((d) => [d.dayNumber, d.chapter]));
  const questionByDate = new Map(questions.map((q) => [q.forDate, q.questionText]));
  const flagsByResponse = new Map<string, string[]>();
  for (const f of flags) {
    const list = flagsByResponse.get(f.responseId) ?? [];
    list.push(f.questionType);
    flagsByResponse.set(f.responseId, list);
  }

  // Caller is the discipler (never the owner), so private fields are nulled —
  // identical to the isOwn||!private rule in submissions.ts.
  const responses = subs.map((s) => {
    const subDate = s.submittedAt.toISOString().slice(0, 10);
    return {
      id: s.id,
      dayNumber: s.dayNumber,
      chapter: chapterByDay.get(s.dayNumber) ?? null,
      submittedAt: s.submittedAt,
      response1: s.q1Private ? null : s.response1,
      response2: s.q2Private ? null : s.response2,
      response3: s.q3Private ? null : s.response3,
      prayer: s.prayerPrivate ? null : s.prayer,
      q1Private: s.q1Private,
      q2Private: s.q2Private,
      q3Private: s.q3Private,
      prayerPrivate: s.prayerPrivate,
      q3Question: questionByDate.get(subDate) ?? null,
      flagged: flagsByResponse.get(s.id) ?? [],
    };
  });

  return c.json({ responses });
});

// ─── Feature 4 — Flagging ─────────────────────────────────────────────────────

const flagSchema = z.object({
  responseId: z.string().uuid(),
  questionType: z.enum(QUESTION_TYPES),
});

const PRIVATE_FIELD: Record<(typeof QUESTION_TYPES)[number], "q1Private" | "q2Private" | "q3Private" | "prayerPrivate"> = {
  q1: "q1Private",
  q2: "q2Private",
  q3: "q3Private",
  praise: "prayerPrivate",
};

// POST /api/discipleship/:id/flags — discipler flags a (visible) field.
discipleship.post("/:id/flags", async (c) => {
  const userId = c.var.user.id;
  const rel = await loadRelationship(c.req.param("id"));
  if (!rel) return c.json({ error: "Not found" }, 404);
  if (rel.disciplerId !== userId) return c.json({ error: "Only the discipler can flag." }, 403);

  const parsed = flagSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const { responseId, questionType } = parsed.data;

  // The submission must belong to this disciple, and the flagged field must be
  // visible (not private) — you can't flag what you can't see.
  const [sub] = await db
    .select()
    .from(devotionalSubmissions)
    .where(eq(devotionalSubmissions.id, responseId))
    .limit(1);
  if (!sub || sub.userId !== rel.discipleId) return c.json({ error: "Not found" }, 404);
  if (sub[PRIVATE_FIELD[questionType]]) return c.json({ error: "That field is private." }, 403);

  await db
    .insert(flaggedResponses)
    .values({ discipleshipRelationshipId: rel.id, responseId, questionType })
    .onConflictDoNothing();
  return c.json({ ok: true });
});

// DELETE /api/discipleship/:id/flags — unflag.
discipleship.delete("/:id/flags", async (c) => {
  const userId = c.var.user.id;
  const rel = await loadRelationship(c.req.param("id"));
  if (!rel) return c.json({ error: "Not found" }, 404);
  if (rel.disciplerId !== userId) return c.json({ error: "Only the discipler can unflag." }, 403);

  const parsed = flagSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const { responseId, questionType } = parsed.data;

  await db
    .delete(flaggedResponses)
    .where(
      and(
        eq(flaggedResponses.discipleshipRelationshipId, rel.id),
        eq(flaggedResponses.responseId, responseId),
        eq(flaggedResponses.questionType, questionType)
      )
    );
  return c.json({ ok: true });
});

// GET /api/discipleship/:id/flags — Flagged Notes: chronological flagged fields
// joined to their submission text. Discipler only.
discipleship.get("/:id/flags", async (c) => {
  const userId = c.var.user.id;
  const rel = await loadRelationship(c.req.param("id"));
  if (!rel) return c.json({ error: "Not found" }, 404);
  if (rel.disciplerId !== userId) return c.json({ error: "Only the discipler can view flags." }, 403);
  if (!rel.groupId) return c.json({ flags: [] });

  const [group] = await db
    .select({ currentPlanId: groups.currentPlanId })
    .from(groups)
    .where(eq(groups.id, rel.groupId))
    .limit(1);
  const planId = group?.currentPlanId;

  const rows = await db
    .select({
      flaggedAt: flaggedResponses.flaggedAt,
      questionType: flaggedResponses.questionType,
      responseId: flaggedResponses.responseId,
      sub: devotionalSubmissions,
    })
    .from(flaggedResponses)
    .innerJoin(devotionalSubmissions, eq(devotionalSubmissions.id, flaggedResponses.responseId))
    .where(eq(flaggedResponses.discipleshipRelationshipId, rel.id))
    .orderBy(desc(flaggedResponses.flaggedAt));

  const days = planId
    ? await db
        .select({ dayNumber: devotionalDays.dayNumber, chapter: devotionalDays.chapter })
        .from(devotionalDays)
        .where(eq(devotionalDays.planId, planId))
    : [];
  const chapterByDay = new Map(days.map((d) => [d.dayNumber, d.chapter]));

  const fieldText = (sub: typeof devotionalSubmissions.$inferSelect, qt: string): string | null => {
    switch (qt) {
      case "q1": return sub.q1Private ? null : sub.response1;
      case "q2": return sub.q2Private ? null : sub.response2;
      case "q3": return sub.q3Private ? null : sub.response3;
      case "praise": return sub.prayerPrivate ? null : sub.prayer;
      default: return null;
    }
  };

  const flags = rows.map((r) => ({
    responseId: r.responseId,
    questionType: r.questionType,
    flaggedAt: r.flaggedAt,
    dayNumber: r.sub.dayNumber,
    chapter: chapterByDay.get(r.sub.dayNumber) ?? null,
    submittedAt: r.sub.submittedAt,
    text: fieldText(r.sub, r.questionType),
  }));

  return c.json({ flags });
});

// ─── Feature 5 — Mailbox (text) ───────────────────────────────────────────────

// GET /api/discipleship/:id/mailbox — full thread; marks the other party's
// messages read. Either party.
discipleship.get("/:id/mailbox", async (c) => {
  const userId = c.var.user.id;
  const rel = await loadRelationship(c.req.param("id"));
  if (!rel) return c.json({ error: "Not found" }, 404);
  if (rel.disciplerId !== userId && rel.discipleId !== userId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  await db
    .update(mailboxMessages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(mailboxMessages.discipleshipRelationshipId, rel.id),
        ne(mailboxMessages.senderId, userId),
        isNull(mailboxMessages.readAt)
      )
    );

  const messages = await db
    .select()
    .from(mailboxMessages)
    .where(eq(mailboxMessages.discipleshipRelationshipId, rel.id))
    .orderBy(asc(mailboxMessages.createdAt));

  return c.json({ messages });
});

const mailboxSchema = z.object({
  messageText: z.string().trim().min(1).max(5000),
});

// POST /api/discipleship/:id/mailbox — send a text message. Either party.
discipleship.post("/:id/mailbox", async (c) => {
  const userId = c.var.user.id;
  const rel = await loadRelationship(c.req.param("id"));
  if (!rel) return c.json({ error: "Not found" }, 404);
  if (rel.disciplerId !== userId && rel.discipleId !== userId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const parsed = mailboxSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);

  const [row] = await db
    .insert(mailboxMessages)
    .values({
      discipleshipRelationshipId: rel.id,
      senderId: userId,
      messageType: "text",
      messageText: parsed.data.messageText,
    })
    .returning();

  notifyMailboxMessage(rel.id, userId).catch((err) =>
    console.error("[discipleship] notifyMailboxMessage failed:", err)
  );

  return c.json({ message: row });
});
