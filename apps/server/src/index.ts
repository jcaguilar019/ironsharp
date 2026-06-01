import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth.js";
import { plans } from "./routes/plans.js";
import { profile } from "./routes/profile.js";
import { progress } from "./routes/progress.js";
import { submissions } from "./routes/submissions.js";

const app = new Hono();

const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use("*", logger());
app.use(
  "*",
  cors({
    // Mobile clients send an Origin like `ironsharp://` or `exp://...`.
    origin: (origin) => {
      if (!origin) return origin; // native fetch may omit Origin — allow it
      return trustedOrigins.some((t) => origin.startsWith(t.replace(/\/$/, "")))
        ? origin
        : trustedOrigins[0] ?? origin;
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Set-Cookie"],
    credentials: true,
  })
);

// Health check (Railway pings this).
app.get("/", (c) => c.json({ ok: true, service: "ironsharp-api" }));
app.get("/health", (c) => c.json({ ok: true }));

// Better Auth handles everything under /api/auth/*.
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Application data routes.
app.route("/api/profile", profile);
app.route("/api/plans", plans);
app.route("/api/progress", progress);
app.route("/api/submissions", submissions);

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🛡️  IronSharp API listening on http://localhost:${info.port}`);
});

export type AppType = typeof app;
