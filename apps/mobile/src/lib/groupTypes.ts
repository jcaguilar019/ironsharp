/**
 * Mirror of apps/server/src/lib/group-types.ts — keep the two in sync.
 *
 * Type means SIZE. A group climbs this ladder as it grows and is never demoted
 * back down; the server does the promoting, the app only describes it.
 */
export type GroupTypeConfig = {
  label: string;
  /** Shown under the label in the picker, so the size rule is never a surprise. */
  sublabel: string;
  color: string;
  /** Inclusive member cap. */
  max: number;
};

export const GROUP_TYPE_CONFIG: Record<string, GroupTypeConfig> = {
  "one-on-one":   { label: "One-on-One",   sublabel: "Just the two of you · discipleship tools", color: "#89B4C9", max: 2 },
  "small-group":  { label: "Small Group",  sublabel: "Up to 5 people",      color: "#C49A78", max: 5 },
  // Green inherited from the retired "Family" type.
  "medium-group": { label: "Medium Group", sublabel: "6 to 10 people",      color: "#7FAF8A", max: 10 },
  "large-group":  { label: "Large Group",  sublabel: "11 to 30 people",     color: "#9B8EC4", max: 30 },
  "community":    { label: "Church",       sublabel: "Over 30 · staff only", color: "#7A9EAF", max: Infinity },
};

export const GROUP_TYPE_KEYS = Object.keys(GROUP_TYPE_CONFIG);

/** Types only church staff may create. Mirrors RESTRICTED_TYPES on the server. */
export const RESTRICTED_TYPES: ReadonlySet<string> = new Set(["community"]);

/** What a member can pick. Church is hidden unless you're staff. */
export function selectableGroupTypes(isStaff: boolean): string[] {
  return GROUP_TYPE_KEYS.filter((k) => isStaff || !RESTRICTED_TYPES.has(k));
}

/**
 * Above this headcount a group stops being a room where everyone knows everyone.
 * One number behind per-person progress, nudging, and the group notifications —
 * so those never drift apart. Mirrors INTIMATE_MAX on the server.
 */
export const INTIMATE_MAX = 10;

export function isIntimate(memberCount: number): boolean {
  return memberCount <= INTIMATE_MAX;
}

/**
 * The by-name "X finished" push stops here — deliberately LOWER than
 * INTIMATE_MAX. A roster of ten costs one screen; pinging ten people every time
 * one of them finishes costs ninety pushes a day, because the volume is the
 * square of the group. So 6-to-10 names names on screen and stays quiet in your
 * pocket. Mirrors PARTNER_PING_MAX on the server, which does the enforcing —
 * this copy exists only so the settings screen can say the number out loud.
 */
export const PARTNER_PING_MAX = 5;

/** Inclusive member cap for a type. Unknown types are uncapped, never wrongly capped. */
export function maxMembersFor(groupType: string): number {
  return GROUP_TYPE_CONFIG[groupType]?.max ?? Infinity;
}

/**
 * Whether a group shows per-person completion — the check, the dim, the
 * unfinished-first ordering, and nudging — or an aggregate bar instead.
 *
 * Headcount AND type both flip it. Type alone isn't enough because a group can
 * sit below its own ceiling, and headcount alone isn't enough because a church
 * group is not an intimate setting even on a quiet week.
 *
 * Mirrored server-side in apps/server/src/routes/groups.ts, which refuses a
 * nudge on the same terms.
 */
export function showsIndividualStatus(groupType: string, memberCount: number): boolean {
  return isIntimate(memberCount) && isIntimate(maxMembersFor(groupType));
}

// Mirror of apps/server/src/lib/group-types.ts — keep the two in sync.
const CALENDAR_PACED: ReadonlySet<string> = new Set([
  "medium-group",
  "large-group",
  "community",
]);

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
