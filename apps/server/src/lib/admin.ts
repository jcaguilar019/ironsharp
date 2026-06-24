import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../middleware/auth.js";

/**
 * Founder / admin authorization.
 *
 * The Community Devotional is authored solely by the founder. Rather than store
 * a role flag in the database, we keep the set of privileged Neon Auth user ids
 * (the JWT `sub`) in the `ADMIN_USER_IDS` env var (comma-separated). This keeps
 * authoring rights server-controlled and easy to change per environment — no
 * migration, no in-app way to escalate.
 *
 * Parsed once at module load. Env is populated before this runs because
 * `index.ts` imports "dotenv/config" first (same ordering auth.ts relies on).
 */
const adminIds = new Set(
  (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

if (adminIds.size === 0) {
  console.warn(
    "[admin] ADMIN_USER_IDS is not set — no user can author Community Devotionals. " +
      "Set it to your Neon Auth user id (see .env.example)."
  );
}

/** True when the given Neon Auth user id is a configured admin. */
export function isAdmin(userId: string | undefined | null): boolean {
  return !!userId && adminIds.has(userId);
}

/** Gate a route to admins only. Must run *after* `requireAuth` (needs c.var.user). */
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  if (!isAdmin(c.var.user?.id)) return c.json({ error: "Forbidden" }, 403);
  await next();
});
