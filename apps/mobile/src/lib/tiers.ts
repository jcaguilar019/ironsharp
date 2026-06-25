export type MembershipTier = "free" | "connect" | "sharpen" | "family";

export interface TierLimits {
  planUnlocksPerMonth: number; // Infinity = unlimited
  aiTokensPerMonth: number;
  commuteMode: boolean;
  maxGroupSize: number;
  sharingCircle: number;
  outsideGroupsMax: number;
  outsideGroupMaxSize: number;
}

export const TIER_LIMITS: Record<MembershipTier, TierLimits> = {
  free: {
    planUnlocksPerMonth: 3,
    aiTokensPerMonth: 0,
    commuteMode: false,
    maxGroupSize: 3,
    sharingCircle: 3,
    outsideGroupsMax: 1,
    outsideGroupMaxSize: Infinity,
  },
  connect: {
    planUnlocksPerMonth: 5,
    aiTokensPerMonth: 1,
    commuteMode: true,
    maxGroupSize: 5,
    sharingCircle: 5,
    outsideGroupsMax: 1,
    outsideGroupMaxSize: 8,
  },
  sharpen: {
    planUnlocksPerMonth: Infinity,
    aiTokensPerMonth: 2,
    commuteMode: true,
    maxGroupSize: Infinity,
    sharingCircle: Infinity,
    outsideGroupsMax: Infinity,
    outsideGroupMaxSize: Infinity,
  },
  family: {
    planUnlocksPerMonth: Infinity,
    aiTokensPerMonth: 2,
    commuteMode: true,
    maxGroupSize: Infinity,
    sharingCircle: Infinity,
    outsideGroupsMax: Infinity,
    outsideGroupMaxSize: Infinity,
  },
};

export const UPGRADE_PATH: Record<MembershipTier, MembershipTier | null> = {
  free: "connect",
  connect: "sharpen",
  sharpen: "family",
  family: null,
};

export interface TierDisplay {
  name: string;
  monthlyPrice: string | null;
  annualPrice: string | null;
  annualTotal: string | null;
  accentColor: string;
  features: string[];
}

export const TIER_DISPLAY: Record<MembershipTier, TierDisplay> = {
  free: {
    name: "Free",
    monthlyPrice: null,
    annualPrice: null,
    annualTotal: null,
    accentColor: "#8A9BB0",
    features: [
      "Browse the full content library",
      "3 plan unlocks per month",
      "Share plans with up to 2 others",
      "Join 1 outside group (host must be paid)",
    ],
  },
  connect: {
    name: "Connect",
    monthlyPrice: "$2.99",
    annualPrice: "$25",
    annualTotal: "$25/yr",
    accentColor: "#89B4C9",
    features: [
      "5 plan unlocks per month",
      "1 AI-generated plan per month",
      "Create groups up to 5 people",
      "Share plans with up to 4 others",
      "Join 1 outside group up to 8 people",
    ],
  },
  sharpen: {
    name: "Sharpen",
    monthlyPrice: "$4.99",
    annualPrice: "$48",
    annualTotal: "$48/yr",
    accentColor: "#C49A78",
    features: [
      "Unlimited plan unlocks",
      "2 AI-generated plans per month",
      "Unlimited groups, any size",
      "Unlimited sharing circle",
      "Discipler tools",
    ],
  },
  family: {
    name: "Family",
    monthlyPrice: "$9.99",
    annualPrice: "$96",
    annualTotal: "$96/yr",
    accentColor: "#7FAF8A",
    features: [
      "Everything in Sharpen",
      "4 accounts: 2 parents + 2 children",
      "Add more children for $1.99/mo",
      "Child accounts with safety controls",
      "High school flag lifts all restrictions",
      "Church leader group approval for kids",
    ],
  },
};

export const TIER_ORDER: MembershipTier[] = ["free", "connect", "sharpen", "family"];

export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function planUnlocksRemaining(
  tier: MembershipTier,
  count: number,
  windowStart: string | null
): number {
  const limit = TIER_LIMITS[tier].planUnlocksPerMonth;
  if (limit === Infinity) return Infinity;
  const now = Date.now();
  const expired = !windowStart || now - new Date(windowStart).getTime() > THIRTY_DAYS_MS;
  return expired ? limit : Math.max(0, limit - count);
}
