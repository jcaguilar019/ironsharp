import type { MembershipTier } from "./tiers.js";

/**
 * The tier the user effectively has right now. A paid membership whose
 * `membershipExpiresAt` has passed counts as Free — expiry is the (passive)
 * downgrade trigger.
 */
export function effectiveTier(p: {
  membershipTier: string;
  membershipExpiresAt: Date | null;
}): MembershipTier {
  if (p.membershipExpiresAt && p.membershipExpiresAt.getTime() < Date.now()) {
    return "free";
  }
  return p.membershipTier as MembershipTier;
}

/** Discipler tools are a Sharpen-and-above perk. */
export function isDisciplerTier(tier: MembershipTier): boolean {
  return tier === "sharpen" || tier === "family";
}

/**
 * When the user last dropped below Sharpen, or null if they still have discipler
 * access. Expiry uses `membershipExpiresAt`; an explicit tier change uses
 * `membershipTierChangedAt`. Anchors the discipleship grace window.
 */
export function disciplerAccessLostAt(p: {
  membershipTier: string;
  membershipExpiresAt: Date | null;
  membershipTierChangedAt: Date | null;
}): Date | null {
  if (isDisciplerTier(effectiveTier(p))) return null;
  if (p.membershipExpiresAt && p.membershipExpiresAt.getTime() < Date.now()) {
    return p.membershipExpiresAt;
  }
  return p.membershipTierChangedAt ?? null;
}
