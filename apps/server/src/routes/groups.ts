import { Hono } from "hono";
import { z } from "zod";
import { and, count, desc, eq, gte, inArray, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  groups,
  groupMembers,
  groupPlanHistory,
  profiles,
  devotionalPlans,
  devotionalDays,
  devotionalSubmissions,
  planRuns,
} from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";
import { TIER_LIMITS, TIER_NAMES, type MembershipTier } from "../lib/tiers.js";
import { clientDateString, clientDayWindow, effectiveStreak } from "../lib/localday.js";
import { activeGroupRun, closeRun, ensureGroupRun, groupRuns, setRunDay } from "../lib/plan-runs.js";

export const groupsRoute = new Hono<AppEnv>();
groupsRoute.use("*", requireAuth);

// Must stay in sync with GROUP_TYPE_CONFIG in apps/mobile/app/(tabs)/groups.tsx.
const GROUP_TYPES = ["one-on-one", "family", "small-group", "large-group", "community"] as const;

const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  groupType: z.enum(GROUP_TYPES),
});
const joinSchema = z.object({ inviteCode: z.string().trim().min(1) });
const reorderSchema = z.object({
  order: z.array(z.object({ groupId: z.string().uuid(), displayOrder: z.number().int() })).min(1),
});
const updateNameSchema = z.object({ name: z.string().trim().min(1).max(100) });
const addMemberSchema = z.object({ userId: z.string().min(1) });
const assignPlanSchema = z.object({ planId: z.string().uuid() });
const groupDaySchema = z.object({
  nextDay: z.number().int().positive().optional(),
  completed: z.boolean().optional(),
});

/**
 * A finished group plan counts toward each participating member's personal
 * completion stats — anyone who submitted at least one day of this run.
 * (Solo runs get this via PATCH /progress; group runs close out here.)
 */
async function creditGroupCompletion(groupId: string, planId: string): Promise<void> {
  const participants = await db
    .selectDistinct({ userId: devotionalSubmissions.userId })
    .from(devotionalSubmissions)
    .where(and(eq(devotionalSubmissions.groupId, groupId), eq(devotionalSubmissions.planId, planId)));
  const ids = participants.map((p) => p.userId);
  if (ids.length === 0) return;
  await db
    .update(profiles)
    .set({ totalCompleted: sql`${profiles.totalCompleted} + 1`, updatedAt: new Date() })
    .where(inArray(profiles.userId, ids));
}

