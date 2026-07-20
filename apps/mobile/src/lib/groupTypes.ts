export const GROUP_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  "one-on-one":  { label: "One-on-One",  color: "#89B4C9" },
  "family":      { label: "Family",      color: "#7FAF8A" },
  "small-group": { label: "Small Group", color: "#C49A78" },
  "large-group": { label: "Large Group", color: "#9B8EC4" },
  "community":   { label: "Church",      color: "#7A9EAF" },
};

export const GROUP_TYPE_KEYS = Object.keys(GROUP_TYPE_CONFIG);

// Mirror of apps/server/src/lib/group-pacing.ts — keep the two in sync.
const CALENDAR_PACED: ReadonlySet<string> = new Set(["large-group", "community"]);

/**
 * Calendar-paced groups advance a day at a time on the clock rather than waiting
 * for every member, so falling behind is normal in them. Unknown types fall back
 * to convoy, matching the server.
 */
export function isCalendarPaced(groupType: string): boolean {
  return CALENDAR_PACED.has(groupType);
}

/**
 * Where a group's "open the devotional" action should land. Calendar-paced
 * groups get the day list — with people routinely behind, the honest landing
 * place is "here's where you are", not today's reading. Convoy groups go
 * straight in, since the group waits and nobody is behind by definition.
 *
 * Returns null when the group has no plan running.
 */
export function groupReadingHref(g: {
  id: string;
  groupType: string;
  plan: { id: string } | null;
}): string | null {
  if (!g.plan) return null;
  return isCalendarPaced(g.groupType)
    ? `/devotional/days/${g.plan.id}?groupId=${g.id}`
    : `/devotional/${g.plan.id}?groupId=${g.id}`;
}
