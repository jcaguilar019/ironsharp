import { test } from "node:test";
import assert from "node:assert/strict";
import { pacingFor, isCalendarPaced } from "./group-pacing.js";

test("pacingFor: the big two run on the calendar", () => {
  assert.equal(pacingFor("large-group"), "calendar");
  assert.equal(pacingFor("community"), "calendar");
});

test("pacingFor: the small types wait for everyone", () => {
  assert.equal(pacingFor("one-on-one"), "convoy");
  assert.equal(pacingFor("family"), "convoy");
  assert.equal(pacingFor("small-group"), "convoy");
});

test("pacingFor: an unknown type falls back to convoy", () => {
  // Skipping the all-members gate is the destructive direction — a type we
  // don't recognize must not silently start dropping days.
  assert.equal(pacingFor("house-church"), "convoy");
  assert.equal(pacingFor(""), "convoy");
});

test("isCalendarPaced mirrors pacingFor", () => {
  assert.equal(isCalendarPaced("community"), true);
  assert.equal(isCalendarPaced("family"), false);
});