// GET /api/groups — all groups the user belongs to, ordered by display_order
groupsRoute.get("/", async (c) => {
  const userId = c.var.user.id;
  // A member counts as done if they've submitted the group's CURRENT day, OR
  // submitted anything for this plan today. The submissions table is the source
  // of truth (the doneToday flag resets on day-advance; lastStreakDate is only
  // stamped when completing through the group context, not from Home/Plans).
  // The "current day" arm covers multi-member groups where a member finished on
  // a prior calendar day and the group hasn't advanced yet; the "today" arm
  // covers a solo/last member whose completion advances the day and would
  // otherwise clear their own check instantly. Bounded to the requester's local
  // day (x-timezone-offset header) so checks don't clear in the evening when the
  // UTC day rolls over ahead of the user's calendar day.
  const { start: todayStart, end: tomorrowStart } = clientDayWindow(c);
  const today = clientDateString(c);

  const memberships = await db
    .select({ group: groups, membership: groupMembers, plan: devotionalPlans })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .leftJoin(devotionalPlans, eq(groups.currentPlanId, devotionalPlans.id))
    // Archived groups are hidden from the active list — they live under "Past groups".
    .where(and(eq(groupMembers.userId, userId), isNull(groups.archivedAt)))
    .orderBy(groupMembers.displayOrder);

  const result = await Promise.all(
    memberships.map(async ({ group, membership, plan }) => {
      // Ghost-member catch-up: a group's day only advances when EVERYONE has
      // submitted, so one silent member would freeze the group forever. If the
      // current day has a submission from a PREVIOUS local day and the group
      // still hasn't moved, advance it now — the day simply counts as missed
      // for whoever didn't submit, and the streak doesn't extend. Advances at
      // most one day per load, so a long idle gap catches up gently.
      if (group.currentPlanId && group.currentDay) {
        const [stale] = await db
          .select({ id: devotionalSubmissions.id })
          .from(devotionalSubmissions)
          .where(
            and(
              eq(devotionalSubmissions.planId, group.currentPlanId),
              eq(devotionalSubmissions.groupId, group.id),
              eq(devotionalSubmissions.dayNumber, group.currentDay),
              lt(devotionalSubmissions.submittedAt, todayStart)
            )
          )
          .limit(1);
        if (stale) {
          // Optimistic lock: several members can load simultaneously, so every
          // mutation is guarded by the (planId, currentDay) we based it on — the
          // first request wins, the rest see zero rows and change nothing
          // (double-advancing would silently skip a day).
          if (plan && group.currentDay >= plan.totalDays) {
            // Last day went stale — close the plan out like /:id/day does.
            const closed = await db
              .update(groups)
              .set({ currentPlanId: null, currentPlanStartedAt: null, currentDay: 1, updatedAt: new Date() })
              .where(
                and(
                  eq(groups.id, group.id),
                  eq(groups.currentPlanId, plan.id),
                  eq(groups.currentDay, group.currentDay)
                )
              )
              .returning({ id: groups.id });
            if (closed.length > 0) {
              await db.insert(groupPlanHistory).values({
                groupId: group.id,
                planId: plan.id,
                planTitle: plan.title,
              });
              await creditGroupCompletion(group.id, plan.id).catch(() => {});
              const run = await activeGroupRun(group.id, plan.id);
              if (run) await closeRun(run.id, "completed");
              await db
                .update(groupMembers)
                .set({ doneToday: false })
                .where(eq(groupMembers.groupId, group.id));
            }
            group.currentPlanId = null;
            group.currentDay = 1;
            plan = null;
          } else {
            const advanced = await db
              .update(groups)
              .set({ currentDay: group.currentDay + 1, updatedAt: new Date() })
              .where(and(eq(groups.id, group.id), eq(groups.currentDay, group.currentDay)))
              .returning({ id: groups.id });
            if (advanced.length > 0) {
              await db
                .update(groupMembers)
                .set({ doneToday: false })
                .where(eq(groupMembers.groupId, group.id));
              if (group.currentPlanId) {
                const run = await activeGroupRun(group.id, group.currentPlanId);
                if (run) await setRunDay(run.id, group.currentDay + 1);
              }
            }
            group.currentDay = group.currentDay + 1;
          }
        }
      }

      const [members, dayRow, doneRows] = await Promise.all([
        db
          .select({ m: groupMembers, p: profiles })
          .from(groupMembers)
          .leftJoin(profiles, eq(groupMembers.userId, profiles.userId))
          .where(eq(groupMembers.groupId, group.id)),
        plan && group.currentDay
          ? db
              .select({ chapter: devotionalDays.chapter })
              .from(devotionalDays)
              .where(
                and(
                  eq(devotionalDays.planId, group.currentPlanId!),
                  eq(devotionalDays.dayNumber, group.currentDay)
                )
              )
              .limit(1)
          : Promise.resolve([]),
        // Members who submitted the current day (any date) OR submitted today.
        group.currentPlanId
          ? db
              .select({ userId: devotionalSubmissions.userId })
              .from(devotionalSubmissions)
              .where(
                and(
                  eq(devotionalSubmissions.planId, group.currentPlanId),
                  // Only this group's own submissions — not the member's personal
                  // copy or another group's copy of the same shared plan.
                  eq(devotionalSubmissions.groupId, group.id),
                  or(
                    group.currentDay
                      ? eq(devotionalSubmissions.dayNumber, group.currentDay)
                      : sql`false`,
                    and(
                      gte(devotionalSubmissions.submittedAt, todayStart),
                      lt(devotionalSubmissions.submittedAt, tomorrowStart)
                    )
                  )
                )
              )
          : Promise.resolve([]),
      ]);

      const doneUserIds = new Set(
        (doneRows as { userId: string }[]).map((r) => r.userId)
      );

      return {
        id: group.id,
        name: group.name,
        groupType: group.groupType,
        inviteCode: group.inviteCode,
        currentDay: group.currentDay,
        streakCount: effectiveStreak(group.streakCount, group.lastStreakDate, today),
        displayOrder: membership.displayOrder,
        plan: plan
          ? {
              id: plan.id,
              title: plan.title,
              chapter: (dayRow as { chapter: string }[])[0]?.chapter ?? null,
              totalDays: plan.totalDays,
            }
          : null,
        members: members.map(({ m, p }) => ({
          id: m.id,
          userId: m.userId,
          memberRole: m.memberRole,
          doneToday: doneUserIds.has(m.userId),
          streakCount: effectiveStreak(m.streakCount, m.lastStreakDate, today),
          displayName: p?.displayName ?? "Member",
          avatarUrl: p?.avatarUrl ?? null,
        })),
      };
    })
  );

  return c.json({ groups: result });
});

