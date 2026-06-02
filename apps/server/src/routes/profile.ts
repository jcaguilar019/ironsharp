import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { profiles } from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";

export const profile = new Hono<AppEnv>();

profile.use("*", requireAuth);

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
  if (existing) return c.json({ profile: existing });

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
    "surveyEducation",
    "surveyHasChurch",
    "surveyChurchName",
    "surveyDevotionalRating",
    "surveyFaithJourney",
    "surveyGoals",
  ] as const;
  for (const key of allow) {
    if (key in body) updatable[key] = body[key];
  }
  // Marking onboarding complete.
  if (body.surveyCompleted === true) {
    updatable.surveyCompletedAt = new Date();
  }
  updatable.updatedAt = new Date();

  const [row] = await db
    .update(profiles)
    .set(updatable)
    .where(eq(profiles.userId, userId))
    .returning();

  if (!row) return c.json({ error: "Profile not found" }, 404);
  return c.json({ profile: row });
});
