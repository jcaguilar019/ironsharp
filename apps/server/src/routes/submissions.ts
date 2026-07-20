import { Hono } from "hono";
import { z } from "zod";
import { and, asc, count, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  devotionalSubmissions,
  groups,
  groupMembers,
  profiles,
} from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";
import { notifyPartnerDone, notifyGroupCompleteIfDone } from "../lib/push.js";
import { clientDateString, clientDayWindow } from "../lib/localday.js";
import {
  activeGroupRun,
  activePersonalRun,
  ensureGroupRun,
  ensurePersonalRun,
  groupRuns,
  personalRuns,
  type PlanRun,
} from "../lib/plan-runs.js";
import { isCalendarPaced } from "../lib/group-pacing.js";

export const submissions = new Hono<AppEnv>();

submissions.use("*", requireAuth);

const groupDayQuery = z.object({
  planId: z.string().uuid(),
  dayNumber: z.coerce.number().int().positive(),
  // The group instance to read. Optional only for older clients — without it,
  // a user in two groups on the same plan gets an arbitrary one.
  groupId: z.string().uuid().optional(),
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
    groupId: c.req.query("groupId") || undefined,
  });
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid query" }, 400);
  const { planId, dayNumber, groupId } = parsed.data;

  // Resolve the group instance: explicitly from the client when given (the
  // reader knows which group it's in), otherwise fall back to the user's oldest
  // live group on this plan (deterministic, archived excluded) for old clients.
  const [membership] = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(
      and(
        eq(groupMembers.userId, userId),
        groupId ? eq(groups.id, groupId) : eq(groups.currentPlanId, planId),
        isNull(groups.archivedAt)
      )
    )
    .orderBy(asc(groups.createdAt))
    .limit(1);

  if (!membership) return c.json({ responses: [] });

  // Scope to the group's current run of this plan (falling back to the most
  // recent one) so a re-run doesn't surface the previous run's answers.
  const run =
    (await activeGroupRun(membership.groupId, planId)) ??
    (await groupRuns(membership.groupId, planId))[0] ??
    null;

  // Fetch the day's submissions joined to profiles directly — NOT filtered to
  // current members — so someone who submitted and later left the group doesn't
  // vanish from a feed they contributed to. The groupId scope already limits
  // rows to answers made inside this group.
  const subs = await db
    .select({
      sub: devotionalSubmissions,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(devotionalSubmissions)
    .leftJoin(profiles, eq(profiles.userId, devotionalSubmissions.userId))
    .where(
      and(
        eq(devotionalSubmissions.planId, planId),
        eq(devotionalSubmissions.dayNumber, dayNumber),
        // Only this group's answers — not members' personal copies of the same plan.
        eq(devotionalSubmissions.groupId, membership.groupId),
        ...(run ? [eq(devotionalSubmissions.runId, run.id)] : [])
      )
    );

  const responses = subs
    .map(({ sub, displayName, avatarUrl }) => {
      const isOwn = sub.userId === userId;
      return {
        userId: sub.userId,
        isOwn,
        displayName: displayName ?? "Member",
        avatarUrl: avatarUrl ?? null,
        response1: isOwn || !sub.q1Private ? sub.response1 : null,
        response2: isOwn || !sub.q2Private ? sub.response2 : null,
        // The discipler's daily question — same privacy treatment as Q1/Q2.
        response3: isOwn || !sub.q3Private ? sub.response3 : null,
        q3Question: sub.q3Question,
        prayer: isOwn || !sub.prayerPrivate ? sub.prayer : null,
        q1Private: sub.q1Private,
        q2Private: sub.q2Private,
        q3Private: sub.q3Private,
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

// GET /api/submissions/plan/:planId?groupId= → the user's submissions for ONE
// run of a plan (a group instance, or their personal run when groupId is
// absent). A shared plan can have several runs; mixing them scrambles history.
submissions.get("/plan/:planId", async (c) => {
  const userId = c.var.user.id;
  const planId = c.req.param("planId");
  const groupId = c.req.query("groupId") || null;

  // Pick the run to show: the active run when it has entries, otherwise the
  // most recent run that does — so "review my reflections" after a restart
  // still shows the finished run instead of an empty new one.
  const runs = groupId ? await groupRuns(groupId, planId) : await personalRuns(userId, planId);
  let rows: (typeof devotionalSubmissions.$inferSelect)[] = [];
  const scope = (run: PlanRun | null) =>
    and(
      eq(devotionalSubmissions.userId, userId),
      eq(devotionalSubmissions.planId, planId),
      groupId ? eq(devotionalSubmissions.groupId, groupId) : isNull(devotionalSubmissions.groupId),
      ...(run ? [eq(devotionalSubmissions.runId, run.id)] : [])
    );

  if (runs.length === 0) {
    rows = await db.select().from(devotionalSubmissions).where(scope(null)).orderBy(asc(devotionalSubmissions.dayNumber));
  } else {
    const active = runs.find((r) => !r.completedAt && !r.endedAt);
    const ordered = active ? [active, ...runs.filter((r) => r.id !== active.id)] : runs;
    for (const run of ordered) {
      rows = await db.select().from(devotionalSubmissions).where(scope(run)).orderBy(asc(devotionalSubmissions.dayNumber));
      if (rows.length > 0) break;
    }
  }

  return c.json({ submissions: rows });
});

// GET /api/submissions/:planId/:dayNumber → the user's own submission, if any
submissions.get("/:planId/:dayNumber", async (c) => {
  const userId = c.var.user.id;
  const planId = c.req.param("planId");
  const dayNumber = Number(c.req.param("dayNumber"));
  const groupId = c.req.query("groupId") || null;

  // Prefill comes from the ACTIVE run — after a restart, day inputs come back
  // blank rather than resurrecting the previous run's answers. With no active
  // run (just-completed/stopped state), read the newest run, never a mix.
  const run =
    (groupId ? await activeGroupRun(groupId, planId) : await activePersonalRun(userId, planId)) ??
    (groupId ? (await groupRuns(groupId, planId))[0] : (await personalRuns(userId, planId))[0]) ??
    null;

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
          : isNull(devotionalSubmissions.groupId),
        ...(run ? [eq(devotionalSubmissions.runId, run.id)] : [])
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

  // Which RUN this answer belongs to. ensure* creates one only as a safety net
  // for legacy data — starts and assignments open runs up front.
  const run = groupId
    ? await ensureGroupRun(groupId, planId, dayNumber)
    : await ensurePersonalRun(userId, planId);

  // One submission per scope (user, plan, day, run). groupId NULL = personal.
  // Enforced in app code: a nullable groupId can't dedupe NULLs in a Postgres
  // unique index, so find-then-update/insert instead of onConflict.
  const scope = and(
    eq(devotionalSubmissions.userId, userId),
    eq(devotionalSubmissions.planId, planId),
    eq(devotionalSubmissions.dayNumber, dayNumber),
    groupId
      ? eq(devotionalSubmissions.groupId, groupId)
      : isNull(devotionalSubmissions.groupId),
    eq(devotionalSubmissions.runId, run.id)
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
        .values({ userId, planId, dayNumber, groupId, runId: run.id, ...fields })
        .returning();

  // Background tasks — none of these block the response, and none run on an
  // EDIT of an existing submission: re-saving your answers isn't a new
  // completion, so it must not re-notify partners or re-advance streaks.
  // `today` is the submitter's LOCAL calendar day (x-timezone-offset header).
  if (!existing) {
    const today = clientDateString(c);
    const { start: todayStart } = clientDayWindow(c);
    updateStreaks(userId, planId, dayNumber, today, groupId, todayStart).catch((err) => console.error("[submissions] updateStreaks failed:", err));
    notifyPartnerDone(userId, planId, groupId).catch((err) => console.error("[submissions] notifyPartnerDone failed:", err));
    notifyGroupCompleteIfDone(userId, planId, dayNumber, groupId, run.id, todayStart).catch((err) => console.error("[submissions] notifyGroupCompleteIfDone failed:", err));
  }

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

async function updateGroupStreaks(userId: string, planId: string, dayNumber: number, today: string, groupId: string | null, todayStart: Date) {
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
      .select({
        streakCount: groups.streakCount,
        lastStreakDate: groups.lastStreakDate,
        currentPlanStartedAt: groups.currentPlanStartedAt,
        groupType: groups.groupType,
      })
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

    // Calendar-paced groups don't keep a group streak. The bar below is every
    // member, which is unreachable once a group is church-sized — the number
    // would sit at 0 forever and mean nothing. Members keep their own per-group
    // streak, stamped just above. See lib/group-pacing.ts.
    if (isCalendarPaced(group.groupType)) continue;

    // Check if every member is done — mid-day joiners aren't required today,
    // or inviting someone would freeze the group's streak/advance until the
    // next catch-up pass. On the plan's FIRST day everyone is required
    // regardless of join time (mirrors the allDone rule in groups.ts), or a
    // group created today would have zero required members and its streak
    // could never tick on day one.
    const planStartedToday =
      !!group.currentPlanStartedAt && group.currentPlanStartedAt >= todayStart;
    const [totals] = await db
      .select({
        total: count(),
        done: sql<number>`sum(case when done_today then 1 else 0 end)::int`,
      })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          planStartedToday ? undefined : lt(groupMembers.joinedAt, todayStart)
        )
      );

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

async function updateStreaks(userId: string, planId: string, dayNumber: number, today: string, groupId: string | null, todayStart: Date) {
  await Promise.all([
    updatePersonalStreak(userId, today),
    updateGroupStreaks(userId, planId, dayNumber, today, groupId, todayStart),
  ]);
}
