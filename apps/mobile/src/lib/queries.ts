import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "./api";
import { useSession } from "./session";

/** Whether we have an authenticated session right now. */
export function useAuthed() {
  const { user, isPending } = useSession();
  return { authed: !!user, user, isPending };
}

export function useProfile() {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => ApiClient.getProfile().then((r) => r.profile),
    enabled: authed,
  });
}

export function usePlans() {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["plans"],
    queryFn: () => ApiClient.getPlans(),
    enabled: authed,
  });
}

export function usePlansByCategory(category: string) {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["plans", "category", category],
    queryFn: () => ApiClient.getPlansByCategory(category).then((r) => r.plans),
    enabled: authed && !!category,
  });
}

export function useActiveDevotional() {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["progress", "active"],
    queryFn: () => ApiClient.getActiveDevotional().then((r) => r.active),
    enabled: authed,
  });
}

export function useProgress() {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["progress"],
    queryFn: () => ApiClient.getProgress().then((r) => r.progress),
    enabled: authed,
  });
}

export function usePlan(planId: string | undefined) {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["plan", planId],
    queryFn: () => ApiClient.getPlan(planId!).then((r) => r.plan),
    enabled: authed && !!planId,
  });
}

export function useDays(planId: string | undefined) {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["plan", planId, "days"],
    queryFn: () => ApiClient.getDays(planId!).then((r) => r.days),
    enabled: authed && !!planId,
  });
}

export function useGenerateTokens() {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["generate", "tokens"],
    queryFn: () => ApiClient.getGenerateTokens(),
    enabled: authed,
  });
}

export function useGroups() {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["groups"],
    queryFn: () => ApiClient.getGroups().then((r) => r.groups),
    enabled: authed,
  });
}

export function useGroupDayResponses(planId: string, dayNumber: number, enabled: boolean) {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["group-day-responses", planId, dayNumber],
    queryFn: () => ApiClient.getGroupDayResponses(planId, dayNumber).then((r) => r.responses),
    enabled: authed && enabled && !!planId && dayNumber > 0,
    staleTime: 60_000,
  });
}

/** Today's shared Community Devotional + the community response feed. */
export function useCommunityToday() {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["community", "today"],
    queryFn: () => ApiClient.getCommunityToday(),
    enabled: authed,
  });
}

/** Past published Community Devotionals (archive list). */
export function useCommunityArchive() {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["community", "archive"],
    queryFn: () => ApiClient.getCommunityArchive().then((r) => r.devotionals),
    enabled: authed,
  });
}

/** A single archived Community Devotional + its feed. */
export function useCommunityEntry(id: string | undefined) {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["community", "entry", id],
    queryFn: () => ApiClient.getCommunityEntry(id!),
    enabled: authed && !!id,
  });
}

/** Admin-only: every Community Devotional (drafts + published). */
export function useCommunityAdminList(enabled: boolean) {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["community", "admin", "list"],
    queryFn: () => ApiClient.getCommunityAdminList().then((r) => r.devotionals),
    enabled: authed && enabled,
  });
}

/* ---------- Discipleship Kit ---------- */

/** All discipleship relationships the user is part of (drives entry points + notice gate). */
export function useDiscipleships() {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["discipleship"],
    queryFn: () => ApiClient.getDiscipleships().then((r) => r.relationships),
    enabled: authed,
  });
}

/** Today's custom question (Q3) for a relationship, if the discipler set one. */
export function useCustomQuestion(relationshipId: string | undefined, forDate: string | undefined) {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["discipleship", relationshipId, "question", forDate],
    queryFn: () => ApiClient.getCustomQuestion(relationshipId!, forDate!).then((r) => r.question),
    enabled: authed && !!relationshipId && !!forDate,
  });
}

/** The disciple's submissions, as seen by the discipler (private fields stripped). */
export function useDiscipleResponses(relationshipId: string | undefined) {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["discipleship", relationshipId, "responses"],
    queryFn: () => ApiClient.getDiscipleResponses(relationshipId!).then((r) => r.responses),
    enabled: authed && !!relationshipId,
  });
}

/** Flagged Notes for a relationship. */
export function useFlaggedResponses(relationshipId: string | undefined) {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["discipleship", relationshipId, "flags"],
    queryFn: () => ApiClient.getFlaggedResponses(relationshipId!).then((r) => r.flags),
    enabled: authed && !!relationshipId,
  });
}

/** The mailbox thread for a relationship (fetching marks the other party's messages read). */
export function useMailbox(relationshipId: string | undefined) {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["discipleship", relationshipId, "mailbox"],
    queryFn: () => ApiClient.getMailbox(relationshipId!).then((r) => r.messages),
    enabled: authed && !!relationshipId,
  });
}

/** Notes for a relationship — every shared note + your own private notes. */
export function useNotes(relationshipId: string | undefined) {
  const { authed } = useAuthed();
  return useQuery({
    queryKey: ["discipleship", relationshipId, "notes"],
    queryFn: () => ApiClient.getNotes(relationshipId!).then((r) => r.notes),
    enabled: authed && !!relationshipId,
  });
}
