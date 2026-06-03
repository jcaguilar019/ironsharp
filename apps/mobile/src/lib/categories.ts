const BASE = "https://images.unsplash.com";
const Q = "?auto=format&fit=crop&w=800&q=80";

export type Category = {
  id: string;
  title: string;
  subtitle: string;
  tint: string;
  imageUrl: string;
};

export const CATEGORIES: Category[] = [
  { id: "mens",         title: "Men's Devotional",   subtitle: "Identity & integrity",    tint: "#5C4A3A", imageUrl: `${BASE}/photo-1457139621581-298d1801c832${Q}` },
  { id: "women",        title: "Women's Devotional",  subtitle: "Faith & strength",        tint: "#7A5C6E", imageUrl: `${BASE}/photo-1554355792-f1e604a9c3d1${Q}` },
  { id: "fathers",      title: "Husbands & Fathers",  subtitle: "Lead your home",          tint: "#3A4A5C", imageUrl: `${BASE}/photo-1560328055-e938bb2ed50a${Q}` },
  { id: "mothers",      title: "Wives & Mothers",     subtitle: "Grace for the day",       tint: "#6E5C7A", imageUrl: `${BASE}/photo-1576696058573-12b47c49559e${Q}` },
  { id: "family",       title: "Family Devotional",   subtitle: "Together in the Word",    tint: "#4A6E5C", imageUrl: `${BASE}/photo-1497621122273-f5cfb6065c56${Q}` },
  { id: "marriage",     title: "Marriage",            subtitle: "Two becoming one",        tint: "#7A4A4A", imageUrl: `${BASE}/photo-1489094889106-39069373d6ef${Q}` },
  { id: "youth",        title: "Youth",               subtitle: "Built for the next gen",  tint: "#4A5C7A", imageUrl: `${BASE}/photo-1632961965821-999763254f10${Q}` },
  { id: "new-believer", title: "New Believer",        subtitle: "Start the journey",       tint: "#5C6E4A", imageUrl: `${BASE}/photo-1470252649378-9c29740c9fa8${Q}` },
  { id: "general",      title: "General",             subtitle: "For every season",        tint: "#4A4A5C", imageUrl: `${BASE}/photo-1509021436665-8f07dbf5bf1d${Q}` },
];

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.title])
);

export function categoryLabel(id: string): string {
  return CATEGORY_LABELS[id] ?? id;
}