// GET /api/groups/archive-notices — one-time "your group was deleted" notices
// (archived groups this user belongs to and hasn't acknowledged; not the archiver).
groupsRoute.get("/archive-notices", async (c) => {
  const userId = c.var.user.id;

  const rows = await db
    .select({ groupId: groups.id, groupName: groups.name, archivedBy: groups.archivedBy })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(
      and(
        eq(groupMembers.userId, userId),
        eq(groupMembers.archiveNoticeSeen, false),
        isNotNull(groups.archivedAt),
        ne(groups.archivedBy, userId)
      )
    );

  const notices = await Promise.all(
    rows.map(async (r) => {
      let archivedByName = "The group creator";
      if (r.archivedBy) {
        const [p] = await db
          .select({ displayName: profiles.displayName })
          .from(profiles)
          .where(eq(profiles.userId, r.archivedBy))
          .limit(1);
        if (p?.displayName) archivedByName = p.displayName;
      }
      return { groupId: r.groupId, groupName: r.groupName, archivedByName };
    })
  );

  return c.json({ notices });
});

// POST /api/groups/archive-notices/seen — acknowledge the notices so they don't show again
groupsRoute.post("/archive-notices/seen", async (c) => {
  const userId = c.var.user.id;

  // Scope strictly to the caller's memberships in *archived* groups, so a future
  // archive of a currently-active group still shows its notice.
  const rows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(
      and(
        eq(groupMembers.userId, userId),
        eq(groupMembers.archiveNoticeSeen, false),
        isNotNull(groups.archivedAt)
      )
    );

  const ids = rows.map((r) => r.groupId);
  if (ids.length > 0) {
    await db
      .update(groupMembers)
      .set({ archiveNoticeSeen: true })
      .where(and(eq(groupMembers.userId, userId), inArray(groupMembers.groupId, ids)));
  }

  return c.json({ ok: true });
});

// GET /api/groups/archived — archived groups the user belongs to, each with the
// plans it completed or was midway through, and its members (for the past view).
groupsRoute.get("/archived", async (c) => {
  const userId = c.var.user.id;

  const rows = await db
    .select({ group: groups })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(and(eq(groupMembers.userId, userId), isNotNull(groups.archivedAt)))
    .orderBy(desc(groups.archivedAt));

  const result = await Promise.all(
    rows.map(async ({ group }) => {
      const [members, history, currentPlanRow, archiver] = await Promise.all([
        db
          .select({ userId: groupMembers.userId, displayName: profiles.displayName, avatarUrl: profiles.avatarUrl })
          .from(groupMembers)
          .leftJoin(profiles, eq(groupMembers.userId, profiles.userId))
          .where(eq(groupMembers.groupId, group.id)),
        db
          .select({ planId: groupPlanHistory.planId, title: groupPlanHistory.planTitle, completedAt: groupPlanHistory.completedAt })
          .from(groupPlanHistory)
          .where(eq(groupPlanHistory.groupId, group.id))
          .orderBy(desc(groupPlanHistory.completedAt)),
        group.currentPlanId
          ? db
              .select({ id: devotionalPlans.id, title: devotionalPlans.title, totalDays: devotionalPlans.totalDays })
              .from(devotionalPlans)
              .where(eq(devotionalPlans.id, group.currentPlanId))
              .limit(1)
          : Promise.resolve([]),
        group.archivedBy
          ? db.select({ displayName: profiles.displayName }).from(profiles).where(eq(profiles.userId, group.archivedBy)).limit(1)
          : Promise.resolve([]),
      ]);

      const currentPlan = (currentPlanRow as { id: string; title: string; totalDays: number }[])[0];
      const plans = [
        ...(currentPlan
          ? [{ planId: currentPlan.id, title: currentPlan.title, totalDays: currentPlan.totalDays, status: "in-progress" as const, completedAt: null as string | null }]
          : []),
        ...history.map((h) => ({
          planId: h.planId,
          title: h.title,
          totalDays: null as number | null,
          status: "completed" as const,
          completedAt: h.completedAt ? h.completedAt.toISOString() : null,
        })),
      ];

      return {
        id: group.id,
        name: group.name,
        groupType: group.groupType,
        archivedAt: group.archivedAt ? group.archivedAt.toISOString() : null,
        archivedByName: (archiver as { displayName: string | null }[])[0]?.displayName ?? "The group creator",
        members: members.map((m) => ({ userId: m.userId, displayName: m.displayName ?? "Member", avatarUrl: m.avatarUrl ?? null })),
        plans,
      };
    })
  );

  return c.json({ groups: result });
});

