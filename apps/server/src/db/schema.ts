import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  date,
  uuid,
  jsonb,
  unique,
  index,
  uniqueIndex,
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
 * BIBLE TEXT (translation-aware, passage-keyed)
 * ============================================================ */

export const bibleChapters = pgTable(
  "bible_chapters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    translation: text("translation").notNull().default("KJV"),
    book: text("book").notNull(),
    testament: text("testament").notNull(), // "OT" | "NT"
    bookOrder: integer("book_order").notNull(), // 1-66
    chapter: integer("chapter").notNull(),
    verses: jsonb("verses").notNull().default([]), // string[]
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    translationBookChapterUnique: unique("bible_chapters_unique").on(
      t.translation,
      t.book,
      t.chapter
    ),
    bookChapterIdx: index("idx_bible_chapters_lookup").on(t.translation, t.book, t.chapter),
  })
);

/* ============================================================
 * PUBLIC DEVOTIONAL CONTENT (no per-user data)
 * ============================================================ */

export const devotionalPlans = pgTable(
  "devotional_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    description: text("description"),
    category: text("category").notNull(),
    totalDays: integer("total_days").notNull().default(7),
    howToUse: text("how_to_use"),
    imageUrl: text("image_url"),
    source: text("source").notNull().default("curated"),       // "curated" | "generated"
    createdByUserId: text("created_by_user_id"),
    isPublic: boolean("is_public").notNull().default(true),
    matchKey: text("match_key"),                               // e.g. "book:romans-14" — dedup key
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    browseIdx: index("idx_plans_browse").on(t.isPublic, t.category),
    creatorIdx: index("idx_plans_creator").on(t.createdByUserId),
    matchKeyIdx: index("idx_plans_match_key").on(t.matchKey),
  })
);

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
    // Per-day passage setup shown in the "Passage Context" drawer. Inline on the
    // day (not the shared book/chapter passageNotes table) so two days on the same
    // chapter can carry different context. Both this and studyNotes are required
    // for every day of a new plan — see generate.ts validation.
    passageContext: text("passage_context"),
    studyNotes: jsonb("study_notes").notNull().default([]),
    reflection: text("reflection"),
    reflectionQ1: text("reflection_q1").notNull(),
    reflectionQ2: text("reflection_q2").notNull(),
    prayerPrompt: text("prayer_prompt"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    planDayUnique: unique("devotional_days_plan_day_unique").on(t.planId, t.dayNumber),
  })
);

