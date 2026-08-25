import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { devotionalPlans } from "../db/schema.js";
import { isAdmin } from "./admin.js";

/**
 * Whether a user may read a plan's content. Beyond public/creator, a plan is
 * readable by members of any group that is running it (or ran it — plan
 * history), and by anyone who has submissions for it. Without the group arms,
 * a PRIVATE generated plan assigned to a group is unreadable by every member
 * except its creator — the reader 404s for the whole group.
 */
export async function canReadPlan(
  userId: string,
  plan: { id: string; isPublic: boolean; createdByUserId: string | null }
): Promise<boolean> {
  if (plan.isPublic || plan.createdByUserId === userId) return true;
  const res = await db.execute(sql`
    SELECT 1 WHERE EXISTS (
      SELECT 1 FROM group_members gm
      JOIN groups g ON g.id = gm.group_id
      WHERE gm.user_id = ${userId}
        AND (
          g.current_plan_id = ${plan.id}
          OR EXISTS (
            SELECT 1 FROM group_plan_history h
            WHERE h.group_id = g.id AND h.plan_id = ${plan.id}
          )
        )
    ) OR EXISTS (
      SELECT 1 FROM devotional_submissions s
      WHERE s.user_id = ${userId} AND s.plan_id = ${plan.id}
    )
  `);
  return (res.rows?.length ?? 0) > 0;
}

/**
 * Whether a user may BEGIN a new run of a plan — starting it, restarting it, or
 * putting it in front of a group.
 *
 * The line is drawn at beginning, not at reading. A team-only plan is one the
 * team has written but hasn't released; nobody new should be handed it, but
 * pulling it out from under a group already halfway through it would cost real
 * people their reflections. So `canReadPlan` stays open and this closes.
 *
 * Returns a message rather than a bare false so all three call sites say the
 * same thing. Null means allowed.
 */
export async function blockedFromStarting(
  userId: string,
  planId: string
): Promise<string | null> {
  const [plan] = await db
    .select({ adminOnly: devotionalPlans.adminOnly })
    .from(devotionalPlans)
    .where(eq(devotionalPlans.id, planId))
    .limit(1);
  if (!plan?.adminOnly) return null;
  if (await isAdmin(userId)) return null;
  return "This plan isn't available yet.";
}
