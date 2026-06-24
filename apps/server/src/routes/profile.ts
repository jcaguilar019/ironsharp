import { randomBytes } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import { and, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  profiles,
  userPlanProgress,
  devotionalSubmissions,
  groupMembers,
  discipleRelationships,
  disciplerNotes,
  customQuestions,
  flaggedResponses,
  mailboxMessages,
  devotionalPlans,
} from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";
import type { MembershipTier } from "../lib/tiers.js";
import { clientDateString, effectiveStreak } from "../lib/localday.js";
import { isAdmin } from "../lib/admin.js";

export const profile = new Hono<AppEnv>();

profile.use("*", requireAuth);

const patchProfileSchema = z.object({
  displayName: z.string().nullish(),
  avatarUrl: z.string().nullish(),
  churchName: z.string().nullish(),
  primaryRole: z.enum(["discipler", "disciple", "partner"]).optional(),
  surveyName: z.string().nullish(),
  surveyAgeRange: z.string().nullish(),
  surveyGender: z.string().nullish(),
  surveyState: z.string().nullish(),
  surveyCity: z.string().nullish(),
  surveyEducation: z.string().nullish(),
  surveyHasChurch: z.boolean().nullish(),
  surveyChurchName: z.string().nullish(),
  surveyDevotionalRating: z.number().nullish(),
  surveyFaithJourney: z.string().nullish(),
  surveyGoals: z.array(z.string()).nullish(),
  surveyRelationshipStatus: z.string().nullish(),
  surveyHasKids: z.boolean().nullish(),
  surveyCompleted: z.boolean().optional(),
});
const promoSchema = z.object({ code: z.string().trim().min(1).max(64) });
const pushTokenSchema = z.object({ token: z.string().min(1) });
const notifPrefsSchema = z.object({
  notifMorningReminder: z.boolean().optional(),
  notifPartnerDone: z.boolean().optional(),
  notifDailyNudge: z.boolean().optional(),
  notifGroupComplete: z.boolean().optional(),
});
const familyJoinSchema = z.object({ code: z.string().trim().min(1) });

/**
 * Return the profile row with `streakCount` resolved to its *live* value for
 * the requester's local day — the stored count only moves on submission, so a
 * lapsed streak must read 0 here rather than freezing at its last value.
 */
function withLiveStreak<T extends { streakCount: number; lastStreakDate: string | null }>(
  row: T | undefined,
  today: string
): T | undefined {
  if (!row) return row;
  return { ...row, streakCount: effectiveStreak(row.streakCount, row.lastStreakDate, today) };
}

/**
 * Attach the derived `isAdmin` flag (founder authoring rights) so the app can
 * conditionally surface the Community Devotional admin tools. Derived from the
 * ADMIN_USER_IDS env allowlist — never stored on the row.
 */
function withAdmin<T extends object>(
  row: T | undefined,
  userId: string
): (T & { isAdmin: boolean }) | undefined {
  if (!row) return row;
  return { ...row, isAdmin: isAdmin(userId) };
}

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
    .where(and(ilike(profiles.displayName, `%${q}%`), ne(profiles.userId, userId)))
    .limit(10);

  return c.json({ users: results });
});

// GET /api/profile  → the current user's profile, created on first access.
// (Neon Auth owns the user record; we lazily materialize the app-side profile
// here instead of via a signup trigger.)
profile.get("/", async (c) => {
  const { id: userId, email, name } = c.var.user;
  const today = clientDateString(c);

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
      return c.json({ profile: withAdmin(withLiveStreak(updated ?? existing, today), userId) });
    }
    return c.json({ profile: withAdmin(withLiveStreak(existing, today), userId) });
  }

  const displayName = name?.trim() || email?.split("@")[0] || "Friend";
  const [created] = await db
    .insert(profiles)
    .values({ userId, displayName, primaryRole: "disciple" })
    .onConflictDoNothing()
    .returning();

  if (created) return c.json({ profile: withAdmin(withLiveStreak(created, today), userId) });

  // Lost a race — fetch the row the other request created.
  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return c.json({ profile: withAdmin(withLiveStreak(row, today), userId) });
});

// POST /api/profile/redeem-promo → validate a promo code and upgrade membership.
//
// Promo code table. Each code unlocks a membership tier. `discountPercent` is the
// percentage off that tier's subscription price — 100 means the membership is free.
// Paid billing isn't live yet, so today a redeemed code grants its tier outright;
// `discountPercent` is recorded so it can be applied at checkout once billing ships.
//
// IRONSHARP is the maximum code: a 100% discount on the top tier (Family) = free
// Family membership for life. Codes are case-insensitive (normalized to upper-case).
type PromoReward = { tier: MembershipTier; discountPercent: number; label: string };

