import { Hono } from "hono";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  devotionalSubmissions,
  groups,
  groupMembers,
  profiles,
} from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";
import { notifyPartnerDone, notifyGroupCompleteIfDone } from "../lib/push.js";

export const submissions = new Hono<AppEnv>();

submissions.use("*", requireAuth);

// GET /api/submissions/group/day?planId=&dayNumber=
// Returns all group members' submissions for the given plan day, with private fields stripped.
// Finds the group automatically based on the requesting user's membership.
submissions.get("/group/day", async (c) => {
  const userId = c.var.user.id;
  const planId = c.req.query("planId");
  const dayNumber = Number(c.req.query("dayNumber"));
  if (!planId || !dayNumber) return c.json({ error: "planId and dayNumber are required" }, 400);

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
        eq(devotionalSubmissions.dayNumber, dayNumber)
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
    audioQ1Url: body.audioQ1Url ?? null,
    audioQ2Url: body.audioQ2Url ?? null,
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
        audioQ1Url: values.audioQ1Url,
        audioQ2Url: values.audioQ2Url,
        q1Private: values.q1Private,
        q2Private: values.q2Private,
        prayerPrivate: values.prayerPrivate,
        voiceMemoPrivate: values.voiceMemoPrivate,
        submissionSource: values.submissionSource,
        updatedAt: values.updatedAt,
      },
    })
    .returning();

  // Background tasks — none of these block the response.
  updateStreaks(userId, planId, dayNumber).catch(() => {});
  notifyPartnerDone(userId, planId).catch(() => {});
  notifyGroupCompleteIfDone(userId, planId, dayNumber).catch(() => {});

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
  if (profile.lastStreakDate === today) return; // already counted today

  const newStreak =
    profile.lastStreakDate && isYesterday(profile.lastStreakDate, today)
      ? profile.streakCount + 1
      : 1;

  await db
    .update(profiles)
    .set({ streakCount: newStreak, lastStreakDate: today, updatedAt: new Date() })
    .where(eq(profiles.userId, userId));
}

async function updateGroupStreaks(userId: string, planId: string, dayNumber: number, today: string) {
  // Find groups where this submission counts toward the group's active day.
  const memberRows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(
      and(
        eq(groupMembers.userId, userId),
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
    if (group.lastStreakDate !== today) {
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

    // Mark this member done.
    await db
      .update(groupMembers)
      .set({ doneToday: true })
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

async function updateStreaks(userId: string, planId: string, dayNumber: number) {
  const today = toDateString(new Date());
  await Promise.all([
    updatePersonalStreak(userId, today),
    updateGroupStreaks(userId, planId, dayNumber, today),
  ]);
}
