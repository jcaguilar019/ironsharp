import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  profiles,
  groups,
  groupMembers,
  devotionalSubmissions,
  discipleRelationships,
} from "../db/schema.js";

type PushMessage = {
  to: string;
  title: string;
  body: string;
  sound: "default";
  data?: Record<string, unknown>;
};

// Sends up to 100 messages per request (Expo's batch limit).
export async function sendPush(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;
  const chunks: PushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }
  await Promise.all(
    chunks.map((chunk) =>
      fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(chunk),
      }).catch(() => {})
    )
  );
}

// Notify the members of the ONE group a submission was made in. A submission
// identifies its run by groupId — never fan out by planId, or every other
// group (and archived groups) running the same shared plan gets pinged too.
export async function notifyPartnerDone(
  submittingUserId: string,
  planId: string,
  groupId: string | null
): Promise<void> {
  // Personal submissions have no partners to notify.
  if (!groupId) return;

  const [submitter] = await db
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.userId, submittingUserId))
    .limit(1);
  if (!submitter) return;

  // The submission's own group only — and only while it's live on this plan.
  const [target] = await db
    .select({ groupId: groups.id })
    .from(groups)
    .innerJoin(
      groupMembers,
      and(eq(groupMembers.groupId, groups.id), eq(groupMembers.userId, submittingUserId))
    )
    .where(and(eq(groups.id, groupId), eq(groups.currentPlanId, planId), isNull(groups.archivedAt)))
    .limit(1);
  if (!target) return;

  const others = await db
    .select({ pushToken: profiles.pushToken })
    .from(groupMembers)
    .innerJoin(profiles, eq(profiles.userId, groupMembers.userId))
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        ne(groupMembers.userId, submittingUserId),
        eq(profiles.notifPartnerDone, true)
      )
    );

  const tokens = others.map((o) => o.pushToken).filter(Boolean) as string[];
  if (tokens.length === 0) return;

  await sendPush(
    tokens.map((to) => ({
      to,
      title: "Partner finished",
      body: `${submitter.displayName} completed today's devotional.`,
      sound: "default",
      data: { url: "/(tabs)/groups" },
    }))
  );
}

// After each submission, check if every group member has now submitted for
// this day. If so, send the "group complete" notification.
export async function notifyGroupCompleteIfDone(
  submittingUserId: string,
  planId: string,
  dayNumber: number,
  groupId: string | null,
  runId?: string | null,
  todayStart?: Date
): Promise<void> {
  // Only a group submission can complete a group; scope to that instance.
  // Deliberately NOT keyed on groups.currentPlanId: on the plan's last day the
  // client's completion PATCH clears it concurrently with this background
  // notify, which would race the final "Group complete" push away.
  if (!groupId) return;
  const memberRows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(
      and(
        eq(groupMembers.userId, submittingUserId),
        eq(groupMembers.groupId, groupId),
        isNull(groups.archivedAt)
      )
    );
  if (memberRows.length === 0) return;

  for (const { groupId } of memberRows) {
    const [group] = await db
      .select({ name: groups.name })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);
    if (!group) continue;

    const allMembers = await db
      .select({ userId: groupMembers.userId, joinedAt: groupMembers.joinedAt })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));

    // Mid-day joiners aren't required for today's completion.
    const required = todayStart ? allMembers.filter((m) => m.joinedAt < todayStart) : allMembers;
    const allIds = required.map((m) => m.userId);
    if (allIds.length === 0) continue;

    // Use the submissions table as source of truth — more reliable than doneToday
    // flags. Scoped to the current run so a re-run's day N isn't "completed" by
    // last time's answers.
    const submitted = await db
      .select({ userId: devotionalSubmissions.userId })
      .from(devotionalSubmissions)
      .where(
        and(
          inArray(devotionalSubmissions.userId, allIds),
          eq(devotionalSubmissions.planId, planId),
          eq(devotionalSubmissions.dayNumber, dayNumber),
          eq(devotionalSubmissions.groupId, groupId),
          ...(runId ? [eq(devotionalSubmissions.runId, runId)] : [])
        )
      );

    if (submitted.length < allIds.length) continue; // not everyone done yet

    // Everyone submitted — notify those who want this ping.
    const recipients = await db
      .select({ pushToken: profiles.pushToken })
      .from(profiles)
      .where(
        and(inArray(profiles.userId, allIds), eq(profiles.notifGroupComplete, true))
      );

    const tokens = recipients.map((r) => r.pushToken).filter(Boolean) as string[];
    if (tokens.length === 0) continue;

    await sendPush(
      tokens.map((to) => ({
        to,
        title: "Group complete",
        body: `Everyone in ${group.name} finished today. Well done.`,
        sound: "default",
        data: { url: "/(tabs)/groups" },
      }))
    );
  }
}

// ─── Discipleship Kit ─────────────────────────────────────────────────────────

async function pushToUser(
  userId: string,
  title: string,
  body: string,
  url?: string,
  pref?: "notifDiscipleship" | "notifMailbox"
): Promise<void> {
  const [recipient] = await db
    .select({
      pushToken: profiles.pushToken,
      notifDiscipleship: profiles.notifDiscipleship,
      notifMailbox: profiles.notifMailbox,
    })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  const token = recipient?.pushToken;
  if (!token) return;
  // Respect the recipient's per-type opt-out.
  if (pref && recipient && !recipient[pref]) return;
  await sendPush([
    { to: token, title, body, sound: "default", ...(url ? { data: { url } } : {}) },
  ]);
}

// Notify the disciple that someone wants to disciple them.
export async function notifyDiscipleshipInvite(
  disciplerId: string,
  discipleId: string
): Promise<void> {
  const [discipler] = await db
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.userId, disciplerId))
    .limit(1);
  if (!discipler) return;
  await pushToUser(
    discipleId,
    "Discipleship invite",
    `${discipler.displayName} would like to disciple you. Open IronSharp to respond.`,
    "/(tabs)/groups",
    "notifDiscipleship"
  );
}

// Notify the other party in a relationship that a new mailbox message arrived.
export async function notifyMailboxMessage(
  relationshipId: string,
  senderId: string
): Promise<void> {
  const [rel] = await db
    .select({ disciplerId: discipleRelationships.disciplerId, discipleId: discipleRelationships.discipleId })
    .from(discipleRelationships)
    .where(eq(discipleRelationships.id, relationshipId))
    .limit(1);
  if (!rel) return;

  const recipientId = senderId === rel.disciplerId ? rel.discipleId : rel.disciplerId;
  const [sender] = await db
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.userId, senderId))
    .limit(1);
  if (!sender) return;

  await pushToUser(
    recipientId,
    "New message",
    `${sender.displayName} sent you a message.`,
    `/discipleship/${relationshipId}`,
    "notifMailbox"
  );
}
