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

const app = new Hono();

app.use("*", logger());
// The API is consumed by the mobile app with a Bearer token (no cookies), so
// CORS can be permissive — auth is enforced by JWT verification, not origin.
app.use("*", cors({ allowHeaders: ["Content-Type", "Authorization"] }));

// Health check (Railway pings this).
app.get("/", (c) => c.json({ ok: true, service: "ironsharp-api" }));
app.get("/health", (c) => c.json({ ok: true }));

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

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🛡️  IronSharp API listening on http://localhost:${info.port}`);
});

export type AppType = typeof app;
