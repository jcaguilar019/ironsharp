import { getAuthToken } from "./auth-client";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Thin wrapper around fetch that targets the IronSharp API and attaches the
 * Neon Auth JWT as a Bearer token (the server verifies it against Neon's JWKS).
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        // Lets the server reason about the user's *local* calendar day (for
        // "done today" / streak windows) instead of UTC. Minutes local is
        // behind UTC: EDT=240, PDT=420.
        "x-timezone-offset": String(new Date().getTimezoneOffset()),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      throw new ApiError(0, "Request timed out. Please check your connection and try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(res.status, res.ok ? "Invalid server response" : res.statusText || "Server error");
  }

  if (!res.ok) {
    const body = data as Record<string, unknown> | null;
    const message = (body?.error || body?.message) as string | undefined || res.statusText;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

/* ---------- Domain types (mirror the server's responses) ---------- */

export type DevotionalPlan = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  category: string;
  totalDays: number;
  howToUse: string | null;
  imageUrl: string | null;
  /** Derived server-side from the plan's daily passages (category list only). */
  bookSummary?: string;
};

export type DevotionalDay = {
  id: string;
  planId: string;
  dayNumber: number;
  chapter: string;
  theme: string | null;
  passageContext: string | null;
  studyNotes: StudyNoteEntry[];
  reflection: string | null;
  reflectionQ1: string;
  reflectionQ2: string;
  prayerPrompt: string | null;
};

export type Profile = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  primaryRole: string;
  streakCount: number;
  totalCompleted: number;
  churchName: string | null;
  // Survey answers (collected during onboarding).
  surveyName: string | null;
  surveyAgeRange: string | null;
  surveyGender: string | null;
  surveyState: string | null;
  surveyCity: string | null;
  surveyEducation: string | null;
  surveyHasChurch: boolean | null;
  surveyChurchName: string | null;
  surveyDevotionalRating: number | null;
  surveyFaithJourney: string | null;
  surveyGoals: string[] | null;
  surveyRelationshipStatus: string | null;
  surveyHasKids: boolean | null;
  surveyCompletedAt: string | null;
  pushToken: string | null;
  notifMorningReminder: boolean;
  notifPartnerDone: boolean;
  notifDailyNudge: boolean;
  notifGroupComplete: boolean;
  familyCode: string | null;
  familyAccountId: string | null;
  createdAt: string;
  membershipTier: "free" | "connect" | "sharpen" | "family";
  generatedCount: number;
  generatedWindowStart: string | null;
  planUnlocksCount: number;
  planUnlocksWindowStart: string | null;
  /** Founder authoring rights (Community Devotional). Derived server-side. */
  isAdmin?: boolean;
};

export type PlanProgress = {
  id: string;
  userId: string;
  planId: string;
  currentDay: number;
  startedAt: string;
  completedAt: string | null;
};

export type ActiveDevotional = {
  planId: string;
  planTitle: string;
  totalDays: number;
  currentDay: number;
  chapter: string | null;
  theme: string | null;
  /** True if the user already submitted today's reading for this plan. */
  doneToday: boolean;
};

export type StudyNoteEntry = {
  verse_ref: string;
  note: string;
};

export type BibleChapter = {
  id: string;
  translation: string;
  book: string;
  testament: string;
  bookOrder: number;
  chapter: number;
  verses: string[];
};

export type BibleBook = {
  book: string;
  testament: string;
  bookOrder: number;
  chapters: number;
};

export type PassageNotes = {
  id: string;
  book: string;
  chapter: number;
  passageReference: string;
  context: string | null;
  notes: StudyNoteEntry[];
};

export type GroupMember = {
  id: string;
  userId: string;
  memberRole: string;
  doneToday: boolean;
  streakCount: number;
  displayName: string;
  avatarUrl: string | null;
};

export type GroupPlan = {
  id: string;
  title: string;
  chapter: string | null;
  totalDays: number;
};

