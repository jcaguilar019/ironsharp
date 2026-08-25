import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pacingFor,
  isCalendarPaced,
  promotionFor,
  maxMembersFor,
  isIntimate,
} from "./group-types.js";

test("pacingFor: everything past a small group runs on the calendar", () => {
  assert.equal(pacingFor("medium-group"), "calendar");
  assert.equal(pacingFor("large-group"), "calendar");
  assert.equal(pacingFor("community"), "calendar");
});

test("pacingFor: the two smallest types wait for everyone", () => {
  assert.equal(pacingFor("one-on-one"), "convoy");
  assert.equal(pacingFor("small-group"), "convoy");
});

test("pacingFor: an unknown type falls back to convoy", () => {
  // Skipping the all-members gate is the destructive direction — a type we
  // don't recognize must not silently start dropping days. "family" is retired
  // and stands in here for any row that predates the ladder.
  assert.equal(pacingFor("house-church"), "convoy");
  assert.equal(pacingFor("family"), "convoy");
  assert.equal(pacingFor(""), "convoy");
});

test("isCalendarPaced mirrors pacingFor", () => {
  assert.equal(isCalendarPaced("community"), true);
  assert.equal(isCalendarPaced("small-group"), false);
});

test("maxMembersFor: the ladder's rungs, and no cap on a type we don't know", () => {
  assert.equal(maxMembersFor("one-on-one"), 2);
  assert.equal(maxMembersFor("small-group"), 5);
  assert.equal(maxMembersFor("medium-group"), 10);
  assert.equal(maxMembersFor("large-group"), 30);
  assert.equal(maxMembersFor("community"), Infinity);
  assert.equal(maxMembersFor("family"), Infinity);
});

test("promotionFor: a group climbs as it grows", () => {
  assert.deepEqual(promotionFor("small-group", 5, false), { kind: "none" });
  assert.deepEqual(promotionFor("small-group", 6, false), { kind: "promote", to: "medium-group" });
  assert.deepEqual(promotionFor("medium-group", 11, false), { kind: "promote", to: "large-group" });
});

test("promotionFor: a jump of several rungs lands on the right one", () => {
  // Adding people in bulk shouldn't leave a 20-person group labelled Medium.
  assert.deepEqual(promotionFor("small-group", 20, false), { kind: "promote", to: "large-group" });
});

test("promotionFor: a group never slides back down", () => {
  // Someone leaving must not flip pacing and re-expose per-person progress.
  assert.deepEqual(promotionFor("large-group", 3, false), { kind: "none" });
  assert.deepEqual(promotionFor("medium-group", 1, false), { kind: "none" });
});

test("promotionFor: a one-on-one turns away a third person rather than growing", () => {
  // Promoting it would silently kill the discipleship tools mid-relationship.
  const r = promotionFor("one-on-one", 3, false);
  assert.equal(r.kind, "blocked");
  assert.deepEqual(promotionFor("one-on-one", 2, false), { kind: "none" });
});

test("promotionFor: crossing 30 needs staff, and staff can cross it", () => {
  const blocked = promotionFor("large-group", 31, false);
  assert.equal(blocked.kind, "blocked");
  assert.deepEqual(promotionFor("large-group", 31, true), { kind: "promote", to: "community" });
  // Already a church group — nothing left to authorize.
  assert.deepEqual(promotionFor("community", 500, false), { kind: "none" });
});

test("isIntimate: the by-name line sits at ten", () => {
  assert.equal(isIntimate(10), true);
  assert.equal(isIntimate(11), false);
});
