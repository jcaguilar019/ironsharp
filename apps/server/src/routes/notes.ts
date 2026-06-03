import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { passageNotes } from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";

export const notes = new Hono<AppEnv>();

notes.use("*", requireAuth);

// GET /api/notes/:book/:chapter  — e.g. /api/notes/Proverbs/27
notes.get("/:book/:chapter", async (c) => {
  const book = decodeURIComponent(c.req.param("book"));
  const chapter = Number(c.req.param("chapter"));
  if (isNaN(chapter)) return c.json({ passageNotes: null });

  const [row] = await db
    .select()
    .from(passageNotes)
    .where(and(eq(passageNotes.book, book), eq(passageNotes.chapter, chapter)))
    .limit(1);

  return c.json({ passageNotes: row ?? null });
});