export type Group = {
  id: string;
  name: string;
  groupType: "one-on-one" | "family" | "small-group";
  inviteCode: string;
  currentDay: number;
  streakCount: number;
  displayOrder: number;
  plan: GroupPlan | null;
  members: GroupMember[];
};

export type UserSearchResult = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
};

export type GroupDayResponse = {
  userId: string;
  isOwn: boolean;
  displayName: string;
  avatarUrl: string | null;
  response1: string | null;
  response2: string | null;
  prayer: string | null;
  q1Private: boolean;
  q2Private: boolean;
  prayerPrivate: boolean;
  submittedAt: string;
};

export type Submission = {
  id: string;
  userId: string;
  planId: string;
  dayNumber: number;
  response1: string | null;
  response2: string | null;
  response3: string | null;
  prayer: string | null;
  voiceMemoUrl: string | null;
  audioQ1Url: string | null;
  audioQ2Url: string | null;
  q1Private: boolean;
  q2Private: boolean;
  q3Private: boolean;
  prayerPrivate: boolean;
  voiceMemoPrivate: boolean;
  submissionSource: string;
  submittedAt: string;
};

/* ---------- Community Devotional ---------- */

export type CommunityDevotional = {
  id: string;
  publishDate: string; // YYYY-MM-DD
  title: string;
  subtitle: string | null;
  passageReference: string;
  passageContext: string | null;
  studyNotes: StudyNoteEntry[];
  reflectionQ1: string;
  reflectionQ2: string;
  prayerPrompt: string | null;
  status: "draft" | "published";
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

/** Payload for creating or editing a Community Devotional (admin only). */
export type CommunityDevotionalInput = {
  publishDate: string;
  title: string;
  subtitle?: string | null;
  passageReference: string;
  passageContext?: string | null;
  studyNotes: StudyNoteEntry[];
  reflectionQ1: string;
  reflectionQ2: string;
  prayerPrompt?: string | null;
  status: "draft" | "published";
};

export type CommunityReactionType = "amen" | "hit_me" | "fire";
export type CommunityReactionCounts = Record<CommunityReactionType, number>;

export type CommunityFeedItem = {
  id: string;
  userId: string;
  isOwn: boolean;
  displayName: string;
  avatarUrl: string | null;
  response1: string | null;
  response2: string | null;
  prayer: string | null;
  q1Private: boolean;
  q2Private: boolean;
  prayerPrivate: boolean;
  updatedAt: string;
  reactions: CommunityReactionCounts;
  myReactions: CommunityReactionType[];
};

export type CommunityToday = {
  devotional: CommunityDevotional | null;
  feed: CommunityFeedItem[];
  myResponse: CommunityFeedItem | null;
};

export type CommunityArchiveItem = {
  id: string;
  publishDate: string;
  title: string;
  subtitle: string | null;
  passageReference: string;
};

export type CommunityResponseRow = {
  id: string;
  communityDevotionalId: string;
  userId: string;
  response1: string | null;
  response2: string | null;
  prayer: string | null;
  q1Private: boolean;
  q2Private: boolean;
  prayerPrivate: boolean;
  createdAt: string;
  updatedAt: string;
};

/* ---------- Discipleship Kit ---------- */

export type DiscipleshipRole = "discipler" | "disciple";
export type DiscipleshipStatus = "pending" | "active" | "ended";
export type QuestionType = "q1" | "q2" | "q3" | "praise";

export type DiscipleshipRelationship = {
  id: string;
  role: DiscipleshipRole;
  status: DiscipleshipStatus;
  groupId: string | null;
  privacyNoticeAcceptedAt: string | null;
  counterpart: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
  };
  unreadCount: number;
};

export type CustomQuestion = {
  id: string;
  discipleshipRelationshipId: string;
  discipleId: string;
  questionText: string;
  forDate: string; // YYYY-MM-DD
  createdAt: string;
};

