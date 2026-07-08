import { createMiddleware } from "hono/factory";
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import type { AppEnv } from "../middleware/auth.js";

/**
 * Founder / admin authorization — sourced from Neon Auth's own role system
 * (the Better Auth "admin" plugin adds `role` / `banned` to neon_auth.user).
 *
 * Promote a user to admin in the Neon Auth console and their `role` becomes
 * "admin"; we read that column rather than maintaining a parallel allowlist.
 * (This replaces the old ADMIN_USER_IDS env var, which duplicated a system Neon
 * Auth already provides.) Cached briefly — admin status changes rarely, and
 * profile responses check it on nearly every request.
 */
type RoleEntry = { role: string | null; expiresAt: number };
const roleCache = new Map<string, RoleEntry>();
const CACHE_TTL_MS = 60_000;

async function getRole(userId: string): Promise<string | null> {
  const cached = roleCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.role;

  const result = await db.execute<{ role: string | null }>(
    sql`SELECT role FROM neon_auth."user" WHERE id = ${userId} LIMIT 1`
  );
  const role = result.rows[0]?.role ?? null;

  roleCache.set(userId, { role, expiresAt: Date.now() + CACHE_TTL_MS });
  if (roleCache.size > 1_000) {
    const now = Date.now();
    for (const [k, v] of roleCache) if (v.expiresAt <= now) roleCache.delete(k);
  }
  return role;
}

/** True when the user's Neon Auth role is "admin". */
export async function isAdmin(userId: string | undefined | null): Promise<boolean> {
  if (!userId) return false;
  return (await getRole(userId)) === "admin";
}

/** Gate a route to admins only. Must run *after* `requireAuth` (needs c.var.user). */
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  if (!(await isAdmin(c.var.user?.id))) return c.json({ error: "Forbidden" }, 403);
  await next();
});
