/**
 * Derive a short "book of the Bible" summary for a devotional plan from its
 * daily passage references (e.g. "Matthew 6:5–13", "1 John 1:8–10").
 *
 *   1 book   → "Romans"
 *   2 books  → "Ruth and Romans"
 *   3+ books → "Ruth and various books in the Bible"  (most-referenced book first)
 */

/** Extract the book name from a passage reference, stripping chapter:verse. */
export function parseBook(ref: string): string {
  const trimmed = ref.trim();
  // Capture an optional leading number (1/2/3 John, etc.) + book name, up to the
  // first chapter number.
  const m = trimmed.match(/^((?:[1-3]\s)?[A-Za-z][A-Za-z' ]*?)\s+\d/);
  return (m?.[1] ?? trimmed).trim();
}

/**
 * How many days a plan spends in each book, most days first.
 *
 * summarizeBooks() collapses 3+ books to "<top> and various books in the
 * Bible", which loses every book but one — a plan with eight days in Romans
 * behind a Matthew lead becomes unfindable by "Romans". This keeps the tally so
 * search can both MATCH on any book and RANK by how much of the plan it is.
 */
export function bookCounts(refs: string[]): { book: string; days: number }[] {
  const counts = new Map<string, number>();
  for (const ref of refs) {
    const book = parseBook(ref);
    if (!book) continue;
    counts.set(book, (counts.get(book) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([book, days]) => ({ book, days }))
    .sort((a, b) => b.days - a.days);
}

export function summarizeBooks(refs: string[]): string {
  const books = refs.map(parseBook).filter(Boolean);
  if (books.length === 0) return "";

  const counts = new Map<string, number>();
  const order: string[] = [];
  for (const b of books) {
    if (!counts.has(b)) order.push(b);
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }

  if (order.length === 1) return order[0]!;
  if (order.length === 2) return `${order[0]} and ${order[1]}`;

  // 3+ distinct books: lead with the most-referenced (ties broken by first appearance).
  let top = order[0]!;
  for (const b of order) {
    if ((counts.get(b) ?? 0) > (counts.get(top) ?? 0)) top = b;
  }
  return `${top} and various books in the Bible`;
}
