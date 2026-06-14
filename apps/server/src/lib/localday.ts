import type { Context } from "hono";

/**
 * "Today" must mean the *user's* calendar day, not the server's UTC day.
 *
 * The mobile client sends an `x-timezone-offset` header carrying
 * `new Date().getTimezoneOffset()` — the minutes local time is BEHIND UTC
 * (US-Eastern EDT = 240, US-Pacific PDT = 420). Without it, a UTC day boundary
 * rolls over at ~5–8pm local, so an afternoon reading reads back as "yesterday"
 * all evening — which is why "done today" / group checkmarks / streaks kept
 * flickering for real users. Everything that asks "did this happen today?"
 * should derive its day from this header rather than `toISOString()` on a bare
 * `new Date()`.
 */

/** The user's local calendar date ("YYYY-MM-DD") for a UTC offset in minutes. */
export function localDateString(offsetMinutes: number): string {
  const offset = Number.isFinite(offsetMinutes) ? offsetMinutes : 0;
  // Shift the instant by the offset so its UTC calendar fields read as local.
  return new Date(Date.now() - offset * 60_000).toISOString().slice(0, 10);
}

/** Half-open [start, end) UTC window spanning the user's local day. */
export function localDayWindow(offsetMinutes: number): { start: Date; end: Date } {
  const offset = Number.isFinite(offsetMinutes) ? offsetMinutes : 0;
  const localDate = localDateString(offset);
  // Local midnight expressed back in UTC = UTC-midnight-of(localDate) + offset.
  const startMs = new Date(localDate + "T00:00:00.000Z").getTime() + offset * 60_000;
  return { start: new Date(startMs), end: new Date(startMs + 86_400_000) };
}

function offsetFromHeader(c: Context): number {
  const raw = c.req.header("x-timezone-offset");
  const parsed = raw == null ? NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Local-day window derived from the request's `x-timezone-offset` header (UTC fallback). */
export function clientDayWindow(c: Context): { start: Date; end: Date } {
  return localDayWindow(offsetFromHeader(c));
}

/** The requester's local calendar date ("YYYY-MM-DD") from the header (UTC fallback). */
export function clientDateString(c: Context): string {
  return localDateString(offsetFromHeader(c));
}