export const passageNotes = pgTable(
  "passage_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    book: text("book").notNull(),
    chapter: integer("chapter").notNull(),
    passageReference: text("passage_reference").notNull(),
    context: text("context"),
    notes: jsonb("notes").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bookChapterUnique: unique("passage_notes_book_chapter_unique").on(t.book, t.chapter),
    bookChapterIdx: index("idx_passage_notes_book_chapter").on(t.book, t.chapter),
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
  lastStreakDate: date("last_streak_date"),
  totalCompleted: integer("total_completed").notNull().default(0),
  generatedCount: integer("generated_count").notNull().default(0),
  generatedWindowStart: timestamp("generated_window_start", { withTimezone: true }),
  planUnlocksCount: integer("plan_unlocks_count").notNull().default(0),
  planUnlocksWindowStart: timestamp("plan_unlocks_window_start", { withTimezone: true }),
  churchName: text("church_name"),
  // survey
  surveyName: text("survey_name"),
  surveyAgeRange: text("survey_age_range"),
  surveyGender: text("survey_gender"),
  surveyState: text("survey_state"),
  surveyCity: text("survey_city"),
  surveyEducation: text("survey_education"),
  surveyHasChurch: boolean("survey_has_church"),
  surveyChurchName: text("survey_church_name"),
  surveyDevotionalRating: integer("survey_devotional_rating"),
  surveyFaithJourney: text("survey_faith_journey"),
  surveyGoals: text("survey_goals").array(),
  surveyRelationshipStatus: text("survey_relationship_status"), // single | dating | engaged | married
  surveyHasKids: boolean("survey_has_kids"),
  surveyCompletedAt: timestamp("survey_completed_at", { withTimezone: true }),
  // push notifications
  pushToken: text("push_token"),
  notifMorningReminder: boolean("notif_morning_reminder").notNull().default(true),
  notifPartnerDone: boolean("notif_partner_done").notNull().default(true),
  notifDailyNudge: boolean("notif_daily_nudge").notNull().default(true),
  notifGroupComplete: boolean("notif_group_complete").notNull().default(true),
  notifDiscipleship: boolean("notif_discipleship").notNull().default(true),
  notifMailbox: boolean("notif_mailbox").notNull().default(true),
  // family membership
  familyCode: text("family_code").unique(),
  familyAccountId: text("family_account_id"),
  // membership
  membershipTier: text("membership_tier").notNull().default("free"), // free | connect | sharpen | family
  membershipStartedAt: timestamp("membership_started_at", { withTimezone: true }),
  membershipExpiresAt: timestamp("membership_expires_at", { withTimezone: true }),
  // Stamped whenever membershipTier changes — anchors the discipleship grace
  // window (a downgraded discipler keeps their tools until the current plan ends).
  membershipTierChangedAt: timestamp("membership_tier_changed_at", { withTimezone: true }),
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
    completedIdx: index("idx_progress_user_completed").on(t.userId, t.completedAt),
  })
);

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  groupType: text("group_type").notNull(), // one-on-one | family | small-group | large-group | community
  currentPlanId: uuid("current_plan_id").references(() => devotionalPlans.id, {
    onDelete: "set null",
  }),
  // When the current plan was assigned — used to tell whether a plan was already
  // underway when a discipler dropped below Sharpen (the grace window).
  currentPlanStartedAt: timestamp("current_plan_started_at", { withTimezone: true }),
  currentDay: integer("current_day").notNull().default(1),
  // When the group landed on `currentDay`. Calendar-paced groups (see
  // lib/group-pacing.ts) advance off this clock instead of waiting for every
  // member. Null means no plan is running, or the group predates the column —
  // both are treated as "stamp it, don't advance", so nobody loses a day to
  // the migration.
  currentDayStartedAt: timestamp("current_day_started_at", { withTimezone: true }),
  streakCount: integer("streak_count").notNull().default(0),
  lastStreakDate: date("last_streak_date"),
  inviteCode: text("invite_code").notNull().unique(),
  createdBy: text("created_by").notNull(),
  // Soft-delete: the creator "deletes" a group by archiving it, so members keep
  // their past entries. Null = active. archivedBy records who archived it.
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  archivedBy: text("archived_by"),
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
    displayOrder: integer("display_order").notNull().default(0),
    doneToday: boolean("done_today").notNull().default(false),
    streakCount: integer("streak_count").notNull().default(0),
    lastStreakDate: date("last_streak_date"),
    // Whether this member has seen the one-time "group deleted" notice for an
    // archived group. Reset to false when the group is archived.
    archiveNoticeSeen: boolean("archive_notice_seen").notNull().default(false),
  },
  (t) => ({
    groupUserUnique: unique("group_members_unique").on(t.groupId, t.userId),
    userIdx: index("idx_group_members_user").on(t.userId),
  })
);

export const discipleRelationships = pgTable(
  "disciple_relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    disciplerId: text("discipler_id").notNull(),
    discipleId: text("disciple_id").notNull(),
    // Discipleship is a role assignment *inside* an existing one-on-one group.
    groupId: uuid("group_id").references(() => groups.id, { onDelete: "set null" }),
    status: text("status").notNull().default("active"), // pending | active | ended
    // Stamped when the disciple accepts the one-time privacy notice.
    privacyNoticeAcceptedAt: timestamp("privacy_notice_accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pairUnique: unique("disciple_relationships_unique").on(t.disciplerId, t.discipleId),
    discipleIdx: index("idx_disciple_relationships_disciple").on(t.discipleId),
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
    // Which group instance this submission belongs to. NULL = personal. A library
    // plan is a shared template (same planId across personal + every group that
    // picks it), so answers are scoped by instance, not just (user, plan, day).
    groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }),
    // Which RUN of the plan this answer belongs to (see planRuns) — what lets a
    // restarted/re-run plan start blank without touching earlier answers.
    runId: uuid("run_id").references(() => planRuns.id, { onDelete: "cascade" }),
    response1: text("response1"),
    response2: text("response2"),
    // Optional Q3 — a custom question the discipler sets for the disciple.
    response3: text("response3"),
    // Snapshot of the Q3 prompt the disciple actually answered. Lets the discipler's
    // view show the exact question regardless of timezone/date drift, instead of
    // reconstructing it by matching the submission's (UTC) date to a question's date.
    q3Question: text("q3_question"),
    prayer: text("prayer"),
    voiceMemoUrl: text("voice_memo_url"),
    audioQ1Url: text("audio_q1_url"),
    audioQ2Url: text("audio_q2_url"),
    q1Private: boolean("q1_private").notNull().default(false),
    q2Private: boolean("q2_private").notNull().default(false),
    q3Private: boolean("q3_private").notNull().default(false),
    prayerPrivate: boolean("prayer_private").notNull().default(true),
    voiceMemoPrivate: boolean("voice_memo_private").notNull().default(false),
    submissionSource: text("submission_source").notNull().default("typed"), // typed | commute | voice_memo
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Scoped lookup by (user, plan, day, instance). Uniqueness per scope is
    // enforced in app code — a nullable groupId can't dedupe NULLs in a Postgres
    // unique index.
    scopeIdx: index("idx_submissions_scope").on(t.userId, t.planId, t.dayNumber, t.groupId),
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

