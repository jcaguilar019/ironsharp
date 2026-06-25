import { Hono } from "hono";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { bibleChapters } from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";
import { fetchChapterFromApiBible } from "../lib/api-bible.js";

export const bible = new Hono<AppEnv>();

bible.use("*", requireAuth);

// GET /api/bible/books?translation=KJV
bible.get("/books", async (c) => {
  const translation = c.req.query("translation") ?? "KJV";
  const rows = await db
    .select({
      book: bibleChapters.book,
      testament: bibleChapters.testament,
      bookOrder: bibleChapters.bookOrder,
    })
    .from(bibleChapters)
    .where(eq(bibleChapters.translation, translation))
    .orderBy(asc(bibleChapters.bookOrder), asc(bibleChapters.chapter));

  // Dedupe — one entry per book with chapter count
  const seen = new Map<string, { book: string; testament: string; bookOrder: number; chapters: number }>();
  for (const row of rows) {
    const existing = seen.get(row.book);
    if (existing) {
      existing.chapters++;
    } else {
      seen.set(row.book, { book: row.book, testament: row.testament, bookOrder: row.bookOrder, chapters: 1 });
    }
  }

  return c.json({ books: Array.from(seen.values()) });
});

// GET /api/bible/:book/:chapter?translation=KJV
bible.get("/:book/:chapter", async (c) => {
  const book = decodeURIComponent(c.req.param("book"));
  const chapter = Number(c.req.param("chapter"));
  const translation = c.req.query("translation") ?? "KJV";

  if (isNaN(chapter)) return c.json({ chapter: null }, 400);

  const [row] = await db
    .select()
    .from(bibleChapters)
    .where(
      and(
        eq(bibleChapters.translation, translation),
        eq(bibleChapters.book, book),
        eq(bibleChapters.chapter, chapter)
      )
    )
    .limit(1);

  if (row) return c.json({ chapter: row });

  // Not in our local DB (e.g. WEB) — fall back to a live api.bible fetch.
  try {
    const live = await fetchChapterFromApiBible(book, chapter, translation);
    if (live) return c.json({ chapter: live });
    return c.json({ chapter: null }, 404);
  } catch (err) {
    console.error("api.bible fetch failed:", err);
    // 502 → the mobile client surfaces a connection error to the reader.
    return c.json({ chapter: null }, 502);
  }
});
