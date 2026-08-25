/**
 * The group ladder — one source of truth for what each group type means.
 *
 * Type used to be a free-form label chosen at creation while headcount was
 * governed entirely by membership tier, so a "small group" could hold twelve
 * people. Type now *means* size, and a group climbs the ladder as it grows.
 *
 * Mirrored in apps/mobile/src/lib/groupTypes.ts — keep the two in sync.
 */

export const GROUP_TYPES = [
  "one-on-one",
  "small-group",
  "medium-group",
  "large-group",
  "community",
] as const;

export type GroupType = (typeof GROUP_TYPES)[number];

/**
 * Smallest first — a growing group climbs this. `max` is inclusive.
 *
 * one-on-one sits outside the climb on purpose (see promotionFor): it is a
 * relationship, not a size bucket, and the discipleship tools key off it.
 */
export const GROUP_LADDER: readonly { type: GroupType; max: number }[] = [
  { type: "one-on-one", max: 2 },
  { type: "small-group", max: 5 },
  { type: "medium-group", max: 10 },
  { type: "large-group", max: 30 },
  { type: "community", max: Infinity },
];

const MAX_BY_TYPE = new Map<string, number>(GROUP_LADDER.map((r) => [r.type, r.max]));

/** Inclusive member cap for a type. Unknown types are uncapped, never wrongly capped. */
export function maxMembersFor(groupType: string): number {
  return MAX_BY_TYPE.get(groupType) ?? Infinity;
}

/**
 * Types only church staff may create or grow into. A group over 30 is a
 * congregation-scale thing; it shouldn't appear because someone's small group
 * got popular.
 */
export const RESTRICTED_TYPES: ReadonlySet<string> = new Set(["community"]);

/** The last headcount an ordinary member can grow a group to unaided. */
export const OPEN_GROUP_MAX = 30;

/**
 * Above this headcount a group stops being a room where everyone knows everyone.
 * It is the single line behind per-person progress, nudging, the "partner
 * finished" ping, and the "group complete" moment — one number so those four
 * never drift apart.
 */
export const INTIMATE_MAX = 10;

/** Whether a group of this size is still small enough for by-name features. */
export function isIntimate(memberCount: number): boolean {
  return memberCount <= INTIMATE_MAX;
}

export type Promotion =
  | { kind: "none" }
  | { kind: "promote"; to: GroupType }
  | { kind: "blocked"; reason: string };

/**
 * What should happen to a group's type when it reaches `newSize` members.
 *
 * Groups climb but never descend: a Medium Group that drops back to four stays
 * a Medium Group. Sliding back down would flip its pacing and re-expose
 * per-person progress at the exact moment someone left, which reads as the app
 * commenting on their departure.
 *
 * @param isStaff whether the person driving the change may create church-scale
 *   groups — crossing 30 is theirs to authorize, not something a group falls into.
 */
export function promotionFor(
  currentType: string,
  newSize: number,
  isStaff: boolean
): Promotion {
  // A one-on-one is two people by definition. Promoting it out would silently
  // switch off the discipleship tools for a live discipling relationship, so a
  // third person is turned away instead.
  if (currentType === "one-on-one" && newSize > 2) {
    return {
      kind: "blocked",
      reason: "A one-on-one is just the two of you. Start a small group to read with more people.",
    };
  }

  if (newSize <= maxMembersFor(currentType)) return { kind: "none" };

  const next = GROUP_LADDER.find((r) => newSize <= r.max);
  if (!next) return { kind: "none" };

  if (RESTRICTED_TYPES.has(next.type) && !isStaff) {
    return {
      kind: "blocked",
      reason: `A group over ${OPEN_GROUP_MAX} people has to be set up by church staff. Ask a leader to start a church group.`,
    };
  }

  return { kind: "promote", to: next.type };
}

// ─── Pacing ───────────────────────────────────────────────────────────────────

/**
 * How a group's shared plan day moves forward.
 *
 * `convoy` — the day advances once every member has finished it. Waiting for the
 * last person is the point, and in a room this small it's a reachable moment.
 *
 * `calendar` — the day advances once per local day, no matter who finished. Past
 * five people someone is always lagging, so an all-members gate leaves the group
 * permanently a day behind while never delivering the shared moment anyway.
 */
export type GroupPacing = "convoy" | "calendar";

const CALENDAR_PACED: ReadonlySet<string> = new Set([
  "medium-group",
  "large-group",
  "community",
]);

/** Unknown types fall back to convoy — never skip the gate on a guess. */
export function pacingFor(groupType: string): GroupPacing {
  return CALENDAR_PACED.has(groupType) ? "calendar" : "convoy";
}

export function isCalendarPaced(groupType: string): boolean {
  return pacingFor(groupType) === "calendar";
}
