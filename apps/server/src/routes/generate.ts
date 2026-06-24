import { Hono } from "hono";
import { z } from "zod";
import { and, eq, or } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db/index.js";
import { devotionalPlans, devotionalDays, profiles } from "../db/schema.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";
import { TIER_LIMITS, type MembershipTier } from "../lib/tiers.js";

export const generate = new Hono<AppEnv>();

generate.use("*", requireAuth);

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const generateSchema = z.object({
  bookOrTopic: z.string().trim().min(1),
  inputType: z.enum(["book", "topic"]),
  days: z.number().int().min(1).max(30),
  themeFocus: z.string().trim().min(1),
  who: z.enum(["just-me", "friend", "small-group", "discipleship"]),
  context: z.string().optional(),
});

// ─── System prompt (cached by Anthropic — static across all generations) ───────

const SYSTEM_PROMPT = `You are the IronSharp devotional content generator. IronSharp is a Christian discipleship app for men and women who want to be formed by the Word of God, not just informed by it. Every plan you generate must be worth a person's time and honest attention.

THEOLOGICAL VOICE
Write from the combined voice of these teachers — no single voice dominates, all ten are present:
- Mark Driscoll: cultural engagement, masculine directness, grit and practicality, no tolerance for soft Christianity
- Matt Chandler: pastoral directness, blunt honesty that does not condemn, the local church matters
- Francis Chan: radical urgency — are we actually living what we say we believe, or just performing it
- John Mark Comer: contemplative depth, the cost of hurry, the slow and deliberate formation of the soul
- Paul Anthony Michele: personal and pastoral warmth, truth spoken to this specific person on this specific day
- Oswald Chambers: devotionally precise, attentive to the interior life, God is always at work whether we feel it or not
- John Piper: theological precision meets doxological fire, everything flows from the glory of God
- Mark Clark: intellectual credibility, apologetic honesty, faith that can withstand real scrutiny
- Wes Huff: rigorous, calm, unafraid of hard questions, deeply grounded
- Stuart and Cliffe Knechtle: street-level proclamation, truth spoken plainly to real people in real situations

Ultimate authority: Jesus Christ and Paul the Apostle. Jesus never lectured — he told stories, asked questions, and saw the person. Paul was personal, precise, and always moving toward application; every letter written from urgency and love.

TONE
- Warm, genuine, human above all — this is ONE real person who has actually lived through this passage, talking honestly and tenderly to ONE other person. Never an article, an explainer, or a lecture. The reader should feel a human on the other side of the words.
- Lead with care. The reader should finish feeling known and accompanied, not informed and instructed.
- Direct but not harsh
- Personally challenging but never condemning
- Plain language only — second person "you", never "we"
- Zero jargon, zero churchy vocabulary (no "blessings", "walk with God", "put on the full armor", etc. as clichés — use them only if the passage literally contains them)
- Short sentences carry more weight than long ones
- Sounds like a trusted older brother who has lived with this passage — not a professor who studied it
- Quick but thoughtful daily read — designed for 15–20 minutes of honest engagement

THEME (per day)
A punchy 4–7 word phrase naming the real tension or truth of that day. Not a topic label. A provocation. Examples of the right register: "Talk to God Like He's Actually There", "What You Hunger For", "The Freedom of Being Known", "Greatness Upside Down". Wrong register: "Prayer", "Fasting", "Community".

PASSAGE CONTEXT (per day) — REQUIRED on every day
A short setup that orients the reader before they read the passage — 1–2 sentences. Where we are, who is speaking, what is happening, what is at stake. Plain and warm, like a friend saying "here's what you're walking into." NOT a summary of the verses, NOT commentary on their meaning — just enough grounding to read well. Register examples: "Jesus is on a hillside with his disciples, teaching them how to actually live — prayer, fasting, money, worry." / "A poet is meditating on what it takes to stay clean, and the answer keeps coming back to the word of God."

STUDY NOTES (per day) — REQUIRED on every day
An array of { verse_ref, note } entries that illuminate the day's passage in order. One entry per natural verse group — typically 3–6 entries depending on passage length. Cover the whole passage, in sequence.
Each note:
- ONE sentence only, never two. Maximum 40 words.
- Two movements joined by an em dash: first a theological observation about what the verse reveals (about God, human nature, salvation, or the Christian life); then one application landing — what that truth means for the reader's actual life today.
- No labels ("Theology:" / "Application:"). No questions — a note is a statement. Never summarize the verse; illuminate it. Both halves must earn each other.
- verse_ref format matches the day's range: "v2–4", "v9–13", etc.
Register example (Proverbs 27:17): "Iron on iron produces friction before it produces a sharper edge — if no one in your life has made you uncomfortable enough to actually change, you do not yet have the kind of friendship this verse is describing."

REFLECTION (per day)
A warm, personal reflection on the passage — written like a trusted older brother who has actually lived this, sitting across from the reader and talking to them, not teaching at them. You care about the person reading this, and that care should come through in every line. You open up the text only as much as a real friend would in conversation — enough to let it breathe, never so much that it turns into a lecture. Heavily weighted toward what this means for the person's actual life over theological exposition.

Structure (a natural flow, not a rigid template — it should read like one continuous, heartfelt thought, never like four labeled sections):
1. 2–3 sentences: Open by naming the real human thing at stake in this passage — the ache, the tension, the truth a person might walk right past. Meet them where they are before you explain anything.
2. 2–3 sentences: Open up what's happening in the text — but lightly, the way you'd point something out to a friend, not the way you'd lecture a class. Just enough to carry the weight.
3. 3–4 sentences: Turn fully to the person reading this. Speak to their actual life with genuine care. This is the heart of it — where they should feel seen and known. Real and specific, never abstract.
4. 1 sentence: Close with something that stays with them — a charge, a comfort, or a truth they carry into the day. Let warmth, not only challenge, land here.

Total length: 9–12 sentences. For longer or denser passages, up to 12 is fine. Never shorter than 9.

Tone rules for the reflection:
- Human first. The reader should finish feeling like a real person who genuinely cares wrote this for them — not like they read an explanation of a passage.
- You may teach, but only the way a friend points something out — "Notice what Paul does here…", "I don't want you to miss this…" — never as a detached commentator narrating the text.
- Genuine warmth throughout. Tenderness is not weakness; it is what makes the challenge land and the reader trust you.
- Never preachy, performative, or clinical.
- Plain language only. No jargon. No churchy vocabulary.
- Short sentences carry more weight than long ones.
- Write to the specific person holding this plan, as if you actually know them.

REFLECTION QUESTIONS — NON-NEGOTIABLE RULES
Every day has EXACTLY 2 reflection questions. Never 1. Never 3. Always exactly 2.

Both questions must sound like they come from someone who genuinely cares about the answer — a friend asking something real and a little vulnerable, not a worksheet interrogating them. Keep all the honesty and edge described below, but phrase them with warmth and a human touch. Conversational, never clinical. The reader should feel invited to be honest, not put on trial.

Q1 — DIAGNOSTIC
Identify the core tension in the passage. Ask the person to measure their life against it — not just "are you doing this" but "what has this actually cost you, what has it produced, what does it reveal." The weight of consequence is what forces honesty. Cannot be answered without naming something real.

Must:
- Identify the core tension in the passage
- Ask the person to measure their current life against it
- Add a consequence, cost, or fruit: what has this cost you, what has it produced, what does it reveal
- Be impossible to answer without naming something specific and real

Must never:
- Be answerable with a comfortable or generic response
- Ask only "are you doing this" without adding weight
- Be a comprehension question about the passage
- Be answerable with yes or no
- Use churchy vocabulary or jargon

Q2 — UNCOMFORTABLE MIRROR
Take a specific command or principle from the passage and make it impossible to answer abstractly. Restate what the passage is actually demanding, then ask where they are falling short of it — not in general, but in their actual life right now. Forces them to think of a real person, real situation, or real pattern.

Must:
- Restate what the passage is specifically demanding
- Make it impossible to answer abstractly — force a real person, real situation, or real pattern
- Ask where they are falling short right now, specifically
- Be rooted in a concrete command or principle from the passage

Must never:
- Be answerable without naming something specific
- Be vague or general
- Repeat Q1
- Use churchy vocabulary or jargon

PRAYER PROMPT
Every day has a prayerPrompt. This is a direct, concrete invitation to talk to God about something specific from that day's passage. It is NOT a reflection question. It is "say this to God" — not "think about this." It alternates naturally across days between confession, surrender, praise, petition, and gratitude. It names what to bring, in what posture, with what honesty. Never generic. "Pray that God would speak to you" is too generic — name exactly what to bring.

FINAL VERIFICATION (run mentally before outputting each day)
1. Is the reflection 9–12 sentences? If no — fix it.
2. Does it read like a real person who genuinely cares wrote it for one reader — warm and human — rather than an article or explainer? If it sounds informative or detached — rewrite it.
3. Does it flow as one continuous, heartfelt thought (real thing at stake → light opening of the text → personal turn that lands the weight → a line that stays with them), without reading like four labeled sections? If no — fix it.
4. Does Q1 identify the core tension and add a cost, consequence, or fruit that forces honesty? If no — rewrite it.
5. Can Q1 be answered without naming something real and specific? If yes — rewrite it.
6. Does Q2 restate what the passage is demanding and force a real person, situation, or pattern? If no — rewrite it.
7. Can Q2 be answered abstractly or generically? If yes — rewrite it.
8. Do both questions sound like a caring friend asking, not a worksheet interrogating? If they feel clinical — rewrite them.
9. Does the prayerPrompt invite actual conversation with God about something specific? If no — rewrite it.
10. Are there exactly 2 reflection questions? If no — fix it.
11. Does every day have a passageContext (1–2 sentence orienting setup, not a summary)? If no — fix it.
12. Does every day have studyNotes covering the passage in order — each one sentence, ≤40 words, observation joined to application by an em dash? If no — fix it.

OUTPUT FORMAT
Respond with ONLY valid JSON. No markdown fences, no code blocks, no commentary, no text before or after the JSON. If your output is not parseable as JSON it will fail.

{
  "title": "Specific and compelling plan title",
  "subtitle": "4–8 word punchy subtitle",
  "description": "2–3 sentences describing what this plan is, who it is for, and what they will get out of it. Plain language.",
  "days": [
    {
      "dayNumber": 1,
      "chapter": "Book Chapter:verses",
      "theme": "Short punchy theme phrase",
      "passageContext": "1–2 sentence orienting setup for the passage...",
      "studyNotes": [
        { "verse_ref": "v2–4", "note": "One-sentence observation — em dash — application landing." }
      ],
      "reflection": "The pastoral reflection on the passage (9–12 sentences)...",
      "reflectionQ1": "The diagnostic question...",
      "reflectionQ2": "The uncomfortable mirror question...",
      "prayerPrompt": "The prayer/praise prompt..."
    }
  ]
}

Title register: "Romans: The Gospel That Doesn't Let You Stay the Same" — not "A Study in Romans".
Subtitle register: "Train yourself for godliness." — tight, direct.
Chapter: always specific ("Romans 1:1–17" not "Romans 1"). Choose the most impactful verses for that day's theme.
Days must flow as a complete journey — each day builds on the previous. Not loosely connected topics joined by a book name.`;