/**
 * One RUN of a plan — the missing identity between a plan (content) and the
 * person/group doing it. A user can run the same plan twice (restart), and a
 * group can re-run a plan, without answers colliding: submissions carry the
 * run they belong to. userPlanProgress and groups.currentPlanId/currentDay
 * remain the "active pointer" for reads; this table is the ledger.
 */
export const planRuns = pgTable(
  "plan_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => devotionalPlans.id, { onDelete: "cascade" }),
    ownerType: text("owner_type").notNull(), // "user" | "group"
    userId: text("user_id"), // set when ownerType = "user"
    groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }), // set when ownerType = "group"
    currentDay: integer("current_day").notNull().default(1),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }), // finished the last day
    endedAt: timestamp("ended_at", { withTimezone: true }), // stopped/replaced before finishing
  },
  (t) => ({
    userPlanIdx: index("idx_plan_runs_user_plan").on(t.userId, t.planId),
    groupPlanIdx: index("idx_plan_runs_group_plan").on(t.groupId, t.planId),
    // At most ONE open run per owner+plan. Two simultaneous first-submitters
    // used to be able to each create a run via ensure*Run, silently splitting
    // the group's submissions across runs (feeds/history scoped to one run
    // would then miss the other's answers).
    activeUserRunUniq: uniqueIndex("uniq_plan_runs_active_user")
      .on(t.userId, t.planId)
      .where(sql`owner_type = 'user' and completed_at is null and ended_at is null`),
    activeGroupRunUniq: uniqueIndex("uniq_plan_runs_active_group")
      .on(t.groupId, t.planId)
      .where(sql`owner_type = 'group' and completed_at is null and ended_at is null`),
  })
);

export const groupPlanHistory = pgTable(
  "group_plan_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    planId: uuid("plan_id").references(() => devotionalPlans.id, { onDelete: "set null" }),
    planTitle: text("plan_title").notNull(), // snapshot — survives plan deletion
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    groupIdx: index("idx_group_plan_history_group").on(t.groupId),
  })
);

// Notes kept inside a discipleship relationship. A note is either PRIVATE (only
// its author sees it — e.g. a discipler's follow-up reminders) or SHARED (both
// parties see it — e.g. prayer requests, things to discuss next meeting). `kind`
// is a light tag so prayer requests can surface together.
export const discipleshipNotes = pgTable(
  "discipleship_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    relationshipId: uuid("relationship_id")
      .notNull()
      .references(() => discipleRelationships.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id").notNull(),
    body: text("body").notNull(),
    shared: boolean("shared").notNull().default(false),
    kind: text("kind").notNull().default("note"), // note | prayer
    // Optional: pin a note to a specific submission (a response to follow up on).
    relatedSubmissionId: uuid("related_submission_id").references(
      () => devotionalSubmissions.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    relIdx: index("idx_discipleship_notes_rel").on(t.relationshipId, t.createdAt),
  })
);

/* ============================================================
 * DISCIPLESHIP KIT  (tools that activate inside a one-on-one
 * relationship — see disciple_relationships above)
 * ============================================================ */

// A custom daily question (Q3) the discipler sets for the disciple. One per
// (relationship, date) — re-sending the same day overwrites.
export const customQuestions = pgTable(
  "custom_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    discipleshipRelationshipId: uuid("discipleship_relationship_id")
      .notNull()
      .references(() => discipleRelationships.id, { onDelete: "cascade" }),
    discipleId: text("disciple_id").notNull(),
    questionText: text("question_text").notNull(),
    forDate: date("for_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    relationshipDateUnique: unique("custom_questions_unique").on(
      t.discipleshipRelationshipId,
      t.forDate
    ),
  })
);

// A discipler's private flag on one field of a disciple's submission. Invisible
// to the disciple. Reads only ever touch post-privacy-strip data.
export const flaggedResponses = pgTable(
  "flagged_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    discipleshipRelationshipId: uuid("discipleship_relationship_id")
      .notNull()
      .references(() => discipleRelationships.id, { onDelete: "cascade" }),
    responseId: uuid("response_id")
      .notNull()
      .references(() => devotionalSubmissions.id, { onDelete: "cascade" }),
    questionType: text("question_type").notNull(), // q1 | q2 | q3 | praise
    flaggedAt: timestamp("flagged_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    flagUnique: unique("flagged_responses_unique").on(
      t.discipleshipRelationshipId,
      t.responseId,
      t.questionType
    ),
  })
);