// GET /api/groups/:id/responses?planId= — every member's responses for a group's
// plan (for the read-only past view). Private answers are hidden from non-authors.
groupsRoute.get("/:id/responses", async (c) => {
  const userId = c.var.user.id;
  const groupId = c.req.param("id");
  const planId = c.req.query("planId");
  if (!planId) return c.json({ error: "planId required" }, 400);

  const [membership] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  if (!membership) return c.json({ error: "Not a member" }, 403);

  // The most recent run of this plan in this group — a re-run's view must not
  // interleave the previous run's answers.
  const runsForPlan = await groupRuns(groupId, planId);
  const latestRun = runsForPlan[0] ?? null;

  const [subs, members] = await Promise.all([
    db
      .select({
        userId: devotionalSubmissions.userId,
        dayNumber: devotionalSubmissions.dayNumber,
        response1: devotionalSubmissions.response1,
        response2: devotionalSubmissions.response2,
        prayer: devotionalSubmissions.prayer,
        q1Private: devotionalSubmissions.q1Private,
        q2Private: devotionalSubmissions.q2Private,
        prayerPrivate: devotionalSubmissions.prayerPrivate,
        submittedAt: devotionalSubmissions.submittedAt,
      })
      .from(devotionalSubmissions)
      .where(
        and(
          eq(devotionalSubmissions.groupId, groupId),
          eq(devotionalSubmissions.planId, planId),
          ...(latestRun ? [eq(devotionalSubmissions.runId, latestRun.id)] : [])
        )
      ),
    db
      .select({ userId: groupMembers.userId, displayName: profiles.displayName, avatarUrl: profiles.avatarUrl })
      .from(groupMembers)
      .leftJoin(profiles, eq(groupMembers.userId, profiles.userId))
      .where(eq(groupMembers.groupId, groupId)),
  ]);

  const responses = subs.map((s) => {
    const isOwn = s.userId === userId;
    return {
      userId: s.userId,
      isOwn,
      dayNumber: s.dayNumber,
      response1: isOwn || !s.q1Private ? s.response1 : null,
      response2: isOwn || !s.q2Private ? s.response2 : null,
      prayer: isOwn || !s.prayerPrivate ? s.prayer : null,
      q1Private: s.q1Private,
      q2Private: s.q2Private,
      prayerPrivate: s.prayerPrivate,
      submittedAt: s.submittedAt ? s.submittedAt.toISOString() : null,
    };
  });

  return c.json({
    members: members.map((m) => ({ userId: m.userId, displayName: m.displayName ?? "Member", avatarUrl: m.avatarUrl ?? null })),
    responses,
  });
});

