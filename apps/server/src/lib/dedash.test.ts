import { test } from "node:test";
import assert from "node:assert/strict";
import { deDash } from "./dedash.js";

// The em dash is the plan generator's "AI tell"; the app's voice bans it. deDash
// is the guarantee for any the model leaks past the prompt. These lock in that it
// swaps dashes for grammatical punctuation WITHOUT mangling the two things that
// are legitimately not em dashes: hyphenated words and numeric ranges.

test("swaps a spaced em dash for a comma pause", () => {
  assert.equal(deDash("He was proud — and it cost him."), "He was proud, and it cost him.");
});

test("swaps a tight (unspaced) em dash", () => {
  assert.equal(deDash("God is near—closer than you think."), "God is near, closer than you think.");
});

test("handles a parenthetical pair of em dashes", () => {
  assert.equal(deDash("grace — undeserved — still comes."), "grace, undeserved, still comes.");
});

test("swaps the '--' surrogate", () => {
  assert.equal(deDash("one thing -- pride"), "one thing, pride");
});

test("swaps a spaced en dash used as prose", () => {
  assert.equal(deDash("grace – undeserved – comes"), "grace, undeserved, comes");
});

test("leaves single hyphens in compound words alone", () => {
  assert.equal(deDash("self-worth and self-forgetfulness"), "self-worth and self-forgetfulness");
});

test("leaves numeric en-dash ranges alone (no surrounding spaces)", () => {
  assert.equal(deDash("Read Psalm 1–3 today"), "Read Psalm 1–3 today");
  assert.equal(deDash("v2–4"), "v2–4");
});

test("drops a dash that opens or closes the string", () => {
  assert.equal(deDash("Wait for it —"), "Wait for it");
  assert.equal(deDash("— Listen closely"), "Listen closely");
});

test("does not leave a space before terminal punctuation", () => {
  assert.equal(deDash("He paused —."), "He paused.");
});

test("leaves a colon-joined study note untouched", () => {
  const note = "God opposes the proud: name where pride still runs your decisions.";
  assert.equal(deDash(note), note);
});

test("is idempotent", () => {
  const once = deDash("He was proud — and it cost him — daily.");
  assert.equal(deDash(once), once);
});