// Two-way text thread between discipler and disciple. Text-only this build;
// messageType/audioUrl reserved so voice can be added without a migration.
export const mailboxMessages = pgTable(
  "mailbox_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    discipleshipRelationshipId: uuid("discipleship_relationship_id")
      .notNull()
      .references(() => discipleRelationships.id, { onDelete: "cascade" }),
    senderId: text("sender_id").notNull(),
    messageType: text("message_type").notNull().default("text"), // text | voice (reserved)
    messageText: text("message_text"),
    audioUrl: text("audio_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => ({
    threadIdx: index("idx_mailbox_messages_thread").on(
      t.discipleshipRelationshipId,
      t.createdAt
    ),
  })
);

/* ============================================================
 * COMMUNITY DEVOTIONAL  (one shared reading per calendar day)
 *
 * Authored solely by the founder (an admin — see lib/admin.ts). Content is
 * keyed by `publish_date` so everyone in the app reads the same devotional on
 * the same calendar day. Engagement mirrors the group feed: each member may
 * post one response per day and react to other members' responses.
 * ============================================================ */

export const communityDevotionals = pgTable(
  "community_devotionals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // The calendar day (YYYY-MM-DD) everyone reads this on — one reading per day.
    publishDate: date("publish_date").notNull().unique(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    passageReference: text("passage_reference").notNull(), // e.g. "Romans 14:1–12"
    passageContext: text("passage_context"),
    studyNotes: jsonb("study_notes").notNull().default([]), // StudyNoteEntry[]
    // 0–5 reflection questions, all optional. Source of truth; reflectionQ1/Q2
    // are legacy mirrors of questions[0]/[1] kept for pre-questions clients.
    questions: jsonb("questions").notNull().default([]), // string[]
    reflectionQ1: text("reflection_q1"),
    reflectionQ2: text("reflection_q2"),
    prayerPrompt: text("prayer_prompt"),
    status: text("status").notNull().default("draft"), // draft | published
    createdByUserId: text("created_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusDateIdx: index("idx_community_devotionals_status_date").on(t.status, t.publishDate),
  })
);

export const communityResponses = pgTable(
  "community_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityDevotionalId: uuid("community_devotional_id")
      .notNull()
      .references(() => communityDevotionals.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    // Index-aligned with the devotional's questions[]. Source of truth;
    // response1/response2 are legacy mirrors of answers[0]/[1].
    answers: jsonb("answers").notNull().default([]), // (string | null)[]
    response1: text("response1"),
    response2: text("response2"),
    prayer: text("prayer"),
    q1Private: boolean("q1_private").notNull().default(false),
    q2Private: boolean("q2_private").notNull().default(false),
    prayerPrivate: boolean("prayer_private").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    devotionalUserUnique: unique("community_responses_unique").on(
      t.communityDevotionalId,
      t.userId
    ),
    devotionalIdx: index("idx_community_responses_devotional").on(t.communityDevotionalId),
  })
);

export const communityReactions = pgTable(
  "community_reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    responseId: uuid("response_id")
      .notNull()
      .references(() => communityResponses.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    reactionType: text("reaction_type").notNull(), // amen | hit_me | fire
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    reactionUnique: unique("community_reactions_unique").on(
      t.responseId,
      t.userId,
      t.reactionType
    ),
    responseIdx: index("idx_community_reactions_response").on(t.responseId),
  })
);

// A user's report of a community response — the Community feed is the only UGC
// surface open to strangers (groups are invite-only, so they stay unmoderated).
// Reports queue for the founder in the community admin screen; the response
// stays visible until acted on.
export const communityReports = pgTable(
  "community_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    responseId: uuid("response_id")
      .notNull()
      .references(() => communityResponses.id, { onDelete: "cascade" }),
    reporterUserId: text("reporter_user_id").notNull(),
    reason: text("reason").notNull().default("other"), // inappropriate | spam | other
    status: text("status").notNull().default("open"), // open | dismissed
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    reportUnique: unique("community_reports_unique").on(t.responseId, t.reporterUserId),
    statusIdx: index("idx_community_reports_status").on(t.status, t.createdAt),
  })
);

// One row per promo code a user has redeemed — blocks re-redemption and leaves
// an audit trail for when real billing ships.
export const promoRedemptions = pgTable(
  "promo_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    code: text("code").notNull(),
    tier: text("tier").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    redemptionUnique: unique("promo_redemptions_unique").on(t.userId, t.code),
    userIdx: index("idx_promo_redemptions_user").on(t.userId),
  })
);

export const schema = {
  bibleChapters,
  devotionalPlans,
  devotionalDays,
  passageNotes,
  profiles,
  userPlanProgress,
  groups,
  groupPlanHistory,
  groupMembers,
  discipleRelationships,
  devotionalSubmissions,
  submissionReactions,
  customQuestions,
  flaggedResponses,
  mailboxMessages,
  communityDevotionals,
  communityResponses,
  communityReactions,
  communityReports,
  promoRedemptions,
};
