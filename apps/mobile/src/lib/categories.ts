// Fixed set of plan categories shown on the Plans grid. Counts are overlaid at
// runtime from the API; empty categories show a "coming soon" message on tap.
export type Category = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  // Background tint (HSL) for the tile, kept independent of the active theme so
  // categories stay visually distinct — mirrors the original cover images.
  tint: string;
};

export const CATEGORIES: Category[] = [
  { id: "mens", title: "Men's Devotional", subtitle: "Identity & integrity", badge: "Popular", tint: "#5C4A3A" },
  { id: "women", title: "Women's Devotional", subtitle: "Faith & strength", badge: "7–30 Day", tint: "#7A5C6E" },
  { id: "fathers", title: "Husbands & Fathers", subtitle: "Lead your home", badge: "14 Day", tint: "#3A4A5C" },
  { id: "mothers", title: "Wives & Mothers", subtitle: "Grace for the day", badge: "14 Day", tint: "#6E5C7A" },
  { id: "family", title: "Family Devotional", subtitle: "Together in the Word", badge: "Family", tint: "#4A6E5C" },
  { id: "marriage", title: "Marriage", subtitle: "Two becoming one", badge: "7 Day", tint: "#7A4A4A" },
  { id: "youth", title: "Youth", subtitle: "Built for the next gen", badge: "Youth", tint: "#4A5C7A" },
  { id: "new-believer", title: "New Believer", subtitle: "Start the journey", badge: "Starter", tint: "#5C6E4A" },
  { id: "general", title: "General", subtitle: "For every season", badge: "All", tint: "#4A4A5C" },
];

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.title])
);

export function categoryLabel(id: string): string {
  return CATEGORY_LABELS[id] ?? id;
}