const PROMO_CODES: Record<string, PromoReward> = {
  // ── Maximum — free top-tier (Family) membership ─────────────────────────
  IRONSHARP: { tier: "family",  discountPercent: 100, label: "Free Family membership" },
  FOUNDING:  { tier: "family",  discountPercent: 100, label: "Founding member — free Family membership" },
  // ── Sharpen tier, free ──────────────────────────────────────────────────
  SHARPEN:   { tier: "sharpen", discountPercent: 100, label: "Free Sharpen membership" },
  DISCIPLER: { tier: "sharpen", discountPercent: 100, label: "Free Sharpen membership" },
  // ── Connect tier, free ──────────────────────────────────────────────────
  CONNECT:   { tier: "connect", discountPercent: 100, label: "Free Connect membership" },
  WELCOME:   { tier: "connect", discountPercent: 100, label: "Free Connect membership" },
};

profile.post("/redeem-promo", async (c) => {
  const userId = c.var.user.id;
  const parsed = promoSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const normalized = parsed.data.code.trim().toUpperCase();
  const reward = PROMO_CODES[normalized];
  if (!reward) return c.json({ error: "Invalid promo code." }, 400);

  const now = new Date();
  const updates: Record<string, unknown> = {
    membershipTier: reward.tier,
    membershipSource: "promo",
    membershipStartedAt: now,
    updatedAt: now,
  };
  if (reward.tier === "family") {
    updates.familyCode = generateFamilyCode();
  }

  const [row] = await db
    .update(profiles)
    .set(updates)
    .where(eq(profiles.userId, userId))
    .returning();

  return c.json({
    profile: row,
    tier: reward.tier,
    discountPercent: reward.discountPercent,
    label: reward.label,
  });
});

// PATCH /api/profile  → update editable profile fields
profile.patch("/", async (c) => {
  const userId = c.var.user.id;
  const parsed = patchProfileSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const body = parsed.data as Record<string, unknown>;

  // Only allow a safe subset of fields to be written by the client.
  const updatable: Record<string, unknown> = {};
  const allow = [
    "displayName",
    "avatarUrl",
    "churchName",
    "primaryRole",
    "surveyName",
    "surveyAgeRange",
    "surveyGender",
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

  return c.json({ profile: withAdmin(row, userId) });
});

// POST /api/profile/push-token  → register or update the device push token
profile.post("/push-token", async (c) => {
  const userId = c.var.user.id;
  const parsed = pushTokenSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const { token } = parsed.data;

  await db
    .update(profiles)
    .set({ pushToken: token, updatedAt: new Date() })
    .where(eq(profiles.userId, userId));

  return c.json({ ok: true });
});

// PATCH /api/profile/notification-prefs  → update notification preferences
profile.patch("/notification-prefs", async (c) => {
  const userId = c.var.user.id;
  const parsed = notifPrefsSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const body = parsed.data as Record<string, unknown>;

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
  const parsed = familyJoinSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const normalized = parsed.data.code.trim().toUpperCase();

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

  return c.json({ profile: withAdmin(row, userId) });
});

// DELETE /api/profile  → permanently delete the account and all associated data.
// Required by App Store and Google Play for apps that support account creation.
profile.delete("/", async (c) => {
  const userId = c.var.user.id;

  // Delete app-side data in a transaction so a mid-flight failure leaves no partial state.
  // Neon Auth deletion runs after — it can't join the same transaction (cross-schema).
  await db.transaction(async (tx) => {
    await tx.delete(disciplerNotes).where(
      or(eq(disciplerNotes.fromUserId, userId), eq(disciplerNotes.toUserId, userId))
    );
    // Discipleship Kit children. They'd cascade from disciple_relationships, but
    // delete them explicitly first so ordering can't bite us.
    const rels = await tx
      .select({ id: discipleRelationships.id })
      .from(discipleRelationships)
      .where(
        or(eq(discipleRelationships.disciplerId, userId), eq(discipleRelationships.discipleId, userId))
      );
    const relIds = rels.map((r) => r.id);
    if (relIds.length > 0) {
      await tx.delete(customQuestions).where(inArray(customQuestions.discipleshipRelationshipId, relIds));
      await tx.delete(flaggedResponses).where(inArray(flaggedResponses.discipleshipRelationshipId, relIds));
      await tx.delete(mailboxMessages).where(inArray(mailboxMessages.discipleshipRelationshipId, relIds));
    }
    await tx.delete(discipleRelationships).where(
      or(eq(discipleRelationships.disciplerId, userId), eq(discipleRelationships.discipleId, userId))
    );
    await tx.delete(groupMembers).where(eq(groupMembers.userId, userId));
    // submission_reactions cascade from devotional_submissions via FK
    await tx.delete(devotionalSubmissions).where(eq(devotionalSubmissions.userId, userId));
    await tx.delete(userPlanProgress).where(eq(userPlanProgress.userId, userId));
    // Only delete plans this user generated — curated plans are shared
    await tx.delete(devotionalPlans).where(
      and(eq(devotionalPlans.createdByUserId, userId), eq(devotionalPlans.source, "generated"))
    );
    await tx.delete(profiles).where(eq(profiles.userId, userId));
  });

  // Delete the Neon Auth user — cascades to neon_auth.session, account, member, invitation
  await db.execute(sql`DELETE FROM neon_auth."user" WHERE id = ${userId}`);

  return c.json({ ok: true });
});
