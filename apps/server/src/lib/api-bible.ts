// ── api.bible integration ────────────────────────────────────────────────────
// Live passage fetcher used as a fallback when a chapter isn't in our local
// `bibleChapters` table. The local DB covers KJV + BBE; api.bible currently
// backs WEB (and can transparently cover any other missing chapter).
//
// Docs: https://docs.api.bible — GET /v1/bibles/{bibleId}/chapters/{chapterId}
// The API key is server-side only (never shipped in the mobile bundle).

const BASE_URL = process.env.BIBLE_API_BASE_URL ?? "https://rest.api.bible";
const API_KEY = process.env.BIBLE_API_KEY;

// Our translation id → api.bible Bible id. BBE is DB-only (no api.bible id), so
// it's intentionally absent and will simply 404 if ever missing from the DB.
const BIBLE_IDS: Record<string, string> = {
  KJV: "de4e12af7f28f599-02",
  WEB: "9879dbb7cfe39e4d-04",
  NLT: "d6e14a625393b4da-01",
  NKJV: "63097d2a0a2f7db3-01",
};

// Books in canonical order — index drives `bookOrder`, position drives testament.
const BOOK_NAMES = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
  "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
  "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
  "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
  "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts",
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy",
  "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
  "1 Peter", "2 Peter", "1 John", "2 John", "3 John",
  "Jude", "Revelation",
];

const OT_COUNT = 39;

// Full book name → USFM 3-letter code used in chapterId (e.g. "John" → "JHN.3").
const USFM_CODES: Record<string, string> = {
  Genesis: "GEN", Exodus: "EXO", Leviticus: "LEV", Numbers: "NUM", Deuteronomy: "DEU",
  Joshua: "JOS", Judges: "JDG", Ruth: "RUT", "1 Samuel": "1SA", "2 Samuel": "2SA",
  "1 Kings": "1KI", "2 Kings": "2KI", "1 Chronicles": "1CH", "2 Chronicles": "2CH", Ezra: "EZR",
  Nehemiah: "NEH", Esther: "EST", Job: "JOB", Psalms: "PSA", Proverbs: "PRO",
  Ecclesiastes: "ECC", "Song of Solomon": "SNG", Isaiah: "ISA", Jeremiah: "JER", Lamentations: "LAM",
  Ezekiel: "EZK", Daniel: "DAN", Hosea: "HOS", Joel: "JOL", Amos: "AMO",
  Obadiah: "OBA", Jonah: "JON", Micah: "MIC", Nahum: "NAM", Habakkuk: "HAB",
  Zephaniah: "ZEP", Haggai: "HAG", Zechariah: "ZEC", Malachi: "MAL",
  Matthew: "MAT", Mark: "MRK", Luke: "LUK", John: "JHN", Acts: "ACT",
  Romans: "ROM", "1 Corinthians": "1CO", "2 Corinthians": "2CO", Galatians: "GAL", Ephesians: "EPH",
  Philippians: "PHP", Colossians: "COL", "1 Thessalonians": "1TH", "2 Thessalonians": "2TH", "1 Timothy": "1TI",
  "2 Timothy": "2TI", Titus: "TIT", Philemon: "PHM", Hebrews: "HEB", James: "JAS",
  "1 Peter": "1PE", "2 Peter": "2PE", "1 John": "1JN", "2 John": "2JN", "3 John": "3JN",
  Jude: "JUD", Revelation: "REV",
};

export type ApiBibleChapter = {
  id: string;
  translation: string;
  book: string;
  testament: string;
  bookOrder: number;
  chapter: number;
  verses: string[];
};

/** Split api.bible's verse-numbered plain text ("[1] ... [2] ...") into an
 *  array indexed so verse n lands at verses[n-1] — matching our DB shape. */
function parseVerses(content: string): string[] {
  const verses: string[] = [];
  const re = /\[(\d+)\]\s*([\s\S]*?)(?=\s*\[\d+\]|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const num = Number(m[1]);
    const text = m[2]!.replace(/\s+/g, " ").trim();
    if (text) verses[num - 1] = text;
  }
  return verses;
}

/**
 * Fetch a chapter from api.bible. Returns null when the translation isn't
 * backed by api.bible, the book is unknown, or the key isn't configured.
 * Throws on network/HTTP failure so the caller can surface a connection error.
 */
export async function fetchChapterFromApiBible(
  book: string,
  chapter: number,
  translation: string
): Promise<ApiBibleChapter | null> {
  const bibleId = BIBLE_IDS[translation];
  const code = USFM_CODES[book];
  if (!API_KEY || !bibleId || !code) return null;

  const chapterId = `${code}.${chapter}`;
  const url = `${BASE_URL}/v1/bibles/${bibleId}/chapters/${chapterId}?content-type=text&include-verse-numbers=true&include-notes=false&include-titles=false&include-chapter-numbers=false`;

  const res = await fetch(url, { headers: { "api-key": API_KEY } });
  if (res.status === 404) return null; // chapter genuinely doesn't exist
  if (!res.ok) {
    throw new Error(`api.bible returned ${res.status} for ${chapterId}`);
  }

  const body = (await res.json()) as { data?: { content?: string } };
  const verses = parseVerses(body.data?.content ?? "");
  if (verses.length === 0) return null;

  const order = BOOK_NAMES.indexOf(book);
  return {
    id: `apibible-${bibleId}-${chapterId}`,
    translation,
    book,
    testament: order >= 0 && order < OT_COUNT ? "OT" : "NT",
    bookOrder: order >= 0 ? order + 1 : 0,
    chapter,
    verses,
  };
}