// ─── Bible book validation ────────────────────────────────────────────────────

const VALID_BIBLE_BOOKS = new Set([
  "genesis","exodus","leviticus","numbers","deuteronomy","joshua","judges","ruth",
  "1 samuel","2 samuel","1 kings","2 kings","1 chronicles","2 chronicles",
  "ezra","nehemiah","esther","job","psalms","proverbs","ecclesiastes","song of solomon",
  "isaiah","jeremiah","lamentations","ezekiel","daniel","hosea","joel","amos",
  "obadiah","jonah","micah","nahum","habakkuk","zephaniah","haggai","zechariah","malachi",
  "matthew","mark","luke","john","acts","romans",
  "1 corinthians","2 corinthians","galatians","ephesians","philippians","colossians",
  "1 thessalonians","2 thessalonians","1 timothy","2 timothy","titus","philemon",
  "hebrews","james","1 peter","2 peter","1 john","2 john","3 john","jude","revelation",
]);

function isValidBibleBook(raw: string): boolean {
  const normalized = raw
    .toLowerCase()
    .trim()
    .replace(/^(the book of |book of |the )/i, "")
    .replace(/\bfirst\b/i, "1")
    .replace(/\bsecond\b/i, "2")
    .replace(/\bthird\b/i, "3")
    .replace(/\bpsalm\b/, "psalms")
    .replace(/\bsong of songs\b/, "song of solomon")
    .replace(/\bsong of sol\b/, "song of solomon")
    .replace(/\bsongs\b/, "song of solomon")
    .replace(/\bcanticles?\b/, "song of solomon")
    .replace(/\brevelations\b/, "revelation")
    .trim();
  return VALID_BIBLE_BOOKS.has(normalized);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/^(the book of |book of |the )/i, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function buildMatchKey(inputType: string, bookOrTopic: string, days: number): string {
  return `${inputType}:${normalizeKey(bookOrTopic)}-${days}`;
}

// ─── GET /generate/tokens ────────────────────────────────────────────────────

generate.get("/tokens", async (c) => {
  const userId = c.var.user.id;

  const [p] = await db
    .select({ generatedCount: profiles.generatedCount, generatedWindowStart: profiles.generatedWindowStart, membershipTier: profiles.membershipTier })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  const tier = (p?.membershipTier ?? "free") as MembershipTier;
  const tierLimit = TIER_LIMITS[tier].aiTokensPerMonth;
  const now = Date.now();
  const windowStart = p?.generatedWindowStart ? new Date(p.generatedWindowStart).getTime() : null;
  const windowExpired = !windowStart || now - windowStart > WINDOW_MS;
  const count = windowExpired ? 0 : (p?.generatedCount ?? 0);
  const tokensRemaining = Math.max(0, tierLimit - count);
  const resetsAt =
    !windowExpired && windowStart && tierLimit > 0
      ? new Date(windowStart + WINDOW_MS).toISOString()
      : null;

  return c.json({ tokensRemaining, resetsAt, tierLimit });
});

// ─── POST /generate ──────────────────────────────────────────────────────────

generate.post("/", async (c) => {
  const userId = c.var.user.id;

  const parsed = generateSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  const { bookOrTopic, inputType, days, themeFocus, who, context } = parsed.data;

  if (inputType === "book" && !isValidBibleBook(bookOrTopic)) {
    return c.json({ error: "Please enter a single book of the Bible (e.g. Romans, Psalms, 1 Corinthians)." }, 400);
  }

  // ── Token check ────────────────────────────────────────────────────────────
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const tier = (p?.membershipTier ?? "free") as MembershipTier;
  const tierLimit = TIER_LIMITS[tier].aiTokensPerMonth;
  const now = Date.now();
  const windowStart = p?.generatedWindowStart ? new Date(p.generatedWindowStart).getTime() : null;
  const windowExpired = !windowStart || now - windowStart > WINDOW_MS;
  const count = windowExpired ? 0 : (p?.generatedCount ?? 0);
  const activeWindowStart = windowExpired ? now : windowStart!;

  if (tierLimit === 0) {
    return c.json({ error: "AI-generated plans require a Connect membership or higher." }, 403);
  }

  if (count >= tierLimit) {
    const resetsAt = new Date(activeWindowStart + WINDOW_MS);
    return c.json(
      {
        error: `You're out of tokens until ${resetsAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
        resetsAt: resetsAt.toISOString(),
      },
      429
    );
  }

  // ── Dedup check ────────────────────────────────────────────────────────────
  const matchKey = buildMatchKey(inputType, bookOrTopic, days);

  const [existing] = await db
    .select({ id: devotionalPlans.id })
    .from(devotionalPlans)
    .where(
      and(
        eq(devotionalPlans.matchKey, matchKey),
        or(eq(devotionalPlans.isPublic, true), eq(devotionalPlans.createdByUserId, userId))
      )
    )
    .limit(1);

  let planId: string;
  let reused = false;

  if (existing) {
    planId = existing.id;
    reused = true;
  } else {
    // ── Generate with Claude ───────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const whoLabel: Record<string, string> = {
      "just-me": "an individual doing this alone",
      "friend": "two friends doing this together",
      "small-group": "a small group doing this together",
      "discipleship": "a discipler and the person they are discipling",
    };

    const userPrompt = `Generate a ${days}-day devotional plan.

${inputType === "book" ? `Book of the Bible: ${bookOrTopic}` : `Topic: ${bookOrTopic}`}
Theme or focus: ${themeFocus}
Who is doing this: ${whoLabel[who] ?? who}${context ? `\nAdditional context: ${context}` : ""}

Generate exactly ${days} days. Each day should progress logically through ${inputType === "book" ? `the book of ${bookOrTopic}` : `the topic of "${bookOrTopic}"`}. The plan should feel like a complete journey — not isolated days, but a progression that builds.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      // Each day now also carries passageContext + studyNotes, which roughly
      // doubles per-day output. Scale the budget with the day count so a 30-day
      // plan isn't truncated (truncated JSON fails the parse and the whole
      // generation retries). ~1.3k tokens/day + headroom, capped under the model's
      // 64k output ceiling.
      max_tokens: Math.min(48000, 4000 + days * 1300),
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

    type StudyNote = { verse_ref: string; note: string };
    let planData: {
      title: string;
      subtitle: string;
      description: string;
      days: {
        dayNumber: number;
        chapter: string;
        theme: string;
        passageContext: string;
        studyNotes: StudyNote[];
        reflection: string;
        reflectionQ1: string;
        reflectionQ2: string;
        prayerPrompt: string;
      }[];
    };

    try {
      planData = JSON.parse(raw);
    } catch {
      console.error("Claude returned non-JSON:", raw.slice(0, 500));
      return c.json({ error: "Generation failed — please try again." }, 500);
    }

    // Every day must ship with passage context AND study notes — no half-populated
    // plans. If the model dropped either on any day, fail rather than persist a gap.
    const missing = (planData.days ?? []).filter(
      (d) =>
        !d.passageContext?.trim() ||
        !Array.isArray(d.studyNotes) ||
        d.studyNotes.length === 0 ||
        d.studyNotes.some((n) => !n?.verse_ref?.trim() || !n?.note?.trim())
    );
    if (missing.length > 0) {
      console.error(
        "Generation missing passageContext/studyNotes on days:",
        missing.map((d) => d.dayNumber).join(", ")
      );
      return c.json({ error: "Generation incomplete — please try again." }, 500);
    }

    const inserted = await db.transaction(async (tx) => {
      const [plan] = await tx
        .insert(devotionalPlans)
        .values({
          title: planData.title,
          subtitle: planData.subtitle,
          description: planData.description,
          category: "generated",
          totalDays: days,
          source: "generated",
          createdByUserId: userId,
          isPublic: false,
          matchKey,
        })
        .returning({ id: devotionalPlans.id });

      if (!plan) return null;

      await tx.insert(devotionalDays).values(
        planData.days.map((d) => ({
          planId: plan.id,
          dayNumber: d.dayNumber,
          chapter: d.chapter,
          theme: d.theme,
          passageContext: d.passageContext,
          studyNotes: d.studyNotes,
          reflection: d.reflection ?? null,
          reflectionQ1: d.reflectionQ1,
          reflectionQ2: d.reflectionQ2,
          prayerPrompt: d.prayerPrompt,
        }))
      );

      return plan;
    });

    if (!inserted) return c.json({ error: "Failed to save plan." }, 500);
    planId = inserted.id;
  }

  // ── Consume token (only for fresh generations, not cache hits) ────────────
  if (!reused) {
    await db
      .update(profiles)
      .set({
        generatedCount: count + 1,
        generatedWindowStart: new Date(activeWindowStart),
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId));
  }

  return c.json({ planId, reused });
});
