import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  unique,
  index,
} from "drizzle-orm/pg-core";

/* ============================================================
 * AUTH
 * Authentication is handled by **Neon Auth** (managed Better Auth).
 * It owns the `neon_auth` schema (neon_auth.user / session / account / …) in
 * this same database — we do NOT define or migrate those tables here.
 *
 * Everywhere below, `user_id` (and creator/relationship ids) hold the Neon Auth
 * user id — the `sub` claim from the verified JWT. We keep them as plain `text`
 * (no cross-schema foreign key) so the managed auth schema stays decoupled.
 * ============================================================ */

/* ============================================================
 * PUBLIC DEVOTIONAL CONTENT (no per-user data)
 * ============================================================ */

export const devotionalPlans = pgTable("devotional_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  description: text("description"),
  category: text("category").notNull(),
  totalDays: integer("total_days").notNull().default(7),
  howToUse: text("how_to_use"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const devotionalDays = pgTable(
  "devotional_days",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => devotionalPlans.id, { onDelete: "cascade" }),
    dayNumber: integer("day_number").notNull(),
    chapter: text("chapter").notNull(),
    theme: text("theme"),
    commentary: text("commentary").notNull(),
    reflectionQ1: text("reflection_q1").notNull(),
    reflectionQ2: text("reflection_q2").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    planDayUnique: unique("devotional_days_plan_day_unique").on(t.planId, t.dayNumber),
  })
);

export const studyNotes = pgTable(
  "study_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => devotionalPlans.id, { onDelete: "cascade" }),
    dayNumber: integer("day_number").notNull(),
    passageReference: text("passage_reference").notNull(),
    source: text("source"),
    notes: jsonb("notes").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    planDayUnique: unique("study_notes_plan_day_unique").on(t.planId, t.dayNumber),
    planDayIdx: index("idx_study_notes_plan_day").on(t.planId, t.dayNumber),
  })
);

/* ============================================================
 * PER-USER DATA  (user_id = Neon Auth user id / JWT sub)
 * ============================================================ */

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  primaryRole: text("primary_role").notNull().default("disciple"), // discipler | disciple | partner
  streakCount: integer("streak_count").notNull().default(0),
  totalCompleted: integer("total_completed").notNull().default(0),
  churchName: text("church_name"),
  // survey
  surveyName: text("survey_name"),
  surveyAgeRange: text("survey_age_range"),
  surveyState: text("survey_state"),
  surveyEducation: text("survey_education"),
  surveyHasChurch: boolean("survey_has_church"),
  surveyChurchName: text("survey_church_name"),
  surveyDevotionalRating: integer("survey_devotional_rating"),
  surveyFaithJourney: text("survey_faith_journey"),
  surveyGoals: text("survey_goals").array(),
  surveyCompletedAt: timestamp("survey_completed_at", { withTimezone: true }),
  // membership
  membershipTier: text("membership_tier").notNull().default("free"), // free | connect | sharpen | family
  membershipStartedAt: timestamp("membership_started_at", { withTimezone: true }),
  membershipExpiresAt: timestamp("membership_expires_at", { withTimezone: true }),
  membershipSource: text("membership_source").notNull().default("none"), // none | stripe | apple_iap | google_iap | promo
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userPlanProgress = pgTable(
  "user_plan_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => devotionalPlans.id, { onDelete: "cascade" }),
    currentDay: integer("current_day").notNull().default(1),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    userPlanUnique: unique("user_plan_progress_unique").on(t.userId, t.planId),
  })
);

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  groupType: text("group_type").notNull(), // one-on-one | family | small-group
  currentPlanId: uuid("current_plan_id").references(() => devotionalPlans.id, {
    onDelete: "set null",
  }),
  currentDay: integer("current_day").notNull().default(1),
  streakCount: integer("streak_count").notNull().default(0),
  inviteCode: text("invite_code").notNull().unique(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    memberRole: text("member_role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    groupUserUnique: unique("group_members_unique").on(t.groupId, t.userId),
  })
);

export const discipleRelationships = pgTable(
  "disciple_relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    disciplerId: text("discipler_id").notNull(),
    discipleId: text("disciple_id").notNull(),
    status: text("status").notNull().default("active"), // pending | active | ended
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pairUnique: unique("disciple_relationships_unique").on(t.disciplerId, t.discipleId),
  })
);

export const devotionalSubmissions = pgTable(
  "devotional_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => devotionalPlans.id, { onDelete: "cascade" }),
    dayNumber: integer("day_number").notNull(),
    response1: text("response1"),
    response2: text("response2"),
    prayer: text("prayer"),
    voiceMemoUrl: text("voice_memo_url"),
    q1Private: boolean("q1_private").notNull().default(false),
    q2Private: boolean("q2_private").notNull().default(false),
    prayerPrivate: boolean("prayer_private").notNull().default(true),
    voiceMemoPrivate: boolean("voice_memo_private").notNull().default(false),
    submissionSource: text("submission_source").notNull().default("typed"), // typed | commute | voice_memo
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userPlanDayUnique: unique("devotional_submissions_unique").on(
      t.userId,
      t.planId,
      t.dayNumber
    ),
    planDayIdx: index("idx_submissions_plan_day").on(t.planId, t.dayNumber),
    userIdx: index("idx_submissions_user").on(t.userId),
  })
);

export const submissionReactions = pgTable(
  "submission_reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => devotionalSubmissions.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    reactionType: text("reaction_type").notNull(), // amen | hit_me | fire
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    reactionUnique: unique("submission_reactions_unique").on(
      t.submissionId,
      t.userId,
      t.reactionType
    ),
  })
);

export const disciplerNotes = pgTable(
  "discipler_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromUserId: text("from_user_id").notNull(),
    toUserId: text("to_user_id").notNull(),
    note: text("note").notNull(),
    relatedSubmissionId: uuid("related_submission_id").references(
      () => devotionalSubmissions.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    threadIdx: index("idx_discipler_notes_thread").on(
      t.fromUserId,
      t.toUserId,
      t.createdAt
    ),
  })
);

export const schema = {
  devotionalPlans,
  devotionalDays,
  studyNotes,
  profiles,
  userPlanProgress,
  groups,
  groupMembers,
  discipleRelationships,
  devotionalSubmissions,
  submissionReactions,
  disciplerNotes,
};
