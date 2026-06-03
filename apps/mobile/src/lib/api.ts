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
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = (data && (data.error || data.message)) || res.statusText;
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
};

export type DevotionalDay = {
  id: string;
  planId: string;
  dayNumber: number;
  chapter: string;
  theme: string | null;
  reflectionQ1: string;
  reflectionQ2: string;
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
  surveyState: string | null;
  surveyCity: string | null;
  surveyEducation: string | null;
  surveyHasChurch: boolean | null;
  surveyChurchName: string | null;
  surveyDevotionalRating: number | null;
  surveyFaithJourney: string | null;
  surveyGoals: string[] | null;
  surveyCompletedAt: string | null;
  membershipTier: "free" | "connect" | "sharpen" | "family";
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
  currentDay: number;
  streakCount: number;
  displayOrder: number;
  plan: GroupPlan | null;
  members: GroupMember[];
};

export type Submission = {
  id: string;
  userId: string;
  planId: string;
  dayNumber: number;
  response1: string | null;
  response2: string | null;
  prayer: string | null;
  voiceMemoUrl: string | null;
  audioQ1Url: string | null;
  audioQ2Url: string | null;
  q1Private: boolean;
  q2Private: boolean;
  prayerPrivate: boolean;
  voiceMemoPrivate: boolean;
  submissionSource: string;
};

/* ---------- Endpoint helpers ---------- */

export const ApiClient = {
  getProfile: () => api<{ profile: Profile }>("/api/profile"),
  updateProfile: (patch: Partial<Profile> & { surveyCompleted?: boolean }) =>
    api<{ profile: Profile }>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(patch),
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
  startPlan: (planId: string) =>
    api<{ progress: PlanProgress }>("/api/progress", {
      method: "POST",
      body: JSON.stringify({ planId }),
    }),
  updateProgress: (
    planId: string,
    body: { currentDay?: number; completed?: boolean }
  ) =>
    api<{ progress: PlanProgress }>(`/api/progress/${planId}`, {
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

  getSubmission: (planId: string, dayNumber: number) =>
    api<{ submission: Submission | null }>(
      `/api/submissions/${planId}/${dayNumber}`
    ),
  saveSubmission: (body: {
    planId: string;
    dayNumber: number;
    response1?: string;
    response2?: string;
    prayer?: string;
    audioQ1Url?: string;
    audioQ2Url?: string;
    q1Private?: boolean;
    q2Private?: boolean;
    prayerPrivate?: boolean;
    submissionSource?: string;
  }) =>
    api<{ submission: Submission }>("/api/submissions", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};
