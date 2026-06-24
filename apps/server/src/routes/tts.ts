import { Hono } from "hono";
import { createHash } from "node:crypto";
import { requireAuth, type AppEnv } from "../middleware/auth.js";

export const tts = new Hono<AppEnv>();

tts.use("*", requireAuth);

// OpenAI's voices (the ChatGPT voices). Allow-list so a bad client value can't
// reach the API. "sage" is calm + warm — a good default for a devotional read.
const VOICES = new Set([
  "alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse",
]);
const DEFAULT_VOICE = "sage";
// gpt-4o-mini-tts is the steerable ChatGPT-grade model; overridable via env in
// case the account lacks access (set OPENAI_TTS_MODEL=tts-1-hd to fall back).
const MODEL = process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts";
const DEFAULT_INSTRUCTIONS =
  "Read slowly, calmly and warmly — like a pastor gently guiding a quiet, reflective devotional.";
const MAX_CHARS = 4000; // OpenAI hard limit is 4096

// A reading for a given (text, voice, instructions) is identical for every user,
// so generate once and reuse. The client streams it back via GET /:id with its
// bearer token. In-memory + capped; resets on redeploy (cheap to refill). A
// persistent/object-store cache is a later optimization.
type CacheEntry = { audio: Uint8Array; createdAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_MAX = 300;

function idFor(text: string, voice: string, instructions: string) {
  return createHash("sha256").update(`${MODEL}\n${voice}\n${instructions}\n${text}`).digest("hex");
}

// POST /api/tts  → { text, voice?, instructions? } → { id } (generates + caches)
tts.post("/", async (c) => {
  const apiKey = process.env.OPENAI_API_KEY;
  // Not a user error — the client falls back to the on-device voice on 503.
  if (!apiKey) return c.json({ error: "tts_not_configured" }, 503);

  const body = await c.req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const reqVoice = typeof body.voice === "string" ? body.voice : DEFAULT_VOICE;
  const voice = VOICES.has(reqVoice) ? reqVoice : DEFAULT_VOICE;
  const instructions =
    typeof body.instructions === "string" && body.instructions.length < 600
      ? body.instructions
      : DEFAULT_INSTRUCTIONS;

  if (!text) return c.json({ error: "text is required" }, 400);
  if (text.length > MAX_CHARS) return c.json({ error: "text_too_long" }, 400);

  const id = idFor(text, voice, instructions);
  if (cache.has(id)) return c.json({ id, cached: true });

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, voice, input: text, instructions, response_format: "mp3" }),
    });
  } catch (err) {
    console.error("[tts] upstream request failed:", err);
    return c.json({ error: "tts_upstream_failed" }, 502);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[tts] OpenAI error:", res.status, detail.slice(0, 300));
    return c.json({ error: "tts_generation_failed" }, 502);
  }

  const audio = new Uint8Array(await res.arrayBuffer());
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(id, { audio, createdAt: Date.now() });
  return c.json({ id, cached: false });
});

// GET /api/tts/:id  → streams the cached mp3 (the device player fetches this
// with its bearer token via AudioSource headers).
tts.get("/:id", (c) => {
  const hit = cache.get(c.req.param("id"));
  if (!hit) return c.json({ error: "not_found" }, 404);
  return new Response(hit.audio, {
    status: 200,
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" },
  });
});
