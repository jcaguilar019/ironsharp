import { test } from "node:test";
import assert from "node:assert/strict";
import { localDateString, localDayWindow, isYesterday, effectiveStreak } from "./localday.js";

// These helpers guard the bug class that has actually bitten this app: UTC vs
// the user's local calendar day (evening "done today" flicker, frozen streaks).

test("localDateString shifts by the client's UTC offset", () => {
  // 2026-07-01T03:00Z is still June 30 in PDT (offset 420).
  const utc3am = new Date("2026-07-01T03:00:00.000Z").getTime();
  const realNow = Date.now;
  Date.now = () => utc3am;
  try {
    assert.equal(localDateString(0), "2026-07-01");
    assert.equal(localDateString(420), "2026-06-30"); // PDT
    assert.equal(localDateString(-60), "2026-07-01"); // UTC+1
    assert.equal(localDateString(NaN), "2026-07-01"); // bad header → UTC fallback
  } finally {
    Date.now = realNow;
  }
});

test("localDayWindow spans exactly the local day, expressed in UTC", () => {
  const utcNoon = new Date("2026-07-01T12:00:00.000Z").getTime();
  const realNow = Date.now;
  Date.now = () => utcNoon;
  try {
    const { start, end } = localDayWindow(420); // PDT: local day = Jul 1 07:00Z → Jul 2 07:00Z
    assert.equal(start.toISOString(), "2026-07-01T07:00:00.000Z");
    assert.equal(end.getTime() - start.getTime(), 86_400_000);
  } finally {
    Date.now = realNow;
  }
});

test("isYesterday handles month and year boundaries", () => {
  assert.equal(isYesterday("2026-06-30", "2026-07-01"), true);
  assert.equal(isYesterday("2025-12-31", "2026-01-01"), true);
  assert.equal(isYesterday("2026-06-29", "2026-07-01"), false);
  assert.equal(isYesterday("2026-07-01", "2026-07-01"), false);
});

test("effectiveStreak: alive today or yesterday, dead beyond, never negative surprises", () => {
  const today = "2026-07-01";
  assert.equal(effectiveStreak(5, "2026-07-01", today), 5); // counted today
  assert.equal(effectiveStreak(5, "2026-06-30", today), 5); // yesterday — still has today
  assert.equal(effectiveStreak(5, "2026-06-29", today), 0); // lapsed
  assert.equal(effectiveStreak(5, null, today), 0); // never started
  // Future-stamped date (UTC→local crossover) must not zero the streak.
  assert.equal(effectiveStreak(5, "2026-07-02", today), 5);
});
