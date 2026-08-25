import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { plans } from "./routes/plans.js";
import { generate } from "./routes/generate.js";
import { notes } from "./routes/notes.js";
import { bible } from "./routes/bible.js";
import { profile } from "./routes/profile.js";
import { progress } from "./routes/progress.js";
import { submissions } from "./routes/submissions.js";
import { groupsRoute } from "./routes/groups.js";
import { tts } from "./routes/tts.js";
import { community } from "./routes/community.js";
import { discipleship } from "./routes/discipleship.js";
import { journey } from "./routes/journey.js";

// Surface missing AI keys at startup — without this they only fail at request
// time (plan generation → 500, TTS → 503), which reads as a mystery outage.
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"] as const) {
  if (!process.env[key]) console.warn(`[startup] ${key} is not set — endpoints that need it will fail.`);
}

const app = new Hono();

app.use("*", logger());
// The API is consumed by the mobile app with a Bearer token (no cookies), so
// CORS can be permissive — auth is enforced by JWT verification, not origin.
app.use("*", cors({ allowHeaders: ["Content-Type", "Authorization"] }));

/**
 * What's actually running, answerable from outside in one request.
 *
 * "Did that push deploy?" was unanswerable for three weeks in August 2026 —
 * /health returned {ok:true} and nothing else, so a stuck auto-deploy looked
 * exactly like a working one. Railway injects these at build time; locally they
 * are absent and the fields read "dev", which is itself the answer.
 *
 * `startedAt` matters as much as the commit: a redeploy of the SAME commit still
 * moves it, which is how you tell "Railway ignored me" from "Railway redeployed
 * and the code was already current."
 */
const BUILD = {
  commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
  branch: process.env.RAILWAY_GIT_BRANCH ?? "dev",
  startedAt: new Date().toISOString(),
};

// Health check (Railway pings /health — it stays cheap and always 200).
app.get("/", (c) => c.json({ ok: true, service: "ironsharp-api", ...BUILD }));
app.get("/health", (c) => c.json({ ok: true, ...BUILD }));

// Application data routes. Auth (sign up / in / out, sessions) is handled by the
// managed Neon Auth service directly from the client — not here.
app.route("/api/profile", profile);
app.route("/api/plans/generate", generate);
app.route("/api/plans", plans);
app.route("/api/notes", notes);
app.route("/api/bible", bible);
app.route("/api/progress", progress);
app.route("/api/submissions", submissions);
app.route("/api/groups", groupsRoute);
app.route("/api/tts", tts);
app.route("/api/community", community);
app.route("/api/discipleship", discipleship);
app.route("/api/journey", journey);

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🛡️  IronSharp API listening on http://localhost:${info.port}`);
});

export type AppType = typeof app;
