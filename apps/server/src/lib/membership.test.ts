import { test } from "node:test";
import assert from "node:assert/strict";
import { effectiveTier, isDisciplerTier, disciplerAccessLostAt } from "./membership.js";

const future = new Date(Date.now() + 86_400_000);
const past = new Date(Date.now() - 86_400_000);

test("effectiveTier: expiry passively downgrades to free", () => {
  assert.equal(effectiveTier({ membershipTier: "sharpen", membershipExpiresAt: null }), "sharpen");
  assert.equal(effectiveTier({ membershipTier: "sharpen", membershipExpiresAt: future }), "sharpen");
  assert.equal(effectiveTier({ membershipTier: "sharpen", membershipExpiresAt: past }), "free");
});

test("isDisciplerTier: sharpen and family only", () => {
  assert.equal(isDisciplerTier("sharpen"), true);
  assert.equal(isDisciplerTier("family"), true);
  assert.equal(isDisciplerTier("connect"), false);
  assert.equal(isDisciplerTier("free"), false);
});

test("disciplerAccessLostAt anchors the grace window", () => {
  // Still a discipler → no loss.
  assert.equal(
    disciplerAccessLostAt({ membershipTier: "family", membershipExpiresAt: null, membershipTierChangedAt: past }),
    null
  );
  // Expired paid tier → lost at expiry.
  assert.equal(
    disciplerAccessLostAt({ membershipTier: "sharpen", membershipExpiresAt: past, membershipTierChangedAt: null })?.getTime(),
    past.getTime()
  );
  // Explicit downgrade → lost at the tier change.
  assert.equal(
    disciplerAccessLostAt({ membershipTier: "connect", membershipExpiresAt: null, membershipTierChangedAt: past })?.getTime(),
    past.getTime()
  );
  // Downgraded with no timestamps → unknown, treated as no grace.
  assert.equal(
    disciplerAccessLostAt({ membershipTier: "free", membershipExpiresAt: null, membershipTierChangedAt: null }),
    null
  );
});
