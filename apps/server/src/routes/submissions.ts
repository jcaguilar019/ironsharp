import { Hono } from "hono";
import { z } from "zod";
import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  devotionalSubmissions,
  groups,
  groupMembers,
  profiles,
} from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";
import { notifyPartnerDone, notifyGroupCompleteIfDone } from "../lib/push.js";
import { clientDateString } from "../lib/localday.js";

export const submissions = new Hono<AppEnv>();

submissions.use("*", requireAuth);

const groupDayQuery = z.object({
  planId: z.string().uuid(),
  dayNumber: z.coerce.number().int().positive(),
});

const submissionSchema = z.object({
  planId: z.string().uuid(),
  dayNumber: z.number().int().positive(),
  response1: z.string().nullish(),
  response2: z.string().nullish(),
  response3: z.string().nullish(),
  q3Question: z.string().nullish(),
  prayer: z.string().nullish(),
  voiceMemoUrl: z.string().nullish(),
  audioQ1Url: z.string().nullish(),
  audioQ2Url: z.string().nullish(),
  q1Private: z.boolean().optional(),
  q2Private: z.boolean().optional(),
  q3Private: z.boolean().optional(),
  prayerPrivate: z.boolean().optional(),
  voiceMemoPrivate: z.boolean().optional(),
  submissionSource: z.enum(["typed", "commute", "voice_memo", "voice"]).optional(),
  // The group instance this answer belongs to. Omitted/null = personal.
  groupId: z.string().uuid().nullish(),
});

