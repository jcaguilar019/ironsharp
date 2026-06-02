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
