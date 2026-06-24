import { and, eq, inArray, ne } from "drizzle-orm";
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

// Notify other group members that someone finished their devotional.
export async function notifyPartnerDone(
  submittingUserId: string,
  planId: string
): Promise<void> {
  const [submitter] = await db
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.userId, submittingUserId))
    .limit(1);
  if (!submitter) return;

  const memberRows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(and(eq(groupMembers.userId, submittingUserId), eq(groups.currentPlanId, planId)));
  if (memberRows.length === 0) return;

  const groupIds = memberRows.map((r) => r.groupId);

  const others = await db
    .select({ pushToken: profiles.pushToken })
    .from(groupMembers)
    .innerJoin(profiles, eq(profiles.userId, groupMembers.userId))
    .where(
      and(
        inArray(groupMembers.groupId, groupIds),
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
    }))
  );
}

// After each submission, check if every group member has now submitted for
// this day. If so, send the "group complete" notification.
export async function notifyGroupCompleteIfDone(
  submittingUserId: string,
  planId: string,
  dayNumber: number
): Promise<void> {
  const memberRows = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(and(eq(groupMembers.userId, submittingUserId), eq(groups.currentPlanId, planId)));
  if (memberRows.length === 0) return;

  for (const { groupId } of memberRows) {
    const [group] = await db
      .select({ name: groups.name })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);
    if (!group) continue;

    const allMembers = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));

    const allIds = allMembers.map((m) => m.userId);
    if (allIds.length === 0) continue;

    // Use the submissions table as source of truth — more reliable than doneToday flags.
    const submitted = await db
      .select({ userId: devotionalSubmissions.userId })
      .from(devotionalSubmissions)
      .where(
        and(
          inArray(devotionalSubmissions.userId, allIds),
          eq(devotionalSubmissions.planId, planId),
          eq(devotionalSubmissions.dayNumber, dayNumber)
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
      }))
    );
  }
}

// ─── Discipleship Kit ─────────────────────────────────────────────────────────

async function pushToUser(userId: string, title: string, body: string): Promise<void> {
  const [recipient] = await db
    .select({ pushToken: profiles.pushToken })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  const token = recipient?.pushToken;
  if (!token) return;
  await sendPush([{ to: token, title, body, sound: "default" }]);
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
    `${discipler.displayName} would like to disciple you. Open IronSharp to respond.`
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

  await pushToUser(recipientId, "New message", `${sender.displayName} sent you a message.`);
}
