import type { CommunityDevotional, CommunityFeedItem } from "./api";

/**
 * The reading's reflection questions (0–5). `questions` is the source of truth;
 * fall back to the legacy two-field shape for rows written before the change.
 */
export function questionsOf(d: CommunityDevotional): string[] {
  const qs = (d.questions ?? []).filter((q) => q && q.trim().length > 0);
  if (qs.length) return qs;
  return [d.reflectionQ1, d.reflectionQ2].filter((q): q is string => !!q && q.trim().length > 0);
}

/** The answer aligned with questions[i], falling back to the legacy columns. */
export function answerAt(item: CommunityFeedItem, i: number): string | null {
  const a = item.answers?.[i];
  if (a && a.trim()) return a;
  const legacy = [item.response1, item.response2][i];
  return legacy && legacy.trim() ? legacy : null;
}

export function hasAnyAnswer(item: CommunityFeedItem): boolean {
  if (item.prayer && item.prayer.trim()) return true;
  if (item.answers?.some((a) => a && a.trim())) return true;
  return !!(item.response1 || item.response2);
}
