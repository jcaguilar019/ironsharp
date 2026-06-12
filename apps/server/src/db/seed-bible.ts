import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "./index.js";
import { bibleChapters } from "./schema.js";

const BOOK_NAMES = [
  // Old Testament (39)
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
  "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
  "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
  "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
  "Zephaniah", "Haggai", "Zechariah", "Malachi",
  // New Testament (27)
  "Matthew", "Mark", "Luke", "John", "Acts",
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy",
  "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
  "1 Peter", "2 Peter", "1 John", "2 John", "3 John",
  "Jude", "Revelation",
];

const OT_COUNT = 39;

type RawBook = { abbrev: string; chapters: string[][] };

const TRANSLATIONS = [
  {
    id: "KJV",
    label: "King James Version",
    url: "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json",
  },
  {
    id: "BBE",
    label: "Bible in Basic English",
    url: "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_bbe.json",
  },
];

async function seedTranslation(id: string, label: string, url: string) {
  const [existing] = await db
    .select({ id: bibleChapters.id })
    .from(bibleChapters)
    .where(eq(bibleChapters.translation, id))
    .limit(1);

  if (existing) {
    console.log(`   • ${label} (${id}) already seeded — skipping.`);
    return;
  }

  console.log(`📖 Fetching ${label}…`);
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`   ⚠ Could not fetch ${label} (${res.status}) — skipping.`);
    return;
  }

  const raw = (await res.json()) as RawBook[];
  if (raw.length !== 66) {
    console.warn(`   ⚠ Expected 66 books, got ${raw.length} — skipping.`);
    return;
  }

  console.log("   Inserting chapters…");
  let total = 0;

  for (let bookIdx = 0; bookIdx < 66; bookIdx++) {
    const book = BOOK_NAMES[bookIdx]!;
    const testament = bookIdx < OT_COUNT ? "OT" : "NT";
    const bookOrder = bookIdx + 1;
    const rawBook = raw[bookIdx]!;

    const rows = rawBook.chapters.map((verseArray, chapterIdx) => ({
      translation: id,
      book,
      testament,
      bookOrder,
      chapter: chapterIdx + 1,
      verses: verseArray,
    }));

    for (let i = 0; i < rows.length; i += 50) {
      await db.insert(bibleChapters).values(rows.slice(i, i + 50));
    }

    total += rows.length;
    process.stdout.write(`\r   ${book} (${rows.length} chapters) — ${total} total`);
  }

  console.log(`\n   ✓ ${label} — ${total} chapters across 66 books.`);
}

async function seed() {
  console.log("🌱 Seeding Bible translations…");
  for (const t of TRANSLATIONS) {
    await seedTranslation(t.id, t.label, t.url);
  }
  console.log("✅ Bible seed complete.");
}

seed()
  .catch((err) => {
    console.error("\n❌ Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