// GET /api/submissions/group/day?planId=&dayNumber=
// Returns all group members' submissions for the given plan day, with private fields stripped.
// Finds the group automatically based on the requesting user's membership.
submissions.get("/group/day", async (c) => {
  const userId = c.var.user.id;
  const parsed = groupDayQuery.safeParse({
    planId: c.req.query("planId"),
    dayNumber: c.req.query("dayNumber"),
  });
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid query" }, 400);
  const { planId, dayNumber } = parsed.data;

  // Find a group the user belongs to that has this plan active
  const [membership] = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(and(eq(groupMembers.userId, userId), eq(groups.currentPlanId, planId)))
    .limit(1);

  if (!membership) return c.json({ responses: [] });

  // Get all members of that group
  const members = await db
    .select({
      userId: groupMembers.userId,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(groupMembers)
    .leftJoin(profiles, eq(profiles.userId, groupMembers.userId))
    .where(eq(groupMembers.groupId, membership.groupId));

  const memberIds = members.map((m) => m.userId);
  if (memberIds.length === 0) return c.json({ responses: [] });

  // Fetch their submissions for this day
  const subs = await db
    .select()
    .from(devotionalSubmissions)
    .where(
      and(
        inArray(devotionalSubmissions.userId, memberIds),
        eq(devotionalSubmissions.planId, planId),
        eq(devotionalSubmissions.dayNumber, dayNumber),
        // Only this group's answers — not members' personal copies of the same plan.
        eq(devotionalSubmissions.groupId, membership.groupId)
      )
    );

  const subByUser = new Map(subs.map((s) => [s.userId, s]));

  const responses = members
    .filter((m) => subByUser.has(m.userId))
    .map((m) => {
      const sub = subByUser.get(m.userId)!;
      const isOwn = m.userId === userId;
      return {
        userId: m.userId,
        isOwn,
        displayName: m.displayName ?? "Member",
        avatarUrl: m.avatarUrl ?? null,
        response1: isOwn || !sub.q1Private ? sub.response1 : null,
        response2: isOwn || !sub.q2Private ? sub.response2 : null,
        prayer: isOwn || !sub.prayerPrivate ? sub.prayer : null,
        q1Private: sub.q1Private,
        q2Private: sub.q2Private,
        prayerPrivate: sub.prayerPrivate,
        submittedAt: sub.submittedAt,
      };
    })
    // Show own response first, then others alphabetically
    .sort((a, b) => {
      if (a.isOwn) return -1;
      if (b.isOwn) return 1;
      return a.displayName.localeCompare(b.displayName);
    });

  return c.json({ responses });
});

// GET /api/submissions/plan/:planId → all user's submissions for a plan (ordered by day)
submissions.get("/plan/:planId", async (c) => {
  const userId = c.var.user.id;
  const planId = c.req.param("planId");

  const rows = await db
    .select()
    .from(devotionalSubmissions)
    .where(
      and(
        eq(devotionalSubmissions.userId, userId),
        eq(devotionalSubmissions.planId, planId)
      )
    )
    .orderBy(asc(devotionalSubmissions.dayNumber));

  return c.json({ submissions: rows });
});

// GET /api/submissions/:planId/:dayNumber → the user's own submission, if any
submissions.get("/:planId/:dayNumber", async (c) => {
  const userId = c.var.user.id;
  const planId = c.req.param("planId");
  const dayNumber = Number(c.req.param("dayNumber"));
  const groupId = c.req.query("groupId") || null;

  const [row] = await db
    .select()
    .from(devotionalSubmissions)
    .where(
      and(
        eq(devotionalSubmissions.userId, userId),
        eq(devotionalSubmissions.planId, planId),
        eq(devotionalSubmissions.dayNumber, dayNumber),
        groupId
          ? eq(devotionalSubmissions.groupId, groupId)
          : isNull(devotionalSubmissions.groupId)
      )
    )
    .limit(1);

  return c.json({ submission: row ?? null });
});

// PUT /api/submissions → upsert the user's submission for a plan day
submissions.put("/", async (c) => {
  const userId = c.var.user.id;
  const parsed = submissionSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const body = parsed.data;
  const { planId, dayNumber } = body;
  const groupId = body.groupId ?? null;

  const fields = {
    response1: body.response1 ?? null,
    response2: body.response2 ?? null,
    response3: body.response3 ?? null,
    q3Question: body.q3Question ?? null,
    prayer: body.prayer ?? null,
    voiceMemoUrl: body.voiceMemoUrl ?? null,
    audioQ1Url: body.audioQ1Url ?? null,
    audioQ2Url: body.audioQ2Url ?? null,
    q1Private: body.q1Private ?? false,
    q2Private: body.q2Private ?? false,
    q3Private: body.q3Private ?? false,
    prayerPrivate: body.prayerPrivate ?? true,
    voiceMemoPrivate: body.voiceMemoPrivate ?? false,
    submissionSource: body.submissionSource ?? "typed",
    updatedAt: new Date(),
  };

  // One submission per scope (user, plan, day, instance). groupId NULL = personal.
  // Enforced in app code: a nullable groupId can't dedupe NULLs in a Postgres
  // unique index, so find-then-update/insert instead of onConflict.
  const scope = and(
    eq(devotionalSubmissions.userId, userId),
    eq(devotionalSubmissions.planId, planId),
    eq(devotionalSubmissions.dayNumber, dayNumber),
    groupId
      ? eq(devotionalSubmissions.groupId, groupId)
      : isNull(devotionalSubmissions.groupId)
  );

  const [existing] = await db
    .select({ id: devotionalSubmissions.id })
    .from(devotionalSubmissions)
    .where(scope)
    .limit(1);

  const [row] = existing
    ? await db
        .update(devotionalSubmissions)
        .set(fields)
        .where(eq(devotionalSubmissions.id, existing.id))
        .returning()
    : await db
        .insert(devotionalSubmissions)
        .values({ userId, planId, dayNumber, groupId, ...fields })
        .returning();

  // Background tasks — none of these block the response. `today` is the
  // submitter's LOCAL calendar day (x-timezone-offset header), not UTC.
  const today = clientDateString(c);
  updateStreaks(userId, planId, dayNumber, today, groupId).catch((err) => console.error("[submissions] updateStreaks failed:", err));
  notifyPartnerDone(userId, planId).catch((err) => console.error("[submissions] notifyPartnerDone failed:", err));
  notifyGroupCompleteIfDone(userId, planId, dayNumber, groupId).catch((err) => console.error("[submissions] notifyGroupCompleteIfDone failed:", err));

  return c.json({ submission: row });
});

// ─── Streak helpers ───────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function isYesterday(dateStr: string, today: string): boolean {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return toDateString(d) === today;
}

async function updatePersonalStreak(userId: string, today: string) {
  const [profile] = await db
    .select({ streakCount: profiles.streakCount, lastStreakDate: profiles.lastStreakDate })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (!profile) return;
  // Skip if already counted today — or stamped a day that's >= today, which can
  // happen transiently as stored UTC dates give way to local ones. Never reset
  // on that crossover.
  if (profile.lastStreakDate && profile.lastStreakDate >= today) return;

  const newStreak =
    profile.lastStreakDate && isYesterday(profile.lastStreakDate, today)
      ? profile.streakCount + 1
      : 1;

  await db
    .update(profiles)
    .set({ streakCount: newStreak, lastStreakDate: today, updatedAt: new Date() })
    .where(eq(profiles.userId, userId));
}

async function updateGroupStreaks(userId: string, planId: string, dayNumber: number, today: string, groupId: string | null) {
  // A personal submission (no group instance) never advances a group.
  if (!groupId) return;
  // Only the group this submission was actually made in counts toward its day.
  const memberRows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(
      and(
        eq(groupMembers.userId, userId),
        eq(groupMembers.groupId, groupId),
        eq(groups.currentPlanId, planId),
        eq(groups.currentDay, dayNumber)
      )
    );

  for (const { groupId } of memberRows) {
    const [group] = await db
      .select({ streakCount: groups.streakCount, lastStreakDate: groups.lastStreakDate })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!group) continue;

    // New day: reset doneToday for all members, then immediately stamp today so
    // subsequent submitters don't re-trigger this reset and wipe earlier members.
    // Also carry forward or zero out streakCount now, so the "all done" step can
    // simply do streakCount + 1 regardless of which member triggers it.
    if (!group.lastStreakDate || group.lastStreakDate < today) {
      const streakCarryover =
        group.lastStreakDate && isYesterday(group.lastStreakDate, today)
          ? group.streakCount
          : 0;
      await db
        .update(groupMembers)
        .set({ doneToday: false })
        .where(eq(groupMembers.groupId, groupId));
      await db
        .update(groups)
        .set({ streakCount: streakCarryover, lastStreakDate: today, updatedAt: new Date() })
        .where(eq(groups.id, groupId));
    }

    // Mark this member done and update their individual streak within this group.
    const [memberRow] = await db
      .select({ streakCount: groupMembers.streakCount, lastStreakDate: groupMembers.lastStreakDate })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
      .limit(1);

    let newMemberStreak = memberRow?.streakCount ?? 1;
    if (memberRow && (!memberRow.lastStreakDate || memberRow.lastStreakDate < today)) {
      const prev = memberRow.lastStreakDate ? new Date(memberRow.lastStreakDate + "T00:00:00Z") : null;
      if (prev) prev.setUTCDate(prev.getUTCDate() + 1);
      newMemberStreak = prev && prev.toISOString().slice(0, 10) === today
        ? memberRow.streakCount + 1
        : 1;
    }

    await db
      .update(groupMembers)
      .set({ doneToday: true, streakCount: newMemberStreak, lastStreakDate: today })
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

    // Check if every member is done.
    const [totals] = await db
      .select({
        total: count(),
        done: sql<number>`sum(case when done_today then 1 else 0 end)::int`,
      })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));

    const total = totals?.total ?? 0;
    const done = totals?.done ?? 0;
    if (total === 0 || done < total) continue;

    // Everyone's done — re-fetch streakCount (may have been updated by the reset above).
    const [fresh] = await db
      .select({ streakCount: groups.streakCount })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    await db
      .update(groups)
      .set({ streakCount: (fresh?.streakCount ?? 0) + 1, lastStreakDate: today, updatedAt: new Date() })
      .where(eq(groups.id, groupId));
  }
}

async function updateStreaks(userId: string, planId: string, dayNumber: number, today: string, groupId: string | null) {
  await Promise.all([
    updatePersonalStreak(userId, today),
    updateGroupStreaks(userId, planId, dayNumber, today, groupId),
  ]);
}
