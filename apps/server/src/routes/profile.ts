import { randomBytes } from "node:crypto";
import { Hono } from "hono";
import { and, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  profiles,
  userPlanProgress,
  devotionalSubmissions,
  groupMembers,
  discipleRelationships,
  disciplerNotes,
  devotionalPlans,
} from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";

export const profile = new Hono<AppEnv>();

profile.use("*", requireAuth);

const FAMILY_CODE_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generateFamilyCode(): string {
  const bytes = Array.from(randomBytes(6));
  return bytes.map((b) => FAMILY_CODE_CHARSET[b % FAMILY_CODE_CHARSET.length]).join("");
}

// GET /api/profile/search?q= → search users by display name (excludes self)
profile.get("/search", async (c) => {
  const userId = c.var.user.id;
  const q = c.req.query("q")?.trim() ?? "";
  if (q.length < 2) return c.json({ users: [] });

  const results = await db
    .select({
      userId: profiles.userId,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(ilike(profiles.displayName, `%${q}%`) && ne(profiles.userId, userId))
    .limit(10);

  return c.json({ users: results });
});

// GET /api/profile  → the current user's profile, created on first access.
// (Neon Auth owns the user record; we lazily materialize the app-side profile
// here instead of via a signup trigger.)
profile.get("/", async (c) => {
  const { id: userId, email, name } = c.var.user;

  const [existing] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  if (existing) {
    // Back-fill familyCode for Family tier holders who pre-dated this feature.
    if (existing.membershipTier === "family" && !existing.familyCode) {
      const [updated] = await db
        .update(profiles)
        .set({ familyCode: generateFamilyCode(), updatedAt: new Date() })
        .where(eq(profiles.userId, userId))
        .returning();
      return c.json({ profile: updated ?? existing });
    }
    return c.json({ profile: existing });
  }

  const displayName = name?.trim() || email?.split("@")[0] || "Friend";
  const [created] = await db
    .insert(profiles)
    .values({ userId, displayName, primaryRole: "disciple" })
    .onConflictDoNothing()
    .returning();

  if (created) return c.json({ profile: created });

  // Lost a race — fetch the row the other request created.
  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return c.json({ profile: row });
});

// POST /api/profile/redeem-promo → validate a promo code and upgrade membership
const PROMO_CODES: Record<string, string> = {
  IRONSHARP: "family",
  FOUNDING:  "family",
  SHARPEN:   "sharpen",
};

profile.post("/redeem-promo", async (c) => {
  const userId = c.var.user.id;
  const { code } = await c.req.json().catch(() => ({ code: "" }));
  const normalized = (code as string).trim().toUpperCase();
  const tier = PROMO_CODES[normalized];
  if (!tier) return c.json({ error: "Invalid promo code." }, 400);

  const updates: Record<string, unknown> = { membershipTier: tier, updatedAt: new Date() };
  if (tier === "family") {
    updates.familyCode = generateFamilyCode();
  }

  const [row] = await db
    .update(profiles)
    .set(updates)
    .where(eq(profiles.userId, userId))
    .returning();

  return c.json({ profile: row, tier });
});

// PATCH /api/profile  → update editable profile fields
profile.patch("/", async (c) => {
  const userId = c.var.user.id;
  const body = await c.req.json().catch(() => ({}));

  // Only allow a safe subset of fields to be written by the client.
  const updatable: Record<string, unknown> = {};
  const allow = [
    "displayName",
    "avatarUrl",
    "churchName",
    "primaryRole",
    "surveyName",
    "surveyAgeRange",
    "surveyState",
    "surveyCity",
    "surveyEducation",
    "surveyHasChurch",
    "surveyChurchName",
    "surveyDevotionalRating",
    "surveyFaithJourney",
    "surveyGoals",
    "surveyRelationshipStatus",
    "surveyHasKids",
  ] as const;
  for (const key of allow) {
    if (key in body) updatable[key] = body[key];
  }
  // Marking onboarding complete.
  if (body.surveyCompleted === true) {
    updatable.surveyCompletedAt = new Date();
  }
  updatable.updatedAt = new Date();

  // Try an update first; if no row exists yet (e.g. the GET lazily-create
  // never ran), fall back to an upsert so the client is never blocked.
  let [row] = await db
    .update(profiles)
    .set(updatable)
    .where(eq(profiles.userId, userId))
    .returning();

  if (!row) {
    const { email, name } = c.var.user;
    const displayName =
      (updatable.displayName as string | undefined) ??
      name?.trim() ??
      email?.split("@")[0] ??
      "Friend";
    [row] = await db
      .insert(profiles)
      .values({ userId, displayName, ...updatable })
      .onConflictDoUpdate({ target: profiles.userId, set: updatable })
      .returning();
  }

  return c.json({ profile: row });
});

// POST /api/profile/push-token  → register or update the device push token
profile.post("/push-token", async (c) => {
  const userId = c.var.user.id;
  const { token } = await c.req.json().catch(() => ({ token: "" }));
  if (!token || typeof token !== "string") return c.json({ error: "token required" }, 400);

  await db
    .update(profiles)
    .set({ pushToken: token, updatedAt: new Date() })
    .where(eq(profiles.userId, userId));

  return c.json({ ok: true });
});

// PATCH /api/profile/notification-prefs  → update notification preferences
profile.patch("/notification-prefs", async (c) => {
  const userId = c.var.user.id;
  const body = await c.req.json().catch(() => ({}));

  const allowed = ["notifMorningReminder", "notifPartnerDone", "notifDailyNudge", "notifGroupComplete"] as const;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (typeof body[key] === "boolean") updates[key] = body[key];
  }

  await db.update(profiles).set(updates).where(eq(profiles.userId, userId));
  return c.json({ ok: true });
});

// GET /api/profile/family/validate?code=  → check if a family code exists (no auth required to be Family tier)
profile.get("/family/validate", async (c) => {
  const code = c.req.query("code")?.trim().toUpperCase();
  if (!code) return c.json({ valid: false });

  const [row] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.familyCode, code), eq(profiles.membershipTier, "family")))
    .limit(1);

  return c.json({ valid: !!row });
});