export type DiscipleResponse = {
  id: string;
  dayNumber: number;
  chapter: string | null;
  submittedAt: string;
  response1: string | null;
  response2: string | null;
  response3: string | null;
  prayer: string | null;
  q1Private: boolean;
  q2Private: boolean;
  q3Private: boolean;
  prayerPrivate: boolean;
  q3Question: string | null;
  flagged: QuestionType[];
};

export type FlaggedResponse = {
  responseId: string;
  questionType: QuestionType;
  flaggedAt: string;
  dayNumber: number;
  chapter: string | null;
  submittedAt: string;
  text: string | null;
};

export type MailboxMessage = {
  id: string;
  discipleshipRelationshipId: string;
  senderId: string;
  messageType: string;
  messageText: string | null;
  audioUrl: string | null;
  createdAt: string;
  readAt: string | null;
};

/* ---------- Endpoint helpers ---------- */

/** Streamable URL for a prepared TTS clip — play via expo-audio with a Bearer header. */
export const ttsStreamUrl = (id: string): string => `${BASE_URL}/api/tts/${id}`;

export const ApiClient = {
  getProfile: () => api<{ profile: Profile }>("/api/profile"),
  /** Generate (or reuse a cached) cloud reading; returns an id to stream. */
  prepareTts: (text: string, opts?: { voice?: string; instructions?: string }) =>
    api<{ id: string; cached: boolean }>("/api/tts", {
      method: "POST",
      body: JSON.stringify({ text, voice: opts?.voice, instructions: opts?.instructions }),
    }),
  updateProfile: (patch: Partial<Profile> & { surveyCompleted?: boolean }) =>
    api<{ profile: Profile }>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  redeemPromo: (code: string) =>
    api<{ profile: Profile; tier: string; discountPercent?: number; label?: string }>(
      "/api/profile/redeem-promo",
      {
        method: "POST",
        body: JSON.stringify({ code }),
      }
    ),
  deleteAccount: () =>
    api<{ ok: boolean }>("/api/profile", { method: "DELETE" }),
  savePushToken: (token: string) =>
    api<{ ok: boolean }>("/api/profile/push-token", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  saveNotifPrefs: (prefs: Partial<Pick<Profile, "notifMorningReminder" | "notifPartnerDone" | "notifDailyNudge" | "notifGroupComplete">>) =>
    api<{ ok: boolean }>("/api/profile/notification-prefs", {
      method: "PATCH",
      body: JSON.stringify(prefs),
    }),
  validateFamilyCode: (code: string) =>
    api<{ valid: boolean }>(`/api/profile/family/validate?code=${encodeURIComponent(code)}`),
  joinFamily: (code: string) =>
    api<{ profile: Profile }>("/api/profile/family/join", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  getGenerateTokens: () =>
    api<{ tokensRemaining: number; resetsAt: string | null; tierLimit: number }>("/api/plans/generate/tokens"),
  generateDevotional: (body: {
    bookOrTopic: string;
    inputType: "book" | "topic";
    days: number;
    themeFocus: string;
    who: string;
    context?: string;
  }) =>
    api<{ planId: string; reused: boolean }>("/api/plans/generate", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getPlans: () =>
    api<{ plans: DevotionalPlan[]; countByCategory: Record<string, number> }>(
      "/api/plans"
    ),
  getPlansByCategory: (category: string) =>
    api<{ plans: DevotionalPlan[] }>(`/api/plans/category/${category}`),
  getPlan: (planId: string) => api<{ plan: DevotionalPlan }>(`/api/plans/${planId}`),
  getDays: (planId: string) =>
    api<{ days: DevotionalDay[] }>(`/api/plans/${planId}/days`),
  getDay: (planId: string, dayNumber: number) =>
    api<{ day: DevotionalDay }>(`/api/plans/${planId}/days/${dayNumber}`),

  getProgress: () => api<{ progress: PlanProgress[] }>("/api/progress"),
  getActiveDevotional: () =>
    api<{ active: ActiveDevotional | null }>("/api/progress/active"),
  startPlan: (planId: string, forGroup = false) =>
    api<{ progress: PlanProgress }>("/api/progress", {
      method: "POST",
      body: JSON.stringify({ planId, forGroup }),
    }),
  updateProgress: (
    planId: string,
    body: { currentDay?: number; completed?: boolean }
  ) =>
    api<{ progress: PlanProgress }>(`/api/progress/${planId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  stopPlan: (planId: string) =>
    api<{ ok: boolean }>(`/api/progress/${planId}`, { method: "DELETE" }),
  updateGroupProgress: (
    groupId: string,
    body: { nextDay?: number; completed?: boolean }
  ) =>
    api<{ ok: boolean; allDone: boolean }>(`/api/groups/${groupId}/day`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  getBibleChapter: (book: string, chapter: number, translation = "KJV") =>
    api<{ chapter: BibleChapter | null }>(
      `/api/bible/${encodeURIComponent(book)}/${chapter}?translation=${translation}`
    ),
  getBibleBooks: (translation = "KJV") =>
    api<{ books: BibleBook[] }>(`/api/bible/books?translation=${translation}`),

  getPassageNotes: (book: string, chapter: number) =>
    api<{ passageNotes: PassageNotes | null }>(
      `/api/notes/${encodeURIComponent(book)}/${chapter}`
    ),

  getGroups: () => api<{ groups: Group[] }>("/api/groups"),
  createGroup: (body: { name: string; groupType: string }) =>
    api<{ group: Group }>("/api/groups", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  reorderGroups: (order: { groupId: string; displayOrder: number }[]) =>
    api<{ ok: boolean }>("/api/groups/reorder", {
      method: "PATCH",
      body: JSON.stringify({ order }),
    }),
  deleteGroup: (groupId: string) =>
    api<{ ok: boolean }>(`/api/groups/${groupId}`, { method: "DELETE" }),
  updateGroup: (groupId: string, name: string) =>
    api<{ group: Group }>(`/api/groups/${groupId}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  joinGroupByCode: (inviteCode: string) =>
    api<{ group: { id: string; name: string } }>("/api/groups/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode }),
    }),
  addGroupMember: (groupId: string, userId: string) =>
    api<{ ok: boolean }>(`/api/groups/${groupId}/members`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  removeGroupMember: (groupId: string, userId: string) =>
    api<{ ok: boolean }>(`/api/groups/${groupId}/members/${userId}`, {
      method: "DELETE",
    }),
  searchUsers: (q: string) =>
    api<{ users: UserSearchResult[] }>(`/api/profile/search?q=${encodeURIComponent(q)}`),
  assignPlanToGroup: (groupId: string, planId: string) =>
    api<{ ok: boolean }>(`/api/groups/${groupId}/plan`, {
      method: "PATCH",
      body: JSON.stringify({ planId }),
    }),

  getGroupDayResponses: (planId: string, dayNumber: number) =>
    api<{ responses: GroupDayResponse[] }>(
      `/api/submissions/group/day?planId=${planId}&dayNumber=${dayNumber}`
    ),

  getSubmission: (planId: string, dayNumber: number) =>
    api<{ submission: Submission | null }>(
      `/api/submissions/${planId}/${dayNumber}`
    ),
  getPlanSubmissions: (planId: string) =>
    api<{ submissions: Submission[] }>(`/api/submissions/plan/${planId}`),
  saveSubmission: (body: {
    planId: string;
    dayNumber: number;
    response1?: string;
    response2?: string;
    response3?: string;
    prayer?: string;
    audioQ1Url?: string;
    audioQ2Url?: string;
    q1Private?: boolean;
    q2Private?: boolean;
    q3Private?: boolean;
    prayerPrivate?: boolean;
    submissionSource?: string;
  }) =>
    api<{ submission: Submission }>("/api/submissions", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  // ── Community Devotional ──
  getCommunityToday: () => api<CommunityToday>("/api/community/today"),
  getCommunityEntry: (id: string) => api<CommunityToday>(`/api/community/entry/${id}`),
  getCommunityArchive: () =>
    api<{ devotionals: CommunityArchiveItem[] }>("/api/community/archive"),
  saveCommunityResponse: (body: {
    communityDevotionalId: string;
    response1?: string | null;
    response2?: string | null;
    prayer?: string | null;
    q1Private?: boolean;
    q2Private?: boolean;
    prayerPrivate?: boolean;
  }) =>
    api<{ response: CommunityResponseRow }>("/api/community/responses", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  toggleCommunityReaction: (responseId: string, reactionType: CommunityReactionType) =>
    api<{ reacted: boolean }>("/api/community/reactions", {
      method: "POST",
      body: JSON.stringify({ responseId, reactionType }),
    }),

  // Admin / founder authoring
  getCommunityAdminList: () =>
    api<{ devotionals: CommunityDevotional[] }>("/api/community/admin/list"),
  createCommunityDevotional: (body: CommunityDevotionalInput) =>
    api<{ devotional: CommunityDevotional }>("/api/community/admin/create", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateCommunityDevotional: (id: string, body: CommunityDevotionalInput) =>
    api<{ devotional: CommunityDevotional }>(`/api/community/admin/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  publishCommunityDevotional: (id: string) =>
    api<{ devotional: CommunityDevotional }>(`/api/community/admin/${id}/publish`, {
      method: "POST",
    }),

  // ── Discipleship Kit ──
  getDiscipleships: () =>
    api<{ relationships: DiscipleshipRelationship[] }>("/api/discipleship"),
  inviteDisciple: (groupId: string, discipleId: string) =>
    api<{ relationship: DiscipleshipRelationship }>("/api/discipleship/invite", {
      method: "POST",
      body: JSON.stringify({ groupId, discipleId }),
    }),
  acceptDiscipleship: (id: string) =>
    api<{ relationship: DiscipleshipRelationship }>(`/api/discipleship/${id}/accept`, {
      method: "POST",
    }),
  declineDiscipleship: (id: string) =>
    api<{ ok: boolean }>(`/api/discipleship/${id}/decline`, { method: "POST" }),
  getCustomQuestion: (id: string, forDate: string) =>
    api<{ question: CustomQuestion | null }>(
      `/api/discipleship/${id}/questions?forDate=${forDate}`
    ),
  setCustomQuestion: (id: string, body: { questionText: string; forDate: string }) =>
    api<{ question: CustomQuestion }>(`/api/discipleship/${id}/questions`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getDiscipleResponses: (id: string) =>
    api<{ responses: DiscipleResponse[] }>(`/api/discipleship/${id}/responses`),
  flagResponse: (id: string, responseId: string, questionType: QuestionType) =>
    api<{ ok: boolean }>(`/api/discipleship/${id}/flags`, {
      method: "POST",
      body: JSON.stringify({ responseId, questionType }),
    }),
  unflagResponse: (id: string, responseId: string, questionType: QuestionType) =>
    api<{ ok: boolean }>(`/api/discipleship/${id}/flags`, {
      method: "DELETE",
      body: JSON.stringify({ responseId, questionType }),
    }),
  getFlaggedResponses: (id: string) =>
    api<{ flags: FlaggedResponse[] }>(`/api/discipleship/${id}/flags`),
  getMailbox: (id: string) =>
    api<{ messages: MailboxMessage[] }>(`/api/discipleship/${id}/mailbox`),
  sendMailboxMessage: (id: string, messageText: string) =>
    api<{ message: MailboxMessage }>(`/api/discipleship/${id}/mailbox`, {
      method: "POST",
      body: JSON.stringify({ messageText }),
    }),
};