// POST /api/groups — create a new group
groupsRoute.post("/", async (c) => {
  const userId = c.var.user.id;
  const parsed = createGroupSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const { name, groupType } = parsed.data;

  // Next display_order for this user
  const [maxRow] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${groupMembers.displayOrder}), -1)` })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));
  const nextOrder = (maxRow?.maxOrder ?? -1) + 1;

  // Short, readable invite code — retry on the rare collision.
  let group: typeof groups.$inferSelect | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    const [inserted] = await db
      .insert(groups)
      .values({ name: name.trim(), groupType, inviteCode, createdBy: userId })
      .onConflictDoNothing()
      .returning();
    if (inserted) { group = inserted; break; }
  }
  if (!group) return c.json({ error: "Failed to create group" }, 500);

  await db.insert(groupMembers).values({
    groupId: group.id,
    userId,
    memberRole: "leader",
    displayOrder: nextOrder,
  });

  return c.json({ group }, 201);
});

// POST /api/groups/join — join a group by invite code
groupsRoute.post("/join", async (c) => {
  const userId = c.var.user.id;
  const parsed = joinSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const { inviteCode } = parsed.data;

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.inviteCode, inviteCode.toUpperCase().trim()))
    .limit(1);
  if (!group) return c.json({ error: "Invalid invite code" }, 404);
  if (group.archivedAt) return c.json({ error: "This group has ended." }, 410);

  const [existing] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, userId)))
    .limit(1);
  if (existing) return c.json({ error: "Already a member of this group" }, 409);

  // Enforce creator's tier group size limit
  const [creatorProfile] = await db
    .select({ membershipTier: profiles.membershipTier })
    .from(profiles)
    .where(eq(profiles.userId, group.createdBy))
    .limit(1);

  const creatorTier = (creatorProfile?.membershipTier ?? "free") as MembershipTier;
  const maxSize = TIER_LIMITS[creatorTier].maxGroupSize;

  const [maxRow] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${groupMembers.displayOrder}), -1)` })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));
  const nextOrder = (maxRow?.maxOrder ?? -1) + 1;

  // Wrap size check + insert in a transaction so two concurrent joins can't
  // both pass the limit check before either one has committed.
  let tooFull = false;
  await db.transaction(async (tx) => {
    if (maxSize !== Infinity) {
      const [sizeRow] = await tx
        .select({ count: count() })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, group.id));
      if ((sizeRow?.count ?? 0) >= maxSize) {
        tooFull = true;
        return;
      }
    }
    await tx.insert(groupMembers).values({
      groupId: group.id,
      userId,
      memberRole: "member",
      displayOrder: nextOrder,
    });
  });

  if (tooFull) {
    return c.json(
      {
        error: `This group is full. The group creator's ${TIER_NAMES[creatorTier]} plan supports up to ${maxSize} members.`,
      },
      403
    );
  }

  return c.json({ group: { id: group.id, name: group.name } }, 201);
});

// PATCH /api/groups/reorder — persist drag-reorder. Body: { order: [{groupId, displayOrder}] }
groupsRoute.patch("/reorder", async (c) => {
  const userId = c.var.user.id;
  const parsed = reorderSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const { order } = parsed.data;

  await Promise.all(
    order.map(({ groupId, displayOrder }) =>
      db
        .update(groupMembers)
        .set({ displayOrder })
        .where(
          and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, userId)
          )
        )
    )
  );

  return c.json({ ok: true });
});

// PATCH /api/groups/:id — update group name (any member)
groupsRoute.patch("/:id", async (c) => {
  const userId = c.var.user.id;
  const groupId = c.req.param("id");
  const parsed = updateNameSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const { name } = parsed.data;

  const [membership] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  if (!membership) return c.json({ error: "Not a member" }, 403);

  const [group] = await db
    .update(groups)
    .set({ name, updatedAt: new Date() })
    .where(eq(groups.id, groupId))
    .returning();

  return c.json({ group });
});