// POST /api/profile/family/join  → link the current user's profile to a family account
profile.post("/family/join", async (c) => {
  const userId = c.var.user.id;
  const { code } = await c.req.json().catch(() => ({ code: "" }));
  const normalized = (code as string).trim().toUpperCase();

  const [family] = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(and(eq(profiles.familyCode, normalized), eq(profiles.membershipTier, "family")))
    .limit(1);

  if (!family) return c.json({ error: "Invalid family code." }, 400);

  const [row] = await db
    .update(profiles)
    .set({ familyAccountId: family.userId, updatedAt: new Date() })
    .where(eq(profiles.userId, userId))
    .returning();

  return c.json({ profile: row });
});

// DELETE /api/profile  → permanently delete the account and all associated data.
// Required by App Store and Google Play for apps that support account creation.
profile.delete("/", async (c) => {
  const userId = c.var.user.id;

  // Delete app-side data in dependency order.
  await db.delete(disciplerNotes).where(
    or(eq(disciplerNotes.fromUserId, userId), eq(disciplerNotes.toUserId, userId))
  );
  await db.delete(discipleRelationships).where(
    or(eq(discipleRelationships.disciplerId, userId), eq(discipleRelationships.discipleId, userId))
  );
  await db.delete(groupMembers).where(eq(groupMembers.userId, userId));
  // submission_reactions cascade from devotional_submissions via FK
  await db.delete(devotionalSubmissions).where(eq(devotionalSubmissions.userId, userId));
  await db.delete(userPlanProgress).where(eq(userPlanProgress.userId, userId));
  // Only delete plans this user generated — curated plans are shared
  await db.delete(devotionalPlans).where(
    and(eq(devotionalPlans.createdByUserId, userId), eq(devotionalPlans.source, "generated"))
  );
  await db.delete(profiles).where(eq(profiles.userId, userId));

  // Delete the Neon Auth user — cascades to neon_auth.session, account, member, invitation
  await db.execute(sql`DELETE FROM neon_auth."user" WHERE id = ${userId}`);

  return c.json({ ok: true });
});
