import { CATEGORIES } from "./categories";
import type { DevotionalPlan } from "./api";

/**
 * Matching rules for the plan library search.
 *
 * Kept deliberately literal — a hand-written word list, no scoring model and no
 * network call, so a search always returns the same results instantly and it is
 * obvious from this file WHY something matched.
 */

/**
 * Everyday words people actually type, mapped to the shelf they mean. Without
 * these, "mom" finds nothing: the category is titled "Wives & Mothers" and no
 * plain substring of it is "mom".
 *
 * A word may appear under several categories — "husband" belongs to both the
 * Husbands & Fathers shelf and Marriage, and should surface both.
 */
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  mothers: ["mom", "mommy", "mama", "mum", "mother", "motherhood", "wife", "wives"],
  fathers: ["dad", "daddy", "papa", "pops", "father", "fatherhood", "husband"],
  marriage: ["wife", "husband", "spouse", "married", "wedding", "couple"],
  family: ["kid", "children", "child", "parenting", "parent", "home", "household"],
  youth: ["teen", "teenager", "student", "young", "college"],
  "new-believer": ["new christian", "beginner", "starting out", "saved", "baptism", "first steps"],
  mens: ["man", "men", "guy", "brother", "manhood"],
  women: ["woman", "lady", "ladies", "sister", "womanhood"],
};

/** Category id → its id, title and subtitle as one searchable string. */
const CATEGORY_TEXT: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, `${c.id} ${c.title} ${c.subtitle}`.replace(/-/g, " ").toLowerCase()])
);

/**
 * Drop a trailing plural so "mothers" still finds text reading "mother".
 * Only ever applied to the typed query, never to the plan text — stemming the
 * corpus risks mangling book names ("James", "Acts") into false matches.
 */
function singular(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("es")) return word.slice(0, -2);
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Does some WORD in `text` start with the query (plural-tolerant)?
 *
 * Anchored to word starts rather than a bare substring test, which was letting
 * "men" match "women" — and rank the Women's shelf above the Men's one. Still a
 * prefix match, so "roman" finds "Romans" and "john" finds "1 John".
 */
function contains(text: string, query: string): boolean {
  return [query, singular(query)].some(
    (w) => !!w && new RegExp(`\\b${escapeRegExp(w)}`).test(text)
  );
}

/** Categories the query implies, via the synonym list above. */
function synonymCategories(query: string): Set<string> {
  const hits = new Set<string>();
  const q = singular(query);
  for (const [categoryId, words] of Object.entries(CATEGORY_SYNONYMS)) {
    // Whole words only. Matching loosely in both directions made "women"
    // contain "men", putting every Men's plan in a Women's search. Variants
    // that aren't plurals ("dad"/"daddy") are listed out individually instead.
    const hit = words.some((w) =>
      w.includes(" ") ? query.includes(w) : singular(w) === q
    );
    if (hit) hits.add(categoryId);
  }
  return hits;
}

// Tiers, strongest first. A plan that spends real days in the book you asked
// for should always outrank one that merely mentions the word in its blurb.
const BOOK_BASE = 100; // + share of the plan, so 100–200
const TITLE = 80;
const CATEGORY = 60;
const TEXT = 40;

/**
 * How well a plan answers a search, or null when it doesn't match at all.
 *
 * A book match scores by SHARE of the plan, so searching "Romans" puts an
 * all-Romans plan above one that only passes through it.
 */
export function scorePlan(plan: DevotionalPlan, rawQuery: string): number | null {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return null;

  const books = plan.books ?? [];
  const totalDays = books.reduce((n, b) => n + b.days, 0);
  const matchedDays = books
    .filter((b) => contains(b.book.toLowerCase(), query))
    .reduce((n, b) => n + b.days, 0);
  if (totalDays > 0 && matchedDays > 0) return BOOK_BASE + (matchedDays / totalDays) * 100;

  if (contains(plan.title.toLowerCase(), query)) return TITLE;

  const categoryText = CATEGORY_TEXT[plan.category] ?? plan.category.replace(/-/g, " ");
  if (contains(categoryText, query) || synonymCategories(query).has(plan.category)) return CATEGORY;

  const rest = `${plan.description ?? ""} ${plan.bookSummary ?? ""}`.toLowerCase();
  return contains(rest, query) ? TEXT : null;
}

/** Plans matching the query, best first; ties fall back to title order. */
export function searchPlans(plans: DevotionalPlan[], rawQuery: string): DevotionalPlan[] {
  return plans
    .map((plan) => ({ plan, score: scorePlan(plan, rawQuery) }))
    .filter((r): r is { plan: DevotionalPlan; score: number } => r.score !== null)
    .sort((a, b) => b.score - a.score || a.plan.title.localeCompare(b.plan.title))
    .map((r) => r.plan);
}