// POST /api/groups/:id/members — add a user by userId (any member can invite)
groupsRoute.post("/:id/members", async (c) => {
  const userId = c.var.user.id;
  const groupId = c.req.param("id");
  const parsed = addMemberSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const targetUserId = parsed.data.userId;

  const [membership] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  if (!membership) return c.json({ error: "Not a member" }, 403);

  // The invited user must actually exist — no FK backs this, so a bad id would
  // otherwise insert a ghost member.
  const [target] = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.userId, targetUserId))
    .limit(1);
  if (!target) return c.json({ error: "User not found" }, 404);

  // Enforce creator's tier group size limit
  const [group] = await db
    .select({ createdBy: groups.createdBy })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  let maxSize: number = Infinity;
  let creatorTier: MembershipTier = "free";
  if (group) {
    const [creatorProfile] = await db
      .select({ membershipTier: profiles.membershipTier })
      .from(profiles)
      .where(eq(profiles.userId, group.createdBy))
      .limit(1);
    creatorTier = (creatorProfile?.membershipTier ?? "free") as MembershipTier;
    maxSize = TIER_LIMITS[creatorTier].maxGroupSize;
  }

  const [maxRow] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${groupMembers.displayOrder}), -1)` })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));
  const nextOrder = (maxRow?.maxOrder ?? -1) + 1;

  // Wrap size check + insert in a transaction so two concurrent adds can't
  // both pass the limit check before either one has committed.
  let tooFull = false;
  await db.transaction(async (tx) => {
    if (maxSize !== Infinity) {
      const [sizeRow] = await tx
        .select({ count: count() })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, groupId));
      if ((sizeRow?.count ?? 0) >= maxSize) {
        tooFull = true;
        return;
      }
    }
    await tx
      .insert(groupMembers)
      .values({ groupId, userId: targetUserId, memberRole: "member", displayOrder: nextOrder })
      .onConflictDoNothing();
  });

  if (tooFull) {
    return c.json(
      {
        error: `This group is full. The ${TIER_NAMES[creatorTier]} plan supports up to ${maxSize} members. Upgrade to add more.`,
      },
      403
    );
  }

  return c.json({ ok: true }, 201);
});

// DELETE /api/groups/:id/members/:userId — remove a member (creator only, or self-leave)
groupsRoute.delete("/:id/members/:targetUserId", async (c) => {
  const userId = c.var.user.id;
  const groupId = c.req.param("id");
  const targetUserId = c.req.param("targetUserId");

  const [group] = await db
    .select({ createdBy: groups.createdBy })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) return c.json({ error: "Group not found" }, 404);

  const isSelf = targetUserId === userId;
  const isCreator = group.createdBy === userId;
  if (!isSelf && !isCreator) return c.json({ error: "Not authorized" }, 403);

  await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, targetUserId)));

  return c.json({ ok: true });
});

// PATCH /api/groups/:id/plan — assign a plan to a group (must be a member)
groupsRoute.patch("/:id/plan", async (c) => {
  const userId = c.var.user.id;
  const groupId = c.req.param("id");
  const parsed = assignPlanSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const { planId } = parsed.data;

  const [membership] = await db
    .select({ id: groupMembers.id, archivedAt: groups.archivedAt })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  if (!membership) return c.json({ error: "Not a member of this group" }, 403);
  if (membership.archivedAt) return c.json({ error: "This group has ended." }, 410);

  // Verify the plan exists and is visible to this user.
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

  // Group limit: 3 active group devotionals at a time.
  const [activeGroups] = await db
    .select({ count: count() })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(and(eq(groupMembers.userId, userId), isNotNull(groups.currentPlanId)));

  if ((activeGroups?.count ?? 0) >= 3) {
    return c.json(
      { error: "You're already in three active group devotionals. Go deeper with the people you are already committed to before adding more." },
      403
    );
  }

  // Close out whatever run was underway (switching plans mid-run, or
  // re-assigning the same plan = an intentional fresh re-run), then open the
  // new run submissions will attach to.
  const [current] = await db
    .select({ currentPlanId: groups.currentPlanId })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (current?.currentPlanId) {
    const oldRun = await activeGroupRun(groupId, current.currentPlanId);
    if (oldRun) await closeRun(oldRun.id, "ended");
  }

  await db
    .update(groups)
    .set({ currentPlanId: planId, currentPlanStartedAt: new Date(), currentDay: 1, updatedAt: new Date() })
    .where(eq(groups.id, groupId));

  await db
    .insert(planRuns)
    .values({ planId, ownerType: "group", groupId });

  await db
    .update(groupMembers)
    .set({ doneToday: false })
    .where(eq(groupMembers.groupId, groupId));

  return c.json({ ok: true });
});

// DELETE /api/groups/:id/plan — the creator ends the group's current plan.
// Everyone's reflections are KEPT (one person must never destroy the whole
// group's entries) — the run just moves to the group's plan history so those
// entries stay reachable, and the active plan clears.
groupsRoute.delete("/:id/plan", async (c) => {
  const userId = c.var.user.id;
  const groupId = c.req.param("id");

  const [group] = await db
    .select({ createdBy: groups.createdBy, currentPlanId: groups.currentPlanId })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) return c.json({ error: "Group not found" }, 404);
  if (group.createdBy !== userId) {
    return c.json({ error: "Only the group creator can end the plan." }, 403);
  }

  if (group.currentPlanId) {
    const [plan] = await db
      .select({ id: devotionalPlans.id, title: devotionalPlans.title })
      .from(devotionalPlans)
      .where(eq(devotionalPlans.id, group.currentPlanId))
      .limit(1);
    if (plan) {
      await db.insert(groupPlanHistory).values({ groupId, planId: plan.id, planTitle: plan.title });
    }
    const run = await activeGroupRun(groupId, group.currentPlanId);
    if (run) await closeRun(run.id, "ended");
  }
  await db
    .update(groups)
    .set({ currentPlanId: null, currentPlanStartedAt: null, currentDay: 1, updatedAt: new Date() })
    .where(eq(groups.id, groupId));
  await db
    .update(groupMembers)
    .set({ doneToday: false })
    .where(eq(groupMembers.groupId, groupId));

  return c.json({ ok: true });
});

// PATCH /api/groups/:id/day — mark the calling user done; advance group day when everyone's finished
groupsRoute.patch("/:id/day", async (c) => {
  const userId = c.var.user.id;
  const groupId = c.req.param("id");
  const parsed = groupDaySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const { nextDay, completed } = parsed.data;

  const [membership] = await db
    .select({
      id: groupMembers.id,
      streakCount: groupMembers.streakCount,
      lastStreakDate: groupMembers.lastStreakDate,
    })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  if (!membership) return c.json({ error: "Not a member" }, 403);

  // Reset stale doneToday flags when the calendar day has rolled over, mirroring
  // the same guard in updateGroupStreaks (submissions.ts). Local day, not UTC.
  const today = clientDateString(c);
  const [grp] = await db
    .select({
      lastStreakDate: groups.lastStreakDate,
      streakCount: groups.streakCount,
      currentDay: groups.currentDay,
      currentPlanId: groups.currentPlanId,
      archivedAt: groups.archivedAt,
    })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!grp) return c.json({ error: "Group not found" }, 404);
  if (grp.archivedAt) return c.json({ error: "This group has ended." }, 410);

  // Bound the advance: one day at a time, never past the plan's end. A stale
  // client re-sending an already-applied advance is a no-op, not an error.
  if (nextDay !== undefined) {
    if (nextDay > grp.currentDay + 1) {
      return c.json({ error: "Can only advance one day at a time." }, 400);
    }
    if (grp.currentPlanId) {
      const [planRow] = await db
        .select({ totalDays: devotionalPlans.totalDays })
        .from(devotionalPlans)
        .where(eq(devotionalPlans.id, grp.currentPlanId))
        .limit(1);
      if (planRow && nextDay > planRow.totalDays) {
        return c.json({ error: "That's past the end of the plan." }, 400);
      }
    }
  }

  if (grp && (!grp.lastStreakDate || grp.lastStreakDate < today)) {
    const prev = grp.lastStreakDate ? new Date(grp.lastStreakDate + "T00:00:00Z") : null;
    if (prev) prev.setUTCDate(prev.getUTCDate() + 1);
    const isYesterday = prev ? prev.toISOString().slice(0, 10) === today : false;
    const carry = isYesterday ? grp.streakCount : 0;
    await db.update(groupMembers).set({ doneToday: false }).where(eq(groupMembers.groupId, groupId));
    await db.update(groups).set({ streakCount: carry, lastStreakDate: today, updatedAt: new Date() }).where(eq(groups.id, groupId));
  }

  // Compute and persist member's individual streak within this group.
  let newMemberStreak = membership.streakCount;
  if (!membership.lastStreakDate || membership.lastStreakDate < today) {
    const mPrev = membership.lastStreakDate ? new Date(membership.lastStreakDate + "T00:00:00Z") : null;
    if (mPrev) mPrev.setUTCDate(mPrev.getUTCDate() + 1);
    newMemberStreak = mPrev && mPrev.toISOString().slice(0, 10) === today
      ? membership.streakCount + 1
      : 1;
  }

  await db
    .update(groupMembers)
    .set({ doneToday: true, streakCount: newMemberStreak, lastStreakDate: today })
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

  const allMembers = await db
    .select({ doneToday: groupMembers.doneToday, userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));

  const allDone = allMembers.every((m) => m.doneToday || m.userId === userId);

  if (allDone) {
    if (completed) {
      // Record the completed plan in history before clearing it from the group,
      // and credit every member who took part.
      const [finishedPlan] = await db
        .select({ title: devotionalPlans.title, id: devotionalPlans.id })
        .from(groups)
        .innerJoin(devotionalPlans, eq(groups.currentPlanId, devotionalPlans.id))
        .where(eq(groups.id, groupId))
        .limit(1);
      if (finishedPlan) {
        await db.insert(groupPlanHistory).values({
          groupId,
          planId: finishedPlan.id,
          planTitle: finishedPlan.title,
        });
        await creditGroupCompletion(groupId, finishedPlan.id).catch(() => {});
        const run = await activeGroupRun(groupId, finishedPlan.id);
        if (run) await closeRun(run.id, "completed");
      }
      await db
        .update(groups)
        .set({ currentPlanId: null, currentPlanStartedAt: null, currentDay: 1, updatedAt: new Date() })
        .where(eq(groups.id, groupId));
    } else if (nextDay !== undefined && nextDay > grp.currentDay) {
      // Guarded by the day we read, so two same-moment finishers can't double-advance.
      await db
        .update(groups)
        .set({ currentDay: nextDay, updatedAt: new Date() })
        .where(and(eq(groups.id, groupId), eq(groups.currentDay, grp.currentDay)));
      if (grp.currentPlanId) {
        const run = await activeGroupRun(groupId, grp.currentPlanId);
        if (run) await setRunDay(run.id, nextDay);
      }
    }
    await db
      .update(groupMembers)
      .set({ doneToday: false })
      .where(eq(groupMembers.groupId, groupId));
  }

  return c.json({ ok: true, allDone });
});

// DELETE /api/groups/:id — creator deletes the group; member leaves it
groupsRoute.delete("/:id", async (c) => {
  const userId = c.var.user.id;
  const groupId = c.req.param("id");

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) return c.json({ error: "Not found" }, 404);

  if (group.createdBy === userId) {
    // Archive rather than hard-delete so members keep their past entries. It
    // drops off everyone's active list, and other members get a one-time notice.
    await db
      .update(groups)
      .set({ archivedAt: new Date(), archivedBy: userId, updatedAt: new Date() })
      .where(eq(groups.id, groupId));
    await db
      .update(groupMembers)
      .set({ archiveNoticeSeen: false })
      .where(and(eq(groupMembers.groupId, groupId), ne(groupMembers.userId, userId)));
  } else {
    await db
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, userId)
        )
      );
  }

  return c.json({ ok: true });
});

// DELETE /api/groups/:id/archived — permanently remove a *past* (ended) group
// from the caller's history. Per-user by design: it deletes only this user's
// reflections for the group and their membership, so it drops out of their Past
// groups while other members keep their own copy. If this was the last member,
// the now-orphaned group row is hard-deleted (its remaining children — plan
// history, any leftover submissions — cascade via FK). Only ended groups qualify;
// active ones must be ended first.
groupsRoute.delete("/:id/archived", async (c) => {
  const userId = c.var.user.id;
  const groupId = c.req.param("id");

  const [group] = await db
    .select({ id: groups.id, archivedAt: groups.archivedAt })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) return c.json({ error: "Not found" }, 404);
  if (!group.archivedAt) return c.json({ error: "Only ended groups can be deleted here." }, 409);

  await db.transaction(async (tx) => {
    await tx
      .delete(devotionalSubmissions)
      .where(and(eq(devotionalSubmissions.groupId, groupId), eq(devotionalSubmissions.userId, userId)));
    await tx
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
    const [memberCount] = await tx
      .select({ remaining: count() })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
    if (memberCount && memberCount.remaining === 0) {
      await tx.delete(groups).where(eq(groups.id, groupId));
    }
  });

  return c.json({ ok: true });
});
