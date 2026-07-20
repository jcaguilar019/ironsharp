/**
 * How a group's shared plan day moves forward. Group TYPE is the dial.
 *
 * `convoy` — the day advances once every member has finished it. The group is
 * small enough that "we all finished" is a reachable moment, and waiting for
 * the last person is the point.
 *
 * `calendar` — the day advances once per local day, no matter who finished. A
 * large group always has someone lagging, so an all-members gate would leave it
 * permanently a day behind while never delivering the shared moment anyway.
 */
export type GroupPacing = "convoy" | "calendar";

// Must stay in sync with GROUP_TYPES in routes/groups.ts.
const CALENDAR_PACED: ReadonlySet<string> = new Set(["large-group", "community"]);

/** Unknown types fall back to convoy — never skip the gate on a guess. */
export function pacingFor(groupType: string): GroupPacing {
  return CALENDAR_PACED.has(groupType) ? "calendar" : "convoy";
}

export function isCalendarPaced(groupType: string): boolean {
  return pacingFor(groupType) === "calendar";
}
